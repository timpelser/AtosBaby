"use client"

import { useState } from "react"
import type { Match } from "@/lib/types"
import { useAdmin } from "@/components/admin-context"
import { deleteMatch } from "@/lib/actions"
import { Trash2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
}

function EloDelta({ before, after }: { before: number | null; after: number | null }) {
  if (before == null || after == null) return null
  const delta = after - before
  const color = delta > 0 ? "text-green-600" : delta < 0 ? "text-red-500" : "text-muted-foreground"
  return (
    <span className={`text-xs font-semibold ${color}`}>
      {delta > 0 ? "+" : ""}{delta}
    </span>
  )
}

function TeamPlayers({ match, team }: { match: Match; team: "a" | "b" }) {
  const players = team === "a" ? match.team_a : match.team_b
  const won = team === "a"
    ? match.score_team_a > match.score_team_b
    : match.score_team_b > match.score_team_a

  const attacker = players.find((p) => p.position === "attack")!
  const defender = players.find((p) => p.position === "defense")!

  const labelColor = won
    ? team === "a" ? "text-primary" : "text-orange-500"
    : "text-muted-foreground"

  return (
    <div className="flex items-start">
      {[attacker, defender].map((mp) => (
        <div key={mp.player.id} className="w-32">
          <p className={`font-bold text-sm ${won ? "text-foreground" : "text-muted-foreground"}`}>
            {mp.player.first_name} {mp.player.last_name}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <p className={`text-xs font-semibold tracking-widest uppercase ${labelColor}`}>
              {mp.position === "attack" ? "Attaque" : "Défense"}
            </p>
            <EloDelta before={mp.elo_before} after={mp.elo_after} />
          </div>
        </div>
      ))}
    </div>
  )
}

function Score({ match }: { match: Match }) {
  const teamAWon = match.score_team_a > match.score_team_b
  return (
    <div className="flex items-center gap-3">
      <span className={`w-10 h-10 flex items-center justify-center rounded-lg text-lg font-bold ${teamAWon ? "bg-primary text-white" : "text-foreground"}`}>
        {match.score_team_a}
      </span>
      <span className="text-muted-foreground text-sm">-</span>
      <span className={`w-10 h-10 flex items-center justify-center rounded-lg text-lg font-bold ${!teamAWon ? "bg-orange-500 text-white" : "text-foreground"}`}>
        {match.score_team_b}
      </span>
    </div>
  )
}

function DeleteMatchDialog({ match, onClose }: { match: Match; onClose: () => void }) {
  const { adminPassword } = useAdmin()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(false)

  async function handleConfirm() {
    setPending(true)
    setError(false)
    try {
      await deleteMatch(match.id, adminPassword)
      onClose()
    } catch {
      setError(true)
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Supprimer ce match ?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground py-2">
          Êtes-vous sûr de vouloir supprimer ce match ? Cette action est irréversible.
        </p>
        {error && <p className="text-xs text-destructive">Une erreur est survenue. Vérifiez vos droits admin.</p>}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>Annuler</Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={pending}>
            {pending ? "Suppression…" : "Supprimer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const headCls = "text-xs tracking-widest uppercase text-muted-foreground font-semibold"
const PAGE_SIZE = 7

export function LatestMatches({ matches }: { matches: Match[] }) {
  const { isAdmin } = useAdmin()
  const [showAll, setShowAll] = useState(false)
  const [matchToDelete, setMatchToDelete] = useState<Match | null>(null)
  const visible = showAll ? matches : matches.slice(0, PAGE_SIZE)

  return (
    <>
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {/* Header */}
        <div className="flex items-center border-b border-border py-4 px-6">
          <div className="w-44 shrink-0">
            <span className={headCls}>Date</span>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <div className="w-64">
              <span className={headCls}>Équipe A (Attaque / Défense)</span>
            </div>
          </div>
          <div className="w-40 shrink-0 flex justify-center">
            <span className={headCls}>Score</span>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <div className="w-64">
              <span className={headCls}>Équipe B (Attaque / Défense)</span>
            </div>
          </div>
          <div className="w-44 shrink-0" />
        </div>

        {/* Skeleton rows */}
        {visible.length === 0 && Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className={`flex items-center py-5 px-6 ${i < 4 ? "border-b border-border" : ""}`}>
            <div className="w-44 shrink-0"><div className="h-4 w-24 rounded bg-muted animate-pulse" /></div>
            <div className="flex-1 flex justify-center">
              <div className="w-64 flex flex-col gap-2">
                <div className="h-4 w-36 rounded bg-muted animate-pulse" />
                <div className="h-3 w-20 rounded bg-muted animate-pulse" />
                <div className="h-4 w-32 rounded bg-muted animate-pulse" />
                <div className="h-3 w-20 rounded bg-muted animate-pulse" />
              </div>
            </div>
            <div className="w-40 shrink-0 flex justify-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted animate-pulse" />
                <span className="text-muted-foreground text-sm">-</span>
                <div className="w-10 h-10 rounded-lg bg-muted animate-pulse" />
              </div>
            </div>
            <div className="flex-1 flex justify-center">
              <div className="w-64 flex flex-col gap-2">
                <div className="h-4 w-36 rounded bg-muted animate-pulse" />
                <div className="h-3 w-20 rounded bg-muted animate-pulse" />
                <div className="h-4 w-32 rounded bg-muted animate-pulse" />
                <div className="h-3 w-20 rounded bg-muted animate-pulse" />
              </div>
            </div>
            <div className="w-44 shrink-0" />
          </div>
        ))}

        {/* Rows */}
        {visible.map((match, i) => (
          <div key={match.id} className={`flex items-center py-5 px-6 hover:bg-muted/30 transition-colors ${i < visible.length - 1 || !matches.length ? "border-b border-border" : ""}`}>
            <div className="w-44 shrink-0 text-sm text-muted-foreground">
              {formatDate(match.played_at)}
            </div>
            <div className="flex-1 flex justify-center">
              <div className="w-64">
                <TeamPlayers match={match} team="a" />
              </div>
            </div>
            <div className="w-40 shrink-0 flex justify-center">
              <Score match={match} />
            </div>
            <div className="flex-1 flex justify-center">
              <div className="w-64">
                <TeamPlayers match={match} team="b" />
              </div>
            </div>
            <div className="w-44 shrink-0 flex justify-end">
              {isAdmin && (
                <button
                  onClick={() => setMatchToDelete(match)}
                  className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  title="Supprimer ce match"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>
        ))}

        {matches.length > PAGE_SIZE && (
          <button
            onClick={() => setShowAll(v => !v)}
            className="w-full border-t border-border py-4 flex items-center justify-center gap-2 text-sm font-semibold tracking-widest uppercase text-primary hover:bg-muted/50 transition-colors"
          >
            {showAll ? "Voir moins de matchs" : "Voir plus de matchs"}
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${showAll ? "rotate-180" : ""}`}><path d="m6 9 6 6 6-6"/></svg>
          </button>
        )}
      </div>

      {matchToDelete && (
        <DeleteMatchDialog match={matchToDelete} onClose={() => setMatchToDelete(null)} />
      )}
    </>
  )
}
