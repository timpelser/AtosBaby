import { test, expect } from "@playwright/test"
import { sql } from "../helpers/db"
import { ensurePlayers, seedMatch } from "../helpers/seed"
import { pool, testPlayer } from "../helpers/players"

// The whole suite runs on a single worker (see playwright.config.ts), so
// there's no cross-test race here — but "top of the leaderboard" still
// isn't a fixed fixture, since every earlier-run spec's players are still
// in the DB too. So these assertions read whatever the UI currently shows
// and cross-check it against an independent SQL query, rather than assuming
// a specific fixture must be #1. That tests the real thing (does the UI
// correctly render the DB's own ranking?) without caring what's in the DB.

test.describe("rankings & podium", () => {
  test("podium's #1 card matches the DB's actual top player by ELO", async ({ page }) => {
    // Guarantee at least one real player_stats row exists even if this spec
    // runs in isolation (e.g. via --grep).
    const [p] = pool("podz", 1)
    const ids = await ensurePlayers([p])
    const [partner] = pool("podzpartner", 1)
    const partnerIds = await ensurePlayers([partner])
    const opp = pool("podzopp", 2)
    const oppIds = await ensurePlayers(opp)
    await seedMatch({
      teamA: { attackerId: ids.get(p.email)!, defenderId: partnerIds.get(partner.email)! },
      teamB: { attackerId: oppIds.get(opp[0].email)!, defenderId: oppIds.get(opp[1].email)! },
      scoreA: 10,
      scoreB: 2,
    })

    const [dbTop] = await sql`SELECT p.first_name, p.last_name, p.elo FROM player_stats ps JOIN players p ON p.id = ps.id ORDER BY p.elo DESC LIMIT 1`

    await page.goto("/")
    const podium = page.locator("section").first()
    await expect(podium.getByText(`${dbTop.first_name} ${dbTop.last_name}`)).toBeVisible()
    await expect(podium.getByText(String(dbTop.elo))).toBeVisible()
  })

  test("rankings table shows correct W/L/ratio/ELO for a seeded player", async ({ page }) => {
    const player = testPlayer("rankrow", "alpha")
    const partner = testPlayer("rankrow", "bravo")
    const opp = [testPlayer("rankrow", "charlie"), testPlayer("rankrow", "delta")]
    const ids = await ensurePlayers([player, partner, ...opp])

    // 2 wins, 1 loss => 66.7% win rate.
    await seedMatch({
      teamA: { attackerId: ids.get(player.email)!, defenderId: ids.get(partner.email)! },
      teamB: { attackerId: ids.get(opp[0].email)!, defenderId: ids.get(opp[1].email)! },
      scoreA: 10, scoreB: 3,
    })
    await seedMatch({
      teamA: { attackerId: ids.get(player.email)!, defenderId: ids.get(partner.email)! },
      teamB: { attackerId: ids.get(opp[0].email)!, defenderId: ids.get(opp[1].email)! },
      scoreA: 10, scoreB: 7,
    })
    await seedMatch({
      teamA: { attackerId: ids.get(opp[0].email)!, defenderId: ids.get(opp[1].email)! },
      teamB: { attackerId: ids.get(player.email)!, defenderId: ids.get(partner.email)! },
      scoreA: 10, scoreB: 1,
    })
    await sql`UPDATE players SET elo = 1234 WHERE id = ${ids.get(player.email)}::uuid`

    await page.goto("/")
    const showMore = page.getByRole("button", { name: "Voir plus de joueurs" })
    if (await showMore.isVisible().catch(() => false)) await showMore.click()

    const row = page.getByTestId("player-row").filter({
      has: page.getByRole("button", { name: `Profil de ${player.firstName} ${player.lastName}` }),
    })
    await expect(row.getByText("1234", { exact: true })).toBeVisible()
    await expect(row.getByText("66.7%")).toBeVisible()
  })

  test("more than 7 players triggers pagination", async ({ page }) => {
    const players = pool("pagez", 8)
    const partner = testPlayer("pagezpartner", "one")
    const opp = [testPlayer("pagezopp", "one"), testPlayer("pagezopp", "two")]
    const ids = await ensurePlayers([...players, partner, ...opp])

    for (const p of players) {
      await seedMatch({
        teamA: { attackerId: ids.get(p.email)!, defenderId: ids.get(partner.email)! },
        teamB: { attackerId: ids.get(opp[0].email)!, defenderId: ids.get(opp[1].email)! },
        scoreA: 10, scoreB: 5,
      })
    }

    await page.goto("/")
    const showMore = page.getByRole("button", { name: "Voir plus de joueurs" })
    await expect(showMore).toBeVisible()
    await showMore.click()
    await expect(page.getByRole("button", { name: "Voir moins de joueurs" })).toBeVisible()
  })

  test("ELO info dialog explains the formula", async ({ page }) => {
    await page.goto("/")
    await page.getByRole("button", { name: "Comment fonctionne le score ELO ?" }).click()
    await expect(page.getByRole("dialog").getByText("Classement ELO")).toBeVisible()
    await expect(page.getByText(/E = 1 \/ \(1 \+ 10/)).toBeVisible()
  })

  test("position leaders' top attacker card matches the DB", async ({ page }) => {
    const [dbTop] = await sql`
      SELECT first_name, last_name, wins FROM position_stats
      WHERE position = 'attack'
      ORDER BY wins DESC, win_rate DESC LIMIT 1
    `
    test.skip(!dbTop, "no attack matches seeded yet in this run")

    await page.goto("/")
    // "Meilleur Attaquant" <p> -> icon+label div -> header-row div -> card
    // (which also contains the top-3 player rows we're asserting against).
    const card = page.getByText("Meilleur Attaquant").locator("../../..")
    await expect(card.getByText(`${dbTop.first_name} ${dbTop.last_name}`)).toBeVisible()
  })
})
