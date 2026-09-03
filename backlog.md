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

**Visibility**
- The current season is shown prominently, not tucked into a small badge —
  a large, hard-to-miss element on the homepage carrying the season's name,
  a matching icon (snowflake / blossom / sun / leaf), and a big countdown of
  days remaining (e.g. a large "40 jours restants").
- The header is reorganized: a menu on the left opens the seasons browser;
  the AtosBaby logo/title moves to the center of the header; the existing
  action buttons (Sélecteur d'équipes, Ajouter un match, admin lock) stay on
  the right.

**Browsing past seasons**
- The left-side menu lists every past season (name + year), each showing at
  a glance who won it.
- Opening a past season switches the *entire* page — podium, rankings,
  position leaders, latest matches — to that season's final, frozen state.
  It's clearly marked as an archived/past view.
- A single, obvious action returns to the current, live season.
- Past seasons are read-only: no adding matches, no admin actions while
  viewing one.

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
- Whoever finishes #1 when a season ends is that season's permanent
  champion, shown when browsing that season in the archive.
- The reigning champion (the most recent season's winner) gets a small
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
- Includes a link to the full recap for that season inside the app (the
  same archived view reachable from the seasons menu).
- Lets the player know a new season has started and that ELO has reset to
  1000 for everyone.
- Matches the app's existing tone; framed as a fun recap, not a report.
