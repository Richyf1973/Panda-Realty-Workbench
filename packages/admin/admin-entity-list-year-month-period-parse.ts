const YEAR_MONTH_RE = /^(\d{4})-(\d{1,2})$/

/**
 * Parse `YYYY-M` / `YYYY-MM` into `{ year, month }` or `null` if invalid.
 * Month must be 1–12; year must be in [1900, 2100].
 */
export function parseAdminEntityYearMonthPeriod(
  raw: string,
): { year: number; month: number } | null {
  const t = raw.trim()
  const m = YEAR_MONTH_RE.exec(t)
  if (!m) return null
  const year = Number(m[1])
  const month = Number(m[2])
  if (!Number.isFinite(year) || !Number.isFinite(month)) return null
  if (year < 1900 || year > 2100) return null
  if (month < 1 || month > 12) return null
  return { year, month }
}

/** Canonical period string for URLs and API (`YYYY-MM`). */
export function normalizeAdminEntityYearMonthPeriodString(
  year: number,
  month: number,
): string {
  return `${year}-${String(month).padStart(2, "0")}`
}

/** Calendar month in UTC (matches period labels using `timeZone: "UTC"`). */
export function defaultAdminEntityYearMonthPeriodUtcNow(): string {
  const d = new Date()
  return normalizeAdminEntityYearMonthPeriodString(
    d.getUTCFullYear(),
    d.getUTCMonth() + 1,
  )
}

/** Short label for select options, e.g. `2024-03` → "Mar 2024". */
export function formatAdminEntityYearMonthPeriodLabel(period: string): string {
  const p = parseAdminEntityYearMonthPeriod(period)
  if (!p) return period
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(Date.UTC(p.year, p.month - 1, 1))
}
