import { formatAdminEntityListCellDisplay } from "./admin-entity-list-display-format"
import type { AdminEntityColumn } from "./admin-entity-types"

/** Resolves `a.b.c` against nested objects (e.g. list embed `guardRef.firstName`). */
function valueAtLabelPath(
  row: Record<string, unknown>,
  path: string,
): unknown {
  const parts = path.split(".")
  let cur: unknown = row
  for (const p of parts) {
    if (cur == null || typeof cur !== "object") return undefined
    cur = (cur as Record<string, unknown>)[p]
  }
  return cur
}

/**
 * Build a single display string for relation filter / FK select / list cell labels from row fields.
 *
 * When `relatedColumns` is provided (the related entity’s `columns`), each `labelColumnKey` is
 * formatted with {@link formatAdminEntityListCellDisplay} so **numeric + `currencySymbol`** uses
 * the same **₱ #,##0.00**-style rules as list cells, **timestamp + `timestampListDisplay`** (**`date-us`**
 * / **`date-dmy`**) uses the same UTC calendar formatting as list cells, etc. When omitted, values are
 * `String()`-coerced (legacy behavior).
 *
 * Keys may use **dot paths** (e.g. `guardRef.firstName`) to read nested list-embed JSON on the row.
 * For dotted keys, formatting uses the **last segment** as the column metadata key when it matches
 * a related column (e.g. `guardRef.firstName` → `firstName`).
 */
export function adminEntityRelationOptionLabel(
  row: Record<string, unknown>,
  labelColumnKeys: readonly string[],
  relatedColumns?: readonly AdminEntityColumn[],
): string {
  const colByKey =
    relatedColumns != null
      ? new Map(relatedColumns.map((c) => [c.key, c]))
      : undefined

  return labelColumnKeys
    .map((k) => {
      const v = k.includes(".") ? valueAtLabelPath(row, k) : row[k]
      if (v == null) return ""
      const leafKey = k.includes(".") ? (k.split(".").pop() ?? k) : k
      const meta = colByKey?.get(leafKey)
      if (meta) {
        return formatAdminEntityListCellDisplay(v, meta).trim()
      }
      return String(v).trim()
    })
    .filter((s) => s.length > 0)
    .join(" · ")
}
