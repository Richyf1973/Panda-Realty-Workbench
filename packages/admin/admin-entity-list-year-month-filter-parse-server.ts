import "server-only"

import { parseAdminEntityYearMonthListFilterFromCfg } from "./admin-entity-list-year-month-filter-parse"
import type { AdminEntityDefinition, AdminEntityRegistry } from "./admin-entity-types"

export function parseAdminEntityYearMonthListFilter(
  entities: AdminEntityRegistry,
  slug: string,
  params: URLSearchParams,
): { year: number; month: number } | undefined {
  const cfg = entities[slug] as AdminEntityDefinition | undefined
  if (!cfg) return undefined
  return parseAdminEntityYearMonthListFilterFromCfg(cfg, params)
}
