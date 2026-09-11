export const dynamic = "force-dynamic"

import { AddMatchDialog } from "@/components/add-match-dialog"
import { TeamSelectorDialog } from "@/components/team-selector-dialog"
import { UndoMatchBanner } from "@/components/undo-match-banner"
import { SeasonTheme } from "@/components/season-theme"
import { TopPlayersPodium } from "@/components/stats/top-players-podium"
import { DernierChampionCard } from "@/components/stats/dernier-champion-card"
import { SeasonBanner } from "@/components/stats/season-banner"
import { ChampionBanner } from "@/components/stats/champion-banner"
import { PositionLeaders } from "@/components/stats/position-leaders"
import { PlayerRankingsTable } from "@/components/stats/player-rankings-table"
import { PlayerRankingsTableMobile } from "@/components/stats/player-rankings-table-mobile"
import { LatestMatches } from "@/components/latest-matches"
import { LatestMatchesMobile } from "@/components/latest-matches-mobile"
import { AdminProvider } from "@/components/admin-context"
import { AdminLogo } from "@/components/admin-logo"
import { getMatches, getPlayerStats, getAttackerStats, getDefenderStats, getPlayers, getSeasonChampions } from "@/lib/api"
import { computeStreaks } from "@/lib/streaks"
import { getCurrentSeason, isChampionBannerWindow } from "@/lib/seasons"

export default async function Home() {
  const [matches, playerStats, attackerStats, defenderStats, players, seasonChampions] = await Promise.all([
    getMatches(),
    getPlayerStats(),
    getAttackerStats(),
    getDefenderStats(),
    getPlayers(),
    getSeasonChampions(),
  ])

  const currentSeason = getCurrentSeason()
  const lastChampion = seasonChampions[0]
  const showChampionBanner = isChampionBannerWindow()

  // Streaks reset at a season boundary the same way ELO does (see
  // recomputeAllElos in actions.ts) — computeStreaks itself doesn't know
  // about seasons, so it's given only this-season's matches to work with.
  // LatestMatches/the rankings table below still get the full, all-time
  // `matches` array — nothing about match history disappears, only the
  // live streak calculation is scoped.
  const seasonMatches = currentSeason
    ? matches.filter(m => new Date(m.played_at) >= currentSeason.start)
    : matches
  const streaks = computeStreaks(seasonMatches)

  return (
    <AdminProvider>
      <SeasonTheme season={currentSeason} />
      <div className="min-h-screen bg-muted/30">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-background border-b">
          <div className="px-4 sm:px-6 py-3 sm:py-0 sm:h-20 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0">
            <AdminLogo />
            <div className="w-full sm:w-auto flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="w-full sm:w-auto">
                <TeamSelectorDialog players={players} playerStats={playerStats} />
              </div>
              <div className="w-full sm:w-auto">
                <AddMatchDialog players={players} />
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="px-4 sm:px-6 py-6 space-y-6">
          {currentSeason && (
            <div className="flex flex-col lg:flex-row items-stretch gap-4">
              <div className="flex-1 flex flex-col"><SeasonBanner season={currentSeason} /></div>
              {showChampionBanner && lastChampion && (
                <div className="flex-1 flex flex-col"><ChampionBanner champion={lastChampion} /></div>
              )}
            </div>
          )}

          <TopPlayersPodium playerStats={playerStats} matches={matches} />

          {/* Derniers champions / Meilleur Attaquant / Meilleur Défenseur — three equal-width cards */}
          <div className="flex flex-col lg:flex-row items-stretch gap-4">
            <div className="flex-1 flex flex-col">
              <DernierChampionCard champions={seasonChampions} playerStats={playerStats} matches={matches} />
            </div>
            <PositionLeaders attackerStats={attackerStats} defenderStats={defenderStats} playerStats={playerStats} matches={matches} />
          </div>

          <div className="hidden sm:block"><PlayerRankingsTable playerStats={playerStats} matches={matches} streaks={streaks} /></div>
          <div className="sm:hidden"><PlayerRankingsTableMobile playerStats={playerStats} matches={matches} streaks={streaks} /></div>

          {/* Latest matches */}
          <section>
            <div className="hidden sm:block"><LatestMatches matches={matches} /></div>
            <div className="sm:hidden"><LatestMatchesMobile matches={matches} /></div>
          </section>
        </main>

        <UndoMatchBanner />
      </div>
    </AdminProvider>
  )
}
