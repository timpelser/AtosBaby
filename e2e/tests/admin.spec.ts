import { test, expect } from "@playwright/test"
import { openAdminPasswordDialog, unlockAdmin, logoutAdmin } from "../helpers/admin"
import { ensurePlayers, seedMatch } from "../helpers/seed"
import { testPlayer } from "../helpers/players"

test.describe("admin mode", () => {
  test("wrong password is rejected and does not unlock admin mode", async ({ page }) => {
    await page.goto("/")
    await openAdminPasswordDialog(page)
    await page.getByPlaceholder("Mot de passe").fill("definitely-not-the-password")
    await page.getByRole("button", { name: "Confirmer" }).click()

    await expect(page.getByText("Mot de passe incorrect.")).toBeVisible()

    // The dialog stays open to show the error — the rest of the page is
    // aria-hidden while it's up, so close it before checking admin state.
    await page.getByRole("button", { name: "Annuler" }).click()
    await expect(page.getByRole("button", { name: "Ajouter un match" })).toBeVisible()
    await expect(page.getByTitle("Quitter le mode admin")).toHaveCount(0)
  })

  test("correct password unlocks admin mode, logout locks it again", async ({ page }) => {
    await page.goto("/")
    await unlockAdmin(page)

    // getByText("ADMIN") would also match "Mode administrateur" (substring,
    // case-insensitive) if that dialog were still in the DOM. And there are
    // separate desktop/mobile ADMIN badges (CSS-toggled, both in the DOM
    // regardless of viewport) — .and(':visible') picks whichever applies.
    await expect(page.getByTestId("admin-logo").getByText("ADMIN", { exact: true }).and(page.locator(":visible"))).toBeVisible()
    await expect(page.getByTitle("Quitter le mode admin")).toBeVisible()

    await logoutAdmin(page)
    await expect(page.getByTitle("Quitter le mode admin")).toHaveCount(0)
  })

  test("deleting a match removes it and updates the leaderboard", async ({ page }) => {
    const a = [testPlayer("admdelz", "attacka"), testPlayer("admdelz", "defenda")]
    const b = [testPlayer("admdelz", "attackb"), testPlayer("admdelz", "defendb")]
    const ids = await ensurePlayers([...a, ...b])
    await seedMatch({
      teamA: { attackerId: ids.get(a[0].email)!, defenderId: ids.get(a[1].email)! },
      teamB: { attackerId: ids.get(b[0].email)!, defenderId: ids.get(b[1].email)! },
      scoreA: 10,
      scoreB: 9,
    })

    await page.goto("/")
    const row = page.getByTestId("match-row").filter({ hasText: `${a[0].firstName} ${a[0].lastName}` }).filter({ hasText: `${b[0].firstName} ${b[0].lastName}` })
    await expect(row).toBeVisible()

    await unlockAdmin(page)
    await row.getByTitle("Supprimer ce match").click()
    await page.getByRole("dialog").getByRole("button", { name: "Supprimer" }).click()

    await expect(row).toHaveCount(0)
  })
})
