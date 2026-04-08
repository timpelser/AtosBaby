"use client"

import { useState } from "react"
import type { Match } from "@/lib/types"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useAdmin } from "@/components/admin-context"
import { deleteMatch } from "@/lib/actions"
import { Trash2 } from "lucide-react"

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
}

function MatchDialog({ match, open, onClose }: { match: Match; open: boolean; onClose: () => void }) {
  const { isAdmin } = useAdmin()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const teamAWon = match.score_team_a > match.score_team_b

  const renderTeam = (team: "a" | "b") => {
    const players = team === "a" ? match.team_a : match.team_b
    const won = team === "a" ? teamAWon : !teamAWon
    const label = team === "a" ? "Équipe A" : "Équipe B"
    const winColor = team === "a" ? "text-primary" : "text-orange-500"
    const attacker = players.find(p => p.position === "attack")!
    const defender = players.find(p => p.position === "defense")!

    return (
      <div>
        <p className={`text-xs font-semibold tracking-widest uppercase mb-2 ${won ? winColor : "text-muted-foreground"}`}>
          {label}{won ? " · Victoire" : ""}
        </p>
        <div className="flex flex-col gap-1">
          {[attacker, defender].map(mp => (
            <div key={mp.player.id} className="flex items-center justify-between">
              <span className={`text-sm font-semibold ${won ? "text-foreground" : "text-muted-foreground"}`}>
                {mp.player.first_name} {mp.player.last_name}
              </span>
              <span className={`text-xs font-semibold tracking-widest uppercase ${won ? winColor : "text-muted-foreground"}`}>
                {mp.position === "attack" ? "Attaque" : "Défense"}
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (confirmDelete) {
    return <DeleteMatchDialog match={match} onClose={() => { setConfirmDelete(false); onClose() }} />
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold text-muted-foreground">{formatDate(match.played_at)}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col divide-y divide-border">
          <div className="pb-4">{renderTeam("a")}</div>
          <div className="py-4 flex items-center justify-center gap-4">
            <span className={`w-10 h-10 flex items-center justify-center rounded-lg text-lg font-bold ${teamAWon ? "bg-primary text-white" : "text-foreground"}`}>
              {match.score_team_a}
            </span>
            <span className="text-muted-foreground text-sm">-</span>
            <span className={`w-10 h-10 flex items-center justify-center rounded-lg text-lg font-bold ${!teamAWon ? "bg-orange-500 text-white" : "text-foreground"}`}>
              {match.score_team_b}
            </span>
          </div>
          <div className="pt-4">{renderTeam("b")}</div>
        </div>
        {isAdmin && (
          <button
            onClick={() => setConfirmDelete(true)}
            className="mt-2 flex items-center justify-center gap-2 w-full py-2 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors"
          >
            <Trash2 size={14} />
            Supprimer ce match
          </button>
        )}
      </DialogContent>
    </Dialog>
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

export function LatestMatchesMobile({ matches }: { matches: Match[] }) {
  const [selected, setSelected] = useState<Match | null>(null)
  const [showAll, setShowAll] = useState(false)
  const visible = showAll ? matches : matches.slice(0, PAGE_SIZE)

  return (
    <>
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {/* Header */}
        <div className="flex items-center border-b border-border py-3 px-4">
          <span className={`flex-1 ${headCls}`}>Équipe A</span>
          <span className={`w-20 text-center ${headCls}`}>Score</span>
          <span className={`flex-1 text-right ${headCls}`}>Équipe B</span>
        </div>

        {/* Skeleton rows */}
        {visible.length === 0 && Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className={`flex items-center py-4 px-4 ${i < 4 ? "border-b border-border" : ""}`}>
            <div className="flex-1 flex flex-col gap-1.5">
              <div className="h-4 w-24 rounded bg-muted animate-pulse" />
              <div className="h-4 w-20 rounded bg-muted animate-pulse" />
            </div>
            <div className="w-20 flex items-center justify-center gap-1.5 shrink-0">
              <div className="w-8 h-8 rounded-md bg-muted animate-pulse" />
              <span className="text-muted-foreground text-xs">-</span>
              <div className="w-8 h-8 rounded-md bg-muted animate-pulse" />
            </div>
            <div className="flex-1 flex flex-col items-end gap-1.5">
              <div className="h-4 w-24 rounded bg-muted animate-pulse" />
              <div className="h-4 w-20 rounded bg-muted animate-pulse" />
            </div>
          </div>
        ))}

        {/* Rows */}
        {visible.map((match, i) => {
          const aWon = match.score_team_a > match.score_team_b
          return (
            <button
              key={match.id}
              onClick={() => setSelected(match)}
              className={`w-full flex items-center py-4 px-4 hover:bg-muted/50 active:bg-muted transition-colors text-left ${i < visible.length - 1 ? "border-b border-border" : ""}`}
            >
                {/* Team A */}
                <div className="flex-1 min-w-0">
                  {match.team_a.map(mp => (
                    <p key={mp.player.id} className={`text-sm truncate ${aWon ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                      {mp.player.first_name} {mp.player.last_name}
                    </p>
                  ))}
                </div>

                {/* Score */}
                <div className="w-20 flex items-center justify-center gap-1.5 shrink-0">
                  <span className={`w-8 h-8 flex items-center justify-center rounded-md text-sm font-bold ${aWon ? "bg-primary text-white" : "text-foreground"}`}>
                    {match.score_team_a}
                  </span>
                  <span className="text-muted-foreground text-xs">-</span>
                  <span className={`w-8 h-8 flex items-center justify-center rounded-md text-sm font-bold ${!aWon ? "bg-orange-500 text-white" : "text-foreground"}`}>
                    {match.score_team_b}
                  </span>
                </div>

                {/* Team B */}
                <div className="flex-1 min-w-0 text-right">
                  {match.team_b.map(mp => (
                    <p key={mp.player.id} className={`text-sm truncate ${!aWon ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                      {mp.player.first_name} {mp.player.last_name}
                    </p>
                  ))}
                </div>
            </button>
          )
        })}

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

      {selected && (
        <MatchDialog
          match={selected}
          open={true}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  )
}
