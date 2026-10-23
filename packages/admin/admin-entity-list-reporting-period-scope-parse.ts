import { parseAdminEntityYearMonthPeriod } from "./admin-entity-list-year-month-period-parse"
import type { AdminEntityDefinition } from "./admin-entity-types"

/**
 * Read optional reporting-period scope for entities with `listScopeByReportingPeriodInRelated`.
 * Missing or invalid param → `undefined` (full list — e.g. CRUD FK options without a period).
 */
export function parseAdminEntityReportingPeriodScopeForListFromCfg(
  cfg: AdminEntityDefinition,
  params: URLSearchParams,
): { year: number; month: number } | undefined {
  const spec = cfg.listScopeByReportingPeriodInRelated
  if (!spec) return undefined
  const key = spec.queryParam ?? "reportedPeriod"
  const raw = params.get(key)
  if (raw == null || raw.trim() === "") return undefined
  return parseAdminEntityYearMonthPeriod(raw) ?? undefined
}
