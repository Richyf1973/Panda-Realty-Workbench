#!/usr/bin/env node
/**
 * backfill-next-condition-due.mjs
 *
 * One-off backfill: recompute `panda_realty.panda_properties.next_condition_due` for every property.
 * The value is the earliest *uncleared* condition candidate date — the same logic as
 *   apps/panda-realty/lib/admin/next-condition-due.ts (computeNextConditionDue)
 *   + apps/panda-realty/lib/admin/property-due-date-candidates.ts (buildDueDateCandidates)
 *   + apps/panda-realty/lib/admin/panda-property-completion-date.ts (computeConditionDueDate)
 * inlined below as plain JS (the .mjs runner can't import the app's TS).
 *
 * Going forward the column is kept fresh by syncPropertyNextConditionDue on every relevant write
 * (offer accept/edit, contract/settlement edit, due-highlight clear). This script only seeds the
 * existing rows once.
 *
 * Usage:
 *   node tools/backfill-next-condition-due.mjs --app=panda-realty
 *   npm run backfill:next-condition-due -w panda-realty
 *
 * Idempotent: re-running recomputes the same values. Writes NULL when a property has no live
 * condition (so it sorts into the bottom alphabetical group).
 *
 * stdout: human-readable progress + summary
 * exit 0: success   exit 1: DB connection / query error
 */

import { config as loadEnv } from "dotenv"
import postgres from "postgres"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { existsSync } from "node:fs"

const __dirname = dirname(fileURLToPath(import.meta.url))
const APP_DIR = resolve(__dirname, "..")
const REPO_ROOT = resolve(APP_DIR, "../..")

loadEnv({ path: resolve(REPO_ROOT, ".env"), quiet: true })
loadEnv({ path: resolve(REPO_ROOT, ".env.local"), override: true, quiet: true })
const appEnvPath = resolve(APP_DIR, ".env.local")
if (existsSync(appEnvPath)) {
  loadEnv({ path: appEnvPath, override: true, quiet: true })
}

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error("[backfill] ERROR: DATABASE_URL not found — check apps/panda-realty/.env.local")
  process.exit(1)
}

// ---------------------------------------------------------------------------
// Date logic — inlined from the app's TS helpers (plain JS)
// ---------------------------------------------------------------------------

const BRISBANE_OFFSET_MS = 10 * 60 * 60 * 1000 // UTC+10, no DST
const DAY_MS = 24 * 60 * 60 * 1000

/** Floor a UTC instant to the start of its Brisbane (UTC+10) day, as a UTC ms value. */
function startOfBrisbaneDayMs(value) {
  const ms = new Date(value).getTime()
  if (Number.isNaN(ms)) return null
  const brisbaneMs = ms + BRISBANE_OFFSET_MS
  return Math.floor(brisbaneMs / DAY_MS) * DAY_MS - BRISBANE_OFFSET_MS
}

/** contract_date + days (UTC), null when days is null/<=0 or contract_date missing. */
function computeConditionDueDate(contractDate, days) {
  if (contractDate == null || days == null) return null
  const n = Number(days)
  if (!Number.isFinite(n) || n <= 0) return null
  const base = new Date(contractDate)
  if (Number.isNaN(base.getTime())) return null
  const result = new Date(base)
  result.setUTCDate(result.getUTCDate() + n)
  return result
}

/** Build the candidate due-date list (mirrors buildDueDateCandidates). Returns array of Date. */
function buildCandidates(row) {
  const contractDate = row.contract_date
  if (contractDate == null) return [] // no contract → no candidates

  const addDays = (days) => computeConditionDueDate(contractDate, days)
  const settlement = row.offer_settlement_date ?? row.settlement_date
  const raw = [
    row.no_conditions ? null : addDays(row.cooling_off_days),
    addDays(row.finance_days),
    addDays(row.building_pest_days),
    addDays(row.due_diligence_days),
    addDays(row.sale_of_property_days),
    addDays(row.unconditional_contract_days),
    addDays(row.subject_to_sale_days),
    settlement != null ? new Date(settlement) : null,
  ]

  const custom = Array.isArray(row.custom_conditions) ? row.custom_conditions : []
  for (const c of custom) {
    if (c && typeof c === "object") raw.push(addDays(c.days))
  }

  return raw.filter((d) => d != null && !Number.isNaN(new Date(d).getTime()))
}

/** Earliest uncleared candidate (mirrors computeNextConditionDue). Returns Date or null. */
function computeNextConditionDue(candidates, clearedAt) {
  const clearedMs = clearedAt != null ? new Date(clearedAt).getTime() : null
  let earliestMs = null
  for (const candidate of candidates) {
    const dueMs = startOfBrisbaneDayMs(candidate)
    if (dueMs == null) continue
    if (clearedMs != null && dueMs <= clearedMs) continue
    if (earliestMs == null || dueMs < earliestMs) earliestMs = dueMs
  }
  return earliestMs == null ? null : new Date(earliestMs)
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const db = postgres(DATABASE_URL, { max: 1, prepare: false })

try {
  const rows = await db`
    SELECT
      p.property_list_id,
      p.contract_date,
      p.settlement_date,
      p.due_highlight_cleared_at,
      o.no_conditions,
      o.cooling_off_days,
      o.finance_days,
      o.building_pest_days,
      o.due_diligence_days,
      o.sale_of_property_days,
      o.unconditional_contract_days,
      o.subject_to_sale_days,
      o.custom_conditions,
      o.settlement_date AS offer_settlement_date
    FROM panda_realty.panda_properties p
    LEFT JOIN LATERAL (
      SELECT bo.*
      FROM panda_realty.buyer_offers bo
      JOIN panda_realty.property_entities pe
        ON pe.property_entity_id = bo.property_entity_id
      WHERE pe.property_list_id = p.property_list_id
        AND bo.is_accepted = true
      LIMIT 1
    ) o ON true
    WHERE p.contract_date IS NOT NULL
  `
  // Only properties with a contract date can have a condition candidate (buildDueDateCandidates
  // returns [] without one). Every other property is correctly NULL (the column default), so we
  // skip the ~92k contract-less rows rather than UPDATE each to NULL.

  console.log(`[backfill] Recomputing next_condition_due for ${rows.length} propert(y/ies) with a contract date.`)

  let updated = 0
  let withDate = 0
  let errored = 0

  for (const row of rows) {
    try {
      const candidates = buildCandidates(row)
      const next = computeNextConditionDue(candidates, row.due_highlight_cleared_at)
      await db`
        UPDATE panda_realty.panda_properties
        SET next_condition_due = ${next ? next.toISOString() : null}
        WHERE property_list_id = ${row.property_list_id}
      `
      updated++
      if (next) withDate++
    } catch (rowErr) {
      errored++
      console.error(
        `[backfill]   ✗ property_list_id=${row.property_list_id} — ${rowErr?.message ?? rowErr}`,
      )
    }
  }

  console.log(
    `[backfill] Done. ${updated} row(s) updated (${withDate} with a live condition, ${updated - withDate} NULL)` +
      `${errored > 0 ? `, ${errored} failed` : ""}.`,
  )
  if (errored > 0) process.exit(1)
} catch (err) {
  console.error(`[backfill] ERROR: ${err?.message ?? err}`)
  process.exit(1)
} finally {
  await db.end()
}
