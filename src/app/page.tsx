export const dynamic = "force-dynamic"

import { AddMatchDialog } from "@/components/add-match-dialog"
import { TeamSelectorDialog } from "@/components/team-selector-dialog"
import { TopPlayersPodium } from "@/components/stats/top-players-podium"
import { PlayerRankingsTable } from "@/components/stats/player-rankings-table"
import { PlayerRankingsTableMobile } from "@/components/stats/player-rankings-table-mobile"
import { PositionLeaders } from "@/components/stats/position-leaders"
import { LatestMatches } from "@/components/latest-matches"
import { LatestMatchesMobile } from "@/components/latest-matches-mobile"
import { AdminProvider } from "@/components/admin-context"
import { AdminLogo } from "@/components/admin-logo"
import { getMatches, getPlayerStats, getAttackerStats, getDefenderStats, getPlayers } from "@/lib/api"

export default async function Home() {
  const [matches, playerStats, attackerStats, defenderStats, players] = await Promise.all([
    getMatches(),
    getPlayerStats(),
    getAttackerStats(),
    getDefenderStats(),
    getPlayers(),
  ])

  return (
    <AdminProvider>
      <div className="min-h-screen bg-muted/30">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-background border-b">
          <div className="px-4 sm:px-6 py-3 sm:py-0 sm:h-20 flex flex-col sm:flex-row items-center gap-3 sm:justify-between">
            <AdminLogo />
            <div className="w-full sm:w-auto sm:flex sm:flex-row sm:items-center sm:gap-2 space-y-2 sm:space-y-0">
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
          {/* Top players podium */}
          <TopPlayersPodium playerStats={playerStats} matches={matches} />
          <PositionLeaders attackerStats={attackerStats} defenderStats={defenderStats} playerStats={playerStats} />
          <div className="hidden sm:block"><PlayerRankingsTable playerStats={playerStats} matches={matches} /></div>
          <div className="sm:hidden"><PlayerRankingsTableMobile playerStats={playerStats} matches={matches} /></div>

          {/* Latest matches */}
          <section>
            <div className="hidden sm:block"><LatestMatches matches={matches} /></div>
            <div className="sm:hidden"><LatestMatchesMobile matches={matches} /></div>
          </section>
        </main>
      </div>
    </AdminProvider>
  )
}
