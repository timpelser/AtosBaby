import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { recomputeAllElos } from "@/lib/actions"
import { getMostRecentlyEndedSeason } from "@/lib/seasons"
import { revalidatePath } from "next/cache"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  // Vercel automatically sends Authorization: Bearer <CRON_SECRET>
  const authHeader = req.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Real seasons run for months, so the "a season just ended" path can't be
  // reached at all by just waiting — the ?now= override lets tests fabricate
  // that moment (see e2e/tests/zz-season-transition.spec.ts) without being
  // reachable on the real deployed app. Gated on VERCEL_ENV, not NODE_ENV:
  // the e2e suite's CI run deliberately does `next build && next start` for
  // realism/speed (see playwright.config.ts), which — same as the real
  // deploy — sets NODE_ENV=production, so that check would have made this
  // override dead in the one place it's actually needed. VERCEL_ENV is
  // Vercel's own platform variable, set to "production" only on an actual
  // production deployment there — absent entirely in CI/local, whatever
  // NODE_ENV says.
  const nowOverride = process.env.VERCEL_ENV !== "production" ? req.nextUrl.searchParams.get("now") : null
  const now = nowOverride ? new Date(nowOverride) : new Date()

  const season = getMostRecentlyEndedSeason(now)
  if (!season) {
    return NextResponse.json({ transitioned: false, reason: "no_completed_season" })
  }

  // Idempotent: season_key is UNIQUE, so a second run the same day (or any
  // day before the *next* season also ends) is a no-op past this point.
  // This deliberately only ever looks at the single most recently ended
  // season — if the job somehow doesn't run for over three months and two
  // boundaries are crossed unseen, the skipped one's champion is lost rather
  // than reconstructed from history. Not a real risk at this cadence, just
  // a known simplification.
  const already = await sql`SELECT 1 FROM season_champions WHERE season_key = ${season.key}`
  if (already.length > 0) {
    return NextResponse.json({ transitioned: false, reason: "already_recorded", season: season.key })
  }

  // Snapshot the champion using elo as it stands right now — this must run
  // BEFORE recomputeAllElos touches anything, since that's what actually
  // performs the reset (see actions.ts: recomputeAllElos scopes its replay
  // to whichever season is current *at call time*, so calling it after
  // inserting this row naturally resets everyone to 1000 for the new
  // season with no separate UPDATE needed here).
  const leader = await sql`
    SELECT id::text, elo FROM players ORDER BY elo DESC LIMIT 1
  `
  if (leader.length === 0) {
    return NextResponse.json({ transitioned: false, reason: "no_players" })
  }

  await sql`
    INSERT INTO season_champions (season_key, season_label, player_id, elo)
    VALUES (${season.key}, ${season.label}, ${leader[0].id as string}::uuid, ${Number(leader[0].elo)})
    ON CONFLICT (season_key) DO NOTHING
  `

  await recomputeAllElos(now)
  revalidatePath("/")

  return NextResponse.json({
    transitioned: true,
    season: season.key,
    champion: leader[0].id,
    elo: Number(leader[0].elo),
  })
}
