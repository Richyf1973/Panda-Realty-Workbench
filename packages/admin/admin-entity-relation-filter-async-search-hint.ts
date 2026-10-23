import type { AdminEntityDefinition } from "./admin-entity-types"

/**
 * Human-readable list of related-entity fields used by list `search` (for relation-filter UI copy).
 */
export function formatRelationFilterAsyncSearchFieldsHint(
  relCfg: AdminEntityDefinition | undefined,
): string | undefined {
  const keys = relCfg?.listSearch?.columnKeys
  if (relCfg == null || keys == null || keys.length === 0) return undefined
  const labels = keys
    .map((k) => relCfg.columns.find((c) => c.key === k)?.label)
    .filter((x): x is string => Boolean(x?.trim()))
  if (labels.length === 0) return undefined
  if (labels.length === 1) return labels[0]
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`
  return `${labels.slice(0, -1).join(", ")}, and ${labels[labels.length - 1]}`
}
