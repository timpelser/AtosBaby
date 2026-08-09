import type { Match } from "@/lib/types"

export type StreakDirection = "fire" | "ice"
export type StreakTier = 1 | 2 | 3
export type StreakInfo = { direction: StreakDirection; tier: StreakTier }

/**
 * Computes each player's current streak from full match history.
 * Positive = consecutive wins, negative = consecutive losses, 0 = no matches.
 *
 * `matches` must be sorted most-recent-first (as returned by getMatches()) —
 * we walk it front-to-back and freeze each player's streak the moment their
 * most recent run of same-outcome results is broken by an older match.
 */
export function computeStreaks(matches: Match[]): Record<string, number> {
  const streaks: Record<string, number> = {}
  const finished = new Set<string>()

  const apply = (playerId: string, won: boolean) => {
    if (finished.has(playerId)) return
    const current = streaks[playerId]
    if (current === undefined) {
      streaks[playerId] = won ? 1 : -1
      return
    }
    const wasWinning = current > 0
    if (wasWinning === won) {
      streaks[playerId] = current + (won ? 1 : -1)
    } else {
      finished.add(playerId)
    }
  }

  for (const match of matches) {
    const teamAWon = match.score_team_a > match.score_team_b
    for (const mp of match.team_a) apply(mp.player.id, teamAWon)
    for (const mp of match.team_b) apply(mp.player.id, !teamAWon)
  }

  return streaks
}

/** Streak length thresholds shared by both fire (win) and ice (loss) directions. */
export function getStreakInfo(streak: number): StreakInfo | null {
  const length = Math.abs(streak)
  if (length < 5) return null
  const tier: StreakTier = length >= 11 ? 3 : length >= 8 ? 2 : 1
  return { direction: streak > 0 ? "fire" : "ice", tier }
}
