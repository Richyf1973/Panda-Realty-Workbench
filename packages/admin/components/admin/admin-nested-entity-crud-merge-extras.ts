import type { MutableRefObject } from "react"

import type { AdminEntityDefinition } from "../../admin-entity-types"

/** Merged into nested create/PATCH bodies from `adminEntityCrudExtrasForSaveRef`. */
export function mergeNestedCrudExtrasIntoBody(
  _cfg: AdminEntityDefinition,
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
