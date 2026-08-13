import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { recomputeAllElos } from "@/lib/actions"
import { revalidatePath } from "next/cache"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  // Vercel automatically sends Authorization: Bearer <CRON_SECRET>
  const authHeader = req.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // We evaluate the most recently COMPLETED ISO week, not "the week `now()`
  // falls in" — this job is scheduled for shortly after that week ends
  // (02:00 UTC Monday), but cron execution time is never exact. If we asked
  // "since the start of whichever week now() is in," a late-firing run that
  // slips past the Monday-00:00 boundary would suddenly be judging a
  // brand-new week nobody has had a chance to play in yet — which is
  // exactly what happened once (every active player got wrongly decayed;
  // see the incident write-up). Anchoring to "one full week before the
  // current truncated week" instead means the job is correct for anywhere
  // from just after the boundary up to nearly a week later, not just
  // within the same minute of it.
  // Cast to ::text explicitly — the driver parses plain `date` columns into
  // JS Date objects using the LOCAL TIMEZONE OF WHATEVER RUNTIME IS PARSING
  // THEM (not UTC), which is a real footgun for a type that has no
  // timezone concept in the first place. Keeping these as plain
  // "YYYY-MM-DD" strings the whole way through sidesteps that class of bug
  // entirely — the same class as the incident this fix addresses, just one
  // layer down the stack.
  const bounds = await sql`
    SELECT
      (date_trunc('week', now()) - interval '7 days')::date::text AS week_start,
      date_trunc('week', now())::date::text AS week_end
  `
  const weekStart = bounds[0].week_start as string
  const weekEnd = bounds[0].week_end as string
  const week = weekStart // the completed week's Monday — unique key per week

  // Find players who have played at least once ever but NOT during that
  // completed week, and haven't already had decay applied for it (idempotent)
  const inactive = await sql`
    SELECT p.id::text, p.elo
    FROM players p
    WHERE p.id IN (
      SELECT DISTINCT player_id FROM match_players
    )
    AND p.id NOT IN (
      SELECT DISTINCT mp.player_id
      FROM match_players mp
      JOIN matches m ON m.id = mp.match_id
      WHERE m.played_at >= ${weekStart} AND m.played_at < ${weekEnd}
    )
    AND p.id NOT IN (
      SELECT player_id FROM elo_decay_events WHERE week_of = ${week}
    )
  `

  if (inactive.length === 0) {
    return NextResponse.json({ applied: 0, week_of: week })
  }

  // Insert decay events and update player ELOs
  for (const player of inactive) {
    const eloBefore = Number(player.elo)
    const eloAfter = eloBefore - 10

    await sql`
      INSERT INTO elo_decay_events (player_id, week_of, points, elo_before, elo_after)
      VALUES (${player.id as string}::uuid, ${week}, -10, ${eloBefore}, ${eloAfter})
      ON CONFLICT (player_id, week_of) DO NOTHING
    `

    await sql`
      UPDATE players SET elo = ${eloAfter} WHERE id = ${player.id as string}::uuid
    `
  }

  // Recompute from scratch to keep match_players.elo_before/after consistent
  await recomputeAllElos()
  revalidatePath("/")

  return NextResponse.json({
    applied: inactive.length,
    week_of: week,
    players: inactive.map(p => p.id),
  })
}
