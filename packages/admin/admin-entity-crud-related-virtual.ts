import type {
  AdminEntityCrudRelatedVirtualColumn,
  AdminEntityCrudRelatedVirtualColumnFactor,
} from "./admin-entity-types"
import type { LineRow } from "./admin-entity-crud-related-collections-draft"

/** `inlineVirtualColumns` entry with `kind: "product"` (operand factors). */
export type AdminEntityCrudRelatedVirtualProductColumn = Extract<
  AdminEntityCrudRelatedVirtualColumn,
  { kind: "product" }
>

export type AdminRelatedRelationNumericMaps = ReadonlyMap<string, ReadonlyMap<string, number>>

export function relationNumericLookupCacheKey(
  fkColumnKey: string,
  relatedNumericColumnKey: string,
): string {
  return `${fkColumnKey}::${relatedNumericColumnKey}`
}

export function valueAtNestedPath(
  row: Record<string, unknown>,
  path: string,
): unknown {
  if (!path.includes(".")) return row[path]
  const parts = path.split(".")
  let cur: unknown = row
  for (const p of parts) {
    if (cur == null || typeof cur !== "object") return undefined
    cur = (cur as Record<string, unknown>)[p]
  }
  return cur
}

/** Positive finite number from parent detail (e.g. period length in days), or null. */
export function parentDetailNumericAtPath(
  parentDetail: Record<string, unknown> | null | undefined,
  path: string | undefined,
): number | null {
  if (path == null || path.trim() === "") return null
  if (parentDetail == null) return null
  const raw = valueAtNestedPath(parentDetail, path)
  const n =
    typeof raw === "number" && Number.isFinite(raw)
      ? raw
      : Number(String(raw ?? "").trim())
  if (!Number.isFinite(n) || n <= 0) return null
  return n
}

/** Non-negative finite number from parent detail (e.g. `perDayAllowance`), or null. */
export function parentDetailNonNegativeNumericAtPath(
  parentDetail: Record<string, unknown> | null | undefined,
  path: string | undefined,
): number | null {
  if (path == null || path.trim() === "") return null
  if (parentDetail == null) return null
  const raw = valueAtNestedPath(parentDetail, path)
  const n =
    typeof raw === "number" && Number.isFinite(raw)
      ? raw
      : Number(String(raw ?? "").trim())
  if (!Number.isFinite(n) || n < 0) return null
  return n
}

export function parseLineNumericField(
  line: LineRow,
  columnKey: string,
): number | null {
  const raw = line[columnKey]
  const s =
    typeof raw === "string" ? raw.trim() : String(raw ?? "").trim()
  if (s === "") return null
  const n = Number(s.replace(/,/g, ""))
  return Number.isFinite(n) ? n : null
}

export function buildRelationNumericLookupMap(
  rawItems: Record<string, unknown>[],
  idJsonKey: string,
  valueColumnKey: string,
): ReadonlyMap<string, number> {
  const m = new Map<string, number>()
  for (const row of rawItems) {
    const id = row[idJsonKey]
    if (id == null) continue
    const rawVal = valueColumnKey.includes(".")
      ? valueAtNestedPath(row as Record<string, unknown>, valueColumnKey)
      : row[valueColumnKey]
    let n: number
    if (typeof rawVal === "number") n = rawVal
    else {
      const s = String(rawVal ?? "").trim()
      if (s === "") continue
      n = Number(s)
    }
    if (!Number.isFinite(n)) continue
    m.set(String(id), n)
  }
  return m
}

export function virtualColumnFactorNumeric(
  factor: AdminEntityCrudRelatedVirtualColumnFactor,
  line: LineRow,
  relationMaps: AdminRelatedRelationNumericMaps,
  parentDetail?: Record<string, unknown> | null,
): number | null {
  if (factor.kind === "literalNumeric") {
    return Number.isFinite(factor.value) ? factor.value : null
  }
  if (factor.kind === "lineNumeric") {
    return parseLineNumericField(line, factor.columnKey)
  }
  if (factor.kind === "parentDetailNumeric") {
    return parentDetailNonNegativeNumericAtPath(parentDetail, factor.path)
  }
  const cacheKey = relationNumericLookupCacheKey(
    factor.fkColumnKey,
    factor.relatedNumericColumnKey,
  )
  const map = relationMaps.get(cacheKey)
  if (!map) return null
  const fkRaw = line[factor.fkColumnKey]
  const id =
    typeof fkRaw === "string" ? fkRaw.trim() : String(fkRaw ?? "").trim()
  if (id === "") return null
  const n = map.get(id)
  if (n === undefined || !Number.isFinite(n)) return null
  const path = factor.divideByParentDetailNumericPath
  if (path != null && path.trim() !== "") {
    const denom = parentDetailNumericAtPath(parentDetail, path)
    if (denom == null) return null
    const q = n / denom
    return Number.isFinite(q) ? q : null
  }
  return n
}

export function evalRelatedVirtualProduct(
  col: Pick<
    AdminEntityCrudRelatedVirtualProductColumn,
    "kind" | "factorLeft" | "factorRight"
  >,
  line: LineRow,
  relationMaps: AdminRelatedRelationNumericMaps,
  parentDetail?: Record<string, unknown> | null,
): number | null {
  if (col.kind !== "product") return null
  const a = virtualColumnFactorNumeric(
    col.factorLeft,
    line,
    relationMaps,
    parentDetail,
  )
  const b = virtualColumnFactorNumeric(
    col.factorRight,
    line,
    relationMaps,
    parentDetail,
  )
  if (a == null || b == null) return null
  const p = a * b
  return Number.isFinite(p) ? p : null
}
