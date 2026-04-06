import { AddMatchDialog } from "@/components/add-match-dialog"
import { TopDuosPodium } from "@/components/stats/top-duos-podium"
import { DuoRankingsTable } from "@/components/stats/duo-rankings-table"
import { DuoRankingsTableMobile } from "@/components/stats/duo-rankings-table-mobile"
import { PositionLeaders } from "@/components/stats/position-leaders"
import { LatestMatches } from "@/components/latest-matches"
import { LatestMatchesMobile } from "@/components/latest-matches-mobile"
import { getMatches, getDuoStats, getAttackerStats, getDefenderStats, getPlayers } from "@/lib/api"

export default async function Home() {
  const [matches, duoStats, attackerStats, defenderStats, players] = await Promise.all([
    getMatches(),
    getDuoStats(),
    getAttackerStats(),
    getDefenderStats(),
    getPlayers(),
  ])

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background border-b">
        <div className="px-4 sm:px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl sm:text-3xl tracking-tight text-primary whitespace-nowrap" style={{color: "black"}}>⚽ AtosBaby</span>
          </div>
          <AddMatchDialog players={players} />
        </div>
      </header>

      {/* Page content */}
      <main className="px-4 sm:px-6 py-6 space-y-6">
        {/* Top duos podium */}
        <TopDuosPodium duoStats={duoStats} />
        <PositionLeaders attackerStats={attackerStats} defenderStats={defenderStats} />
        <div className="hidden sm:block"><DuoRankingsTable duoStats={duoStats} /></div>
        <div className="sm:hidden"><DuoRankingsTableMobile duoStats={duoStats} /></div>

        {/* Latest matches */}
        <section>
          <div className="hidden sm:block"><LatestMatches matches={matches} /></div>
          <div className="sm:hidden"><LatestMatchesMobile matches={matches} /></div>
        </section>
      </main>
    </div>
  )
}
