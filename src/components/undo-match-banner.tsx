"use client"

import { useEffect, useState, useSyncExternalStore } from "react"
import { CheckIcon, Undo2Icon, XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { undoMatch } from "@/lib/actions"
import {
  clearUndoableMatch,
  readUndoableMatch,
  readUndoableMatchServerSnapshot,
  subscribeUndoableMatch,
} from "@/lib/undo-match-store"

/**
 * Fixed bottom toast offering to retract the match this browser just logged.
 * Styled like the rest of the app (light card, border, soft accent badge)
 * rather than a generic dark Material-style snackbar — this app has no dark
 * surfaces anywhere else. Only the browser that submitted the match ever
 * sees this (it's read from localStorage, not from the match list), and it
 * disappears on its own once the undo window closes — see
 * undo-match-store.ts for why.
 */
export function UndoMatchBanner() {
  const stored = useSyncExternalStore(subscribeUndoableMatch, readUndoableMatch, readUndoableMatchServerSnapshot)
  const [now, setNow] = useState(() => Date.now())
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!stored) return
    const interval = setInterval(() => {
      if (stored.expiresAt <= Date.now()) clearUndoableMatch()
      else setNow(Date.now())
    }, 1000)
    return () => clearInterval(interval)
  }, [stored])

  // Auto-dismiss the failure message a few seconds after a failed attempt.
  useEffect(() => {
    if (!failed) return
    const timeout = setTimeout(() => setFailed(false), 4000)
    return () => clearTimeout(timeout)
  }, [failed])

  // `stored` can be a stale entry left over from before a refresh (e.g. the
  // tab was reopened well after the window closed) — the store itself can't
  // filter that (see undo-match-store.ts), so check it here against wall
  // clock time instead of trusting presence alone.
  const remainingMs = stored ? stored.expiresAt - now : 0
  const active = !!stored && remainingMs > 0

  if (!active && !failed) return null

  const seconds = Math.max(0, Math.ceil(remainingMs / 1000))
  const countdown = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`

  async function handleUndo() {
    if (!active || !stored || pending) return
    setPending(true)
    try {
      const result = await undoMatch(stored.id)
      clearUndoableMatch()
      if (!result.ok) setFailed(true)
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="fixed inset-x-0 bottom-4 z-50 flex justify-center px-4" role="status">
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-card text-card-foreground shadow-lg pl-3 pr-2 py-2 animate-in fade-in slide-in-from-bottom-2">
        {failed ? (
          <span className="px-1 text-sm text-muted-foreground">
            Trop tard, ce match ne peut plus être annulé.
          </span>
        ) : (
          <>
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-green-50 text-green-600">
              <CheckIcon className="size-4" />
            </span>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold whitespace-nowrap">Match enregistré</span>
              <span className="text-xs text-muted-foreground tabular-nums">{countdown} pour annuler</span>
            </div>
            <Button onClick={handleUndo} disabled={pending} variant="outline" size="sm">
              <Undo2Icon className="size-3.5" />
              {pending ? "Annulation…" : "Annuler"}
            </Button>
          </>
        )}
        <Button
          onClick={() => { clearUndoableMatch(); setFailed(false) }}
          variant="ghost"
          size="icon-sm"
        >
          <XIcon />
          <span className="sr-only">Fermer</span>
        </Button>
      </div>
    </div>
  )
}
