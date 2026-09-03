"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  XIcon, LockIcon,
  Flag, Footprints, Layers, ShieldCheck, Crown, Star, Trophy, Medal,
  Flame, Zap, Frown, Swords, ThumbsDown, Skull, Target, Heart, Mountain,
  TrendingDown, Gem, Shield, Crosshair, Repeat2, Users, RotateCcw, Award, Moon,
  type LucideIcon,
} from "lucide-react"
import type { Match, PlayerStats, EloHistoryPoint, RivalryStat } from "@/lib/types"
import type { BadgeStatus } from "@/lib/badges"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { getPlayerEloHistory, getPlayerRivalries, getPlayerBadges } from "@/lib/actions"

// ─── helpers ────────────────────────────────────────────────────────────────

function getInitials(first: string, last: string) {
  return `${first[0]}${last[0]}`.toUpperCase()
}

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
}

function longDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
}

// ─── ELO badge ──────────────────────────────────────────────────────────────

function EloBadge({ elo }: { elo: number }) {
  const color =
    elo >= 1200 ? "bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400" :
    elo >= 1100 ? "bg-primary/10 text-primary" :
    elo >= 900  ? "bg-muted text-muted-foreground" :
    elo >= 800  ? "bg-orange-100 text-orange-500 dark:bg-orange-900/20 dark:text-orange-400" :
                  "bg-red-100 text-red-500 dark:bg-red-900/20 dark:text-red-400"
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-sm font-bold ${color}`}>
      {elo}
    </span>
  )
}

// ─── ELO history chart (interactive SVG) ────────────────────────────────────

function EloChart({ history }: { history: EloHistoryPoint[] }) {
  const [hover, setHover] = useState<{ idx: number; x: number; y: number } | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  if (history.length < 2) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground text-sm text-center">
        Pas assez de données pour afficher l'historique.
      </div>
    )
  }

  const W = 440, H = 160
  const ML = 42, MR = 12, MT = 12, MB = 28
  const PW = W - ML - MR, PH = H - MT - MB

  const timestamps = history.map(h => new Date(h.played_at).getTime())
  const elos = history.map(h => h.elo_after)
  const tMin = timestamps[0], tMax = timestamps[timestamps.length - 1]
  const eMin = Math.min(...elos), eMax = Math.max(...elos)
  const eRange = Math.max(eMax - eMin, 50)
  const pad = Math.ceil(eRange * 0.18)
  const yMin = eMin - pad, yMax = eMax + pad

  const sx = (t: number) => ML + (t - tMin) / (tMax - tMin || 1) * PW
  const sy = (e: number) => MT + PH - (e - yMin) / (yMax - yMin) * PH

  const pts = history.map((h, i) => ({
    x: sx(timestamps[i]),
    y: sy(h.elo_after),
  }))

  const lineD = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ")
  const fillD = `${lineD} L${pts[pts.length - 1].x.toFixed(1)} ${(MT + PH).toFixed(1)} L${pts[0].x.toFixed(1)} ${(MT + PH).toFixed(1)} Z`

  // y-axis ticks
  const rawStep = (yMax - yMin) / 3
  const yStep = rawStep <= 25 ? 25 : rawStep <= 50 ? 50 : 100
  const yStart = Math.ceil(yMin / yStep) * yStep
  const yTicks: number[] = []
  for (let y = yStart; y <= yMax; y += yStep) yTicks.push(y)

  // x-axis date labels: first and last
  const xLabels = [
    { x: pts[0].x, label: shortDate(history[0].played_at) },
    { x: pts[pts.length - 1].x, label: shortDate(history[history.length - 1].played_at) },
  ]

  const current = elos[elos.length - 1]
  const baseline = 1000
  const trend = current - baseline
  const peak = Math.max(...elos)
  const peakIdx = elos.lastIndexOf(peak)
  const peakDate = history[peakIdx]?.played_at

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return
    const scaleX = W / rect.width
    const mouseX = (e.clientX - rect.left) * scaleX
    // find nearest point by x
    let closest = 0
    let minDist = Infinity
    pts.forEach((p, i) => {
      const d = Math.abs(p.x - mouseX)
      if (d < minDist) { minDist = d; closest = i }
    })
    setHover({ idx: closest, x: pts[closest].x, y: pts[closest].y })
  }

  const hoverPoint = hover !== null ? history[hover.idx] : null

  // tooltip positioning: flip to left if close to right edge
  const tooltipLeft = hover !== null && hover.x > W * 0.65

  return (
    <div>
      {/* Stat tiles */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-muted rounded-xl p-3 text-center flex flex-col items-center justify-center">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">ELO actuel</p>
          <p className="text-xl font-bold text-foreground">{current}</p>
        </div>
        <div className="bg-muted rounded-xl p-3 text-center flex flex-col items-center justify-center">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">Pic ELO</p>
          <p className="text-xl font-bold text-foreground">{peak}</p>
          <p className="text-xs text-muted-foreground">{peakDate ? shortDate(peakDate) : ""}</p>
        </div>
        <div className="bg-muted rounded-xl p-3 text-center flex flex-col items-center justify-center">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">Matchs</p>
          <p className="text-xl font-bold text-foreground">{history.length}</p>
          <p className="text-xs text-muted-foreground">enregistrés</p>
        </div>
      </div>

      {/* Chart */}
      <div className="relative select-none">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHover(null)}
        >
          {/* Grid lines + y labels */}
          {yTicks.map(y => (
            <g key={y}>
              <line x1={ML} y1={sy(y)} x2={ML + PW} y2={sy(y)} stroke="currentColor" strokeOpacity={0.07} strokeWidth={1} />
              <text x={ML - 6} y={sy(y)} textAnchor="end" dominantBaseline="middle" fontSize={9} fill="currentColor" fillOpacity={0.35}>{y}</text>
            </g>
          ))}

          {/* X-axis date labels */}
          {xLabels.map((l, i) => (
            <text
              key={i}
              x={l.x}
              y={MT + PH + 16}
              textAnchor={i === 0 ? "start" : "end"}
              fontSize={9}
              fill="currentColor"
              fillOpacity={0.35}
            >
              {l.label}
            </text>
          ))}

          {/* Area fill */}
          <path d={fillD} className="fill-sky-500" fillOpacity={0.08} />

          {/* Blue line */}
          <path d={lineD} className="stroke-sky-500" strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />

          {/* Start / end dots */}
          <circle cx={pts[0].x} cy={pts[0].y} r={3} className="fill-sky-500" opacity={0.6} />
          <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r={4} className="fill-sky-500" />

          {/* Decay event markers */}
          {history.map((h, i) => h.type === "decay" ? (
            <g key={`decay-${i}`}>
              <circle cx={pts[i].x} cy={pts[i].y} r={5} className="fill-red-500" opacity={0.15} />
              <circle cx={pts[i].x} cy={pts[i].y} r={3} className="fill-red-500" />
            </g>
          ) : null)}

          {/* Hover crosshair */}
          {hover !== null && (
            <g>
              <line
                x1={hover.x} y1={MT} x2={hover.x} y2={MT + PH}
                className="stroke-sky-500" strokeWidth={1} strokeDasharray="3 3" strokeOpacity={0.5}
              />
              <circle cx={hover.x} cy={hover.y} r={5} className="fill-sky-500" />
              <circle cx={hover.x} cy={hover.y} r={3} fill="white" />
            </g>
          )}
        </svg>

        {/* Tooltip */}
        {hover !== null && hoverPoint && (
          <div
            className="pointer-events-none absolute top-0 z-10"
            style={{
              left: tooltipLeft ? "auto" : `calc(${(hover.x / W) * 100}% + 8px)`,
              right: tooltipLeft ? `calc(${((W - hover.x) / W) * 100}% + 8px)` : "auto",
              top: `calc(${(hover.y / H) * 100}% - 28px)`,
            }}
          >
            <div className="bg-popover border border-border rounded-lg px-2.5 py-1.5 shadow-md text-xs whitespace-nowrap">
              <p className="font-bold text-foreground">{hoverPoint.elo_after}</p>
              <p className="text-muted-foreground">{shortDate(hoverPoint.played_at)}</p>
              {hoverPoint.type === "decay" && (
                <p className="text-red-500 font-semibold">−10 inactivité</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── H2H rivalry card ────────────────────────────────────────────────────────

function H2HCard({
  r,
  playerFirst,
  playerLast,
}: {
  r: RivalryStat
  playerFirst: string
  playerLast: string
}) {
  const wins = r.wins
  const losses = r.losses
  const total = r.matches_played

  // SVG arc for the win ratio ring
  const CX = 36, CY = 36, RADIUS = 30, STROKE = 5
  const circumference = 2 * Math.PI * RADIUS
  const winRatio = total > 0 ? wins / total : 0
  const winArc = circumference * winRatio
  const lossArc = circumference * (1 - winRatio)
  const GAP = total > 0 && wins > 0 && losses > 0 ? 2 : 0
  const pct = Math.round(winRatio * 100)

  return (
    <div className="rounded-xl border border-border bg-muted/30 p-4">
      <div className="flex items-center gap-3">
        {/* Player side */}
        <div className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
          <div className="w-9 h-9 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-bold ring-2 ring-background shrink-0">
            {getInitials(playerFirst, playerLast)}
          </div>
          <p className="text-[11px] font-semibold text-foreground text-center leading-tight w-full truncate">
            {playerFirst} {playerLast}
          </p>
          <p className="text-3xl font-black text-green-600">{wins}</p>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Victoires</p>
        </div>

        {/* Center ring with percentage */}
        <div className="flex flex-col items-center gap-1 shrink-0">
          <svg width={72} height={72} viewBox="0 0 72 72">
            {/* Background ring */}
            <circle cx={CX} cy={CY} r={RADIUS} fill="none" stroke="currentColor" strokeOpacity={0.08} strokeWidth={STROKE} />
            {/* Win arc (green) */}
            {wins > 0 && (
              <circle
                cx={CX} cy={CY} r={RADIUS}
                fill="none"
                className="stroke-green-600"
                strokeWidth={STROKE}
                strokeDasharray={`${winArc - GAP} ${circumference - winArc + GAP}`}
                strokeLinecap="round"
                style={{ transform: "rotate(-90deg)", transformOrigin: "center" }}
              />
            )}
            {/* Loss arc (red) */}
            {losses > 0 && (
              <circle
                cx={CX} cy={CY} r={RADIUS}
                fill="none"
                className="stroke-red-500"
                strokeWidth={STROKE}
                strokeDasharray={`${lossArc - GAP} ${circumference - lossArc + GAP}`}
                strokeLinecap="round"
                style={{ transform: `rotate(${-90 + 360 * winRatio}deg)`, transformOrigin: "center" }}
              />
            )}
            {/* Percentage label */}
            <text
              x={CX} y={CY + 1}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={13}
              fontWeight="700"
              className={pct >= 50 ? "fill-green-600" : "fill-red-500"}
            >
              {pct}%
            </text>
          </svg>
          <p className="text-[10px] text-muted-foreground font-semibold">{total} matchs</p>
        </div>

        {/* Opponent side */}
        <div className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
          <div className="w-9 h-9 rounded-full bg-muted border border-border text-muted-foreground flex items-center justify-center text-xs font-bold shrink-0">
            {getInitials(r.opponent.first_name, r.opponent.last_name)}
          </div>
          <p className="text-[11px] font-semibold text-foreground text-center leading-tight w-full truncate">
            {r.opponent.first_name} {r.opponent.last_name}
          </p>
          <p className="text-3xl font-black text-red-500">{losses}</p>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Défaites</p>
        </div>
      </div>
    </div>
  )
}

// ─── Rivalries tab ──────────────────────────────────────────────────────────

function RivalriesTab({
  rivalries,
  loading,
  playerFirst,
  playerLast,
}: {
  rivalries: RivalryStat[] | null
  loading: boolean
  playerFirst: string
  playerLast: string
}) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="rounded-xl border border-border bg-muted/30 p-4">
            <div className="flex items-center gap-3">
              <div className="flex-1 flex flex-col items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-muted animate-pulse" />
                <div className="h-3 w-12 rounded bg-muted animate-pulse" />
                <div className="h-8 w-8 rounded bg-muted animate-pulse" />
              </div>
              <div className="w-12 h-12 rounded-full bg-muted animate-pulse shrink-0" />
              <div className="flex-1 flex flex-col items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-muted animate-pulse" />
                <div className="h-3 w-12 rounded bg-muted animate-pulse" />
                <div className="h-8 w-8 rounded bg-muted animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!rivalries || rivalries.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
        Pas encore de rivalités.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {rivalries.map((r) => (
        <H2HCard key={r.opponent.id} r={r} playerFirst={playerFirst} playerLast={playerLast} />
      ))}
    </div>
  )
}

// ─── Inline match detail ─────────────────────────────────────────────────────

function MatchDetail({ match, onBack }: { match: Match; onBack: () => void }) {
  const teamAWon = match.score_team_a > match.score_team_b

  const renderTeam = (team: "a" | "b") => {
    const players = team === "a" ? match.team_a : match.team_b
    const won = team === "a" ? teamAWon : !teamAWon
    const label = team === "a" ? "Équipe A" : "Équipe B"
    const color = team === "a" ? "text-primary" : "text-orange-500"
    const attacker = players.find(p => p.position === "attack")!
    const defender = players.find(p => p.position === "defense")!

    return (
      <div className="space-y-3">
        <p className={`text-xs font-semibold tracking-widest uppercase ${won ? color : "text-muted-foreground"}`}>{label}</p>
        {[attacker, defender].map(mp => (
          <div key={mp.player.id} className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-bold truncate ${won ? "text-foreground" : "text-muted-foreground"}`}>
                {mp.player.first_name} {mp.player.last_name}
              </p>
              <p className={`text-xs font-semibold tracking-widest uppercase ${won ? color : "text-muted-foreground"}`}>
                {mp.position === "attack" ? "Attaque" : "Défense"}
              </p>
            </div>
            {mp.elo_before != null && mp.elo_after != null && (
              <div className="flex items-center gap-2 shrink-0">
                <div className="text-center">
                  <p className="text-[10px] text-muted-foreground">avant</p>
                  <p className="text-sm font-semibold text-foreground">{mp.elo_before}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-muted-foreground">après</p>
                  <p className="text-sm font-semibold text-foreground">{mp.elo_after}</p>
                </div>
                {(() => {
                  const delta = mp.elo_after - mp.elo_before
                  if (delta === 0) return <span className="px-1.5 py-0.5 rounded text-xs font-bold bg-muted text-muted-foreground">±0</span>
                  const cls = delta > 0 ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"
                  return <span className={`flex items-center px-1.5 py-0.5 rounded text-xs font-bold ${cls}`}>{delta > 0 ? `+${delta}` : delta}</span>
                })()}
              </div>
            )}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        Retour aux matchs
      </button>
      <p className="text-xs text-muted-foreground mb-3">{longDate(match.played_at)}</p>
      <div className="flex items-center justify-center gap-8 mb-5">
        <div className="text-center">
          <p className={`text-[11px] font-semibold tracking-wide uppercase mb-1 ${teamAWon ? "text-primary" : "text-muted-foreground"}`}>Équipe A</p>
          <span className="text-4xl font-black text-foreground">{match.score_team_a}</span>
        </div>
        <span className="text-lg text-muted-foreground">-</span>
        <div className="text-center">
          <p className={`text-[11px] font-semibold tracking-wide uppercase mb-1 ${!teamAWon ? "text-orange-500" : "text-muted-foreground"}`}>Équipe B</p>
          <span className="text-4xl font-black text-foreground">{match.score_team_b}</span>
        </div>
      </div>
      <div className="space-y-5">
        {renderTeam("a")}
        <div className="border-t border-border" />
        {renderTeam("b")}
      </div>
    </div>
  )
}

// ─── Matches tab ────────────────────────────────────────────────────────────

function MatchesTab({ matches, playerId }: { matches: Match[]; playerId: string }) {
  const [selected, setSelected] = useState<Match | null>(null)

  if (selected) {
    return <MatchDetail match={selected} onBack={() => setSelected(null)} />
  }

  if (matches.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
        Aucun match trouvé.
      </div>
    )
  }

  return (
    <div className="divide-y divide-border -mx-4">
      {matches.map(match => {
        const playerOnA = match.team_a.some(mp => mp.player.id === playerId)
        const teamAWon = match.score_team_a > match.score_team_b
        const playerTeam = playerOnA ? match.team_a : match.team_b
        const playerMp = playerTeam.find(mp => mp.player.id === playerId)
        const eloDelta = playerMp?.elo_after != null && playerMp?.elo_before != null
          ? playerMp.elo_after - playerMp.elo_before
          : null

        const teamNames = (team: typeof match.team_a) =>
          team.map(mp => `${mp.player.first_name[0]}. ${mp.player.last_name}`).join(" + ")

        // Always show the player's team on the left
        const myTeam  = playerOnA ? match.team_a : match.team_b
        const oppTeam = playerOnA ? match.team_b : match.team_a
        const myScore  = playerOnA ? match.score_team_a : match.score_team_b
        const oppScore = playerOnA ? match.score_team_b : match.score_team_a
        const playerWon = myScore > oppScore

        return (
          <button
            key={match.id}
            onClick={() => setSelected(match)}
            className="w-full flex flex-col gap-1.5 py-3 px-4 text-left hover:bg-muted/50 active:bg-muted transition-colors"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">{shortDate(match.played_at)}</span>
              {eloDelta !== null && (
                <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${
                  eloDelta > 0
                    ? "bg-green-50 text-green-600 dark:bg-green-900/20"
                    : eloDelta < 0
                      ? "bg-red-50 text-red-500 dark:bg-red-900/20"
                      : "bg-muted text-muted-foreground"
                }`}>
                  {eloDelta > 0 ? `+${eloDelta}` : eloDelta}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className={`flex-1 text-xs truncate ${playerWon ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                {teamNames(myTeam)}
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <span className={`w-6 h-6 flex items-center justify-center rounded text-xs font-bold ${playerWon ? "bg-primary text-primary-foreground" : "text-foreground"}`}>
                  {myScore}
                </span>
                <span className="text-muted-foreground text-xs">-</span>
                <span className={`w-6 h-6 flex items-center justify-center rounded text-xs font-bold ${!playerWon ? "bg-orange-500 text-white" : "text-foreground"}`}>
                  {oppScore}
                </span>
              </div>
              <span className={`flex-1 text-xs truncate text-right ${!playerWon ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                {teamNames(oppTeam)}
              </span>
            </div>
          </button>
        )
      })}
    </div>
  )
}

// ─── Trophées tab ───────────────────────────────────────────────────────────

const BADGE_VISUALS: Record<string, { icon: LucideIcon; cls: string }> = {
  "premier-match": { icon: Flag, cls: "bg-sky-100 text-sky-600 dark:bg-sky-900/20 dark:text-sky-400" },
  "habitue": { icon: Footprints, cls: "bg-sky-100 text-sky-600 dark:bg-sky-900/20 dark:text-sky-400" },
  "pilier": { icon: Layers, cls: "bg-sky-100 text-sky-600 dark:bg-sky-900/20 dark:text-sky-400" },
  "veteran": { icon: ShieldCheck, cls: "bg-sky-100 text-sky-600 dark:bg-sky-900/20 dark:text-sky-400" },
  "legende": { icon: Crown, cls: "bg-amber-100 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400" },
  "premiere-victoire": { icon: Star, cls: "bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400" },
  "chasseur-de-trophees": { icon: Trophy, cls: "bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400" },
  "centurion": { icon: Medal, cls: "bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400" },
  "en-feu": { icon: Flame, cls: "bg-orange-100 text-orange-500 dark:bg-orange-900/20 dark:text-orange-400" },
  "sur-une-lancee": { icon: Flame, cls: "bg-red-100 text-red-500 dark:bg-red-900/20 dark:text-red-400" },
  "intouchable": { icon: Zap, cls: "bg-purple-100 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400" },
  "traversee-du-desert": { icon: Frown, cls: "bg-muted text-muted-foreground" },
  "no-mercy": { icon: Swords, cls: "bg-red-100 text-red-500 dark:bg-red-900/20 dark:text-red-400" },
  "super-loser": { icon: ThumbsDown, cls: "bg-muted text-muted-foreground" },
  "le-bourreau": { icon: Skull, cls: "bg-red-100 text-red-500 dark:bg-red-900/20 dark:text-red-400" },
  "sur-le-fil": { icon: Target, cls: "bg-sky-100 text-sky-600 dark:bg-sky-900/20 dark:text-sky-400" },
  "coeur-brise": { icon: Heart, cls: "bg-red-100 text-red-500 dark:bg-red-900/20 dark:text-red-400" },
  "chasseur-de-geants": { icon: Mountain, cls: "bg-teal-100 text-teal-600 dark:bg-teal-900/20 dark:text-teal-400" },
  "regicide": { icon: Crown, cls: "bg-red-100 text-red-500 dark:bg-red-900/20 dark:text-red-400" },
  "chute-libre": { icon: TrendingDown, cls: "bg-muted text-muted-foreground" },
  "elite": { icon: Gem, cls: "bg-purple-100 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400" },
  "muraille": { icon: Shield, cls: "bg-sky-100 text-sky-600 dark:bg-sky-900/20 dark:text-sky-400" },
  "buteur": { icon: Crosshair, cls: "bg-orange-100 text-orange-500 dark:bg-orange-900/20 dark:text-orange-400" },
  "polyvalent": { icon: Repeat2, cls: "bg-teal-100 text-teal-600 dark:bg-teal-900/20 dark:text-teal-400" },
  "nemesis": { icon: Users, cls: "bg-pink-100 text-pink-600 dark:bg-pink-900/20 dark:text-pink-400" },
  "bete-noire": { icon: Skull, cls: "bg-pink-100 text-pink-600 dark:bg-pink-900/20 dark:text-pink-400" },
  "revanche": { icon: RotateCcw, cls: "bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400" },
  "champion": { icon: Trophy, cls: "bg-amber-100 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400" },
  "sur-le-podium": { icon: Award, cls: "bg-amber-100 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400" },
  "oiseau-de-nuit": { icon: Moon, cls: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400" },
}

function BadgeCell({ badge }: { badge: BadgeStatus }) {
  const visual = BADGE_VISUALS[badge.id]
  const Icon = visual.icon

  return (
    <Popover>
      <PopoverTrigger
        render={<button className="flex flex-col items-center gap-1 p-1.5 rounded-xl transition-colors hover:bg-muted/50" />}
      >
        <div
          className={
            badge.earned
              ? `w-11 h-11 rounded-full flex items-center justify-center ${visual.cls}`
              : "w-11 h-11 rounded-full flex items-center justify-center border-2 border-dashed border-border text-muted-foreground/50"
          }
        >
          {badge.earned ? <Icon className="size-5" /> : <LockIcon className="size-4" />}
        </div>
        <p className={`text-[10px] text-center leading-tight ${badge.earned ? "text-foreground font-medium" : "text-muted-foreground"}`}>
          {badge.name}
        </p>
        {badge.earned && badge.earnedAt && (
          <p className="text-[9px] text-muted-foreground/70">{shortDate(badge.earnedAt)}</p>
        )}
        {!badge.earned && (
          <p className="text-[9px] text-muted-foreground/70 tabular-nums">
            {badge.progress ? `${Math.min(badge.progress.current, badge.progress.target)}/${badge.progress.target}` : "—"}
          </p>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-56">
        <p className="text-sm font-bold text-foreground">{badge.name}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{badge.description}</p>
        {badge.earned && badge.earnedAt && (
          <p className="text-[11px] text-muted-foreground mt-1.5">Débloqué le {longDate(badge.earnedAt)}</p>
        )}
        {!badge.earned && badge.progress && (
          <p className="text-[11px] text-muted-foreground mt-1.5">
            Progression : {Math.min(badge.progress.current, badge.progress.target)}/{badge.progress.target}
          </p>
        )}
      </PopoverContent>
    </Popover>
  )
}

function BadgesTab({ badges, loading }: { badges: BadgeStatus[] | null; loading: boolean }) {
  if (loading || badges === null) {
    return (
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5 p-1.5">
            <div className="w-11 h-11 rounded-full bg-muted animate-pulse" />
            <div className="h-2 w-10 rounded bg-muted animate-pulse" />
          </div>
        ))}
      </div>
    )
  }

  const earnedCount = badges.filter(b => b.earned).length

  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground mb-3">
        {earnedCount}/{badges.length} débloqués
      </p>
      <div className="grid grid-cols-4 gap-1">
        {badges.map(badge => (
          <BadgeCell key={badge.id} badge={badge} />
        ))}
      </div>
    </div>
  )
}

// ─── Main dialog ────────────────────────────────────────────────────────────

export function PlayerProfileDialog({
  stats,
  rank,
  playerMatches,
  open,
  onClose,
}: {
  stats: PlayerStats
  rank: number
  playerMatches: Match[]
  open: boolean
  onClose: () => void
}) {
  // null = not yet fetched / loading; array = done
  const [eloHistory, setEloHistory] = useState<EloHistoryPoint[] | null>(null)
  const [rivalries, setRivalries] = useState<RivalryStat[] | null>(null)
  const [badges, setBadges] = useState<BadgeStatus[] | null>(null)
  const [activeTab, setActiveTab] = useState("matches")
  // track which tabs have already been fetched for this open session
  const fetched = useRef({ elo: false, rivals: false, badges: false })

  // Reset state every time the dialog opens
  useEffect(() => {
    if (!open) return
    setActiveTab("matches")
    setEloHistory(null)
    setRivalries(null)
    setBadges(null)
    fetched.current = { elo: false, rivals: false, badges: false }
  }, [open])

  // Lazy-fetch only when the user visits a tab for the first time
  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab)
    if (tab === "elo" && !fetched.current.elo) {
      fetched.current.elo = true
      getPlayerEloHistory(stats.player.id).then(setEloHistory)
    }
    if (tab === "rivals" && !fetched.current.rivals) {
      fetched.current.rivals = true
      getPlayerRivalries(stats.player.id).then(setRivalries)
    }
    if (tab === "badges" && !fetched.current.badges) {
      fetched.current.badges = true
      getPlayerBadges(stats.player.id).then(setBadges)
    }
  }, [stats.player.id])

  const { first_name, last_name } = stats.player
  const initials = getInitials(first_name, last_name)

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent showCloseButton={false} className="p-0 gap-0 overflow-hidden sm:max-w-lg">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-border">
          <div className="w-10 h-10 rounded-full bg-primary/15 text-primary flex items-center justify-center text-sm font-bold ring-2 ring-background shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-muted-foreground">#{String(rank).padStart(2, "0")}</span>
              <h2 className="text-base font-bold text-foreground truncate">{first_name} {last_name}</h2>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-muted-foreground">{stats.wins}V · {stats.losses}D · {stats.win_rate.toFixed(0)}%</span>
              <EloBadge elo={stats.elo} />
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex size-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted transition-colors shrink-0"
          >
            <XIcon className="size-4" />
          </button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="flex flex-col">
          <div className="px-4 pt-3">
            <TabsList className="w-full grid grid-cols-4 text-xs">
              <TabsTrigger value="matches" className="px-1">Derniers matchs</TabsTrigger>
              <TabsTrigger value="elo" className="px-1">Historique ELO</TabsTrigger>
              <TabsTrigger value="rivals" className="px-1">Rivalités</TabsTrigger>
              <TabsTrigger value="badges" className="px-1">Trophées</TabsTrigger>
            </TabsList>
          </div>

          <div className="px-4 pb-4 pt-3">
            <TabsContent value="matches">
              <div className="max-h-[60vh] overflow-y-auto overflow-x-hidden">
                <MatchesTab matches={playerMatches} playerId={stats.player.id} />
              </div>
            </TabsContent>

            <TabsContent value="elo">
              {eloHistory === null ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="bg-muted rounded-xl p-3 text-center space-y-2">
                        <div className="h-3 w-16 mx-auto rounded bg-muted-foreground/20 animate-pulse" />
                        <div className="h-6 w-12 mx-auto rounded bg-muted-foreground/20 animate-pulse" />
                      </div>
                    ))}
                  </div>
                  <div className="h-36 rounded-xl bg-muted animate-pulse" />
                </div>
              ) : (
                <EloChart history={eloHistory} />
              )}
            </TabsContent>

            <TabsContent value="rivals">
              <RivalriesTab
                rivalries={rivalries}
                loading={rivalries === null}
                playerFirst={first_name}
                playerLast={last_name}
              />
            </TabsContent>

            <TabsContent value="badges">
              <BadgesTab badges={badges} loading={badges === null} />
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
