/**
 * Idempotent seed: sellers + buyers pipeline E2E fixtures (favorite properties, buyer PEs, offers).
 *
 * Usage: node apps/panda-realty/e2e/scripts/seed-sellers-pipeline-accepted-offer.mjs
 * Requires DATABASE_URL (monorepo or apps/panda-realty .env.local).
 */
import { config as loadEnv } from "dotenv"
import postgres from "postgres"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { seedPandaPipelineE2e } from "./seed-panda-pipeline-fixture.mjs"

const scriptDir = dirname(fileURLToPath(import.meta.url))
const appDir = resolve(scriptDir, "../..")
const monorepoRoot = resolve(appDir, "../..")
loadEnv({ path: resolve(monorepoRoot, ".env") })
loadEnv({ path: resolve(monorepoRoot, ".env.local"), override: true })
loadEnv({ path: resolve(appDir, ".env") })
loadEnv({ path: resolve(appDir, ".env.local"), override: true })

const url = process.env.DATABASE_URL?.trim()
if (!url) {
  console.error("DATABASE_URL is required (set in .env.local).")
  process.exit(1)
}

const sql = postgres(url, { max: 1 })

try {
  await sql.begin(async (sqlTx) => {
    await seedPandaPipelineE2e(sqlTx)
  })
} catch (e) {
  console.error(e)
  process.exit(1)
} finally {
  await sql.end({ timeout: 5 })
}
