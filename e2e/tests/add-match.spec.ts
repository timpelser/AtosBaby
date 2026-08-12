import { test, expect } from "@playwright/test"
import { sql } from "../helpers/db"
import { addMatchViaUI } from "../helpers/add-match-ui"
import { fillPlayerCombobox, waitForNoOpenPlayerPopovers } from "../helpers/combobox"
import { testPlayer } from "../helpers/players"

test.describe("add match dialog", () => {
  test("submit is disabled until 4 distinct players and a valid 10-x score are set", async ({ page }) => {
    const [a1, a2, b1, b2] = [
      testPlayer("addval", "aone"),
      testPlayer("addval", "atwo"),
      testPlayer("addval", "bone"),
      testPlayer("addval", "btwo"),
    ]

    await page.goto("/")
    await page.getByRole("button", { name: "Ajouter un match" }).click()
    const dialog = page.getByRole("dialog")
    const submit = dialog.getByRole("button", { name: "ENREGISTRER LE MATCH" })
    await expect(submit).toBeDisabled()

    const combos = dialog.locator("button[aria-expanded]")

    // Fill 3 of 4 players — still invalid (missing one, and score is 0-0).
    for (const [i, p] of [a1, a2, b1].entries()) {
      await fillPlayerCombobox(page, combos.nth(i), p.email)
    }
    await expect(submit).toBeDisabled()

    // 4th player, but score still 0-0 (no side at 10) — still invalid.
    await fillPlayerCombobox(page, combos.nth(3), b2.email)
    await waitForNoOpenPlayerPopovers(page)
    await expect(submit).toBeDisabled()

    // Both sides at 10 is also invalid (a match can't end in a tie at 10-10).
    await dialog.getByRole("button", { name: "+10" }).first().click()
    await dialog.getByRole("button", { name: "+10" }).last().click()
    await expect(submit).toBeDisabled()

    // Bring team B down to 3 — now valid.
    const minus = dialog.getByRole("button", { name: "−", exact: true })
    for (let i = 0; i < 7; i++) {
      await minus.last().click()
    }
    await expect(submit).toBeEnabled()
  })

  test("typing the same email into two player fields keeps the form invalid", async ({ page }) => {
    const dup = testPlayer("adddup", "same")
    const other = [testPlayer("adddup", "bone"), testPlayer("adddup", "btwo")]

    await page.goto("/")
    await page.getByRole("button", { name: "Ajouter un match" }).click()
    const dialog = page.getByRole("dialog")
    const combos = dialog.locator("button[aria-expanded]")

    for (const [i, p] of [dup, dup, other[0], other[1]].entries()) {
      await fillPlayerCombobox(page, combos.nth(i), p.email)
    }
    await waitForNoOpenPlayerPopovers(page)
    await dialog.getByRole("button", { name: "+10" }).first().click()

    await expect(dialog.getByRole("button", { name: "ENREGISTRER LE MATCH" })).toBeDisabled()
  })

  test("saving a match with a brand-new email auto-creates that player", async ({ page }) => {
    const p = testPlayer("addnew", "brandnew")
    const partner = testPlayer("addnew", "partner")
    const opp = [testPlayer("addnew", "oppa"), testPlayer("addnew", "oppb")]

    await page.goto("/")
    await addMatchViaUI(page, {
      teamA: { attackerEmail: p.email, defenderEmail: partner.email },
      teamB: { attackerEmail: opp[0].email, defenderEmail: opp[1].email },
      scoreA: 10,
      scoreB: 6,
    })

    // The dialog closes and the match shows up with the derived display name
    // (first.last@atos.net -> "First Last" — see upsertPlayer in src/lib/actions.ts).
    await expect(page.getByText(`${p.firstName} ${p.lastName}`).first()).toBeVisible()

    const rows = await sql`SELECT first_name, last_name, elo FROM players WHERE email = ${p.email}`
    expect(rows).toHaveLength(1)
    expect(rows[0].first_name).toBe(p.firstName)
    expect(rows[0].last_name).toBe(p.lastName)
  })
})
