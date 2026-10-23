import { NextResponse } from "next/server"

import { adminEntityYmdIsLastDayOfMonth } from "./admin-entity-date-ymd-month-end"
import { sanitizeAdminEntityDecimalAmountInput } from "./admin-entity-currency-decimal-input"
import { adminEntityFormColumnsInOrder } from "./admin-entity-form-column-order"
import { parseJunctionRelatedIdsArray } from "./admin-entity-junction-related-ids-parse"
import { adminEntityManyRelationFormSpecs } from "./admin-entity-many-relation-form"
import { adminJsonError } from "./admin-api-error"
import type {
  AdminEntityColumn,
  AdminEntityDefinition,
  AdminEntityJunctionSyncOp,
  AdminEntityRegistry,
} from "./admin-entity-types"

export type { AdminEntityRegistry } from "./admin-entity-types"

const NUMERIC_STRING = /^\d+(\.\d+)?$/
const SIGNED_NUMERIC_STRING = /^-?\d+(\.\d+)?$/

type ColumnValidationResult = { ok: true } | { ok: false; message: string }

/**
 * Validate a sanitized string value against a column's type constraints.
 * Called after sanitization in both CREATE and PATCH paths.
 * Pass `allowEmpty: true` when a blank value is a valid "clear" operation (PATCH patchEmptyClears).
 */
function validateAdminEntityColumnStringValue(
  col: AdminEntityColumn,
  v: string,
  opts?: { allowEmpty?: boolean },
): ColumnValidationResult {
  const allowEmpty = opts?.allowEmpty === true
  if (col.valueType === "boolean") {
    const t = v.trim().toLowerCase()
    if (t === "true" || t === "false") return { ok: true }
    if (allowEmpty && v === "") return { ok: true }
    return { ok: false, message: `${col.label} must be true or false` }
  }
  if (col.valueType === "numeric" && v !== "") {
    const pattern =
      col.currencyAmountAllowLeadingMinus === true
        ? SIGNED_NUMERIC_STRING
        : NUMERIC_STRING
    if (!pattern.test(v)) return { ok: false, message: `${col.label} must be numeric` }
  }
  if (
    col.valueType === "text" &&
    col.textFormOptions != null &&
    col.textFormOptions.length > 0 &&
    !col.listRelation
  ) {
    if (!(allowEmpty && v === "")) {
      const allowed = new Set(col.textFormOptions.map((o) => o.value))
      if (v !== "" && !allowed.has(v)) {
        return {
          ok: false,
          message: `${col.label} must be one of: ${[...allowed].sort().join(", ")}`,
        }
      }
    }
  }
  if (col.dateStringFormControl === "yearMonthEnd") {
    if (!adminEntityYmdIsLastDayOfMonth(v)) {
      return {
        ok: false,
        message: `${col.label} must be the last day of its calendar month`,
      }
    }
  }
  return { ok: true }
}

function bodyForbiddenKeys(
  cfg: AdminEntityDefinition,
  b: Record<string, unknown>,
  mode: "create" | "patch",
): string[] {
  const bad: string[] = []
  for (const col of cfg.columns) {
    if (!col[mode] && Object.hasOwn(b, col.key)) {
      bad.push(col.key)
    }
  }
  bad.sort()
  return bad
}

function junctionSyncOps(
  registry: AdminEntityRegistry,
  slug: string,
  body: Record<string, unknown>,
  opts: { skipAbsent: boolean },
): { ok: true; ops: AdminEntityJunctionSyncOp[] } | { ok: false; response: NextResponse } {
  const cfg = registry[slug]
  if (!cfg) {
    return { ok: false, response: adminJsonError("Unknown entity", 400) }
  }
  const specs = adminEntityManyRelationFormSpecs(cfg, registry)
  const ops: AdminEntityJunctionSyncOp[] = []
  for (const spec of specs) {
    const key = spec.relationIdsBodyKey
    if (opts.skipAbsent && !Object.hasOwn(body, key)) continue
    const parsed = parseJunctionRelatedIdsArray(body[key], key, spec.relatedIdValueType)
    if (!parsed.ok) {
      return { ok: false, response: adminJsonError(parsed.errorMessage, 400) }
    }
    if (parsed.relatedIdValueType === "integer") {
      ops.push({
        junctionEntitySlug: spec.many.junctionEntitySlug,
        junctionParentFkColumnKey: spec.many.junctionParentFkColumnKey,
        junctionRelatedFkColumnKey: spec.many.junctionRelatedFkColumnKey,
        relatedIdValueType: "integer",
        relatedIds: parsed.ids,
      })
    } else {
      ops.push({
        junctionEntitySlug: spec.many.junctionEntitySlug,
        junctionParentFkColumnKey: spec.many.junctionParentFkColumnKey,
        junctionRelatedFkColumnKey: spec.many.junctionRelatedFkColumnKey,
        relatedIdValueType: "uuid",
        relatedIds: parsed.ids,
      })
    }
  }
  return { ok: true, ops }
}

export type AdminEntityCreateParseResult =
  | {
      ok: true
      values: Record<string, string>
      junctionSync: AdminEntityJunctionSyncOp[]
      extras: Record<string, unknown>
    }
  | { ok: false; response: NextResponse }

/** Parse create JSON (column values + optional `extraCreateBodyKeys` → `extras`). */
export function parseAdminEntityCreateBodyFromUnknown(
  registry: AdminEntityRegistry,
  slug: string,
  body: unknown,
): AdminEntityCreateParseResult {
  if (typeof body !== "object" || body === null) {
    return { ok: false, response: adminJsonError("Invalid body", 400) }
  }

  const src = body as Record<string, unknown>
  const cfg = registry[slug]
  if (!cfg) {
    return { ok: false, response: adminJsonError("Unknown entity", 400) }
  }

  const b = { ...src }
  const extras: Record<string, unknown> = {}
  for (const k of cfg.extraCreateBodyKeys ?? []) {
    if (Object.hasOwn(b, k)) {
      extras[k] = b[k]
      delete b[k]
    }
  }

  const forbiddenCreate = bodyForbiddenKeys(cfg, b, "create")
  if (forbiddenCreate.length > 0) {
    return {
      ok: false,
      response: adminJsonError(
        `Must not include read-only field(s): ${forbiddenCreate.join(", ")}`,
        400,
      ),
    }
  }

  const createCols = adminEntityFormColumnsInOrder(cfg, "create")
  const out: Record<string, string> = {}

  for (const col of createCols) {
    if (col.listVirtual || col.crudFormVirtual) continue
    const colRaw = b[col.key]

    if (col.valueType === "boolean") {
      if (colRaw === undefined) {
        if (col.optionalOnCreate) continue
        return {
          ok: false,
          response: adminJsonError(`${col.label} is required`, 400),
        }
      }
      if (typeof colRaw === "boolean") {
        out[col.key] = colRaw ? "true" : "false"
        continue
      }
      if (typeof colRaw === "string") {
        const t = colRaw.trim().toLowerCase()
        if (t === "true" || t === "false") {
          out[col.key] = t
          continue
        }
      }
      return {
        ok: false,
        response: adminJsonError(`${col.label} must be true or false`, 400),
      }
    }

    const numericAllowMinus =
      col.valueType === "numeric" && col.currencyAmountAllowLeadingMinus === true
    let s: string
    if (col.valueType === "numeric" && typeof colRaw === "number") {
      s = String(colRaw)
    } else if (typeof colRaw === "string") {
      s = colRaw.trim()
      if (col.valueType === "numeric") {
        s = sanitizeAdminEntityDecimalAmountInput(
          s,
          numericAllowMinus ? { allowLeadingMinus: true } : undefined,
        )
      }
    } else {
      s = ""
    }

    if (!s) {
      if (col.optionalOnCreate) continue
      return {
        ok: false,
        response: adminJsonError(`${col.label} is required`, 400),
      }
    }

    const validation = validateAdminEntityColumnStringValue(col, s)
    if (!validation.ok) {
      return { ok: false, response: adminJsonError(validation.message, 400) }
    }

    out[col.key] = s
  }

  const junctionParsed = junctionSyncOps(registry, slug, b, { skipAbsent: false })
  if (!junctionParsed.ok) return junctionParsed

  return {
    ok: true,
    values: out,
    junctionSync: junctionParsed.ops,
    extras,
  }
}

export async function parseAdminEntityCreateBody(
  registry: AdminEntityRegistry,
  slug: string,
  request: Request,
): Promise<AdminEntityCreateParseResult> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return {
      ok: false,
      response: adminJsonError("Invalid JSON body", 400),
    }
  }
  return parseAdminEntityCreateBodyFromUnknown(registry, slug, body)
}

export type AdminEntityPatchParseResult =
  | {
      ok: true
      patch: Record<string, string>
      junctionSync: AdminEntityJunctionSyncOp[]
      extras: Record<string, unknown>
    }
  | { ok: false; response: NextResponse }

/** Parse PATCH JSON (patchable columns + optional `extraPatchBodyKeys` → `extras`). */
export function parseAdminEntityPatchBodyFromUnknown(
  registry: AdminEntityRegistry,
  slug: string,
  body: unknown,
): AdminEntityPatchParseResult {
  if (typeof body !== "object" || body === null) {
    return { ok: false, response: adminJsonError("Invalid body", 400) }
  }

  const src = body as Record<string, unknown>
  const cfg = registry[slug]
  if (!cfg) {
    return { ok: false, response: adminJsonError("Unknown entity", 400) }
  }

  const b = { ...src }
  const extras: Record<string, unknown> = {}
  for (const k of cfg.extraPatchBodyKeys ?? []) {
    if (Object.hasOwn(b, k)) {
      extras[k] = b[k]
      delete b[k]
    }
  }

  const forbiddenPatch = bodyForbiddenKeys(cfg, b, "patch")
  if (forbiddenPatch.length > 0) {
    return {
      ok: false,
      response: adminJsonError(
        `Must not include non-patchable field(s): ${forbiddenPatch.join(", ")}`,
        400,
      ),
    }
  }

  const patchCols = adminEntityFormColumnsInOrder(cfg, "patch")
  const rawPatch: Record<string, string> = {}

  for (const col of patchCols) {
    if (col.listVirtual || col.crudFormVirtual) continue
    if (!col.patch) continue
    if (!(col.key in b)) continue
    const raw = b[col.key]

    if (col.valueType === "boolean") {
      if (typeof raw === "boolean") {
        rawPatch[col.key] = raw ? "true" : "false"
      } else if (typeof raw === "string") {
        const t = raw.trim().toLowerCase()
        if (t === "true" || t === "false") {
          rawPatch[col.key] = t
        } else if (col.patchEmptyClears && raw.trim() === "") {
          rawPatch[col.key] = ""
        } else {
          return {
            ok: false,
            response: adminJsonError(`${col.label} must be true or false`, 400),
          }
        }
      }
      continue
    }

    let v: string
    if (col.valueType === "numeric" && typeof raw === "number") {
      v = String(raw)
    } else if (typeof raw === "string") {
      v = raw.trim()
      if (col.valueType === "numeric") {
        const allowMinus = col.currencyAmountAllowLeadingMinus === true
        v = sanitizeAdminEntityDecimalAmountInput(
          v,
          allowMinus ? { allowLeadingMinus: true } : undefined,
        )
      }
    } else {
      continue
    }

    if (!v && !col.patchEmptyClears) continue

    const validation = validateAdminEntityColumnStringValue(col, v, {
      allowEmpty: col.patchEmptyClears,
    })
    if (!validation.ok) {
      return { ok: false, response: adminJsonError(validation.message, 400) }
    }

    rawPatch[col.key] = v
  }

  const junctionParsed = junctionSyncOps(registry, slug, b, { skipAbsent: true })
  if (!junctionParsed.ok) return junctionParsed

  const extraKeys = cfg.extraPatchBodyKeys ?? []
  const hasPatchExtra = extraKeys.some((k) => Object.hasOwn(extras, k))

  if (
    Object.keys(rawPatch).length === 0 &&
    junctionParsed.ops.length === 0 &&
    !hasPatchExtra
  ) {
    const keys = patchCols
      .filter((c) => !c.listVirtual && !c.crudFormVirtual)
      .map((c) => c.key)
      .join(", ")
    const specKeys = adminEntityManyRelationFormSpecs(cfg, registry)
      .map((s) => s.relationIdsBodyKey)
      .join(", ")
    const hint =
      specKeys.length > 0
        ? `Provide at least one of: ${keys} (and/or junction sync: ${specKeys})`
        : `Provide at least one of: ${keys}`
    return {
      ok: false,
      response: adminJsonError(hint, 400),
    }
  }

  return {
    ok: true,
    patch: rawPatch,
    junctionSync: junctionParsed.ops,
    extras,
  }
}

export async function parseAdminEntityPatchBody(
  registry: AdminEntityRegistry,
  slug: string,
  request: Request,
): Promise<AdminEntityPatchParseResult> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return {
      ok: false,
      response: adminJsonError("Invalid JSON body", 400),
    }
  }
  return parseAdminEntityPatchBodyFromUnknown(registry, slug, body)
}
