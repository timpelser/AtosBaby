"use client"

import { useState } from "react"
import type { PlayerStats, Match } from "@/lib/types"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { PlayerProfileDialog } from "@/components/player-profile-dialog"
import { getStreakInfo } from "@/lib/streaks"
import { StreakBadge, TierParticles, getTierStyle } from "@/components/stats/streak-tier"
import { cn } from "@/lib/utils"

function EloInfoDialog() {
  return (
    <Dialog>
      <DialogTrigger
        aria-label="Comment fonctionne le score ELO ?"
        className="inline-flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
        </svg>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Classement ELO</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <p className="text-muted-foreground">
            Le score ELO tient compte de la force de vos adversaires. Battre une équipe forte rapporte plus de points que battre une équipe faible — et perdre contre eux coûte peu.
          </p>
          <div>
            <p className="font-semibold text-foreground mb-2">Formule</p>
            <div className="rounded-lg bg-muted px-4 py-3 space-y-1 font-mono text-xs">
              <p>moy. équipe = (ELO₁ + ELO₂) / 2</p>
              <p>résultat = 1 (victoire) ou 0 (défaite)</p>
              <p>K = 64 pour les 10 premières parties, puis 32</p>
              <p>E = 1 / (1 + 10^((moy. adverse − moy. équipe) / 400))</p>
              <p>ELO += K × (résultat − E)</p>
            </div>
          </div>
          <div>
            <p className="font-semibold text-foreground mb-2">Exemple</p>
            <div className="rounded-lg border border-border px-4 py-3 space-y-2 text-xs">
              <p className="text-muted-foreground">
                Alice <span className="text-foreground">(1200)</span> + Bob <span className="text-foreground">(1000)</span>
                <span className="mx-1.5 font-semibold text-foreground">vs</span>
                Carlos <span className="text-foreground">(900)</span> + Dana <span className="text-foreground">(800)</span>
              </p>
              <p className="text-muted-foreground">
                Moy. A : <span className="text-foreground font-medium">1100</span> · Moy. B : <span className="text-foreground font-medium">850</span>
                <span className="mx-1.5">→</span>
                Victoire A attendue : <span className="text-foreground font-semibold">81%</span>
              </p>
              <div className="border-t border-border pt-2 space-y-1">
                <p>
                  <span className="text-green-600 font-semibold">Si A gagne</span>
                  <span className="text-muted-foreground mx-1">→</span>
                  Alice & Bob <span className="text-green-600 font-semibold">+6 pts</span> chacun
                </p>
                <p>
                  <span className="text-orange-500 font-semibold">Si B gagne</span>
                  <span className="text-muted-foreground mx-1">→</span>
                  Carlos & Dana <span className="text-green-600 font-semibold">+26 pts</span> · Alice & Bob <span className="text-red-500 font-semibold">−26 pts</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function EloBadge({ elo }: { elo: number }) {
  const color =
    elo >= 1200 ? "bg-green-100 text-green-600" :
    elo >= 1100 ? "bg-primary/10 text-primary" :
    elo >= 900  ? "bg-muted text-muted-foreground" :
    elo >= 800  ? "bg-orange-100 text-orange-500" :
                  "bg-red-100 text-red-500"
  return (
    <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${color}`}>
      {elo}
    </span>
  )
}

function PlayerStatsDialog({ stats, rank, open, onClose }: { stats: PlayerStats; rank: number; open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-base font-bold">
            #{String(rank).padStart(2, "0")} — {stats.player.first_name} {stats.player.last_name}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col divide-y divide-border pt-2 pb-2">
          <div className="flex items-center justify-between py-3">
            <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Victoires</p>
            <p className="text-2xl font-bold text-foreground">{stats.wins}</p>
          </div>
          <div className="flex items-center justify-between py-3">
            <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Défaites</p>
            <p className="text-2xl font-bold text-foreground">{stats.losses}</p>
          </div>
          <div className="flex items-center justify-between py-3">
            <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Total matchs</p>
            <p className="text-2xl font-bold text-foreground">{stats.matches_played}</p>
          </div>
          <div className="flex items-center justify-between py-3">
            <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Ratio</p>
            <span className="inline-block px-3 py-1 rounded-full text-sm font-semibold bg-muted text-muted-foreground">
              {stats.win_rate.toFixed(1)}%
            </span>
          </div>
          <div className="flex items-center justify-between py-3">
            <span className="inline-flex items-center gap-1.5">
              <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">ELO</p>
              <EloInfoDialog />
            </span>
            <EloBadge elo={stats.elo} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

const PAGE_SIZE = 7

export function PlayerRankingsTableMobile({ playerStats, matches, streaks }: { playerStats: PlayerStats[]; matches: Match[]; streaks: Record<string, number> }) {
  const [showAll, setShowAll] = useState(false)
  const [selected, setSelected] = useState<{ stats: PlayerStats; rank: number } | null>(null)

  const visible = showAll ? playerStats : playerStats.slice(0, PAGE_SIZE)

  return (
    <>
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {/* Header */}
        <div className="flex border-b border-border px-4 py-3">
          <span className="w-12 text-xs font-semibold tracking-widest uppercase text-muted-foreground">Rang</span>
          <span className="flex-1 text-xs font-semibold tracking-widest uppercase text-muted-foreground">Joueur</span>
        </div>

        {/* Rows */}
        {visible.length === 0 && Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className={`flex items-center px-4 h-14 ${i < 4 ? "border-b border-border" : ""}`}>
            <div className="w-12 h-4 rounded bg-muted animate-pulse mr-2" />
            <div className="flex-1 h-4 rounded bg-muted animate-pulse" />
          </div>
        ))}
        {visible.map((stats, i) => {
          const rank = i + 1
          const streak = streaks[stats.player.id] ?? 0
          const info = getStreakInfo(streak)
          const tier = getTierStyle(info)
          return (
            <button
              key={stats.player.id}
              onClick={() => setSelected({ stats, rank })}
              className={cn(
                "relative w-full flex items-center gap-2 px-4 h-14 text-left transition-colors",
                tier
                  ? tier.container
                  : cn("hover:bg-muted/50 active:bg-muted", i < visible.length - 1 && "border-b border-border")
              )}
            >
              {tier && <TierParticles info={info} />}
              <span className={cn("w-10 font-bold text-sm shrink-0", tier?.lightText ?? "text-foreground")}>{String(rank).padStart(2, "0")}</span>
              <span className={cn("flex-1 font-semibold text-sm truncate", tier?.lightText ?? "text-foreground")}>
                {stats.player.first_name} {stats.player.last_name}
              </span>
              <StreakBadge streak={streak} />
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cn("shrink-0", tier?.lightText ?? "text-muted-foreground")}><path d="m9 18 6-6-6-6"/></svg>
            </button>
          )
        })}

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

      {selected && (() => {
        const playerMatches = matches.filter(m =>
          [...m.team_a, ...m.team_b].some(mp => mp.player.id === selected.stats.player.id)
        )
        return (
          <PlayerProfileDialog
            stats={selected.stats}
            rank={selected.rank}
            playerMatches={playerMatches}
            open={true}
            onClose={() => setSelected(null)}
          />
        )
      })()}
    </>
  )
}
