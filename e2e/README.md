# E2E tests

Playwright tests that drive a real instance of the app against a real,
isolated Postgres database — a dedicated Neon branch, reset to empty before
every run.

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
3. Update `db/schema.sql` in the repo root to match, in the same PR as the
   schema change.

## Writing new tests

- Anything that needs specific data (players, matches, ELO history) should
  create it itself — either via the UI (`Add Match` dialog) or by seeding
  rows directly for setup speed — using a uniquely-named, obviously-fake
  player pool (e.g. `e2e.<test-name>.<n>@atos.net`). Don't rely on the seed
  branch containing anything; it's intentionally empty.
- Tests that assert on *global* aggregates (podium, rankings order, position
  leaders) are reading state shared with every other test in the run. Keep
  their assertions scoped to the players *that test* created, not "who's
  #1", unless the test explicitly controls the entire dataset.
- Remember the `matches` table's `ten_point_win` constraint: one side must
  score exactly 10. Any fixture match needs a score like `10-x`.
