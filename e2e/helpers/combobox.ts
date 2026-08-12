import { expect, type Locator, type Page } from "@playwright/test"

/**
 * Clicks a PlayerCombobox trigger, types a raw email into its search input,
 * and commits it with Enter (works whether the player already exists or is
 * brand new — see PlayerCombobox.commitEmail in src/components).
 *
 * The real signal that the commit landed is the TRIGGER's own label
 * changing from the placeholder to the committed value, driven by the
 * `value` prop the parent form holds — checking that (rather than the
 * popover closing) is what actually surfaces a genuinely invalid email
 * (PlayerCombobox only accepts `firstname.lastname@atos.net`, letters
 * only — see helpers/players.ts) as a clear error instead of a silent
 * timeout. The retry-with-Escape fallback below is defensive: each
 * combobox instance's popover can occasionally still be closing when the
 * next one opens, which can leave a stray panel intercepting clicks.
 */
export async function fillPlayerCombobox(page: Page, trigger: Locator, email: string): Promise<void> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    await trigger.click()
    const input = page.getByPlaceholder("Nom ou email...").and(page.locator(":visible")).last()
    await input.waitFor({ state: "visible", timeout: 5_000 }).catch(() => {})
    await input.fill(email)
    await input.press("Enter")

    try {
      await expect(trigger).not.toHaveText("prenom.nom@atos.net", { timeout: 3_000 })
      return
    } catch {
      const stray = page.getByPlaceholder("Nom ou email...").and(page.locator(":visible"))
      const count = await stray.count()
      for (let i = 0; i < count; i++) {
        await stray.nth(i).press("Escape").catch(() => {})
      }
    }
  }
  throw new Error(
    `fillPlayerCombobox: trigger label never updated after committing "${email}". ` +
    `If this email doesn't match /^[a-z]+\\.[a-z]+@atos\\.net$/i (letters only, one dot), ` +
    `that's the real cause — check helpers/players.ts naming.`
  )
}

/**
 * A just-closed popover panel can keep visually overlapping nearby controls
 * (intercepting clicks) for a beat even after its input is gone. Call this
 * after filling player fields and before interacting with anything else in
 * the same dialog (e.g. the score buttons).
 */
export async function waitForNoOpenPlayerPopovers(page: Page): Promise<void> {
  const stray = page.getByPlaceholder("Nom ou email...").and(page.locator(":visible"))
  try {
    await expect(stray).toHaveCount(0, { timeout: 5_000 })
  } catch {
    const count = await stray.count()
    for (let i = 0; i < count; i++) {
      await stray.nth(i).press("Escape").catch(() => {})
    }
    await expect(stray).toHaveCount(0, { timeout: 5_000 })
  }
}
