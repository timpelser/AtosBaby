import { neon } from "@neondatabase/serverless"

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set — see e2e/.env.test.example")
}

// Same driver the app itself uses (src/lib/db.ts), pointed at the `e2e`
// Neon branch instead of prod. Used by tests for fast fixture setup (direct
// SQL) and for assertions against raw DB state (elo_before/after, decay
// events) that the UI doesn't expose directly.
export const sql = neon(process.env.DATABASE_URL)
