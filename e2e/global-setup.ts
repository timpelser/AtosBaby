/**
 * Runs once before the whole Playwright suite.
 *
 * Resets the shared `e2e` Neon branch back to its parent (`e2e-seed`, a
 * schema-only branch with zero rows). This guarantees every test run starts
 * from an identical, empty database — no leftover players/matches from a
 * previous run, no ELO K-factor drift from accumulated games-played counts.
 *
 * Because there is only one `e2e` branch, runs against it must not overlap
 * (see e2e/README.md). If you're running tests locally, make sure no CI job
 * is mid-run, and vice versa.
 */

const NEON_API_BASE = "https://console.neon.tech/api/v2"

type NeonOperation = { id: string; status: string; action: string }

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(
      `Missing required env var ${name}. Copy e2e/.env.test.example to e2e/.env.test ` +
      `and fill it in (see e2e/README.md), or set it in the CI environment.`
    )
  }
  return value
}

async function neonApi<T>(path: string, apiKey: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${NEON_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Neon API ${init?.method ?? "GET"} ${path} failed: ${res.status} ${body}`)
  }
  return res.json() as Promise<T>
}

async function waitForOperations(
  operations: NeonOperation[],
  projectId: string,
  apiKey: string,
  timeoutMs = 60_000
): Promise<void> {
  const deadline = Date.now() + timeoutMs
  const pending = new Set(operations.map(op => op.id))

  while (pending.size > 0) {
    if (Date.now() > deadline) {
      throw new Error(`Timed out waiting for Neon operations to finish: ${[...pending].join(", ")}`)
    }

    for (const opId of [...pending]) {
      const { operation } = await neonApi<{ operation: NeonOperation }>(
        `/projects/${projectId}/operations/${opId}`,
        apiKey
      )
      if (operation.status === "finished" || operation.status === "skipped") {
        pending.delete(opId)
      } else if (operation.status === "failed" || operation.status === "error") {
        throw new Error(`Neon operation ${opId} (${operation.action}) failed`)
      }
    }

    if (pending.size > 0) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }
}

export default async function globalSetup(): Promise<void> {
  const apiKey = requireEnv("NEON_API_KEY")
  const projectId = requireEnv("NEON_PROJECT_ID")
  const branchId = requireEnv("NEON_E2E_BRANCH_ID")
  const seedBranchId = requireEnv("NEON_E2E_SEED_BRANCH_ID")
  requireEnv("DATABASE_URL")
  requireEnv("ADMIN_PASSWORD")
  requireEnv("CRON_SECRET")

  console.log(`[e2e] Resetting Neon branch ${branchId} to parent ${seedBranchId}...`)

  const { operations } = await neonApi<{ operations: NeonOperation[] }>(
    `/projects/${projectId}/branches/${branchId}/restore`,
    apiKey,
    {
      method: "POST",
      body: JSON.stringify({ source_branch_id: seedBranchId }),
    }
  )

  await waitForOperations(operations, projectId, apiKey)

  console.log("[e2e] Branch reset complete — database is empty (schema only).")
}
