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

test.describe("weekly ELO decay cron", () => {
  test("rejects requests without a valid bearer token", async ({ request }) => {
    const noAuth = await request.get(CRON_PATH)
    expect(noAuth.status()).toBe(401)

    const wrongAuth = await request.get(CRON_PATH, { headers: { Authorization: "Bearer wrong-secret" } })
    expect(wrongAuth.status()).toBe(401)
  })

  test("docks -10 from a genuinely inactive player, leaves an active one alone", async ({ request }) => {
    const inactive = testPlayer("cronin", "sleepy")
    const inactivePartner = testPlayer("cronin", "mate")
    const active = testPlayer("cronac", "busy")
    const activePartner = testPlayer("cronac", "mate")
    // Separate, disposable opponent pools per scenario — sharing one would
    // make each match's ELO depend on the other match's outcome too.
    const inactiveOpp = [testPlayer("croninopp", "a"), testPlayer("croninopp", "b")]
    const activeOpp = [testPlayer("cronacopp", "a"), testPlayer("cronacopp", "b")]
    const ids = await ensurePlayers([inactive, inactivePartner, active, activePartner, ...inactiveOpp, ...activeOpp], 1000)

    // Inactive player's only match is 10 days ago — well before this week.
    // It's an ordinary win, so recomputeAllElos (which the cron endpoint
    // calls after applying decay) will give them real ELO from it BEFORE
    // the -10 decay is layered on top — the expected final value accounts
    // for both steps, not just the decay in isolation.
    await seedMatch({
      teamA: { attackerId: ids.get(inactive.email)!, defenderId: ids.get(inactivePartner.email)! },
      teamB: { attackerId: ids.get(inactiveOpp[0].email)!, defenderId: ids.get(inactiveOpp[1].email)! },
      scoreA: 10, scoreB: 5,
      playedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    })
    // Active player played just now — this week.
    await seedMatch({
      teamA: { attackerId: ids.get(active.email)!, defenderId: ids.get(activePartner.email)! },
      teamB: { attackerId: ids.get(activeOpp[0].email)!, defenderId: ids.get(activeOpp[1].email)! },
      scoreA: 10, scoreB: 5,
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

  test("is idempotent — a second call the same week doesn't decay twice", async ({ request }) => {
    const p = testPlayer("cronidem", "loner")
    const partner = testPlayer("cronidem", "mate")
    const opp = [testPlayer("cronidemopp", "a"), testPlayer("cronidemopp", "b")]
    const ids = await ensurePlayers([p, partner, ...opp], 1000)
    await seedMatch({
      teamA: { attackerId: ids.get(p.email)!, defenderId: ids.get(partner.email)! },
      teamB: { attackerId: ids.get(opp[0].email)!, defenderId: ids.get(opp[1].email)! },
      scoreA: 10, scoreB: 5,
      playedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
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
