"use client"

import { useState } from "react"
import type { PlayerStats, Match } from "@/lib/types"
import { PlayerProfileDialog } from "@/components/player-profile-dialog"

function getInitials(first: string, last: string) {
  return `${first[0]}${last[0]}`.toUpperCase()
}

function ChampionCard({ stats, matches }: { stats: PlayerStats; matches: Match[] }) {
  const [open, setOpen] = useState(false)
  const playerMatches = matches.filter(m =>
    [...m.team_a, ...m.team_b].some(mp => mp.player.id === stats.player.id)
  )

  return (
    <>
      <div className="relative flex-1 rounded-2xl bg-primary px-8 py-8 flex flex-col items-center justify-center gap-6 shadow-2xl min-h-64 overflow-hidden">
        {/* Background rank */}
        <span className="absolute right-6 top-4 text-[7rem] font-black text-white/10 leading-none select-none">
          #1
        </span>

        {/* Row 1: Avatar + name */}
        <div className="flex flex-col items-center gap-6 z-10">
          <button
            onClick={() => setOpen(true)}
            className="w-16 h-16 rounded-full bg-white/20 border-2 border-white/40 text-white flex items-center justify-center text-lg font-bold hover:bg-white/30 transition-colors cursor-pointer"
            aria-label={`Profil de ${stats.player.first_name} ${stats.player.last_name}`}
          >
            {getInitials(stats.player.first_name, stats.player.last_name)}
          </button>
          <p className="text-3xl font-bold text-white leading-snug text-center">
            {stats.player.first_name} {stats.player.last_name}
          </p>
        </div>

        {/* Row 2: Stats */}
        <div className="flex gap-6 z-10">
          <div className="text-center">
            <p className="text-xs font-semibold tracking-widest text-white/60 uppercase">Victoires</p>
            <p className="text-3xl font-bold text-white">{stats.wins}</p>
          </div>
          <div className="text-center">
            <p className="text-xs font-semibold tracking-widest text-white/60 uppercase">Défaites</p>
            <p className="text-3xl font-bold text-white">{stats.losses}</p>
          </div>
          <div className="text-center">
            <p className="text-xs font-semibold tracking-widest text-white/60 uppercase">Ratio</p>
            <p className="text-3xl font-bold text-white">{stats.win_rate.toFixed(0)}%</p>
          </div>
          <div className="text-center">
            <p className="text-xs font-semibold tracking-widest text-white/60 uppercase">ELO</p>
            <p className="text-3xl font-bold text-white">{stats.elo}</p>
          </div>
        </div>
      </div>
      <PlayerProfileDialog
        stats={stats}
        rank={1}
        playerMatches={playerMatches}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  )
}

function RunnerUpCard({ stats, rank, matches }: { stats: PlayerStats; rank: 2 | 3; matches: Match[] }) {
  const [open, setOpen] = useState(false)
  const isSecond = rank === 2
  const rankColor = isSecond ? "text-primary" : "text-orange-400"
  const playerMatches = matches.filter(m =>
    [...m.team_a, ...m.team_b].some(mp => mp.player.id === stats.player.id)
  )

  return (
    <>
      <div className="flex-1 rounded-2xl bg-card border border-border px-8 py-8 flex flex-col items-center justify-center gap-6 shadow-sm relative overflow-hidden min-h-64">
        {/* Background rank */}
        <span className={`absolute right-6 top-4 text-[7rem] font-black opacity-10 leading-none select-none ${rankColor}`}>
          #{rank}
        </span>

        {/* Row 1: Avatar + name */}
        <div className="flex flex-col items-center gap-6 z-10">
          <button
            onClick={() => setOpen(true)}
            className="w-16 h-16 rounded-full bg-muted border-2 border-border text-muted-foreground flex items-center justify-center text-lg font-bold hover:bg-muted/70 transition-colors cursor-pointer"
            aria-label={`Profil de ${stats.player.first_name} ${stats.player.last_name}`}
          >
            {getInitials(stats.player.first_name, stats.player.last_name)}
          </button>
          <p className="text-3xl text-foreground leading-snug text-center">
            {stats.player.first_name} {stats.player.last_name}
          </p>
        </div>

        {/* Row 2: Stats */}
        <div className="flex gap-6 z-10">
          <div className="text-center">
            <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Victoires</p>
            <p className="text-3xl text-foreground">{stats.wins}</p>
          </div>
          <div className="text-center">
            <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Défaites</p>
            <p className="text-3xl text-foreground">{stats.losses}</p>
          </div>
          <div className="text-center">
            <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Ratio</p>
            <p className="text-3xl text-foreground">{stats.win_rate.toFixed(0)}%</p>
          </div>
          <div className="text-center">
            <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">ELO</p>
            <p className="text-3xl text-foreground">{stats.elo}</p>
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

function SkeletonChampionCard() {
  return (
    <div className="relative flex-1 rounded-2xl bg-primary px-8 py-8 flex flex-col items-center justify-center gap-6 shadow-2xl min-h-64 overflow-hidden">
      <span className="absolute right-6 top-4 text-[7rem] font-black text-white/10 leading-none select-none">#1</span>
      <div className="flex flex-col items-center gap-4 z-10">
        <div className="w-16 h-16 rounded-full bg-white/20 border-2 border-white/40" />
        <div className="flex flex-col items-center gap-2">
          <div className="h-5 w-36 rounded bg-white/20 animate-pulse" />
        </div>
      </div>
      <div className="flex gap-6 z-10">
        {[1, 2, 3, 4].map((k) => (
          <div key={k} className="text-center flex flex-col items-center gap-1">
            <div className="h-3 w-14 rounded bg-white/20 animate-pulse" />
            <div className="h-8 w-10 rounded bg-white/20 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}

function SkeletonRunnerUpCard({ rank }: { rank: 2 | 3 }) {
  const rankColor = rank === 2 ? "text-primary" : "text-orange-400"
  return (
    <div className="flex-1 rounded-2xl bg-card border border-border px-8 py-8 flex flex-col items-center justify-center gap-6 shadow-sm relative overflow-hidden min-h-64">
      <span className={`absolute right-6 top-4 text-[7rem] font-black opacity-10 leading-none select-none ${rankColor}`}>#{rank}</span>
      <div className="flex flex-col items-center gap-4 z-10">
        <div className="w-16 h-16 rounded-full bg-muted border-2 border-border" />
        <div className="flex flex-col items-center gap-2">
          <div className="h-5 w-36 rounded bg-muted animate-pulse" />
        </div>
      </div>
      <div className="flex gap-6 z-10">
        {[1, 2, 3, 4].map((k) => (
          <div key={k} className="text-center flex flex-col items-center gap-1">
            <div className="h-3 w-14 rounded bg-muted animate-pulse" />
            <div className="h-8 w-10 rounded bg-muted animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function TopPlayersPodium({ playerStats, matches }: { playerStats: PlayerStats[]; matches: Match[] }) {
  const top3 = playerStats.slice(0, 3)
  const [first, second, third] = top3

  if (!first) return (
    <section>
      <div className="flex flex-col sm:flex-row items-stretch gap-4">
        <div className="order-2 sm:order-1 flex-1 flex flex-col"><SkeletonRunnerUpCard rank={2} /></div>
        <div className="order-1 sm:order-2 flex-1 flex flex-col"><SkeletonChampionCard /></div>
        <div className="order-3 sm:order-3 flex-1 flex flex-col"><SkeletonRunnerUpCard rank={3} /></div>
      </div>
    </section>
  )

  return (
    <section>
      {/* On mobile: column, #1 on top. On desktop: row, #1 in center via order */}
      <div className="flex flex-col sm:flex-row items-stretch gap-4">
        {second && <div className="order-2 sm:order-1 flex-1 flex flex-col"><RunnerUpCard stats={second} rank={2} matches={matches} /></div>}
        <div className="order-1 sm:order-2 flex-1 flex flex-col"><ChampionCard stats={first} matches={matches} /></div>
        {third && <div className="order-3 sm:order-3 flex-1 flex flex-col"><RunnerUpCard stats={third} rank={3} matches={matches} /></div>}
      </div>
    </section>
  )
}
