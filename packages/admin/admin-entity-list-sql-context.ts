import "server-only"

import { eq, getTableColumns, sql, type SQL } from "drizzle-orm"
import type { PgColumn } from "drizzle-orm/pg-core"
import type { PgTable } from "drizzle-orm/pg-core"

import {
  adminEntityRelatedEmbedRowSql,
  listManyRelationEmbedJsonSql,
} from "./admin-entity-embed-sql"
import { appendListChildSumSelectExtras } from "./admin-entity-list-child-sum"
import type {
  AdminEntityDefinition,
  AdminEntityRegistry,
  AdminEntityTablesRegistry,
  ListOrderSpec,
} from "./admin-entity-types"
import { concatWsRelationLabelSql } from "./admin-entity-list-relation-label-sql"
import { buildListVirtualSelectExtras } from "./admin-entity-list-virtual-select-extras"
import { secondaryLineSourceColumnKeys } from "./admin-entity-secondary-line-source"

export type ListOrderJoin = { other: PgTable; on: SQL }

export type ListOrderExpr = { expr: PgColumn | SQL; direction: "asc" | "desc" }

export type AdminEntityListSqlContext = {
  specs: ListOrderSpec[]
  /** Main row + embedded relation JSON + internal `_cursor_*` aliases (stripped in list response). */
  selectShape: Record<string, PgColumn | SQL>
  joins: ListOrderJoin[]
  orderParts: ListOrderExpr[]
}

function slugInEntities(entities: AdminEntityRegistry, s: string): boolean {
  return Object.hasOwn(entities, s)
}

/**
 * LEFT JOIN related tables as needed, add embedded JSON for `listRelation` / `listManyRelation`,
 * and build ORDER BY / cursor expressions (FK sorts use the concat label by default; relations can
 * opt into a related sort column; cursors use `_cursor_*`).
 *
 * When `fieldsFilter` is provided, only the ID column + requested column keys are selected.
 * Expensive JOINs and sub-selects for unrequested columns are skipped.
 */
export function buildAdminEntityListSqlContext(
  entities: AdminEntityRegistry,
  tables: AdminEntityTablesRegistry,
  slug: string,
  specs: ListOrderSpec[],
  fieldsFilter?: Set<string>,
): AdminEntityListSqlContext {
  const cfg = entities[slug] as AdminEntityDefinition | undefined
  const table = tables[slug]
  if (!cfg || !table) {
    throw new Error(`[buildAdminEntityListSqlContext] unknown entity: ${slug}`)
  }
  const mainCols = getTableColumns(table)
  const joins: ListOrderJoin[] = []
  const joinedRelated = new Set<string>()
  const selectExtras: Record<string, PgColumn | SQL> = {}
  /** FK column key → label SQL (shared by SELECT alias + ORDER BY). */
  const labelSqlByFkKey: Record<string, SQL> = {}
  /** Column keys used in ORDER BY — cursor aliases for these are always preserved. */
  const sortColumnKeys = new Set(specs.map((s) => s.columnKey))
  /** Source columns whose embed feeds another cell's secondary line — always keep their embed. */
  const secondaryEmbedSourceKeys = secondaryLineSourceColumnKeys(cfg)

  for (const col of cfg.columns) {
    if (!col.listRelation) continue
    /** List-only relations stay list-only; form-only FKs (e.g. `list: false` + `patch: true`) still need JOINs for detail GET / list-row seed. */
    if (!col.list && !col.create && !col.patch) continue
    const rel = col.listRelation
    if (!slugInEntities(entities, rel.relatedEntitySlug)) continue

    const neededForSecondaryLine = secondaryEmbedSourceKeys.has(col.key)
    const skipEmbed =
      fieldsFilter != null &&
      !fieldsFilter.has(col.key) &&
      !neededForSecondaryLine
    const isNeededForSort = sortColumnKeys.has(col.key)

    // Skip entirely when not requested and not a sort column
    if (skipEmbed && !isNeededForSort) continue

    const relSlug = rel.relatedEntitySlug
    const relTable = tables[relSlug]
    if (!relTable) continue
    const relCols = getTableColumns(relTable)
    const relatedCfg = entities[relSlug] as AdminEntityDefinition
    const fkCol = mainCols[col.key as keyof typeof mainCols] as PgColumn | undefined
    const relIdKey = relatedCfg.idColumn.jsonKey
    const relIdCol = relCols[relIdKey as keyof typeof relCols] as
      | PgColumn
      | undefined
    if (!fkCol || !relIdCol) continue
    const validKeys = new Set(relatedCfg.columns.map((c) => c.key))
    const labelPgCols = rel.labelColumnKeys
      .filter((k) => validKeys.has(k))
      .map((k) => relCols[k as keyof typeof relCols] as PgColumn)
      .filter((c): c is PgColumn => c != null)

    if (labelPgCols.length === 0) continue

    if (!joinedRelated.has(relSlug)) {
      joins.push({ other: relTable, on: eq(fkCol, relIdCol) })
      joinedRelated.add(relSlug)
    }

    const labelSql = concatWsRelationLabelSql(labelPgCols)
    labelSqlByFkKey[col.key] = labelSql
    const orderByRelatedKey = col.listRelation.orderByRelatedColumnKey
    const orderByRelatedCol =
      orderByRelatedKey != null
        ? (relCols[orderByRelatedKey as keyof typeof relCols] as
            | PgColumn
            | undefined)
        : undefined
    if (orderByRelatedKey != null && orderByRelatedCol == null) {
      throw new Error(
        `[buildAdminEntityListSqlContext] ${slug}.${col.key}: listRelation.orderByRelatedColumnKey ${JSON.stringify(orderByRelatedKey)} missing on ${relSlug}`,
      )
    }

    if (!skipEmbed) {
      const embedSql = adminEntityRelatedEmbedRowSql({
        relatedEntitySlug: relSlug,
        relatedCfg: relatedCfg,
        relCols: relCols as Record<string, PgColumn>,
        relatedPk: relIdCol,
      })
      selectExtras[rel.embedJsonKey] = embedSql.as(
        rel.embedJsonKey,
      ) as unknown as SQL
    }

    const cursorAlias = `_cursor_${col.key}`
    const cursorExpr =
      rel.listCellShow === "storedFk"
        ? fkCol
        : orderByRelatedCol ?? labelSql
    selectExtras[cursorAlias] = sql`${cursorExpr}`.as(cursorAlias) as unknown as SQL
  }

  for (const col of cfg.columns) {
    if (!col.list || !col.listManyRelation) continue
    if (fieldsFilter && !fieldsFilter.has(col.key)) continue
    const many = col.listManyRelation
    if (!slugInEntities(entities, many.junctionEntitySlug)) continue
    if (!slugInEntities(entities, many.relatedEntitySlug)) continue

    const junctionSlug = many.junctionEntitySlug
    const relatedSlug = many.relatedEntitySlug
    const junctionTable = tables[junctionSlug]
    const relatedTable = tables[relatedSlug]
    if (!junctionTable || !relatedTable) continue
    const junctionCols = getTableColumns(junctionTable)
    const relatedCols = getTableColumns(relatedTable)

    const junctionParentFk = junctionCols[
      many.junctionParentFkColumnKey as keyof typeof junctionCols
    ] as PgColumn | undefined
    const junctionRelatedFk = junctionCols[
      many.junctionRelatedFkColumnKey as keyof typeof junctionCols
    ] as PgColumn | undefined

    const junctionCfg = entities[junctionSlug] as AdminEntityDefinition
    const relatedCfg = entities[relatedSlug] as AdminEntityDefinition
    const relatedIdKey = relatedCfg.idColumn.jsonKey
    const relatedPk = relatedCols[relatedIdKey as keyof typeof relatedCols] as
      | PgColumn
      | undefined

    const mainIdKey = cfg.idColumn.jsonKey
    const mainParentPk = mainCols[mainIdKey as keyof typeof mainCols] as
      | PgColumn
      | undefined

    if (
      !junctionParentFk ||
      !junctionRelatedFk ||
      !relatedPk ||
      !mainParentPk
    ) {
      continue
    }

    const validRelatedKeys = new Set(relatedCfg.columns.map((c) => c.key))
    const labelPgCols = many.labelColumnKeys
      .filter((k) => validRelatedKeys.has(k))
      .map((k) => relatedCols[k as keyof typeof relatedCols] as PgColumn)
      .filter((c): c is PgColumn => c != null)

    if (labelPgCols.length === 0) continue

    const orderKeys =
      many.aggregateOrderByColumnKeys ?? many.labelColumnKeys
    const orderPgCols = orderKeys
      .filter((k) => validRelatedKeys.has(k))
      .map((k) => relatedCols[k as keyof typeof relatedCols] as PgColumn)
      .filter((c): c is PgColumn => c != null)

    const agg = listManyRelationEmbedJsonSql({
      junctionTable,
      relatedTable,
      junctionCfg,
      relatedCfg,
      relatedEntitySlug: relatedSlug,
      junctionCols: junctionCols as Record<string, PgColumn>,
      relatedCols: relatedCols as Record<string, PgColumn>,
      junctionParentFk,
      junctionRelatedFk,
      relatedPk,
      mainParentPk,
      embedRelatedJsonKey: many.embedRelatedJsonKey,
      orderPgCols,
    })

    selectExtras[many.embedJsonKey] = agg.as(
      many.embedJsonKey,
    ) as unknown as SQL
  }

  appendListChildSumSelectExtras({
    entities,
    tables,
    slug,
    mainTable: table,
    selectExtras,
  })

  // Remove child-sum extras for columns not in the fields filter
  if (fieldsFilter) {
    for (const k of Object.keys(selectExtras)) {
      if (k.startsWith("_cursor_")) continue
      if (fieldsFilter.has(k)) continue
      const isRequestedEmbed = cfg.columns.some(
        (c) =>
          fieldsFilter.has(c.key) &&
          (c.listRelation?.embedJsonKey === k ||
            c.listManyRelation?.embedJsonKey === k),
      )
      // Keep a source relation's embed when another cell renders a secondary line from it.
      const isSecondaryLineEmbed = cfg.columns.some(
        (c) =>
          secondaryEmbedSourceKeys.has(c.key) &&
          c.listRelation?.embedJsonKey === k,
      )
      if (!isRequestedEmbed && !isSecondaryLineEmbed) delete selectExtras[k]
    }
  }

  buildListVirtualSelectExtras({
    cfg,
    mainCols: mainCols as Record<string, PgColumn | undefined>,
    tables,
    entities,
    fieldsFilter,
    selectExtras,
    slug,
  })

  const orderParts: ListOrderExpr[] = []
  for (const spec of specs) {
    const meta = cfg.columns.find((c) => c.key === spec.columnKey)
    const rel = meta?.listRelation
    const labelKey = rel?.labelColumnKeys[0]
    if (
      rel &&
      labelKey &&
      slugInEntities(entities, rel.relatedEntitySlug)
    ) {
      if (rel.listCellShow === "storedFk") {
        const fkCol = mainCols[spec.columnKey as keyof typeof mainCols] as
          | PgColumn
          | undefined
        if (!fkCol) {
          throw new Error(
            `[buildAdminEntityListSqlContext] ${slug}.${spec.columnKey}: listRelation listCellShow storedFk requires FK column on main table`,
          )
        }
        const ordExpr =
          meta?.listSortAsNumeric === true
            ? sql`(${fkCol})::bigint`
            : fkCol
        orderParts.push({ expr: ordExpr, direction: spec.direction })
      } else {
        const orderByRelatedKey = rel.orderByRelatedColumnKey
        if (orderByRelatedKey != null) {
          const relTable = tables[rel.relatedEntitySlug]
          if (relTable) {
            const relCols = getTableColumns(relTable)
            const orderCol = relCols[
              orderByRelatedKey as keyof typeof relCols
            ] as PgColumn | undefined
            if (orderCol) {
              orderParts.push({ expr: orderCol, direction: spec.direction })
              continue
            }
          }
          throw new Error(
            `[buildAdminEntityListSqlContext] ${slug}.${spec.columnKey}: listRelation.orderByRelatedColumnKey could not resolve related order column`,
          )
        }
        const labelSql = labelSqlByFkKey[spec.columnKey]
        if (!labelSql) {
          throw new Error(
            `[buildAdminEntityListSqlContext] ${slug}.${spec.columnKey}: listRelation has no usable label SQL`,
          )
        }
        orderParts.push({ expr: labelSql, direction: spec.direction })
      }
    } else {
      const ordRel = meta?.listVirtualOrderByRelatedColumn
      if (ordRel) {
        const src = cfg.columns.find((c) => c.key === ordRel.sourceColumnKey)
        const srcRel = src?.listRelation
        if (
          src &&
          srcRel &&
          src.list === true &&
          slugInEntities(entities, srcRel.relatedEntitySlug)
        ) {
          const relTable = tables[srcRel.relatedEntitySlug]
          if (relTable) {
            const relCols = getTableColumns(relTable)
            const relatedCfg = entities[
              srcRel.relatedEntitySlug
            ] as AdminEntityDefinition
            const validKeys = new Set(relatedCfg.columns.map((c) => c.key))
            if (validKeys.has(ordRel.relatedColumnKey)) {
              const orderCol = relCols[
                ordRel.relatedColumnKey as keyof typeof relCols
              ] as PgColumn | undefined
              if (orderCol) {
                orderParts.push({ expr: orderCol, direction: spec.direction })
                continue
              }
            }
          }
        }
        throw new Error(
          `[buildAdminEntityListSqlContext] ${slug}.${spec.columnKey}: listVirtualOrderByRelatedColumn could not resolve related order column (check sourceColumnKey listRelation + relatedColumnKey)`,
        )
      }
      const col = mainCols[spec.columnKey as keyof typeof mainCols] as
        | PgColumn
        | undefined
      if (!col) {
        throw new Error(
          `[buildAdminEntityListSqlContext] ${slug}.${spec.columnKey}: unknown order column (list-only virtual columns are not sortable)`,
        )
      }
      const ordExpr =
        meta?.listSortAsNumeric === true ? sql`(${col})::bigint` : col
      orderParts.push({ expr: ordExpr, direction: spec.direction })
    }
  }

  const idKey = cfg.idColumn.jsonKey
  const filteredMainCols = fieldsFilter
    ? Object.fromEntries(
        Object.entries(mainCols).filter(
          ([k]) => k === idKey || fieldsFilter.has(k),
        ),
      )
    : mainCols

  return {
    specs,
    selectShape: { ...filteredMainCols, ...selectExtras },
    joins,
    orderParts,
  }
}

export function adminEntityTableForSlug(
  tables: AdminEntityTablesRegistry,
  slug: string,
): PgTable {
  const t = tables[slug]
  if (!t) {
    throw new Error(`[adminEntityTableForSlug] unknown entity: ${slug}`)
  }
  return t
}
