import "server-only"

import { asc, count, getTableColumns, type SQL } from "drizzle-orm"
import type { PgColumn, PgTable } from "drizzle-orm/pg-core"

import type {
  AdminDrizzleDb,
  AdminEntityDefinition,
  AdminEntityListServerContext,
} from "./admin-entity-types"
import {
  ADMIN_ENTITY_LIST_PRELOAD_ALL_MAX_LIMIT,
  type AdminEntityListResponse,
} from "./admin-entity-list-api"
import {
  adminEntityTableForSlug,
  buildAdminEntityListSqlContext,
  type ListOrderJoin,
} from "./admin-entity-list-sql-context"
import {
  encodeAdminEntityCursor,
  decodeAdminEntityCursor,
  forwardOrderBy,
  backwardScanOrderBy,
  sortStrictlyAfter,
  sortStrictlyBefore,
  coerceBoundaryRow,
  rowToCursorValues,
} from "./admin-entity-list-cursor"
import type { PrimaryListSort } from "./admin-entity-list-sort-params"
import { effectiveListOrderSpecs } from "./admin-entity-list-sort-params-server"
import { loadAdminEntityListAggregateSums } from "./admin-entity-list-aggregate-sums"
import { attachCrudRelatedCollectionsToAdminListItems } from "./admin-entity-queries"
import { stripAdminEntityApiRow } from "./admin-entity-list-response-strip"
import type { AdminRelationFilterApiValue } from "./admin-entity-relation-filter-value"
import { adminEntityListReportingPeriodExistsSql } from "./admin-entity-list-reporting-period-exists-sql"
import { adminEntityListDateRangeFilterSql } from "./admin-entity-list-date-range-filter-sql"
import { adminEntityListYearMonthFilterSql } from "./admin-entity-list-year-month-filter-sql"
import { buildAdminEntityListSearchSql } from "./admin-entity-list-search-sql"
import {
  combineWhere,
  adminEntityListBooleanFilterSql,
  adminEntityListRelationFiltersSql,
  adminEntityListManyRelationFiltersSql,
} from "./admin-entity-list-filter-where-sql"
import {
  pinTopForceIncludeWhere,
  pinTopOrderExpr,
} from "./admin-entity-list-pin-top"
import { resolveListFilterBypass } from "./admin-entity-list-filter-bypass"

type ListPageInput =
  | { mode: "page"; page: number }
  | { mode: "cursorAfter"; cursor: string }
  | { mode: "cursorBefore"; cursor: string }

export type ListAdminEntityPageOptions = {
  /** Trimmed by caller; empty disables search. Ignored when entity has no `listSearch`. */
  search?: string
  /**
   * When set, `WHERE column = value` for `listBooleanFilter.columnKey`.
   * Ignored when entity has no `listBooleanFilter` or column is not boolean.
   */
  booleanFilterValue?: boolean
  /**
   * `WHERE fk = value` or `WHERE fk IN (...)` (OR) per key; keys are `listRelationFilters[].columnKey`.
   * Ignored for keys without a matching spec or column metadata.
   */
  relationFilterValues?: Readonly<Record<string, AdminRelationFilterApiValue>>
  /**
   * Junction EXISTS filters; keys are `listManyRelationFilters[].manyRelationColumnKey`.
   * Value may be a scalar or array (OR: row matches if any junction link matches).
   */
  manyRelationFilterValues?: Readonly<Record<string, AdminRelationFilterApiValue>>
  /** When set, `WHERE year = … AND month = …` from `listYearMonthFilter`. */
  yearMonthFilter?: { year: number; month: number }
  /**
   * When set, `WHERE col >= from AND col <= to` per entry (inclusive, `YYYY-MM-DD`), AND-combined.
   * From `listDateRangeFilter` / `listDateRangeFilters` URL params.
   */
  dateRangeFilters?: readonly { columnKey: string; from: string; to: string }[]
  /**
   * When the listed entity defines `listScopeByReportingPeriodInRelated`, restricts rows to those
   * present on the related table for this period (via EXISTS).
   */
  reportingPeriodScope?: { year: number; month: number }
  /** When set, primary sort column + direction; id tie-break added server-side. */
  primarySort?: PrimaryListSort
  /**
   * Forwarded to `AdminEntityListServerContext.appendListWhere` (e.g. from
   * `listAppendWhereHintFilter` / `listAppendWhereHintFilters` query params).
   */
  appendListWhereHints?: Readonly<Record<string, string>>
  /** When set, only these column keys (plus the ID column) are included in the SELECT. */
  fieldsFilter?: Set<string>
  /**
   * When set, the row with this integer id is force-included past every filter and pinned to the
   * top of the result set (row 1). Used for an "anchor / point of interest" row, e.g. the
   * panda-realty map filter target property. Ignored if the entity's id column is not on the table.
   *
   * Intended for **page-mode** lists: the pin is prepended to the forward order only. Cursor
   * pagination boundaries are built from the entity's declared sort `specs` and do NOT account for
   * the pin, so the anchor is not guaranteed to stay on the first cursor page. Use page mode when
   * pinning.
   */
  pinTopId?: number
}

export type { PrimaryListSort } from "./admin-entity-list-sort-params"

export { encodeAdminEntityCursor, decodeAdminEntityCursor } from "./admin-entity-list-cursor"

async function selectAdminEntityListRows(args: {
  db: AdminDrizzleDb
  table: PgTable
  selectShape: Record<string, PgColumn | SQL>
  joins: ListOrderJoin[]
  where?: SQL
  orderForward: SQL[]
  limit: number
  offset?: number
}): Promise<Record<string, unknown>[]> {
  /* eslint-disable @typescript-eslint/no-explicit-any -- Drizzle join chains are not assignable across steps. */
  let q: any = args.db.select(args.selectShape).from(args.table)
  for (const j of args.joins) {
    q = q.leftJoin(j.other, j.on)
  }
  if (args.where) q = q.where(args.where)
  q = q.orderBy(...args.orderForward).limit(args.limit)
  if (args.offset !== undefined) q = q.offset(args.offset)
  const rows = await q
  return rows as Record<string, unknown>[]
}

function clampLimit(
  limit: number,
  frontendConfig: AdminEntityListServerContext["frontendConfig"],
): number {
  const def = frontendConfig.admin.entityListPageSizeOptions[0]
  if (!Number.isFinite(limit) || limit < 1) return def
  // Trust the route's already-validated limit; only apply the absolute preload-all ceiling. Normal
  // requests are still capped at ADMIN_ENTITY_LIST_MAX_LIMIT by the route's parseListLimit.
  return Math.min(limit, ADMIN_ENTITY_LIST_PRELOAD_ALL_MAX_LIMIT)
}

export async function listAdminEntityPage(
  ctx: AdminEntityListServerContext,
  slug: string,
  limitInput: number,
  input: ListPageInput,
  options?: ListAdminEntityPageOptions,
): Promise<AdminEntityListResponse> {
  const limit = clampLimit(limitInput, ctx.frontendConfig)
  const table = adminEntityTableForSlug(ctx.tables, slug)
  const entityCfg = ctx.entities[slug] as AdminEntityDefinition
  const specs = effectiveListOrderSpecs(ctx.entities, slug, options?.primarySort)
  const { selectShape, joins, orderParts } = buildAdminEntityListSqlContext(
    ctx.entities,
    ctx.tables,
    slug,
    specs,
    options?.fieldsFilter,
  )
  // Pin-to-top: resolve the integer id column + pin id once. When set, the pinned row is sorted
  // first (page mode) and force-included past every filter below.
  const pinTopIdCol =
    options?.pinTopId != null
      ? ((getTableColumns(table) as Record<string, PgColumn | undefined>)[
          entityCfg.idColumn.jsonKey
        ] as PgColumn | undefined)
      : undefined
  const pinTopId = pinTopIdCol ? options?.pinTopId : undefined

  const orderForward =
    pinTopId != null && pinTopIdCol
      ? [asc(pinTopOrderExpr(pinTopIdCol, pinTopId)), ...forwardOrderBy(orderParts)]
      : forwardOrderBy(orderParts)
  const orderBackward = backwardScanOrderBy(orderParts)

  const searchTrimmed = (options?.search ?? "").trim()
  const searchWhere = buildAdminEntityListSearchSql(ctx, slug, searchTrimmed)

  // Filter bypass: when an append-where hint (e.g. a map-area `streetFilter`) is active, suppress the
  // configured generic filters so the hint's results are not silently narrowed by them. The toolbar
  // controls keep their state client-side; they just stop affecting the query while the hint is present.
  const { bypassBooleanFilter, bypassedRelationColumnKeys } =
    resolveListFilterBypass(entityCfg, options?.appendListWhereHints)
  const relationFilterValuesForSql =
    bypassedRelationColumnKeys.size > 0 && options?.relationFilterValues
      ? Object.fromEntries(
          Object.entries(options.relationFilterValues).filter(
            ([key]) => !bypassedRelationColumnKeys.has(key),
          ),
        )
      : options?.relationFilterValues

  const booleanWhere = adminEntityListBooleanFilterSql(
    ctx.entities,
    slug,
    table,
    bypassBooleanFilter ? undefined : options?.booleanFilterValue,
  )
  const relationWhere = adminEntityListRelationFiltersSql(
    ctx.entities,
    slug,
    table,
    relationFilterValuesForSql,
  )
  const manyRelationWhere = adminEntityListManyRelationFiltersSql(
    ctx,
    slug,
    table,
    options?.manyRelationFilterValues,
  )
  const yearMonthWhere = adminEntityListYearMonthFilterSql(
    ctx.entities,
    slug,
    table,
    options?.yearMonthFilter,
  )
  const dateRangeWhere = adminEntityListDateRangeFilterSql(
    ctx.entities,
    slug,
    table,
    options?.dateRangeFilters,
  )
  const reportingPeriodExistsWhere = adminEntityListReportingPeriodExistsSql(
    ctx,
    slug,
    table,
    options?.reportingPeriodScope,
  )
  const appendWhere =
    ctx.appendListWhere?.({
      db: ctx.db,
      slug,
      table,
      relationFilterValues: options?.relationFilterValues ?? {},
      appendListWhereHints: options?.appendListWhereHints,
      dateRangeFilters: options?.dateRangeFilters,
    }) ?? undefined

  const filterParts = [
    searchWhere,
    booleanWhere,
    relationWhere,
    manyRelationWhere,
    yearMonthWhere,
    dateRangeWhere,
    reportingPeriodExistsWhere,
    appendWhere,
  ].filter((w): w is SQL => w != null)
  const reducedListWhere = filterParts.reduce<SQL | undefined>(
    (acc, w) => (acc ? combineWhere(acc, w) : w),
    undefined,
  )
  // Force-include the pinned row past every filter (favourites, status, street filter, etc.) so it
  // always appears at row 1. No-op when there is no other filter (every row already matches).
  const listBaseWhere =
    pinTopId != null && pinTopIdCol
      ? pinTopForceIncludeWhere(reducedListWhere, pinTopIdCol, pinTopId) ?? reducedListWhere
      : reducedListWhere

  const listAggregateSums =
    entityCfg.listAggregateSumsOnlyWhenFiltered === true &&
    listBaseWhere === undefined
      ? undefined
      : await loadAdminEntityListAggregateSums({
          db: ctx.db,
          entityCfg,
          table,
          listBaseWhere,
        })

  const [{ value: totalCountRaw }] = listBaseWhere
    ? await ctx.db
        .select({ value: count() })
        .from(table)
        .where(listBaseWhere)
    : await ctx.db.select({ value: count() }).from(table)
  const totalCount = Number(totalCountRaw ?? 0)
  const totalPages =
    totalCount === 0 ? 1 : Math.ceil(totalCount / limit)

  const toResponse = async (
    rawRows: Record<string, unknown>[],
    hasNextPage: boolean,
    hasPreviousPage: boolean,
    effectivePage?: number,
  ): Promise<AdminEntityListResponse> => {
    const slice = rawRows.slice(0, limit)
    const startCursor =
      slice.length > 0
        ? encodeAdminEntityCursor(
            rowToCursorValues(ctx.entities, slug, slice[0]!, specs),
          )
        : null
    const endCursor =
      slice.length > 0
        ? encodeAdminEntityCursor(
            rowToCursorValues(
              ctx.entities,
              slug,
              slice[slice.length - 1]!,
              specs,
            ),
          )
        : null
    let items = slice.map((r) => stripAdminEntityApiRow(r, entityCfg, table))
    if (entityCfg.crudRelatedCollections?.length) {
      items = await attachCrudRelatedCollectionsToAdminListItems(
        ctx,
        slug,
        items,
      )
    }
    return {
      items,
      totalCount,
      limit,
      totalPages,
      hasNextPage,
      hasPreviousPage,
      startCursor,
      endCursor,
      ...(effectivePage !== undefined ? { effectivePage } : {}),
      ...(listAggregateSums ? { listAggregateSums } : {}),
    }
  }

  if (totalCount === 0) {
    return await toResponse([], false, false)
  }

  if (input.mode === "page") {
    const requested = Math.max(1, input.page)
    const maxPage = Math.max(1, Math.ceil(totalCount / limit))
    const safePage = Math.min(requested, maxPage)
    const offset = (safePage - 1) * limit
    const rows = await selectAdminEntityListRows({
      db: ctx.db,
      table,
      selectShape,
      joins,
      where: listBaseWhere,
      orderForward,
      limit: limit + 1,
      offset,
    })
    const hasNext = rows.length > limit
    return await toResponse(rows, hasNext, safePage > 1, safePage)
  }

  if (input.mode === "cursorAfter") {
    const raw = decodeAdminEntityCursor(input.cursor)
    if (!raw) {
      return await toResponse([], false, false)
    }
    const boundary = coerceBoundaryRow(ctx.entities, slug, specs, raw)
    if (!boundary) {
      return await toResponse([], false, false)
    }
    const cursorWhere = sortStrictlyAfter(orderParts, boundary)
    const where = combineWhere(listBaseWhere, cursorWhere)!
    const rows = await selectAdminEntityListRows({
      db: ctx.db,
      table,
      selectShape,
      joins,
      where,
      orderForward,
      limit: limit + 1,
    })
    const hasNext = rows.length > limit
    return await toResponse(rows, hasNext, true)
  }

  const raw = decodeAdminEntityCursor(input.cursor)
  if (!raw) {
    return await toResponse([], false, false)
  }
  const boundary = coerceBoundaryRow(ctx.entities, slug, specs, raw)
  if (!boundary) {
    return await toResponse([], false, false)
  }
  const cursorWhere = sortStrictlyBefore(orderParts, boundary)
  const where = combineWhere(listBaseWhere, cursorWhere)!
  const rowsDesc = await selectAdminEntityListRows({
    db: ctx.db,
    table,
    selectShape,
    joins,
    where,
    orderForward: orderBackward,
    limit: limit + 1,
  })
  const hasPrev = rowsDesc.length > limit
  const ascRows = rowsDesc.slice(0, limit).reverse() as Record<string, unknown>[]
  return await toResponse(ascRows, true, hasPrev)
}
