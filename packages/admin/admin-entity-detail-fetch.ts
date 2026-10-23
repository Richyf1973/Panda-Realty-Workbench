import "server-only"

import { asc, desc, eq, getTableColumns, inArray } from "drizzle-orm"
import type { PgColumn } from "drizzle-orm/pg-core"

import { mergeListChildSumsIntoRows } from "./admin-entity-list-child-sum"
import { mergeListRelationEmbedsIntoRows } from "./admin-entity-list-relation-embed-merge"
import { stripAdminEntityApiRow } from "./admin-entity-list-response-strip"
import type {
  AdminEntityCrudRelatedCollectionTable,
  AdminEntityDefinition,
  AdminEntityQueryServerContext,
  AdminDrizzleDb,
} from "./admin-entity-types"
import { isAdminEntityCrudRelatedCollectionTable } from "./admin-entity-types"

type DbClient = AdminEntityQueryServerContext["db"]
export type DbTransaction = Parameters<Parameters<DbClient["transaction"]>[0]>[0]
export type DbExecutor = AdminDrizzleDb | DbTransaction

export function shapeAdminEntityRowForApi(
  ctx: AdminEntityQueryServerContext,
  slug: string,
  row: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!row) return undefined
  const cfg = ctx.entities[slug] as AdminEntityDefinition | undefined
  const table = ctx.tables[slug]
  if (!cfg || !table) return row
  return stripAdminEntityApiRow(row, cfg, table)
}

/**
 * Build ORDER BY expressions for a related collection. Supports single-column (`orderByColumnKey`)
 * and multi-column (`orderByColumns`) sort specs.
 */
export function resolveRelatedOrderBy(
  cols: ReturnType<typeof getTableColumns>,
  spec: AdminEntityCrudRelatedCollectionTable,
  childCfg: AdminEntityDefinition,
  label: string,
): ReturnType<typeof asc>[] {
  if (spec.orderByColumns && spec.orderByColumns.length > 0) {
    return spec.orderByColumns.map(({ columnKey, direction }) => {
      const col = cols[columnKey as keyof typeof cols] as PgColumn | undefined
      if (!col)
        throw new Error(`${label}: missing order column ${columnKey}`)
      return direction === "desc" ? desc(col) : asc(col)
    })
  }
  const key = spec.orderByColumnKey ?? childCfg.idColumn.jsonKey
  const col = cols[key as keyof typeof cols] as PgColumn | undefined
  if (!col) throw new Error(`${label}: missing order column ${key}`)
  return [asc(col)]
}

/**
 * Value used to filter child rows (`parentFkColumnKey`) for a related collection: either the
 * parent PK or a column read from the parent row when `childFkValueFromParentColumnKey` is set.
 *
 * Also used by `deleteAdminEntityRow` in admin-entity-queries.ts.
 */
export async function resolveChildFkValueForRelatedCollection(
  ctx: AdminEntityQueryServerContext,
  exec: DbExecutor,
  parentSlug: string,
  parentPkValue: number | string,
  spec: AdminEntityCrudRelatedCollectionTable,
): Promise<number | string> {
  if (!spec.childFkValueFromParentColumnKey) {
    return parentPkValue
  }
  const parentTable = ctx.tables[parentSlug]
  const parentCfg = ctx.entities[parentSlug]
  if (!parentTable || !parentCfg) {
    throw new Error(
      `[resolveChildFkValueForRelatedCollection] unknown parent entity: ${parentSlug}`,
    )
  }
  const cols = getTableColumns(parentTable)
  const idCol = cols[parentCfg.idColumn.jsonKey as keyof typeof cols] as PgColumn | undefined
  if (!idCol) {
    throw new Error(
      `[resolveChildFkValueForRelatedCollection] ${parentSlug}: missing id column ${parentCfg.idColumn.jsonKey}`,
    )
  }
  const idFilter =
    parentCfg.idColumn.valueType === "integer"
      ? eq(idCol, Number(parentPkValue))
      : eq(idCol, String(parentPkValue))
  const rows = await exec
    .select()
    .from(parentTable)
    .where(idFilter)
    .limit(1)
  const row = rows[0] as Record<string, unknown> | undefined
  const colKey = spec.childFkValueFromParentColumnKey
  const raw = row?.[colKey]
  if (raw == null || raw === "") {
    throw new Error(
      `[resolveChildFkValueForRelatedCollection] ${parentSlug} ${String(parentPkValue)}: missing parent column ${colKey}`,
    )
  }
  const colMeta = parentCfg.columns.find((c) => c.key === colKey)
  if (colMeta?.valueType === "integer") {
    const n = typeof raw === "number" ? raw : Number(raw)
    if (!Number.isFinite(n)) {
      throw new Error(
        `[resolveChildFkValueForRelatedCollection] ${parentSlug}.${colKey}: expected finite number`,
      )
    }
    return n
  }
  return String(raw)
}

/**
 * For entities whose rows appear as `crudRelatedCollections` children (e.g. payrolls under a
 * payroll period), loads each row's own `crudRelatedCollections` (e.g. overtime lines) so list and
 * GET detail payloads match nested CRUD and client-side rollups.
 */
export async function attachNestedCrudCollectionsToShapedChildRows(
  ctx: AdminEntityQueryServerContext,
  exec: DbExecutor,
  parentEntitySlug: string,
  shapedParents: Record<string, unknown>[],
): Promise<Record<string, unknown>[]> {
  const parentCfg = ctx.entities[
    parentEntitySlug
  ] as AdminEntityDefinition | undefined
  const nestedSpecs = parentCfg?.crudRelatedCollections
  if (
    parentCfg == null ||
    !nestedSpecs?.length ||
    shapedParents.length === 0
  ) {
    return shapedParents.map((r) => ({ ...r }))
  }

  const idKey = parentCfg.idColumn.jsonKey
  const idVT = parentCfg.idColumn.valueType
  const toCoercedId = (raw: unknown): string | number | null => {
    if (raw == null || raw === "") return null
    if (idVT === "integer") {
      const n = Number(raw)
      return Number.isFinite(n) ? n : null
    }
    return String(raw)
  }

  const parentIds = [
    ...new Set(
      shapedParents
        .map((r) => toCoercedId(r[idKey]))
        .filter((id): id is string | number => id != null),
    ),
  ]

  const fkGroupKey = (raw: unknown): string => {
    if (idVT === "integer") return String(Number(raw))
    return String(raw)
  }

  const tableSpecs = nestedSpecs.filter(isAdminEntityCrudRelatedCollectionTable)
  if (tableSpecs.length === 0) {
    return shapedParents.map((r) => ({ ...r }))
  }

  const byJsonKey = await Promise.all(
    tableSpecs.map(async (spec) => {
      const childSlug = spec.childEntitySlug
      const childTable = ctx.tables[childSlug]
      const childCfg = ctx.entities[childSlug]
      if (!childTable || !childCfg) {
        throw new Error(
          `[attachNestedCrudCollectionsToShapedChildRows] ${parentEntitySlug}: unknown child entity ${childSlug}`,
        )
      }
      const cols = getTableColumns(childTable)
      const fkCol = cols[
        spec.parentFkColumnKey as keyof typeof cols
      ] as PgColumn | undefined
      if (!fkCol) {
        throw new Error(
          `[attachNestedCrudCollectionsToShapedChildRows] ${childSlug}: missing FK column ${spec.parentFkColumnKey}`,
        )
      }
      const orderExprs = resolveRelatedOrderBy(
        cols,
        spec,
        childCfg,
        `[attachNestedCrudCollectionsToShapedChildRows] ${childSlug}`,
      )

      const idsForIn =
        spec.childFkValueFromParentColumnKey != null &&
        spec.childFkValueFromParentColumnKey !== ""
          ? [
              ...new Set(
                shapedParents
                  .map((r) =>
                    toCoercedId(r[spec.childFkValueFromParentColumnKey!]),
                  )
                  .filter((id): id is string | number => id != null),
              ),
            ]
          : parentIds

      if (idsForIn.length === 0) {
        return {
          jsonKey: spec.jsonKey,
          grouped: new Map<string, Record<string, unknown>[]>(),
          attachViaParentColumnKey: spec.childFkValueFromParentColumnKey,
        }
      }

      const childRows = await exec
        .select()
        .from(childTable)
        .where(inArray(fkCol, idsForIn as never))
        .orderBy(asc(fkCol), ...orderExprs)

      const mergedChildren = await mergeListChildSumsIntoRows(
        ctx,
        childSlug,
        childRows as Record<string, unknown>[],
        exec as AdminDrizzleDb,
      )
      const mergedWithEmbeds = await mergeListRelationEmbedsIntoRows(
        ctx,
        childSlug,
        mergedChildren as Record<string, unknown>[],
        exec as AdminDrizzleDb,
      )

      const grouped = new Map<string, Record<string, unknown>[]>()
      for (const r of mergedWithEmbeds) {
        const gk = fkGroupKey(r[spec.parentFkColumnKey])
        const shaped = shapeAdminEntityRowForApi(ctx, childSlug, r)
        if (!shaped) continue
        const arr = grouped.get(gk) ?? []
        arr.push(shaped)
        grouped.set(gk, arr)
      }

      const nestedPairs = await Promise.all(
        [...grouped.entries()].map(
          async ([gk, arr]) =>
            [
              gk,
              await attachNestedCrudCollectionsToShapedChildRows(
                ctx,
                exec,
                childSlug,
                arr,
              ),
            ] as const,
        ),
      )
      const groupedFinal = new Map<string, Record<string, unknown>[]>(nestedPairs)

      return {
        jsonKey: spec.jsonKey,
        grouped: groupedFinal,
        attachViaParentColumnKey: spec.childFkValueFromParentColumnKey,
      }
    }),
  )

  let enriched = shapedParents.map((r) => ({ ...r }))
  for (const { jsonKey, grouped, attachViaParentColumnKey } of byJsonKey) {
    enriched = enriched.map((row) => {
      const rawKey =
        attachViaParentColumnKey != null && attachViaParentColumnKey !== ""
          ? row[attachViaParentColumnKey]
          : row[idKey]
      const gk = fkGroupKey(rawKey)
      return {
        ...row,
        [jsonKey]: grouped.get(gk) ?? [],
      }
    })
  }

  return enriched
}

/**
 * One `crudRelatedCollections` table branch for GET detail / PATCH response (parent row already
 * shaped). Runs in parallel with sibling collections when `exec` is the pool (no open tx).
 */
export async function loadAdminEntityDetailRelatedCollectionTable(
  ctx: AdminEntityQueryServerContext,
  exec: DbExecutor,
  parentSlug: string,
  spec: AdminEntityCrudRelatedCollectionTable,
  parentPkValue: number | string,
): Promise<{ jsonKey: string; rows: Record<string, unknown>[] }> {
  const childSlug = spec.childEntitySlug
  const childTable = ctx.tables[childSlug]
  const childCfg = ctx.entities[childSlug]
  if (!childTable || !childCfg) {
    throw new Error(
      `[loadAdminEntityDetailRelatedCollectionTable] unknown child entity: ${childSlug}`,
    )
  }
  const cols = getTableColumns(childTable)
  const fkCol = cols[
    spec.parentFkColumnKey as keyof typeof cols
  ] as PgColumn | undefined
  if (!fkCol) {
    throw new Error(
      `[loadAdminEntityDetailRelatedCollectionTable] ${childSlug}: missing FK column ${spec.parentFkColumnKey}`,
    )
  }
  const orderExprs = resolveRelatedOrderBy(
    cols,
    spec,
    childCfg,
    `[loadAdminEntityDetailRelatedCollectionTable] ${childSlug}`,
  )
  const fkFilterValue = await resolveChildFkValueForRelatedCollection(
    ctx,
    exec,
    parentSlug,
    parentPkValue,
    spec,
  )
  const childRows = await exec
    .select()
    .from(childTable)
    .where(eq(fkCol, fkFilterValue))
    .orderBy(...orderExprs)
  const mergedChildren = await mergeListChildSumsIntoRows(
    ctx,
    childSlug,
    childRows as Record<string, unknown>[],
    exec as AdminDrizzleDb,
  )
  const mergedWithEmbeds = await mergeListRelationEmbedsIntoRows(
    ctx,
    childSlug,
    mergedChildren as Record<string, unknown>[],
    exec as AdminDrizzleDb,
  )
  const shapedParents = mergedWithEmbeds
    .map((r) => shapeAdminEntityRowForApi(ctx, childSlug, r))
    .filter((r): r is Record<string, unknown> => r != null)
  const rows = await attachNestedCrudCollectionsToShapedChildRows(
    ctx,
    exec,
    childSlug,
    shapedParents,
  )
  return { jsonKey: spec.jsonKey, rows }
}

/**
 * **GET** `/api/admin/[slug]/[id]`: parent row shaped for the admin API plus each
 * `crudRelatedCollections` array. Accepts a pre-resolved executor (db pool or open tx).
 * Pass `fieldsFilter` to select only a subset of columns (skips `crudRelatedCollections`).
 *
 * Moved here from admin-entity-queries to avoid circular imports.
 * The `coerceParentIdForChildFk` helper is inlined below to remain self-contained.
 */
export async function fetchAdminEntityDetailForApiWithExecutor(
  ctx: AdminEntityQueryServerContext,
  slug: string,
  idParam: string,
  exec: DbExecutor,
  // selectAdminEntityRowWithListShapeForDetail lives in queries; caller passes the shaped row
  selectRow: (
    exec: DbExecutor,
    ctx: AdminEntityQueryServerContext,
    slug: string,
    idParam: string,
    fieldsFilter?: Set<string>,
  ) => Promise<Record<string, unknown> | undefined>,
  fieldsFilter?: Set<string>,
): Promise<Record<string, unknown> | undefined> {
  const table = ctx.tables[slug]
  const cfg = ctx.entities[slug]
  if (!table || !cfg) return undefined
  const row = await selectRow(exec, ctx, slug, idParam, fieldsFilter)
  if (!row) return undefined
  const [enrichedMain] = await mergeListChildSumsIntoRows(
    ctx,
    slug,
    [row as Record<string, unknown>],
    exec as AdminDrizzleDb,
  )
  const shaped = shapeAdminEntityRowForApi(ctx, slug, enrichedMain)
  if (!shaped) return undefined

  // Skip crudRelatedCollections when a fields subset was requested
  if (fieldsFilter) {
    const merge = ctx.mergeAdminEntityDetailForApi
    if (merge) return merge({ ctx, slug, idParam, detail: { ...shaped } })
    return { ...shaped }
  }

  const rel = cfg.crudRelatedCollections
  let out: Record<string, unknown>
  if (!rel?.length) {
    out = { ...shaped }
  } else {
    const idColumn = cfg.idColumn
    const parentId =
      idColumn.valueType === "integer" ? Number(idParam) : idParam
    const tableSpecs = rel.filter(isAdminEntityCrudRelatedCollectionTable)
    const loaded = await Promise.all(
      tableSpecs.map((spec) =>
        loadAdminEntityDetailRelatedCollectionTable(
          ctx,
          exec,
          slug,
          spec,
          parentId,
        ),
      ),
    )
    out = { ...shaped }
    for (const { jsonKey, rows } of loaded) {
      out[jsonKey] = rows
    }
  }
  const merge = ctx.mergeAdminEntityDetailForApi
  if (merge) {
    return merge({ ctx, slug, idParam, detail: out })
  }
  return out
}
