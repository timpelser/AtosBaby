import { sql } from "./db"
import type { TestPlayer } from "./players"

/**
 * Direct-SQL fixture helpers.
 *
 * Use these for tests whose focus is a *read* path (rankings, streaks,
 * pagination, rivalries, position leaders) — seeding data directly is
 * faster and keeps the test focused on what it's actually checking.
 *
 * Do NOT use these for anything asserting ELO correctness — those tests
 * must drive matches through the real UI (see helpers/add-match-ui.ts) so
 * they exercise the app's actual write path, not a hand-rolled copy of it.
 */

/** Upserts players and returns a map of email -> id. */
export async function ensurePlayers(players: TestPlayer[], elo = 1000): Promise<Map<string, string>> {
  const ids = new Map<string, string>()
  for (const p of players) {
    const rows = await sql`
      INSERT INTO players (email, first_name, last_name, elo)
      VALUES (${p.email}, ${p.firstName}, ${p.lastName}, ${elo})
      ON CONFLICT (email) DO UPDATE SET elo = EXCLUDED.elo
      RETURNING id
    `
    ids.set(p.email, rows[0].id as string)
  }
  return ids
}

export async function setPlayerElo(playerId: string, elo: number): Promise<void> {
  await sql`UPDATE players SET elo = ${elo} WHERE id = ${playerId}::uuid`
}

type EloPair = { before: number; after: number } | undefined

type SeedMatchInput = {
  teamA: { attackerId: string; defenderId: string }
  teamB: { attackerId: string; defenderId: string }
  scoreA: number
  scoreB: number
  playedAt?: Date
  elo?: { aAtt?: EloPair; aDef?: EloPair; bAtt?: EloPair; bDef?: EloPair }
}

/** Inserts one match + its 4 match_players rows directly, bypassing the UI/saveMatch. */
export async function seedMatch(input: SeedMatchInput): Promise<string> {
  if (input.scoreA === input.scoreB) throw new Error("seedMatch: scores can't be equal (no_draw constraint)")
  if (input.scoreA !== 10 && input.scoreB !== 10) throw new Error("seedMatch: one score must be exactly 10 (ten_point_win constraint)")

  const playedAt = input.playedAt ?? new Date()
  const matchRows = await sql`
    INSERT INTO matches (score_team_a, score_team_b, played_at)
    VALUES (${input.scoreA}, ${input.scoreB}, ${playedAt.toISOString()})
    RETURNING id
  `
  const matchId = matchRows[0].id as string
  const e = input.elo ?? {}
  await sql`
    INSERT INTO match_players (match_id, player_id, team, "position", elo_before, elo_after) VALUES
    (${matchId}, ${input.teamA.attackerId}::uuid, 'A', 'attack',  ${e.aAtt?.before ?? null}, ${e.aAtt?.after ?? null}),
    (${matchId}, ${input.teamA.defenderId}::uuid, 'A', 'defense', ${e.aDef?.before ?? null}, ${e.aDef?.after ?? null}),
    (${matchId}, ${input.teamB.attackerId}::uuid, 'B', 'attack',  ${e.bAtt?.before ?? null}, ${e.bAtt?.after ?? null}),
    (${matchId}, ${input.teamB.defenderId}::uuid, 'B', 'defense', ${e.bDef?.before ?? null}, ${e.bDef?.after ?? null})
  `
  return matchId
}

/**
 * Inserts `count` throwaway matches for `playerId` (always attacking on
 * team A, against a fixed dummy pair) purely to inflate their games-played
 * count for K-factor threshold tests. Elo columns are left null and
 * `players.elo` is reset to `pinElo` afterward — these matches' outcomes
 * are irrelevant, only the count matters.
 */
export async function padGamesPlayed(playerId: string, partnerId: string, opponentIds: [string, string], count: number, pinElo = 1000): Promise<void> {
  for (let i = 0; i < count; i++) {
    await seedMatch({
      teamA: { attackerId: playerId, defenderId: partnerId },
      teamB: { attackerId: opponentIds[0], defenderId: opponentIds[1] },
      scoreA: 10,
      scoreB: 3,
    })
  }
  await setPlayerElo(playerId, pinElo)
}

export async function getPlayerEloAndGames(playerId: string): Promise<{ elo: number; gamesPlayed: number }> {
  const rows = await sql`
    SELECT p.elo, COUNT(mp.id)::int AS games_played
    FROM players p
    LEFT JOIN match_players mp ON mp.player_id = p.id
    WHERE p.id = ${playerId}::uuid
    GROUP BY p.elo
  `
  return { elo: Number(rows[0].elo), gamesPlayed: Number(rows[0].games_played) }
}

export async function getMatchPlayersElo(matchId: string): Promise<Array<{ playerId: string; team: string; position: string; eloBefore: number | null; eloAfter: number | null }>> {
  const rows = await sql`
    SELECT player_id::text AS player_id, team, "position", elo_before, elo_after
    FROM match_players
    WHERE match_id = ${matchId}::uuid
  `
  return rows.map(r => ({
    playerId: r.player_id as string,
    team: r.team as string,
    position: r.position as string,
    eloBefore: r.elo_before == null ? null : Number(r.elo_before),
    eloAfter: r.elo_after == null ? null : Number(r.elo_after),
  }))
}

/** Finds the most recently created match a given player took part in (by played_at). */
export async function getLatestMatchIdForPlayer(playerId: string): Promise<string> {
  const rows = await sql`
    SELECT m.id::text AS id
    FROM matches m
    JOIN match_players mp ON mp.match_id = m.id
    WHERE mp.player_id = ${playerId}::uuid
    ORDER BY m.played_at DESC
    LIMIT 1
  `
  if (rows.length === 0) throw new Error(`No match found for player ${playerId}`)
  return rows[0].id as string
}
