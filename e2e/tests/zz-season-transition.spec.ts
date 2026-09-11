import { test, expect } from "@playwright/test"
import { sql } from "../helpers/db"
import { testPlayer } from "../helpers/players"
import { ensurePlayers } from "../helpers/seed"
import { SEASONS } from "../../src/lib/seasons"

const CRON_PATH = "/api/cron/season-transition"
const ETE_2026 = SEASONS.find(s => s.key === "ete-2026")!

// recomputeAllElos (called after a real transition) rewrites EVERY player's
// elo in the whole shared `e2e` database in one pass — not a scoped subset
// like the decay cron, which only ever touches players inactive long enough
// to matter. The "zz-" filename prefix is deliberate: Playwright runs spec
// files in alphabetical order by default (confirmed by this project's own
// existing files already being named that way), so this guarantees every
// other spec's assertions have already run and completed before this file's
// tests can touch global state. Do not rename this file without keeping
// that guarantee some other way.
test.describe.configure({ mode: "serial" })

test.describe("season-transition cron", () => {
  test("rejects requests without a valid bearer token", async ({ request }) => {
    const noAuth = await request.get(CRON_PATH)
    expect(noAuth.status()).toBe(401)

    const wrongAuth = await request.get(CRON_PATH, { headers: { Authorization: "Bearer wrong-secret" } })
    expect(wrongAuth.status()).toBe(401)
  })

  test("under the real current date, reports no_completed_season (true until 2026-09-23)", async ({ request }) => {
    const res = await request.get(CRON_PATH, { headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` } })
    expect(res.ok()).toBe(true)
    const body = await res.json()
    expect(body).toEqual({ transitioned: false, reason: "no_completed_season" })
  })

  // A real season runs for months, so "a season just ended" can't be reached
  // by just waiting for it — the route's ?now= override (dev/test-only, see
  // the route itself) fabricates that moment instead. This exercises the
  // full real orchestration: snapshot-before-reset ordering, the actual SQL
  // insert, and recomputeAllElos's real reset — not a re-implementation of
  // any of it.
  test("records the actual current #1 player's pre-reset ELO as champion, then resets ELOs", async ({ request }) => {
    // Own players so their reset can be asserted independent of who
    // globally ends up "the champion" (see below).
    const p1 = testPlayer("seasontxz", "resetme")
    const p2 = testPlayer("seasontxz", "resetmetoo")
    const ids = await ensurePlayers([p1, p2], 1150)

    // Who's actually #1 right now, across the whole accumulated suite run —
    // read independently rather than assumed, the same "cross-check against
    // an independent SQL query" approach e2e/README.md documents for any
    // assertion on a global aggregate (this file necessarily can't control
    // or know in advance what every other spec's players' final ELOs are).
    const [expectedLeader] = await sql`SELECT id::text AS id, elo FROM players ORDER BY elo DESC LIMIT 1`

    const fakeNow = new Date(ETE_2026.end.getTime() + 2 * 60 * 60 * 1000).toISOString() // 2h after Été 2026 ends
    const res = await request.get(`${CRON_PATH}?now=${encodeURIComponent(fakeNow)}`, {
      headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
    })
    expect(res.ok()).toBe(true)
    const body = await res.json()
    expect(body).toEqual({
      transitioned: true,
      season: ETE_2026.key,
      champion: expectedLeader.id,
      elo: Number(expectedLeader.elo),
    })

    const [champRow] = await sql`
      SELECT player_id::text AS player_id, elo, season_label
      FROM season_champions WHERE season_key = ${ETE_2026.key}
    `
    expect(champRow.player_id).toBe(expectedLeader.id)
    expect(Number(champRow.elo)).toBe(Number(expectedLeader.elo))
    expect(champRow.season_label).toBe(ETE_2026.label)

    for (const email of [p1.email, p2.email]) {
      const [row] = await sql`SELECT elo FROM players WHERE id = ${ids.get(email)}::uuid`
      expect(Number(row.elo), `${email} should be reset to 1000 by the transition`).toBe(1000)
    }
  })

  test("is idempotent — calling again for the same ended season returns already_recorded, no duplicate row", async ({ request }) => {
    const fakeNow = new Date(ETE_2026.end.getTime() + 3 * 60 * 60 * 1000).toISOString() // still resolves to the same "most recently ended" season
    const res = await request.get(`${CRON_PATH}?now=${encodeURIComponent(fakeNow)}`, {
      headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
    })
    expect(res.ok()).toBe(true)
    const body = await res.json()
    expect(body).toEqual({ transitioned: false, reason: "already_recorded", season: ETE_2026.key })

    const rows = await sql`SELECT 1 FROM season_champions WHERE season_key = ${ETE_2026.key}`
    expect(rows).toHaveLength(1)
  })

  // Not covered here: that ?now= is actually inert in the deployed app.
  // That's enforced by `process.env.NODE_ENV !== "production"` in the route
  // itself, which is always true in this test run (dev/CI never sets
  // NODE_ENV=production) — there's no way to exercise the false branch from
  // this suite without actually running a production build against the e2e
  // database, which isn't worth the added complexity for a one-line guard.
  // Verify by reading the route directly if this is ever in doubt.
})
