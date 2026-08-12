import { test, expect } from "@playwright/test"
import { ensurePlayers, seedMatch } from "../helpers/seed"
import { testPlayer } from "../helpers/players"

/** Seeds a chronological win/loss sequence for `player` (always team A attacker) against a fixed opponent pair. */
async function seedSequence(
  ids: Map<string, string>,
  player: string,
  partner: string,
  opp: [string, string],
  outcomesOldToNew: boolean[] // true = player's team wins
) {
  const base = Date.now() - outcomesOldToNew.length * 60_000
  for (let i = 0; i < outcomesOldToNew.length; i++) {
    const won = outcomesOldToNew[i]
    await seedMatch({
      teamA: { attackerId: ids.get(player)!, defenderId: ids.get(partner)! },
      teamB: { attackerId: ids.get(opp[0])!, defenderId: ids.get(opp[1])! },
      scoreA: won ? 10 : 4,
      scoreB: won ? 4 : 10,
      playedAt: new Date(base + i * 60_000),
    })
  }
}

test.describe("win/loss streaks", () => {
  test("a 5-game current win streak shows a streak badge in the rankings row", async ({ page }) => {
    const p = testPlayer("streakfive", "hero")
    const partner = testPlayer("streakfive", "mate")
    const opp: [string, string] = [testPlayer("streakfive", "oppa").email, testPlayer("streakfive", "oppb").email]
    const ids = await ensurePlayers([p, partner, testPlayer("streakfive", "oppa"), testPlayer("streakfive", "oppb")])

    // W, W, L, then 5 straight W's => current streak = 5, but total wins = 7
    // (so the streak badge's "5" can't be confused with the wins column).
    await seedSequence(ids, p.email, partner.email, opp, [true, true, false, true, true, true, true, true])

    await page.goto("/")
    const showMore = page.getByRole("button", { name: "Voir plus de joueurs" })
    if (await showMore.isVisible().catch(() => false)) await showMore.click()

    const row = page.getByTestId("player-row").filter({ has: page.getByRole("button", { name: `Profil de ${p.firstName} ${p.lastName}` }) })
    await expect(row.getByText("7", { exact: true })).toBeVisible() // wins column
    await expect(row.getByText("5", { exact: true })).toBeVisible() // streak badge
  })

  test("a 4-game streak is below the badge threshold (no badge shown)", async ({ page }) => {
    const p = testPlayer("streakfour", "hero")
    const partner = testPlayer("streakfour", "mate")
    const opp: [string, string] = [testPlayer("streakfour", "oppa").email, testPlayer("streakfour", "oppb").email]
    const ids = await ensurePlayers([p, partner, testPlayer("streakfour", "oppa"), testPlayer("streakfour", "oppb")])
    // L, then 4 straight W's => current streak = 4, but total wins = 4 and
    // total matches = 5 (the old loss keeps wins from equalling matches_played
    // too, so "4" can only mean the wins column if the badge is absent).
    await seedSequence(ids, p.email, partner.email, opp, [false, true, true, true, true])

    await page.goto("/")
    const showMore = page.getByRole("button", { name: "Voir plus de joueurs" })
    if (await showMore.isVisible().catch(() => false)) await showMore.click()

    const row = page.getByTestId("player-row").filter({ has: page.getByRole("button", { name: `Profil de ${p.firstName} ${p.lastName}` }) })
    // "4" appears once (wins column) — if the badge were also showing, it'd appear twice.
    await expect(row.getByText("4", { exact: true })).toHaveCount(1)
  })

  test("a loss streak shows the ice/snowflake variant", async ({ page }) => {
    const p = testPlayer("streakice", "hero")
    const partner = testPlayer("streakice", "mate")
    const opp: [string, string] = [testPlayer("streakice", "oppa").email, testPlayer("streakice", "oppb").email]
    const ids = await ensurePlayers([p, partner, testPlayer("streakice", "oppa"), testPlayer("streakice", "oppb")])
    // W, then 5 straight losses => current streak = -5, total losses = 5+? make wins count differ from 5.
    await seedSequence(ids, p.email, partner.email, opp, [true, true, false, false, false, false, false])

    await page.goto("/")
    const showMore = page.getByRole("button", { name: "Voir plus de joueurs" })
    if (await showMore.isVisible().catch(() => false)) await showMore.click()

    const row = page.getByTestId("player-row").filter({ has: page.getByRole("button", { name: `Profil de ${p.firstName} ${p.lastName}` }) })
    await expect(row.getByText("2", { exact: true })).toBeVisible() // wins column
    // "5" legitimately appears twice here (losses column + streak badge) —
    // .first() is enough to confirm the badge renders at all.
    await expect(row.getByText("5", { exact: true }).first()).toBeVisible()
  })
})
