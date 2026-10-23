/**
 * Timestamp fields with a calendar control store **UTC midnight** for the selected **local**
 * calendar day (`getFullYear` / `getMonth` / `getDate` from the picker → `Date.UTC`).
 */
export function adminEntityTimestampCalendarSelectionToUtcIso(d: Date): string {
  return new Date(
    Date.UTC(
      d.getFullYear(),
      d.getMonth(),
      d.getDate(),
      0,
      0,
      0,
      0,
    ),
  ).toISOString()
}

/** Map form string (ISO, `YYYY-MM-DD`, or `M/D/YYYY`) to a local `Date` for the day picker. */
export function adminEntityTimestampFormStringToPickerDate(
  value: string,
): Date | undefined {
  const t = value.trim()
  if (!t) return undefined

  const ymd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t)
  if (ymd) {
    const y = Number.parseInt(ymd[1]!, 10)
    const m = Number.parseInt(ymd[2]!, 10) - 1
    const day = Number.parseInt(ymd[3]!, 10)
    if (m >= 0 && m <= 11 && day >= 1 && day <= 31) {
      return new Date(y, m, day)
    }
  }

  const parsed = Date.parse(t)
  if (!Number.isNaN(parsed)) {
    const d = new Date(t)
    return new Date(
      d.getUTCFullYear(),
      d.getUTCMonth(),
      d.getUTCDate(),
    )
  }

  const mdy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t)
  if (mdy) {
    const mm = Number.parseInt(mdy[1]!, 10) - 1
    const dd = Number.parseInt(mdy[2]!, 10)
    const yyyy = Number.parseInt(mdy[3]!, 10)
    if (mm >= 0 && mm <= 11 && dd >= 1 && dd <= 31 && yyyy >= 1) {
      return new Date(yyyy, mm, dd)
    }
  }

  return undefined
}
