import type { AdminEntityColumn } from "./admin-entity-types"

/** Create/edit and relation-filter UI label; falls back to the canonical column `label`. */
export function adminEntityColumnFormLabel(col: AdminEntityColumn): string {
  return col.formLabel ?? col.label
}
