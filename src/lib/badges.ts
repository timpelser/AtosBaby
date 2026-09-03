// Milestone badges — pure computation, no DB access (see actions.ts's
// getPlayerBadges for the query side). Kept separate the same way
// streaks.ts/teams.ts are: a plain function over already-fetched data,
// easy to reason about and to test independently of the database.
//
// Two badges (Champion, Sur le podium) depend on the not-yet-built Seasons
// feature — there's no season data to check yet, so they're always
// returned locked with no progress. They'll start unlocking once seasons
// ship; nothing here needs to change for that.

export type BadgeCategory =
  | "participation"
  | "streaks"
  | "scoreline"
  | "upsets"
  | "position"
  | "rivalries"
  | "season"
  | "fun"

export type BadgeDef = {
  id: string
  name: string
  description: string
  category: BadgeCategory
}

export type BadgeStatus = BadgeDef & {
  earned: boolean
  earnedAt: string | null
  progress: { current: number; target: number } | null
}

export const BADGE_DEFS: BadgeDef[] = [
  // participation & wins
  { id: "premier-match", name: "Premier match", description: "Jouer votre premier match.", category: "participation" },
  { id: "habitue", name: "Habitué", description: "25 matchs joués.", category: "participation" },
  { id: "pilier", name: "Pilier", description: "50 matchs joués.", category: "participation" },
  { id: "veteran", name: "Vétéran", description: "100 matchs joués.", category: "participation" },
  { id: "legende", name: "Légende", description: "200 matchs joués.", category: "participation" },
  { id: "premiere-victoire", name: "Première victoire", description: "Remporter votre premier match.", category: "participation" },
  { id: "chasseur-de-trophees", name: "Chasseur de trophées", description: "50 victoires.", category: "participation" },
  { id: "centurion", name: "Centurion", description: "100 victoires.", category: "participation" },
  // streaks
  { id: "en-feu", name: "En feu", description: "Atteindre une série de 5 victoires.", category: "streaks" },
  { id: "sur-une-lancee", name: "Sur une lancée", description: "Atteindre une série de 8 victoires.", category: "streaks" },
  { id: "intouchable", name: "Intouchable", description: "Atteindre une série de 11 victoires ou plus.", category: "streaks" },
  { id: "traversee-du-desert", name: "Traversée du désert", description: "Subir une série de 5 défaites.", category: "streaks" },
  // scoreline flavor
  { id: "no-mercy", name: "No Mercy", description: "Gagner un match 10-0.", category: "scoreline" },
  { id: "super-loser", name: "Super Loser", description: "Perdre un match 0-10.", category: "scoreline" },
  { id: "le-bourreau", name: "Le Bourreau", description: "Gagner 10-0 cinq fois dans votre carrière.", category: "scoreline" },
  { id: "sur-le-fil", name: "Sur le fil", description: "Gagner un match 10-9.", category: "scoreline" },
  { id: "coeur-brise", name: "Cœur brisé", description: "Perdre un match 9-10.", category: "scoreline" },
  // upsets & rating
  { id: "chasseur-de-geants", name: "Chasseur de géants", description: "Battre un adversaire avec 150 ELO ou plus d'avance sur vous.", category: "upsets" },
  { id: "regicide", name: "Régicide", description: "Battre le joueur classé n°1 au moment du match.", category: "upsets" },
  { id: "chute-libre", name: "Chute libre", description: "Descendre sous les 850 ELO après avoir dépassé les 1000.", category: "upsets" },
  { id: "elite", name: "Élite", description: "Atteindre 1200 ELO.", category: "upsets" },
  // position specialists
  { id: "muraille", name: "Muraille", description: "20 victoires en défense.", category: "position" },
  { id: "buteur", name: "Buteur", description: "20 victoires en attaque.", category: "position" },
  { id: "polyvalent", name: "Polyvalent", description: "Au moins 10 victoires en attaque et 10 en défense.", category: "position" },
  // rivalries
  { id: "nemesis", name: "Némésis", description: "Affronter le même adversaire 10 fois.", category: "rivalries" },
  { id: "bete-noire", name: "Bête noire", description: "Battre le même adversaire 10 fois.", category: "rivalries" },
  { id: "revanche", name: "Revanche", description: "Battre un adversaire juste après avoir perdu contre lui.", category: "rivalries" },
  // season (locked until Seasons ships — see module comment)
  { id: "champion", name: "Champion", description: "Terminer une saison à la 1ère place.", category: "season" },
  { id: "sur-le-podium", name: "Sur le podium", description: "Terminer une saison dans le top 3.", category: "season" },
  // fun
  { id: "oiseau-de-nuit", name: "Oiseau de nuit", description: "Jouer un match enregistré après 22h.", category: "fun" },
]

export type BadgeMatchMember = {
  playerId: string
  team: "A" | "B"
  position: "attack" | "defense"
  eloBefore: number
  eloAfter: number
}

export type BadgeMatch = {
  id: string
  playedAt: string
  scoreA: number
  scoreB: number
  members: BadgeMatchMember[]
}

export type BadgeDecay = {
  playerId: string
  appliedAt: string
  eloAfter: number | null
}

function iso(ms: number): string {
  return new Date(ms).toISOString()
}

/**
 * Computes every badge's status for one player from the full match +
 * decay history (all players, not just this one — some badges, like
 * Régicide, need to know what everyone else's ELO was doing too).
 */
export function computeBadges(params: {
  playerId: string
  matches: BadgeMatch[]
  decays: BadgeDecay[]
}): BadgeStatus[] {
  const { playerId } = params
  const matches = [...params.matches].sort((a, b) => new Date(a.playedAt).getTime() - new Date(b.playedAt).getTime())
  const decays = [...params.decays].sort((a, b) => new Date(a.appliedAt).getTime() - new Date(b.appliedAt).getTime())

  // ── Global leader tracking (for Régicide) ──────────────────────────────
  // Replay every match + decay in chronological order using the ELO values
  // already stored on each row (no need to re-derive the formula here),
  // recording who was in front — among players who'd played at least once
  // — immediately before each match.
  type TimelineEvent =
    | { kind: "match"; at: number; match: BadgeMatch }
    | { kind: "decay"; at: number; decay: BadgeDecay }
  const timeline: TimelineEvent[] = [
    ...matches.map(m => ({ kind: "match" as const, at: new Date(m.playedAt).getTime(), match: m })),
    ...decays.map(d => ({ kind: "decay" as const, at: new Date(d.appliedAt).getTime(), decay: d })),
  ].sort((a, b) => a.at - b.at)

  const knownElo = new Map<string, number>()
  const leaderBeforeMatch = new Map<string, string | null>()

  for (const event of timeline) {
    if (event.kind === "match") {
      let leader: string | null = null
      let leaderElo = -Infinity
      for (const [id, elo] of knownElo) {
        if (elo > leaderElo) {
          leaderElo = elo
          leader = id
        }
      }
      leaderBeforeMatch.set(event.match.id, leader)
      for (const m of event.match.members) knownElo.set(m.playerId, m.eloAfter)
    } else if (event.decay.eloAfter != null) {
      knownElo.set(event.decay.playerId, event.decay.eloAfter)
    }
  }

  // ── This player's own matches, chronological ───────────────────────────
  type OwnMatch = {
    id: string
    playedAt: string
    won: boolean
    position: "attack" | "defense"
    scoreFor: number
    scoreAgainst: number
    opponents: BadgeMatchMember[]
    eloBefore: number
    eloAfter: number
  }

  const own: OwnMatch[] = []
  for (const m of matches) {
    const mine = m.members.find(x => x.playerId === playerId)
    if (!mine) continue
    const opponents = m.members.filter(x => x.team !== mine.team)
    const scoreFor = mine.team === "A" ? m.scoreA : m.scoreB
    const scoreAgainst = mine.team === "A" ? m.scoreB : m.scoreA
    own.push({
      id: m.id,
      playedAt: m.playedAt,
      won: scoreFor > scoreAgainst,
      position: mine.position,
      scoreFor,
      scoreAgainst,
      opponents,
      eloBefore: mine.eloBefore,
      eloAfter: mine.eloAfter,
    })
  }

  // ELO-after sequence including decay events, for peak/valley tracking.
  // Starts implicitly at 1000 (everyone's baseline before their first match).
  const eloSeq: { at: number; elo: number }[] = [
    ...own.map(o => ({ at: new Date(o.playedAt).getTime(), elo: o.eloAfter })),
    ...decays
      .filter(d => d.playerId === playerId && d.eloAfter != null)
      .map(d => ({ at: new Date(d.appliedAt).getTime(), elo: d.eloAfter as number })),
  ].sort((a, b) => a.at - b.at)

  // ── Walk the player's own history once, tracking everything ────────────
  let wins = 0
  let winStreak = 0
  let lossStreak = 0
  let bestWinStreak = 0
  let worstLossStreak = 0
  let attackWins = 0
  let defenseWins = 0
  let noMercyWins = 0
  let maxGiantGapBeaten = 0
  const opponentMeetings = new Map<string, number>()
  const opponentWins = new Map<string, number>()
  const lastResultVsOpponent = new Map<string, boolean>()

  const at: Record<string, string | null> = {
    premierMatch: null, habitue: null, pilier: null, veteran: null, legende: null,
    premiereVictoire: null, chasseurDeTrophees: null, centurion: null,
    enFeu: null, surUneLancee: null, intouchable: null, traverseeDuDesert: null,
    noMercy: null, superLoser: null, leBourreau: null, surLeFil: null, coeurBrise: null,
    chasseurDeGeants: null, regicide: null, chuteLibre: null,
    muraille: null, buteur: null, polyvalentAttack: null, polyvalentDefense: null,
    nemesis: null, beteNoire: null, revanche: null,
    oiseauDeNuit: null,
  }

  own.forEach((m, idx) => {
    const matchesPlayed = idx + 1
    if (matchesPlayed === 1) at.premierMatch = m.playedAt
    if (matchesPlayed === 25) at.habitue = m.playedAt
    if (matchesPlayed === 50) at.pilier = m.playedAt
    if (matchesPlayed === 100) at.veteran = m.playedAt
    if (matchesPlayed === 200) at.legende = m.playedAt

    const hourParis = Number(
      new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", hour12: false, timeZone: "Europe/Paris" }).format(new Date(m.playedAt))
    )
    if (!at.oiseauDeNuit && hourParis >= 22) at.oiseauDeNuit = m.playedAt

    if (m.won) {
      wins++
      winStreak++
      lossStreak = 0
      bestWinStreak = Math.max(bestWinStreak, winStreak)
      if (wins === 1) at.premiereVictoire = m.playedAt
      if (wins === 50) at.chasseurDeTrophees = m.playedAt
      if (wins === 100) at.centurion = m.playedAt
      if (winStreak === 5) at.enFeu = m.playedAt
      if (winStreak === 8) at.surUneLancee = m.playedAt
      if (winStreak === 11) at.intouchable = m.playedAt

      if (m.position === "attack") {
        attackWins++
        if (attackWins === 20) at.buteur = m.playedAt
        if (attackWins === 10 && defenseWins >= 10 && !at.polyvalentAttack) at.polyvalentAttack = m.playedAt
      } else {
        defenseWins++
        if (defenseWins === 20) at.muraille = m.playedAt
        if (defenseWins === 10 && attackWins >= 10 && !at.polyvalentDefense) at.polyvalentDefense = m.playedAt
      }

      if (m.scoreFor === 10 && m.scoreAgainst === 0) {
        noMercyWins++
        if (!at.noMercy) at.noMercy = m.playedAt
        if (noMercyWins === 5) at.leBourreau = m.playedAt
      }
      if (m.scoreFor === 10 && m.scoreAgainst === 9 && !at.surLeFil) at.surLeFil = m.playedAt

      for (const opp of m.opponents) {
        const gap = opp.eloBefore - m.eloBefore
        if (gap > maxGiantGapBeaten) maxGiantGapBeaten = gap
        if (gap >= 150 && !at.chasseurDeGeants) at.chasseurDeGeants = m.playedAt
      }
      const leader = leaderBeforeMatch.get(m.id)
      if (leader && m.opponents.some(o => o.playerId === leader) && !at.regicide) at.regicide = m.playedAt

      for (const opp of m.opponents) {
        const meetings = (opponentMeetings.get(opp.playerId) ?? 0) + 1
        opponentMeetings.set(opp.playerId, meetings)
        if (meetings === 10 && !at.nemesis) at.nemesis = m.playedAt

        const oppWins = (opponentWins.get(opp.playerId) ?? 0) + 1
        opponentWins.set(opp.playerId, oppWins)
        if (oppWins === 10 && !at.beteNoire) at.beteNoire = m.playedAt

        if (lastResultVsOpponent.get(opp.playerId) === false && !at.revanche) at.revanche = m.playedAt
        lastResultVsOpponent.set(opp.playerId, true)
      }
    } else {
      lossStreak++
      winStreak = 0
      worstLossStreak = Math.max(worstLossStreak, lossStreak)
      if (lossStreak === 5) at.traverseeDuDesert = m.playedAt
      if (m.scoreFor === 0 && m.scoreAgainst === 10 && !at.superLoser) at.superLoser = m.playedAt

      for (const opp of m.opponents) {
        const meetings = (opponentMeetings.get(opp.playerId) ?? 0) + 1
        opponentMeetings.set(opp.playerId, meetings)
        if (meetings === 10 && !at.nemesis) at.nemesis = m.playedAt
        lastResultVsOpponent.set(opp.playerId, false)
      }
      if (m.scoreFor === 9 && m.scoreAgainst === 10 && !at.coeurBrise) at.coeurBrise = m.playedAt
    }
  })

  // Peak/valley ELO, walked separately over the merged match+decay sequence.
  let peakEloEver = 1000
  let hasBeenAtOrAbove1000 = true // everyone starts at 1000
  for (const p of eloSeq) {
    if (p.elo > peakEloEver) peakEloEver = p.elo
    if (hasBeenAtOrAbove1000 && p.elo < 850 && !at.chuteLibre) at.chuteLibre = iso(p.at)
    if (p.elo >= 1000) hasBeenAtOrAbove1000 = true
  }
  let eliteAt: string | null = null
  {
    let above1200Seen = false
    for (const p of eloSeq) {
      if (!above1200Seen && p.elo >= 1200) {
        eliteAt = iso(p.at)
        above1200Seen = true
      }
    }
  }

  const matchesPlayedTotal = own.length

  const progressFor: Record<string, { current: number; target: number }> = {
    habitue: { current: matchesPlayedTotal, target: 25 },
    pilier: { current: matchesPlayedTotal, target: 50 },
    veteran: { current: matchesPlayedTotal, target: 100 },
    legende: { current: matchesPlayedTotal, target: 200 },
    "chasseur-de-trophees": { current: wins, target: 50 },
    centurion: { current: wins, target: 100 },
    "en-feu": { current: bestWinStreak, target: 5 },
    "sur-une-lancee": { current: bestWinStreak, target: 8 },
    intouchable: { current: bestWinStreak, target: 11 },
    "traversee-du-desert": { current: worstLossStreak, target: 5 },
    "le-bourreau": { current: noMercyWins, target: 5 },
    "chasseur-de-geants": { current: Math.max(0, Math.round(maxGiantGapBeaten)), target: 150 },
    elite: { current: peakEloEver, target: 1200 },
    muraille: { current: defenseWins, target: 20 },
    buteur: { current: attackWins, target: 20 },
    polyvalent: { current: Math.min(attackWins, defenseWins), target: 10 },
    nemesis: { current: Math.max(0, ...Array.from(opponentMeetings.values()), 0), target: 10 },
    "bete-noire": { current: Math.max(0, ...Array.from(opponentWins.values()), 0), target: 10 },
  }

  const earnedAtFor: Record<string, string | null> = {
    "premier-match": at.premierMatch,
    habitue: at.habitue,
    pilier: at.pilier,
    veteran: at.veteran,
    legende: at.legende,
    "premiere-victoire": at.premiereVictoire,
    "chasseur-de-trophees": at.chasseurDeTrophees,
    centurion: at.centurion,
    "en-feu": at.enFeu,
    "sur-une-lancee": at.surUneLancee,
    intouchable: at.intouchable,
    "traversee-du-desert": at.traverseeDuDesert,
    "no-mercy": at.noMercy,
    "super-loser": at.superLoser,
    "le-bourreau": at.leBourreau,
    "sur-le-fil": at.surLeFil,
    "coeur-brise": at.coeurBrise,
    "chasseur-de-geants": at.chasseurDeGeants,
    regicide: at.regicide,
    "chute-libre": at.chuteLibre,
    elite: eliteAt,
    muraille: at.muraille,
    buteur: at.buteur,
    polyvalent: at.polyvalentAttack && at.polyvalentDefense
      ? (new Date(at.polyvalentAttack) > new Date(at.polyvalentDefense) ? at.polyvalentAttack : at.polyvalentDefense)
      : null,
    nemesis: at.nemesis,
    "bete-noire": at.beteNoire,
    revanche: at.revanche,
    champion: null,
    "sur-le-podium": null,
    "oiseau-de-nuit": at.oiseauDeNuit,
  }

  return BADGE_DEFS.map(def => {
    const earnedAt = earnedAtFor[def.id] ?? null
    const earned = earnedAt !== null
    return {
      ...def,
      earned,
      earnedAt,
      progress: earned ? null : progressFor[def.id] ?? null,
    }
  })
}
