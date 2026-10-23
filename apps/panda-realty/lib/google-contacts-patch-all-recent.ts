/**
 * Scope for `POST /api/admin/google-contacts/patch-all` filtering.
 * Dev mode: reads env vars (`PANDA_GOOGLE_CONTACTS_PATCH_ALL_RECENT_HOURS`, `PANDA_GOOGLE_CONTACTS_PATCH_ALL_PROPERTY_LIST_IDS`).
 * Production: accepts optional `dateRange` parameter from API query string.
 */

export type GoogleContactsPatchAllRecentFilter = {
  hours: number
  cutoff: Date
}

export type DateRangeOption = "today" | "yesterday" | "this-week" | "last-30" | "all"

/** Returns midnight UTC of today as a Date. */
function startOfTodayUtc(): Date {
  const d = new Date()
  d.setUTCHours(0, 0, 0, 0)
  return d
}

/**
 * Returns the cutoff Date for a given date range option.
 * "today" uses calendar midnight UTC — using hours-from-now would compute ~now and match nothing.
 * Other ranges use hours-from-now approximations.
 */
function getCutoffForDateRange(dateRange: DateRangeOption): Date | null {
  if (dateRange === "all") return null
  if (dateRange === "today") return startOfTodayUtc()
  const hoursMap: Record<Exclude<DateRangeOption, "today" | "all">, number> = {
    yesterday: 48,
    "this-week": 168,
    "last-30": 720,
  }
  const hours = hoursMap[dateRange]
  return new Date(Date.now() - hours * 60 * 60 * 1000)
}

/**
 * Calculate cutoff date for recent activity filtering.
 * When `dateRange` is provided (production), use it.
 * When `dateRange` is null, fall back to env var (dev mode).
 * If both are null/empty, return null (no filtering).
 */
export function getGoogleContactsPatchAllRecentFilter(dateRange?: DateRangeOption | null): GoogleContactsPatchAllRecentFilter | null {
  // Try user-provided dateRange first (production)
  if (dateRange && dateRange !== "all") {
    const cutoff = getCutoffForDateRange(dateRange)
    if (cutoff != null) {
      const hours = Math.round((Date.now() - cutoff.getTime()) / (60 * 60 * 1000))
      return { hours, cutoff }
    }
  }

  // Fall back to env var (dev mode only)
  if (process.env.NODE_ENV !== "development") return null
  const raw = process.env.PANDA_GOOGLE_CONTACTS_PATCH_ALL_RECENT_HOURS?.trim()
  if (!raw) return null
  const hours = Number(raw)
  if (!Number.isFinite(hours) || hours <= 0) return null
  return {
    hours,
    cutoff: new Date(Date.now() - hours * 60 * 60 * 1000),
  }
}

/**
 * Dev-only: comma-separated **`panda_properties.property_list_id`** values. When non-empty,
 * bulk sync fetches only rows for those listings (combined with optional recent-hours filter via
 * {@link getGoogleContactsPatchAllRecentFilter}). Ignored outside **`NODE_ENV=development`**.
 */
export function getGoogleContactsPatchAllPropertyListAllowlist(): number[] | null {
  if (process.env.NODE_ENV !== "development") return null
  const raw = process.env.PANDA_GOOGLE_CONTACTS_PATCH_ALL_PROPERTY_LIST_IDS?.trim()
  if (!raw) return null
  const ids = new Set<number>()
  for (const part of raw.split(",")) {
    const t = part.trim()
    if (!t || !/^\d+$/.test(t)) continue
    const n = Number(t)
    if (Number.isFinite(n) && n > 0) ids.add(n)
  }
  if (ids.size === 0) return null
  return [...ids].sort((a, b) => a - b)
}
