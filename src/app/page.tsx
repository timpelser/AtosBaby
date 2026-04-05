import { AddMatchDialog } from "@/components/add-match-dialog"
import { TopDuosPodium } from "@/components/stats/top-duos-podium"
import { DuoRankingsTable } from "@/components/stats/duo-rankings-table"
import { DuoRankingsTableMobile } from "@/components/stats/duo-rankings-table-mobile"
import { PositionLeaders } from "@/components/stats/position-leaders"
import { LatestMatches } from "@/components/latest-matches"
import { LatestMatchesMobile } from "@/components/latest-matches-mobile"

export default function Home() {
  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background border-b">
        <div className="px-4 sm:px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl sm:text-3xl tracking-tight text-primary whitespace-nowrap" style={{color: "black"}}>⚽ AtosBaby</span>
          </div>
          <AddMatchDialog />
        </div>
      </header>

      {/* Page content */}
      <main className="px-4 sm:px-6 py-6 space-y-6">
        {/* Top duos podium */}
        <TopDuosPodium />
        <PositionLeaders />
        <div className="hidden sm:block"><DuoRankingsTable /></div>
        <div className="sm:hidden"><DuoRankingsTableMobile /></div>

        {/* Latest matches */}
        <section>
          <div className="hidden sm:block"><LatestMatches /></div>
          <div className="sm:hidden"><LatestMatchesMobile /></div>
        </section>
      </main>
    </div>
  )
}
