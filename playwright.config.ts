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
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // All tests share one Neon branch (see e2e/global-setup.ts) — keep workers
  // modest so ELO/leaderboard-shaped tests that read global aggregates don't
  // race each other. Bump this once the suite is split into projects that
  // isolate by dedicated player namespaces.
  workers: process.env.CI ? 2 : undefined,
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
    command: "npm run dev -- --port " + PORT,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      DATABASE_URL: process.env.DATABASE_URL ?? "",
      ADMIN_PASSWORD: process.env.ADMIN_PASSWORD ?? "",
      CRON_SECRET: process.env.CRON_SECRET ?? "",
    },
  },
})
