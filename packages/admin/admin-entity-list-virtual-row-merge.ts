import type { AdminEntityDefinition } from "./admin-entity-types"

function coalesceNumeric(raw: unknown): number {
  if (raw == null || raw === "") return 0
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : 0
  const n = Number(String(raw).trim())
  return Number.isFinite(n) ? n : 0
}

function numericApiStringFromFinite(n: number): string {
  if (!Number.isFinite(n)) return "0"
  const s = n.toFixed(10)
  const trimmed = s.replace(/\.?0+$/, "")
  return trimmed === "" || trimmed === "-" ? "0" : trimmed
}

/**
 * Fills `list: true` + `listVirtual` keys on a row when absent (plain `SELECT` / embed paths).
 * List queries that already SELECT virtual expressions keep existing values.
 *
 * Skips `listVirtualDateExistsInTable` and `listVirtualRelationLabel` (need DB / extra joins).
 */
export function mergeListVirtualColumnsIntoApiRow(
  cfg: AdminEntityDefinition,
  row: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...row }
  for (const col of cfg.columns) {
    if (!col.list || !col.listVirtual) continue
    const existing = out[col.key]
    if (existing != null && existing !== "") continue

    const pair = col.listYearMonthPair
    if (pair) {
      const yRaw = out[pair.yearColumnKey]
      const mRaw = out[pair.monthColumnKey]
      if (yRaw == null || mRaw == null || yRaw === "" || mRaw === "") continue
      out[col.key] = `${String(yRaw)}-${String(mRaw).padStart(2, "0")}`
      continue
    }

    const split = col.listVirtualVat12InclusiveSplit
    if (split) {
      const g = coalesceNumeric(out[split.grossColumnKey])
      const net = g / 1.12
      const vat = g - net
      out[col.key] = numericApiStringFromFinite(
        split.component === "net" ? net : vat,
      )
      continue
    }

    const prod = col.listVirtualProductOfTwo
    if (prod) {
      const v =
        coalesceNumeric(out[prod.leftColumnKey]) *
        coalesceNumeric(out[prod.rightColumnKey])
      out[col.key] = numericApiStringFromFinite(v)
      continue
    }

    const sub = col.listVirtualSubtractFromBase
    if (sub) {
      let v = coalesceNumeric(out[sub.baseColumnKey])
      for (const sk of sub.subtractColumnKeys) {
        v -= coalesceNumeric(out[sk])
      }
      out[col.key] = numericApiStringFromFinite(v)
      continue
    }
  }
  return out
}
