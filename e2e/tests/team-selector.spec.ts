import { test, expect } from "@playwright/test"
import { ensurePlayers, seedMatch, setPlayerElo } from "../helpers/seed"
import { testPlayer } from "../helpers/players"
import { fillPlayerCombobox, waitForNoOpenPlayerPopovers } from "../helpers/combobox"

async function selectFourPlayers(page: import("@playwright/test").Page, emails: string[]) {
  await page.getByRole("button", { name: "Sélecteur d'équipes" }).click()
  const dialog = page.getByRole("dialog")
  await dialog.getByText("Sélecteur d'équipes").waitFor()
  const combos = dialog.locator("button[aria-expanded]")
  for (let i = 0; i < 4; i++) {
    await fillPlayerCombobox(page, combos.nth(i), emails[i])
  }
  await waitForNoOpenPlayerPopovers(page)
  return dialog
}

test.describe("team selector", () => {
  test("random shuffle splits the 4 selected players into two teams of two", async ({ page }) => {
    const [alice, bob, carol, dave] = [
      testPlayer("shufflez", "alice"),
      testPlayer("shufflez", "bob"),
      testPlayer("shufflez", "carol"),
      testPlayer("shufflez", "dave"),
    ]
    const ids = await ensurePlayers([alice, bob, carol, dave], 1000)
    // One shared match just to get all 4 into playerStats (Team Selector's ELO source) — outcome is irrelevant here.
    await seedMatch({
      teamA: { attackerId: ids.get(alice.email)!, defenderId: ids.get(bob.email)! },
      teamB: { attackerId: ids.get(carol.email)!, defenderId: ids.get(dave.email)! },
      scoreA: 10,
      scoreB: 3,
    })

    await page.goto("/")
    const dialog = await selectFourPlayers(page, [alice.email, bob.email, carol.email, dave.email])

    await dialog.getByRole("button", { name: "Mélanger" }).click()
    // Scope to the result cards, not the whole dialog — the 4 combobox
    // triggers above also display these same names as their selected value.
    const teamACard = dialog.getByText("Équipe A", { exact: true }).locator("..")
    const teamBCard = dialog.getByText("Équipe B", { exact: true }).locator("..")
    await expect(teamACard).toBeVisible()
    await expect(teamBCard).toBeVisible()
    for (const p of [alice, bob, carol, dave]) {
      const name = `${p.firstName} ${p.lastName}`
      await expect(teamACard.getByText(name).or(teamBCard.getByText(name))).toBeVisible()
    }

    // Reshuffle button relabels once a result exists.
    await expect(dialog.getByRole("button", { name: "Mélanger à nouveau" })).toBeVisible()
  })

  test("balanced teams picks the pairing with the smallest ELO gap", async ({ page }) => {
    const alice = testPlayer("balz", "alice")
    const bob = testPlayer("balz", "bob")
    const carol = testPlayer("balz", "carol")
    const dave = testPlayer("balz", "dave")
    const ids = await ensurePlayers([alice, bob, carol, dave], 1000)
    await setPlayerElo(ids.get(carol.email)!, 2000)
    await setPlayerElo(ids.get(dave.email)!, 2000)

    await seedMatch({
      teamA: { attackerId: ids.get(alice.email)!, defenderId: ids.get(bob.email)! },
      teamB: { attackerId: ids.get(carol.email)!, defenderId: ids.get(dave.email)! },
      scoreA: 10,
      scoreB: 5,
    })

    await page.goto("/")
    const dialog = await selectFourPlayers(page, [alice.email, bob.email, carol.email, dave.email])
    await dialog.getByRole("tab", { name: "Équipes équilibrées" }).click()

    // With [1000,1000,2000,2000] selected in order Alice,Bob,Carol,Dave, the
    // unique min-gap pairing (per computeBalanced's deterministic tie-break)
    // is {Alice, Carol} vs {Bob, Dave} — diff 0, chosen over the [Alice,Bob]
    // vs [Carol,Dave] pairing (diff 1000).
    const teamACard = dialog.getByText("Équipe A").locator("..")
    const teamBCard = dialog.getByText("Équipe B").locator("..")
    await expect(teamACard.getByText(`${alice.firstName} ${alice.lastName}`)).toBeVisible()
    await expect(teamACard.getByText(`${carol.firstName} ${carol.lastName}`)).toBeVisible()
    await expect(teamBCard.getByText(`${bob.firstName} ${bob.lastName}`)).toBeVisible()
    await expect(teamBCard.getByText(`${dave.firstName} ${dave.lastName}`)).toBeVisible()
    await expect(dialog.getByText(/Différence\s*:/)).toBeVisible()
    await expect(dialog.getByText("0 pts ELO")).toBeVisible()
  })

  test("prompts for 4 different players before showing a balanced result", async ({ page }) => {
    await page.goto("/")
    await page.getByRole("button", { name: "Sélecteur d'équipes" }).click()
    const dialog = page.getByRole("dialog")
    await dialog.getByRole("tab", { name: "Équipes équilibrées" }).click()
    await expect(dialog.getByText("Sélectionnez 4 joueurs différents pour voir le résultat.")).toBeVisible()
  })
})
