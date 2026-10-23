#!/usr/bin/env node
/**
 * backfill-signature-rendered-html.mjs
 *
 * One-off backfill: for every row in `panda_realty.email_signatures` that has
 * neither `html_content` nor `rendered_html` set, generate `rendered_html`
 * using the same legacy-render logic as `renderLegacyEmailSignatureHtml` in
 * `apps/panda-realty/lib/email-signature-render.ts`.
 *
 * Usage:
 *   node tools/backfill-signature-rendered-html.mjs --app=panda-realty
 *   npm run backfill:signature-rendered-html -w panda-realty
 *
 * The script is idempotent: it only touches rows where BOTH html_content and
 * rendered_html are empty/null, so it is safe to re-run at any time.
 *
 * Pre-requisites:
 *   apps/panda-realty/.env.local must contain DATABASE_URL pointing at the
 *   panda_realty Supabase project (direct port 5432 recommended).
 *
 * stdout: human-readable progress + summary
 * exit 0: success (even if 0 rows updated)
 * exit 1: DB connection / query error
 */

import { config as loadEnv } from "dotenv"
import postgres from "postgres"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { existsSync } from "node:fs"

// ---------------------------------------------------------------------------
// Bootstrap — resolve repo root + load env
// ---------------------------------------------------------------------------

const __dirname = dirname(fileURLToPath(import.meta.url))
const APP_DIR = resolve(__dirname, "..")
const REPO_ROOT = resolve(APP_DIR, "../..")

// Load root envs first, then override with the app-specific .env.local
loadEnv({ path: resolve(REPO_ROOT, ".env"), quiet: true })
loadEnv({ path: resolve(REPO_ROOT, ".env.local"), override: true, quiet: true })
const appEnvPath = resolve(APP_DIR, ".env.local")
if (existsSync(appEnvPath)) {
  loadEnv({ path: appEnvPath, override: true, quiet: true })
}

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error(
    "[backfill] ERROR: DATABASE_URL not found — check apps/panda-realty/.env.local",
  )
  process.exit(1)
}

// ---------------------------------------------------------------------------
// HTML helpers — inlined from email-signature-render.ts (plain JS)
// ---------------------------------------------------------------------------

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function linesToHtml(value) {
  return escapeHtml(value).replace(/\r?\n/g, "<br>")
}

function linkOrText(value, hrefPrefix = null) {
  if (!value?.trim()) return ""
  const trimmed = value.trim()
  if (hrefPrefix == null) return `<div>${escapeHtml(trimmed)}</div>`
  return `<div><a href="${hrefPrefix}${escapeHtml(trimmed)}">${escapeHtml(trimmed)}</a></div>`
}

function websiteHtml(website) {
  if (!website?.trim()) return ""
  const trimmed = website.trim()
  return `<div><a href="${escapeHtml(trimmed)}">${escapeHtml(trimmed)}</a></div>`
}

function detailsBlock(signature) {
  return [
    signature.closing_text?.trim()
      ? `<div style="font-weight:600;">${linesToHtml(signature.closing_text)}</div>`
      : "",
    signature.contact_name?.trim()
      ? `<div>${escapeHtml(signature.contact_name.trim())}</div>`
      : "",
    linkOrText(signature.phone, "tel:"),
    linkOrText(signature.email, "mailto:"),
    websiteHtml(signature.website),
  ]
    .filter(Boolean)
    .join("")
}

/**
 * Mirrors renderLegacyEmailSignatureHtml from email-signature-render.ts.
 * Operates on raw DB row objects (snake_case column names).
 */
function renderLegacyHtml(row) {
  const intro = row.body_text?.trim()
    ? `<div style="margin-bottom:12px;">${linesToHtml(row.body_text.trim())}</div>`
    : ""
  const details = detailsBlock(row)
  const image = row.image_asset_url?.trim()
    ? `<img src="${escapeHtml(row.image_asset_url.trim())}" alt="${escapeHtml(row.name)}" style="max-width:320px;height:auto;display:block;border:0;">`
    : ""

  if (row.layout === "text-only") {
    return `${intro}<div>${details}</div>`
  }

  if (row.layout === "logo-left-details-right") {
    return (
      `${intro}<table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr>` +
      (image ? `<td style="padding-right:16px;vertical-align:top;">${image}</td>` : "") +
      `<td style="vertical-align:top;">${details}</td></tr></table>`
    )
  }

  // "image-above-details" and any unknown/future layout
  return `${intro}${image ? `<div style="margin-bottom:12px;">${image}</div>` : ""}<div>${details}</div>`
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const db = postgres(DATABASE_URL, { max: 1, prepare: false })

try {
  // SELECT rows that need backfilling.
  // The schema declares both columns NOT NULL DEFAULT '', so we treat empty
  // strings the same as NULL for safety.
  const rows = await db`
    SELECT
      email_signature_id,
      name,
      layout,
      body_text,
      closing_text,
      contact_name,
      phone,
      email,
      website,
      image_asset_url
    FROM panda_realty.email_signatures
    WHERE
      (html_content  IS NULL OR html_content  = '')
      AND (rendered_html IS NULL OR rendered_html = '')
  `

  if (rows.length === 0) {
    console.log("[backfill] No rows need backfilling — nothing to do.")
    process.exit(0)
  }

  console.log(`[backfill] Found ${rows.length} row(s) to backfill.`)

  let updated = 0
  let errored = 0

  for (const row of rows) {
    try {
      const html = renderLegacyHtml(row)

      await db`
        UPDATE panda_realty.email_signatures
        SET rendered_html = ${html}
        WHERE email_signature_id = ${row.email_signature_id}
          AND (rendered_html IS NULL OR rendered_html = '')
          AND (html_content  IS NULL OR html_content  = '')
      `

      updated++
      console.log(
        `[backfill]   ✓ id=${row.email_signature_id} name="${row.name}" (layout: ${row.layout})`,
      )
    } catch (rowErr) {
      errored++
      console.error(
        `[backfill]   ✗ id=${row.email_signature_id} name="${row.name}" — ${rowErr?.message ?? rowErr}`,
      )
    }
  }

  console.log(
    `[backfill] Done. ${updated} row(s) updated${errored > 0 ? `, ${errored} row(s) failed` : ""}.`,
  )

  if (errored > 0) process.exit(1)
} catch (err) {
  console.error(`[backfill] ERROR: ${err?.message ?? err}`)
  process.exit(1)
} finally {
  await db.end()
}
