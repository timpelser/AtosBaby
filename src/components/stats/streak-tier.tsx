import { cn } from "@/lib/utils"
import { getStreakInfo, type StreakInfo } from "@/lib/streaks"

// ─── Icons ──────────────────────────────────────────────────────────────────
// 24x24 viewBox, stroke-width 2.75, round caps/joins, no fill — per handoff assets.

export function FlameIcon({ className, size = 14 }: { className?: string; size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </svg>
  )
}

export function SnowflakeIcon({ className, size = 14 }: { className?: string; size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 3v18M3 12h18M5.5 5.5l13 13M18.5 5.5l-13 13" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  )
}

// ─── Per-tier style lookup ──────────────────────────────────────────────────
// Every class below is a real Tailwind token (default palette, arbitrary
// values reference Tailwind's own --color-* theme variables — no hardcoded
// hex). Written as full literal strings (not template-built) so Tailwind's
// scanner picks them all up.

type TierStyle = {
  /** Row wrapper: gradient background, border, radius, margin, glow animation. */
  container: string
  /** Avatar chip override; null = caller keeps its own default avatar classes. */
  avatar: string | null
  /** Primary text override (rank/name/victories/total/ratio); null = keep default. */
  lightText: string | null
  /** Secondary/muted column override (défaites); null = keep default. */
  secondaryText: string | null
  /** ELO pill override; null = keep the value-based ELO badge coloring. */
  eloPill: string | null
  badgeText: string
  iconClass: string
  iconSize: number
}

const TIER_STYLES: Record<`${StreakInfo["direction"]}-${StreakInfo["tier"]}`, TierStyle> = {
  "fire-1": {
    container: "relative m-1.5 rounded-[14px] border border-orange-200 shadow-sm bg-[linear-gradient(135deg,var(--color-orange-50),var(--color-white)_70%)]",
    avatar: "bg-orange-400/[0.16] text-orange-800",
    lightText: null,
    secondaryText: null,
    eloPill: null,
    badgeText: "text-orange-800",
    iconClass: "stroke-orange-600",
    iconSize: 14,
  },
  "fire-2": {
    container: "relative overflow-hidden m-1.5 rounded-[14px] border border-orange-300 bg-[linear-gradient(135deg,var(--color-orange-100),var(--color-orange-50)_60%)] animate-fire-glow-2",
    avatar: "bg-orange-400/[0.22] text-orange-800",
    lightText: null,
    secondaryText: null,
    eloPill: null,
    badgeText: "text-orange-800",
    iconClass: "stroke-orange-600 animate-flame-flicker-2",
    iconSize: 15,
  },
  "fire-3": {
    container: "relative z-[1] overflow-hidden m-1.5 rounded-[14px] border border-orange-800 bg-[linear-gradient(135deg,var(--color-orange-300),var(--color-orange-600)_55%,var(--color-orange-800))] animate-fire-glow-3",
    avatar: "bg-white/25 text-orange-50",
    lightText: "text-orange-50",
    secondaryText: "text-orange-50/70",
    eloPill: "bg-white/25 text-orange-50",
    badgeText: "text-orange-50 [text-shadow:0_0_10px_color-mix(in_srgb,var(--color-orange-200)_70%,transparent)]",
    iconClass: "text-orange-50 animate-flame-flicker-3",
    iconSize: 16,
  },
  "ice-1": {
    container: "relative m-1.5 rounded-[14px] border border-sky-200 shadow-sm bg-[linear-gradient(135deg,var(--color-sky-50),var(--color-white)_70%)]",
    avatar: "bg-sky-100 text-sky-800",
    lightText: null,
    secondaryText: null,
    eloPill: null,
    badgeText: "text-sky-800",
    iconClass: "stroke-sky-700",
    iconSize: 14,
  },
  "ice-2": {
    container: "relative overflow-hidden m-1.5 rounded-[14px] border border-sky-300 bg-[linear-gradient(135deg,var(--color-sky-100),var(--color-sky-50)_60%)] animate-ice-glow-2",
    avatar: "bg-white/60 text-sky-800",
    lightText: null,
    secondaryText: null,
    eloPill: null,
    badgeText: "text-sky-800",
    iconClass: "text-sky-700 animate-frost-shimmer-2",
    iconSize: 15,
  },
  "ice-3": {
    container: "relative z-[1] overflow-hidden m-1.5 rounded-[14px] border border-sky-900 bg-[linear-gradient(135deg,var(--color-sky-500),var(--color-sky-700)_55%,var(--color-sky-900))] animate-ice-glow-3",
    avatar: "bg-white/25 text-orange-50",
    // Tier 3 text stays warm-white on both fire and ice — sky-50 would wash
    // out against the dark blue gradient's cool cast (per handoff README).
    lightText: "text-orange-50",
    secondaryText: "text-orange-50/70",
    eloPill: "bg-white/25 text-orange-50",
    badgeText: "text-orange-50 [text-shadow:0_0_10px_color-mix(in_srgb,var(--color-sky-200)_70%,transparent)]",
    iconClass: "text-orange-50 animate-frost-shimmer-3",
    iconSize: 16,
  },
}

export function getTierStyle(info: StreakInfo | null): TierStyle | null {
  if (!info) return null
  return TIER_STYLES[`${info.direction}-${info.tier}`]
}

// ─── Streak badge ───────────────────────────────────────────────────────────

export function StreakBadge({ streak, className }: { streak: number; className?: string }) {
  const info = getStreakInfo(streak)
  const style = getTierStyle(info)

  if (!info || !style) return null

  const Icon = info.direction === "fire" ? FlameIcon : SnowflakeIcon

  return (
    <span className={cn("flex items-center gap-1 text-[13px] font-extrabold shrink-0 whitespace-nowrap", style.badgeText, className)}>
      {Math.abs(streak)}
      <Icon size={style.iconSize} className={style.iconClass} />
    </span>
  )
}

// ─── Ambient spark/frost particles (tier 2 & 3) ────────────────────────────

type ParticleConfig = { left: string; top: string; size: number; duration: number; delay: number; color: string }

const FIRE_PARTICLES: Record<2 | 3, ParticleConfig[]> = {
  2: [
    { left: "68%", top: "22%", size: 5, duration: 2.6, delay: -0.3, color: "bg-orange-200" },
    { left: "76%", top: "70%", size: 4, duration: 3.1, delay: -1.4, color: "bg-orange-100" },
    { left: "84%", top: "38%", size: 6, duration: 2.8, delay: -0.7, color: "bg-orange-200" },
    { left: "90%", top: "78%", size: 4, duration: 3.4, delay: -2.1, color: "bg-orange-100" },
    { left: "95%", top: "20%", size: 5, duration: 2.4, delay: -1.0, color: "bg-orange-200" },
  ],
  3: [
    { left: "44%", top: "18%", size: 7, duration: 2.1, delay: -0.4, color: "bg-orange-100" },
    { left: "52%", top: "64%", size: 5, duration: 2.7, delay: -1.7, color: "bg-orange-50" },
    { left: "60%", top: "32%", size: 6, duration: 2.3, delay: -0.9, color: "bg-orange-200" },
    { left: "67%", top: "78%", size: 5, duration: 2.9, delay: -2.3, color: "bg-orange-100" },
    { left: "75%", top: "22%", size: 6, duration: 2.0, delay: -1.2, color: "bg-orange-50" },
    { left: "82%", top: "56%", size: 5, duration: 2.5, delay: -0.2, color: "bg-orange-200" },
    { left: "89%", top: "80%", size: 7, duration: 2.2, delay: -1.9, color: "bg-orange-100" },
    { left: "95%", top: "38%", size: 5, duration: 2.8, delay: -0.6, color: "bg-orange-50" },
    { left: "40%", top: "86%", size: 5, duration: 2.4, delay: -1.5, color: "bg-orange-200" },
  ],
}

const ICE_PARTICLES: Record<2 | 3, ParticleConfig[]> = {
  2: [
    { left: "68%", top: "24%", size: 5, duration: 2.9, delay: -0.5, color: "bg-sky-300" },
    { left: "76%", top: "66%", size: 4, duration: 3.3, delay: -1.8, color: "bg-sky-100" },
    { left: "83%", top: "40%", size: 6, duration: 3.0, delay: -1.1, color: "bg-sky-300" },
    { left: "89%", top: "76%", size: 4, duration: 3.6, delay: -2.4, color: "bg-sky-100" },
    { left: "94%", top: "24%", size: 5, duration: 2.7, delay: -0.8, color: "bg-sky-300" },
  ],
  3: [
    { left: "44%", top: "18%", size: 7, duration: 2.4, delay: -0.6, color: "bg-sky-100" },
    { left: "52%", top: "62%", size: 5, duration: 2.9, delay: -1.9, color: "bg-sky-50" },
    { left: "60%", top: "32%", size: 6, duration: 2.6, delay: -1.0, color: "bg-sky-300" },
    { left: "67%", top: "78%", size: 5, duration: 3.1, delay: -2.5, color: "bg-sky-100" },
    { left: "75%", top: "22%", size: 6, duration: 2.3, delay: -1.3, color: "bg-sky-50" },
    { left: "82%", top: "58%", size: 5, duration: 2.8, delay: -0.3, color: "bg-sky-300" },
    { left: "89%", top: "80%", size: 7, duration: 2.5, delay: -2.0, color: "bg-sky-100" },
    { left: "95%", top: "38%", size: 5, duration: 3.0, delay: -0.7, color: "bg-sky-50" },
    { left: "40%", top: "86%", size: 5, duration: 2.7, delay: -1.6, color: "bg-sky-300" },
  ],
}

export function TierParticles({ info }: { info: StreakInfo | null }) {
  if (!info || info.tier === 1) return null
  const particles = (info.direction === "fire" ? FIRE_PARTICLES : ICE_PARTICLES)[info.tier]
  const animClass = info.direction === "fire" ? "animate-ember-field" : "animate-frost-field"

  return (
    <>
      {particles.map((p, i) => (
        <span
          key={i}
          aria-hidden="true"
          className={cn("absolute pointer-events-none rounded-full", p.color, animClass)}
          style={{
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </>
  )
}
