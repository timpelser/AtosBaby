"use client"

import { useState } from "react"
import { DUO_STATS } from "@/lib/dummy-data"
import type { DuoStats } from "@/lib/types"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

function getInitials(first: string, last: string) {
  return `${first[0]}${last[0]}`.toUpperCase()
}

function RatioBadge({ rate }: { rate: number }) {
  const color =
    rate >= 70 ? "bg-primary/10 text-primary" :
    rate >= 50 ? "bg-orange-100 text-orange-500 dark:bg-orange-900/20 dark:text-orange-400" :
    "bg-red-100 text-red-500 dark:bg-red-900/20 dark:text-red-400"
  return (
    <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${color}`}>
      {rate.toFixed(1)}%
    </span>
  )
}

function DuoRow({ duo, rank }: { duo: DuoStats; rank: number }) {
  const rankLabel = String(rank).padStart(2, "0")

  return (
    <TableRow className="h-16">
      <TableCell className="font-bold text-foreground text-base pl-6 w-20">{rankLabel}</TableCell>
      <TableCell className="w-1/2">
        <div className="flex items-center gap-3">
          <div className="flex shrink-0">
            <div className="w-9 h-9 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-semibold z-10 ring-2 ring-background">
              {getInitials(duo.player_a.first_name, duo.player_a.last_name)}
            </div>
            <div className="w-9 h-9 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs font-semibold -ml-2 ring-2 ring-background">
              {getInitials(duo.player_b.first_name, duo.player_b.last_name)}
            </div>
          </div>
          <span className="font-semibold text-foreground">
            {duo.player_a.first_name} {duo.player_a.last_name}
            <span className="text-muted-foreground font-normal mx-1">/</span>
            {duo.player_b.first_name} {duo.player_b.last_name}
          </span>
        </div>
      </TableCell>
      <TableCell className="text-foreground text-center">{duo.wins}</TableCell>
      <TableCell className="text-muted-foreground text-center">{duo.losses}</TableCell>
      <TableCell className="text-foreground text-center">{duo.matches_played}</TableCell>
      <TableCell className="text-center">
        <RatioBadge rate={duo.win_rate} />
      </TableCell>
    </TableRow>
  )
}

const PAGE_SIZE = 7

export function DuoRankingsTable() {
  const [showAll, setShowAll] = useState(false)
  const rows = DUO_STATS.slice(3)
  const visible = showAll ? rows : rows.slice(0, PAGE_SIZE)

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-b-0 hover:bg-transparent">
            <TableHead className="w-20 text-xs tracking-widest uppercase text-muted-foreground font-semibold py-4 pl-6">Rang</TableHead>
            <TableHead className="w-1/2 text-xs tracking-widest uppercase text-muted-foreground font-semibold">Duo</TableHead>
            <TableHead className="text-xs tracking-widest uppercase text-muted-foreground font-semibold text-center">Victoires</TableHead>
            <TableHead className="text-xs tracking-widest uppercase text-muted-foreground font-semibold text-center">Défaites</TableHead>
            <TableHead className="text-xs tracking-widest uppercase text-muted-foreground font-semibold text-center">Total Matchs</TableHead>
            <TableHead className="text-xs tracking-widest uppercase text-muted-foreground font-semibold text-center">Ratio</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visible.map((duo, i) => (
            <DuoRow key={`${duo.player_a.id}-${duo.player_b.id}`} duo={duo} rank={i + 4} />
          ))}
        </TableBody>
      </Table>

      {rows.length > PAGE_SIZE && (
        <button
          onClick={() => setShowAll(v => !v)}
          className="w-full border-t border-border py-4 flex items-center justify-center gap-2 text-sm font-semibold tracking-widest uppercase text-primary hover:bg-muted/50 transition-colors"
        >
          {showAll ? "Voir moins de duos" : "Voir plus de duos"}
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${showAll ? "rotate-180" : ""}`}><path d="m6 9 6 6 6-6"/></svg>
        </button>
      )}
    </div>
  )
}
