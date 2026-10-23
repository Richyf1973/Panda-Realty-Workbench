/**
 * Calendar month-end helpers for {@link AdminEntityColumn.dateStringFormControl}
 * **`"yearMonthEnd"`** — local calendar (same semantics as JS `Date(y, m, 0)`).
 */

/** `YYYY-MM` → last calendar day `YYYY-MM-DD`, or `null` if invalid. */
export function adminEntityYmdFromYearMonth(ym: string): string | null {
  const t = ym.trim()
  const m = /^(\d{4})-(\d{2})$/.exec(t)
  if (!m) return null
  const year = Number(m[1])
  const mo = Number(m[2])
  /** Upper bound wide enough for far-future E2E sentinel periods (e.g. 2200-12). */
  if (year < 1900 || year > 2200 || mo < 1 || mo > 12) return null
  const last = new Date(year, mo, 0)
  const d = last.getDate()
  return `${year}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`
}

/** True when `ymd` is `YYYY-MM-DD` and that day is the last day of its calendar month. */
export function adminEntityYmdIsLastDayOfMonth(ymd: string): boolean {
  const t = ymd.trim()
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t)
  if (!m) return false
  const year = Number(m[1])
  const mo = Number(m[2])
  const day = Number(m[3])
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(mo) ||
    !Number.isFinite(day)
  ) {
    return false
  }
  const last = new Date(year, mo, 0).getDate()
  return day === last
}
