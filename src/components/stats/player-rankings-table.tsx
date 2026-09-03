"use client"

import { useState } from "react"
import type { PlayerStats, Match } from "@/lib/types"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { PlayerProfileDialog } from "@/components/player-profile-dialog"
import { getStreakInfo } from "@/lib/streaks"
import { StreakBadge, TierParticles, getTierStyle } from "@/components/stats/streak-tier"
import { cn } from "@/lib/utils"

function getInitials(first: string, last: string) {
  return `${first[0]}${last[0]}`.toUpperCase()
}

function EloBadge({ elo }: { elo: number }) {
  const color =
    elo >= 1200 ? "bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400" :
    elo >= 1100 ? "bg-primary/10 text-primary" :
    elo >= 900  ? "bg-muted text-muted-foreground" :
    elo >= 800  ? "bg-orange-100 text-orange-500 dark:bg-orange-900/20 dark:text-orange-400" :
                  "bg-red-100 text-red-500 dark:bg-red-900/20 dark:text-red-400"
  return (
    <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${color}`}>
      {elo}
    </span>
  )
}

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
            Le score ELO tient compte de la force de vos adversaires — et de votre propre niveau au sein de l&apos;équipe. Battre une équipe forte rapporte plus de points que battre une équipe faible, et à résultat égal, le joueur le moins bien classé de l&apos;équipe gagne (ou perd) plus de points que son coéquipier mieux classé.
          </p>

          <div>
            <p className="font-semibold text-foreground mb-2">Formule</p>
            <div className="rounded-lg bg-muted px-4 py-3 space-y-1 font-mono text-xs">
              <p>moy. adverse = (ELO adv. 1 + ELO adv. 2) / 2</p>
              <p>résultat = 1 (victoire) ou 0 (défaite)</p>
              <p>K = 94 pour les 10 premières parties, puis 64</p>
              <p>E = 1 / (1 + 10^((moy. adverse − votre ELO) / 400))</p>
              <p>ELO += K × (résultat − E)</p>
            </div>
          </div>

          <div>
            <p className="font-semibold text-foreground mb-2">Exemple</p>
            <div className="rounded-lg border border-border px-4 py-3 space-y-2 text-xs">
              <p className="text-muted-foreground">
                Alice <span className="text-foreground">(899)</span> + Bob <span className="text-foreground">(1135)</span>
                <span className="mx-1.5 font-semibold text-foreground">vs</span>
                Carlos <span className="text-foreground">(1197)</span> + Dana <span className="text-foreground">(796)</span>
              </p>
              <p className="text-muted-foreground">
                Moy. équipe A : <span className="text-foreground font-medium">1017</span> · Moy. équipe B : <span className="text-foreground font-medium">997</span>
              </p>
              <div className="border-t border-border pt-2 space-y-1">
                <p>
                  <span className="text-orange-500 font-semibold">Si B gagne</span>
                  <span className="text-muted-foreground mx-1">→</span>
                  Carlos <span className="text-green-600 font-semibold">+17</span> · Dana <span className="text-green-600 font-semibold">+50</span>
                </p>
                <p className="text-muted-foreground">
                  Même victoire, même équipe — mais Dana (796) était bien moins favorisée que Carlos (1197, déjà au-dessus de l&apos;adversaire), donc elle gagne plus.
                </p>
                <p>
                  <span className="text-muted-foreground">Côté perdant :</span> Alice <span className="text-red-500 font-semibold">−23</span> · Bob <span className="text-red-500 font-semibold">−44</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Shared column layout — header and every row (neutral or tiered) line up on
// this same grid so tiered rows can break out into rounded "cards" without
// losing column alignment with the rest of the table.
const GRID_COLS = "grid-cols-[48px_1fr_92px_92px_100px_84px_84px]"

function PlayerRow({ stats, rank, matches, streak, showDivider }: { stats: PlayerStats; rank: number; matches: Match[]; streak: number; showDivider: boolean }) {
  const rankLabel = String(rank).padStart(2, "0")
  const [open, setOpen] = useState(false)
  const playerMatches = matches.filter(m =>
    [...m.team_a, ...m.team_b].some(mp => mp.player.id === stats.player.id)
  )
  const info = getStreakInfo(streak)
  const tier = getTierStyle(info)

  return (
    <>
      <div
        data-testid="player-row"
        className={cn(
          "grid gap-4 items-center",
          GRID_COLS,
          tier ? cn("px-[18px] py-4", tier.container) : cn("px-6 py-4", showDivider && "border-b border-border")
        )}
      >
        {tier && <TierParticles info={info} />}

        <span className={cn("font-bold text-[15px]", tier?.lightText ?? "text-foreground")}>{rankLabel}</span>

        <div className="flex items-center gap-3 min-w-0 overflow-hidden">
          <button
            onClick={() => setOpen(true)}
            className={cn(
              "w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 hover:opacity-80 transition-opacity cursor-pointer",
              tier?.avatar ?? "bg-primary/15 text-primary ring-2 ring-background"
            )}
            aria-label={`Profil de ${stats.player.first_name} ${stats.player.last_name}`}
          >
            {getInitials(stats.player.first_name, stats.player.last_name)}
          </button>
          <span className={cn("font-bold text-[15px] flex-1 min-w-0 truncate", tier?.lightText ?? "text-foreground")}>
            {stats.player.first_name} {stats.player.last_name}
          </span>
          <StreakBadge streak={streak} />
        </div>

        <span className={cn("text-center font-bold text-[15px]", tier?.lightText ?? "text-foreground")}>{stats.wins}</span>
        <span className={cn("text-center text-[15px]", tier?.secondaryText ?? "text-muted-foreground")}>{stats.losses}</span>
        <span className={cn("text-center text-[15px]", tier?.lightText ?? "text-foreground")}>{stats.matches_played}</span>
        <span className={cn("text-center text-[15px]", tier?.lightText ?? "text-foreground")}>{stats.win_rate.toFixed(1)}%</span>

        <div className="flex justify-center">
          {tier?.eloPill ? (
            <span className={cn("inline-flex px-3 py-1 rounded-full font-bold text-[13px]", tier.eloPill)}>{stats.elo}</span>
          ) : (
            <EloBadge elo={stats.elo} />
          )}
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

const PAGE_SIZE = 7

export function PlayerRankingsTable({ playerStats, matches, streaks }: { playerStats: PlayerStats[]; matches: Match[]; streaks: Record<string, number> }) {
  const [showAll, setShowAll] = useState(false)
  const visible = showAll ? playerStats : playerStats.slice(0, PAGE_SIZE)

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className={cn("grid gap-4 items-center px-6 py-4 border-b border-border", GRID_COLS)}>
        <span className="text-xs tracking-widest uppercase text-muted-foreground font-semibold">Rang</span>
        <span className="text-xs tracking-widest uppercase text-muted-foreground font-semibold">Joueur</span>
        <span className="text-xs tracking-widest uppercase text-muted-foreground font-semibold text-center">Victoires</span>
        <span className="text-xs tracking-widest uppercase text-muted-foreground font-semibold text-center">Défaites</span>
        <span className="text-xs tracking-widest uppercase text-muted-foreground font-semibold text-center">Total Matchs</span>
        <span className="text-xs tracking-widest uppercase text-muted-foreground font-semibold text-center">Ratio</span>
        <span className="text-xs tracking-widest uppercase text-muted-foreground font-semibold text-center">
          <span className="inline-flex items-center justify-center gap-1">
            ELO
            <EloInfoDialog />
          </span>
        </span>
      </div>

      {/* Rows */}
      {visible.length === 0
        ? Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className={cn("grid gap-4 items-center px-6 py-4", GRID_COLS, i < 4 && "border-b border-border")}>
              <div className="h-4 w-6 rounded bg-muted animate-pulse" />
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-muted animate-pulse ring-2 ring-background" />
                <div className="h-4 w-32 rounded bg-muted animate-pulse" />
              </div>
              <div className="h-4 w-6 rounded bg-muted animate-pulse mx-auto" />
              <div className="h-4 w-6 rounded bg-muted animate-pulse mx-auto" />
              <div className="h-4 w-6 rounded bg-muted animate-pulse mx-auto" />
              <div className="h-4 w-12 rounded bg-muted animate-pulse mx-auto" />
              <div className="h-6 w-14 rounded-full bg-muted animate-pulse mx-auto" />
            </div>
          ))
        : visible.map((stats, i) => (
            <PlayerRow
              key={stats.player.id}
              stats={stats}
              rank={i + 1}
              matches={matches}
              streak={streaks[stats.player.id] ?? 0}
              showDivider={i < visible.length - 1}
            />
          ))
      }

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
