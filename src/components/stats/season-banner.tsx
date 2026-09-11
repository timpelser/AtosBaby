"use client"

import { useSyncExternalStore } from "react"
import { Sun, Leaf, Snowflake, Flower2 } from "lucide-react"
import { SEASON_COLOR, type SeasonDef } from "@/lib/seasons"

const ICONS = { sun: Sun, leaf: Leaf, snowflake: Snowflake, flower: Flower2 }

function pad(n: number): string {
  return String(n).padStart(2, "0")
}

function formatCountdown(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const days = Math.floor(totalSeconds / 86_400)
  const hours = Math.floor((totalSeconds % 86_400) / 3_600)
  const minutes = Math.floor((totalSeconds % 3_600) / 60)
  const seconds = totalSeconds % 60
  return `${pad(days)}:${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
}

// A live-ticking wall clock, not a value derivable at render time — this is
// exactly the kind of always-changing external state useSyncExternalStore is
// meant for (same idiom as the particle field / window size elsewhere in
// this app): server and client can never agree on "the current instant" to
// the second, so this renders a stable placeholder through SSR and
// hydration, then swaps to the real ticking value immediately once the
// client has actually mounted and can own a timer.
//
// getSnapshot has to return a value that's stable BETWEEN ticks, not
// Date.now() fresh on every call — useSyncExternalStore calls it more than
// once per render to check for tearing, and Date.now() is a different
// number essentially every call, which reads as "the store changed during
// render" and throws it into an infinite re-render loop. Caching it to a
// value only the interval callback updates (same fix as the particle
// field's stable empty-array reference) is what makes it well-behaved.
let cachedNow = Date.now()
function subscribeClock(callback: () => void): () => void {
  const id = setInterval(() => {
    cachedNow = Date.now()
    callback()
  }, 1000)
  return () => clearInterval(id)
}
function getClockSnapshot(): number {
  return cachedNow
}
function getServerClockSnapshot(): number | null {
  return null
}
function useNow(): number | null {
  return useSyncExternalStore(subscribeClock, getClockSnapshot, getServerClockSnapshot)
}

export function SeasonBanner({ season }: { season: SeasonDef }) {
  const Icon = ICONS[season.icon]
  const color = SEASON_COLOR[season.icon]
  const now = useNow()
  const countdown = now === null ? null : formatCountdown(Math.max(0, season.end.getTime() - now))

  return (
    <div
      className="w-full rounded-xl px-4 sm:px-8 py-6 sm:py-8 flex items-center justify-between gap-4 shadow-sm"
      style={{
        // Same color-mix-from-SEASON_COLOR approach as the border and the
        // "Derniers champions" rows — one source of truth, so this banner
        // can't drift into its own palette either.
        background: `linear-gradient(to right, color-mix(in srgb, ${color} 18%, white), color-mix(in srgb, ${color} 32%, white))`,
        color: `color-mix(in srgb, ${color} 60%, black)`,
      }}
    >
      <div className="flex items-center gap-2 sm:gap-3 font-semibold text-lg sm:text-2xl">
        <Icon className="size-6 sm:size-8 shrink-0" />
        <span>{season.label}</span>
      </div>
      <div className="font-mono text-xl sm:text-3xl font-bold tabular-nums tracking-wider">
        {countdown ?? "--:--:--:--"}
      </div>
    </div>
  )
}
