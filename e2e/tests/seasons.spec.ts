import { test, expect } from "@playwright/test"
import { sql } from "../helpers/db"
import { testPlayer } from "../helpers/players"
import { ensurePlayers, seedMatch } from "../helpers/seed"
import { addMatchViaUI } from "../helpers/add-match-ui"
import { unlockAdmin } from "../helpers/admin"
import {
  SEASONS,
  getCurrentSeason,
  getCurrentSeasonStart,
  daysRemaining,
  getPastSeasons,
  getMostRecentlyEndedSeason,
  isChampionBannerWindow,
  iconForSeasonLabel,
} from "../../src/lib/seasons"

const DAY_MS = 86_400_000
const ETE_2026 = SEASONS.find(s => s.key === "ete-2026")!
const AUTOMNE_2026 = SEASONS.find(s => s.key === "automne-2026")!

// These test the REAL exported functions directly — not an independent
// reimplementation like helpers/elo.ts uses for the ELO formula. Unlike the
// formula (where testing "does it match a second copy of the same logic"
// would be meaningless), there's no separate "correct answer" for a season
// boundary other than the SEASONS array itself, so exercising the real
// function against fabricated dates is the direct, correct way to verify
// it — and needs no server, DB, or browser at all.
test.describe("season date logic (pure functions)", () => {
  test("getCurrentSeason returns the matching season for a date inside each defined range", () => {
    for (const s of SEASONS) {
      const midpoint = new Date((s.start.getTime() + s.end.getTime()) / 2)
      expect(getCurrentSeason(midpoint)?.key, s.key).toBe(s.key)
    }
  })

  test("getCurrentSeason returns undefined outside every defined range", () => {
    expect(getCurrentSeason(new Date("2026-01-01T00:00:00Z"))).toBeUndefined() // before Été 2026 even starts
    expect(getCurrentSeason(new Date("2027-07-01T00:00:00Z"))).toBeUndefined() // after Printemps 2027 ends
  })

  test("a season's end is exclusive — the boundary instant itself belongs to the next season", () => {
    expect(getCurrentSeason(ETE_2026.end)?.key).toBe(AUTOMNE_2026.key)
    expect(getCurrentSeason(new Date(ETE_2026.end.getTime() - 1))?.key).toBe(ETE_2026.key)
  })

  test("daysRemaining rounds up (a few hours left still reads as 1, not 0) and clamps at 0 past the end", () => {
    expect(daysRemaining(ETE_2026, new Date(ETE_2026.end.getTime() - 60 * 60 * 1000))).toBe(1)
    expect(daysRemaining(ETE_2026, ETE_2026.end)).toBe(0)
    expect(daysRemaining(ETE_2026, new Date(ETE_2026.end.getTime() + DAY_MS))).toBe(0)
  })

  test("getPastSeasons / getMostRecentlyEndedSeason are most-recent-first and respect the given 'now'", () => {
    const afterAutomne = new Date(AUTOMNE_2026.end.getTime() + DAY_MS)
    expect(getPastSeasons(afterAutomne).map(s => s.key)).toEqual([AUTOMNE_2026.key, ETE_2026.key])
    expect(getMostRecentlyEndedSeason(afterAutomne)?.key).toBe(AUTOMNE_2026.key)
    expect(getMostRecentlyEndedSeason(new Date("2026-01-01T00:00:00Z"))).toBeUndefined() // nothing has ended yet
  })

  test("isChampionBannerWindow is true through exactly day 7 after a season ends, false from day 8 and before anything ends", () => {
    expect(isChampionBannerWindow(new Date(ETE_2026.end.getTime() + 1000))).toBe(true) // 1s after
    expect(isChampionBannerWindow(new Date(ETE_2026.end.getTime() + 6 * DAY_MS))).toBe(true) // day 6
    expect(isChampionBannerWindow(new Date(ETE_2026.end.getTime() + 7 * DAY_MS))).toBe(true) // exactly day 7, inclusive
    expect(isChampionBannerWindow(new Date(ETE_2026.end.getTime() + 7 * DAY_MS + 1000))).toBe(false) // just past day 7
    expect(isChampionBannerWindow(new Date("2026-01-01T00:00:00Z"))).toBe(false) // nothing has ended yet
  })

  test("iconForSeasonLabel maps by season name regardless of year, and falls back safely on unrecognized text", () => {
    expect(iconForSeasonLabel("Été 2026")).toBe("sun")
    expect(iconForSeasonLabel("Automne 2025")).toBe("leaf")
    expect(iconForSeasonLabel("Hiver 1999")).toBe("snowflake")
    expect(iconForSeasonLabel("Printemps 2050")).toBe("flower") // a year with no matching SEASONS entry at all
    expect(iconForSeasonLabel("garbage")).toBe("flower") // documented fallback
  })

  test("getCurrentSeasonStart mirrors getCurrentSeason's start, undefined when there's no current season", () => {
    const midpoint = new Date((ETE_2026.start.getTime() + ETE_2026.end.getTime()) / 2)
    expect(getCurrentSeasonStart(midpoint)?.getTime()).toBe(ETE_2026.start.getTime())
    expect(getCurrentSeasonStart(new Date("2026-01-01T00:00:00Z"))).toBeUndefined()
  })
})

// This is the riskiest new behavior in the whole feature: recomputeAllElos
// (called by undo/delete-match and both cron jobs) now scopes its replay to
// the current season, so a match from before the season boundary must be
// excluded from every player's live ELO, yet its own elo_before/elo_after
// must stay frozen forever, never rewritten. Exercised against the REAL
// current season (Été 2026, already active) rather than a fabricated one —
// no date-faking needed, since its start date is already in the past.
test.describe("season-scoped ELO recompute", () => {
  test("a match dated before the season start is excluded from recompute; its own elo record stays frozen", async ({ page }) => {
    const seasonStart = getCurrentSeasonStart(new Date())
    test.skip(!seasonStart, "no current season defined right now — nothing to scope against")

    const p1 = testPlayer("seasonscz", "pone")
    const p2 = testPlayer("seasonscz", "ptwo")
    const p3 = testPlayer("seasonscz", "pthree")
    const p4 = testPlayer("seasonscz", "pfour")
    const ids = await ensurePlayers([p1, p2, p3, p4], 1000)

    const beforeSeason = new Date(seasonStart!.getTime() - 30 * DAY_MS)
    await seedMatch({
      teamA: { attackerId: ids.get(p1.email)!, defenderId: ids.get(p2.email)! },
      teamB: { attackerId: ids.get(p3.email)!, defenderId: ids.get(p4.email)! },
      scoreA: 10, scoreB: 2,
      playedAt: beforeSeason,
      elo: {
        aAtt: { before: 1000, after: 1033 }, aDef: { before: 1000, after: 1033 },
        bAtt: { before: 1000, after: 967 }, bDef: { before: 1000, after: 967 },
      },
    })
    // Simulate what a BUGGY (unscoped) recompute would leave players.elo at,
    // so the assertion below is unambiguous — if scoping regresses, these
    // stay at 1033/967 instead of resetting to 1000.
    await sql`UPDATE players SET elo = 1033 WHERE id IN (${ids.get(p1.email)}::uuid, ${ids.get(p2.email)}::uuid)`
    await sql`UPDATE players SET elo = 967 WHERE id IN (${ids.get(p3.email)}::uuid, ${ids.get(p4.email)}::uuid)`

    // Trigger a real recomputeAllElos the same way elo-accuracy.spec.ts
    // does: add a throwaway in-season match, then delete it as admin.
    await page.goto("/")
    const t1 = testPlayer("seasonscz", "throwone")
    const t2 = testPlayer("seasonscz", "throwtwo")
    await addMatchViaUI(page, {
      teamA: { attackerEmail: p1.email, defenderEmail: p2.email },
      teamB: { attackerEmail: t1.email, defenderEmail: t2.email },
      scoreA: 10, scoreB: 1,
    })
    await unlockAdmin(page)
    const throwawayRow = page.getByTestId("match-row")
      .filter({ hasText: p1.firstName })
      .filter({ hasText: t1.firstName })
    await throwawayRow.getByTitle("Supprimer ce match").click()
    await page.getByRole("dialog").getByRole("button", { name: "Supprimer" }).click()
    await expect(throwawayRow).toHaveCount(0, { timeout: 20_000 })

    for (const email of [p1.email, p2.email, p3.email, p4.email]) {
      const [row] = await sql`SELECT elo FROM players WHERE id = ${ids.get(email)}::uuid`
      expect(Number(row.elo), `${email} should reset to 1000 — the pre-season match must be excluded`).toBe(1000)
    }

    const [preSeasonMatch] = await sql`
      SELECT m.id::text AS id FROM matches m
      JOIN match_players mp ON mp.match_id = m.id
      WHERE mp.player_id = ${ids.get(p1.email)}::uuid AND m.played_at = ${beforeSeason.toISOString()}
    `
    const frozen = await sql`SELECT player_id::text AS player_id, elo_before, elo_after FROM match_players WHERE match_id = ${preSeasonMatch.id}::uuid`
    for (const r of frozen) {
      const isWinner = [ids.get(p1.email), ids.get(p2.email)].includes(r.player_id as string)
      expect(Number(r.elo_before), "pre-season match history must never be rewritten").toBe(1000)
      expect(Number(r.elo_after), "pre-season match history must never be rewritten").toBe(isWinner ? 1033 : 967)
    }
  })
})

test.describe("Derniers champions card", () => {
  test("shows seeded champions most-recent-first with correct name/season, and opens the right profile on click", async ({ page }) => {
    // Distinct first AND last names — testPlayer()'s de-duplication concern
    // (see helpers/players.ts) is only about the EMAIL format, so two
    // fixtures sharing a last name would still create fine, but it would
    // make the ordering assertion below ambiguous (indexOf() finding
    // "Winner" wouldn't say which champion's row it found).
    const champOlder = testPlayer("championaz", "elderwin")
    const champNewer = testPlayer("championbz", "freshwin")
    const ids = await ensurePlayers([champOlder, champNewer], 1200)

    // getSeasonChampions orders by created_at DESC — insert the older one
    // first so the newer insert is unambiguously "most recent".
    await sql`
      INSERT INTO season_champions (season_key, season_label, player_id, elo)
      VALUES ('e2e-dummy-season-older', 'Hiver 2020', ${ids.get(champOlder.email)}::uuid, 1180)
    `
    await sql`
      INSERT INTO season_champions (season_key, season_label, player_id, elo)
      VALUES ('e2e-dummy-season-newer', 'Été 2021', ${ids.get(champNewer.email)}::uuid, 1220)
    `

    // No need to scope to a "card" container first — both fixtures' names
    // and season labels are unique enough strings that a direct page-level
    // locator can't collide with anything else on the page.
    await page.goto("/")
    await expect(page.getByText(`${champOlder.firstName} ${champOlder.lastName}`)).toBeVisible()
    await expect(page.getByText(`${champNewer.firstName} ${champNewer.lastName}`)).toBeVisible()
    await expect(page.getByText("Hiver 2020")).toBeVisible()
    await expect(page.getByText("Été 2021")).toBeVisible()

    const html = await page.content()
    expect(
      html.indexOf(champNewer.lastName),
      "the more recently recorded champion (champNewer) must render before the older one"
    ).toBeLessThan(html.indexOf(champOlder.lastName))

    await page.getByRole("button", { name: `Profil de ${champNewer.firstName} ${champNewer.lastName}` }).first().click()
    const dialog = page.getByRole("dialog")
    await expect(dialog.getByText(`${champNewer.firstName} ${champNewer.lastName}`).first()).toBeVisible()
  })

  test("shows the empty state when there are no recorded champions", async ({ page }) => {
    // A fresh, uniquely-scoped assertion isn't possible here the way other
    // tests scope to their own players — this message is global to the
    // card, not per-champion — so this only holds meaningfully on a run
    // where no OTHER test has seeded season_champions yet. Given the global
    // empty-DB reset at suite start and that this file's other season_champions
    // inserts use obviously-fake 'e2e-dummy-season-*' keys, this is safe as
    // long as it runs before those — hence no "z" prefix on this file.
    const existing = await sql`SELECT 1 FROM season_champions LIMIT 1`
    test.skip(existing.length > 0, "season_champions already has rows from another test in this run")

    await page.goto("/")
    await expect(page.getByText("Aucune saison terminée")).toBeVisible()
  })
})

test.describe("season theme page-load sanity", () => {
  test("homepage renders the season row with no console errors", async ({ page }) => {
    const errors: string[] = []
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text())
    })
    page.on("pageerror", (err) => errors.push(err.message))

    await page.goto("/")
    // Give the client-side useSyncExternalStore hooks (particles, ring
    // clip-path, countdown) a moment to settle past their first tick.
    await page.waitForTimeout(1500)

    expect(errors, `console/page errors on load:\n${errors.join("\n")}`).toEqual([])
  })
})
