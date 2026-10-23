import type { AdminRelationFilterApiValue } from "./admin-entity-relation-filter-value"
import { serializeRelationFilterStored } from "./admin-entity-relation-filter-value"
import { relationFilterParamRawParts } from "./admin-entity-relation-filter-search-params"
import type { AdminEntityDefinition } from "./admin-entity-types"

export type ParsedAdminEntityManyRelationListFilters = {
  /** Equality / OR-list for SQL; keys are `manyRelationColumnKey`. */
  api: Record<string, AdminRelationFilterApiValue>
  /**
   * UI / URL: keyed by `manyRelationColumnKey`.
   * Empty string means no filter (query param omitted when writing canonical URL).
   */
  selections: Record<string, string>
}

const UUID_RE =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/

/**
 * Parse list GET query params for `listManyRelationFilters` on the entity definition.
 * Invalid values are ignored for `api` and normalized to `""` in `selections`.
 */
export function parseAdminEntityManyRelationListFiltersFromCfg(
  cfg: AdminEntityDefinition,
  searchParams: URLSearchParams,
  allEntities: Readonly<Record<string, AdminEntityDefinition>>,
): ParsedAdminEntityManyRelationListFilters {
  const specs = cfg.listManyRelationFilters ?? []
  const api: Record<string, AdminRelationFilterApiValue> = {}
  const selections: Record<string, string> = {}

  for (const spec of specs) {
    const param = spec.queryParam ?? spec.manyRelationColumnKey
    const col = cfg.columns.find((c) => c.key === spec.manyRelationColumnKey)
    const many = col?.listManyRelation
    const multi = spec.multiSelect === true

    if (!many) {
      selections[spec.manyRelationColumnKey] = ""
      continue
    }

    const relatedCfg = allEntities[many.relatedEntitySlug]
    if (!relatedCfg) {
      selections[spec.manyRelationColumnKey] = ""
      continue
    }
    const idType = relatedCfg.idColumn.valueType

    const rawParts = relationFilterParamRawParts(searchParams, param, multi)
    if (rawParts.length === 0) {
      selections[spec.manyRelationColumnKey] = ""
      continue
    }

    if (idType === "integer") {
      const seen = new Set<number>()
      const parsed: number[] = []
      for (const trimmed of rawParts) {
        const n = Number.parseInt(trimmed, 10)
        if (!Number.isFinite(n) || seen.has(n)) continue
        seen.add(n)
        parsed.push(n)
      }
      if (parsed.length === 0) {
        selections[spec.manyRelationColumnKey] = ""
        continue
      }
      parsed.sort((a, b) => a - b)
      const strParts = parsed.map(String)
      selections[spec.manyRelationColumnKey] = serializeRelationFilterStored(
        multi,
        strParts,
      )
      api[spec.manyRelationColumnKey] =
        parsed.length === 1 ? parsed[0]! : parsed
      continue
    }
    if (idType === "uuid") {
      const seen = new Set<string>()
      const parsed: string[] = []
      for (const trimmed of rawParts) {
        if (!UUID_RE.test(trimmed) || seen.has(trimmed)) continue
        seen.add(trimmed)
        parsed.push(trimmed)
      }
      if (parsed.length === 0) {
        selections[spec.manyRelationColumnKey] = ""
        continue
      }
      parsed.sort((a, b) => a.localeCompare(b))
      selections[spec.manyRelationColumnKey] = serializeRelationFilterStored(
        multi,
        parsed,
      )
      api[spec.manyRelationColumnKey] =
        parsed.length === 1 ? parsed[0]! : parsed
      continue
    }

    selections[spec.manyRelationColumnKey] = ""
  }

  return { api, selections }
}
