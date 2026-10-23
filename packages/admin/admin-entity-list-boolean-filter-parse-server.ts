import "server-only"

import { parseAdminEntityBooleanListFilterFromCfg } from "./admin-entity-list-boolean-filter-parse"
import type { AdminEntityDefinition, AdminEntityRegistry } from "./admin-entity-types"

export function parseAdminEntityBooleanListFilter(
  entities: AdminEntityRegistry,
  slug: string,
  params: URLSearchParams,
): boolean | undefined {
  const cfg = entities[slug] as AdminEntityDefinition | undefined
  if (!cfg) return undefined
  return parseAdminEntityBooleanListFilterFromCfg(cfg, params)
}
