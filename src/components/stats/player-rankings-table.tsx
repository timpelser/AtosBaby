"use client"

import { useState } from "react"
import type { PlayerStats } from "@/lib/types"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

function getInitials(first: string, last: string) {
  return `${first[0]}${last[0]}`.toUpperCase()
}

function WilsonBadge({ value, zScore }: { value: number; zScore: number }) {
  const color =
    zScore > 2   ? "bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400" :
    zScore > 1   ? "bg-primary/10 text-primary" :
    zScore >= -1 ? "bg-muted text-muted-foreground" :
    zScore >= -2 ? "bg-orange-100 text-orange-500 dark:bg-orange-900/20 dark:text-orange-400" :
                   "bg-red-100 text-red-500 dark:bg-red-900/20 dark:text-red-400"
  return (
    <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${color}`}>
      {(value * 100).toFixed(1)}%
    </span>
  )
}

function PlayerRow({ stats, rank }: { stats: PlayerStats; rank: number }) {
  const rankLabel = String(rank).padStart(2, "0")

  return (
    <TableRow className="h-16">
      <TableCell className="font-bold text-foreground text-base pl-6 w-20">{rankLabel}</TableCell>
      <TableCell className="w-1/2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-semibold ring-2 ring-background">
            {getInitials(stats.player.first_name, stats.player.last_name)}
          </div>
          <span className="font-semibold text-foreground">
            {stats.player.first_name} {stats.player.last_name}
          </span>
        </div>
      </TableCell>
      <TableCell className="text-foreground text-center">{stats.wins}</TableCell>
      <TableCell className="text-muted-foreground text-center">{stats.losses}</TableCell>
      <TableCell className="text-foreground text-center">{stats.matches_played}</TableCell>
      <TableCell className="text-center text-foreground">
        {stats.win_rate.toFixed(1)}%
      </TableCell>
      <TableCell className="text-center">
        <WilsonBadge value={stats.wilson_score} zScore={stats.z_score} />
      </TableCell>
    </TableRow>
  )
}

const PAGE_SIZE = 7

export function PlayerRankingsTable({ playerStats }: { playerStats: PlayerStats[] }) {
  const [showAll, setShowAll] = useState(false)
  const visible = showAll ? playerStats : playerStats.slice(0, PAGE_SIZE)

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-b-0 hover:bg-transparent">
            <TableHead className="w-20 text-xs tracking-widest uppercase text-muted-foreground font-semibold py-4 pl-6">Rang</TableHead>
            <TableHead className="w-1/2 text-xs tracking-widest uppercase text-muted-foreground font-semibold">Joueur</TableHead>
            <TableHead className="text-xs tracking-widest uppercase text-muted-foreground font-semibold text-center">Victoires</TableHead>
            <TableHead className="text-xs tracking-widest uppercase text-muted-foreground font-semibold text-center">Défaites</TableHead>
            <TableHead className="text-xs tracking-widest uppercase text-muted-foreground font-semibold text-center">Total Matchs</TableHead>
            <TableHead className="text-xs tracking-widest uppercase text-muted-foreground font-semibold text-center">Ratio</TableHead>
            <TableHead className="text-xs tracking-widest uppercase text-muted-foreground font-semibold text-center">Wilson</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visible.length === 0
            ? Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i} className="h-16">
                  <TableCell className="pl-6 w-20"><div className="h-4 w-6 rounded bg-muted animate-pulse" /></TableCell>
                  <TableCell className="w-1/2">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-muted animate-pulse ring-2 ring-background" />
                      <div className="h-4 w-32 rounded bg-muted animate-pulse" />
                    </div>
                  </TableCell>
                  <TableCell className="text-center"><div className="h-4 w-6 rounded bg-muted animate-pulse mx-auto" /></TableCell>
                  <TableCell className="text-center"><div className="h-4 w-6 rounded bg-muted animate-pulse mx-auto" /></TableCell>
                  <TableCell className="text-center"><div className="h-4 w-6 rounded bg-muted animate-pulse mx-auto" /></TableCell>
                  <TableCell className="text-center"><div className="h-4 w-12 rounded bg-muted animate-pulse mx-auto" /></TableCell>
                  <TableCell className="text-center"><div className="h-6 w-14 rounded-full bg-muted animate-pulse mx-auto" /></TableCell>
                </TableRow>
              ))
            : visible.map((stats, i) => (
                <PlayerRow key={stats.player.id} stats={stats} rank={i + 1} />
              ))
          }
        </TableBody>
      </Table>

      {playerStats.length > PAGE_SIZE && (
        <button
          onClick={() => setShowAll(v => !v)}
          className="w-full border-t border-border py-4 flex items-center justify-center gap-2 text-sm font-semibold tracking-widest uppercase text-primary hover:bg-muted/50 transition-colors"
        >
          {showAll ? "Voir moins de joueurs" : "Voir plus de joueurs"}
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${showAll ? "rotate-180" : ""}`}><path d="m6 9 6 6 6-6"/></svg>
        </button>
      )}
    </div>
  )
}
