import { sql } from "@/lib/db"
import type { Player, Match, PlayerStats, DuoStats, PositionStats } from "@/lib/types"

export async function getPlayers(): Promise<Player[]> {
  const rows = await sql`
    SELECT id, email, first_name, last_name
    FROM players
    ORDER BY first_name, last_name
  `
  return rows as Player[]
}

export async function getMatches(): Promise<Match[]> {
  const rows = await sql`
    SELECT
      m.id,
      m.score_team_a,
      m.score_team_b,
      m.played_at,
      MAX(CASE WHEN mp.team = 'A' AND mp.position = 'attack'  THEN mp.player_id::text END) AS a_att_id,
      MAX(CASE WHEN mp.team = 'A' AND mp.position = 'attack'  THEN p.first_name END)       AS a_att_first,
      MAX(CASE WHEN mp.team = 'A' AND mp.position = 'attack'  THEN p.last_name END)        AS a_att_last,
      MAX(CASE WHEN mp.team = 'A' AND mp.position = 'attack'  THEN mp.elo_before END)      AS a_att_elo_before,
      MAX(CASE WHEN mp.team = 'A' AND mp.position = 'attack'  THEN mp.elo_after END)       AS a_att_elo_after,
      MAX(CASE WHEN mp.team = 'A' AND mp.position = 'defense' THEN mp.player_id::text END) AS a_def_id,
      MAX(CASE WHEN mp.team = 'A' AND mp.position = 'defense' THEN p.first_name END)       AS a_def_first,
      MAX(CASE WHEN mp.team = 'A' AND mp.position = 'defense' THEN p.last_name END)        AS a_def_last,
      MAX(CASE WHEN mp.team = 'A' AND mp.position = 'defense' THEN mp.elo_before END)      AS a_def_elo_before,
      MAX(CASE WHEN mp.team = 'A' AND mp.position = 'defense' THEN mp.elo_after END)       AS a_def_elo_after,
      MAX(CASE WHEN mp.team = 'B' AND mp.position = 'attack'  THEN mp.player_id::text END) AS b_att_id,
      MAX(CASE WHEN mp.team = 'B' AND mp.position = 'attack'  THEN p.first_name END)       AS b_att_first,
      MAX(CASE WHEN mp.team = 'B' AND mp.position = 'attack'  THEN p.last_name END)        AS b_att_last,
      MAX(CASE WHEN mp.team = 'B' AND mp.position = 'attack'  THEN mp.elo_before END)      AS b_att_elo_before,
      MAX(CASE WHEN mp.team = 'B' AND mp.position = 'attack'  THEN mp.elo_after END)       AS b_att_elo_after,
      MAX(CASE WHEN mp.team = 'B' AND mp.position = 'defense' THEN mp.player_id::text END) AS b_def_id,
      MAX(CASE WHEN mp.team = 'B' AND mp.position = 'defense' THEN p.first_name END)       AS b_def_first,
      MAX(CASE WHEN mp.team = 'B' AND mp.position = 'defense' THEN p.last_name END)        AS b_def_last,
      MAX(CASE WHEN mp.team = 'B' AND mp.position = 'defense' THEN mp.elo_before END)      AS b_def_elo_before,
      MAX(CASE WHEN mp.team = 'B' AND mp.position = 'defense' THEN mp.elo_after END)       AS b_def_elo_after
    FROM matches m
    JOIN match_players mp ON mp.match_id = m.id
    JOIN players p ON p.id = mp.player_id
    GROUP BY m.id, m.score_team_a, m.score_team_b, m.played_at
    ORDER BY m.played_at DESC
  `

  return rows.map((r) => ({
    id: r.id,
    score_team_a: r.score_team_a,
    score_team_b: r.score_team_b,
    played_at: r.played_at,
    team_a: [
      { player: { id: r.a_att_id, email: "", first_name: r.a_att_first, last_name: r.a_att_last }, position: "attack" as const, elo_before: r.a_att_elo_before != null ? Number(r.a_att_elo_before) : null, elo_after: r.a_att_elo_after != null ? Number(r.a_att_elo_after) : null },
      { player: { id: r.a_def_id, email: "", first_name: r.a_def_first, last_name: r.a_def_last }, position: "defense" as const, elo_before: r.a_def_elo_before != null ? Number(r.a_def_elo_before) : null, elo_after: r.a_def_elo_after != null ? Number(r.a_def_elo_after) : null },
    ],
    team_b: [
      { player: { id: r.b_att_id, email: "", first_name: r.b_att_first, last_name: r.b_att_last }, position: "attack" as const, elo_before: r.b_att_elo_before != null ? Number(r.b_att_elo_before) : null, elo_after: r.b_att_elo_after != null ? Number(r.b_att_elo_after) : null },
      { player: { id: r.b_def_id, email: "", first_name: r.b_def_first, last_name: r.b_def_last }, position: "defense" as const, elo_before: r.b_def_elo_before != null ? Number(r.b_def_elo_before) : null, elo_after: r.b_def_elo_after != null ? Number(r.b_def_elo_after) : null },
    ],
  })) as Match[]
}

export async function getPlayerStats(): Promise<PlayerStats[]> {
  const rows = await sql`
    SELECT
      p.id, p.email, p.first_name, p.last_name, p.elo,
      ps.wins, ps.losses, ps.matches_played, ps.win_rate
    FROM player_stats ps
    JOIN players p ON p.id = ps.id
    ORDER BY p.elo DESC
  `
  return rows.map((r) => ({
    player: { id: r.id, email: r.email, first_name: r.first_name, last_name: r.last_name },
    wins: Number(r.wins),
    losses: Number(r.losses),
    matches_played: Number(r.matches_played),
    win_rate: Number(r.win_rate),
    elo: Number(r.elo),
  })) as PlayerStats[]
}

export async function getDuoStats(): Promise<DuoStats[]> {
  const rows = await sql`
    SELECT
      player_a_id, player_a_email, player_a_first_name, player_a_last_name,
      player_b_id, player_b_email, player_b_first_name, player_b_last_name,
      matches_played, wins, losses, win_rate
    FROM duo_stats
    ORDER BY wins DESC, win_rate DESC
  `

  return rows.map((r) => ({
    player_a: { id: r.player_a_id, email: r.player_a_email, first_name: r.player_a_first_name, last_name: r.player_a_last_name },
    player_b: { id: r.player_b_id, email: r.player_b_email, first_name: r.player_b_first_name, last_name: r.player_b_last_name },
    wins: Number(r.wins),
    losses: Number(r.losses),
    matches_played: Number(r.matches_played),
    win_rate: Number(r.win_rate),
  })) as DuoStats[]
}

export async function getAttackerStats(): Promise<PositionStats[]> {
  const rows = await sql`
    SELECT id, email, first_name, last_name, wins, losses, win_rate
    FROM position_stats
    WHERE position = 'attack'
    ORDER BY wins DESC, win_rate DESC
  `
  return rows.map((r) => ({
    player: { id: r.id, email: r.email, first_name: r.first_name, last_name: r.last_name },
    wins: Number(r.wins),
    losses: Number(r.losses),
    win_rate: Number(r.win_rate),
  })) as PositionStats[]
}

export async function getDefenderStats(): Promise<PositionStats[]> {
  const rows = await sql`
    SELECT id, email, first_name, last_name, wins, losses, win_rate
    FROM position_stats
    WHERE position = 'defense'
    ORDER BY wins DESC, win_rate DESC
  `
  return rows.map((r) => ({
    player: { id: r.id, email: r.email, first_name: r.first_name, last_name: r.last_name },
    wins: Number(r.wins),
    losses: Number(r.losses),
    win_rate: Number(r.win_rate),
  })) as PositionStats[]
}
