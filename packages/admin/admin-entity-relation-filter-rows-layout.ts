import type { AdminEntityListRelationFilterLayout } from "./admin-entity-types"

/** Row shape produced for relation filter UI (inline toolbar + optional side panel). */
export type AdminEntityRelationFilterRowWithUiLayout = {
  readonly uiLayout: AdminEntityListRelationFilterLayout
}

/**
 * Split relation filter rows by `uiLayout`.
 * Inline toolbar must use `inlineRows` whenever `inlineRows.length > 0`, even when `sideRows` is non-empty
 * (do not hide all inline filters just because one filter uses `side`).
 */
export function partitionAdminEntityRelationFilterRowsByUiLayout<
  T extends AdminEntityRelationFilterRowWithUiLayout,
>(rows: readonly T[]): { inlineRows: T[]; sideRows: T[] } {
  const inlineRows = rows.filter((r) => r.uiLayout !== "side")
  const sideRows = rows.filter((r) => r.uiLayout === "side")
  return { inlineRows, sideRows }
}
