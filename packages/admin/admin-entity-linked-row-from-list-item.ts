import { stripInternalAdminListRowFields } from "./admin-entity-list-response-strip"
import type { AdminEntityDefinition } from "./admin-entity-types"

/**
 * Builds a related-row-shaped object from a related **list API** item (for inline `linkedSale`-style
 * embeds). Copies declared list + patchable columns so FK detail hydration can skip a redundant GET
 * when the id matches.
 */
export function adminEntityLinkedRowFromListApiItem(
  row: Record<string, unknown>,
  relCfg: AdminEntityDefinition,
): Record<string, unknown> {
  const allowed = new Set<string>()
  for (const c of relCfg.columns) {
    if (c.list) allowed.add(c.key)
    if (c.patch) allowed.add(c.key)
    if (c.listRelation?.embedJsonKey) allowed.add(c.listRelation.embedJsonKey)
  }
  const stripped = stripInternalAdminListRowFields(row)
  const out: Record<string, unknown> = {}
  for (const k of allowed) {
    if (Object.hasOwn(stripped, k)) out[k] = stripped[k]
  }
  const idKey = relCfg.idColumn.jsonKey
  if (Object.hasOwn(stripped, idKey)) out[idKey] = stripped[idKey]
  return out
}
