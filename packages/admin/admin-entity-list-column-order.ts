import type { AdminEntityColumn, AdminEntityDefinition } from "./admin-entity-types"

/**
 * List table columns in display order: `cfg.listColumnOrder` when set (must list every
 * visible `columns[].list` key exactly once — omit `listSuppressedFromTable` — see entity
 * definition consistency tests), otherwise definition order filtered by `list`.
 */
export function adminEntityListColumnsInOrder(
  cfg: AdminEntityDefinition,
): AdminEntityColumn[] {
  const listCols = cfg.columns.filter(
    (c) => c.list && !c.listSuppressedFromTable,
  ) as AdminEntityColumn[]
  const order = cfg.listColumnOrder
  if (!order?.length) {
    return listCols
  }
  const byKey = new Map(listCols.map((c) => [c.key, c]))
  return order.map((key) => {
    const col = byKey.get(key)
    if (!col) {
      throw new Error(
        `[adminEntityListColumnsInOrder] ${cfg.slug}: listColumnOrder references unknown or non-list column ${JSON.stringify(key)}`,
      )
    }
    return col
  })
}
