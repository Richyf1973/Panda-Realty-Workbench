import { adminEntityListColumnsInOrder } from "./admin-entity-list-column-order"
import type { AdminEntityColumn, AdminEntityDefinition } from "./admin-entity-types"

/**
 * Create / edit dialog field order:
 * - With **`formColumnOrder`**: keys in that order, keeping only fields applicable to the mode
 *   (`create` vs `patch`).
 * - Otherwise: same order as the list table (`adminEntityListColumnsInOrder`), then any
 *   remaining create/patch-only columns in `columns` definition order (e.g. `list: false`).
 */
export function adminEntityFormColumnsInOrder(
  cfg: AdminEntityDefinition,
  mode: "create" | "patch",
): AdminEntityColumn[] {
  const need =
    mode === "create"
      ? (c: AdminEntityColumn) => c.create
      : (c: AdminEntityColumn) => c.patch || c.crudEditReadOnly === true

  const explicit = cfg.formColumnOrder
  if (explicit?.length) {
    const byKey = new Map(cfg.columns.map((c) => [c.key, c]))
    const result: AdminEntityColumn[] = []
    for (const key of explicit) {
      const col = byKey.get(key)
      if (!col) {
        throw new Error(
          `[adminEntityFormColumnsInOrder] ${cfg.slug}: formColumnOrder references unknown column ${JSON.stringify(key)}`,
        )
      }
      if (!need(col)) continue
      result.push(col)
    }
    /** Fields rendered below related tabs — still part of create/patch payloads when applicable. */
    const afterRelatedKeys = cfg.crudFormAfterRelatedColumnKeys
    if (afterRelatedKeys?.length) {
      const seen = new Set(result.map((c) => c.key))
      for (const key of afterRelatedKeys) {
        if (seen.has(key)) continue
        const col = byKey.get(key)
        if (!col || !need(col)) continue
        result.push(col)
        seen.add(key)
      }
    }
    return result
  }

  const listOrdered = adminEntityListColumnsInOrder(cfg)
  const fromList = listOrdered.filter(need)
  const seen = new Set(fromList.map((c) => c.key))
  const rest = cfg.columns.filter(
    (c) => need(c) && !seen.has(c.key),
  ) as AdminEntityColumn[]
  return [...fromList, ...rest]
}
