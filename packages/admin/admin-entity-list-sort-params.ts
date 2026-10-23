import type {
  AdminEntityDefinition,
  ListOrderSpec,
} from "./admin-entity-types"

export type PrimaryListSort = {
  columnKey: string
  direction: "asc" | "desc"
}

export function listOrderSpecsWithIdTieBreakFromCfg(
  cfg: AdminEntityDefinition,
): ListOrderSpec[] {
  const idKey = cfg.idColumn.jsonKey
  const specs = [...cfg.listOrderBy]
  const last = specs[specs.length - 1]
  if (!last || last.columnKey !== idKey) {
    specs.push({ columnKey: idKey, direction: "asc" })
  }
  return specs
}

/**
 * When `primary` is set (from URL), order by that column + id tie-break.
 * When omitted, use the entity's full `listOrderBy` (+ id tie-break).
 */
export function effectiveListOrderSpecsFromCfg(
  cfg: AdminEntityDefinition,
  primary: PrimaryListSort | undefined,
): ListOrderSpec[] {
  const idKey = cfg.idColumn.jsonKey
  if (!primary) {
    return listOrderSpecsWithIdTieBreakFromCfg(cfg)
  }
  const col = cfg.columns.find((c) => c.key === primary.columnKey)
  if (!col?.sortable) {
    return listOrderSpecsWithIdTieBreakFromCfg(cfg)
  }
  const specs: ListOrderSpec[] = [
    { columnKey: primary.columnKey, direction: primary.direction },
  ]
  const last = specs[specs.length - 1]
  if (!last || last.columnKey !== idKey) {
    specs.push({ columnKey: idKey, direction: "asc" })
  }
  return specs
}

/** Parse `sortKey` / `sortDir` from a URLSearchParams-like map. */
export function parseAdminEntityListSortParamsFromCfg(
  cfg: AdminEntityDefinition,
  searchParams: URLSearchParams,
): PrimaryListSort | undefined {
  const key = searchParams.get("sortKey")?.trim()
  if (!key) return undefined
  const col = cfg.columns.find((c) => c.key === key)
  if (!col?.sortable) return undefined
  const dirRaw = searchParams.get("sortDir")?.trim().toLowerCase()
  const direction = dirRaw === "desc" ? "desc" : "asc"
  return { columnKey: key, direction }
}
