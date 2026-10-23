import "server-only"

import {
  effectiveListOrderSpecsFromCfg,
  parseAdminEntityListSortParamsFromCfg,
  type PrimaryListSort,
} from "./admin-entity-list-sort-params"
import type {
  AdminEntityDefinition,
  AdminEntityRegistry,
  ListOrderSpec,
} from "./admin-entity-types"

export type { PrimaryListSort } from "./admin-entity-list-sort-params"

export function effectiveListOrderSpecs(
  entities: AdminEntityRegistry,
  slug: string,
  primary: PrimaryListSort | undefined,
): ListOrderSpec[] {
  const cfg = entities[slug] as AdminEntityDefinition | undefined
  if (!cfg) return []
  return effectiveListOrderSpecsFromCfg(cfg, primary)
}

export function parseAdminEntityListSortParams(
  entities: AdminEntityRegistry,
  slug: string,
  searchParams: URLSearchParams,
): PrimaryListSort | undefined {
  const cfg = entities[slug] as AdminEntityDefinition | undefined
  if (!cfg) return undefined
  return parseAdminEntityListSortParamsFromCfg(cfg, searchParams)
}
