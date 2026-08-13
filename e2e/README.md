# E2E tests

Playwright tests that drive a real instance of the app against a real,
isolated Postgres database — a dedicated Neon branch, reset to empty before
every run.

## What's covered

33 tests across 9 spec files:

- **rankings.spec.ts** — podium, position leaders, rankings table content
  and pagination, the ELO-formula info dialog.
- **latest-matches.spec.ts** — the matches feed, match detail dialog,
  pagination, admin-only delete button.
- **add-match.spec.ts** — form validation (4 distinct players, exactly one
  side at 10), brand-new-player auto-creation on save.
- **team-selector.spec.ts** — random shuffle, ELO-balanced pairing, the
  4-distinct-players gate.
- **player-profile.spec.ts** — all 3 tabs (recent matches + drill-in, ELO
  history chart, rivalries) including empty/single-point states.
- **streaks.spec.ts** — win/loss streak badge threshold (5 games) and
  absence below it.
- **admin.spec.ts** — 5-click unlock, wrong-password rejection, logout,
  match deletion.
- **cron-decay.spec.ts** — bearer auth, correct -10 application, leaves
  active players alone, idempotent within the same week.
- **elo-accuracy.spec.ts** — the core suite: drives real matches through the
  UI and compares the DB's `elo_before`/`elo_after` against an independently
  reimplemented formula (`helpers/elo.ts`, never imported from
  `src/lib/actions.ts`). Covers the base formula, underdog-upset asymmetry,
  the K=94→64 threshold at 10 games, and a full `recomputeAllElos` replay
  after an admin deletes a match mid-sequence.

Not covered yet: mobile-layout components (`*-mobile.tsx`), the historical
pre-2026-06-13 K-factor era (unreachable through the UI — `saveMatch` always
uses "now" — would need a dedicated SQL-seeded-then-recomputed test), and
`duo-stats`/`TopDuosPodium` (dead code — implemented but never rendered from
`page.tsx`, worth flagging to whoever owns this app rather than testing
something no route exposes).

## How the database isolation works

```
atos-baby-db (prod, real employee data)
  └─ e2e-seed   — schema only, 0 rows, never written to by tests
       └─ e2e   — the branch tests actually run against
```

Before the suite runs, `global-setup.ts` calls the Neon API to reset the
`e2e` branch back to `e2e-seed`'s current state (empty). This means:

- every run starts from an identical, empty database — no leftover data,
  no ELO K-factor drift from a test player's games-played count growing
  across runs
- prod is never touched — `e2e-seed` is the only thing ever branched from
  it, and only manually, on purpose (see "Updating the seed schema" below)
- there's nothing to clean up after a run — the next run's reset wipes
  whatever was left, even if the previous run crashed

**Trade-off:** there is one `e2e` branch, so two runs must not execute at
the same time (a local run and a CI run, or two CI runs). The GitHub Actions
workflow enforces this with a `concurrency` group. If you're running the
suite locally, don't do it while CI is mid-run on this repo.

## Running locally

1. Copy `e2e/.env.test.example` to `e2e/.env.test` and fill in:
   - `NEON_API_KEY` — generate one in the Neon console under
     **Account settings > API keys**. This is a personal credential, not a
     project one — don't share it or commit it.
   - `DATABASE_URL` — the `e2e` branch's connection string (Neon console >
     `atos-baby-db` > Branches > `e2e` > Connect). The other Neon IDs in the
     example file are already filled in (they're not secret, just IDs).
   - `ADMIN_PASSWORD` / `CRON_SECRET` — any fixed values; they don't need to
     match production's real secrets since this runs its own app process.
2. `npx playwright install --with-deps chromium` (one-time browser install).
3. `npm run test:e2e` — or `npm run test:e2e:ui` for Playwright's interactive
   UI mode while writing tests.

This boots `next dev` on port 3100 against the `e2e` branch, resetting it
first.

## Updating the seed schema

If the app's schema changes (new table/column/view), `e2e-seed` needs to
pick that up too, since it's a static branch, not something that re-syncs
with prod automatically:

1. In the Neon console, reset `e2e-seed` from `main` (prod) — this pulls in
   the new schema.
2. Immediately truncate all tables on `e2e-seed` again so it goes back to
   zero rows (`TRUNCATE elo_decay_events, match_players, matches, players
   RESTART IDENTITY CASCADE;`).

## Writing new tests

- Anything that needs specific data (players, matches, ELO history) should
  create it itself — either via the UI (`Add Match` dialog, via
  `helpers/add-match-ui.ts` / `helpers/combobox.ts`) or by seeding rows
  directly with `helpers/seed.ts` for setup speed — using a
  uniquely-prefixed, obviously-fake player pool via `helpers/players.ts`'s
  `testPlayer()`/`pool()`. Don't rely on the seed branch containing
  anything; it's intentionally empty.
- **Player emails must match `/^[a-z]+\.[a-z]+@atos\.net$/i`** (letters
  only, no digits, one dot) — that's what `PlayerCombobox` itself validates.
  `testPlayer()` enforces this, but if you hand-roll a name segment (e.g.
  `"p1"`, `"att2"`), the UI will reject it and the test hangs on a "Format
  invalide" error that's easy to mistake for a timing bug. Use words
  (`"pone"`, `"attackone"`), not `word+digit`.
- Rivalries (`getPlayerRivalries`) are computed **per individual opponent**,
  not per opposing duo — both players on the other team independently
  accrue the same matches-played count against you. If a fixture's "main"
  rival needs a stable top-3 spot, either give that rival's teammate a
  different one-off partner each match (so the teammate doesn't
  independently tie the rival's count), or accept that the rival's fixed
  partner will tie them exactly and design the assertion around that pair
  rather than a single name.
- Tests that assert on *global* aggregates (podium, rankings order, position
  leaders) are reading state shared with every other test in the run. Keep
  their assertions scoped to the players *that test* created, not "who's
  #1", unless the test explicitly controls the entire dataset — or better,
  read whatever the UI shows and cross-check it against an independent SQL
  query (see `rankings.spec.ts`), which works regardless of what else is in
  the DB.
- Admin mode is client-side-only React state (no cookie/session) — a
  `page.reload()` after `unlockAdmin()` logs back out. Don't reload once
  you're relying on admin state; Next.js's `revalidatePath` already keeps
  the current page's data fresh after a server action.
- Remember the `matches` table's `ten_point_win` constraint: one side must
  score exactly 10. Any fixture match needs a score like `10-x`.
