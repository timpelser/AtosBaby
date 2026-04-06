"use client"

import { useState } from "react"
import type { DuoStats } from "@/lib/types"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

function RatioBadge({ rate }: { rate: number }) {
  const color =
    rate >= 70 ? "bg-primary/10 text-primary" :
    rate >= 50 ? "bg-orange-100 text-orange-500" :
    "bg-red-100 text-red-500"
  return (
    <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${color}`}>
      {rate.toFixed(1)}%
    </span>
  )
}

function DuoStatsDialog({ duo, rank, open, onClose }: { duo: DuoStats; rank: number; open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-base font-bold">
            #{String(rank).padStart(2, "0")} — {duo.player_a.first_name} {duo.player_a.last_name} / {duo.player_b.first_name} {duo.player_b.last_name}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col divide-y divide-border pt-2 pb-2">
          <div className="flex items-center justify-between py-3">
            <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Victoires</p>
            <p className="text-2xl font-bold text-foreground">{duo.wins}</p>
          </div>
          <div className="flex items-center justify-between py-3">
            <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Défaites</p>
            <p className="text-2xl font-bold text-foreground">{duo.losses}</p>
          </div>
          <div className="flex items-center justify-between py-3">
            <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Total matchs</p>
            <p className="text-2xl font-bold text-foreground">{duo.matches_played}</p>
          </div>
          <div className="flex items-center justify-between py-3">
            <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Ratio</p>
            <RatioBadge rate={duo.win_rate} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

const PAGE_SIZE = 7

export function DuoRankingsTableMobile({ duoStats }: { duoStats: DuoStats[] }) {
  const [showAll, setShowAll] = useState(false)
  const [selected, setSelected] = useState<{ duo: DuoStats; rank: number } | null>(null)

  const rows = duoStats.slice(3)
  const visible = showAll ? rows : rows.slice(0, PAGE_SIZE)

  return (
    <>
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {/* Header */}
        <div className="flex border-b border-border px-4 py-3">
          <span className="w-12 text-xs font-semibold tracking-widest uppercase text-muted-foreground">Rang</span>
          <span className="flex-1 text-xs font-semibold tracking-widest uppercase text-muted-foreground">Duo</span>
        </div>

        {/* Rows */}
        {visible.length === 0 && Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className={`flex items-center px-4 h-14 ${i < 4 ? "border-b border-border" : ""}`}>
            <div className="w-12 h-4 rounded bg-muted animate-pulse mr-2" />
            <div className="flex-1 h-4 rounded bg-muted animate-pulse" />
          </div>
        ))}
        {visible.map((duo, i) => {
          const rank = i + 4
          return (
            <button
              key={`${duo.player_a.id}-${duo.player_b.id}`}
              onClick={() => setSelected({ duo, rank })}
              className={`w-full flex items-center px-4 h-14 hover:bg-muted/50 active:bg-muted transition-colors text-left ${i < visible.length - 1 ? "border-b border-border" : ""}`}
            >
              <span className="w-12 font-bold text-foreground text-sm">{String(rank).padStart(2, "0")}</span>
              <span className="flex-1 font-semibold text-foreground text-sm truncate">
                {duo.player_a.first_name} {duo.player_a.last_name}
                <span className="text-muted-foreground font-normal mx-1">/</span>
                {duo.player_b.first_name} {duo.player_b.last_name}
              </span>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground shrink-0"><path d="m9 18 6-6-6-6"/></svg>
            </button>
          )
        })}

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

      {selected && (
        <DuoStatsDialog
          duo={selected.duo}
          rank={selected.rank}
          open={true}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  )
}
