/**
 * Relation / many-relation list filters: URL + client state use a single string per column key.
 * Multi-select encodes multiple ids as a sorted, comma-separated list (ids never contain commas).
 */

/** Scalar or OR semantics for one filter param (see `admin-entity-list-page.ts`). */
export type AdminRelationFilterApiValue =
  | string
  | number
  | readonly (string | number)[]

export function relationFilterStoredValues(
  multiSelect: boolean,
  stored: string,
): string[] {
  const t = stored.trim()
  if (!multiSelect) return t === "" ? [] : [t]
  if (t === "") return []
  const parts = t
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
  return [...new Set(parts)].sort((a, b) => a.localeCompare(b))
}

export function serializeRelationFilterStored(
  multiSelect: boolean,
  values: readonly string[],
): string {
  const uniq = [
    ...new Set(
      values.map((v) => v.trim()).filter((v) => v.length > 0),
    ),
  ].sort((a, b) => a.localeCompare(b))
  if (!multiSelect) return uniq[0] ?? ""
  return uniq.join(",")
}
