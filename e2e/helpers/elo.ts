/**
 * Independent reference implementation of AtosBaby's ELO algorithm.
 *
 * Deliberately NOT imported from src/lib/actions.ts — it's rewritten from
 * scratch based on the documented behavior (the app's own "How does ELO
 * work" dialog + reading the source once, by a human/reviewer, not by
 * re-exporting the function under test). If someone breaks the real
 * formula, comparing the app's output to *this* independently-written
 * reference is what actually catches it — importing getK/updateElo here
 * would just prove the app agrees with itself.
 */

// Matches before this date used lower K values (see src/lib/actions.ts).
// Unreachable through the UI (saveMatch always uses "now"), but relevant
// when recomputeAllElos replays historical, directly-seeded matches.
export const ELO_ERA_CUTOFF = new Date("2026-06-13T00:00:00Z")

/** K-factor for a player with `gamesPlayedBefore` prior matches, as of `matchDate`. */
export function expectedK(gamesPlayedBefore: number, matchDate: Date = new Date()): number {
  const isHistorical = matchDate < ELO_ERA_CUTOFF
  if (isHistorical) return gamesPlayedBefore < 10 ? 64 : 32
  return gamesPlayedBefore < 10 ? 94 : 64
}

/** Standard logistic expected-score function. */
export function expectedScore(teamAvg: number, opponentAvg: number): number {
  return 1 / (1 + Math.pow(10, (opponentAvg - teamAvg) / 400))
}

export function eloDelta(k: number, actual: 0 | 1, expected: number): number {
  return Math.round(k * (actual - expected))
}

export type PlayerEloInput = { id: string; elo: number; gamesPlayedBefore: number }
export type PlayerEloResult = { id: string; before: number; after: number; delta: number; k: number }

/** Computes elo_before/after for all 4 players in one match. */
export function computeMatchResult(params: {
  teamA: [PlayerEloInput, PlayerEloInput]
  teamB: [PlayerEloInput, PlayerEloInput]
  teamAWon: boolean
  matchDate?: Date
}): { teamA: [PlayerEloResult, PlayerEloResult]; teamB: [PlayerEloResult, PlayerEloResult] } {
  const { teamA, teamB, teamAWon, matchDate = new Date() } = params
  const avgA = (teamA[0].elo + teamA[1].elo) / 2
  const avgB = (teamB[0].elo + teamB[1].elo) / 2
  const expectedA = expectedScore(avgA, avgB)
  const expectedB = 1 - expectedA
  const actualA: 0 | 1 = teamAWon ? 1 : 0
  const actualB: 0 | 1 = teamAWon ? 0 : 1

  const apply = (p: PlayerEloInput, actual: 0 | 1, expected: number): PlayerEloResult => {
    const k = expectedK(p.gamesPlayedBefore, matchDate)
    const delta = eloDelta(k, actual, expected)
    return { id: p.id, before: p.elo, after: p.elo + delta, delta, k }
  }

  return {
    teamA: [apply(teamA[0], actualA, expectedA), apply(teamA[1], actualA, expectedA)],
    teamB: [apply(teamB[0], actualB, expectedB), apply(teamB[1], actualB, expectedB)],
  }
}
