import type { AdminEntityColumn, AdminEntityDefinition } from "./admin-entity-types"

/**
 * Resolves {@link AdminEntityDefinition.columns} entries in the given order for list table
 * rendering. Unlike {@link adminEntityListColumnsInOrder}, keys need not have `list: true`
 * (used for app-specific narrow table modes that still reuse standard cell formatters).
 */
export function adminEntityListColumnsByKeys(
  cfg: AdminEntityDefinition,
  keys: readonly string[],
): AdminEntityColumn[] {
  const byKey = new Map(cfg.columns.map((c) => [c.key, c] as const))
  return keys.map((key) => {
    const col = byKey.get(key)
    if (!col) {
      throw new Error(
        `[adminEntityListColumnsByKeys] ${cfg.slug}: unknown column ${JSON.stringify(key)}`,
      )
    }
    return col
  })
}
