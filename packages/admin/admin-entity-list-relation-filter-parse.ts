import type { AdminRelationFilterApiValue } from "./admin-entity-relation-filter-value"
import { serializeRelationFilterStored } from "./admin-entity-relation-filter-value"
import { relationFilterParamRawParts } from "./admin-entity-relation-filter-search-params"
import type { AdminEntityDefinition } from "./admin-entity-types"

export type ParsedAdminEntityRelationListFilters = {
  /** Equality / OR-list for SQL; keys are parent column JSON keys. */
  api: Record<string, AdminRelationFilterApiValue>
  /**
   * UI / URL: keyed by `columnKey` from `listRelationFilters`.
   * Empty string means no filter (query param omitted when writing canonical URL).
   */
  selections: Record<string, string>
}

const UUID_RE =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/

/**
 * Parse list GET query params for `listRelationFilters` on the entity definition.
 * Invalid values are ignored for `api` and normalized to `""` in `selections`.
 * Supports `valueType` **integer**, **uuid**, and **text** (e.g. citext FK codes).
 */
export function parseAdminEntityRelationListFiltersFromCfg(
  cfg: AdminEntityDefinition,
  searchParams: URLSearchParams,
): ParsedAdminEntityRelationListFilters {
  const specs = cfg.listRelationFilters ?? []
  const api: Record<string, AdminRelationFilterApiValue> = {}
  const selections: Record<string, string> = {}

  for (const spec of specs) {
    const param = spec.queryParam ?? spec.columnKey
    const col = cfg.columns.find((c) => c.key === spec.columnKey)
    const multi = spec.multiSelect === true

    if (spec.syntheticTextScope === true) {
      const rawParts = relationFilterParamRawParts(searchParams, param, multi)
      if (rawParts.length === 0) {
        selections[spec.columnKey] = ""
        continue
      }
      const seen = new Set<string>()
      const parsed: string[] = []
      for (const raw of rawParts) {
        const t = raw.trim()
        if (t === "" || seen.has(t)) continue
        seen.add(t)
        parsed.push(t)
      }
      if (parsed.length === 0) {
        selections[spec.columnKey] = ""
        continue
      }
      parsed.sort((a, b) => a.localeCompare(b))
      selections[spec.columnKey] = serializeRelationFilterStored(multi, parsed)
      api[spec.columnKey] = parsed.length === 1 ? parsed[0]! : parsed
      continue
    }

    if (!col?.listRelation) {
      selections[spec.columnKey] = ""
      continue
    }

    const rawParts = relationFilterParamRawParts(searchParams, param, multi)
    if (rawParts.length === 0) {
      selections[spec.columnKey] = ""
      continue
    }

    if (col.valueType === "integer") {
      const seen = new Set<number>()
      const parsed: number[] = []
      for (const trimmed of rawParts) {
        const n = Number.parseInt(trimmed, 10)
        if (!Number.isFinite(n) || seen.has(n)) continue
        seen.add(n)
        parsed.push(n)
      }
      if (parsed.length === 0) {
        selections[spec.columnKey] = ""
        continue
      }
      parsed.sort((a, b) => a - b)
      const strParts = parsed.map(String)
      selections[spec.columnKey] = serializeRelationFilterStored(multi, strParts)
      api[spec.columnKey] = parsed.length === 1 ? parsed[0]! : parsed
      continue
    }
    if (col.valueType === "uuid") {
      const seen = new Set<string>()
      const parsed: string[] = []
      for (const trimmed of rawParts) {
        if (!UUID_RE.test(trimmed) || seen.has(trimmed)) continue
        seen.add(trimmed)
        parsed.push(trimmed)
      }
      if (parsed.length === 0) {
        selections[spec.columnKey] = ""
        continue
      }
      parsed.sort((a, b) => a.localeCompare(b))
      selections[spec.columnKey] = serializeRelationFilterStored(multi, parsed)
      api[spec.columnKey] = parsed.length === 1 ? parsed[0]! : parsed
      continue
    }
    if (col.valueType === "text") {
      const seen = new Set<string>()
      const parsed: string[] = []
      for (const raw of rawParts) {
        const t = raw.trim()
        if (t === "" || seen.has(t)) continue
        seen.add(t)
        parsed.push(t)
      }
      if (parsed.length === 0) {
        selections[spec.columnKey] = ""
        continue
      }
      parsed.sort((a, b) => a.localeCompare(b))
      selections[spec.columnKey] = serializeRelationFilterStored(multi, parsed)
      api[spec.columnKey] = parsed.length === 1 ? parsed[0]! : parsed
      continue
    }

    selections[spec.columnKey] = ""
  }

  return { api, selections }
}
