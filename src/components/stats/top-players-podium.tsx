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
// chrome. The rank number and ELO are embossed into the block face itself.
//
// Same blue/silver/bronze palette as before, but with a top-to-bottom
// gradient instead of a flat fill and a colored ambient shadow, and a
// bright top edge so a block reads as a solid riser rather than a
// flat-filled rectangle — see the "A · Refined current palette" concept
// this was picked from. Avatars are styled identically across all three
// ranks (no extra ring/badge singling one out) so they read as one set.
//
// avatarBg is a light tint of the block's own color, not a translucent
// white — the avatar sits on the page's plain background, not overlapping
// the block, so a white/NN tone (which would read fine painted onto a
// solid colored card) is nearly invisible against a near-white page.
const PODIUM = {
  1: {
    height: "h-[16rem] sm:h-[22rem]",
    block: "bg-gradient-to-b from-[#1c8ce0] to-[#0a5389]",
    blockShadow: "shadow-[0_14px_26px_-14px_rgba(15,111,179,0.55)]",
    rankText: "text-white",
    avatarBg: "bg-primary/10 border-primary/30 text-primary",
    order: "order-2",
  },
  2: {
    height: "h-[12rem] sm:h-[16rem]",
    block: "bg-gradient-to-b from-[#c7cedb] to-[#9aa4b6]",
    blockShadow: "shadow-[0_14px_26px_-16px_rgba(90,100,120,0.35)]",
    rankText: "text-white",
    avatarBg: "bg-slate-100 border-slate-300 text-slate-600",
    order: "order-1",
  },
  3: {
    height: "h-[10rem] sm:h-[14rem]",
    block: "bg-gradient-to-b from-[#f0a25a] to-[#a85c1f]",
    blockShadow: "shadow-[0_14px_26px_-16px_rgba(168,92,31,0.45)]",
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
        <div className={`relative overflow-hidden w-full ${p.height} ${p.block} ${p.blockShadow} rounded-t-2xl flex flex-col items-center justify-between pt-4 sm:pt-6 pb-4 sm:pb-6`}>
          <span aria-hidden className="absolute top-0 inset-x-0 h-0.5 bg-white/55" />
          <span className={`text-6xl sm:text-8xl font-black leading-none select-none ${p.rankText}`}>{rank}</span>
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-[10px] sm:text-xs font-bold tracking-wider uppercase text-white/65 select-none">Elo</span>
            <span className="text-3xl sm:text-5xl font-bold text-white/90 select-none">{stats.elo}</span>
          </div>
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
      <div className={`w-full ${p.height} rounded-t-2xl bg-muted animate-pulse flex flex-col items-center justify-between pt-4 sm:pt-6 pb-4 sm:pb-6`}>
        <div className="h-12 sm:h-16 w-16 sm:w-20 rounded bg-white/10" />
        <div className="h-8 sm:h-10 w-14 sm:w-16 rounded bg-white/10" />
      </div>
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
