import type { AdminEntityColumn } from "./admin-entity-types"

/** Unicode minus U+2212, same as legacy Vibram sales copy. */
const MINUS = "\u2212"

/**
 * Human label for a signed whole-day delta (e.g. **0 day**, **1 day**, **5 days**, **−3 days**).
 */
export function formatAdminEntitySignedDayCountLabel(days: number): string {
  const n = Math.abs(days)
  const unit = n <= 1 ? "day" : "days"
  if (days < 0) return `${MINUS}${n} ${unit}`
  return `${days} ${unit}`
}

/**
 * Parses list/API integer cell values for {@link AdminEntityColumn.listDayCountBadgeBands}.
 */
export function parseAdminEntityListDayCountInteger(raw: unknown): number | null {
  if (raw == null || raw === "") return null
  if (typeof raw === "number") {
    return Number.isFinite(raw) ? Math.trunc(raw) : null
  }
  const s = String(raw).trim()
  if (s === "") return null
  const n = Number(s)
  return Number.isFinite(n) ? Math.trunc(n) : null
}

export type AdminEntityListDayCountBadgeBands = NonNullable<
  AdminEntityColumn["listDayCountBadgeBands"]
>

/**
 * Tailwind classes for a pill badge from **abs(day count)** vs configured bands.
 */
export function adminEntityListDayCountBadgeClassName(
  days: number,
  bands: AdminEntityListDayCountBadgeBands,
): string {
  const a = Math.abs(days)
  if (a >= bands.redFrom) {
    return "border-transparent bg-destructive/15 text-destructive dark:bg-destructive/25 dark:text-destructive-foreground"
  }
  if (a >= bands.orangeFrom && a <= bands.orangeThrough) {
    return "border-transparent bg-amber-500/20 text-amber-950 dark:bg-amber-400/20 dark:text-amber-50"
  }
  if (a <= bands.greenThrough) {
    return "border-transparent bg-emerald-600/15 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-50"
  }
  return "border-transparent bg-muted text-foreground"
}
