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

  // Monday of the current ISO week — used as the unique key per week
  const weekOf = await sql`SELECT date_trunc('week', now())::date AS week_of`
  const week = weekOf[0].week_of as string

  // Find players who have played at least once ever but NOT this week,
  // and haven't already had decay applied this week (idempotent)
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
      WHERE m.played_at >= date_trunc('week', now())
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
