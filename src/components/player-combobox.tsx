"use client"

import { useState } from "react"
import { ChevronsUpDownIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import type { Player } from "@/lib/types"

const EMAIL_REGEX = /^[a-z]+\.[a-z]+@atos\.net$/i

function nameFromEmail(email: string): string {
  const [prefix] = email.split("@")
  const [first, last] = prefix.split(".")
  if (!first || !last) return email
  return `${first.charAt(0).toUpperCase()}${first.slice(1)} ${last.charAt(0).toUpperCase()}${last.slice(1)}`
}

type Props = {
  players: Player[]
  value: string
  onChange: (email: string) => void
  placeholder?: string
}

export function PlayerCombobox({ players, value, onChange, placeholder = "Sélectionner un joueur..." }: Props) {
  const [open, setOpen] = useState(false)
  const [inputValue, setInputValue] = useState("")
  const [error, setError] = useState("")

  const selected = players.find((p) => p.email === value)
  const displayValue = selected
    ? `${selected.first_name} ${selected.last_name}`
    : value
    ? nameFromEmail(value)
    : null

  function commitEmail(email: string) {
    const normalized = email.toLowerCase().trim()
    if (EMAIL_REGEX.test(normalized)) {
      setError("")
      setInputValue("")
      onChange(normalized)
      setOpen(false)
    } else if (normalized) {
      setError("Format invalide — ex: prenom.nom@atos.net")
    }
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      // On close, try to commit whatever is typed
      commitEmail(inputValue)
      if (!EMAIL_REGEX.test(inputValue.toLowerCase().trim()) && inputValue) {
        // Keep open to show error
        setOpen(true)
        return
      }
      setInputValue("")
      setError("")
    }
    setOpen(next)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault()
      commitEmail(inputValue)
    }
    if (e.key === "Escape") {
      setInputValue("")
      setError("")
      setOpen(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            aria-expanded={open}
            className={cn("w-full h-9 justify-between font-normal", !displayValue && "text-muted-foreground")}
          />
        }
      >
        <span className="truncate">{displayValue ?? placeholder}</span>
        <ChevronsUpDownIcon className="ml-2 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0">
        <Command>
          <CommandInput
            placeholder="Nom ou email..."
            value={inputValue}
            onValueChange={(v) => {
              setInputValue(v)
              setError("")
            }}
            onKeyDown={handleKeyDown}
          />
          {error && (
            <p className="px-3 py-1.5 text-xs text-red-500">{error}</p>
          )}
          <CommandList>
            <CommandEmpty>
              {inputValue
                ? "Appuyez sur Entrée pour ajouter cet email."
                : "Aucun joueur trouvé."}
            </CommandEmpty>
            <CommandGroup>
              {players.map((player) => (
                <CommandItem
                  key={player.id}
                  value={`${player.first_name} ${player.last_name} ${player.email}`}
                  data-checked={value === player.email}
                  onSelect={() => {
                    onChange(player.email)
                    setInputValue("")
                    setError("")
                    setOpen(false)
                  }}
                >
                  <span className="font-medium">{player.first_name} {player.last_name}</span>
                  <span className="ml-1 text-xs text-muted-foreground">{player.email.split("@")[0]}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
