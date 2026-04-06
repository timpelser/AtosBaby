import { sql } from "@/lib/db"
import type { Player, Match, DuoStats, PositionStats } from "@/lib/types"

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
      id,
      score_team_a,
      score_team_b,
      played_at,
      team_a_attacker_id,
      team_a_attacker_first_name,
      team_a_attacker_last_name,
      team_a_defender_id,
      team_a_defender_first_name,
      team_a_defender_last_name,
      team_b_attacker_id,
      team_b_attacker_first_name,
      team_b_attacker_last_name,
      team_b_defender_id,
      team_b_defender_first_name,
      team_b_defender_last_name
    FROM match_details
    ORDER BY played_at DESC
  `

  return rows.map((r) => ({
    id: r.id,
    score_team_a: r.score_team_a,
    score_team_b: r.score_team_b,
    played_at: r.played_at,
    team_a: [
      { player: { id: r.team_a_attacker_id, email: "", first_name: r.team_a_attacker_first_name, last_name: r.team_a_attacker_last_name }, position: "attack" as const },
      { player: { id: r.team_a_defender_id, email: "", first_name: r.team_a_defender_first_name, last_name: r.team_a_defender_last_name }, position: "defense" as const },
    ],
    team_b: [
      { player: { id: r.team_b_attacker_id, email: "", first_name: r.team_b_attacker_first_name, last_name: r.team_b_attacker_last_name }, position: "attack" as const },
      { player: { id: r.team_b_defender_id, email: "", first_name: r.team_b_defender_first_name, last_name: r.team_b_defender_last_name }, position: "defense" as const },
    ],
  })) as Match[]
}

export async function getDuoStats(): Promise<DuoStats[]> {
  const rows = await sql`
    SELECT
      player_a_id, player_a_email, player_a_first_name, player_a_last_name,
      player_b_id, player_b_email, player_b_first_name, player_b_last_name,
      matches_played, wins, losses, win_rate,
      -- Wilson score lower bound (z=1.96, 95% confidence)
      CASE WHEN (wins + losses) = 0 THEN 0 ELSE
        (
          (wins::float / (wins + losses))
          + (1.9208 / (2 * (wins + losses)))
          - 1.96 * SQRT(
              (wins::float / (wins + losses)) * (1 - wins::float / (wins + losses)) / (wins + losses)
              + 3.8416 / (4 * (wins + losses) * (wins + losses))
            )
        ) / (1 + 3.8416 / (wins + losses))
      END AS wilson_score
    FROM duo_stats
    ORDER BY wilson_score DESC
  `

  return rows.map((r) => ({
    player_a: { id: r.player_a_id, email: r.player_a_email, first_name: r.player_a_first_name, last_name: r.player_a_last_name },
    player_b: { id: r.player_b_id, email: r.player_b_email, first_name: r.player_b_first_name, last_name: r.player_b_last_name },
    wins: Number(r.wins),
    losses: Number(r.losses),
    matches_played: Number(r.matches_played),
    win_rate: Number(r.win_rate),
    wilson_score: Number(r.wilson_score),
  })) as DuoStats[]
}

export async function getAttackerStats(): Promise<PositionStats[]> {
  const rows = await sql`
    SELECT id, email, first_name, last_name, wins, losses, win_rate,
      -- Wilson score lower bound (z=1.96, 95% confidence)
      CASE WHEN (wins + losses) = 0 THEN 0 ELSE
        (
          (wins::float / (wins + losses))
          + (1.9208 / (2 * (wins + losses)))
          - 1.96 * SQRT(
              (wins::float / (wins + losses)) * (1 - wins::float / (wins + losses)) / (wins + losses)
              + 3.8416 / (4 * (wins + losses) * (wins + losses))
            )
        ) / (1 + 3.8416 / (wins + losses))
      END AS wilson_score
    FROM position_stats
    WHERE position = 'attack'
    ORDER BY wins DESC, wilson_score DESC
  `
  return rows.map((r) => ({
    player: { id: r.id, email: r.email, first_name: r.first_name, last_name: r.last_name },
    wins: Number(r.wins),
    losses: Number(r.losses),
    win_rate: Number(r.win_rate),
    wilson_score: Number(r.wilson_score),
  })) as PositionStats[]
}

export async function getDefenderStats(): Promise<PositionStats[]> {
  const rows = await sql`
    SELECT id, email, first_name, last_name, wins, losses, win_rate,
      -- Wilson score lower bound (z=1.96, 95% confidence)
      CASE WHEN (wins + losses) = 0 THEN 0 ELSE
        (
          (wins::float / (wins + losses))
          + (1.9208 / (2 * (wins + losses)))
          - 1.96 * SQRT(
              (wins::float / (wins + losses)) * (1 - wins::float / (wins + losses)) / (wins + losses)
              + 3.8416 / (4 * (wins + losses) * (wins + losses))
            )
        ) / (1 + 3.8416 / (wins + losses))
      END AS wilson_score
    FROM position_stats
    WHERE position = 'defense'
    ORDER BY wins DESC, wilson_score DESC
  `
  return rows.map((r) => ({
    player: { id: r.id, email: r.email, first_name: r.first_name, last_name: r.last_name },
    wins: Number(r.wins),
    losses: Number(r.losses),
    win_rate: Number(r.win_rate),
    wilson_score: Number(r.wilson_score),
  })) as PositionStats[]
}
