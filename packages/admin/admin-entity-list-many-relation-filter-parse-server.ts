import "server-only"

import {
  parseAdminEntityManyRelationListFiltersFromCfg,
  type ParsedAdminEntityManyRelationListFilters,
} from "./admin-entity-list-many-relation-filter-parse"
import type { AdminEntityDefinition, AdminEntityRegistry } from "./admin-entity-types"

export function parseAdminEntityManyRelationListFilters(
  entities: AdminEntityRegistry,
  slug: string,
  searchParams: URLSearchParams,
): ParsedAdminEntityManyRelationListFilters {
  const cfg = entities[slug] as AdminEntityDefinition | undefined
  if (!cfg) return { api: {}, selections: {} }
  return parseAdminEntityManyRelationListFiltersFromCfg(cfg, searchParams, entities)
}
