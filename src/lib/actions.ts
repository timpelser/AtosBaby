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

// Before this cutoff, a match's expected score was computed team-average vs
// team-average and the resulting delta was split evenly between teammates —
// so two players on the same team always gained/lost the *identical* number
// of points, no matter how far apart their own ratings were (a 796-rated
// player winning alongside a 1197-rated partner got the same +34 as they
// did). From the cutoff on, each player is scored against the opponent
// team's average using their OWN rating instead of the team average, so the
// weaker player earns more for the same win and the stronger player less —
// see computeMatchDeltas. Deliberately NOT applied retroactively: matches
// played before this keep their original team-average scoring so already-
// published results and history don't shift.
const INDIVIDUAL_ELO_CUTOFF = new Date("2026-09-03T12:25:00.000Z")

type TeamMember = { id: string; elo: number; gamesBefore: number }

/**
 * Computes each of the 4 players' ELO delta for one match. Shared by
 * updateElo (fast path for a match just logged) and recomputeAllElos (full
 * chronological replay after a delete/undo) so the two implementations of
 * "what does this match do to everyone's ELO" can never silently drift
 * apart — they used to duplicate this formula inline, which is exactly the
 * kind of place a team-average vs per-player discrepancy could sneak in.
 */
function computeMatchDeltas(
  teamA: [TeamMember, TeamMember],
  teamB: [TeamMember, TeamMember],
  teamAWon: boolean,
  matchDate: Date
): { a: [number, number]; b: [number, number] } {
  const teamAAvg = (teamA[0].elo + teamA[1].elo) / 2
  const teamBAvg = (teamB[0].elo + teamB[1].elo) / 2
  const actualA = teamAWon ? 1 : 0
  const actualB = teamAWon ? 0 : 1
  const perPlayer = matchDate >= INDIVIDUAL_ELO_CUTOFF

  const expected = (playerElo: number, ownTeamAvg: number, opponentAvg: number) =>
    1 / (1 + Math.pow(10, (opponentAvg - (perPlayer ? playerElo : ownTeamAvg)) / 400))

  const deltaFor = (player: TeamMember, ownTeamAvg: number, opponentAvg: number, actual: number) =>
    Math.round(getK(player.gamesBefore, matchDate) * (actual - expected(player.elo, ownTeamAvg, opponentAvg)))

  return {
    a: [
      deltaFor(teamA[0], teamAAvg, teamBAvg, actualA),
      deltaFor(teamA[1], teamAAvg, teamBAvg, actualA),
    ],
    b: [
      deltaFor(teamB[0], teamBAvg, teamAAvg, actualB),
      deltaFor(teamB[1], teamBAvg, teamAAvg, actualB),
    ],
  }
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
  const member = (id: string): TeamMember => ({ id, elo: eloMap.get(id) ?? 1000, gamesBefore: gamesMap.get(id) ?? 0 })

  const teamA: [TeamMember, TeamMember] = [member(a1), member(a2)]
  const teamB: [TeamMember, TeamMember] = [member(b1), member(b2)]
  const { a: deltaA, b: deltaB } = computeMatchDeltas(teamA, teamB, teamAWon, new Date())

  await Promise.all([
    sql`UPDATE players SET elo = elo + ${deltaA[0]} WHERE id = ${a1}::uuid`,
    sql`UPDATE players SET elo = elo + ${deltaA[1]} WHERE id = ${a2}::uuid`,
    sql`UPDATE players SET elo = elo + ${deltaB[0]} WHERE id = ${b1}::uuid`,
    sql`UPDATE players SET elo = elo + ${deltaB[1]} WHERE id = ${b2}::uuid`,
    sql`UPDATE match_players SET elo_before = ${teamA[0].elo}, elo_after = ${teamA[0].elo + deltaA[0]} WHERE match_id = ${matchId} AND player_id = ${a1}::uuid`,
    sql`UPDATE match_players SET elo_before = ${teamA[1].elo}, elo_after = ${teamA[1].elo + deltaA[1]} WHERE match_id = ${matchId} AND player_id = ${a2}::uuid`,
    sql`UPDATE match_players SET elo_before = ${teamB[0].elo}, elo_after = ${teamB[0].elo + deltaB[0]} WHERE match_id = ${matchId} AND player_id = ${b1}::uuid`,
    sql`UPDATE match_players SET elo_before = ${teamB[1].elo}, elo_after = ${teamB[1].elo + deltaB[1]} WHERE match_id = ${matchId} AND player_id = ${b2}::uuid`,
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
      const teamAWon = Number(score_team_a) > Number(score_team_b)

      const member = (id: string): TeamMember => ({ id, elo: getElo(id), gamesBefore: getGames(id) })
      const teamA: [TeamMember, TeamMember] = [member(a_att as string), member(a_def as string)]
      const teamB: [TeamMember, TeamMember] = [member(b_att as string), member(b_def as string)]
      const { a: deltaA, b: deltaB } = computeMatchDeltas(teamA, teamB, teamAWon, matchDate)

      const newElos = {
        a_att: teamA[0].elo + deltaA[0],
        a_def: teamA[1].elo + deltaA[1],
        b_att: teamB[0].elo + deltaB[0],
        b_def: teamB[1].elo + deltaB[1],
      }

      eloMap.set(a_att as string, newElos.a_att)
      eloMap.set(a_def as string, newElos.a_def)
      eloMap.set(b_att as string, newElos.b_att)
      eloMap.set(b_def as string, newElos.b_def)

      gamesMap.set(a_att as string, teamA[0].gamesBefore + 1)
      gamesMap.set(a_def as string, teamA[1].gamesBefore + 1)
      gamesMap.set(b_att as string, teamB[0].gamesBefore + 1)
      gamesMap.set(b_def as string, teamB[1].gamesBefore + 1)

      await Promise.all([
        sql`UPDATE match_players SET elo_before = ${teamA[0].elo}, elo_after = ${newElos.a_att} WHERE match_id = ${match_id as string} AND player_id = ${a_att as string}::uuid`,
        sql`UPDATE match_players SET elo_before = ${teamA[1].elo}, elo_after = ${newElos.a_def} WHERE match_id = ${match_id as string} AND player_id = ${a_def as string}::uuid`,
        sql`UPDATE match_players SET elo_before = ${teamB[0].elo}, elo_after = ${newElos.b_att} WHERE match_id = ${match_id as string} AND player_id = ${b_att as string}::uuid`,
        sql`UPDATE match_players SET elo_before = ${teamB[1].elo}, elo_after = ${newElos.b_def} WHERE match_id = ${match_id as string} AND player_id = ${b_def as string}::uuid`,
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
