import type { AdminEntityDefinition } from "./admin-entity-types"

/**
 * Source column keys referenced by any column's {@link AdminEntityColumn.listCellSecondaryFromRelation}.
 * The source relation's embed must survive list-response stripping and `fields=` filtering so a cell
 * can render a secondary line from it (e.g. invoice name under the customer name).
 */
export function secondaryLineSourceColumnKeys(
  cfg: AdminEntityDefinition,
): Set<string> {
  const keys = new Set<string>()
  for (const col of cfg.columns) {
    const secondary = col.listCellSecondaryFromRelation
    if (secondary) keys.add(secondary.sourceColumnKey)
  }
  return keys
}
