import { Trophy } from "lucide-react"
import type { SeasonChampion } from "@/lib/types"

/**
 * Celebratory banner for the week after a season ends, announcing that
 * season's champion. Shown alongside the ongoing-season banner (page.tsx,
 * gated by isChampionBannerWindow), not instead of it: the new season
 * starts the instant the old one ends, so there's no moment where "the
 * season" isn't also currently in progress.
 */
export function ChampionBanner({ champion }: { champion: SeasonChampion }) {
  return (
    <div className="w-full h-full rounded-xl px-4 sm:px-8 py-6 sm:py-8 flex items-center justify-center gap-3 sm:gap-4 shadow-sm bg-gradient-to-r from-amber-100 to-amber-200 text-amber-900">
      <Trophy className="size-6 sm:size-8 shrink-0 text-amber-500" />
      <p className="text-lg sm:text-2xl font-semibold text-center leading-snug">
        <span className="font-black">{champion.player.first_name} {champion.player.last_name}</span>
        {" "}a remporté {champion.seasonLabel} avec {champion.elo}{" "}de ELO&nbsp;!
      </p>
    </div>
  )
}
