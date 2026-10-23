import "server-only"

import {
  parseAdminEntityRelationListFiltersFromCfg,
  type ParsedAdminEntityRelationListFilters,
} from "./admin-entity-list-relation-filter-parse"
import type { AdminEntityDefinition, AdminEntityRegistry } from "./admin-entity-types"

export function parseAdminEntityRelationListFilters(
  entities: AdminEntityRegistry,
  slug: string,
  searchParams: URLSearchParams,
): ParsedAdminEntityRelationListFilters {
  const cfg = entities[slug] as AdminEntityDefinition | undefined
  if (!cfg) return { api: {}, selections: {} }
  return parseAdminEntityRelationListFiltersFromCfg(cfg, searchParams)
}
