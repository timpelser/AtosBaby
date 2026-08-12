import type { Page } from "@playwright/test"

/** Clicks the "⚽ AtosBaby" logo 5x within 2s and submits the admin password. */
export async function unlockAdmin(page: Page, password = process.env.ADMIN_PASSWORD!): Promise<void> {
  const logo = page.getByTestId("admin-logo")
  for (let i = 0; i < 5; i++) {
    await logo.click()
  }
  await page.getByPlaceholder("Mot de passe").fill(password)
  await page.getByRole("button", { name: "Confirmer" }).click()
}

/** Same 5-click unlock, but leaves the password dialog open (for wrong-password tests). */
export async function openAdminPasswordDialog(page: Page): Promise<void> {
  const logo = page.getByTestId("admin-logo")
  for (let i = 0; i < 5; i++) {
    await logo.click()
  }
}

export async function logoutAdmin(page: Page): Promise<void> {
  await page.getByTitle("Quitter le mode admin").click()
}
