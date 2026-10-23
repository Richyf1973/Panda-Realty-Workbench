/**
 * One-shot: add condition_notes if missing (same as drizzle/0027_buyer_offers_condition_notes.sql).
 */
import { config as loadEnv } from "dotenv"
import postgres from "postgres"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const appDir = dirname(dirname(dirname(fileURLToPath(import.meta.url))))
const monorepoRoot = resolve(appDir, "../..")
loadEnv({ path: resolve(monorepoRoot, ".env.local"), override: true })
loadEnv({ path: resolve(appDir, ".env.local"), override: true })

const url = process.env.DATABASE_URL?.trim()
if (!url) {
  console.error("DATABASE_URL required")
  process.exit(1)
}

const sql = postgres(url, { max: 1 })
try {
  await sql`
    ALTER TABLE panda_realty.buyer_offers
    ADD COLUMN IF NOT EXISTS condition_notes text
  `
  console.log("OK: condition_notes column present on panda_realty.buyer_offers")
} finally {
  await sql.end({ timeout: 5 })
}
