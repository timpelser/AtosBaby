import { test, expect } from "@playwright/test"
import { sql } from "../helpers/db"
import { ensurePlayers, seedMatch } from "../helpers/seed"
import { testPlayer } from "../helpers/players"
import { computeMatchResult } from "../helpers/elo"

// The endpoint operates on ALL globally-inactive players, not a scoped
// subset — so unlike the other specs, tests in this file can't safely run
// concurrently with each other (they'd race on the same global side
// effects). Serialize just this file.
test.describe.configure({ mode: "serial" })

const CRON_PATH = "/api/cron/elo-decay"
const DAY_MS = 24 * 60 * 60 * 1000

/**
 * The cron evaluates the most recently COMPLETED ISO week — a moving
 * [weekStart, weekEnd) window computed as one week back from
 * date_trunc('week', now()), NOT a fixed number of days back from "now".
 * Because that window's position relative to "now" depends on today's
 * weekday (it could be 1–7 days behind "now", or 8–14, etc.), a fixed
 * offset like "10 days ago" is only reliably inside/outside the window on
 * SOME days of the week — it would pass or fail depending on what day the
 * suite happens to run. These two offsets are chosen to be safe on every
 * day of the week:
 *   - exactly 7 days ago always falls inside [weekStart, weekEnd)
 *   - 15+ days ago always falls before weekStart
 * (This is exactly the class of bug the fix itself addresses — see the
 * incident this file's tests were rewritten for.)
 */
const DEFINITELY_LAST_COMPLETED_WEEK = () => new Date(Date.now() - 7 * DAY_MS)
const DEFINITELY_BEFORE_LAST_COMPLETED_WEEK = () => new Date(Date.now() - 15 * DAY_MS)

test.describe("weekly ELO decay cron", () => {
  test("rejects requests without a valid bearer token", async ({ request }) => {
    const noAuth = await request.get(CRON_PATH)
    expect(noAuth.status()).toBe(401)

    const wrongAuth = await request.get(CRON_PATH, { headers: { Authorization: "Bearer wrong-secret" } })
    expect(wrongAuth.status()).toBe(401)
  })

  test("evaluates the most recently completed week, not the week 'now' falls in", async ({ request }) => {
    // Regression test for the incident: the cron used to compute
    // date_trunc('week', now()) directly, so a run that slipped past a
    // week's midnight boundary would judge the brand-new week instead of
    // the one that had just ended — and since nobody could have played yet
    // in a minutes-old week, EVERY active player got wrongly decayed. The
    // fix anchors to "one full week before the current truncated week"
    // instead, which this asserts directly against an independent query.
    // ::text, not just ::date — the driver parses bare `date` columns into
    // JS Date objects using the local runtime's timezone (not UTC), which
    // would make this comparison flaky depending on where the test runs.
    // Comparing plain strings sidesteps that entirely.
    const [expected] = await sql`SELECT (date_trunc('week', now()) - interval '7 days')::date::text AS week_of`
    const res = await request.get(CRON_PATH, { headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` } })
    const body = await res.json()
    expect(body.week_of).toBe(expected.week_of)
  })

  test("docks -10 from a player inactive since before last week, leaves someone who played last week alone", async ({ request }) => {
    const inactive = testPlayer("cronin", "sleepy")
    const inactivePartner = testPlayer("cronin", "mate")
    const active = testPlayer("cronac", "busy")
    const activePartner = testPlayer("cronac", "mate")
    // Separate, disposable opponent pools per scenario — sharing one would
    // make each match's ELO depend on the other match's outcome too.
    const inactiveOpp = [testPlayer("croninopp", "a"), testPlayer("croninopp", "b")]
    const activeOpp = [testPlayer("cronacopp", "a"), testPlayer("cronacopp", "b")]
    const ids = await ensurePlayers([inactive, inactivePartner, active, activePartner, ...inactiveOpp, ...activeOpp], 1000)

    // Inactive player's only match is well before the completed week being
    // evaluated. It's an ordinary win, so recomputeAllElos (which the cron
    // endpoint calls after applying decay) will give them real ELO from it
    // BEFORE the -10 decay is layered on top — the expected final value
    // accounts for both steps, not just the decay in isolation.
    await seedMatch({
      teamA: { attackerId: ids.get(inactive.email)!, defenderId: ids.get(inactivePartner.email)! },
      teamB: { attackerId: ids.get(inactiveOpp[0].email)!, defenderId: ids.get(inactiveOpp[1].email)! },
      scoreA: 10, scoreB: 5,
      playedAt: DEFINITELY_BEFORE_LAST_COMPLETED_WEEK(),
    })
    // Active player played sometime during the completed week being evaluated.
    await seedMatch({
      teamA: { attackerId: ids.get(active.email)!, defenderId: ids.get(activePartner.email)! },
      teamB: { attackerId: ids.get(activeOpp[0].email)!, defenderId: ids.get(activeOpp[1].email)! },
      scoreA: 10, scoreB: 5,
      playedAt: DEFINITELY_LAST_COMPLETED_WEEK(),
    })

    const inactiveExpected = computeMatchResult({
      teamA: [{ id: ids.get(inactive.email)!, elo: 1000, gamesPlayedBefore: 0 }, { id: ids.get(inactivePartner.email)!, elo: 1000, gamesPlayedBefore: 0 }],
      teamB: [{ id: ids.get(inactiveOpp[0].email)!, elo: 1000, gamesPlayedBefore: 0 }, { id: ids.get(inactiveOpp[1].email)!, elo: 1000, gamesPlayedBefore: 0 }],
      teamAWon: true,
    })
    const activeExpected = computeMatchResult({
      teamA: [{ id: ids.get(active.email)!, elo: 1000, gamesPlayedBefore: 0 }, { id: ids.get(activePartner.email)!, elo: 1000, gamesPlayedBefore: 0 }],
      teamB: [{ id: ids.get(activeOpp[0].email)!, elo: 1000, gamesPlayedBefore: 0 }, { id: ids.get(activeOpp[1].email)!, elo: 1000, gamesPlayedBefore: 0 }],
      teamAWon: true,
    })
    const inactiveEloAfterOwnMatch = inactiveExpected.teamA[0].after
    const expectedFinalInactive = inactiveEloAfterOwnMatch - 10
    const expectedFinalActive = activeExpected.teamA[0].after

    const res = await request.get(CRON_PATH, { headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` } })
    expect(res.ok()).toBe(true)

    const [inactiveRow] = await sql`SELECT elo FROM players WHERE id = ${ids.get(inactive.email)}::uuid`
    expect(Number(inactiveRow.elo)).toBe(expectedFinalInactive)
    const decayRows = await sql`SELECT points, elo_before, elo_after FROM elo_decay_events WHERE player_id = ${ids.get(inactive.email)}::uuid`
    expect(decayRows).toHaveLength(1)
    expect(Number(decayRows[0].points)).toBe(-10)
    expect(Number(decayRows[0].elo_before)).toBe(inactiveEloAfterOwnMatch)
    expect(Number(decayRows[0].elo_after)).toBe(expectedFinalInactive)

    const [activeRow] = await sql`SELECT elo FROM players WHERE id = ${ids.get(active.email)}::uuid`
    expect(Number(activeRow.elo)).toBe(expectedFinalActive)
    const activeDecay = await sql`SELECT 1 FROM elo_decay_events WHERE player_id = ${ids.get(active.email)}::uuid`
    expect(activeDecay).toHaveLength(0)
  })

  test("is idempotent — a second call for the same completed week doesn't decay twice", async ({ request }) => {
    const p = testPlayer("cronidem", "loner")
    const partner = testPlayer("cronidem", "mate")
    const opp = [testPlayer("cronidemopp", "a"), testPlayer("cronidemopp", "b")]
    const ids = await ensurePlayers([p, partner, ...opp], 1000)
    await seedMatch({
      teamA: { attackerId: ids.get(p.email)!, defenderId: ids.get(partner.email)! },
      teamB: { attackerId: ids.get(opp[0].email)!, defenderId: ids.get(opp[1].email)! },
      scoreA: 10, scoreB: 5,
      playedAt: DEFINITELY_BEFORE_LAST_COMPLETED_WEEK(),
    })
    const expected = computeMatchResult({
      teamA: [{ id: ids.get(p.email)!, elo: 1000, gamesPlayedBefore: 0 }, { id: ids.get(partner.email)!, elo: 1000, gamesPlayedBefore: 0 }],
      teamB: [{ id: ids.get(opp[0].email)!, elo: 1000, gamesPlayedBefore: 0 }, { id: ids.get(opp[1].email)!, elo: 1000, gamesPlayedBefore: 0 }],
      teamAWon: true,
    })
    const expectedFinal = expected.teamA[0].after - 10

    const auth = { headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` } }
    await request.get(CRON_PATH, auth)
    await request.get(CRON_PATH, auth)

    const [row] = await sql`SELECT elo FROM players WHERE id = ${ids.get(p.email)}::uuid`
    expect(Number(row.elo)).toBe(expectedFinal) // not expectedFinal - 10 again
    const decayRows = await sql`SELECT 1 FROM elo_decay_events WHERE player_id = ${ids.get(p.email)}::uuid`
    expect(decayRows).toHaveLength(1)
  })
})
