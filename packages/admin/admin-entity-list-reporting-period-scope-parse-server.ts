import "server-only"

import { parseAdminEntityReportingPeriodScopeForListFromCfg } from "./admin-entity-list-reporting-period-scope-parse"
import type { AdminEntityDefinition, AdminEntityRegistry } from "./admin-entity-types"

export function parseAdminEntityReportingPeriodScopeForList(
  entities: AdminEntityRegistry,
  slug: string,
  params: URLSearchParams,
): { year: number; month: number } | undefined {
  const cfg = entities[slug] as AdminEntityDefinition | undefined
  if (!cfg) return undefined
  return parseAdminEntityReportingPeriodScopeForListFromCfg(cfg, params)
}
