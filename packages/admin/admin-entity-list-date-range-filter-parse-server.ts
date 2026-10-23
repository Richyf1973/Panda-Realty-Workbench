import "server-only"

import { parseAdminEntityListDateRangeFiltersFromCfg } from "./admin-entity-list-date-range-filter-parse"
import type { AdminEntityDefinition, AdminEntityRegistry } from "./admin-entity-types"

export function parseAdminEntityListDateRangeFilter(
  entities: AdminEntityRegistry,
  slug: string,
  params: URLSearchParams,
):
  | readonly { columnKey: string; from: string; to: string }[]
  | undefined {
  const cfg = entities[slug] as AdminEntityDefinition | undefined
  if (!cfg) return undefined
  const arr = parseAdminEntityListDateRangeFiltersFromCfg(cfg, params)
  return arr.length > 0 ? arr : undefined
}
