"use client"

import { useState } from "react"
import { UsersIcon, XIcon, ShuffleIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PlayerCombobox } from "@/components/player-combobox"
import type { Player, PlayerStats } from "@/lib/types"

function getInitials(first: string, last: string) {
  return `${first[0]}${last[0]}`.toUpperCase()
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

type TeamResult = { teamA: [Player, Player]; teamB: [Player, Player] }

function computeBalanced(players: [Player, Player, Player, Player], eloMap: Map<string, number>): TeamResult {
  const [p1, p2, p3, p4] = players
  const combos: TeamResult[] = [
    { teamA: [p1, p2], teamB: [p3, p4] },
    { teamA: [p1, p3], teamB: [p2, p4] },
    { teamA: [p1, p4], teamB: [p2, p3] },
  ]
  const diff = ({ teamA, teamB }: TeamResult) => {
    const avgA = ((eloMap.get(teamA[0].id) ?? 1000) + (eloMap.get(teamA[1].id) ?? 1000)) / 2
    const avgB = ((eloMap.get(teamB[0].id) ?? 1000) + (eloMap.get(teamB[1].id) ?? 1000)) / 2
    return Math.abs(avgA - avgB)
  }
  return combos.reduce((best, c) => diff(c) < diff(best) ? c : best)
}

function PlayerCard({ player, eloMap, color }: { player: Player; eloMap: Map<string, number>; color: "blue" | "orange" }) {
  const isBlue = color === "blue"
  const avatarCls = isBlue
    ? "bg-blue-100 text-blue-600"
    : "bg-orange-100 text-orange-600"

  return (
    <div className="flex items-center gap-2.5">
      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${avatarCls}`}>
        {getInitials(player.first_name, player.last_name)}
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground leading-tight">
          {player.first_name} {player.last_name}
        </p>
        <p className="text-xs text-muted-foreground">ELO {eloMap.get(player.id) ?? 1000}</p>
      </div>
    </div>
  )
}

function TeamDisplay({ result, eloMap, showElo }: { result: TeamResult; eloMap: Map<string, number>; showElo: boolean }) {
  const avgA = ((eloMap.get(result.teamA[0].id) ?? 1000) + (eloMap.get(result.teamA[1].id) ?? 1000)) / 2
  const avgB = ((eloMap.get(result.teamB[0].id) ?? 1000) + (eloMap.get(result.teamB[1].id) ?? 1000)) / 2
  const eloDiff = Math.abs(Math.round(avgA - avgB))

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {/* Team A */}
        <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 space-y-3">
          <p className="text-xs font-semibold tracking-widest text-blue-600 uppercase">Équipe A</p>
          <div className="space-y-2.5">
            {result.teamA.map((p) => <PlayerCard key={p.id} player={p} eloMap={eloMap} color="blue" />)}
          </div>
          {showElo && (
            <p className="text-xs font-bold text-blue-600 pt-1 border-t border-blue-100">
              Moy. ELO : {Math.round(avgA)}
            </p>
          )}
        </div>

        {/* Team B */}
        <div className="rounded-xl bg-orange-50 border border-orange-100 p-4 space-y-3">
          <p className="text-xs font-semibold tracking-widest text-orange-600 uppercase">Équipe B</p>
          <div className="space-y-2.5">
            {result.teamB.map((p) => <PlayerCard key={p.id} player={p} eloMap={eloMap} color="orange" />)}
          </div>
          {showElo && (
            <p className="text-xs font-bold text-orange-600 pt-1 border-t border-orange-100">
              Moy. ELO : {Math.round(avgB)}
            </p>
          )}
        </div>
      </div>

      {showElo && (
        <p className="text-center text-xs text-muted-foreground">
          Différence :{" "}
          <span className={`font-semibold ${eloDiff <= 25 ? "text-green-600" : eloDiff <= 75 ? "text-orange-500" : "text-red-500"}`}>
            {eloDiff} pts ELO
          </span>
        </p>
      )}
    </div>
  )
}

export function TeamSelectorDialog({ players, playerStats }: { players: Player[]; playerStats: PlayerStats[] }) {
  const [open, setOpen] = useState(false)
  const [emails, setEmails] = useState(["", "", "", ""])
  const [randomResult, setRandomResult] = useState<TeamResult | null>(null)

  const eloMap = new Map(playerStats.map((s) => [s.player.id, s.elo]))

  function setEmail(i: number, value: string) {
    setEmails((prev) => { const n = [...prev]; n[i] = value; return n })
    setRandomResult(null)
  }

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) { setEmails(["", "", "", ""]); setRandomResult(null) }
  }

  const selectedPlayers = emails
    .map((e) => players.find((p) => p.email === e))
    .filter(Boolean) as Player[]

  const ready = selectedPlayers.length === 4 && new Set(emails).size === 4 && emails.every(Boolean)

  function handleRandom() {
    if (!ready) return
    const s = shuffle(selectedPlayers)
    setRandomResult({ teamA: [s[0], s[1]], teamB: [s[2], s[3]] })
  }

  const balancedResult = ready
    ? computeBalanced(selectedPlayers as [Player, Player, Player, Player], eloMap)
    : null

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant="outline" size="lg" className="w-full sm:w-auto h-10 px-5 text-base" />}>
        <UsersIcon className="size-5" />
        Sélecteur d&apos;équipes
      </DialogTrigger>

      <DialogContent showCloseButton={false} className="sm:max-w-lg p-0 overflow-hidden gap-0 border border-border">
        {/* Header */}
        <div className="relative px-6 pt-4 text-center">
          <DialogTitle className="font-bold text-lg tracking-wide text-foreground">
            Sélecteur d&apos;équipes
          </DialogTitle>
          <DialogClose
            render={<button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 flex size-7 items-center justify-center rounded-full text-muted-foreground hover:bg-gray-100 transition-colors" />}
          >
            <XIcon className="size-4" />
          </DialogClose>
        </div>

        <div className="p-4 space-y-4">
          {/* 4 player selectors shared between tabs */}
          <div className="grid grid-cols-2 gap-3">
            {[0, 1, 2, 3].map((i) => (
              <PlayerCombobox
                key={i}
                players={players}
                value={emails[i]}
                onChange={(v) => setEmail(i, v)}
                placeholder={`Joueur ${i + 1}`}
              />
            ))}
          </div>

          <Tabs defaultValue="random">
            <TabsList className="w-full">
              <TabsTrigger value="random" className="flex-1">Aléatoire</TabsTrigger>
              <TabsTrigger value="balanced" className="flex-1">Équipes équilibrées</TabsTrigger>
            </TabsList>

            {/* Tab 1: Random */}
            <TabsContent value="random" className="pt-4 space-y-4">
              <Button onClick={handleRandom} disabled={!ready} className="w-full">
                <ShuffleIcon className="size-4" />
                {randomResult ? "Mélanger à nouveau" : "Mélanger"}
              </Button>
              {randomResult && <TeamDisplay result={randomResult} eloMap={eloMap} showElo={false} />}
            </TabsContent>

            {/* Tab 2: Balanced */}
            <TabsContent value="balanced" className="pt-4">
              {balancedResult ? (
                <TeamDisplay result={balancedResult} eloMap={eloMap} showElo={true} />
              ) : (
                <p className="text-center text-sm text-muted-foreground py-2 whitespace-nowrap">
                  Sélectionnez 4 joueurs différents pour voir le résultat.
                </p>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}
