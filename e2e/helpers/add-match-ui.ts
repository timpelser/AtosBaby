import type { Page } from "@playwright/test"
import { fillPlayerCombobox, waitForNoOpenPlayerPopovers } from "./combobox"

export type MatchInput = {
  teamA: { defenderEmail: string; attackerEmail: string }
  teamB: { defenderEmail: string; attackerEmail: string }
  scoreA: number
  scoreB: number
}

/**
 * Drives the real "Ajouter un match" dialog end to end: opens it, fills all
 * 4 player fields by typing a raw email + Enter (works whether the player
 * already exists or is brand new — see PlayerCombobox.commitEmail), sets
 * the score via the +10 quick-set / +1 buttons, and submits.
 *
 * This is the only way ELO-correctness tests should create matches — it
 * exercises the real saveMatch server action, not a shortcut.
 */
export async function addMatchViaUI(page: Page, input: MatchInput): Promise<void> {
  if (input.scoreA === input.scoreB) throw new Error("addMatchViaUI: scores can't be equal")
  if (input.scoreA !== 10 && input.scoreB !== 10) throw new Error("addMatchViaUI: one score must be exactly 10")

  await page.getByRole("button", { name: "Ajouter un match" }).click()
  const dialog = page.getByRole("dialog")
  await dialog.getByText("Nouveau Match").waitFor()

  // DOM order: Team A [Défenseur, Attaquant], Team B [Défenseur, Attaquant] —
  // each PlayerCombobox trigger always carries aria-expanded, nothing else
  // in this dialog does.
  const combos = dialog.locator("button[aria-expanded]")
  const emails = [
    input.teamA.defenderEmail,
    input.teamA.attackerEmail,
    input.teamB.defenderEmail,
    input.teamB.attackerEmail,
  ]
  for (let i = 0; i < 4; i++) {
    await fillPlayerCombobox(page, combos.nth(i), emails[i])
  }

  await waitForNoOpenPlayerPopovers(page)

  // Score buttons: [+ (A), +10 (A), − (A), + (B), +10 (B), − (B)] in DOM order.
  const plus10 = dialog.getByRole("button", { name: "+10" })
  const plus1 = dialog.getByRole("button", { name: "+", exact: true })
  await setScore(plus10, plus1, 0, input.scoreA)
  await setScore(plus10, plus1, 1, input.scoreB)

  await dialog.getByRole("button", { name: "ENREGISTRER LE MATCH" }).click()
  await dialog.waitFor({ state: "hidden" })
}

async function setScore(
  plus10: ReturnType<Page["getByRole"]>,
  plus1: ReturnType<Page["getByRole"]>,
  teamIndex: 0 | 1,
  score: number
): Promise<void> {
  if (score === 10) {
    await plus10.nth(teamIndex).click()
    return
  }
  for (let i = 0; i < score; i++) {
    await plus1.nth(teamIndex).click()
  }
}
