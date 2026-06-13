"use client"

import { useState } from "react"
import { PlusIcon, ShieldIcon, PersonStandingIcon, XIcon, LockIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAdmin } from "@/components/admin-context"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { PlayerCombobox } from "@/components/player-combobox"
import { saveMatch } from "@/lib/actions"
import type { Player } from "@/lib/types"

type TeamState = {
  attacker: string
  defender: string
}

type FormState = {
  teamA: TeamState
  teamB: TeamState
  scoreA: number
  scoreB: number
}

const EMPTY_FORM: FormState = {
  teamA: { attacker: "", defender: "" },
  teamB: { attacker: "", defender: "" },
  scoreA: 0,
  scoreB: 0,
}

function PlayerField({
  icon,
  label,
  value,
  onChange,
  players,
}: {
  icon: React.ReactNode
  label: string
  value: string
  onChange: (v: string) => void
  players: Player[]
}) {
  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase text-muted-foreground">
        {icon}
        {label}
      </Label>
      <PlayerCombobox
        players={players}
        value={value}
        onChange={onChange}
        placeholder="prenom.nom@atos.net"
      />
    </div>
  )
}

export function AddMatchDialog({ players }: { players: Player[] }) {
  const { isAdmin, logout } = useAdmin()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [isPending, setIsPending] = useState(false)

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) setForm(EMPTY_FORM)
  }

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    if (scoreInvalid || playersInvalid || isPending) return
    setIsPending(true)
    await saveMatch({ teamA: form.teamA, teamB: form.teamB, scoreA: form.scoreA, scoreB: form.scoreB })
    setIsPending(false)
    setOpen(false)
    setForm(EMPTY_FORM)
  }

  const allPlayers = [form.teamA.attacker, form.teamA.defender, form.teamB.attacker, form.teamB.defender]
  const playersInvalid = allPlayers.some((p) => !p) || new Set(allPlayers).size < 4
  const scoreInvalid = (form.scoreA !== 10 && form.scoreB !== 10) || (form.scoreA === 10 && form.scoreB === 10)

  function clampScore(val: number) {
    return Math.max(0, Math.min(10, val))
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <div className="flex items-center gap-2 w-full sm:w-auto">
        {isAdmin && (
          <button
            onClick={logout}
            className="hidden sm:flex size-10 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Quitter le mode admin"
          >
            <LockIcon className="size-4" />
          </button>
        )}
        <DialogTrigger render={<Button size="lg" className="flex-1 sm:flex-none h-10 px-5 text-base" />}>
          <PlusIcon className="size-5" />
          Ajouter un match
        </DialogTrigger>
      </div>
      {isAdmin && (
        <Button
          onClick={logout}
          variant="outline"
          size="lg"
          className="sm:hidden w-full h-10 px-5 text-base mt-2"
        >
          <LockIcon className="size-5" />
          Quitter admin
        </Button>
      )}


      <DialogContent showCloseButton={false} className="sm:max-w-lg p-0 overflow-hidden gap-0 border border-border">
        {/* Header */}
        <div className="relative px-6 pt-4 text-center">
          <DialogTitle className="font-bold text-lg tracking-wide text-blue-600">
            Nouveau Match
          </DialogTitle>
          <DialogClose
            render={<button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 flex size-7 items-center justify-center rounded-full text-muted-foreground hover:bg-gray-100 transition-colors" />}
          >
            <XIcon className="size-4" />
          </DialogClose>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-4 space-y-3">
            {/* Équipe A */}
            <div className="rounded-2xl bg-blue-50 border border-blue-100 p-4 space-y-3 ">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <PlayerField
                  icon={<ShieldIcon className="size-3.5" />}
                  label="Défenseur"
                  value={form.teamA.defender}
                  onChange={(v) => setForm((f) => ({ ...f, teamA: { ...f.teamA, defender: v } }))}
                  players={players}
                />
                <PlayerField
                  icon={<PersonStandingIcon className="size-3.5" />}
                  label="Attaquant"
                  value={form.teamA.attacker}
                  onChange={(v) => setForm((f) => ({ ...f, teamA: { ...f.teamA, attacker: v } }))}
                  players={players}
                />
              </div>
            </div>

            {/* Score */}
            <div className="rounded-2xl bg-gray-50 border border-gray-100 p-5">
              <div className="flex items-center justify-center gap-8">
                {/* Score A */}
                <div className="flex flex-col items-center gap-0">
                  <div className="flex w-24 gap-px">
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, scoreA: clampScore(f.scoreA + 1) }))}
                      className="flex flex-1 h-9 items-center justify-center rounded-tl-lg bg-gray-200 hover:bg-gray-300 text-gray-600 text-lg font-medium transition-colors"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, scoreA: 10 }))}
                      className="flex flex-1 h-9 items-center justify-center rounded-tr-lg bg-blue-100 hover:bg-blue-200 text-blue-600 text-xs font-bold transition-colors"
                    >
                      +10
                    </button>
                  </div>
                  <span className="text-6xl font-extrabold text-blue-600 leading-none w-24 text-center py-2">
                    {form.scoreA}
                  </span>
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, scoreA: clampScore(f.scoreA - 1) }))}
                    className="flex w-24 h-9 items-center justify-center rounded-bl-lg rounded-br-lg bg-gray-200 hover:bg-gray-300 text-gray-600 text-lg font-medium transition-colors"
                  >
                    −
                  </button>
                </div>

                <span className="text-xl font-semibold text-gray-300 select-none">vs</span>

                {/* Score B */}
                <div className="flex flex-col items-center gap-0">
                  <div className="flex w-24 gap-px">
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, scoreB: clampScore(f.scoreB + 1) }))}
                      className="flex flex-1 h-9 items-center justify-center rounded-tl-lg bg-gray-200 hover:bg-gray-300 text-gray-600 text-lg font-medium transition-colors"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, scoreB: 10 }))}
                      className="flex flex-1 h-9 items-center justify-center rounded-tr-lg bg-orange-100 hover:bg-orange-200 text-orange-700 text-xs font-bold transition-colors"
                    >
                      +10
                    </button>
                  </div>
                  <span className="text-6xl font-extrabold text-orange-700 leading-none w-24 text-center py-2">
                    {form.scoreB}
                  </span>
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, scoreB: clampScore(f.scoreB - 1) }))}
                    className="flex w-24 h-9 items-center justify-center rounded-bl-lg rounded-br-lg bg-gray-200 hover:bg-gray-300 text-gray-600 text-lg font-medium transition-colors"
                  >
                    −
                  </button>
                </div>
              </div>
            </div>

            {/* Équipe B */}
            <div className="rounded-2xl bg-orange-50 border border-orange-100 p-4 space-y-3 ">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <PlayerField
                  icon={<ShieldIcon className="size-3.5" />}
                  label="Défenseur"
                  value={form.teamB.defender}
                  onChange={(v) => setForm((f) => ({ ...f, teamB: { ...f.teamB, defender: v } }))}
                  players={players}
                />
                <PlayerField
                  icon={<PersonStandingIcon className="size-3.5" />}
                  label="Attaquant"
                  value={form.teamB.attacker}
                  onChange={(v) => setForm((f) => ({ ...f, teamB: { ...f.teamB, attacker: v } }))}
                  players={players}
                />
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="px-4 pb-4">
            <Button
              type="submit"
              disabled={scoreInvalid || playersInvalid || isPending}
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold tracking-widest text-sm rounded-xl disabled:opacity-50"
            >
              {isPending ? (
                <svg className="animate-spin size-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                "ENREGISTRER LE MATCH"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
