import type { PlayerStats } from "@/lib/types"

function getInitials(first: string, last: string) {
  return `${first[0]}${last[0]}`.toUpperCase()
}

function ChampionCard({ stats }: { stats: PlayerStats }) {
  return (
    <div className="relative flex-1 rounded-2xl bg-primary px-8 py-8 flex flex-col items-center justify-center gap-6 shadow-2xl min-h-64 overflow-hidden">
      {/* Background rank */}
      <span className="absolute right-6 top-4 text-[7rem] font-black text-white/10 leading-none select-none">
        #1
      </span>

      {/* Row 1: Avatar + name */}
      <div className="flex flex-col items-center gap-6 z-10">
        <div className="w-16 h-16 rounded-full bg-white/20 border-2 border-white/40 text-white flex items-center justify-center text-lg font-bold">
          {getInitials(stats.player.first_name, stats.player.last_name)}
        </div>
        <p className="text-3xl font-bold text-white leading-snug text-center">
          {stats.player.first_name} {stats.player.last_name}
        </p>
      </div>

      {/* Row 2: Stats */}
      <div className="flex gap-6 z-10">
        <div className="text-center">
          <p className="text-xs font-semibold tracking-widest text-white/60 uppercase">Victoires</p>
          <p className="text-3xl font-bold text-white">{stats.wins}</p>
        </div>
        <div className="text-center">
          <p className="text-xs font-semibold tracking-widest text-white/60 uppercase">Défaites</p>
          <p className="text-3xl font-bold text-white">{stats.losses}</p>
        </div>
        <div className="text-center">
          <p className="text-xs font-semibold tracking-widest text-white/60 uppercase">Ratio</p>
          <p className="text-3xl font-bold text-white">{stats.win_rate.toFixed(0)}%</p>
        </div>
        <div className="text-center">
          <p className="text-xs font-semibold tracking-widest text-white/60 uppercase">Wilson</p>
          <p className="text-3xl font-bold text-white">{(stats.wilson_score * 100).toFixed(0)}%</p>
        </div>
      </div>
    </div>
  )
}

function RunnerUpCard({ stats, rank }: { stats: PlayerStats; rank: 2 | 3 }) {
  const isSecond = rank === 2
  const rankColor = isSecond ? "text-primary" : "text-orange-400"

  return (
    <div className="flex-1 rounded-2xl bg-card border border-border px-8 py-8 flex flex-col items-center justify-center gap-6 shadow-sm relative overflow-hidden min-h-64">
      {/* Background rank */}
      <span className={`absolute right-6 top-4 text-[7rem] font-black opacity-10 leading-none select-none ${rankColor}`}>
        #{rank}
      </span>

      {/* Row 1: Avatar + name */}
      <div className="flex flex-col items-center gap-6 z-10">
        <div className="w-16 h-16 rounded-full bg-muted border-2 border-border text-muted-foreground flex items-center justify-center text-lg font-bold">
          {getInitials(stats.player.first_name, stats.player.last_name)}
        </div>
        <p className="text-3xl text-foreground leading-snug text-center">
          {stats.player.first_name} {stats.player.last_name}
        </p>
      </div>

      {/* Row 2: Stats */}
      <div className="flex gap-6 z-10">
        <div className="text-center">
          <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Victoires</p>
          <p className="text-3xl text-foreground">{stats.wins}</p>
        </div>
        <div className="text-center">
          <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Défaites</p>
          <p className="text-3xl text-foreground">{stats.losses}</p>
        </div>
        <div className="text-center">
          <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Ratio</p>
          <p className="text-3xl text-foreground">{stats.win_rate.toFixed(0)}%</p>
        </div>
        <div className="text-center">
          <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Wilson</p>
          <p className="text-3xl text-foreground">{(stats.wilson_score * 100).toFixed(0)}%</p>
        </div>
      </div>
    </div>
  )
}

function SkeletonChampionCard() {
  return (
    <div className="relative flex-1 rounded-2xl bg-primary px-8 py-8 flex flex-col items-center justify-center gap-6 shadow-2xl min-h-64 overflow-hidden">
      <span className="absolute right-6 top-4 text-[7rem] font-black text-white/10 leading-none select-none">#1</span>
      <div className="flex flex-col items-center gap-4 z-10">
        <div className="w-16 h-16 rounded-full bg-white/20 border-2 border-white/40" />
        <div className="flex flex-col items-center gap-2">
          <div className="h-5 w-36 rounded bg-white/20 animate-pulse" />
        </div>
      </div>
      <div className="flex gap-6 z-10">
        {[1, 2, 3, 4].map((k) => (
          <div key={k} className="text-center flex flex-col items-center gap-1">
            <div className="h-3 w-14 rounded bg-white/20 animate-pulse" />
            <div className="h-8 w-10 rounded bg-white/20 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}

function SkeletonRunnerUpCard({ rank }: { rank: 2 | 3 }) {
  const rankColor = rank === 2 ? "text-primary" : "text-orange-400"
  return (
    <div className="flex-1 rounded-2xl bg-card border border-border px-8 py-8 flex flex-col items-center justify-center gap-6 shadow-sm relative overflow-hidden min-h-64">
      <span className={`absolute right-6 top-4 text-[7rem] font-black opacity-10 leading-none select-none ${rankColor}`}>#{rank}</span>
      <div className="flex flex-col items-center gap-4 z-10">
        <div className="w-16 h-16 rounded-full bg-muted border-2 border-border" />
        <div className="flex flex-col items-center gap-2">
          <div className="h-5 w-36 rounded bg-muted animate-pulse" />
        </div>
      </div>
      <div className="flex gap-6 z-10">
        {[1, 2, 3, 4].map((k) => (
          <div key={k} className="text-center flex flex-col items-center gap-1">
            <div className="h-3 w-14 rounded bg-muted animate-pulse" />
            <div className="h-8 w-10 rounded bg-muted animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function TopPlayersPodium({ playerStats }: { playerStats: PlayerStats[] }) {
  const top3 = playerStats.slice(0, 3)
  const [first, second, third] = top3

  if (!first) return (
    <section>
      <div className="flex flex-col sm:flex-row items-stretch gap-4">
        <div className="order-2 sm:order-1 flex-1 flex flex-col"><SkeletonRunnerUpCard rank={2} /></div>
        <div className="order-1 sm:order-2 flex-1 flex flex-col"><SkeletonChampionCard /></div>
        <div className="order-3 sm:order-3 flex-1 flex flex-col"><SkeletonRunnerUpCard rank={3} /></div>
      </div>
    </section>
  )

  return (
    <section>
      {/* On mobile: column, #1 on top. On desktop: row, #1 in center via order */}
      <div className="flex flex-col sm:flex-row items-stretch gap-4">
        {second && <div className="order-2 sm:order-1 flex-1 flex flex-col"><RunnerUpCard stats={second} rank={2} /></div>}
        <div className="order-1 sm:order-2 flex-1 flex flex-col"><ChampionCard stats={first} /></div>
        {third && <div className="order-3 sm:order-3 flex-1 flex flex-col"><RunnerUpCard stats={third} rank={3} /></div>}
      </div>
    </section>
  )
}
