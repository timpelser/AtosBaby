"use client"

import { useState } from "react"
import { PlusIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PlayerCombobox } from "@/components/player-combobox"
import { PLAYERS } from "@/lib/dummy-data"

type TeamState = {
  attacker: string
  defender: string
}

type FormState = {
  teamA: TeamState
  teamB: TeamState
  scoreA: string
  scoreB: string
}

const EMPTY_FORM: FormState = {
  teamA: { attacker: "", defender: "" },
  teamB: { attacker: "", defender: "" },
  scoreA: "",
  scoreB: "",
}

function TeamSection({
  label,
  teamColor,
  state,
  onChange,
}: {
  label: string
  teamColor: string
  state: TeamState
  onChange: (next: TeamState) => void
}) {
  return (
    <div className={`rounded-lg border p-4 space-y-3 ${teamColor}`}>
      <h3 className="font-semibold text-sm">{label}</h3>
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Attaquant</Label>
        <PlayerCombobox
          players={PLAYERS}
          value={state.attacker}
          onChange={(email) => onChange({ ...state, attacker: email })}
          placeholder="Choisir un attaquant..."
        />
      </div>
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Défenseur</Label>
        <PlayerCombobox
          players={PLAYERS}
          value={state.defender}
          onChange={(email) => onChange({ ...state, defender: email })}
          placeholder="Choisir un défenseur..."
        />
      </div>
    </div>
  )
}

export function AddMatchDialog() {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) setForm(EMPTY_FORM)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    // Backend integration will be added later
    setOpen(false)
    setForm(EMPTY_FORM)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button size="lg" className="h-10 px-5 text-base" />}>
        <PlusIcon className="size-5" />
        Ajouter un match
      </DialogTrigger>

      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Ajouter un match</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Teams */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <TeamSection
              label="Équipe A"
              teamColor="bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800"
              state={form.teamA}
              onChange={(teamA) => setForm((f) => ({ ...f, teamA }))}
            />
            <TeamSection
              label="Équipe B"
              teamColor="bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-800"
              state={form.teamB}
              onChange={(teamB) => setForm((f) => ({ ...f, teamB }))}
            />
          </div>

          {/* Score */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Score</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                max={10}
                placeholder="0"
                value={form.scoreA}
                onChange={(e) => setForm((f) => ({ ...f, scoreA: e.target.value }))}
                className="text-center text-lg font-semibold w-20"
              />
              <span className="text-muted-foreground font-medium text-lg">—</span>
              <Input
                type="number"
                min={0}
                max={10}
                placeholder="0"
                value={form.scoreB}
                onChange={(e) => setForm((f) => ({ ...f, scoreB: e.target.value }))}
                className="text-center text-lg font-semibold w-20"
              />
            </div>
          </div>

          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>
              Annuler
            </DialogClose>
            <Button type="submit">
              Enregistrer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
