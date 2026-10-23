import { adminEntityTimestampFormStringToPickerDate } from "./admin-entity-crud-timestamp-form"

/** Store selected local calendar day as `YYYY-MM-DD` for Postgres `date` text mode. */
export function adminEntityDateStringCalendarSelectionToYmd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function adminEntityDateStringFormStringToPickerDate(
  value: string,
): Date | undefined {
  return adminEntityTimestampFormStringToPickerDate(value)
}

/** Convert a stored `YYYY-MM-DD` string to the display format `MM/DD/YYYY`. Returns `""` if invalid. */
export function adminEntityDateStringYmdToMdy(ymd: string): string {
  const t = ymd.trim()
  if (!t) return ""
  const m = t.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return ""
  return `${m[2]}/${m[3]}/${m[1]}`
}

/**
 * Parse a user-typed `MM/DD/YYYY` string into a stored `YYYY-MM-DD` string.
 * Returns `null` when the input is incomplete or not a valid date.
 */
export function adminEntityDateStringMdyToYmd(mdy: string): string | null {
  const t = mdy.trim()
  if (!t) return null
  const m = t.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!m) return null
  const [, mo, d, y] = m
  const candidate = `${y}-${mo}-${d}`
  // Verify the date is real (e.g. rejects 02/30/2026)
  if (isNaN(new Date(candidate).getTime())) return null
  return candidate
}

/**
 * If `display` is an auto-slashed partial date `MM/DD` (exactly 5 chars, digits + one slash),
 * append the current year to produce `MM/DD/YYYY`. Otherwise return `display` unchanged.
 * Called in `handleBlur` so typing `0509` → auto-slash → `05/09` → blur → `05/09/2026`.
 */
export function adminEntityDateStringExpandShortDate(display: string): string {
  const t = display.trim()
  if (/^\d{2}\/\d{2}$/.test(t)) {
    return `${t}/${new Date().getFullYear()}`
  }
  return display
}

/**
 * Auto-format a raw keystroke string into `MM/DD/YYYY` as the user types.
 * Strips non-digits, caps at 8 digits, then re-inserts `/` at positions 2 and 4.
 * E.g. `"04302026"` → `"04/30/2026"`, `"0430"` → `"04/30"`.
 */
export function adminEntityDateStringAutoFormatInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8)
  if (digits.length <= 2) {
    // Preserve a trailing slash when the user deleted the digit after MM/ (e.g. "04/" stays "04/")
    if (digits.length === 2 && raw.endsWith("/")) return `${digits}/`
    return digits
  }
  if (digits.length <= 4) {
    if (digits.length === 4 && raw.endsWith("/")) return `${digits.slice(0, 2)}/${digits.slice(2)}/`
    return `${digits.slice(0, 2)}/${digits.slice(2)}`
  }
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

/**
 * Display values stored as Postgres **`date`** strings (`YYYY-MM-DD`) like the date-picker button:
 * **`Mar 27, 2026`** (local calendar day; no timezone shift for plain `YYYY-MM-DD`).
 */
export function formatAdminEntityDateStringYmdForDisplay(raw: unknown): string {
  if (raw == null) return ""
  const t = String(raw).trim()
  if (!t) return ""
  const d = adminEntityDateStringFormStringToPickerDate(t)
  if (!d) return t
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d)
}
