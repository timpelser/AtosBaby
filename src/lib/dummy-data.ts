import type { Player, Match, PlayerStats, DuoStats, PositionStats } from "./types"

export const PLAYERS: Player[] = [
  { id: "1", email: "tim.pelser@atos.net", first_name: "Tim", last_name: "Pelser" },
  { id: "2", email: "sophie.leblanc@atos.net", first_name: "Sophie", last_name: "Leblanc" },
  { id: "3", email: "marc.martin@atos.net", first_name: "Marc", last_name: "Martin" },
  { id: "4", email: "jane.dupont@atos.net", first_name: "Jane", last_name: "Dupont" },
  { id: "5", email: "paul.bernard@atos.net", first_name: "Paul", last_name: "Bernard" },
  { id: "6", email: "alice.moreau@atos.net", first_name: "Alice", last_name: "Moreau" },
  { id: "7", email: "lucas.petit@atos.net", first_name: "Lucas", last_name: "Petit" },
  { id: "8", email: "chloe.robert@atos.net", first_name: "Chloé", last_name: "Robert" },
  { id: "9", email: "nicolas.simon@atos.net", first_name: "Nicolas", last_name: "Simon" },
  { id: "10", email: "lea.thomas@atos.net", first_name: "Léa", last_name: "Thomas" },
]

const [tim, sophie, marc, jane, paul, alice, lucas, chloe, nicolas, lea] = PLAYERS

export const MATCHES: Match[] = ([
  {
    id: "1",
    score_team_a: 10,
    score_team_b: 7,
    played_at: "2026-04-01T12:30:00",
    team_a: [
      { player: tim, position: "attack" },
      { player: sophie, position: "defense" },
    ],
    team_b: [
      { player: marc, position: "attack" },
      { player: jane, position: "defense" },
    ],
  },
  {
    id: "2",
    score_team_a: 10,
    score_team_b: 4,
    played_at: "2026-04-01T13:15:00",
    team_a: [
      { player: tim, position: "attack" },
      { player: marc, position: "defense" },
    ],
    team_b: [
      { player: paul, position: "attack" },
      { player: alice, position: "defense" },
    ],
  },
  {
    id: "3",
    score_team_a: 5,
    score_team_b: 10,
    played_at: "2026-03-31T12:45:00",
    team_a: [
      { player: jane, position: "attack" },
      { player: paul, position: "defense" },
    ],
    team_b: [
      { player: sophie, position: "attack" },
      { player: alice, position: "defense" },
    ],
  },
  {
    id: "4",
    score_team_a: 10,
    score_team_b: 8,
    played_at: "2026-03-28T12:20:00",
    team_a: [
      { player: tim, position: "attack" },
      { player: sophie, position: "defense" },
    ],
    team_b: [
      { player: paul, position: "attack" },
      { player: jane, position: "defense" },
    ],
  },
  {
    id: "5",
    score_team_a: 7,
    score_team_b: 10,
    played_at: "2026-03-27T13:00:00",
    team_a: [
      { player: marc, position: "attack" },
      { player: alice, position: "defense" },
    ],
    team_b: [
      { player: tim, position: "attack" },
      { player: jane, position: "defense" },
    ],
  },
  {
    id: "6",
    score_team_a: 10,
    score_team_b: 6,
    played_at: "2026-03-26T12:50:00",
    team_a: [
      { player: sophie, position: "attack" },
      { player: marc, position: "defense" },
    ],
    team_b: [
      { player: alice, position: "attack" },
      { player: paul, position: "defense" },
    ],
  },
  {
    id: "7",
    score_team_a: 10,
    score_team_b: 9,
    played_at: "2026-03-25T12:35:00",
    team_a: [
      { player: tim, position: "attack" },
      { player: marc, position: "defense" },
    ],
    team_b: [
      { player: sophie, position: "attack" },
      { player: paul, position: "defense" },
    ],
  },
  {
    id: "8",
    score_team_a: 3,
    score_team_b: 10,
    played_at: "2026-03-24T13:10:00",
    team_a: [
      { player: jane, position: "attack" },
      { player: alice, position: "defense" },
    ],
    team_b: [
      { player: marc, position: "attack" },
      { player: sophie, position: "defense" },
    ],
  },
  {
    id: "9",
    score_team_a: 10,
    score_team_b: 5,
    played_at: "2026-03-21T12:40:00",
    team_a: [
      { player: tim, position: "attack" },
      { player: sophie, position: "defense" },
    ],
    team_b: [
      { player: alice, position: "attack" },
      { player: marc, position: "defense" },
    ],
  },
  {
    id: "10",
    score_team_a: 8,
    score_team_b: 10,
    played_at: "2026-03-20T12:55:00",
    team_a: [
      { player: paul, position: "attack" },
      { player: jane, position: "defense" },
    ],
    team_b: [
      { player: tim, position: "attack" },
      { player: alice, position: "defense" },
    ],
  },
  {
    id: "11",
    score_team_a: 10,
    score_team_b: 2,
    played_at: "2026-03-19T12:30:00",
    team_a: [
      { player: lucas, position: "attack" },
      { player: chloe, position: "defense" },
    ],
    team_b: [
      { player: nicolas, position: "attack" },
      { player: lea, position: "defense" },
    ],
  },
  {
    id: "12",
    score_team_a: 6,
    score_team_b: 10,
    played_at: "2026-03-18T13:00:00",
    team_a: [
      { player: jane, position: "attack" },
      { player: marc, position: "defense" },
    ],
    team_b: [
      { player: lucas, position: "attack" },
      { player: tim, position: "defense" },
    ],
  },
  {
    id: "13",
    score_team_a: 10,
    score_team_b: 8,
    played_at: "2026-03-17T12:45:00",
    team_a: [
      { player: sophie, position: "attack" },
      { player: nicolas, position: "defense" },
    ],
    team_b: [
      { player: alice, position: "attack" },
      { player: chloe, position: "defense" },
    ],
  },
  {
    id: "14",
    score_team_a: 3,
    score_team_b: 10,
    played_at: "2026-03-14T12:20:00",
    team_a: [
      { player: paul, position: "attack" },
      { player: lea, position: "defense" },
    ],
    team_b: [
      { player: tim, position: "attack" },
      { player: marc, position: "defense" },
    ],
  },
  {
    id: "15",
    score_team_a: 10,
    score_team_b: 7,
    played_at: "2026-03-13T13:10:00",
    team_a: [
      { player: chloe, position: "attack" },
      { player: lucas, position: "defense" },
    ],
    team_b: [
      { player: jane, position: "attack" },
      { player: sophie, position: "defense" },
    ],
  },
  {
    id: "16",
    score_team_a: 10,
    score_team_b: 5,
    played_at: "2026-03-12T12:35:00",
    team_a: [
      { player: nicolas, position: "attack" },
      { player: tim, position: "defense" },
    ],
    team_b: [
      { player: paul, position: "attack" },
      { player: alice, position: "defense" },
    ],
  },
  {
    id: "17",
    score_team_a: 8,
    score_team_b: 10,
    played_at: "2026-03-11T12:50:00",
    team_a: [
      { player: marc, position: "attack" },
      { player: jane, position: "defense" },
    ],
    team_b: [
      { player: lucas, position: "attack" },
      { player: chloe, position: "defense" },
    ],
  },
  {
    id: "18",
    score_team_a: 10,
    score_team_b: 1,
    played_at: "2026-03-10T12:30:00",
    team_a: [
      { player: tim, position: "attack" },
      { player: sophie, position: "defense" },
    ],
    team_b: [
      { player: lea, position: "attack" },
      { player: paul, position: "defense" },
    ],
  },
  {
    id: "19",
    score_team_a: 10,
    score_team_b: 9,
    played_at: "2026-03-07T13:00:00",
    team_a: [
      { player: alice, position: "attack" },
      { player: nicolas, position: "defense" },
    ],
    team_b: [
      { player: sophie, position: "attack" },
      { player: marc, position: "defense" },
    ],
  },
  {
    id: "20",
    score_team_a: 4,
    score_team_b: 10,
    played_at: "2026-03-06T12:40:00",
    team_a: [
      { player: chloe, position: "attack" },
      { player: jane, position: "defense" },
    ],
    team_b: [
      { player: tim, position: "attack" },
      { player: lucas, position: "defense" },
    ],
  },
  {
    id: "21",
    score_team_a: 10,
    score_team_b: 6,
    played_at: "2026-03-05T12:55:00",
    team_a: [
      { player: marc, position: "attack" },
      { player: lea, position: "defense" },
    ],
    team_b: [
      { player: nicolas, position: "attack" },
      { player: paul, position: "defense" },
    ],
  },
  {
    id: "22",
    score_team_a: 10,
    score_team_b: 3,
    played_at: "2026-03-04T12:20:00",
    team_a: [
      { player: tim, position: "attack" },
      { player: chloe, position: "defense" },
    ],
    team_b: [
      { player: jane, position: "attack" },
      { player: alice, position: "defense" },
    ],
  },
  {
    id: "23",
    score_team_a: 7,
    score_team_b: 10,
    played_at: "2026-03-03T13:15:00",
    team_a: [
      { player: paul, position: "attack" },
      { player: sophie, position: "defense" },
    ],
    team_b: [
      { player: lucas, position: "attack" },
      { player: nicolas, position: "defense" },
    ],
  },
  {
    id: "24",
    score_team_a: 10,
    score_team_b: 8,
    played_at: "2026-02-28T12:30:00",
    team_a: [
      { player: lea, position: "attack" },
      { player: marc, position: "defense" },
    ],
    team_b: [
      { player: alice, position: "attack" },
      { player: tim, position: "defense" },
    ],
  },
  {
    id: "25",
    score_team_a: 10,
    score_team_b: 4,
    played_at: "2026-02-27T12:45:00",
    team_a: [
      { player: sophie, position: "attack" },
      { player: lucas, position: "defense" },
    ],
    team_b: [
      { player: jane, position: "attack" },
      { player: lea, position: "defense" },
    ],
  },
  {
    id: "26",
    score_team_a: 2,
    score_team_b: 10,
    played_at: "2026-02-26T13:00:00",
    team_a: [
      { player: nicolas, position: "attack" },
      { player: chloe, position: "defense" },
    ],
    team_b: [
      { player: tim, position: "attack" },
      { player: sophie, position: "defense" },
    ],
  },
  {
    id: "27",
    score_team_a: 10,
    score_team_b: 7,
    played_at: "2026-02-25T12:35:00",
    team_a: [
      { player: marc, position: "attack" },
      { player: paul, position: "defense" },
    ],
    team_b: [
      { player: alice, position: "attack" },
      { player: jane, position: "defense" },
    ],
  },
  {
    id: "28",
    score_team_a: 10,
    score_team_b: 5,
    played_at: "2026-02-24T12:50:00",
    team_a: [
      { player: lucas, position: "attack" },
      { player: lea, position: "defense" },
    ],
    team_b: [
      { player: chloe, position: "attack" },
      { player: nicolas, position: "defense" },
    ],
  },
  {
    id: "29",
    score_team_a: 9,
    score_team_b: 10,
    played_at: "2026-02-21T12:30:00",
    team_a: [
      { player: jane, position: "attack" },
      { player: tim, position: "defense" },
    ],
    team_b: [
      { player: sophie, position: "attack" },
      { player: marc, position: "defense" },
    ],
  },
  {
    id: "30",
    score_team_a: 10,
    score_team_b: 0,
    played_at: "2026-02-20T13:00:00",
    team_a: [
      { player: paul, position: "attack" },
      { player: nicolas, position: "defense" },
    ],
    team_b: [
      { player: lea, position: "attack" },
      { player: alice, position: "defense" },
    ],
  },
] as Match[]).sort((a, b) => new Date(b.played_at).getTime() - new Date(a.played_at).getTime())

export const PLAYER_STATS: PlayerStats[] = [
  { player: tim, wins: 7, losses: 2, matches_played: 9, win_rate: 77.8 },
  { player: sophie, wins: 6, losses: 3, matches_played: 9, win_rate: 66.7 },
  { player: marc, wins: 5, losses: 5, matches_played: 10, win_rate: 50.0 },
  { player: jane, wins: 3, losses: 6, matches_played: 9, win_rate: 33.3 },
  { player: paul, wins: 2, losses: 7, matches_played: 9, win_rate: 22.2 },
  { player: alice, wins: 2, losses: 7, matches_played: 9, win_rate: 22.2 },
]

export const DUO_STATS: DuoStats[] = ([
  { player_a: tim, player_b: sophie, wins: 4, losses: 0, matches_played: 4, win_rate: 100 },
  { player_a: tim, player_b: marc, wins: 3, losses: 1, matches_played: 4, win_rate: 75 },
  { player_a: sophie, player_b: marc, wins: 2, losses: 1, matches_played: 3, win_rate: 66.7 },
  { player_a: jane, player_b: paul, wins: 1, losses: 2, matches_played: 3, win_rate: 33.3 },
  { player_a: alice, player_b: marc, wins: 1, losses: 2, matches_played: 3, win_rate: 33.3 },
  { player_a: lucas, player_b: chloe, wins: 8, losses: 2, matches_played: 10, win_rate: 80 },
  { player_a: nicolas, player_b: lea, wins: 7, losses: 3, matches_played: 10, win_rate: 70 },
  { player_a: tim, player_b: lucas, wins: 6, losses: 2, matches_played: 8, win_rate: 75 },
  { player_a: sophie, player_b: chloe, wins: 5, losses: 3, matches_played: 8, win_rate: 62.5 },
  { player_a: marc, player_b: nicolas, wins: 4, losses: 4, matches_played: 8, win_rate: 50 },
  { player_a: jane, player_b: lea, wins: 3, losses: 5, matches_played: 8, win_rate: 37.5 },
  { player_a: paul, player_b: lucas, wins: 3, losses: 4, matches_played: 7, win_rate: 42.9 },
  { player_a: alice, player_b: chloe, wins: 2, losses: 5, matches_played: 7, win_rate: 28.6 },
  { player_a: tim, player_b: nicolas, wins: 5, losses: 1, matches_played: 6, win_rate: 83.3 },
  { player_a: sophie, player_b: lea, wins: 4, losses: 2, matches_played: 6, win_rate: 66.7 },
  { player_a: marc, player_b: lucas, wins: 3, losses: 3, matches_played: 6, win_rate: 50 },
  { player_a: jane, player_b: chloe, wins: 2, losses: 4, matches_played: 6, win_rate: 33.3 },
  { player_a: paul, player_b: nicolas, wins: 1, losses: 4, matches_played: 5, win_rate: 20 },
  { player_a: alice, player_b: lea, wins: 2, losses: 3, matches_played: 5, win_rate: 40 },
  { player_a: lucas, player_b: nicolas, wins: 3, losses: 2, matches_played: 5, win_rate: 60 },
  { player_a: chloe, player_b: lea, wins: 2, losses: 2, matches_played: 4, win_rate: 50 },
  { player_a: tim, player_b: lea, wins: 3, losses: 1, matches_played: 4, win_rate: 75 },
  { player_a: sophie, player_b: nicolas, wins: 2, losses: 2, matches_played: 4, win_rate: 50 },
  { player_a: marc, player_b: chloe, wins: 1, losses: 3, matches_played: 4, win_rate: 25 },
  { player_a: jane, player_b: lucas, wins: 1, losses: 2, matches_played: 3, win_rate: 33.3 },
] as DuoStats[]).sort((a, b) => b.win_rate - a.win_rate)

export const ATTACKER_STATS: PositionStats[] = [
  { player: tim, wins: 5, losses: 1, win_rate: 83.3 },
  { player: sophie, wins: 3, losses: 2, win_rate: 60.0 },
  { player: marc, wins: 3, losses: 3, win_rate: 50.0 },
  { player: jane, wins: 1, losses: 3, win_rate: 25.0 },
  { player: paul, wins: 1, losses: 4, win_rate: 20.0 },
  { player: alice, wins: 1, losses: 4, win_rate: 20.0 },
]

export const DEFENDER_STATS: PositionStats[] = [
  { player: sophie, wins: 3, losses: 1, win_rate: 75.0 },
  { player: marc, wins: 2, losses: 2, win_rate: 50.0 },
  { player: tim, wins: 2, losses: 1, win_rate: 66.7 },
  { player: jane, wins: 2, losses: 3, win_rate: 40.0 },
  { player: paul, wins: 1, losses: 3, win_rate: 25.0 },
  { player: alice, wins: 1, losses: 3, win_rate: 25.0 },
]
