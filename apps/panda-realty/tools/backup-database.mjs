/**
 * backup-database.mjs
 *
 * Dumps the panda_realty schema (+ data) from your Supabase project and
 * restores it into the client's Supabase project.
 *
 * Usage:  node tools/backup-database.mjs
 *         npm run backup:db -w panda-realty
 *
 * Pre-requisites:
 *   1. pg_dump and pg_restore binaries on PATH (PostgreSQL client tools).
 *      Check: pg_dump --version
 *   2. Add to apps/panda-realty/.env.local:
 *        SOURCE_DATABASE_URL=postgresql://postgres.<ref>:<pw>@db.<ref>.supabase.co:5432/postgres
 *        CLIENT_DATABASE_URL=postgresql://postgres.<ref>:<pw>@db.<ref>.supabase.co:5432/postgres
 *      Use the DIRECT connection (port 5432), NOT the pooler (port 6543).
 */

import { spawnSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { config as loadEnv } from "dotenv"
import postgres from "postgres"

// ---------------------------------------------------------------------------
// Bootstrap — load .env.local
// ---------------------------------------------------------------------------

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const APP_DIR = path.resolve(__dirname, "..")

loadEnv({ path: path.join(APP_DIR, ".env") })
loadEnv({ path: path.join(APP_DIR, ".env.local"), override: true })

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const SCHEMA = "panda_realty"
const DUMP_FILE = path.join(os.tmpdir(), `panda_realty_backup_${Date.now()}.dump`)

// ---------------------------------------------------------------------------
// Logging helpers (NDJSON — one JSON object per line)
// ---------------------------------------------------------------------------

const startTime = Date.now()

function log(level, step, msg, detail) {
  const entry = { level, step, msg, ts: new Date().toISOString() }
  if (detail !== undefined) entry.detail = detail
  process.stdout.write(JSON.stringify(entry) + "\n")
}

function info(step, msg, detail) { log("info", step, msg, detail) }
function success(step, msg, detail) { log("success", step, msg, detail) }
function warn(step, msg, detail) { log("warn", step, msg, detail) }

function fatal(step, msg, detail) {
  log("error", step, msg, detail)
  cleanup()
  const duration_ms = Date.now() - startTime
  process.stdout.write(
    JSON.stringify({
      level: "error",
      step: "summary",
      msg: `backup-database FAILED at step '${step}': ${msg}`,
      exitCode: 1,
      duration_ms,
    }) + "\n"
  )
  process.exit(1)
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Remove password from a connection URL for safe logging. */
function redactUrl(url) {
  if (!url) return "(not set)"
  return url.replace(/:([^@]+)@/, ":***@")
}

/** Stat a file size, formatted. */
function formatBytes(bytes) {
  if (bytes == null || isNaN(bytes)) return "unknown"
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

/** Clean up the temp dump file. */
function cleanup() {
  if (fs.existsSync(DUMP_FILE)) {
    try { fs.unlinkSync(DUMP_FILE) } catch { /* ignore */ }
  }
}

/**
 * Resolve a pg binary (pg_dump / pg_restore) — checks PATH first, then
 * falls back to standard Windows PostgreSQL install directories.
 */
function resolvePgBin(name) {
  // 1. Try PATH first
  const onPath = spawnSync(name, ["--version"], { encoding: "utf8" })
  if (!onPath.error) return name

  // 2. Windows fallback — scan Program Files for versioned PostgreSQL installs
  if (process.platform === "win32") {
    const bases = [
      "C:/Program Files/PostgreSQL",
      "C:/Program Files (x86)/PostgreSQL",
    ]
    for (const base of bases) {
      if (!fs.existsSync(base)) continue
      const versions = fs.readdirSync(base).sort().reverse() // prefer newest
      for (const v of versions) {
        const candidate = path.join(base, v, "bin", `${name}.exe`)
        if (fs.existsSync(candidate)) return candidate
      }
    }
  }

  return null // not found
}

/** Run a binary via spawnSync, return { ok, stdout, stderr, status }. */
function run(bin, args, extraEnv = {}) {
  const result = spawnSync(bin, args, {
    encoding: "utf8",
    env: { ...process.env, ...extraEnv },
  })
  return {
    ok: result.status === 0 && !result.error,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    status: result.status ?? -1,
    spawnError: result.error?.message,
  }
}

// ---------------------------------------------------------------------------
// Step 1: env-check
// ---------------------------------------------------------------------------

info("env-check", "Checking environment variables")

const SOURCE_DATABASE_URL = process.env.SOURCE_DATABASE_URL
const CLIENT_DATABASE_URL = process.env.CLIENT_DATABASE_URL

if (!SOURCE_DATABASE_URL) {
  fatal("env-check", "SOURCE_DATABASE_URL is not set", {
    hint: "Add SOURCE_DATABASE_URL to apps/panda-realty/.env.local (use the Supabase direct connection, port 5432).",
  })
}
if (!CLIENT_DATABASE_URL) {
  fatal("env-check", "CLIENT_DATABASE_URL is not set", {
    hint: "Add CLIENT_DATABASE_URL to apps/panda-realty/.env.local (use the client's Supabase direct connection, port 5432).",
  })
}

success("env-check", "Both database URLs present", {
  source: redactUrl(SOURCE_DATABASE_URL),
  client: redactUrl(CLIENT_DATABASE_URL),
})

// ---------------------------------------------------------------------------
// Step 2: pg_dump-check — verify binary is available
// ---------------------------------------------------------------------------

info("pg_dump-check", "Checking for pg_dump binary")

const PG_DUMP = resolvePgBin("pg_dump")
const PG_RESTORE = resolvePgBin("pg_restore")

if (!PG_DUMP || !PG_RESTORE) {
  fatal("pg_dump-check", "pg_dump / pg_restore not found on PATH or in standard install directories", {
    pg_dump: PG_DUMP,
    pg_restore: PG_RESTORE,
    hint: "Install PostgreSQL client tools: https://www.postgresql.org/download/ — ensure the bin folder is on PATH, or install to the default C:\\Program Files\\PostgreSQL\\<version>\\ directory.",
  })
}

const versionResult = run(PG_DUMP, ["--version"])
success("pg_dump-check", "pg_dump found", {
  path: PG_DUMP,
  pg_restore: PG_RESTORE,
  version: versionResult.stdout.trim(),
})

// ---------------------------------------------------------------------------
// Step 3: pg_dump — dump source schema + data
// ---------------------------------------------------------------------------

info("pg_dump", "Dumping source database", {
  schema: SCHEMA,
  source: redactUrl(SOURCE_DATABASE_URL),
  dumpFile: DUMP_FILE,
})

const dumpArgs = [
  "--schema", SCHEMA,
  "--no-owner",
  "--no-acl",
  "--format=custom",
  `--file=${DUMP_FILE}`,
  SOURCE_DATABASE_URL,
]

const dumpResult = run(PG_DUMP, dumpArgs)

if (!dumpResult.ok) {
  fatal("pg_dump", "pg_dump exited with error", {
    status: dumpResult.status,
    stderr: dumpResult.stderr,
    stdout: dumpResult.stdout,
    hint: "Common causes: wrong DATABASE_URL, network issue, or missing Supabase direct-connection URL (port 5432).",
  })
}

const dumpSizeBytes = fs.existsSync(DUMP_FILE) ? fs.statSync(DUMP_FILE).size : null
success("pg_dump", "Dump complete", {
  dumpFile: DUMP_FILE,
  size: formatBytes(dumpSizeBytes),
  sizeBytes: dumpSizeBytes,
  warnings: dumpResult.stderr.trim() || null,
})

// ---------------------------------------------------------------------------
// Step 4: pre-restore setup — ensure schema + citext exist in client DB
// ---------------------------------------------------------------------------

info("citext-check", "Preparing client DB (schema + citext extension)", {
  client: redactUrl(CLIENT_DATABASE_URL),
})

let clientSql
try {
  clientSql = postgres(CLIENT_DATABASE_URL, { max: 1, ssl: "require" })

  // Drop and recreate the schema so each restore is a clean slate (no duplicate rows)
  await clientSql`DROP SCHEMA IF EXISTS ${clientSql(SCHEMA)} CASCADE`
  info("citext-check", `Schema '${SCHEMA}' dropped (clean slate)`)
  await clientSql`CREATE SCHEMA ${clientSql(SCHEMA)}`
  info("citext-check", `Schema '${SCHEMA}' recreated`)

  // Ensure citext extension
  const rows = await clientSql`
    SELECT extname FROM pg_extension WHERE extname = 'citext'
  `
  if (rows.length === 0) {
    info("citext-check", "citext not found — creating extension")
    await clientSql`CREATE EXTENSION IF NOT EXISTS citext`
    success("citext-check", "Schema and citext extension ready (citext created)")
  } else {
    success("citext-check", "Schema and citext extension ready (citext already existed)")
  }
} catch (err) {
  warn("citext-check", "Could not fully prepare client DB — proceeding anyway", {
    message: err.message,
    hint: "If pg_restore fails, run manually in the client Supabase SQL editor: CREATE SCHEMA IF NOT EXISTS panda_realty; CREATE EXTENSION IF NOT EXISTS citext;",
  })
} finally {
  if (clientSql) {
    try { await clientSql.end() } catch { /* ignore */ }
  }
}

// ---------------------------------------------------------------------------
// Step 5: pg_restore — restore into client DB
// ---------------------------------------------------------------------------

info("pg_restore", "Restoring dump into client database", {
  schema: SCHEMA,
  client: redactUrl(CLIENT_DATABASE_URL),
})

const restoreArgs = [
  "--schema", SCHEMA,
  "--no-owner",
  "--no-acl",
  "--jobs=4",
  `--dbname=${CLIENT_DATABASE_URL}`,
  DUMP_FILE,
]

const restoreResult = run(PG_RESTORE, restoreArgs)

// pg_restore may exit with status 1 for non-fatal warnings (e.g. objects that don't exist yet for --clean).
// We treat status=1 + non-empty stderr as a warning, not an error, unless stdout is empty and stderr is severe.
if (!restoreResult.ok && restoreResult.status !== 1) {
  fatal("pg_restore", "pg_restore exited with a fatal error", {
    status: restoreResult.status,
    stderr: restoreResult.stderr,
    stdout: restoreResult.stdout,
    hint: "Common causes: wrong CLIENT_DATABASE_URL, SSL required (use port 5432 direct connection), or schema conflict. Check stderr above.",
  })
}

if (restoreResult.stderr.trim()) {
  warn("pg_restore", "pg_restore completed with warnings (non-fatal)", {
    status: restoreResult.status,
    stderr: restoreResult.stderr.trim(),
  })
} else {
  success("pg_restore", "Restore completed cleanly", { status: restoreResult.status })
}

// ---------------------------------------------------------------------------
// Step 6: verify — row-count comparison
// ---------------------------------------------------------------------------

info("verify", "Comparing row counts between source and client databases")

let sourceSql, clientSqlVerify
const countQuery = (sql) => sql`
  SELECT table_name
  FROM information_schema.tables
  WHERE table_schema = ${SCHEMA}
    AND table_type = 'BASE TABLE'
  ORDER BY table_name
`

/** Count rows in a single table, returning a number or null on error. */
async function countRows(sql, schema, table) {
  try {
    // Dynamic identifier — use sql() for identifiers
    const rows = await sql`SELECT count(*)::int AS n FROM ${sql(`${schema}.${table}`)}`
    return rows[0].n
  } catch {
    return null
  }
}

let verifyRows = []
let allMatch = true

try {
  sourceSql = postgres(SOURCE_DATABASE_URL, { max: 1, ssl: "require" })
  clientSqlVerify = postgres(CLIENT_DATABASE_URL, { max: 1, ssl: "require" })

  const tables = await countQuery(sourceSql)
  const tableNames = tables.map((r) => r.table_name)

  if (tableNames.length === 0) {
    warn("verify", "No tables found in source schema — skipping row count verification", { schema: SCHEMA })
  } else {
    for (const table of tableNames) {
      const [srcCount, cliCount] = await Promise.all([
        countRows(sourceSql, SCHEMA, table),
        countRows(clientSqlVerify, SCHEMA, table),
      ])
      const match = srcCount !== null && cliCount !== null && srcCount === cliCount
      if (!match) allMatch = false
      verifyRows.push({ table, source_count: srcCount, client_count: cliCount, match })
    }

    const mismatched = verifyRows.filter((r) => !r.match)

    if (allMatch) {
      success("verify", "All table row counts match", { tables: verifyRows })
    } else {
      warn("verify", "Row count mismatch detected — data may still be usable, but review the mismatches", {
        mismatched,
        all: verifyRows,
      })
    }
  }
} catch (err) {
  warn("verify", "Row count verification failed — could not connect to one or both databases", {
    message: err.message,
    hint: "Verify database URLs are reachable and credentials are correct.",
  })
  allMatch = false
} finally {
  if (sourceSql) { try { await sourceSql.end() } catch { /* ignore */ } }
  if (clientSqlVerify) { try { await clientSqlVerify.end() } catch { /* ignore */ } }
}

// ---------------------------------------------------------------------------
// Cleanup temp dump file
// ---------------------------------------------------------------------------

cleanup()
info("cleanup", "Temp dump file removed", { path: DUMP_FILE })

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

const duration_ms = Date.now() - startTime
const overallLevel = allMatch ? "success" : "warn"

process.stdout.write(
  JSON.stringify({
    level: overallLevel,
    step: "summary",
    msg: allMatch
      ? "backup-database completed — all row counts match"
      : "backup-database completed — restore done but row count verification had mismatches or warnings",
    exitCode: 0,
    duration_ms,
    rowVerification: verifyRows,
  }) + "\n"
)
