import { test, expect } from "@playwright/test"
import { sql } from "../helpers/db"
import { addMatchViaUI } from "../helpers/add-match-ui"
import { computeMatchResult } from "../helpers/elo"
import { testPlayer } from "../helpers/players"
import { ensurePlayers, padGamesPlayed, getMatchPlayersElo, getLatestMatchIdForPlayer, seedMatch } from "../helpers/seed"
import { unlockAdmin } from "../helpers/admin"

// These tests are the reason the e2e/ scaffold exists: they drive matches
// through the REAL "Ajouter un match" dialog (never a shortcut) and compare
// the resulting DB state to an INDEPENDENTLY reimplemented formula
// (helpers/elo.ts, not imported from src/lib/actions.ts). If someone breaks
// the real ELO math, this is what catches it.

async function eloAfterFor(matchId: string, playerId: string): Promise<number> {
  const rows = await getMatchPlayersElo(matchId)
  const row = rows.find(r => r.playerId === playerId)
  if (!row || row.eloAfter == null) throw new Error(`No elo_after recorded for player ${playerId} in match ${matchId}`)
  return row.eloAfter
}

test.describe("ELO correctness", () => {
  test("first-ever match for 4 brand-new players uses K=94 and matches the reference formula", async ({ page }) => {
    const teamA = [testPlayer("elofreshz", "attackone"), testPlayer("elofreshz", "defendone")]
    const teamB = [testPlayer("elofreshz", "attacktwo"), testPlayer("elofreshz", "defendtwo")]

    await page.goto("/")
    await addMatchViaUI(page, {
      teamA: { attackerEmail: teamA[0].email, defenderEmail: teamA[1].email },
      teamB: { attackerEmail: teamB[0].email, defenderEmail: teamB[1].email },
      scoreA: 10,
      scoreB: 3,
    })

    const [aAtt, aDef, bAtt, bDef] = await Promise.all(
      [...teamA, ...teamB].map(async p => {
        const rows = await sql`SELECT id::text FROM players WHERE email = ${p.email}`
        return rows[0].id as string
      })
    )

    const expected = computeMatchResult({
      teamA: [{ id: aAtt, elo: 1000, gamesPlayedBefore: 0 }, { id: aDef, elo: 1000, gamesPlayedBefore: 0 }],
      teamB: [{ id: bAtt, elo: 1000, gamesPlayedBefore: 0 }, { id: bDef, elo: 1000, gamesPlayedBefore: 0 }],
      teamAWon: true,
    })

    expect(expected.teamA[0].k).toBe(94) // sanity: this scenario is meant to exercise the <10-games K value

    const matchId = await getLatestMatchIdForPlayer(aAtt)
    const dbRows = await getMatchPlayersElo(matchId)
    for (const exp of [...expected.teamA, ...expected.teamB]) {
      const dbRow = dbRows.find(r => r.playerId === exp.id)!
      expect(dbRow.eloBefore, `elo_before for ${exp.id}`).toBe(exp.before)
      expect(dbRow.eloAfter, `elo_after for ${exp.id}`).toBe(exp.after)
    }

    const [playerRow] = await sql`SELECT elo FROM players WHERE id = ${aAtt}::uuid`
    expect(Number(playerRow.elo)).toBe(expected.teamA[0].after)
  })

  test("an underdog upset gains more ELO than the formula would give an already-expected win", async ({ page }) => {
    const favA = testPlayer("elounderz", "fava")
    const favB = testPlayer("elounderz", "favb")
    const dogA = testPlayer("elounderz", "doga")
    const dogB = testPlayer("elounderz", "dogb")
    const ids = await ensurePlayers([favA, favB], 1200)
    const dogIds = await ensurePlayers([dogA, dogB], 800)
    for (const [email, id] of dogIds) ids.set(email, id)

    await page.goto("/")
    // Underdogs (team B, avg 800) beat favorites (team A, avg 1200).
    await addMatchViaUI(page, {
      teamA: { attackerEmail: favA.email, defenderEmail: favB.email },
      teamB: { attackerEmail: dogA.email, defenderEmail: dogB.email },
      scoreA: 6,
      scoreB: 10,
    })

    const expected = computeMatchResult({
      teamA: [
        { id: ids.get(favA.email)!, elo: 1200, gamesPlayedBefore: 0 },
        { id: ids.get(favB.email)!, elo: 1200, gamesPlayedBefore: 0 },
      ],
      teamB: [
        { id: ids.get(dogA.email)!, elo: 800, gamesPlayedBefore: 0 },
        { id: ids.get(dogB.email)!, elo: 800, gamesPlayedBefore: 0 },
      ],
      teamAWon: false,
    })

    const matchId = await getLatestMatchIdForPlayer(ids.get(favA.email)!)
    const dbRows = await getMatchPlayersElo(matchId)
    for (const exp of [...expected.teamA, ...expected.teamB]) {
      const dbRow = dbRows.find(r => r.playerId === exp.id)!
      expect(dbRow.eloAfter, `elo_after for ${exp.id}`).toBe(exp.after)
    }

    // The underdogs' win gains them more than the favorites would have
    // gained for an already-expected win — this is what "ELO accounts for
    // opponent strength" (per the app's own info dialog) actually means.
    expect(expected.teamB[0].delta).toBeGreaterThan(50)
    // Both teams here are internally rating-symmetric (each teammate pair
    // shares one elo), so this still holds under the per-player formula too —
    // it is NOT a general law once teammates' own ratings differ, see the
    // "teammates with very different ratings..." test below for that case.
    expect(expected.teamA[0].delta).toBe(-expected.teamB[0].delta)
  })

  test("teammates with very different ratings gain/lose different amounts for the same team result", async ({ page }) => {
    // Reproduces the real scenario that prompted this: two teammates who win
    // (or lose) together used to get the *identical* ELO delta no matter how
    // far apart their own ratings were, because expected-outcome was scored
    // team-average vs team-average. Now each player is scored against the
    // opponent average using their OWN rating.
    const strongWinner = testPlayer("elopeerz", "strongwin")
    const weakWinner = testPlayer("elopeerz", "weakwin")
    const strongLoser = testPlayer("elopeerz", "strongloss")
    const weakLoser = testPlayer("elopeerz", "weakloss")

    const ids = new Map<string, string>()
    for (const [p, elo] of [
      [strongWinner, 1197], [weakWinner, 796], [strongLoser, 1135], [weakLoser, 899],
    ] as const) {
      const m = await ensurePlayers([p], elo)
      ids.set(p.email, m.get(p.email)!)
    }

    await page.goto("/")
    // Team A (losers) sits close together; Team B (winners) has a huge
    // in-team gap — the exact shape that exposed the old formula.
    await addMatchViaUI(page, {
      teamA: { attackerEmail: weakLoser.email, defenderEmail: strongLoser.email },
      teamB: { attackerEmail: strongWinner.email, defenderEmail: weakWinner.email },
      scoreA: 4,
      scoreB: 10,
    })

    const expected = computeMatchResult({
      teamA: [
        { id: ids.get(weakLoser.email)!, elo: 899, gamesPlayedBefore: 0 },
        { id: ids.get(strongLoser.email)!, elo: 1135, gamesPlayedBefore: 0 },
      ],
      teamB: [
        { id: ids.get(strongWinner.email)!, elo: 1197, gamesPlayedBefore: 0 },
        { id: ids.get(weakWinner.email)!, elo: 796, gamesPlayedBefore: 0 },
      ],
      teamAWon: false,
    })

    const matchId = await getLatestMatchIdForPlayer(ids.get(strongWinner.email)!)
    const dbRows = await getMatchPlayersElo(matchId)
    for (const exp of [...expected.teamA, ...expected.teamB]) {
      const dbRow = dbRows.find(r => r.playerId === exp.id)!
      expect(dbRow.eloAfter, `elo_after for ${exp.id}`).toBe(exp.after)
    }

    const strongWinDelta = expected.teamB.find(r => r.id === ids.get(strongWinner.email))!.delta
    const weakWinDelta = expected.teamB.find(r => r.id === ids.get(weakWinner.email))!.delta
    const strongLossDelta = expected.teamA.find(r => r.id === ids.get(strongLoser.email))!.delta
    const weakLossDelta = expected.teamA.find(r => r.id === ids.get(weakLoser.email))!.delta

    // Same team, same win — but the already-favored winner barely moves
    // while the underdog winner gains a lot more.
    expect(weakWinDelta).toBeGreaterThan(strongWinDelta)
    expect(strongWinDelta).not.toBe(weakWinDelta)
    // Same team, same loss — the higher-rated loser (expected to win) drops
    // more than the lower-rated one.
    expect(strongLossDelta).toBeLessThan(weakLossDelta)
    expect(strongLossDelta).not.toBe(weakLossDelta)
  })

  test("K-factor drops from 94 to 64 once a player reaches 10 prior games", async ({ page }) => {
    const target = testPlayer("elokz", "target")
    const dummyPartner = testPlayer("elokz", "dummypartner")
    const dummyOpp = [testPlayer("elokz", "dummyoppa"), testPlayer("elokz", "dummyoppb")]
    const ids = await ensurePlayers([target, dummyPartner, ...dummyOpp])

    // Pad to exactly 10 prior games, then pin a known starting ELO.
    await padGamesPlayed(ids.get(target.email)!, ids.get(dummyPartner.email)!, [ids.get(dummyOpp[0].email)!, ids.get(dummyOpp[1].email)!], 10, 1000)

    const realPartner = testPlayer("elokz", "realpartner")
    const realOpp = [testPlayer("elokz", "realoppa"), testPlayer("elokz", "realoppb")]

    await page.goto("/")
    await addMatchViaUI(page, {
      teamA: { attackerEmail: target.email, defenderEmail: realPartner.email },
      teamB: { attackerEmail: realOpp[0].email, defenderEmail: realOpp[1].email },
      scoreA: 10,
      scoreB: 5,
    })

    const [partnerId, opp0Id, opp1Id] = await Promise.all(
      [realPartner, ...realOpp].map(async p => {
        const rows = await sql`SELECT id::text FROM players WHERE email = ${p.email}`
        return rows[0].id as string
      })
    )

    const expected = computeMatchResult({
      teamA: [
        { id: ids.get(target.email)!, elo: 1000, gamesPlayedBefore: 10 }, // K should be 64
        { id: partnerId, elo: 1000, gamesPlayedBefore: 0 }, // brand new — K should be 94
      ],
      teamB: [
        { id: opp0Id, elo: 1000, gamesPlayedBefore: 0 },
        { id: opp1Id, elo: 1000, gamesPlayedBefore: 0 },
      ],
      teamAWon: true,
    })
    expect(expected.teamA[0].k).toBe(64)
    expect(expected.teamA[1].k).toBe(94)

    const matchId = await getLatestMatchIdForPlayer(ids.get(target.email)!)
    const dbRows = await getMatchPlayersElo(matchId)
    for (const exp of [...expected.teamA, ...expected.teamB]) {
      const dbRow = dbRows.find(r => r.playerId === exp.id)!
      expect(dbRow.eloAfter, `elo_after for ${exp.id}`).toBe(exp.after)
    }
  })

  test("deleting a match triggers a full, correctly-chronological recompute", async ({ page }) => {
    const p1 = testPlayer("elorecz", "pone")
    const p2 = testPlayer("elorecz", "ptwo")
    const p3 = testPlayer("elorecz", "pthree")
    const p4 = testPlayer("elorecz", "pfour")

    await page.goto("/")
    // 3 matches, same 4 players/teams throughout, alternating winner.
    await addMatchViaUI(page, { teamA: { attackerEmail: p1.email, defenderEmail: p2.email }, teamB: { attackerEmail: p3.email, defenderEmail: p4.email }, scoreA: 10, scoreB: 2 })
    await addMatchViaUI(page, { teamA: { attackerEmail: p1.email, defenderEmail: p2.email }, teamB: { attackerEmail: p3.email, defenderEmail: p4.email }, scoreA: 6, scoreB: 10 })
    await addMatchViaUI(page, { teamA: { attackerEmail: p1.email, defenderEmail: p2.email }, teamB: { attackerEmail: p3.email, defenderEmail: p4.email }, scoreA: 10, scoreB: 8 })

    const [id1, id2, id3, id4] = await Promise.all(
      [p1, p2, p3, p4].map(async p => {
        const rows = await sql`SELECT id::text FROM players WHERE email = ${p.email}`
        return rows[0].id as string
      })
    )

    // The 3 matches in chronological (creation) order:
    const matchRows = await sql`
      SELECT m.id::text AS id, m.score_team_a, m.score_team_b
      FROM matches m
      JOIN match_players mp ON mp.match_id = m.id
      WHERE mp.player_id = ${id1}::uuid
      ORDER BY m.played_at ASC
    `
    expect(matchRows).toHaveLength(3)
    const [match1, match2, match3] = matchRows

    // Independently compute what the final state SHOULD be after deleting match2.
    let state = {
      [id1]: { elo: 1000, games: 0 }, [id2]: { elo: 1000, games: 0 },
      [id3]: { elo: 1000, games: 0 }, [id4]: { elo: 1000, games: 0 },
    }
    const remaining = [match1, match3]
    const results: Record<string, number>[] = []
    for (const m of remaining) {
      const teamAWon = Number(m.score_team_a) > Number(m.score_team_b)
      const r = computeMatchResult({
        teamA: [{ id: id1, elo: state[id1].elo, gamesPlayedBefore: state[id1].games }, { id: id2, elo: state[id2].elo, gamesPlayedBefore: state[id2].games }],
        teamB: [{ id: id3, elo: state[id3].elo, gamesPlayedBefore: state[id3].games }, { id: id4, elo: state[id4].elo, gamesPlayedBefore: state[id4].games }],
        teamAWon,
      })
      const after: Record<string, number> = {}
      for (const res of [...r.teamA, ...r.teamB]) {
        state[res.id] = { elo: res.after, games: state[res.id].games + 1 }
        after[res.id] = res.after
      }
      results.push(after)
    }
    const expectedFinal = results[results.length - 1]

    // Now actually delete match2 (the middle one) as admin. No reload here —
    // admin mode is client-side-only state (no session/cookie), so a full
    // page reload would log back out; the 3 matches are already visible
    // from the initial load (saveMatch's revalidatePath keeps them fresh).
    await unlockAdmin(page)
    // Scope to just this test's 3 rows (same 4 players throughout) before
    // picking the one to delete by score — otherwise an unrelated match from
    // another spec that happens to also show "6" could match instead.
    const myRows = page.getByTestId("match-row")
      .filter({ hasText: `${p1.firstName} ${p1.lastName}` })
      .filter({ hasText: `${p3.firstName} ${p3.lastName}` })
    await expect(myRows).toHaveCount(3)
    const targetRow = myRows.filter({ has: page.locator("span.w-10.h-10", { hasText: "6" }) })
    await expect(targetRow).toHaveCount(1)
    await targetRow.getByTitle("Supprimer ce match").click()
    await page.getByRole("dialog").getByRole("button", { name: "Supprimer" }).click()
    // deleteMatch triggers a full recomputeAllElos over every match in the
    // DB, sequentially — as the run accumulates matches from earlier specs
    // this can take a while, especially over CI's network path to Neon.
    await expect(targetRow).toHaveCount(0, { timeout: 20_000 })

    for (const id of [id1, id2, id3, id4]) {
      const after = await eloAfterFor(match3.id, id)
      expect(after, `final elo for ${id} after recompute`).toBe(expectedFinal[id])
      const [playerRow] = await sql`SELECT elo FROM players WHERE id = ${id}::uuid`
      expect(Number(playerRow.elo), `players.elo for ${id} after recompute`).toBe(expectedFinal[id])
    }
  })
})
