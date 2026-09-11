// Seasons — pure date logic, no DB access. Dates are the real astronomical
// solstice/equinox dates the user specified, fixed for this cycle rather
// than recomputed year to year (same one-off-hardcoded-date pattern as
// ELO_ERA_CUTOFF / INDIVIDUAL_ELO_CUTOFF in actions.ts). Extending past
// Printemps 2027 requires adding a new entry by hand when the time comes —
// getCurrentSeason() returns undefined outside any defined range rather than
// guessing, and every call site is expected to degrade gracefully when that
// happens (no border/animation, no countdown, recomputeAllElos falls back
// to its pre-seasons all-time behavior).
//
// Dates are plain "YYYY-MM-DD" — parsed as UTC midnight, same convention the
// rest of the app already uses for fixed cutoff dates. This app has no
// players outside Europe, and a season boundary being off by the few hours
// of a timezone offset around midnight isn't worth the complexity of real
// timezone-aware date math for a foosball leaderboard.

export type SeasonIcon = "sun" | "leaf" | "snowflake" | "flower"

// One color per season — the single source the page border (season-theme.tsx),
// the season banner (season-banner.tsx), and "Derniers champions"
// (dernier-champion-card.tsx) all derive their palette from. They used to
// each keep their own, independently chosen, and drifted out of sync (a
// grass-green border next to a lime-tinted card, an orange border next to an
// amber card); this is the fix.
export const SEASON_COLOR: Record<SeasonIcon, string> = {
  snowflake: "#7dd3fc",
  flower: "#65a30d",
  sun: "#fb923c",
  leaf: "#c2703d",
}

export type SeasonDef = {
  key: string
  label: string
  icon: SeasonIcon
  start: Date
  end: Date // exclusive — the instant the next season begins
}

export const SEASONS: SeasonDef[] = [
  {
    key: "ete-2026",
    label: "Été 2026",
    icon: "sun",
    start: new Date("2026-06-21T00:00:00Z"),
    end: new Date("2026-09-23T00:00:00Z"), // up to and including 22 sept.
  },
  {
    key: "automne-2026",
    label: "Automne 2026",
    icon: "leaf",
    start: new Date("2026-09-23T00:00:00Z"),
    end: new Date("2026-12-21T00:00:00Z"), // up to and including 20 déc.
  },
  {
    key: "hiver-2026",
    label: "Hiver 2026",
    icon: "snowflake",
    start: new Date("2026-12-21T00:00:00Z"),
    end: new Date("2027-03-20T00:00:00Z"), // up to and including 19 mars
  },
  {
    key: "printemps-2027",
    label: "Printemps 2027",
    icon: "flower",
    start: new Date("2027-03-20T00:00:00Z"),
    end: new Date("2027-06-21T00:00:00Z"), // up to and including 20 juin
  },
]

/** The season `now` falls in, or undefined if we've run out of defined seasons. */
export function getCurrentSeason(now: Date = new Date()): SeasonDef | undefined {
  return SEASONS.find(s => now >= s.start && now < s.end)
}

/** The current season's start instant — recomputeAllElos uses this to scope its replay. Undefined when there's no current season. */
export function getCurrentSeasonStart(now: Date = new Date()): Date | undefined {
  return getCurrentSeason(now)?.start
}

/** Whole days left in the current season, rounded up so "a few hours left" still reads as 1, not 0. */
export function daysRemaining(season: SeasonDef, now: Date = new Date()): number {
  return Math.max(0, Math.ceil((season.end.getTime() - now.getTime()) / 86_400_000))
}

/** Every season whose end has already passed, most recently ended first. */
export function getPastSeasons(now: Date = new Date()): SeasonDef[] {
  return SEASONS.filter(s => s.end <= now).sort((a, b) => b.end.getTime() - a.end.getTime())
}

/** The single most recently completed season, if any. */
export function getMostRecentlyEndedSeason(now: Date = new Date()): SeasonDef | undefined {
  return getPastSeasons(now)[0]
}

const CHAMPION_BANNER_WINDOW_MS = 7 * 86_400_000

/**
 * True for the week immediately after a season ends — the window during
 * which the champion banner (champion-banner.tsx) shows on the homepage
 * alongside the ongoing-season banner, celebrating whoever just won. This
 * was cut from the original plan in favor of the permanent "Dernier
 * champion" card, then brought back to run alongside it rather than
 * instead of it once the champion banner itself was actually built and
 * looked at.
 */
export function isChampionBannerWindow(now: Date = new Date()): boolean {
  const ended = getMostRecentlyEndedSeason(now)
  return ended !== undefined && now.getTime() - ended.end.getTime() <= CHAMPION_BANNER_WINDOW_MS
}

/**
 * The icon for a season LABEL, matched by its French season name rather
 * than a lookup against SEASONS — a past champion's seasonLabel (e.g.
 * "Hiver 2025") can name a year that isn't in that array at all, since it's
 * historical data older than this cycle's four entries. The name alone
 * (Été/Automne/Hiver/Printemps) is enough; the year doesn't change the icon.
 */
export function iconForSeasonLabel(label: string): SeasonIcon {
  if (label.startsWith("Été")) return "sun"
  if (label.startsWith("Automne")) return "leaf"
  if (label.startsWith("Hiver")) return "snowflake"
  return "flower" // Printemps, and the safe default for anything unrecognized
}
