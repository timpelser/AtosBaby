"use server"

import { sql } from "@/lib/db"
import { revalidatePath } from "next/cache"
import type { EloHistoryPoint, RivalryStat } from "@/lib/types"
import { UNDO_WINDOW_MINUTES } from "@/lib/constants"

// Matches before this date used conservative K values (players didn't know ELO existed)
const ELO_ERA_CUTOFF = new Date("2026-06-13")

function getK(gamesPlayed: number, matchDate?: Date): number {
  const isHistorical = matchDate != null && matchDate < ELO_ERA_CUTOFF
  if (isHistorical) return gamesPlayed < 10 ? 64 : 32
  return gamesPlayed < 10 ? 94 : 64
}

type SaveMatchInput = {
  teamA: { attacker: string; defender: string }
  teamB: { attacker: string; defender: string }
  scoreA: number
  scoreB: number
}

async function upsertPlayer(email: string): Promise<string> {
  const normalized = email.toLowerCase().trim()
  const [prefix] = normalized.split("@")
  const [firstName, lastName] = prefix.split(".")
  const first_name = firstName.charAt(0).toUpperCase() + firstName.slice(1)
  const last_name = lastName.charAt(0).toUpperCase() + lastName.slice(1)

  const rows = await sql`
    INSERT INTO players (email, first_name, last_name)
    VALUES (${normalized}, ${first_name}, ${last_name})
    ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
    RETURNING id
  `
  return rows[0].id as string
}

async function updateElo(
  matchId: string,
  teamAIds: [string, string],
  teamBIds: [string, string],
  teamAWon: boolean
): Promise<void> {
  const [a1, a2, b1, b2] = teamAIds.concat(teamBIds)

  // Fetch ELO and games played for all 4 players.
  // COUNT - 1 because the current match is already inserted at this point.
  const rows = await sql`
    SELECT p.id::text, p.elo, COUNT(mp.id) - 1 AS games_before
    FROM players p
    LEFT JOIN match_players mp ON mp.player_id = p.id
    WHERE p.id IN (${a1}::uuid, ${a2}::uuid, ${b1}::uuid, ${b2}::uuid)
    GROUP BY p.id, p.elo
  `

  const eloMap = new Map(rows.map((r) => [r.id as string, Number(r.elo)]))
  const gamesMap = new Map(rows.map((r) => [r.id as string, Number(r.games_before)]))

  const teamAAvg = ((eloMap.get(a1) ?? 1000) + (eloMap.get(a2) ?? 1000)) / 2
  const teamBAvg = ((eloMap.get(b1) ?? 1000) + (eloMap.get(b2) ?? 1000)) / 2

  const expectedA = 1 / (1 + Math.pow(10, (teamBAvg - teamAAvg) / 400))
  const expectedB = 1 - expectedA
  const actualA = teamAWon ? 1 : 0
  const actualB = teamAWon ? 0 : 1

  const delta = (id: string, actual: number, expected: number) =>
    Math.round(getK(gamesMap.get(id) ?? 0, new Date()) * (actual - expected))

  const eloBefore = (id: string) => eloMap.get(id) ?? 1000
  const eloAfter = (id: string, actual: number, expected: number) =>
    eloBefore(id) + delta(id, actual, expected)

  await Promise.all([
    sql`UPDATE players SET elo = elo + ${delta(a1, actualA, expectedA)} WHERE id = ${a1}::uuid`,
    sql`UPDATE players SET elo = elo + ${delta(a2, actualA, expectedA)} WHERE id = ${a2}::uuid`,
    sql`UPDATE players SET elo = elo + ${delta(b1, actualB, expectedB)} WHERE id = ${b1}::uuid`,
    sql`UPDATE players SET elo = elo + ${delta(b2, actualB, expectedB)} WHERE id = ${b2}::uuid`,
    sql`UPDATE match_players SET elo_before = ${eloBefore(a1)}, elo_after = ${eloAfter(a1, actualA, expectedA)} WHERE match_id = ${matchId} AND player_id = ${a1}::uuid`,
    sql`UPDATE match_players SET elo_before = ${eloBefore(a2)}, elo_after = ${eloAfter(a2, actualA, expectedA)} WHERE match_id = ${matchId} AND player_id = ${a2}::uuid`,
    sql`UPDATE match_players SET elo_before = ${eloBefore(b1)}, elo_after = ${eloAfter(b1, actualB, expectedB)} WHERE match_id = ${matchId} AND player_id = ${b1}::uuid`,
    sql`UPDATE match_players SET elo_before = ${eloBefore(b2)}, elo_after = ${eloAfter(b2, actualB, expectedB)} WHERE match_id = ${matchId} AND player_id = ${b2}::uuid`,
  ])
}

export async function recomputeAllElos(): Promise<void> {
  await sql`UPDATE players SET elo = 1000`

  const matches = await sql`
    SELECT
      m.id AS match_id,
      m.score_team_a,
      m.score_team_b,
      m.played_at,
      MAX(CASE WHEN mp.team = 'A' AND mp.position = 'attack'  THEN mp.player_id::text END)::text AS a_att,
      MAX(CASE WHEN mp.team = 'A' AND mp.position = 'defense' THEN mp.player_id::text END)::text AS a_def,
      MAX(CASE WHEN mp.team = 'B' AND mp.position = 'attack'  THEN mp.player_id::text END)::text AS b_att,
      MAX(CASE WHEN mp.team = 'B' AND mp.position = 'defense' THEN mp.player_id::text END)::text AS b_def
    FROM matches m
    JOIN match_players mp ON mp.match_id = m.id
    GROUP BY m.id, m.score_team_a, m.score_team_b, m.played_at
  `

  const decays = await sql`
    SELECT id::text, player_id::text, points, applied_at
    FROM elo_decay_events
  `

  const eloMap = new Map<string, number>()
  const gamesMap = new Map<string, number>()
  const getElo = (id: string) => eloMap.get(id) ?? 1000
  const getGames = (id: string) => gamesMap.get(id) ?? 0

  // Merge matches and decay events into a single chronological timeline
  type TimelineEvent =
    | { kind: "match"; at: number; data: Record<string, string | number> }
    | { kind: "decay"; at: number; id: string; player_id: string; points: number }

  const timeline: TimelineEvent[] = [
    ...matches.map(m => ({
      kind: "match" as const,
      at: new Date(m.played_at as string).getTime(),
      data: m as Record<string, string | number>,
    })),
    ...decays.map(d => ({
      kind: "decay" as const,
      at: new Date(d.applied_at as string).getTime(),
      id: d.id as string,
      player_id: d.player_id as string,
      points: Number(d.points),
    })),
  ].sort((a, b) => a.at - b.at)

  for (const event of timeline) {
    if (event.kind === "match") {
      const { match_id, a_att, a_def, b_att, b_def, score_team_a, score_team_b, played_at } = event.data
      const matchDate = new Date(played_at as string)

      const eloBefore = { a_att: getElo(a_att as string), a_def: getElo(a_def as string), b_att: getElo(b_att as string), b_def: getElo(b_def as string) }
      const teamAAvg = (eloBefore.a_att + eloBefore.a_def) / 2
      const teamBAvg = (eloBefore.b_att + eloBefore.b_def) / 2
      const expectedA = 1 / (1 + Math.pow(10, (teamBAvg - teamAAvg) / 400))
      const expectedB = 1 - expectedA
      const teamAWon = Number(score_team_a) > Number(score_team_b)
      const actualA = teamAWon ? 1 : 0
      const actualB = teamAWon ? 0 : 1
      const delta = (id: string, actual: number, expected: number) =>
        Math.round(getK(getGames(id), matchDate) * (actual - expected))

      const newElos = {
        a_att: eloBefore.a_att + delta(a_att as string, actualA, expectedA),
        a_def: eloBefore.a_def + delta(a_def as string, actualA, expectedA),
        b_att: eloBefore.b_att + delta(b_att as string, actualB, expectedB),
        b_def: eloBefore.b_def + delta(b_def as string, actualB, expectedB),
      }

      eloMap.set(a_att as string, newElos.a_att)
      eloMap.set(a_def as string, newElos.a_def)
      eloMap.set(b_att as string, newElos.b_att)
      eloMap.set(b_def as string, newElos.b_def)

      gamesMap.set(a_att as string, getGames(a_att as string) + 1)
      gamesMap.set(a_def as string, getGames(a_def as string) + 1)
      gamesMap.set(b_att as string, getGames(b_att as string) + 1)
      gamesMap.set(b_def as string, getGames(b_def as string) + 1)

      await Promise.all([
        sql`UPDATE match_players SET elo_before = ${eloBefore.a_att}, elo_after = ${newElos.a_att} WHERE match_id = ${match_id as string} AND player_id = ${a_att as string}::uuid`,
        sql`UPDATE match_players SET elo_before = ${eloBefore.a_def}, elo_after = ${newElos.a_def} WHERE match_id = ${match_id as string} AND player_id = ${a_def as string}::uuid`,
        sql`UPDATE match_players SET elo_before = ${eloBefore.b_att}, elo_after = ${newElos.b_att} WHERE match_id = ${match_id as string} AND player_id = ${b_att as string}::uuid`,
        sql`UPDATE match_players SET elo_before = ${eloBefore.b_def}, elo_after = ${newElos.b_def} WHERE match_id = ${match_id as string} AND player_id = ${b_def as string}::uuid`,
      ])
    } else {
      // Decay event: subtract points from in-memory ELO and persist elo_before/elo_after
      const eloBefore = getElo(event.player_id)
      const eloAfter = eloBefore + event.points  // points is negative (-10)
      eloMap.set(event.player_id, eloAfter)
      await sql`
        UPDATE elo_decay_events
        SET elo_before = ${eloBefore}, elo_after = ${eloAfter}
        WHERE id = ${event.id}::uuid
      `
    }
  }

  await Promise.all(
    Array.from(eloMap.entries()).map(([id, elo]) =>
      sql`UPDATE players SET elo = ${elo} WHERE id = ${id}::uuid`
    )
  )
}

export async function saveMatch(input: SaveMatchInput): Promise<{ matchId: string }> {
  const [teamAAttackerId, teamADefenderId, teamBAttackerId, teamBDefenderId] = await Promise.all([
    upsertPlayer(input.teamA.attacker),
    upsertPlayer(input.teamA.defender),
    upsertPlayer(input.teamB.attacker),
    upsertPlayer(input.teamB.defender),
  ])

  const matchRows = await sql`
    INSERT INTO matches (score_team_a, score_team_b)
    VALUES (${input.scoreA}, ${input.scoreB})
    RETURNING id
  `
  const matchId = matchRows[0].id as string

  await sql`
    INSERT INTO match_players (match_id, player_id, team, position) VALUES
    (${matchId}, ${teamAAttackerId}, 'A', 'attack'),
    (${matchId}, ${teamADefenderId}, 'A', 'defense'),
    (${matchId}, ${teamBAttackerId}, 'B', 'attack'),
    (${matchId}, ${teamBDefenderId}, 'B', 'defense')
  `

  await updateElo(
    matchId,
    [teamAAttackerId, teamADefenderId],
    [teamBAttackerId, teamBDefenderId],
    input.scoreA > input.scoreB
  )

  revalidatePath("/")

  return { matchId }
}

export async function getPlayerEloHistory(playerId: string): Promise<EloHistoryPoint[]> {
  const [matchRows, decayRows] = await Promise.all([
    sql`
      SELECT m.played_at, mp.elo_after
      FROM match_players mp
      JOIN matches m ON m.id = mp.match_id
      WHERE mp.player_id = ${playerId}::uuid
        AND mp.elo_after IS NOT NULL
    `,
    sql`
      SELECT applied_at AS played_at, elo_after
      FROM elo_decay_events
      WHERE player_id = ${playerId}::uuid
        AND elo_after IS NOT NULL
    `,
  ])

  const points: EloHistoryPoint[] = [
    ...matchRows.map(r => ({
      played_at: r.played_at as string,
      elo_after: Number(r.elo_after),
      type: "match" as const,
    })),
    ...decayRows.map(r => ({
      played_at: r.played_at as string,
      elo_after: Number(r.elo_after),
      type: "decay" as const,
    })),
  ]

  return points.sort((a, b) => new Date(a.played_at).getTime() - new Date(b.played_at).getTime())
}

export async function getPlayerRivalries(playerId: string): Promise<RivalryStat[]> {
  const rows = await sql`
    WITH player_in_match AS (
      SELECT
        mp.match_id,
        mp.team AS player_team,
        CASE
          WHEN mp.team = 'A' THEN m.score_team_a > m.score_team_b
          ELSE m.score_team_b > m.score_team_a
        END AS player_won
      FROM match_players mp
      JOIN matches m ON m.id = mp.match_id
      WHERE mp.player_id = ${playerId}::uuid
    ),
    rivals AS (
      SELECT
        omp.player_id AS rival_id,
        COUNT(*)::int AS total,
        SUM(CASE WHEN pim.player_won THEN 1 ELSE 0 END)::int AS wins
      FROM player_in_match pim
      JOIN match_players omp
        ON omp.match_id = pim.match_id
        AND omp.team != pim.player_team
      GROUP BY omp.player_id
    )
    SELECT
      r.rival_id::text,
      p.first_name, p.last_name, p.email,
      r.total AS matches_played,
      r.wins,
      r.total - r.wins AS losses
    FROM rivals r
    JOIN players p ON p.id = r.rival_id
    ORDER BY r.total DESC, r.wins DESC
    LIMIT 3
  `
  return rows.map((r) => ({
    opponent: {
      id: r.rival_id as string,
      email: r.email as string,
      first_name: r.first_name as string,
      last_name: r.last_name as string,
    },
    matches_played: Number(r.matches_played),
    wins: Number(r.wins),
    losses: Number(r.losses),
    win_rate: Number(r.matches_played) > 0 ? (Number(r.wins) / Number(r.matches_played)) * 100 : 0,
  }))
}

export async function verifyAdminPassword(password: string): Promise<boolean> {
  return password === process.env.ADMIN_PASSWORD
}

export async function deleteMatch(matchId: string, password: string): Promise<void> {
  if (password !== process.env.ADMIN_PASSWORD) {
    throw new Error("Unauthorized")
  }
  await sql`DELETE FROM match_players WHERE match_id = ${matchId}`
  await sql`DELETE FROM matches WHERE id = ${matchId}`
  await recomputeAllElos()
  revalidatePath("/")
}

export type UndoMatchResult = { ok: true } | { ok: false; reason: "not_found" | "expired" }

/**
 * Self-serve undo: anyone can retract a match with no admin password, but only
 * within a short window after it was logged. The window is enforced here in
 * SQL against the match's own `played_at` (== submission time — the UI never
 * lets you backdate a match) so a stale client clock can't extend it; the
 * DELETE and the freshness check happen in one statement to avoid a race
 * between "is it still fresh" and "delete it". match_players rows cascade
 * automatically (ON DELETE CASCADE), same as deleteMatch relies on.
 */
export async function undoMatch(matchId: string): Promise<UndoMatchResult> {
  const deleted = await sql`
    DELETE FROM matches
    WHERE id = ${matchId}::uuid
      AND played_at >= now() - (${UNDO_WINDOW_MINUTES} * interval '1 minute')
    RETURNING id
  `

  if (deleted.length === 0) {
    const stillExists = await sql`SELECT id FROM matches WHERE id = ${matchId}::uuid`
    return { ok: false, reason: stillExists.length === 0 ? "not_found" : "expired" }
  }

  await recomputeAllElos()
  revalidatePath("/")
  return { ok: true }
}
