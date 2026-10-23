/** Native `<input type="time">` step in seconds (15 minutes). */
export const QUARTER_HOUR_TIME_STEP_SECONDS = 15 * 60

const MAX_QUARTER_HOUR_MINUTES = 23 * 60 + 45

/**
 * Parses an HTML time value (`HH:MM`) and snaps to the nearest 15-minute mark,
 * clamped so the result never rolls past 23:45.
 */
export function snapTimeToQuarterHour(timeStr: string): string | null {
  const trimmed = timeStr.trim()
  if (!trimmed) return null
  const m = /^(\d{1,2}):(\d{2})$/.exec(trimmed)
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (Number.isNaN(h) || Number.isNaN(min) || h < 0 || h > 23 || min < 0 || min > 59) {
    return null
  }
  const total = h * 60 + min
  let snapped = Math.round(total / 15) * 15
  if (snapped > MAX_QUARTER_HOUR_MINUTES) snapped = MAX_QUARTER_HOUR_MINUTES
  const h2 = Math.floor(snapped / 60)
  const m2 = snapped % 60
  return `${String(h2).padStart(2, "0")}:${String(m2).padStart(2, "0")}`
}

/** Snaps duration to a positive multiple of 15 minutes; minimum 15. */
export function snapDurationMinutes(raw: number): number {
  if (!Number.isFinite(raw) || raw <= 0) return 15
  let s = Math.round(raw / 15) * 15
  if (s < 15) s = 15
  return s
}
