// Tiny localStorage-backed store remembering "the match this browser just
// logged, and until when it can still be undone". Scoped to the browser, not
// a player identity — there's no login system, so "the player who just
// logged a match" means "whoever is sitting at this browser right now".
// Survives a page refresh within the window; a second tab gets its own copy
// (matches aren't shared across browsers), which is fine — undo is a
// courtesy for the person who just typed the score in, not a global feature.

import { UNDO_WINDOW_MINUTES } from "@/lib/constants"

const KEY = "atosbaby:undoable-match"
export const UNDO_WINDOW_MS = UNDO_WINDOW_MINUTES * 60 * 1000

export type UndoableMatch = { id: string; expiresAt: number }

export function setUndoableMatch(matchId: string): void {
  if (typeof window === "undefined") return
  const value: UndoableMatch = { id: matchId, expiresAt: Date.now() + UNDO_WINDOW_MS }
  window.localStorage.setItem(KEY, JSON.stringify(value))
  // localStorage's own "storage" event only fires in OTHER tabs — dispatch
  // manually so this tab's subscribers (the banner) notice immediately.
  window.dispatchEvent(new StorageEvent("storage", { key: KEY }))
}

export function clearUndoableMatch(): void {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(KEY)
  window.dispatchEvent(new StorageEvent("storage", { key: KEY }))
}

// useSyncExternalStore requires getSnapshot to return a referentially stable
// value when the underlying store hasn't changed — otherwise React sees a
// "new" snapshot on every render and throws "should be cached to avoid an
// infinite loop". So this caches the last parsed value keyed off the raw
// string, and only parses again when localStorage actually changed. It also
// deliberately does NOT check Date.now() here — expiry is time-based, not
// store-based, so folding it into the snapshot would make getSnapshot impure
// (same store content, different answer a second later). The ticking
// countdown and its own expiry check live in the component instead.
let cachedRaw: string | null = null
let cachedValue: UndoableMatch | null = null

function parse(raw: string | null): UndoableMatch | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<UndoableMatch>
    if (typeof parsed.id !== "string" || typeof parsed.expiresAt !== "number") return null
    return { id: parsed.id, expiresAt: parsed.expiresAt }
  } catch {
    return null
  }
}

export function readUndoableMatch(): UndoableMatch | null {
  if (typeof window === "undefined") return null
  const raw = window.localStorage.getItem(KEY)
  if (raw !== cachedRaw) {
    cachedRaw = raw
    cachedValue = parse(raw)
  }
  return cachedValue
}

export function subscribeUndoableMatch(callback: () => void): () => void {
  window.addEventListener("storage", callback)
  return () => window.removeEventListener("storage", callback)
}

export function readUndoableMatchServerSnapshot(): UndoableMatch | null {
  return null
}
