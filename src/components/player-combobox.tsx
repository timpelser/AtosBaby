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

type Props = {
  players: Player[]
  value: string
  onChange: (email: string) => void
  placeholder?: string
}

export function PlayerCombobox({ players, value, onChange, placeholder = "Sélectionner un joueur..." }: Props) {
  const [open, setOpen] = useState(false)

  const selected = players.find((p) => p.email === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            aria-expanded={open}
            className={cn("w-full h-9 justify-between font-normal", !selected && "text-muted-foreground")}
          />
        }
      >
        {selected ? `${selected.first_name} ${selected.last_name}` : placeholder}
        <ChevronsUpDownIcon className="ml-2 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0">
        <Command>
          <CommandInput placeholder="Rechercher..." />
          <CommandList>
            <CommandEmpty>Aucun joueur trouvé.</CommandEmpty>
            <CommandGroup>
              {players.map((player) => (
                <CommandItem
                  key={player.id}
                  value={`${player.first_name} ${player.last_name} ${player.email}`}
                  data-checked={value === player.email}
                  onSelect={() => {
                    onChange(player.email)
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
