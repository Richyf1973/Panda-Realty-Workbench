import type {
  AdminEntityColumn,
  AdminEntityColumnListManyRelation,
  AdminEntityDefinition,
} from "./admin-entity-types"

/** Match RFC-style UUID for many-relation checkbox / API tokens (lowercased on output). */
const MANY_RELATION_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function adminEntitySlugExposesApiInRegistry(
  entities: Readonly<Record<string, AdminEntityDefinition>>,
  slug: string,
): boolean {
  const e = entities[slug]
  return e != null && e.adminApi !== false
}

export function normalizeManyRelationUuidToken(raw: string): string | null {
  const t = raw.trim().toLowerCase()
  return MANY_RELATION_UUID_RE.test(t) ? t : null
}

/** Default JSON key for `POST`/`PATCH` related-id arrays (`tagId` → `tagIds`). */
export function adminEntityManyRelationRelationIdsBodyKey(
  many: AdminEntityColumnListManyRelation,
): string {
  const explicit = many.form?.relationIdsBodyKey?.trim()
  if (explicit) return explicit
  const fk = many.junctionRelatedFkColumnKey
  if (fk.endsWith("Id")) {
    return `${fk.slice(0, -2)}Ids`
  }
  return `${fk}Ids`
}

/**
 * Strict: junction `create: true` columns are exactly the parent + related FKs, both required.
 */
export function adminEntityJunctionEligibleManyRelationFormStrict(
  many: AdminEntityColumnListManyRelation,
  junction: AdminEntityDefinition,
): boolean {
  const createCols = junction.columns.filter((c) => c.create)
  if (createCols.length !== 2) return false
  const keys = new Set(createCols.map((c) => c.key))
  if (!keys.has(many.junctionParentFkColumnKey)) return false
  if (!keys.has(many.junctionRelatedFkColumnKey)) return false
  for (const c of createCols) {
    if (c.optionalOnCreate) return false
  }
  return true
}

/**
 * Relaxed (with `listManyRelation.form.enabled: true`): parent + related FKs exist, required on
 * create; every other `create: true` column must be optional on create.
 */
export function adminEntityJunctionEligibleManyRelationFormRelaxed(
  many: AdminEntityColumnListManyRelation,
  junction: AdminEntityDefinition,
): boolean {
  const createCols = junction.columns.filter((c) => c.create)
  const byKey = new Map(createCols.map((c) => [c.key, c]))
  const parentCol = byKey.get(many.junctionParentFkColumnKey)
  const relatedCol = byKey.get(many.junctionRelatedFkColumnKey)
  if (!parentCol || !relatedCol) return false
  if (parentCol.optionalOnCreate || relatedCol.optionalOnCreate) return false
  for (const c of createCols) {
    if (c.key === many.junctionParentFkColumnKey || c.key === many.junctionRelatedFkColumnKey) {
      continue
    }
    if (!c.optionalOnCreate) return false
  }
  return true
}

/** @deprecated Use {@link adminEntityJunctionEligibleManyRelationFormStrict} with loaded junction. */
export function adminEntityManyRelationFormJunctionIsEligible(
  many: AdminEntityColumnListManyRelation,
  entities: Readonly<Record<string, AdminEntityDefinition>>,
): boolean {
  const jSlug = many.junctionEntitySlug
  const junction = entities[jSlug]
  if (!junction) return false
  return adminEntityJunctionEligibleManyRelationFormStrict(many, junction)
}

export function adminEntityColumnShowsManyRelationForm(
  _parentSlug: string,
  col: AdminEntityColumn,
  entities: Readonly<Record<string, AdminEntityDefinition>>,
): boolean {
  const many = col.listManyRelation
  if (!many || many.form?.enabled === false) return false
  if (!col.create && !col.patch) return false
  if (!col.listVirtual) return false

  const jSlug = many.junctionEntitySlug
  const junction = entities[jSlug]
  if (!junction) return false
  const strictOk = adminEntityJunctionEligibleManyRelationFormStrict(many, junction)
  const relaxedOk = adminEntityJunctionEligibleManyRelationFormRelaxed(many, junction)

  if (many.form?.enabled === true) {
    if (!relaxedOk) return false
  } else {
    if (!strictOk) return false
  }

  const relatedSlug = many.relatedEntitySlug
  if (!adminEntitySlugExposesApiInRegistry(entities, relatedSlug)) return false

  const related = entities[relatedSlug]
  if (!related) return false
  const relatedIdType = related.idColumn.valueType
  if (relatedIdType !== "integer" && relatedIdType !== "uuid") return false

  return true
}

export type AdminEntityManyRelationFormSpec = {
  readonly columnKey: string
  readonly many: AdminEntityColumnListManyRelation
  readonly relationIdsBodyKey: string
  readonly formGridSpan: number
  readonly relatedIdValueType: "integer" | "uuid"
}

const DEFAULT_MANY_RELATION_FORM_GRID_SPAN = 12

/** Split CRUD columns: main grid vs full-height many-relation side rail (wide `sm+`). */
export function partitionAdminEntityCrudColumnsMainAndManyRelationSide(
  slug: string,
  cols: readonly AdminEntityColumn[],
  entities: Readonly<Record<string, AdminEntityDefinition>>,
): { mainCols: AdminEntityColumn[]; sideManyCols: AdminEntityColumn[] } {
  const sideManyCols = cols.filter((c) =>
    adminEntityColumnShowsManyRelationForm(slug, c, entities),
  )
  const mainCols = cols.filter(
    (c) => !adminEntityColumnShowsManyRelationForm(slug, c, entities),
  )
  return { mainCols, sideManyCols }
}

export function adminEntityManyRelationFormSpecs(
  cfg: AdminEntityDefinition,
  entities: Readonly<Record<string, AdminEntityDefinition>>,
): readonly AdminEntityManyRelationFormSpec[] {
  const out: AdminEntityManyRelationFormSpec[] = []
  const slug = cfg.slug
  for (const col of cfg.columns) {
    if (!adminEntityColumnShowsManyRelationForm(slug, col, entities)) continue
    const many = col.listManyRelation!
    const relatedSlug = many.relatedEntitySlug
    const related = entities[relatedSlug]
    if (!related) continue
    const relatedIdValueType = related.idColumn.valueType
    if (relatedIdValueType !== "integer" && relatedIdValueType !== "uuid") continue

    const span =
      many.form?.formGridSpan ?? col.formGridSpan ?? DEFAULT_MANY_RELATION_FORM_GRID_SPAN
    out.push({
      columnKey: col.key,
      many,
      relationIdsBodyKey: adminEntityManyRelationRelationIdsBodyKey(many),
      formGridSpan: span,
      relatedIdValueType,
    })
  }
  return out
}

/** Build JSON array for `tagIds`-style keys from the checkbox comma field. */
export function manyRelationFormRelatedIdsForJsonBody(
  commaSeparated: string,
  relatedIdValueType: "integer" | "uuid",
): number[] | string[] {
  const tokens = parseManyRelationFormCommaSeparatedIds(commaSeparated)
  if (relatedIdValueType === "uuid") {
    const uuids = [
      ...new Set(
        tokens.map((t) => normalizeManyRelationUuidToken(t)).filter((x): x is string => x != null),
      ),
    ]
    uuids.sort((a, b) => a.localeCompare(b))
    return uuids
  }
  const nums = [
    ...new Set(
      tokens
        .map((t) => Number.parseInt(t, 10))
        .filter((n) => Number.isSafeInteger(n)),
    ),
  ]
  nums.sort((a, b) => a - b)
  return nums
}

/** Comma-separated sorted unique ids for TanStack Form string fields. */
export function adminEntityManyRelationFormValueFromListRow(
  row: Record<string, unknown>,
  many: AdminEntityColumnListManyRelation,
): string {
  const embed = row[many.embedJsonKey]
  if (!Array.isArray(embed)) return ""
  const fk = many.junctionRelatedFkColumnKey
  const raw: string[] = []
  for (const el of embed) {
    if (!el || typeof el !== "object") continue
    const v = (el as Record<string, unknown>)[fk]
    if (v == null) continue
    raw.push(String(v).trim())
  }
  const uniq = [...new Set(raw.filter((s) => s.length > 0))]
  uniq.sort((a, b) => {
    const na = Number(a)
    const nb = Number(b)
    if (Number.isFinite(na) && Number.isFinite(nb) && /^\d+$/.test(a) && /^\d+$/.test(b)) {
      return na - nb
    }
    return a.localeCompare(b)
  })
  return uniq.join(",")
}

export function parseManyRelationFormCommaSeparatedIds(value: string): string[] {
  return [
    ...new Set(
      value
        .split(/[,;\s]+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0),
    ),
  ].sort((a, b) => {
    const na = Number(a)
    const nb = Number(b)
    if (Number.isFinite(na) && Number.isFinite(nb) && /^\d+$/.test(a) && /^\d+$/.test(b)) {
      return na - nb
    }
    return a.localeCompare(b)
  })
}
