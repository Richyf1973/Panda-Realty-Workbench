import { cellString } from "./admin-entity-admin-cell"
import { adminEntityBooleanFormDefaultString } from "./admin-entity-crud-boolean-form"
import {
  adminEntityColumnShowsManyRelationForm,
  adminEntityManyRelationFormSpecs,
  adminEntityManyRelationFormValueFromListRow,
  manyRelationFormRelatedIdsForJsonBody,
} from "./admin-entity-many-relation-form"
import type { AdminEntityColumn, AdminEntityDefinition } from "./admin-entity-types"
import { adminEntityColumnTreatsAsBoolean } from "./admin-entity-list-cell"
import type { AdminEntitySlug } from "./admin-entity-slug-client"
import { adminEntityColumnFormLabel } from "./admin-entity-column-form-label"

/** One scalar column blocking POST/PATCH body construction (missing value or invalid boolean string). */
export type AdminEntityCrudBodyFieldIssue = {
  readonly key: string
  readonly label: string
  readonly reason: "empty" | "boolean_invalid"
}

/**
 * All create columns that would cause {@link buildAdminEntityCreateBody} to return `null`
 * (same filter as {@link buildAdminEntityCreateRequestPayload}).
 */
export function listAdminEntityCreateBodyBlockingIssues(
  createCols: readonly AdminEntityColumn[],
  value: Record<string, string>,
): AdminEntityCrudBodyFieldIssue[] {
  const stringCols = createCols.filter((c) => !c.listVirtual && !c.crudFormVirtual)
  const issues: AdminEntityCrudBodyFieldIssue[] = []
  for (const c of stringCols) {
    if (adminEntityColumnTreatsAsBoolean(c)) {
      const t = (value[c.key] ?? "").trim().toLowerCase()
      if (t !== "true" && t !== "false") {
        if (c.optionalOnCreate) continue
        issues.push({
          key: c.key,
          label: adminEntityColumnFormLabel(c),
          reason: "boolean_invalid",
        })
      }
      continue
    }
    const t = (value[c.key] ?? "").trim()
    if (!t) {
      if (c.optionalOnCreate) continue
      issues.push({
        key: c.key,
        label: adminEntityColumnFormLabel(c),
        reason: "empty",
      })
    }
  }
  return issues
}

/**
 * All patch columns that would cause {@link buildAdminEntityPatchBody} to return `null`
 * (same filter as {@link buildAdminEntityPatchRequestPayload}).
 */
export function listAdminEntityPatchBodyBlockingIssues(
  patchCols: readonly AdminEntityColumn[],
  value: Record<string, string>,
): AdminEntityCrudBodyFieldIssue[] {
  const stringCols = patchCols.filter(
    (c) => c.patch && !c.listVirtual && !c.crudFormVirtual,
  )
  const issues: AdminEntityCrudBodyFieldIssue[] = []
  for (const c of stringCols) {
    if (adminEntityColumnTreatsAsBoolean(c)) {
      const raw = (value[c.key] ?? "").trim()
      const t = raw.toLowerCase()
      if (t === "true" || t === "false") continue
      if (c.patchEmptyClears && raw === "") continue
      issues.push({
        key: c.key,
        label: adminEntityColumnFormLabel(c),
        reason: "boolean_invalid",
      })
      continue
    }
    const t = (value[c.key] ?? "").trim()
    if (c.patchEmptyClears) continue
    if (!t) {
      issues.push({
        key: c.key,
        label: adminEntityColumnFormLabel(c),
        reason: "empty",
      })
    }
  }
  return issues
}

/** User-visible summary for payload blocking issues (no HTML). */
export function formatAdminEntityCrudPayloadIssuesSummary(
  issues: readonly AdminEntityCrudBodyFieldIssue[],
): string {
  if (issues.length === 0) {
    return "Required fields are missing or invalid. Check the form for errors."
  }
  const labels = [...new Set(issues.map((i) => i.label))]
  if (labels.length === 1) {
    return `${labels[0]} is required or invalid before saving.`
  }
  return `These fields are required or invalid before saving: ${labels.join(", ")}.`
}

/** Build POST body from TanStack Form values; `null` if a required create field is empty. */
export function buildAdminEntityCreateBody(
  createCols: readonly AdminEntityColumn[],
  value: Record<string, string>,
): Record<string, string> | null {
  const body: Record<string, string> = {}
  for (const c of createCols) {
    if (adminEntityColumnTreatsAsBoolean(c)) {
      const t = (value[c.key] ?? "").trim().toLowerCase()
      if (t !== "true" && t !== "false") {
        if (c.optionalOnCreate) continue
        return null
      }
      body[c.key] = t
      continue
    }
    const t = (value[c.key] ?? "").trim()
    if (!t) {
      if (c.optionalOnCreate) continue
      return null
    }
    body[c.key] = t
  }
  return body
}

/** Build PATCH body from TanStack Form values; `null` if a required (non-clearing) field is empty. */
export function buildAdminEntityPatchBody(
  patchCols: readonly AdminEntityColumn[],
  value: Record<string, string>,
): Record<string, string> | null {
  const patch: Record<string, string> = {}
  for (const c of patchCols) {
    if (!c.patch) continue
    if (adminEntityColumnTreatsAsBoolean(c)) {
      const raw = (value[c.key] ?? "").trim()
      const t = raw.toLowerCase()
      if (t === "true" || t === "false") {
        patch[c.key] = t
      } else if (c.patchEmptyClears && raw === "") {
        patch[c.key] = ""
      } else {
        return null
      }
      continue
    }
    const t = (value[c.key] ?? "").trim()
    if (c.patchEmptyClears) {
      patch[c.key] = t
    } else if (!t) {
      return null
    } else {
      patch[c.key] = t
    }
  }
  return patch
}

/** POST JSON: table fields plus `tagIds`-style arrays for eligible `listManyRelation` form columns. */
export function buildAdminEntityCreateRequestPayload(
  cfg: AdminEntityDefinition,
  createCols: readonly AdminEntityColumn[],
  value: Record<string, string>,
  entities: Readonly<Record<string, AdminEntityDefinition>>,
): Record<string, unknown> | null {
  const stringCols = createCols.filter((c) => !c.listVirtual && !c.crudFormVirtual)
  const base = buildAdminEntityCreateBody(stringCols, value)
  if (!base) return null
  const out: Record<string, unknown> = { ...base }
  for (const spec of adminEntityManyRelationFormSpecs(cfg, entities)) {
    if (!createCols.some((c) => c.key === spec.columnKey)) continue
    const raw = value[spec.columnKey] ?? ""
    out[spec.relationIdsBodyKey] = manyRelationFormRelatedIdsForJsonBody(
      raw,
      spec.relatedIdValueType,
    )
  }
  return out
}

/** PATCH JSON: non-virtual columns plus junction sync keys for eligible many-relation form fields. */
export function buildAdminEntityPatchRequestPayload(
  cfg: AdminEntityDefinition,
  patchCols: readonly AdminEntityColumn[],
  value: Record<string, string>,
  entities: Readonly<Record<string, AdminEntityDefinition>>,
): Record<string, unknown> | null {
  const stringCols = patchCols.filter(
    (c) => c.patch && !c.listVirtual && !c.crudFormVirtual,
  )
  const base = buildAdminEntityPatchBody(stringCols, value)
  if (!base) return null
  const out: Record<string, unknown> = { ...base }
  for (const spec of adminEntityManyRelationFormSpecs(cfg, entities)) {
    if (!patchCols.some((c) => c.key === spec.columnKey)) continue
    const raw = value[spec.columnKey] ?? ""
    out[spec.relationIdsBodyKey] = manyRelationFormRelatedIdsForJsonBody(
      raw,
      spec.relatedIdValueType,
    )
  }
  return out
}

export function adminEntityFormDefaultValues(
  cols: readonly (Pick<AdminEntityColumn, "key"> &
    Partial<Pick<AdminEntityColumn, "valueType" | "docSqlType">>)[],
): Record<string, string> {
  return Object.fromEntries(
    cols.map((c) => [
      c.key,
      c.valueType === "boolean"
        ? adminEntityBooleanFormDefaultString(c)
        : "",
    ]),
  )
}

const ADMIN_ENTITY_LIST_DATE_FILTER_ISO_DAY = /^\d{4}-\d{2}-\d{2}$/

/** Variables for admin entity POST create (`useMutation`); supports **Create & add new** via `afterSuccess`. */
export type AdminEntityCreateMutationVariables = {
  readonly body: Record<string, unknown>
  readonly afterSuccess?: "keepOpen" | "close" | "createAnother"
}

/**
 * When the admin list toolbar has an inclusive date range where **from === to** (`YYYY-MM-DD`),
 * use that day as the create form default for the same `columnKey` (only if the column exists on
 * create). Multi-day ranges are ignored so registry defaults (e.g. “today”) still apply.
 */
export function adminEntityCreateFormListDateFilterDefaults(args: {
  readonly listDateRangeFilterRows: readonly {
    readonly columnKey: string
    readonly from: string
    readonly to: string
  }[]
  readonly createColumnKeys: ReadonlySet<string>
}): Record<string, string> {
  const out: Record<string, string> = {}
  for (const row of args.listDateRangeFilterRows) {
    const f = row.from.trim()
    const t = row.to.trim()
    if (f === "" || t === "" || f !== t) continue
    if (!ADMIN_ENTITY_LIST_DATE_FILTER_ISO_DAY.test(f)) continue
    if (!args.createColumnKeys.has(row.columnKey)) continue
    out[row.columnKey] = f
  }
  return out
}

/**
 * Map a create-API JSON row into edit-dialog string values (same shape as list-row → edit).
 */
export function buildAdminEntityPatchFormValuesFromApiRow(args: {
  slug: AdminEntitySlug
  patchCols: readonly AdminEntityColumn[]
  row: Record<string, unknown>
  adminEntities: Readonly<Record<string, AdminEntityDefinition>>
}): Record<string, string> {
  const { slug, patchCols, row, adminEntities } = args
  return Object.fromEntries(
    patchCols.map((c) => {
      if (
        c.listManyRelation &&
        adminEntityColumnShowsManyRelationForm(slug, c, adminEntities)
      ) {
        return [
          c.key,
          adminEntityManyRelationFormValueFromListRow(row, c.listManyRelation),
        ]
      }
      const raw = cellString(row[c.key]).trim()
      if (c.valueType === "numeric" && raw !== "") {
        const n = Number(raw)
        if (Number.isFinite(n)) return [c.key, String(n)]
      }
      return [c.key, raw]
    }),
  )
}
