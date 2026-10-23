import { getTableColumns } from "drizzle-orm"
import type { PgTable } from "drizzle-orm/pg-core"

import type { AdminEntityDefinition } from "./admin-entity-types"
import { secondaryLineSourceColumnKeys } from "./admin-entity-secondary-line-source"

/**
 * Removes `_cursor_*` fields from admin list rows before JSON serialization.
 * Cursor fields support FK-based ORDER BY / keyset pagination and must not leak to clients.
 */
export function stripInternalAdminListRowFields(
  row: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...row }
  for (const k of Object.keys(out)) {
    if (k.startsWith("_cursor_")) delete out[k]
  }
  return out
}

/**
 * Shapes admin API rows for clients: strips internal cursor fields, physical table columns not
 * declared on the entity (so Drizzle-only fields like `colorId` can be omitted from configs), and
 * any declared column that is neither listed nor patchable (so `patch: true` + `list: false` fields
 * remain for edit dialogs fed from list data). List embed keys (not main-table columns) are kept.
 * The primary {@link AdminEntityDefinition.idColumn} key is always kept so list rows stay addressable
 * (`getRowId`, row `data-testid`s) even when the id column is hidden from the grid (`list: false`).
 */
export function stripAdminEntityApiRow(
  row: Record<string, unknown>,
  cfg: AdminEntityDefinition,
  table: PgTable,
): Record<string, unknown> {
  const out = stripInternalAdminListRowFields(row)
  const idJsonKey = cfg.idColumn.jsonKey
  const entityKeys = new Set(cfg.columns.map((c) => c.key))
  const tableColKeys = Object.keys(getTableColumns(table)) as string[]
  for (const k of tableColKeys) {
    if (!entityKeys.has(k) && k in out) delete out[k]
  }
  for (const col of cfg.columns) {
    if (!col.list && !col.patch) {
      if (col.key === idJsonKey) continue
      delete out[col.key]
    }
  }
  // Source columns whose embed is needed for another cell's secondary line must survive even when
  // that source column is itself `list: false` (e.g. invoice name shown under the customer name).
  const secondaryEmbedSourceKeys = secondaryLineSourceColumnKeys(cfg)
  for (const col of cfg.columns) {
    if (!col.listRelation || col.list) continue
    if (secondaryEmbedSourceKeys.has(col.key)) continue
    delete out[col.listRelation.embedJsonKey]
    delete out[`_cursor_${col.key}`]
  }
  return out
}
