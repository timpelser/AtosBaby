import { test, expect, Page } from "@playwright/test"
import { ensurePlayers, seedMatch } from "../helpers/seed"
import { testPlayer } from "../helpers/players"

async function openProfile(page: Page, firstName: string, lastName: string) {
  await page.goto("/")
  const showMore = page.getByRole("button", { name: "Voir plus de joueurs" })
  if (await showMore.isVisible().catch(() => false)) await showMore.click()
  await page.getByRole("button", { name: `Profil de ${firstName} ${lastName}` }).first().click()
  return page.getByRole("dialog")
}

test.describe("player profile dialog", () => {
  test("matches tab lists history and drills into match detail", async ({ page }) => {
    const p = testPlayer("profmz", "hero")
    const partner = testPlayer("profmz", "partner")
    const opp = [testPlayer("profmz", "oppa"), testPlayer("profmz", "oppb")]
    const ids = await ensurePlayers([p, partner, ...opp])

    await seedMatch({
      teamA: { attackerId: ids.get(p.email)!, defenderId: ids.get(partner.email)! },
      teamB: { attackerId: ids.get(opp[0].email)!, defenderId: ids.get(opp[1].email)! },
      scoreA: 10,
      scoreB: 7,
      elo: { aAtt: { before: 1000, after: 1015 } },
    })

    const dialog = await openProfile(page, p.firstName, p.lastName)
    // MatchesTab abbreviates to "F. Lastname" (see teamNames() in player-profile-dialog.tsx).
    await expect(dialog.getByText(opp[0].lastName, { exact: false }).first()).toBeVisible()
    await expect(dialog.getByText("+15")).toBeVisible()

    await dialog.getByText("+15").click()
    await expect(dialog.getByText("Retour aux matchs")).toBeVisible()
    // "Équipe A" legitimately appears twice (score header + team section label).
    await expect(dialog.getByText("Équipe A").first()).toBeVisible()
  })

  test("ELO tab shows current/peak stats once there are 2+ recorded points", async ({ page }) => {
    const p = testPlayer("profelz", "climber")
    const partner = testPlayer("profelz", "partner")
    const opp = [testPlayer("profelz", "oppa"), testPlayer("profelz", "oppb")]
    const ids = await ensurePlayers([p, partner, ...opp])

    await seedMatch({
      teamA: { attackerId: ids.get(p.email)!, defenderId: ids.get(partner.email)! },
      teamB: { attackerId: ids.get(opp[0].email)!, defenderId: ids.get(opp[1].email)! },
      scoreA: 10, scoreB: 3,
      elo: { aAtt: { before: 1000, after: 1030 } },
      playedAt: new Date(Date.now() - 60_000),
    })
    await seedMatch({
      teamA: { attackerId: ids.get(opp[0].email)!, defenderId: ids.get(opp[1].email)! },
      teamB: { attackerId: ids.get(p.email)!, defenderId: ids.get(partner.email)! },
      scoreA: 10, scoreB: 8,
      elo: { bAtt: { before: 1030, after: 1010 } },
    })

    const dialog = await openProfile(page, p.firstName, p.lastName)
    await dialog.getByRole("tab", { name: "Historique ELO" }).click()
    await expect(dialog.getByText("ELO actuel")).toBeVisible()
    await expect(dialog.getByText("1010", { exact: true })).toBeVisible()
    await expect(dialog.getByText("Pic ELO")).toBeVisible()
    await expect(dialog.getByText("1030", { exact: true })).toBeVisible()
  })

  test("ELO tab shows a placeholder with only 1 recorded point", async ({ page }) => {
    const p = testPlayer("profsolz", "single")
    const partner = testPlayer("profsolz", "partner")
    const opp = [testPlayer("profsolz", "oppa"), testPlayer("profsolz", "oppb")]
    const ids = await ensurePlayers([p, partner, ...opp])
    await seedMatch({
      teamA: { attackerId: ids.get(p.email)!, defenderId: ids.get(partner.email)! },
      teamB: { attackerId: ids.get(opp[0].email)!, defenderId: ids.get(opp[1].email)! },
      scoreA: 10, scoreB: 2,
      elo: { aAtt: { before: 1000, after: 1020 } },
    })

    const dialog = await openProfile(page, p.firstName, p.lastName)
    await dialog.getByRole("tab", { name: "Historique ELO" }).click()
    await expect(dialog.getByText("Pas assez de données pour afficher l'historique.")).toBeVisible()
  })

  test("rivals tab ranks opponents by matches played, most-faced first", async ({ page }) => {
    const p = testPlayer("profrz", "champ")
    const partner = testPlayer("profrz", "partner")
    const frequent = testPlayer("profrz", "frequent")
    const rare = testPlayer("profrz", "rare")
    // Rivalries are computed per INDIVIDUAL opponent, not per opposing duo —
    // so `frequent`'s teammate has to be a different one-off player each
    // match, otherwise that teammate would independently tie `frequent`'s
    // own matches_played count instead of being clearly behind it.
    const frequentMates = [testPlayer("profrz", "fmatea"), testPlayer("profrz", "fmateb"), testPlayer("profrz", "fmatec")]
    // `rare` needs its own fixed partner across both its matches — that
    // partner ties `rare`'s matches_played exactly, but since the top-3
    // cutoff has exactly 2 slots left after `frequent` takes #1, both of
    // them fit without needing to break that tie. A single 1-match "noise"
    // opponent would NOT be safe here — LIMIT 3 with an unresolved tie for
    // the last slot could arbitrarily exclude `rare`.
    const rareMate = testPlayer("profrz", "rmate")
    const ids = await ensurePlayers([p, partner, frequent, rare, rareMate, ...frequentMates])

    // p vs frequent: 3 matches (2 wins for p), each with a different partner for `frequent`
    // (so that partner doesn't independently tie `frequent`'s own count).
    for (const [i, scoreB] of [4, 6, 10].entries()) {
      await seedMatch({
        teamA: { attackerId: ids.get(p.email)!, defenderId: ids.get(partner.email)! },
        teamB: { attackerId: ids.get(frequent.email)!, defenderId: ids.get(frequentMates[i].email)! },
        scoreA: scoreB === 10 ? 8 : 10,
        scoreB,
      })
    }
    // p vs rare: 2 matches (both wins for p), same partner both times.
    for (const scoreB of [1, 2]) {
      await seedMatch({
        teamA: { attackerId: ids.get(p.email)!, defenderId: ids.get(partner.email)! },
        teamB: { attackerId: ids.get(rare.email)!, defenderId: ids.get(rareMate.email)! },
        scoreA: 10,
        scoreB,
      })
    }

    const dialog = await openProfile(page, p.firstName, p.lastName)
    await dialog.getByRole("tab", { name: "Rivalités" }).click()
    const frequentCard = dialog.getByText(`${frequent.firstName} ${frequent.lastName}`, { exact: true }).locator("../..")
    const rareCard = dialog.getByText(`${rare.firstName} ${rare.lastName}`, { exact: true }).locator("../..")
    await expect(frequentCard.getByText("3 matchs")).toBeVisible()
    await expect(rareCard.getByText("2 matchs")).toBeVisible()
  })
})
