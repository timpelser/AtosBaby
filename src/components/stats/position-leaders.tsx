import type { PositionStats, PlayerStats } from "@/lib/types"

function getInitials(first: string, last: string) {
  return `${first[0]}${last[0]}`.toUpperCase()
}

function PositionLeaderCard({
  stats,
  position,
  overallRank,
}: {
  stats: PositionStats
  position: "attack" | "defense"
  overallRank: number | undefined
}) {
  const isAttack = position === "attack"
  const accentColor = isAttack ? "text-primary" : "text-orange-400"
  const bgAccent = isAttack ? "bg-primary/10 border-primary/20" : "bg-orange-50 border-orange-200"
  const avatarBg = isAttack ? "bg-primary/10 border-primary/30 text-primary" : "bg-orange-100 border-orange-300 text-orange-600"
  const label = isAttack ? "Meilleur Attaquant" : "Meilleur Défenseur"
  const statLabel = isAttack ? "MATCHS GAGNES EN ATTAQUE" : "MATCHS GAGNES EN DEFENSE"
  const icon = isAttack ? (
    // Soccer ball icon
    <svg xmlns="http://www.w3.org/2000/svg" className={`w-6 h-6 ${accentColor}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
    </svg>
  ) : (
    // Shield icon
    <svg xmlns="http://www.w3.org/2000/svg" className={`w-6 h-6 ${accentColor}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  )

  return (
    <div className="flex-1 rounded-2xl bg-card border border-border px-8 py-8 flex flex-col gap-6 shadow-sm relative overflow-hidden">
      {/* Header row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {icon}
          <p className="text-lg font-bold text-foreground leading-tight">{label}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <p className={`text-4xl font-black ${accentColor}`}>{stats.wins}</p>
          <p className="text-[9px] font-semibold tracking-wider text-muted-foreground uppercase leading-tight max-w-[72px]">{statLabel}</p>
        </div>
      </div>

      {/* Player row */}
      <div className={`flex items-center justify-between rounded-xl border px-4 py-3 ${bgAccent}`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-sm font-bold ${avatarBg}`}>
            {getInitials(stats.player.first_name, stats.player.last_name)}
          </div>
          <div>
            <p className="font-semibold text-foreground">
              {stats.player.first_name} {stats.player.last_name}
            </p>
            <p className="text-xs text-muted-foreground">Rang Global: #{overallRank !== undefined ? overallRank : "—"}</p>
          </div>
        </div>
        {icon}
      </div>
    </div>
  )
}

function SkeletonLeaderCard({ position }: { position: "attack" | "defense" }) {
  const isAttack = position === "attack"
  const bgAccent = isAttack ? "bg-primary/10 border-primary/20" : "bg-orange-50 border-orange-200"
  const label = isAttack ? "Meilleur Attaquant" : "Meilleur Défenseur"
  const statLabel = isAttack ? "MATCHS GAGNES EN ATTAQUE" : "MATCHS GAGNES EN DEFENSE"
  const accentColor = isAttack ? "text-primary" : "text-orange-400"
  const icon = isAttack ? (
    <svg xmlns="http://www.w3.org/2000/svg" className={`w-6 h-6 ${accentColor}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" className={`w-6 h-6 ${accentColor}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  )

  return (
    <div className="flex-1 rounded-2xl bg-card border border-border px-8 py-8 flex flex-col gap-6 shadow-sm relative overflow-hidden">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {icon}
          <p className="text-lg font-bold text-foreground leading-tight">{label}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="h-10 w-8 rounded bg-muted animate-pulse" />
          <p className="text-[9px] font-semibold tracking-wider text-muted-foreground uppercase leading-tight max-w-[72px]">{statLabel}</p>
        </div>
      </div>
      <div className={`flex items-center justify-between rounded-xl border px-4 py-3 ${bgAccent}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
          <div className="flex flex-col gap-1.5">
            <div className="h-4 w-28 rounded bg-muted animate-pulse" />
            <div className="h-3 w-20 rounded bg-muted animate-pulse" />
          </div>
        </div>
        {icon}
      </div>
    </div>
  )
}

export function PositionLeaders({ attackerStats, defenderStats, playerStats }: { attackerStats: PositionStats[]; defenderStats: PositionStats[]; playerStats: PlayerStats[] }) {
  const topAttacker = attackerStats[0]
  const topDefender = defenderStats[0]

  const overallRankMap = new Map(playerStats.map((p, i) => [p.player.id, i + 1]))

  if (!topAttacker || !topDefender) return (
    <section>
      <div className="flex flex-col sm:flex-row items-stretch gap-4">
        <SkeletonLeaderCard position="attack" />
        <SkeletonLeaderCard position="defense" />
      </div>
    </section>
  )

  return (
    <section>
      <div className="flex flex-col sm:flex-row items-stretch gap-4">
        <PositionLeaderCard stats={topAttacker} position="attack" overallRank={overallRankMap.get(topAttacker.player.id)} />
        <PositionLeaderCard stats={topDefender} position="defense" overallRank={overallRankMap.get(topDefender.player.id)} />
      </div>
    </section>
  )
}
