import type {
  AdminEntityDefinition,
  AdminEntityListDateRangeFilter,
} from "./admin-entity-types"

/**
 * Active date-range toolbar specs: {@link AdminEntityDefinition.listDateRangeFilters} when non-empty,
 * otherwise a single-element array from {@link AdminEntityDefinition.listDateRangeFilter}.
 */
export function effectiveListDateRangeFilterSpecs(
  cfg: AdminEntityDefinition,
): readonly AdminEntityListDateRangeFilter[] {
  const multi = cfg.listDateRangeFilters
  if (multi != null && multi.length > 0) return multi
  const one = cfg.listDateRangeFilter
  return one ? [one] : []
}
