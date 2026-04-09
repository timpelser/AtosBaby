export const dynamic = "force-dynamic"

import { AddMatchDialog } from "@/components/add-match-dialog"
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
          <div className="px-4 sm:px-6 h-20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AdminLogo />
            </div>
            <AddMatchDialog players={players} />
          </div>
        </header>

        {/* Page content */}
        <main className="px-4 sm:px-6 py-6 space-y-6">
          {/* Top players podium */}
          <TopPlayersPodium playerStats={playerStats} />
          <PositionLeaders attackerStats={attackerStats} defenderStats={defenderStats} />
          <div className="hidden sm:block"><PlayerRankingsTable playerStats={playerStats} /></div>
          <div className="sm:hidden"><PlayerRankingsTableMobile playerStats={playerStats} /></div>

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
