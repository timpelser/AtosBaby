"use client"

import { useState } from "react"
import type { PositionStats, PlayerStats, Match } from "@/lib/types"
import { PlayerProfileDialog } from "@/components/player-profile-dialog"

function getInitials(first: string, last: string) {
  return `${first[0]}${last[0]}`.toUpperCase()
}

function LeaderRow({
  stats,
  rank,
  position,
  overallRank,
  fullStats,
  matches,
  highlighted,
}: {
  stats: PositionStats
  rank: number
  position: "attack" | "defense"
  overallRank: number | undefined
  fullStats: PlayerStats | undefined
  matches: Match[]
  highlighted: boolean
}) {
  const [open, setOpen] = useState(false)
  const isAttack = position === "attack"
  const playerMatches = matches.filter(m =>
    [...m.team_a, ...m.team_b].some(mp => mp.player.id === stats.player.id)
  )

  const rowBg = highlighted ? (isAttack ? "bg-primary/5" : "bg-orange-50") : ""
  const rankBadge = highlighted
    ? isAttack
      ? "bg-primary text-primary-foreground"
      : "bg-orange-400 text-white"
    : "bg-muted text-muted-foreground"
  const avatarBg = highlighted
    ? isAttack
      ? "bg-primary/10 border-primary/30 text-primary"
      : "bg-orange-100 border-orange-300 text-orange-400"
    : "bg-muted border-border text-muted-foreground"
  const winColor = highlighted ? (isAttack ? "text-primary" : "text-orange-400") : "text-foreground"

  return (
    <>
      <div className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${rowBg}`}>
        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${rankBadge}`}>
          {rank}
        </span>
        <button
          onClick={() => setOpen(true)}
          className={`w-9 h-9 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0 hover:opacity-80 transition-opacity cursor-pointer ${avatarBg}`}
          aria-label={`Profil de ${stats.player.first_name} ${stats.player.last_name}`}
        >
          {getInitials(stats.player.first_name, stats.player.last_name)}
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground text-sm truncate">
            {stats.player.first_name} {stats.player.last_name}
          </p>
          <p className="text-xs text-muted-foreground">Rang Global: #{overallRank !== undefined ? overallRank : "—"}</p>
        </div>
        <p className={`text-lg font-bold shrink-0 ${winColor}`}>{stats.wins}</p>
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

function PositionLeaderCard({
  topStats,
  position,
  overallRankMap,
  playerStatsMap,
  matches,
}: {
  topStats: PositionStats[]
  position: "attack" | "defense"
  overallRankMap: Map<string, number>
  playerStatsMap: Map<string, PlayerStats>
  matches: Match[]
}) {
  const isAttack = position === "attack"
  const accentColor = isAttack ? "text-primary" : "text-orange-400"
  const label = isAttack ? "Meilleur Attaquant" : "Meilleur Défenseur"
  const statLabel = isAttack ? "MATCHS GAGNES EN ATTAQUE" : "MATCHS GAGNES EN DEFENSE"
  const leader = topStats[0]
  const icon = isAttack ? (
    // Star icon
    <svg xmlns="http://www.w3.org/2000/svg" className={`w-5 h-5 ${accentColor}`} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l2.9 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14 2 9.27l7.1-1.01L12 2z" />
    </svg>
  ) : (
    // Shield icon
    <svg xmlns="http://www.w3.org/2000/svg" className={`w-5 h-5 ${accentColor}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )

  return (
    <div className="flex-1 rounded-2xl bg-card border border-border px-6 py-6 flex flex-col gap-4 shadow-sm relative overflow-hidden">
      {/* Header row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {icon}
          <p className="text-lg font-bold text-foreground leading-tight">{label}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <p className={`text-4xl font-black ${accentColor}`}>{leader.wins}</p>
          <p className="text-[9px] font-semibold tracking-wider text-muted-foreground uppercase leading-tight max-w-[72px]">{statLabel}</p>
        </div>
      </div>

      {/* Top 3 list */}
      <div className="flex flex-col gap-1">
        {topStats.map((stats, i) => (
          <LeaderRow
            key={stats.player.id}
            stats={stats}
            rank={i + 1}
            position={position}
            overallRank={overallRankMap.get(stats.player.id)}
            fullStats={playerStatsMap.get(stats.player.id)}
            matches={matches}
            highlighted={i === 0}
          />
        ))}
      </div>
    </div>
  )
}

function SkeletonLeaderCard({ position }: { position: "attack" | "defense" }) {
  const isAttack = position === "attack"
  const label = isAttack ? "Meilleur Attaquant" : "Meilleur Défenseur"
  const statLabel = isAttack ? "MATCHS GAGNES EN ATTAQUE" : "MATCHS GAGNES EN DEFENSE"
  const accentColor = isAttack ? "text-primary" : "text-orange-400"
  const icon = isAttack ? (
    <svg xmlns="http://www.w3.org/2000/svg" className={`w-5 h-5 ${accentColor}`} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l2.9 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14 2 9.27l7.1-1.01L12 2z" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" className={`w-5 h-5 ${accentColor}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )

  return (
    <div className="flex-1 rounded-2xl bg-card border border-border px-6 py-6 flex flex-col gap-4 shadow-sm relative overflow-hidden">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {icon}
          <p className="text-lg font-bold text-foreground leading-tight">{label}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="h-10 w-8 rounded bg-muted animate-pulse" />
          <p className="text-[9px] font-semibold tracking-wider text-muted-foreground uppercase leading-tight max-w-[72px]">{statLabel}</p>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl px-3 py-2.5">
            <div className="w-6 h-6 rounded-full bg-muted animate-pulse shrink-0" />
            <div className="w-9 h-9 rounded-full bg-muted animate-pulse shrink-0" />
            <div className="flex-1 flex flex-col gap-1.5">
              <div className="h-3.5 w-28 rounded bg-muted animate-pulse" />
              <div className="h-2.5 w-20 rounded bg-muted animate-pulse" />
            </div>
            <div className="h-5 w-6 rounded bg-muted animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function PositionLeaders({
  attackerStats,
  defenderStats,
  playerStats,
  matches,
}: {
  attackerStats: PositionStats[]
  defenderStats: PositionStats[]
  playerStats: PlayerStats[]
  matches: Match[]
}) {
  const topAttackers = attackerStats.slice(0, 3)
  const topDefenders = defenderStats.slice(0, 3)

  const overallRankMap = new Map(playerStats.map((p, i) => [p.player.id, i + 1]))
  const playerStatsMap = new Map(playerStats.map((p) => [p.player.id, p]))

  if (topAttackers.length === 0 || topDefenders.length === 0) return (
    <section>
      <div className="flex flex-col sm:flex-row items-stretch gap-4">
        <SkeletonLeaderCard position="attack" />
        <SkeletonLeaderCard position="defense" />
      </div>
    </section>
  )

  return (
    <section>
      <div className="flex flex-col sm:flex-row items-stretch gap-4">
        <PositionLeaderCard
          topStats={topAttackers}
          position="attack"
          overallRankMap={overallRankMap}
          playerStatsMap={playerStatsMap}
          matches={matches}
        />
        <PositionLeaderCard
          topStats={topDefenders}
          position="defense"
          overallRankMap={overallRankMap}
          playerStatsMap={playerStatsMap}
          matches={matches}
        />
      </div>
    </section>
  )
}
