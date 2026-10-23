import {
  defaultAdminEntityYearMonthPeriodUtcNow,
  parseAdminEntityYearMonthPeriod,
} from "./admin-entity-list-year-month-period-parse"
import type { AdminEntityDefinition } from "./admin-entity-types"

function requiredDefaultYearMonth(): { year: number; month: number } {
  const s = defaultAdminEntityYearMonthPeriodUtcNow()
  const p = parseAdminEntityYearMonthPeriod(s)
  if (!p) {
    const d = new Date()
    return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 }
  }
  return p
}

/**
 * Read list year–month filter from URL. Unknown or invalid values → `undefined` (no filter),
 * unless `listYearMonthFilter.required` — then missing/invalid falls back to the current UTC month.
 */
export function parseAdminEntityYearMonthListFilterFromCfg(
  cfg: AdminEntityDefinition,
  params: URLSearchParams,
): { year: number; month: number } | undefined {
  const spec = cfg.listYearMonthFilter
  if (!spec) return undefined
  const key = spec.queryParam ?? "reportedPeriod"
  const raw = params.get(key)
  if (raw == null || raw.trim() === "") {
    return spec.required === true ? requiredDefaultYearMonth() : undefined
  }
  const parsed = parseAdminEntityYearMonthPeriod(raw)
  if (parsed) return parsed
  return spec.required === true ? requiredDefaultYearMonth() : undefined
}
