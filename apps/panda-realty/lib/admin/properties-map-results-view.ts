/**
 * Panda properties admin — the map-area-filter ("streetFilter") RESULTS view.
 *
 * When the map filter is active the list shows a normal one-line comparable table (not the compact
 * stacked quick table): each property on a single line, no Status column, and no right-side
 * extra-action icon cluster. This module is the single source of truth for "is this the map-results
 * view?" so the column resolver and the row-actions component agree.
 */

import type { AdminEntityColumn } from "@repo/admin/admin-entity-types"

import { PANDA_PROPERTIES_QUICK_TABLE_COLUMN_KEYS } from "./properties-quick-table-filters"

/** True when a map-area filter is active (a non-empty `streetFilter` append-where hint / URL param). */
export function streetFilterSegmentActive(value: string | null | undefined): boolean {
  return (value ?? "").trim() !== ""
}

/**
 * Columns for the map-results table: the quick comparison set **minus** `propertyStatusId`.
 *
 * Because this set does NOT exactly match {@link PANDA_PROPERTIES_QUICK_TABLE_COLUMN_KEYS}, the
 * quick-density branch of `transformPandaPropertiesQuickTableListColumns` does not apply — the
 * columns render at their default one-line widths (no 2-line Street/Suburb wrap) and the freeze
 * pipeline gives Street its normal fixed width, which removes the owner-bleeds-under-Street overlap.
 * The transform's separate map branch (keyed off {@link isPandaPropertiesMapTableColumnSet}) DOES
 * run, but only to add the per-row "hide historical sale price/date" flag — no width/label changes.
 */
export const PANDA_PROPERTIES_MAP_TABLE_COLUMN_KEYS = PANDA_PROPERTIES_QUICK_TABLE_COLUMN_KEYS.filter(
  (key) => key !== "propertyStatusId",
)

/** True when `cols` is exactly the map-results column set, in order. */
export function isPandaPropertiesMapTableColumnSet(
  cols: readonly AdminEntityColumn[],
): boolean {
  if (cols.length !== PANDA_PROPERTIES_MAP_TABLE_COLUMN_KEYS.length) return false
  return PANDA_PROPERTIES_MAP_TABLE_COLUMN_KEYS.every((k, i) => cols[i]?.key === k)
}
