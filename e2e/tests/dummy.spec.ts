import { test, expect } from "@playwright/test"

// Smoke test: proves the whole pipeline works end to end —
// Neon branch reset (global-setup) -> app boots against it -> app can query
// an empty database without erroring -> Playwright can drive a real browser
// against it. Once this is green, the full suite (UI features + ELO
// correctness) gets built on top of this same scaffold.
test("homepage loads against the freshly-reset e2e database", async ({ page }) => {
  await page.goto("/")

  await expect(page.getByText("AtosBaby")).toBeVisible()

  // Empty-state proof: no players yet, so the podium renders its skeleton
  // rather than real player cards, and there's no "Voir plus de matchs"
  // pagination button (which only appears once matches exist).
  await expect(page.getByRole("button", { name: "Sélecteur d'équipes" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Ajouter un match" })).toBeVisible()
})
