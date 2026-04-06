"use server"

import { sql } from "@/lib/db"
import { refresh } from "next/cache"

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

  refresh()
}
