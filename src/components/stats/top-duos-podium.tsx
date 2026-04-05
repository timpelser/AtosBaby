"use client"

import { DUO_STATS } from "@/lib/dummy-data"
import type { DuoStats } from "@/lib/types"

function getInitials(first: string, last: string) {
  return `${first[0]}${last[0]}`.toUpperCase()
}

function DuoAvatars({ duo, variant }: { duo: DuoStats; variant: "light" | "dark" }) {
  const bg = variant === "light" ? "bg-white/20 border-white/40 text-white" : "bg-muted border-border text-muted-foreground"
  const ringColor = variant === "light" ? "ring-primary" : "ring-card"
  return (
    <div className="flex shrink-0">
      <div className={`w-16 h-16 rounded-full ${bg} border-2 flex items-center justify-center text-lg font-bold z-10 ring-2 ${ringColor}`}>
        {getInitials(duo.player_a.first_name, duo.player_a.last_name)}
      </div>
      <div className={`w-16 h-16 rounded-full ${bg} border-2 flex items-center justify-center text-lg font-bold -ml-4`}>
        {getInitials(duo.player_b.first_name, duo.player_b.last_name)}
      </div>
    </div>
  )
}

function ChampionCard({ duo }: { duo: DuoStats }) {
  return (
    <div className="relative flex-1 rounded-2xl bg-primary px-8 py-8 flex flex-col items-center justify-center gap-10 shadow-2xl min-h-64 overflow-hidden">
      {/* Background rank */}
      <span className="absolute right-6 top-4 text-[7rem] font-black text-white/10 leading-none select-none">
        #1
      </span>

      {/* Row 1: Avatar + names */}
      <div className="flex flex-col items-center gap-4 z-10">
        <DuoAvatars duo={duo} variant="light" />
        <p className="text-3xl font-bold text-white leading-snug text-center">
          {duo.player_a.first_name} {duo.player_a.last_name}
          <br />
          {duo.player_b.first_name} {duo.player_b.last_name}
        </p>
      </div>

      {/* Row 2: Stats */}
      <div className="flex gap-6 z-10">
        <div className="text-center">
          <p className="text-xs font-semibold tracking-widest text-white/60 uppercase">Victoires</p>
          <p className="text-3xl font-bold text-white">{duo.wins}</p>
        </div>
        <div className="text-center">
          <p className="text-xs font-semibold tracking-widest text-white/60 uppercase">Defaites</p>
          <p className="text-3xl font-bold text-white">{duo.losses}</p>
        </div>
        <div className="text-center">
          <p className="text-xs font-semibold tracking-widest text-white/60 uppercase">Ratio</p>
          <p className="text-3xl font-bold text-white">{duo.win_rate.toFixed(0)}%</p>
        </div>
      </div>
    </div>
  )
}

function RunnerUpCard({ duo, rank }: { duo: DuoStats; rank: 2 | 3 }) {
  const isSecond = rank === 2
  const rankColor = isSecond ? "text-primary" : "text-orange-400"
  const winRateColor = isSecond ? "text-primary" : "text-orange-400"

  return (
    <div className="flex-1 rounded-2xl bg-card border border-border px-8 py-8 flex flex-col items-center justify-center gap-10 shadow-sm relative overflow-hidden min-h-64">
      {/* Background rank */}
      <span className={`absolute right-6 top-4 text-[7rem] font-black opacity-10 leading-none select-none ${rankColor}`}>
        #{rank}
      </span>

      {/* Row 1: Avatar + names */}
      <div className="flex flex-col items-center gap-4 z-10">
        <DuoAvatars duo={duo} variant="dark" />
        <p className="text-3xl text-foreground leading-snug text-center">
          {duo.player_a.first_name} {duo.player_a.last_name}
          <br />
          {duo.player_b.first_name} {duo.player_b.last_name}
        </p>
      </div>

      {/* Row 2: Stats */}
      <div className="flex gap-6 z-10">
        <div className="text-center">
          <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Victoires</p>
          <p className="text-3xl text-foreground">{duo.wins}</p>
        </div>
        <div className="text-center">
          <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Defaites</p>
          <p className="text-3xl text-foreground">{duo.losses}</p>
        </div>
        <div className="text-center">
          <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Ratio</p>
          <p className={`text-3xl ${winRateColor}`}>{duo.win_rate.toFixed(0)}%</p>
        </div>
      </div>
    </div>
  )
}

export function TopDuosPodium() {
  const top3 = DUO_STATS.slice(0, 3)
  const [first, second, third] = top3

  if (!first) return null

  return (
    <section>
      {/* On mobile: column, #1 on top. On desktop: row, #1 in center via order */}
      <div className="flex flex-col sm:flex-row items-stretch gap-4">
        {second && <div className="order-2 sm:order-1 flex-1 flex flex-col">{<RunnerUpCard duo={second} rank={2} />}</div>}
        <div className="order-1 sm:order-2 flex-1 flex flex-col"><ChampionCard duo={first} /></div>
        {third && <div className="order-3 sm:order-3 flex-1 flex flex-col">{<RunnerUpCard duo={third} rank={3} />}</div>}
      </div>

    </section>
  )
}
