import "server-only"

import { and, asc, desc, eq, getTableColumns, inArray, notInArray } from "drizzle-orm"
import type { PgColumn } from "drizzle-orm/pg-core"

import { mergeListChildSumsIntoRows } from "./admin-entity-list-child-sum"
import { mergeListRelationEmbedsIntoRows } from "./admin-entity-list-relation-embed-merge"
import {
  buildAdminEntityListSqlContext,
  type ListOrderExpr,
} from "./admin-entity-list-sql-context"
import { effectiveListOrderSpecs } from "./admin-entity-list-sort-params-server"
import {
  buildAdminEntityInsertPayload,
  buildAdminEntityUpdatePayload,
} from "./admin-entity-insert-update-payload"
import type {
  AdminEntityJunctionSyncOp,
  AdminEntityListServerContext,
  AdminEntityQueryServerContext,
  AdminDrizzleDb,
} from "./admin-entity-types"
import { isAdminEntityCrudRelatedCollectionTable } from "./admin-entity-types"
import {
  shapeAdminEntityRowForApi,
  resolveChildFkValueForRelatedCollection,
  fetchAdminEntityDetailForApiWithExecutor,
  attachCrudRelatedCollectionsToAdminListItems,
  type DbTransaction,
  type DbExecutor,
} from "./admin-entity-crud-collections"

// Re-export for consumers that import from this module
export { attachCrudRelatedCollectionsToAdminListItems }

function idEq(
  ctx: AdminEntityQueryServerContext,
  slug: string,
  idParam: string,
) {
  const table = ctx.tables[slug]
  if (!table) {
    throw new Error(`[idEq] ${slug}: unknown entity`)
  }
  const cols = getTableColumns(table)
  const cfg = ctx.entities[slug]
  if (!cfg) {
    throw new Error(`[idEq] ${slug}: unknown entity config`)
  }
  const { jsonKey, valueType } = cfg.idColumn
  const idCol = cols[jsonKey as keyof typeof cols] as PgColumn | undefined
  if (!idCol) {
    throw new Error(`[idEq] ${slug}: missing id column ${jsonKey}`)
  }
  if (valueType === "integer") {
    return eq(idCol, Number(idParam))
  }
  return eq(idCol, idParam)
}

async function syncAdminEntityJunctionTx(
  ctx: AdminEntityQueryServerContext,
  tx: DbTransaction,
  op: AdminEntityJunctionSyncOp,
  parentId: number | string,
) {
  const table = ctx.tables[op.junctionEntitySlug]
  if (!table) {
    throw new Error(
      `[syncAdminEntityJunctionTx] ${op.junctionEntitySlug}: unknown junction table`,
    )
  }
  const cols = getTableColumns(table)
  const parentCol = cols[op.junctionParentFkColumnKey as keyof typeof cols] as
    | PgColumn
    | undefined
  const relatedCol = cols[op.junctionRelatedFkColumnKey as keyof typeof cols] as
    | PgColumn
    | undefined
  if (!parentCol || !relatedCol) {
    throw new Error(
      `[syncAdminEntityJunctionTx] ${op.junctionEntitySlug}: missing FK columns`,
    )
  }

  if (op.relatedIdValueType === "uuid") {
    const relatedIds = op.relatedIds
    if (relatedIds.length === 0) {
      await tx.delete(table).where(eq(parentCol, parentId))
      return
    }

    await tx
      .delete(table)
      .where(
        and(eq(parentCol, parentId), notInArray(relatedCol, [...relatedIds])),
      )

    const existing = await tx
      .select({ rid: relatedCol })
      .from(table)
      .where(eq(parentCol, parentId))

    const have = new Set(existing.map((r) => String(r.rid)))
    const toAdd = relatedIds.filter((id) => !have.has(id))
    if (toAdd.length === 0) return

    await tx.insert(table).values(
      toAdd.map((relatedId) => ({
        [op.junctionParentFkColumnKey]: parentId,
        [op.junctionRelatedFkColumnKey]: relatedId,
      })) as never,
    )
    return
  }

  const relatedIds = op.relatedIds
  if (relatedIds.length === 0) {
    await tx.delete(table).where(eq(parentCol, parentId))
    return
  }

  await tx
    .delete(table)
    .where(
      and(eq(parentCol, parentId), notInArray(relatedCol, [...relatedIds])),
    )

  const existing = await tx
    .select({ rid: relatedCol })
    .from(table)
    .where(eq(parentCol, parentId))

  const have = new Set(existing.map((r) => r.rid as number))
  const toAdd = relatedIds.filter((id) => !have.has(id))
  if (toAdd.length === 0) return

  await tx.insert(table).values(
    toAdd.map((relatedId) => ({
      [op.junctionParentFkColumnKey]: parentId,
      [op.junctionRelatedFkColumnKey]: relatedId,
    })) as never,
  )
}

function parentIdFromInsertedRow(
  ctx: AdminEntityQueryServerContext,
  slug: string,
  row: Record<string, unknown>,
): number | string {
  const cfg = ctx.entities[slug]
  if (!cfg) {
    throw new Error(`[parentIdFromInsertedRow] unknown entity: ${slug}`)
  }
  const idKey = cfg.idColumn.jsonKey
  const rawId = row[idKey]
  if (cfg.idColumn.valueType === "integer") {
    return Number(rawId)
  }
  return String(rawId)
}

function coerceParentIdForChildFk(
  idColumn: AdminEntityQueryServerContext["entities"][string]["idColumn"],
  idParam: string,
): number | string {
  if (idColumn.valueType === "integer") return Number(idParam)
  return idParam
}

function listOrderToDrizzleOrder(orderParts: ListOrderExpr[]) {
  return orderParts.map(({ expr, direction }) =>
    direction === "asc" ? asc(expr as never) : desc(expr as never),
  )
}

/**
 * Loads one admin row with the same `listRelation` / `listManyRelation` embeds and
 * `listChildSum` select extras as the list API, so GET detail matches list-shaped
 * payloads (e.g. `payrollPeriodRef.days` for nested CRUD virtual columns).
 */
async function selectAdminEntityRowWithListShapeForDetail(
  exec: DbExecutor,
  ctx: AdminEntityQueryServerContext,
  slug: string,
  idParam: string,
  fieldsFilter?: Set<string>,
): Promise<Record<string, unknown> | undefined> {
  const table = ctx.tables[slug]
  const cfg = ctx.entities[slug]
  if (!table || !cfg) return undefined
  const specs = effectiveListOrderSpecs(ctx.entities, slug, undefined)
  const { selectShape, joins, orderParts } = buildAdminEntityListSqlContext(
    ctx.entities,
    ctx.tables,
    slug,
    specs,
    fieldsFilter,
  )
  const orderForward = listOrderToDrizzleOrder(orderParts)
  /* eslint-disable @typescript-eslint/no-explicit-any -- Drizzle join chains are not assignable across steps (same as list page). */
  let q: any = (exec as AdminDrizzleDb).select(selectShape).from(table)
  for (const j of joins) {
    q = q.leftJoin(j.other, j.on)
  }
  q = q.where(idEq(ctx, slug, idParam)).orderBy(...orderForward).limit(1)
  const rows = (await q) as Record<string, unknown>[]
  /* eslint-enable @typescript-eslint/no-explicit-any */
  return rows[0]
}

async function insertAdminEntityRowTx(
  ctx: AdminEntityQueryServerContext,
  tx: DbTransaction,
  slug: string,
  values: Record<string, string>,
) {
  const table = ctx.tables[slug]
  if (!table) {
    throw new Error(`[insertAdminEntityRowTx] unknown entity: ${slug}`)
  }
  if (ctx.beforeInsertAdminEntityRowInTransaction) {
    await ctx.beforeInsertAdminEntityRowInTransaction({
      ctx,
      tx,
      slug,
      values,
    })
  }
  const payload = buildAdminEntityInsertPayload(ctx, slug, values)
  const [row] = await tx.insert(table).values(payload as never).returning()
  return row
}

async function updateAdminEntityRowTx(
  ctx: AdminEntityQueryServerContext,
  tx: DbTransaction,
  slug: string,
  idParam: string,
  patch: Record<string, string>,
) {
  const table = ctx.tables[slug]
  if (!table) {
    throw new Error(`[updateAdminEntityRowTx] unknown entity: ${slug}`)
  }
  const payload = buildAdminEntityUpdatePayload(ctx, slug, patch)
  if (Object.keys(payload).length === 0) {
    const rows = await tx.select().from(table).where(idEq(ctx, slug, idParam))
    return rows[0] as Record<string, unknown> | undefined
  }
  const [row] = await tx
    .update(table)
    .set(payload as never)
    .where(idEq(ctx, slug, idParam))
    .returning()
  return row as Record<string, unknown> | undefined
}

export async function insertAdminEntityRow(
  ctx: AdminEntityQueryServerContext,
  slug: string,
  values: Record<string, string>,
) {
  const table = ctx.tables[slug]
  if (!table) {
    throw new Error(`[insertAdminEntityRow] unknown entity: ${slug}`)
  }
  if (ctx.beforeInsertAdminEntityRowInTransaction) {
    const row = await ctx.db.transaction(async (tx) =>
      insertAdminEntityRowTx(ctx, tx, slug, values),
    )
    return shapeAdminEntityRowForApi(ctx, slug, row as Record<string, unknown>) as never
  }
  const payload = buildAdminEntityInsertPayload(ctx, slug, values)
  const [row] = await ctx.db.insert(table).values(payload as never).returning()
  return shapeAdminEntityRowForApi(ctx, slug, row as Record<string, unknown>) as never
}

export async function completeAdminEntityCreate(
  ctx: AdminEntityQueryServerContext,
  slug: string,
  values: Record<string, string>,
  junctionSync: readonly AdminEntityJunctionSyncOp[],
) {
  if (junctionSync.length === 0) {
    return insertAdminEntityRow(ctx, slug, values)
  }
  return ctx.db.transaction(async (tx) => {
    const row = await insertAdminEntityRowTx(ctx, tx, slug, values)
    const parentId = parentIdFromInsertedRow(
      ctx,
      slug,
      row as Record<string, unknown>,
    )
    for (const op of junctionSync) {
      await syncAdminEntityJunctionTx(ctx, tx, op, parentId)
    }
    return shapeAdminEntityRowForApi(ctx, slug, row as Record<string, unknown>) as never
  })
}

export async function updateAdminEntityRow(
  ctx: AdminEntityQueryServerContext,
  slug: string,
  idParam: string,
  patch: Record<string, string>,
) {
  const table = ctx.tables[slug]
  if (!table) {
    throw new Error(`[updateAdminEntityRow] unknown entity: ${slug}`)
  }
  const payload = buildAdminEntityUpdatePayload(ctx, slug, patch)
  const [row] = await ctx.db
    .update(table)
    .set(payload as never)
    .where(idEq(ctx, slug, idParam))
    .returning()
  return shapeAdminEntityRowForApi(ctx, slug, row as Record<string, unknown>) as never
}

export async function completeAdminEntityPatch(
  ctx: AdminEntityQueryServerContext,
  slug: string,
  idParam: string,
  patch: Record<string, string>,
  junctionSync: readonly AdminEntityJunctionSyncOp[],
) {
  if (junctionSync.length === 0) {
    return updateAdminEntityRow(ctx, slug, idParam, patch)
  }
  return ctx.db.transaction(async (tx) => {
    const row = await updateAdminEntityRowTx(ctx, tx, slug, idParam, patch)
    if (!row) return undefined
    const parentId = parentIdFromInsertedRow(ctx, slug, row)
    for (const op of junctionSync) {
      await syncAdminEntityJunctionTx(ctx, tx, op, parentId)
    }
    return shapeAdminEntityRowForApi(ctx, slug, row) as never
  })
}

/**
 * **GET** `/api/admin/[slug]/[id]`: parent row shaped for the admin API plus each
 * `crudRelatedCollections` array. Pass `tx` when calling inside an open transaction.
 * Pass `fieldsFilter` to select only a subset of columns (skips `crudRelatedCollections`).
 */
export async function fetchAdminEntityDetailForApi(
  ctx: AdminEntityQueryServerContext,
  slug: string,
  idParam: string,
  tx?: DbTransaction,
  fieldsFilter?: Set<string>,
): Promise<Record<string, unknown> | undefined> {
  const exec: DbExecutor = tx ?? ctx.db
  return fetchAdminEntityDetailForApiWithExecutor(
    ctx,
    slug,
    idParam,
    exec,
    selectAdminEntityRowWithListShapeForDetail,
    fieldsFilter,
  )
}

export async function completeAdminEntityCreateWithMaybeExtras(
  ctx: AdminEntityQueryServerContext,
  slug: string,
  values: Record<string, string>,
  junctionSync: readonly AdminEntityJunctionSyncOp[],
  extras: Record<string, unknown>,
) {
  const hasExtras = Object.keys(extras).some((k) => Object.hasOwn(extras, k))
  if (!hasExtras) {
    return completeAdminEntityCreate(ctx, slug, values, junctionSync)
  }
  const apply = ctx.applyCreateExtrasInTransaction
  if (!apply) {
    throw new Error(
      `[completeAdminEntityCreateWithMaybeExtras] extras not supported for ${slug}`,
    )
  }
  return ctx.db.transaction(async (tx) => {
    const row = await insertAdminEntityRowTx(ctx, tx, slug, values)
    const parentId = parentIdFromInsertedRow(ctx, slug, row as Record<string, unknown>)
    for (const op of junctionSync) {
      await syncAdminEntityJunctionTx(ctx, tx, op, parentId)
    }
    await apply({
      ctx,
      tx,
      slug,
      insertedParentRow: row as Record<string, unknown>,
      extras,
    })
    return shapeAdminEntityRowForApi(
      ctx,
      slug,
      row as Record<string, unknown>,
    ) as never
  })
}

export async function completeAdminEntityPatchWithMaybeExtras(
  ctx: AdminEntityQueryServerContext,
  slug: string,
  idParam: string,
  patch: Record<string, string>,
  junctionSync: readonly AdminEntityJunctionSyncOp[],
  extras: Record<string, unknown>,
) {
  const hasExtras = Object.keys(extras).some((k) => Object.hasOwn(extras, k))
  if (!hasExtras) {
    return completeAdminEntityPatch(ctx, slug, idParam, patch, junctionSync)
  }
  const apply = ctx.applyPatchExtrasInTransaction
  if (!apply) {
    throw new Error(
      `[completeAdminEntityPatchWithMaybeExtras] extras not supported for ${slug}`,
    )
  }
  const cfg = ctx.entities[slug]
  if (!cfg) {
    throw new Error(
      `[completeAdminEntityPatchWithMaybeExtras] unknown entity: ${slug}`,
    )
  }
  let updatedRow: Record<string, unknown> | undefined
  let finishedWrites = false
  await ctx.db.transaction(async (tx) => {
    const row = await updateAdminEntityRowTx(ctx, tx, slug, idParam, patch)
    if (!row) return
    updatedRow = row as Record<string, unknown>
    const parentId = parentIdFromInsertedRow(ctx, slug, row)
    for (const op of junctionSync) {
      await syncAdminEntityJunctionTx(ctx, tx, op, parentId)
    }
    const patchResponseOverride = await apply({
      ctx,
      tx,
      slug,
      idParam,
      updatedParentRow: updatedRow,
      extras,
    })
    if (
      patchResponseOverride != null &&
      typeof patchResponseOverride === "object" &&
      !Array.isArray(patchResponseOverride)
    ) {
      updatedRow = patchResponseOverride as Record<string, unknown>
    }
    finishedWrites = true
  })
  if (!finishedWrites || updatedRow == null) return undefined
  if (cfg.crudRelatedCollections?.length) {
    /** After commit: shorter lock hold + pool can run independent reads in parallel. */
    return fetchAdminEntityDetailForApi(ctx, slug, idParam)
  }
  return shapeAdminEntityRowForApi(ctx, slug, updatedRow) as never
}

export async function deleteAdminEntityRow(
  ctx: AdminEntityQueryServerContext,
  slug: string,
  idParam: string,
) {
  const table = ctx.tables[slug]
  if (!table) {
    throw new Error(`[deleteAdminEntityRow] unknown entity: ${slug}`)
  }
  const cfg = ctx.entities[slug]
  if (!cfg) {
    throw new Error(`[deleteAdminEntityRow] unknown entity: ${slug}`)
  }
  const related = cfg.crudRelatedCollections
  if (related?.length) {
    const parentId = coerceParentIdForChildFk(cfg.idColumn, idParam)
    return ctx.db.transaction(async (tx) => {
      for (const spec of related) {
        if (!isAdminEntityCrudRelatedCollectionTable(spec)) continue
        if (spec.skipDeleteChildRowsOnParentDelete === true) continue
        const childTable = ctx.tables[spec.childEntitySlug]
        if (!childTable) {
          throw new Error(
            `[deleteAdminEntityRow] unknown child entity: ${spec.childEntitySlug}`,
          )
        }
        const cols = getTableColumns(childTable)
        const fkCol = cols[
          spec.parentFkColumnKey as keyof typeof cols
        ] as PgColumn | undefined
        if (!fkCol) {
          throw new Error(
            `[deleteAdminEntityRow] ${spec.childEntitySlug}: missing FK ${spec.parentFkColumnKey}`,
          )
        }
        const fkDeleteValue = await resolveChildFkValueForRelatedCollection(
          ctx,
          tx,
          slug,
          parentId,
          spec,
        )
        await tx.delete(childTable).where(eq(fkCol, fkDeleteValue))
      }
      const [row] = await tx
        .delete(table)
        .where(idEq(ctx, slug, idParam))
        .returning()
      return row
    })
  }
  const [row] = await ctx.db
    .delete(table)
    .where(idEq(ctx, slug, idParam))
    .returning()
  return row
}

/** Insert within an existing transaction (e.g. parent row + children atomically). */
export async function adminEntityInsertRowInTransaction(
  ctx: AdminEntityQueryServerContext,
  tx: DbTransaction,
  slug: string,
  values: Record<string, string>,
): Promise<Record<string, unknown>> {
  const row = await insertAdminEntityRowTx(ctx, tx, slug, values)
  return row as Record<string, unknown>
}

/** Update within an existing transaction. */
export async function adminEntityUpdateRowInTransaction(
  ctx: AdminEntityQueryServerContext,
  tx: DbTransaction,
  slug: string,
  idParam: string,
  patch: Record<string, string>,
): Promise<Record<string, unknown> | undefined> {
  return updateAdminEntityRowTx(ctx, tx, slug, idParam, patch) as Promise<
    Record<string, unknown> | undefined
  >
}

/** Strip DB row to admin API JSON (camelCase / list shape). */
export function adminEntityShapeRowForApi(
  ctx: AdminEntityQueryServerContext,
  slug: string,
  row: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  return shapeAdminEntityRowForApi(ctx, slug, row)
}
