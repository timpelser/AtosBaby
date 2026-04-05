"use client"

import { useState } from "react"
import { MATCHES } from "@/lib/dummy-data"
import type { Match } from "@/lib/types"

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
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
          <p className={`text-xs font-semibold tracking-widest uppercase mt-0.5 ${labelColor}`}>
            {mp.position === "attack" ? "Attaque" : "Défense"}
          </p>
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

const headCls = "text-xs tracking-widest uppercase text-muted-foreground font-semibold"
const PAGE_SIZE = 7

export function LatestMatches() {
  const [showAll, setShowAll] = useState(false)
  const visible = showAll ? MATCHES : MATCHES.slice(0, PAGE_SIZE)

  return (
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

      {/* Rows */}
      {visible.map((match, i) => (
        <div key={match.id} className={`flex items-center py-5 px-6 hover:bg-muted/30 transition-colors ${i < visible.length - 1 || !MATCHES.length ? "border-b border-border" : ""}`}>
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
          <div className="w-44 shrink-0" />
        </div>
      ))}

      {MATCHES.length > PAGE_SIZE && (
        <button
          onClick={() => setShowAll(v => !v)}
          className="w-full border-t border-border py-4 flex items-center justify-center gap-2 text-sm font-semibold tracking-widest uppercase text-primary hover:bg-muted/50 transition-colors"
        >
          {showAll ? "Voir moins de matchs" : "Voir plus de matchs"}
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${showAll ? "rotate-180" : ""}`}><path d="m6 9 6 6 6-6"/></svg>
        </button>
      )}
    </div>
  )
}
