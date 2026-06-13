"use client"

import { useState } from "react"
import type { PlayerStats } from "@/lib/types"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

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
        <EloBadge elo={stats.elo} />
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
            <TableHead className="text-xs tracking-widest uppercase text-muted-foreground font-semibold text-center">
              <span className="inline-flex items-center justify-center gap-1">
                ELO
                <EloInfoDialog />
              </span>
            </TableHead>
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
