import type { AdminCellAlign, AdminEntityColumn } from "./admin-entity-types"

/**
 * True when `docSqlType` documents a Postgres `bool` / `boolean` column.
 * Uses the first whitespace-separated token (e.g. `"bool default false"` → bool).
 */
export function docSqlTypeIsBooleanLike(docSqlType: string | undefined): boolean {
  if (docSqlType === undefined || docSqlType === "") return false
  const first = docSqlType.trim().toLowerCase().split(/\s+/)[0]
  return first === "bool" || first === "boolean"
}

/** List UI: bool icons, default center alignment, no text input while row editing. */
export function adminEntityColumnTreatsAsBoolean(field: AdminEntityColumn): boolean {
  return field.valueType === "boolean" || docSqlTypeIsBooleanLike(field.docSqlType)
}

/** Coerce API/string forms to boolean for display; returns null if not boolean-like. */
export function coerceBooleanLike(value: unknown): boolean | null {
  if (value === null || value === undefined) return null
  if (typeof value === "boolean") return value
  if (typeof value === "string") {
    const s = value.trim().toLowerCase()
    if (s === "true") return true
    if (s === "false") return false
  }
  return null
}

/** Whether the list cell should render as a boolean (icons), after client normalization rules. */
export function displayAdminEntityBoolean(
  raw: unknown,
  field: AdminEntityColumn,
): boolean | null {
  if (adminEntityColumnTreatsAsBoolean(field)) {
    return coerceBooleanLike(raw)
  }
  if (typeof raw === "boolean") return raw
  return null
}

/**
 * True when {@link AdminEntityColumn.listCellHideWhenSiblingPresentKeys} is set and any of those
 * sibling columns on this row carries a non-empty value — the cell should then render blank.
 */
export function adminEntityListCellHiddenBySiblings(
  rowOriginal: Record<string, unknown>,
  field: AdminEntityColumn,
): boolean {
  const keys = field.listCellHideWhenSiblingPresentKeys
  if (keys == null || keys.length === 0) return false
  return keys.some((key) => {
    const value = rowOriginal[key]
    return value != null && String(value).trim() !== ""
  })
}

export function resolveAdminEntityCellAlign(field: AdminEntityColumn): AdminCellAlign {
  if (field.cellAlign != null) return field.cellAlign
  if (adminEntityColumnTreatsAsBoolean(field)) return "center"
  if (field.valueType === "numeric") return "right"
  return "left"
}
