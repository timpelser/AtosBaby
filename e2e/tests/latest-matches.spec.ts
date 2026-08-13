import { test, expect } from "@playwright/test"
import { ensurePlayers, seedMatch } from "../helpers/seed"
import { testPlayer } from "../helpers/players"
import { unlockAdmin } from "../helpers/admin"

function matchRow(page: import("@playwright/test").Page, name1: string, name2: string) {
  return page.getByTestId("match-row").filter({ hasText: name1 }).filter({ hasText: name2 })
}

test.describe("latest matches", () => {
  test("a seeded match appears in the feed with correct teams and score", async ({ page }) => {
    const a = [testPlayer("feedz", "attacka"), testPlayer("feedz", "defenda")]
    const b = [testPlayer("feedz", "attackb"), testPlayer("feedz", "defendb")]
    const ids = await ensurePlayers([...a, ...b])

    await seedMatch({
      teamA: { attackerId: ids.get(a[0].email)!, defenderId: ids.get(a[1].email)! },
      teamB: { attackerId: ids.get(b[0].email)!, defenderId: ids.get(b[1].email)! },
      scoreA: 10,
      scoreB: 6,
    })

    await page.goto("/")
    const row = matchRow(page, `${a[0].firstName} ${a[0].lastName}`, `${b[0].firstName} ${b[0].lastName}`)
    await expect(row).toBeVisible()
    // Score spans have a fixed structural class — scoped this way instead of
    // plain text matching, since a raw "10"/"6" could coincidentally also
    // appear in the row's date (e.g. "6 août").
    const scoreSpans = row.locator("span.w-10.h-10")
    await expect(scoreSpans).toHaveCount(2)
    await expect(scoreSpans.nth(0)).toHaveText("10")
    await expect(scoreSpans.nth(1)).toHaveText("6")
  })

  test("match detail dialog shows both teams, positions, and ELO deltas", async ({ page }) => {
    const a = [testPlayer("detz", "attacka"), testPlayer("detz", "defenda")]
    const b = [testPlayer("detz", "attackb"), testPlayer("detz", "defendb")]
    const ids = await ensurePlayers([...a, ...b])

    await seedMatch({
      teamA: { attackerId: ids.get(a[0].email)!, defenderId: ids.get(a[1].email)! },
      teamB: { attackerId: ids.get(b[0].email)!, defenderId: ids.get(b[1].email)! },
      scoreA: 10,
      scoreB: 4,
      elo: {
        aAtt: { before: 1000, after: 1020 },
        aDef: { before: 1000, after: 1020 },
        bAtt: { before: 1000, after: 980 },
        bDef: { before: 1000, after: 980 },
      },
    })

    await page.goto("/")
    const row = matchRow(page, `${a[0].firstName} ${a[0].lastName}`, `${b[0].firstName} ${b[0].lastName}`)
    await row.getByTitle("Détails du match").click()

    const dialog = page.getByRole("dialog")
    // "Équipe A"/"Équipe B" legitimately appear twice (score header + team
    // section label) — .first() is enough to prove the dialog rendered them.
    await expect(dialog.getByText("Équipe A").first()).toBeVisible()
    await expect(dialog.getByText("Équipe B").first()).toBeVisible()
    await expect(dialog.getByText(`${a[0].firstName} ${a[0].lastName}`)).toBeVisible()
    // Both team A players (and both team B players) share the same delta
    // here, so "+20"/"-20" legitimately appear twice each — .first() just
    // proves the badges rendered with the right sign and magnitude.
    // Note: EloDeltaBadge renders a negative number's default toString(), a
    // plain ASCII hyphen ("-20") — not the special U+2212 minus sign the
    // score +/- buttons use elsewhere in the app.
    await expect(dialog.getByText("+20").first()).toBeVisible()
    await expect(dialog.getByText("-20").first()).toBeVisible()
  })

  test("more than 7 matches triggers pagination", async ({ page }) => {
    const a = [testPlayer("mpagez", "attacka"), testPlayer("mpagez", "defenda")]
    const b = [testPlayer("mpagez", "attackb"), testPlayer("mpagez", "defendb")]
    const ids = await ensurePlayers([...a, ...b])

    for (let i = 0; i < 8; i++) {
      await seedMatch({
        teamA: { attackerId: ids.get(a[0].email)!, defenderId: ids.get(a[1].email)! },
        teamB: { attackerId: ids.get(b[0].email)!, defenderId: ids.get(b[1].email)! },
        scoreA: 10,
        scoreB: 1,
      })
    }

    await page.goto("/")
    const showMore = page.getByRole("button", { name: "Voir plus de matchs" })
    await expect(showMore).toBeVisible()
    await showMore.click()
    await expect(page.getByRole("button", { name: "Voir moins de matchs" })).toBeVisible()
  })

  test("delete button only appears in admin mode, and removes the match", async ({ page }) => {
    const a = [testPlayer("delz", "attacka"), testPlayer("delz", "defenda")]
    const b = [testPlayer("delz", "attackb"), testPlayer("delz", "defendb")]
    const ids = await ensurePlayers([...a, ...b])
    await seedMatch({
      teamA: { attackerId: ids.get(a[0].email)!, defenderId: ids.get(a[1].email)! },
      teamB: { attackerId: ids.get(b[0].email)!, defenderId: ids.get(b[1].email)! },
      scoreA: 10,
      scoreB: 8,
    })

    await page.goto("/")
    const row = matchRow(page, `${a[0].firstName} ${a[0].lastName}`, `${b[0].firstName} ${b[0].lastName}`)
    await expect(row.getByTitle("Supprimer ce match")).toHaveCount(0)

    await unlockAdmin(page)
    await expect(row.getByTitle("Supprimer ce match")).toBeVisible()

    await row.getByTitle("Supprimer ce match").click()
    await page.getByRole("dialog").getByRole("button", { name: "Supprimer" }).click()
    // deleteMatch triggers a full recomputeAllElos over every match in the
    // DB, sequentially — as the run accumulates matches from earlier specs
    // this can take a while, especially over CI's network path to Neon.
    await expect(row).toHaveCount(0, { timeout: 20_000 })
  })
})
