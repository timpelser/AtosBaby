import { defineConfig, devices } from "@playwright/test"
import dotenv from "dotenv"
import path from "path"

// Local dev: values come from e2e/.env.test (gitignored, see e2e/.env.test.example).
// CI: values are injected as real environment variables by the workflow, and
// dotenv silently no-ops when the file doesn't exist — it never overwrites
// variables that are already set.
dotenv.config({ path: path.resolve(__dirname, "e2e/.env.test"), quiet: true })

const PORT = 3100
const BASE_URL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: "./e2e/tests",
  globalSetup: "./e2e/global-setup.ts",
  timeout: process.env.CI ? 60_000 : 30_000,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // Single worker, always. This isn't just about flakiness: recomputeAllElos
  // (triggered by admin match-deletion and the decay cron) rewrites EVERY
  // player's ELO in one pass with no locking — two of those running
  // concurrently against the shared `e2e` branch could genuinely corrupt
  // each other's writes, not just produce a flaky assertion. Revisit once
  // the suite moves to per-worker Neon branches (see e2e/README.md).
  workers: 1,
  reporter: process.env.CI ? [["html", { open: "never" }], ["github"]] : "list",

  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    // Locally: `next dev` for fast iteration, reusing an already-running
    // server across runs (its .next/ cache stays warm on disk).
    // CI: a fresh checkout has no .next/ cache at all, so dev mode's
    // lazy/on-demand compilation means the FIRST interaction with each
    // route/client-component chunk (e.g. opening the Add Match dialog) can
    // take much longer than any of the warm local runs ever showed — that's
    // what actually caused the flakiness on the first CI run, not a real
    // app or test bug. A production build sidesteps it entirely: everything
    // is already compiled before the first test hits the server.
    command: process.env.CI ? `npm run build && npm run start -- --port ${PORT}` : `npm run dev -- --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: process.env.CI ? 300_000 : 120_000,
    env: {
      DATABASE_URL: process.env.DATABASE_URL ?? "",
      ADMIN_PASSWORD: process.env.ADMIN_PASSWORD ?? "",
      CRON_SECRET: process.env.CRON_SECRET ?? "",
    },
  },
})
