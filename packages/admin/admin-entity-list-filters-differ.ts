export type AdminListBooleanFilterSegment = "all" | "true" | "false"

/**
 * Whether the current list filters narrow rows relative to a given boolean baseline.
 *
 * `hasNonBooleanActiveFilter` collapses search, append-where hints, year/month, date ranges, and
 * relation filters into a single "something other than the boolean toggle is active" flag. The
 * boolean toggle is compared separately against `compareSegment`:
 *
 * - pass `compareSegment: "all"` for the toolbar "Clear filters" sense (any narrowing from show-all).
 * - pass the entity's default segment for the empty-state "differs from defaults" sense (so a
 *   default-on toggle like Favorites does NOT count as off-default).
 */
export function adminListFiltersDifferFromSegment(
  hasNonBooleanActiveFilter: boolean,
  booleanFilterEnabled: boolean,
  booleanSegment: AdminListBooleanFilterSegment,
  compareSegment: AdminListBooleanFilterSegment,
): boolean {
  return (
    hasNonBooleanActiveFilter ||
    (booleanFilterEnabled && booleanSegment !== compareSegment)
  )
}
