"use server"

import { sql } from "@/lib/db"
import { revalidatePath } from "next/cache"

function getK(gamesPlayed: number): number {
  return gamesPlayed < 10 ? 64 : 32
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
    Math.round(getK(gamesMap.get(id) ?? 0) * (actual - expected))

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

async function recomputeAllElos(): Promise<void> {
  await sql`UPDATE players SET elo = 1000`

  const matches = await sql`
    SELECT
      m.id AS match_id,
      m.score_team_a,
      m.score_team_b,
      MAX(CASE WHEN mp.team = 'A' AND mp.position = 'attack'  THEN mp.player_id::text END)::text AS a_att,
      MAX(CASE WHEN mp.team = 'A' AND mp.position = 'defense' THEN mp.player_id::text END)::text AS a_def,
      MAX(CASE WHEN mp.team = 'B' AND mp.position = 'attack'  THEN mp.player_id::text END)::text AS b_att,
      MAX(CASE WHEN mp.team = 'B' AND mp.position = 'defense' THEN mp.player_id::text END)::text AS b_def
    FROM matches m
    JOIN match_players mp ON mp.match_id = m.id
    GROUP BY m.id, m.score_team_a, m.score_team_b, m.played_at
    ORDER BY m.played_at ASC
  `

  const eloMap = new Map<string, number>()
  const gamesMap = new Map<string, number>()
  const getElo = (id: string) => eloMap.get(id) ?? 1000
  const getGames = (id: string) => gamesMap.get(id) ?? 0

  for (const m of matches) {
    const { match_id, a_att, a_def, b_att, b_def, score_team_a, score_team_b } = m as Record<string, string | number>

    const eloBefore = { a_att: getElo(a_att as string), a_def: getElo(a_def as string), b_att: getElo(b_att as string), b_def: getElo(b_def as string) }

    const teamAAvg = (eloBefore.a_att + eloBefore.a_def) / 2
    const teamBAvg = (eloBefore.b_att + eloBefore.b_def) / 2

    const expectedA = 1 / (1 + Math.pow(10, (teamBAvg - teamAAvg) / 400))
    const expectedB = 1 - expectedA
    const teamAWon = Number(score_team_a) > Number(score_team_b)
    const actualA = teamAWon ? 1 : 0
    const actualB = teamAWon ? 0 : 1

    const delta = (id: string, actual: number, expected: number) =>
      Math.round(getK(getGames(id)) * (actual - expected))

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
  }

  await Promise.all(
    Array.from(eloMap.entries()).map(([id, elo]) =>
      sql`UPDATE players SET elo = ${elo} WHERE id = ${id}::uuid`
    )
  )
}

export async function saveMatch(input: SaveMatchInput): Promise<void> {
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
