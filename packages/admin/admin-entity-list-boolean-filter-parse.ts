import type { AdminEntityDefinition } from "./admin-entity-types"

/** Parse list boolean filter from URL; unknown values are treated as “all” (undefined). */
export function parseAdminEntityBooleanListFilterFromCfg(
  cfg: AdminEntityDefinition,
  params: URLSearchParams,
): boolean | undefined {
  const spec = cfg.listBooleanFilter
  if (!spec) return undefined
  const key = spec.queryParam ?? spec.columnKey
  const raw = params.get(key)
  if (raw == null || raw.trim() === "") {
    if (spec.defaultSegment === "true") return true
    if (spec.defaultSegment === "false") return false
    return undefined
  }
  const t = raw.trim().toLowerCase()
  if (t === "true") return true
  if (t === "false") return false
  return undefined
}
