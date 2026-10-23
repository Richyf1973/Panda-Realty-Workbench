import "server-only"

import { desc, getTableColumns } from "drizzle-orm"
import type { PgColumn } from "drizzle-orm/pg-core"
import type { PgTable } from "drizzle-orm/pg-core"

import { normalizeAdminEntityYearMonthPeriodString } from "./admin-entity-list-year-month-period-parse"
import type { AdminDrizzleDb } from "./admin-entity-types"

/**
 * Distinct `(year, month)` pairs from a table, newest first, as canonical `YYYY-MM` strings.
 */
export async function selectDistinctYearMonthPeriodsFromTable(
  db: AdminDrizzleDb,
  table: PgTable,
  yearColumnKey: string,
  monthColumnKey: string,
): Promise<string[]> {
  const cols = getTableColumns(table)
  const yCol = cols[yearColumnKey as keyof typeof cols]
  const mCol = cols[monthColumnKey as keyof typeof cols]
  if (yCol == null || mCol == null) return []

  const rows = await db
    .selectDistinct({
      y: yCol,
      m: mCol,
    })
    .from(table)
    .orderBy(desc(yCol), desc(mCol))

  const out: string[] = []
  const seen = new Set<string>()
  for (const row of rows) {
    const y = row.y
    const mo = row.m
    const year = typeof y === "number" ? y : Number(y)
    const month = typeof mo === "number" ? mo : Number(mo)
    if (!Number.isFinite(year) || !Number.isFinite(month)) continue
    if (month < 1 || month > 12) continue
    const key = normalizeAdminEntityYearMonthPeriodString(year, month)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(key)
  }
  return out
}

/**
 * Distinct calendar months from a single date (or date-like text) column, newest first, as `YYYY-MM`.
 */
export async function selectDistinctYearMonthPeriodsFromDateColumn(
  db: AdminDrizzleDb,
  table: PgTable,
  dateColumnKey: string,
): Promise<string[]> {
  const cols = getTableColumns(table)
  const dCol = cols[dateColumnKey as keyof typeof cols] as PgColumn | undefined
  if (dCol == null) return []

  const rows = await db.selectDistinct({ d: dCol }).from(table).orderBy(desc(dCol))

  const periods = new Set<string>()
  for (const row of rows) {
    const raw = row.d
    if (raw == null) continue
    const s =
      typeof raw === "string"
        ? raw
        : raw instanceof Date
          ? raw.toISOString().slice(0, 10)
          : String(raw).slice(0, 10)
    const ym =
      s.length >= 7 && /^\d{4}-\d{2}/.test(s) ? s.slice(0, 7) : ""
    if (!/^\d{4}-\d{2}$/.test(ym)) continue
    periods.add(ym)
  }

  return [...periods].sort().reverse()
}
