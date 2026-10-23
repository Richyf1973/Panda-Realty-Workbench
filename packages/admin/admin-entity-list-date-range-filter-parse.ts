import type { AdminEntityDefinition } from "./admin-entity-types"

import { effectiveListDateRangeFilterSpecs } from "./admin-entity-list-date-range-specs"

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/**
 * Validates `YYYY-MM-DD` and returns the same string, or `undefined` if invalid.
 */
export function parseAdminEntityIsoDateString(raw: string): string | undefined {
  const t = raw.trim()
  if (!ISO_DATE.test(t)) return undefined
  const y = Number(t.slice(0, 4))
  const mo = Number(t.slice(5, 7))
  const d = Number(t.slice(8, 10))
  const dt = new Date(y, mo - 1, d)
  if (
    dt.getFullYear() !== y ||
    dt.getMonth() !== mo - 1 ||
    dt.getDate() !== d
  ) {
    return undefined
  }
  return t
}

export type ParsedAdminEntityListDateRangeFilter = {
  readonly columnKey: string
  readonly from: string
  readonly to: string
}

/**
 * Reads all configured list date-range param pairs from the URL. Omitted or invalid pairs are skipped.
 */
export function parseAdminEntityListDateRangeFiltersFromCfg(
  cfg: AdminEntityDefinition,
  params: URLSearchParams,
): ParsedAdminEntityListDateRangeFilter[] {
  const specs = effectiveListDateRangeFilterSpecs(cfg)
  const out: ParsedAdminEntityListDateRangeFilter[] = []
  for (const spec of specs) {
    const fromKey = spec.fromQueryParam ?? "dateFrom"
    const toKey = spec.toQueryParam ?? "dateTo"
    const fromRaw = (params.get(fromKey) ?? "").trim()
    const toRaw = (params.get(toKey) ?? "").trim()
    if (fromRaw === "" || toRaw === "") continue
    const from = parseAdminEntityIsoDateString(fromRaw)
    const to = parseAdminEntityIsoDateString(toRaw)
    if (!from || !to) continue
    const lo = from <= to ? from : to
    const hi = from <= to ? to : from
    out.push({ columnKey: spec.columnKey, from: lo, to: hi })
  }
  return out
}

/**
 * @deprecated Prefer {@link parseAdminEntityListDateRangeFiltersFromCfg}. Kept for tests and
 * single-range call sites that expect `{ from, to }` for the **first** spec only.
 */
export function parseAdminEntityListDateRangeFilterFromCfg(
  cfg: AdminEntityDefinition,
  params: URLSearchParams,
): { from: string; to: string } {
  const all = parseAdminEntityListDateRangeFiltersFromCfg(cfg, params)
  const first = all[0]
  if (!first) return { from: "", to: "" }
  return { from: first.from, to: first.to }
}
