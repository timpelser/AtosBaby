# Backlog

Functional requirements only — no implementation details. Each feature describes
what a player experiences, not how it's built.

## Seasons

**What a season is**
- The app is divided into recurring seasons tied to the four real calendar
  seasons — Hiver, Printemps, Été, Automne (Winter/Spring/Summer/Autumn) —
  roughly three months each.
- Because seasons repeat every year, each one is identified by name + year
  (e.g. "Hiver 2026") everywhere it's displayed or listed, so last year's
  winter and this year's winter are never ambiguous.
- At any moment there is exactly one current season. Every match, ELO value,
  and streak belongs to whichever season it happened in.
- Exact boundaries — astronomical (solstice/equinox) dates, fixed for this
  cycle rather than recomputed year to year (the same way the app already
  hardcodes one-off date cutoffs elsewhere, e.g. the ELO K-factor era
  change). A future season beyond this list needs its dates added
  explicitly when the time comes:
  - Été 2026: dimanche 21 juin – mardi 22 septembre 2026
  - Automne 2026: mercredi 23 septembre – dimanche 20 décembre 2026
  - Hiver 2026: lundi 21 décembre 2026 – vendredi 19 mars 2027
  - Printemps 2027: samedi 20 mars – dimanche 20 juin 2027

**Visibility**
- The current season isn't a detail — it's felt across the whole app:
  - A colored border frames the entire screen, on every page, color-matched
    to the season (icy blue/white for winter, soft pink/green for spring,
    warm gold for summer, deep orange/rust for autumn).
  - A slow, ambient particle animation drifts down across the full page
    behind the content — snow in winter, petals in spring, floating
    light/sun motes in summer, falling leaves in autumn. Subtle and
    continuous, never blocks clicking anything under it, and pauses for
    anyone with reduced-motion turned on (same as the existing win/loss
    streak fire and ice effects already do).
- The homepage's existing top-players podium (currently #2 / #1 / #3) becomes
  a three-part row instead:
  - **Left**: "Dernier champion" — not a single flat card but a small
    vertical leaderboard, shaped like the existing Meilleur Attaquant /
    Meilleur Défenseur cards: a ranked list of the last 3 completed
    seasons' champions, most recent first. Each row shows the champion's
    name and the season they won (e.g. "Été 2026"), plus their ELO at the
    time — no win/loss record or other stats, ELO is the only number shown.
  - **Middle**: the current season's top 3 — this is today's existing
    podium, unchanged, just now flanked by the two cards either side.
  - **Right**: a "jours restants" card — the season's name/icon plus the
    day countdown as its single large number, so it's never in question how
    long the season has left.
- The header is reorganized: the AtosBaby logo/title moves to the center;
  the existing action buttons (Sélecteur d'équipes, Ajouter un match, admin
  lock) stay on the right. (No left-side menu — see below, there's nothing
  for it to open yet.)

**No season browsing (for now)**
- Past seasons are not individually viewable or browsable — no archive, no
  switching the page to a prior season's frozen state, no per-season pages.
  This may come later, but isn't part of the initial build.
- The only piece of season history surfaced anywhere is the "Dernier
  champion" leaderboard described above, and it only ever reaches back 3
  seasons. Match history keeps every match tagged with its season
  regardless (see below), so a real archive view remains possible to add
  later without a data migration.

**Season transition**
- The transition is a hard cutoff, not gradual: the instant a new season
  begins, every player's ELO snaps back to exactly 1000. No partial
  regression, no carry-over.
- Win/loss streaks reset to zero at the same moment, so everyone starts the
  new season with a clean slate.
- Milestone badges (see below) are never affected by a season transition —
  they're permanent, all-time achievements, not season-scoped.
- Every match ever played remains visible forever in match history, tagged
  with the season it was played in — nothing is deleted or hidden by a
  season change, only the live ELO/leaderboard resets.

**Champion recognition**
- Whoever finishes #1 when a season ends is that season's champion.
- They appear at the top of the "Dernier champion" leaderboard (see
  Visibility above) the instant the season closes out — that row is
  permanent and always current, not temporary.
- On top of that, for the week immediately following, a celebratory banner
  also runs alongside the ongoing-season banner at the top of the homepage,
  announcing the new champion by name and ELO. (This was cut from the
  original plan in favor of the permanent row alone, then brought back to
  run alongside it once it was actually built and looked at — see
  champion-banner.tsx / isChampionBannerWindow.)
- On top of that, the reigning champion also gets a small
  crown next to their name for the entire duration of the *following*
  season, wherever their name appears in the app (leaderboard, matches,
  profile).

## Milestone badges

- A player's profile dialog gains a fourth tab — "Trophées" — alongside the
  existing Matchs / ELO / Rivalités tabs.
- The tab shows a grid of collectible badges. Earned badges are shown in
  full color with the date they were earned; unearned badges are greyed out
  and locked.
- Badges that are close to being earned show a short progress hint (e.g.
  "64/100") rather than staying a total mystery.
- A small counter (e.g. "9/30 débloqués") shows overall collection progress
  at a glance.
- Badges are all-time and permanent — they are never affected by a season
  reset.
- Clicking/tapping a badge shows its name, description, and (if earned) the
  date it was earned.
- Deliberately not all grind — the set below mixes straightforward
  milestones with a few self-deprecating/humorous ones, so the tab is fun to
  browse even for a player near the bottom of the table.

**Launch set — 30 badges**

*Participation & wins*
1. Premier match — play your first-ever match.
2. Habitué — 25 matches played.
3. Pilier — 50 matches played.
4. Vétéran — 100 matches played.
5. Légende — 200 matches played.
6. Première victoire — win your first-ever match.
7. Chasseur de trophées — 50 wins.
8. Centurion — 100 wins.

*Streaks*
9. En feu — best-ever win streak reaches 5.
10. Sur une lancée — best-ever win streak reaches 8.
11. Intouchable — best-ever win streak reaches 11 or more.
12. Traversée du désert — worst-ever losing streak reaches 5 (the humbling
    counterpart to "En feu").

*Scoreline flavor*
13. No Mercy — win a match 10–0.
14. Super Loser — lose a match 10–0.
15. Le Bourreau — win 10–0 five times over your career.
16. Sur le fil — win a match by the closest possible margin (10–9).
17. Cœur brisé — lose a match by the closest possible margin (9–10).

*Upsets & rating*
18. Chasseur de géants — beat an opponent rated 150+ ELO points above you.
19. Régicide — beat the player who was ranked #1 at the time the match was
    played.
20. Chute libre — drop below 850 ELO after having once been above 1000.
21. Élite — reach 1200 ELO.

*Position specialists*
22. Muraille — 20 wins as defender.
23. Buteur — 20 wins as attacker.
24. Polyvalent — at least 10 wins as attacker and 10 wins as defender.

*Rivalries*
25. Némésis — face the same opponent 10 times, win or lose.
26. Bête noire — beat the same opponent 10 times.
27. Revanche — beat a rival in the very next match you play against them,
    right after they beat you.

*Season*
28. Champion — finish #1 at the end of a season.
29. Sur le podium — finish in the top 3 at the end of a season.

*Fun*
30. Oiseau de nuit — play a match logged after 10pm.

## Onboarding email

- Triggered automatically the first time a player's name is used in a
  logged match — i.e. the moment they go from not existing in the system to
  having exactly one match played. Nobody has to invite them or sign them
  up; whoever added them to that first match is enough to trigger it.
- Sent exactly once per player, ever — never repeats, no matter how many
  matches follow.
- Explains what AtosBaby is, since the recipient may not know it exists (a
  teammate may have simply typed their name into a match).
- States their starting ELO and gives a short, plain explanation of how it
  moves.
- Links directly to their own player profile in the app.
- Encourages them to log their own matches going forward.
- Matches the app's existing warm, playful tone (French copy, ⚽ branding).

## Season recap email

- Sent once per player, at the moment a season ends.
- Only sent to players who played at least one match that season — not to
  everyone in the system.
- Fully personalized per recipient:
  - Final rank and ELO for the season just ended
  - Win/loss record for the season
  - One or two personal highlights — e.g. biggest upset win, longest streak
    reached, most-played rival and the record against them
  - Who won the season (the champion), for context/bragging rights
- Includes a link back to the app's homepage, where they can see the season
  that just ended now topping the "Dernier champion" leaderboard.
- Lets the player know a new season has started and that ELO has reset to
  1000 for everyone.
- Matches the app's existing tone; framed as a fun recap, not a report.
