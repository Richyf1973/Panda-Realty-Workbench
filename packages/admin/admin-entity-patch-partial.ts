import { buildAdminEntityPatchBody } from "./admin-entity-crud-form-values"
import {
  adminEntityManyRelationFormSpecs,
  manyRelationFormRelatedIdsForJsonBody,
} from "./admin-entity-many-relation-form"
import type { AdminEntityColumn, AdminEntityDefinition } from "./admin-entity-types"

/** JSON-safe clone for PATCH diff baselines (extras arrays from API / detail). */
export function adminEntityDeepCloneForBaseline(value: unknown): unknown {
  if (value === undefined) return undefined
  if (typeof structuredClone === "function") {
    try {
      return structuredClone(value)
    } catch {
      /* fall through */
    }
  }
  return JSON.parse(JSON.stringify(value))
}

/** Snapshot of `extraPatchBodyKeys` from a detail/list row for dirty-checking. */
export function adminEntityPatchExtrasBaselineFromRow(
  cfg: AdminEntityDefinition,
  row: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const k of cfg.extraPatchBodyKeys ?? []) {
    if (Object.hasOwn(row, k)) {
      out[k] = adminEntityDeepCloneForBaseline(row[k])
    }
  }
  return out
}

function sortKeysDeep(x: unknown): unknown {
  if (x === null || typeof x !== "object") return x
  if (Array.isArray(x)) return x.map(sortKeysDeep)
  const o = x as Record<string, unknown>
  const sorted: Record<string, unknown> = {}
  for (const k of Object.keys(o).sort()) {
    sorted[k] = sortKeysDeep(o[k])
  }
  return sorted
}

/** Stable string compare for extras payloads (order-insensitive object keys). */
export function adminEntityExtrasPayloadUnchanged(
  baseline: unknown,
  current: unknown,
): boolean {
  return (
    JSON.stringify(sortKeysDeep(baseline)) ===
    JSON.stringify(sortKeysDeep(current))
  )
}

function patchFormStringsEqual(
  col: AdminEntityColumn,
  baseline: string,
  current: string,
): boolean {
  if (col.valueType === "boolean") {
    return baseline.trim().toLowerCase() === current.trim().toLowerCase()
  }
  if (col.valueType === "integer" || col.valueType === "numeric") {
    const a = baseline.trim()
    const b = current.trim()
    if (a === b) return true
    const na = Number(a)
    const nb = Number(b)
    return (
      Number.isFinite(na) &&
      Number.isFinite(nb) &&
      Object.is(na, nb)
    )
  }
  return baseline.trim() === current.trim()
}

/**
 * Same validation as {@link buildAdminEntityPatchRequestPayload}, but only includes
 * scalar PATCH keys and junction body keys that differ from `baselineForm`.
 */
export function buildAdminEntityPatchRequestPayloadPartial(args: {
  cfg: AdminEntityDefinition
  patchCols: readonly AdminEntityColumn[]
  value: Record<string, string>
  entities: Readonly<Record<string, AdminEntityDefinition>>
  baselineForm: Record<string, string>
}): Record<string, unknown> | null {
  const { cfg, patchCols, value, entities, baselineForm } = args
  const stringCols = patchCols.filter(
    (c) => c.patch && !c.listVirtual && !c.crudFormVirtual,
  )

  const full = buildAdminEntityPatchBody(stringCols, value)
  if (full == null) return null

  const out: Record<string, unknown> = {}

  for (const c of stringCols) {
    const cur = full[c.key]
    if (cur === undefined) continue
    const base = baselineForm[c.key]
    if (base === undefined || !patchFormStringsEqual(c, base, cur)) {
      out[c.key] = cur
    }
  }

  for (const spec of adminEntityManyRelationFormSpecs(cfg, entities)) {
    if (!patchCols.some((col) => col.key === spec.columnKey)) continue
    const rawCur = value[spec.columnKey] ?? ""
    const rawBase = baselineForm[spec.columnKey] ?? ""
    const curIds = manyRelationFormRelatedIdsForJsonBody(
      rawCur,
      spec.relatedIdValueType,
    )
    const baseIds = manyRelationFormRelatedIdsForJsonBody(
      rawBase,
      spec.relatedIdValueType,
    )
    if (
      JSON.stringify(sortKeysDeep(curIds)) !==
      JSON.stringify(sortKeysDeep(baseIds))
    ) {
      out[spec.relationIdsBodyKey] = curIds
    }
  }

  return out
}
