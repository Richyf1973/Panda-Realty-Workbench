import { normalizeTrailingDrafts, type LineRow } from "./admin-entity-crud-related-collections-draft"
import type {
  AdminEntityCrudRelatedCollectionTable,
  AdminEntityDefinition,
} from "./admin-entity-types"

/**
 * Collect unsigned integer quantity tokens from comma- and/or whitespace-separated input.
 * Invalid segments are **skipped** (e.g. `10, abc, 20` → `["10","20"]`).
 */
export function parseCommaSeparatedQtyTokensSkipInvalid(raw: unknown): string[] {
  const s = typeof raw === "string" ? raw : String(raw ?? "")
  const trimmed = s.trim()
  if (trimmed === "") return []

  const segments = trimmed.split(/[,\s]+/).filter((p) => p.length > 0)
  const out: string[] = []
  for (const seg of segments) {
    const digits = seg.replace(/\D/g, "")
    if (digits === "") continue
    const n = Math.trunc(Number(digits))
    if (!Number.isFinite(n) || n < 0) continue
    out.push(String(n))
  }
  return out
}

/**
 * Split **multiple** unsigned quantities from one cell: commas and/or ASCII whitespace between tokens
 * (e.g. `37, 5`, `37,5`, `37 5`). Invalid tokens are skipped; a single effective number (`100` or `10, x`)
 * stays **one** segment — no expansion.
 */
export function parseCommaSeparatedQtySegments(raw: unknown): string[] | null {
  const tokens = parseCommaSeparatedQtyTokensSkipInvalid(raw)
  if (tokens.length < 2) return null
  return tokens
}

/** Expand one related line into N lines differing only by `qtyColumnKey` (and `clientKey` / id). */
export function expandOneLineIntoQtyRows(
  line: LineRow,
  qtyColumnKey: string,
  qtys: string[],
  idKey: string,
): LineRow[] {
  if (qtys.length === 0) return [line]
  if (qtys.length === 1) return [{ ...line, [qtyColumnKey]: qtys[0]! }]
  const out: LineRow[] = []
  for (let i = 0; i < qtys.length; i++) {
    const q = qtys[i]!
    if (i === 0) {
      out.push({ ...line, [qtyColumnKey]: q })
    } else {
      const draft: LineRow = { clientKey: crypto.randomUUID() }
      for (const [k, v] of Object.entries(line)) {
        if (k === "clientKey") continue
        if (k === idKey) continue
        draft[k] = v
      }
      draft[qtyColumnKey] = q
      out.push(draft)
    }
  }
  return out
}

/**
 * Collapse a **single** trailing comma segment (`37,` / `37, `) to `37`. Leaves `10, 20` unchanged.
 * Use on **blur** only — running this on every keystroke strips `,` after `10` before the user types
 * `, 20`, producing `10 20` without commas.
 */
export function normalizeTrailingCommaOnlyIntegerQtyString(raw: string): string {
  const s = raw.trim()
  if (!s.includes(",")) return raw
  const segments = s
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
  if (segments.length !== 1) return raw
  const digits = segments[0]!.replace(/\D/g, "")
  if (digits === "") return "0"
  const n = Math.trunc(Number(digits))
  const next = Number.isFinite(n) && n >= 0 ? String(n) : "0"
  if (s === next) return raw
  return next
}

/**
 * After **blur** on a comma-separated integer qty cell, split into multiple related rows when the
 * value contains several quantities. Call from related-inline `onBlur` only — do not run on every
 * `lines` change while the user is still typing (e.g. `10, 2` would split before `20` is entered).
 */
export function expandCommaSeparatedIntegerQtyLinesOnBlurIfNeeded(
  lines: readonly LineRow[],
  blurredClientKey: string,
  qtyColumnKey: string,
  blurredQtySanitized: string,
  idKey: string,
  childCfg: AdminEntityDefinition,
  collection: AdminEntityCrudRelatedCollectionTable,
  persistKey: string,
  zeroSentinelKeys: ReadonlySet<string>,
  implicitLineFields?: Readonly<Record<string, string>>,
): LineRow[] | null {
  const qtyCol = childCfg.columns.find((c) => c.key === qtyColumnKey)
  if (qtyCol?.integerInputAllowCommaSeparatedQuantities !== true) return null

  const ix = lines.findIndex((l) => l.clientKey === blurredClientKey)
  if (ix === -1) return null

  const parsed = parseCommaSeparatedQtySegments(blurredQtySanitized)
  if (parsed == null) return null

  const line = { ...lines[ix]!, [qtyColumnKey]: blurredQtySanitized }
  const expanded = expandOneLineIntoQtyRows(line, qtyColumnKey, parsed, idKey)
  const out = [...lines.slice(0, ix), ...expanded, ...lines.slice(ix + 1)]
  return normalizeTrailingDrafts(
    out,
    persistKey,
    zeroSentinelKeys,
    childCfg,
    collection.inlineEditableColumnKeys,
    implicitLineFields,
    undefined,
    undefined,
  )
}
