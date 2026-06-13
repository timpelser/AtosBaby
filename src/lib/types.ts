export type Player = {
  id: string
  email: string
  first_name: string
  last_name: string
}

export type MatchPlayer = {
  player: Player
  position: "attack" | "defense"
}

export type Match = {
  id: string
  score_team_a: number
  score_team_b: number
  played_at: string
  team_a: [MatchPlayer, MatchPlayer]
  team_b: [MatchPlayer, MatchPlayer]
}

export type PlayerStats = {
  player: Player
  wins: number
  losses: number
  matches_played: number
  win_rate: number
  elo: number
}

export type PositionStats = {
  player: Player
  wins: number
  losses: number
  win_rate: number
}

export type DuoStats = {
  player_a: Player
  player_b: Player
  wins: number
  losses: number
  matches_played: number
  win_rate: number
}
