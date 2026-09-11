"use client"

import { useState } from "react"
import { SEASON_COLOR, iconForSeasonLabel } from "@/lib/seasons"
import type { SeasonChampion, PlayerStats, Match } from "@/lib/types"
import { PlayerProfileDialog } from "@/components/player-profile-dialog"

function getInitials(first: string, last: string) {
  return `${first[0]}${last[0]}`.toUpperCase()
}

const TrophyIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4zM7 5H4a2 2 0 0 0 0 4h1.5M17 5h3a2 2 0 0 1 0 4h-1.5" />
  </svg>
)

// Every row gets its own highlight, matched to the season it was actually
// won in (not just the most recent one) — same color-mix approach as the
// countdown card, derived from the one shared SEASON_COLOR so this can't
// drift from the border/particle theme either.
function ChampionRow({
  champion,
  overallRank,
  fullStats,
  matches,
}: {
  champion: SeasonChampion
  overallRank: number | undefined
  fullStats: PlayerStats | undefined
  matches: Match[]
}) {
  const [open, setOpen] = useState(false)
  const color = SEASON_COLOR[iconForSeasonLabel(champion.seasonLabel)]
  const playerMatches = matches.filter(m =>
    [...m.team_a, ...m.team_b].some(mp => mp.player.id === champion.player.id)
  )

  return (
    <>
      <div
        className="flex items-center gap-3 rounded-xl px-3 py-2.5"
        style={{ background: `color-mix(in srgb, ${color} 12%, white)` }}
      >
        <button
          onClick={() => setOpen(true)}
          className="w-9 h-9 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0 hover:opacity-80 transition-opacity cursor-pointer"
          style={{
            background: `color-mix(in srgb, ${color} 22%, white)`,
            borderColor: `color-mix(in srgb, ${color} 45%, white)`,
            color: `color-mix(in srgb, ${color} 65%, black)`,
          }}
          aria-label={`Profil de ${champion.player.first_name} ${champion.player.last_name}`}
        >
          {getInitials(champion.player.first_name, champion.player.last_name)}
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground text-sm truncate">
            {champion.player.first_name} {champion.player.last_name}
          </p>
        </div>
        <p className="text-sm font-bold shrink-0" style={{ color: `color-mix(in srgb, ${color} 65%, black)` }}>
          {champion.seasonLabel}
        </p>
      </div>
      {fullStats && (
        <PlayerProfileDialog
          stats={fullStats}
          rank={overallRank ?? 0}
          playerMatches={playerMatches}
          open={open}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 rounded-xl px-3 py-2.5">
      <div className="w-9 h-9 rounded-full bg-muted animate-pulse shrink-0" />
      <div className="flex-1">
        <div className="h-3.5 w-24 rounded bg-muted animate-pulse" />
      </div>
      <div className="h-4 w-20 rounded bg-muted animate-pulse" />
    </div>
  )
}

export function DernierChampionCard({
  champions,
  playerStats,
  matches,
}: {
  champions: SeasonChampion[]
  playerStats: PlayerStats[]
  matches: Match[]
}) {
  const overallRankMap = new Map(playerStats.map((p, i) => [p.player.id, i + 1]))
  const playerStatsMap = new Map(playerStats.map((p) => [p.player.id, p]))

  return (
    <div className="h-full rounded-2xl bg-card border border-border px-6 py-6 flex flex-col gap-4 shadow-sm">
      <div className="flex items-center gap-2">
        {TrophyIcon}
        <p className="text-lg font-bold text-foreground leading-tight">Derniers champions</p>
      </div>

      {champions.length === 0 ? (
        <div className="flex-1 flex items-center justify-center py-4">
          <p className="text-sm text-muted-foreground text-center">Aucune saison terminée pour l&apos;instant.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {champions.map((champion) => (
            <ChampionRow
              key={champion.seasonKey}
              champion={champion}
              overallRank={overallRankMap.get(champion.player.id)}
              fullStats={playerStatsMap.get(champion.player.id)}
              matches={matches}
            />
          ))}
          {/* Pad out to 3 rows so the card's height stays consistent with the podium/countdown alongside it, even early on when only 1-2 seasons exist. */}
          {Array.from({ length: Math.max(0, 3 - champions.length) }).map((_, i) => (
            <div key={`pad-${i}`} className="h-[52px]" />
          ))}
        </div>
      )}
    </div>
  )
}

export function SkeletonDernierChampionCard() {
  return (
    <div className="h-full rounded-2xl bg-card border border-border px-6 py-6 flex flex-col gap-4 shadow-sm">
      <div className="flex items-center gap-2">
        {TrophyIcon}
        <p className="text-lg font-bold text-foreground leading-tight">Derniers champions</p>
      </div>
      <div className="flex flex-col gap-1">
        {[1, 2, 3].map((i) => <SkeletonRow key={i} />)}
      </div>
    </div>
  )
}
