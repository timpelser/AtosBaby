"use client"

import { useSyncExternalStore, type CSSProperties } from "react"
import { Leaf, Flower, type LucideIcon } from "lucide-react"
import { SEASON_COLOR, type SeasonDef } from "@/lib/seasons"

// Summer has no falling particle at all. Snowflake is the only one left as
// emoji text — flower and leaf are lucide icons instead (see PARTICLE_ICON
// below), both for a color CSS can actually control and, for flower, a
// single unambiguous shape (an emoji daisy risks the same multi-flower
// rendering the fallen-leaf emoji had, depending on the font).
const PARTICLE_GLYPH: Partial<Record<SeasonDef["icon"], string>> = {
  snowflake: "❄",
}

// Icon-based particles: colorable shapes instead of emoji, which bake in
// their own color and ignore the `color` CSS property. Rendered via the
// same <Icon color=... fill=... /> call for both, in the particle map
// below.
const PARTICLE_ICON: Partial<Record<SeasonDef["icon"], LucideIcon>> = {
  flower: Flower,
  leaf: Leaf,
}

// The snowflake glyph is a plain (not full-color) outline character in
// most fonts, so left alone it comes out a dull gray/black — needs an
// explicit color to actually read as ice. Flower and leaf's colors apply
// to their icon component instead of a glyph, but are looked up the same
// way.
const PARTICLE_COLOR: Partial<Record<SeasonDef["icon"], string>> = {
  snowflake: "#38bdf8",
  flower: "#f97316",
  leaf: "#c2703d",
}

type Particle = { left: number; delay: number; duration: number; size: number; drift: number }

function randomParticleField(): Particle[] {
  return Array.from({ length: 18 }, () => ({
    left: Math.random() * 100,
    delay: Math.random() * -14, // negative so particles are already mid-fall on first paint, not all starting at once
    duration: 10 + Math.random() * 8,
    size: 12 + Math.random() * 10,
    drift: (Math.random() - 0.5) * 60,
  }))
}

// Stable empty reference for the server snapshot — a fresh `[]` on every
// call would make useSyncExternalStore think the store changes on every
// render and throw "should be cached to avoid an infinite loop."
const NO_PARTICLES: Particle[] = []

// Populated lazily, once, the first time the client actually asks for it;
// cached in module scope for the rest of the page's lifetime.
let cachedParticles: Particle[] | null = null

function getClientParticles(): Particle[] {
  if (!cachedParticles) cachedParticles = randomParticleField()
  return cachedParticles
}
function getServerParticles(): Particle[] {
  return NO_PARTICLES
}
function subscribe(): () => void {
  return () => {} // nothing external ever changes this after the first read
}

/**
 * Random particle layout. This is server-rendered for the initial HTML, and
 * Math.random() necessarily differs between the server and the client's own
 * first render — seeding it any earlier than this (a useState lazy
 * initializer, a useMemo) makes the server-rendered markup and the client's
 * first render disagree, a real hydration mismatch. useSyncExternalStore is
 * what React itself hands out for exactly this: it renders the server
 * snapshot (empty) through hydration, then swaps to the client snapshot
 * (the real random field) right after — same trick as the identity hook
 * elsewhere in this app, no setState-in-an-effect needed.
 */
function useParticleField(): Particle[] {
  return useSyncExternalStore(subscribe, getClientParticles, getServerParticles)
}

const FRAME_THICKNESS = 6 // how far in from the edge the rounded rect sits
const FRAME_RADIUS = 24 // the curve you actually see, at the inner edge

// A soft highlight sweeping along the border, layered on top of the solid
// frame rather than built into it — the frame's geometry (flush edges,
// filled corners) took real effort to get right, so the shimmer stays a
// separate, purely decorative overlay that can't affect it. It's four
// plain straight bars, not a rounded ring: no border-radius logic of its
// own, since it's just a texture riding on top of a base that's already
// solid color everywhere underneath — any softness at the very corners is
// invisible against that. White reads as a sheen on any season's color
// without per-season tuning.
const SHIMMER_H = "linear-gradient(90deg, transparent, rgba(255,255,255,0.65), transparent)"
const SHIMMER_V = "linear-gradient(180deg, transparent, rgba(255,255,255,0.65), transparent)"

/**
 * Page-wide seasonal decoration: a colored border framing the viewport plus
 * a slow field of falling particles (snow/petals/leaves) matching the
 * current season. Summer has no particle — a sunburst was tried and pulled
 * back for being too much, so summer gets the border alone for now. Purely
 * decorative — pointer-events-none throughout so it never intercepts a
 * click — and the actual animation is disabled globally for
 * prefers-reduced-motion via the `* { animation: none !important }` rule
 * already in globals.css, so there's nothing motion-specific to handle
 * here.
 */
export function SeasonTheme({ season }: { season: SeasonDef | undefined }) {
  const particles = useParticleField()
  if (!season) return null

  return (
    <>
      {/*
        The frame is drawn entirely by an outer box-shadow: this element is
        an invisible rounded rectangle sitting FRAME_THICKNESS in from the
        edges, and the shadow floods everything outside it, out past the
        screen. That one trick covers what nothing else here could manage
        together:
          - the corners stay solid, because the shadow floods them — a
            rounded box's own corner instead cuts color away and exposes a
            gap at the true screen corner;
          - the visible curve is the inner edge, straight from
            border-radius, with none of the mask/clip-path contortions a
            ring needs to round its inner edge independently of its outer
            one (a browser derives the inner corner radius from the outer,
            so a ring's inner curve can never be the larger of the two);
          - it's anchored to the layout viewport, which already stops
            exactly where the scrollbar gutter starts, so the right edge
            lands flush beside the scrollbar. Sizing to the full window
            (window.innerWidth) instead tucks it UNDER the scrollbar, where
            browser chrome paints over it and it disappears.
        The cost is that box-shadow takes a solid color, not a gradient.
      */}
      <div
        aria-hidden
        className="fixed z-[45] pointer-events-none"
        style={{
          inset: FRAME_THICKNESS,
          borderRadius: FRAME_RADIUS,
          boxShadow: `0 0 0 100vmax ${SEASON_COLOR[season.icon]}`,
        }}
      />
      <div aria-hidden className="fixed inset-x-0 top-0 z-[46] pointer-events-none animate-border-shimmer-x" style={{ height: FRAME_THICKNESS, background: SHIMMER_H }} />
      <div aria-hidden className="fixed inset-x-0 bottom-0 z-[46] pointer-events-none animate-border-shimmer-x" style={{ height: FRAME_THICKNESS, background: SHIMMER_H }} />
      <div aria-hidden className="fixed inset-y-0 left-0 z-[46] pointer-events-none animate-border-shimmer-y" style={{ width: FRAME_THICKNESS, background: SHIMMER_V }} />
      <div aria-hidden className="fixed inset-y-0 right-0 z-[46] pointer-events-none animate-border-shimmer-y" style={{ width: FRAME_THICKNESS, background: SHIMMER_V }} />
      {season.icon !== "sun" && (
        <div aria-hidden className="fixed inset-0 z-30 pointer-events-none overflow-hidden">
          {particles.map((p, i) => {
            const style = {
              left: `${p.left}%`,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
              "--season-drift": `${p.drift}px`,
            } as CSSProperties
            const Icon = PARTICLE_ICON[season.icon]
            if (Icon) {
              return (
                <Icon
                  key={i}
                  className="absolute top-[-8%] select-none animate-season-fall"
                  style={{ ...style, width: p.size, height: p.size, color: PARTICLE_COLOR[season.icon] }}
                  fill="currentColor"
                  strokeWidth={1}
                />
              )
            }
            return (
              <span
                key={i}
                className="absolute top-[-8%] select-none animate-season-fall"
                style={{ ...style, fontSize: p.size, color: PARTICLE_COLOR[season.icon] }}
              >
                {PARTICLE_GLYPH[season.icon]}
              </span>
            )
          })}
        </div>
      )}
    </>
  )
}
