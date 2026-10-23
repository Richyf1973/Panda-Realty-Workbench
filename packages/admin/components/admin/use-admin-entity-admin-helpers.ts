import type { SortingState } from "@tanstack/react-table"
import type { MutableRefObject } from "react"

import { defaultAdminEntityListPrimarySortFromCfg } from "../../admin-entity-admin-list-fetch"
import { adminEntityExtrasPayloadUnchanged } from "../../admin-entity-patch-partial"
import type { AdminEntityDefinition } from "../../admin-entity-types"

export function mergeCrudExtrasIntoBody(
  cfg: AdminEntityDefinition,
  body: Record<string, unknown>,
  keys: readonly string[] | undefined,
  extrasRef: MutableRefObject<Record<string, unknown>> | undefined,
  omitRef: MutableRefObject<Set<string>> | undefined,
): Record<string, unknown> {
  if (!keys?.length || !extrasRef) return body
  let out = { ...body }
  const omit = omitRef?.current
  const src = extrasRef.current
  for (const k of keys) {
    if (omit?.has(k)) continue
    if (Object.prototype.hasOwnProperty.call(src, k)) {
      out = { ...out, [k]: src[k] }
    }
  }
  return out
}

/** Like {@link mergeCrudExtrasIntoBody}, but skips keys whose ref payload matches `baseline`. */
export function mergeCrudExtrasIntoBodyWithPartialBaseline(
  cfg: AdminEntityDefinition,
  body: Record<string, unknown>,
  keys: readonly string[] | undefined,
  extrasRef: MutableRefObject<Record<string, unknown>> | undefined,
  omitRef: MutableRefObject<Set<string>> | undefined,
  baseline: Record<string, unknown> | undefined,
): Record<string, unknown> {
  if (!keys?.length || !extrasRef) return body
  let out = { ...body }
  const omit = omitRef?.current
  const src = extrasRef.current
  for (const k of keys) {
    if (omit?.has(k)) continue
    if (!Object.prototype.hasOwnProperty.call(src, k)) continue
    if (
      baseline != null &&
      Object.hasOwn(baseline, k) &&
      adminEntityExtrasPayloadUnchanged(baseline[k], src[k])
    ) {
      continue
    }
    out = { ...out, [k]: src[k] }
  }
  return out
}

export function initialSortingStateForCfg(cfg: AdminEntityDefinition): SortingState {
  const p = defaultAdminEntityListPrimarySortFromCfg(cfg)
  return [{ id: p.columnKey, desc: p.direction === "desc" }]
}

export function initialRelationFilterSelections(
  cfg: AdminEntityDefinition,
  fromParsed: Record<string, string>,
): Record<string, string> {
  const out: Record<string, string> = {}
  for (const s of cfg.listRelationFilters ?? []) {
    out[s.columnKey] = (fromParsed[s.columnKey] ?? "").trim()
  }
  for (const s of cfg.listManyRelationFilters ?? []) {
    out[s.manyRelationColumnKey] = (
      fromParsed[s.manyRelationColumnKey] ?? ""
    ).trim()
  }
  return out
}
