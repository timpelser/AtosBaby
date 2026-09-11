"use client"

import { useState } from "react"
import type { PlayerStats, Match } from "@/lib/types"
import { PlayerProfileDialog } from "@/components/player-profile-dialog"

function getInitials(first: string, last: string) {
  return `${first[0]}${last[0]}`.toUpperCase()
}

// A real podium: three blocks of different heights (tallest in the middle),
// arranged in the classic 2nd–1st–3rd left-to-right order via `order`, each
// just an avatar + name sitting above its block — no stats, no card
// chrome. The rank number is embossed into the block face itself.
//
// avatarBg is a light tint of the block's own color, not a translucent
// white — the avatar sits on the page's plain background, not overlapping
// the block, so a white/NN tone (which would read fine painted onto a
// solid colored card) is nearly invisible against a near-white page.
const PODIUM = {
  1: {
    height: "h-[16rem] sm:h-[22rem]",
    block: "bg-primary",
    rankText: "text-white",
    avatarBg: "bg-primary/10 border-primary/30 text-primary",
    order: "order-2",
  },
  2: {
    height: "h-[12rem] sm:h-[16rem]",
    block: "bg-slate-300",
    rankText: "text-white",
    avatarBg: "bg-slate-100 border-slate-300 text-slate-600",
    order: "order-1",
  },
  3: {
    height: "h-[10rem] sm:h-[14rem]",
    block: "bg-orange-400",
    rankText: "text-white",
    avatarBg: "bg-orange-100 border-orange-300 text-orange-500",
    order: "order-3",
  },
} as const

function PodiumSpot({ stats, rank, matches }: { stats: PlayerStats; rank: 1 | 2 | 3; matches: Match[] }) {
  const [open, setOpen] = useState(false)
  const p = PODIUM[rank]
  const playerMatches = matches.filter(m =>
    [...m.team_a, ...m.team_b].some(mp => mp.player.id === stats.player.id)
  )

  return (
    <>
      <div className={`flex flex-col items-center gap-4 flex-1 max-w-96 ${p.order}`}>
        <button
          onClick={() => setOpen(true)}
          className={`w-24 h-24 sm:w-32 sm:h-32 rounded-full border-2 flex items-center justify-center text-xl sm:text-2xl font-bold hover:opacity-80 transition-opacity cursor-pointer ${p.avatarBg}`}
          aria-label={`Profil de ${stats.player.first_name} ${stats.player.last_name}`}
        >
          {getInitials(stats.player.first_name, stats.player.last_name)}
        </button>
        <p className="text-lg sm:text-2xl font-semibold text-foreground text-center leading-tight px-1 truncate w-full">
          {stats.player.first_name} {stats.player.last_name}
        </p>
        <div className={`w-full ${p.height} ${p.block} rounded-t-2xl flex items-start justify-center pt-4 sm:pt-6`}>
          <span className={`text-6xl sm:text-8xl font-black leading-none select-none ${p.rankText}`}>{rank}</span>
        </div>
      </div>
      <PlayerProfileDialog
        stats={stats}
        rank={rank}
        playerMatches={playerMatches}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  )
}

function SkeletonSpot({ rank }: { rank: 1 | 2 | 3 }) {
  const p = PODIUM[rank]
  return (
    <div className={`flex flex-col items-center gap-4 flex-1 max-w-96 ${p.order}`}>
      <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-muted animate-pulse" />
      <div className="h-6 w-32 rounded bg-muted animate-pulse" />
      <div className={`w-full ${p.height} rounded-t-2xl bg-muted animate-pulse`} />
    </div>
  )
}

export function TopPlayersPodium({ playerStats, matches }: { playerStats: PlayerStats[]; matches: Match[] }) {
  const [first, second, third] = playerStats

  if (!first) return (
    <section>
      <div className="flex items-end justify-center gap-3 sm:gap-6 max-w-7xl mx-auto">
        <SkeletonSpot rank={2} />
        <SkeletonSpot rank={1} />
        <SkeletonSpot rank={3} />
      </div>
    </section>
  )

  return (
    <section>
      <div className="flex items-end justify-center gap-3 sm:gap-6 max-w-7xl mx-auto">
        {second && <PodiumSpot stats={second} rank={2} matches={matches} />}
        <PodiumSpot stats={first} rank={1} matches={matches} />
        {third && <PodiumSpot stats={third} rank={3} matches={matches} />}
      </div>
    </section>
  )
}
