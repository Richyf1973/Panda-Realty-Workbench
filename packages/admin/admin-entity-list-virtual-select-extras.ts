import "server-only"

import { eq, getTableColumns, sql, type SQL } from "drizzle-orm"
import type { PgColumn } from "drizzle-orm/pg-core"

import type {
  AdminEntityDefinition,
  AdminEntityRegistry,
  AdminEntityTablesRegistry,
} from "./admin-entity-types"
import { adminEntityListVirtualSubtractFromBaseRowSql } from "./admin-entity-list-virtual-subtract-sql"

export function buildListVirtualSelectExtras(args: {
  cfg: AdminEntityDefinition
  mainCols: Record<string, PgColumn | undefined>
  tables: AdminEntityTablesRegistry
  entities: AdminEntityRegistry
  fieldsFilter: Set<string> | undefined
  selectExtras: Record<string, PgColumn | SQL>
  slug: string
}): void {
  const { cfg, mainCols, tables, entities, fieldsFilter, selectExtras, slug } =
    args

  for (const col of cfg.columns) {
    const jn = col.listVirtualJunctionLinkedNetMinusMainColumn
    if (!col.list || !col.listVirtual || !jn) continue
    if (fieldsFilter && !fieldsFilter.has(col.key)) continue
    const junctionTable = tables[jn.junctionEntitySlug]
    const relatedTable = tables[jn.relatedEntitySlug]
    if (!junctionTable || !relatedTable) {
      throw new Error(
        `[buildAdminEntityListSqlContext] ${slug}.${col.key}: listVirtualJunctionLinkedNetMinusMainColumn tables missing`,
      )
    }
    const junctionCols = getTableColumns(junctionTable)
    const relatedCols = getTableColumns(relatedTable)
    const mainPk = mainCols[cfg.idColumn.jsonKey] as PgColumn | undefined
    const jParentFk = junctionCols[
      jn.junctionParentFkColumnKey as keyof typeof junctionCols
    ] as PgColumn | undefined
    const jRelatedFk = junctionCols[
      jn.junctionRelatedFkColumnKey as keyof typeof junctionCols
    ] as PgColumn | undefined
    const relPk = relatedCols[
      jn.relatedPkColumnKey as keyof typeof relatedCols
    ] as PgColumn | undefined
    const gross = relatedCols[jn.grossColumnKey as keyof typeof relatedCols] as
      | PgColumn
      | undefined
    const discount = relatedCols[
      jn.discountColumnKey as keyof typeof relatedCols
    ] as PgColumn | undefined
    const ret = relatedCols[
      jn.returnsAllowedColumnKey as keyof typeof relatedCols
    ] as PgColumn | undefined
    const taxes = relatedCols[jn.taxesColumnKey as keyof typeof relatedCols] as
      | PgColumn
      | undefined
    const subtractCol = mainCols[jn.subtractMainColumnKey] as
      | PgColumn
      | undefined
    if (
      !mainPk ||
      !jParentFk ||
      !jRelatedFk ||
      !relPk ||
      !gross ||
      !discount ||
      !ret ||
      !taxes ||
      !subtractCol
    ) {
      throw new Error(
        `[buildAdminEntityListSqlContext] ${slug}.${col.key}: listVirtualJunctionLinkedNetMinusMainColumn column missing`,
      )
    }
    const lineNet = sql`(coalesce(${gross}, 0) - coalesce(${discount}, 0) - coalesce(${ret}, 0) - coalesce(${taxes}, 0))`
    selectExtras[col.key] = sql`(
      SELECT coalesce(sum(${lineNet}), 0)
      FROM ${junctionTable}
      INNER JOIN ${relatedTable} ON ${eq(jRelatedFk, relPk)}
      WHERE ${eq(jParentFk, mainPk)}
    ) - coalesce(${subtractCol}, 0)`.as(col.key) as unknown as SQL
  }

  for (const col of cfg.columns) {
    const jSum = col.listVirtualJunctionLinkedNetSum
    if (!col.list || !col.listVirtual || !jSum) continue
    if (fieldsFilter && !fieldsFilter.has(col.key)) continue
    const junctionTable = tables[jSum.junctionEntitySlug]
    const relatedTable = tables[jSum.relatedEntitySlug]
    if (!junctionTable || !relatedTable) {
      throw new Error(
        `[buildAdminEntityListSqlContext] ${slug}.${col.key}: listVirtualJunctionLinkedNetSum tables missing`,
      )
    }
    const junctionCols = getTableColumns(junctionTable)
    const relatedCols = getTableColumns(relatedTable)
    const mainPk = mainCols[cfg.idColumn.jsonKey] as PgColumn | undefined
    const jParentFk = junctionCols[
      jSum.junctionParentFkColumnKey as keyof typeof junctionCols
    ] as PgColumn | undefined
    const jRelatedFk = junctionCols[
      jSum.junctionRelatedFkColumnKey as keyof typeof junctionCols
    ] as PgColumn | undefined
    const relPk = relatedCols[
      jSum.relatedPkColumnKey as keyof typeof relatedCols
    ] as PgColumn | undefined
    const gross = relatedCols[jSum.grossColumnKey as keyof typeof relatedCols] as
      | PgColumn
      | undefined
    const discount = relatedCols[
      jSum.discountColumnKey as keyof typeof relatedCols
    ] as PgColumn | undefined
    const ret = relatedCols[
      jSum.returnsAllowedColumnKey as keyof typeof relatedCols
    ] as PgColumn | undefined
    const taxes = relatedCols[jSum.taxesColumnKey as keyof typeof relatedCols] as
      | PgColumn
      | undefined
    if (
      !mainPk ||
      !jParentFk ||
      !jRelatedFk ||
      !relPk ||
      !gross ||
      !discount ||
      !ret ||
      !taxes
    ) {
      throw new Error(
        `[buildAdminEntityListSqlContext] ${slug}.${col.key}: listVirtualJunctionLinkedNetSum column missing`,
      )
    }
    const lineNet = sql`(coalesce(${gross}, 0) - coalesce(${discount}, 0) - coalesce(${ret}, 0) - coalesce(${taxes}, 0))`
    selectExtras[col.key] = sql`(
      SELECT coalesce(sum(${lineNet}), 0)
      FROM ${junctionTable}
      INNER JOIN ${relatedTable} ON ${eq(jRelatedFk, relPk)}
      WHERE ${eq(jParentFk, mainPk)}
    )`.as(col.key) as unknown as SQL
  }

  for (const col of cfg.columns) {
    const jPick = col.listVirtualJunctionScalarPick
    if (!col.list || !col.listVirtual || !jPick) continue
    if (fieldsFilter && !fieldsFilter.has(col.key)) continue
    const junctionTable = tables[jPick.junctionEntitySlug]
    if (!junctionTable) {
      throw new Error(
        `[buildAdminEntityListSqlContext] ${slug}.${col.key}: listVirtualJunctionScalarPick junctionEntitySlug missing table`,
      )
    }
    const junctionCols = getTableColumns(junctionTable)
    const mainPk = mainCols[cfg.idColumn.jsonKey] as PgColumn | undefined
    const jParentFk = junctionCols[
      jPick.junctionParentFkColumnKey as keyof typeof junctionCols
    ] as PgColumn | undefined
    if (!mainPk || !jParentFk) {
      throw new Error(
        `[buildAdminEntityListSqlContext] ${slug}.${col.key}: listVirtualJunctionScalarPick parent key column missing`,
      )
    }
    const juncOnly = jPick.junctionSelectColumnKey
    const relSlug = jPick.relatedEntitySlug
    const jRelFkKey = jPick.junctionRelatedFkColumnKey
    const relPickKey = jPick.relatedPickColumnKey
    const modeJunctionOnly =
      juncOnly != null &&
      juncOnly !== "" &&
      (relSlug == null || relSlug === "") &&
      (jRelFkKey == null || jRelFkKey === "") &&
      (relPickKey == null || relPickKey === "")
    const modeViaRelated =
      relSlug != null &&
      relSlug !== "" &&
      jRelFkKey != null &&
      jRelFkKey !== "" &&
      relPickKey != null &&
      relPickKey !== ""
    if (modeJunctionOnly) {
      const jSel = junctionCols[juncOnly as keyof typeof junctionCols] as
        | PgColumn
        | undefined
      if (!jSel) {
        throw new Error(
          `[buildAdminEntityListSqlContext] ${slug}.${col.key}: listVirtualJunctionScalarPick.junctionSelectColumnKey missing on junction`,
        )
      }
      selectExtras[col.key] = sql`(
        SELECT ${jSel}
        FROM ${junctionTable}
        WHERE ${eq(jParentFk, mainPk)}
        LIMIT 1
      )`.as(col.key) as unknown as SQL
      continue
    }
    if (modeViaRelated) {
      const relatedTable = tables[relSlug]
      if (!relatedTable) {
        throw new Error(
          `[buildAdminEntityListSqlContext] ${slug}.${col.key}: listVirtualJunctionScalarPick relatedEntitySlug missing table`,
        )
      }
      const relatedCfg = entities[relSlug] as AdminEntityDefinition
      const relatedCols = getTableColumns(relatedTable)
      const relatedPkKey = relatedCfg.idColumn.jsonKey
      const relPk = relatedCols[relatedPkKey as keyof typeof relatedCols] as
        | PgColumn
        | undefined
      const jRelFk = junctionCols[jRelFkKey as keyof typeof junctionCols] as
        | PgColumn
        | undefined
      const pickCol = relatedCols[relPickKey as keyof typeof relatedCols] as
        | PgColumn
        | undefined
      if (!relPk || !jRelFk || !pickCol) {
        throw new Error(
          `[buildAdminEntityListSqlContext] ${slug}.${col.key}: listVirtualJunctionScalarPick related/junction column missing`,
        )
      }
      selectExtras[col.key] = sql`(
        SELECT ${pickCol}
        FROM ${junctionTable}
        INNER JOIN ${relatedTable} ON ${eq(jRelFk, relPk)}
        WHERE ${eq(jParentFk, mainPk)}
        LIMIT 1
      )`.as(col.key) as unknown as SQL
      continue
    }
    throw new Error(
      `[buildAdminEntityListSqlContext] ${slug}.${col.key}: listVirtualJunctionScalarPick must use junctionSelectColumnKey only, or relatedEntitySlug + junctionRelatedFkColumnKey + relatedPickColumnKey`,
    )
  }

  for (const col of cfg.columns) {
    const childSum = col.listVirtualChildColumnSum
    if (!col.list || !col.listVirtual || !childSum) continue
    if (fieldsFilter && !fieldsFilter.has(col.key)) continue
    const childTable = tables[childSum.childEntitySlug]
    if (!childTable) {
      throw new Error(
        `[buildAdminEntityListSqlContext] ${slug}.${col.key}: listVirtualChildColumnSum childEntitySlug missing table`,
      )
    }
    const childCols = getTableColumns(childTable)
    const mainPk = mainCols[cfg.idColumn.jsonKey] as PgColumn | undefined
    const childFk = childCols[
      childSum.childParentFkColumnKey as keyof typeof childCols
    ] as PgColumn | undefined
    const sumCol = childCols[
      childSum.childSumColumnKey as keyof typeof childCols
    ] as PgColumn | undefined
    if (!mainPk || !childFk || !sumCol) {
      throw new Error(
        `[buildAdminEntityListSqlContext] ${slug}.${col.key}: listVirtualChildColumnSum column missing`,
      )
    }
    selectExtras[col.key] = sql`(
      SELECT coalesce(sum(${sumCol}), 0)
      FROM ${childTable}
      WHERE ${eq(childFk, mainPk)}
    )`.as(col.key) as unknown as SQL
  }

  for (const col of cfg.columns) {
    const pair = col.listYearMonthPair
    if (!col.list || !col.listVirtual || !pair) continue
    if (fieldsFilter && !fieldsFilter.has(col.key)) continue
    const yCol = mainCols[pair.yearColumnKey] as PgColumn | undefined
    const mCol = mainCols[pair.monthColumnKey] as PgColumn | undefined
    if (!yCol || !mCol) {
      throw new Error(
        `[buildAdminEntityListSqlContext] ${slug}.${col.key}: listYearMonthPair columns missing on table`,
      )
    }
    selectExtras[col.key] = sql`${yCol}::text || '-' || lpad(${mCol}::text, 2, '0')`.as(
      col.key,
    ) as unknown as SQL
  }

  for (const col of cfg.columns) {
    const split = col.listVirtualVat12InclusiveSplit
    if (!col.list || !col.listVirtual || !split) continue
    if (fieldsFilter && !fieldsFilter.has(col.key)) continue
    const gCol = mainCols[split.grossColumnKey] as PgColumn | undefined
    if (!gCol) {
      throw new Error(
        `[buildAdminEntityListSqlContext] ${slug}.${col.key}: listVirtualVat12InclusiveSplit.grossColumnKey missing on table`,
      )
    }
    selectExtras[col.key] = (
      split.component === "net"
        ? sql`((${gCol}) / 1.12)`
        : sql`((${gCol}) - ((${gCol}) / 1.12))`
    ).as(col.key) as unknown as SQL
  }

  for (const col of cfg.columns) {
    const prod = col.listVirtualProductOfTwo
    if (!col.list || !col.listVirtual || !prod) continue
    if (fieldsFilter && !fieldsFilter.has(col.key)) continue
    const leftCol = mainCols[prod.leftColumnKey] as PgColumn | undefined
    const rightCol = mainCols[prod.rightColumnKey] as PgColumn | undefined
    if (!leftCol || !rightCol) {
      throw new Error(
        `[buildAdminEntityListSqlContext] ${slug}.${col.key}: listVirtualProductOfTwo column missing on table`,
      )
    }
    selectExtras[col.key] = sql`coalesce(${leftCol}, 0) * coalesce(${rightCol}, 0)`.as(
      col.key,
    ) as unknown as SQL
  }

  for (const col of cfg.columns) {
    const sub = col.listVirtualSubtractFromBase
    if (!col.list || !col.listVirtual || !sub) continue
    if (fieldsFilter && !fieldsFilter.has(col.key)) continue
    const rowExpr = adminEntityListVirtualSubtractFromBaseRowSql(
      mainCols as Record<string, PgColumn>,
      slug,
      col.key,
      sub,
    )
    selectExtras[col.key] = rowExpr.as(col.key) as unknown as SQL
  }

  for (const col of cfg.columns) {
    const ex = col.listVirtualDateExistsInTable
    if (!col.list || !col.listVirtual || !ex) continue
    if (fieldsFilter && !fieldsFilter.has(col.key)) continue
    const dateCol = mainCols[ex.mainDateColumnKey] as PgColumn | undefined
    if (!dateCol) {
      throw new Error(
        `[buildAdminEntityListSqlContext] ${slug}.${col.key}: listVirtualDateExistsInTable.mainDateColumnKey missing on table`,
      )
    }
    selectExtras[col.key] = sql`exists (
      select 1 from ${sql.raw(ex.existsTableFqn)} as _vd
      where _vd.${sql.raw(ex.existsDateColumnName)} = ${dateCol}
    )`.as(col.key) as unknown as SQL
  }

  for (const col of cfg.columns) {
    const dd = col.listVirtualRoundedDayDiffTimestamps
    if (!col.list || !col.listVirtual || !dd) continue
    if (fieldsFilter && !fieldsFilter.has(col.key)) continue
    const endCol = mainCols[dd.endTimestampColumnKey] as PgColumn | undefined
    const startCol = mainCols[dd.startTimestampColumnKey] as
      | PgColumn
      | undefined
    if (!endCol || !startCol) {
      throw new Error(
        `[buildAdminEntityListSqlContext] ${slug}.${col.key}: listVirtualRoundedDayDiffTimestamps column missing on table`,
      )
    }
    selectExtras[col.key] = sql`round(
      (extract(epoch from ${endCol}) - extract(epoch from ${startCol})) / 86400
    )`.as(col.key) as unknown as SQL
  }

  for (const col of cfg.columns) {
    const pd = col.listVirtualPostdatedDaysUntilMaturity
    if (!col.list || !col.listVirtual || !pd) continue
    if (fieldsFilter && !fieldsFilter.has(col.key)) continue
    const maturityCol = mainCols[pd.maturityDateColumnKey] as
      | PgColumn
      | undefined
    const crCol = mainCols[pd.crNumberColumnKey] as PgColumn | undefined
    if (!maturityCol || !crCol) {
      throw new Error(
        `[buildAdminEntityListSqlContext] ${slug}.${col.key}: listVirtualPostdatedDaysUntilMaturity column missing on table`,
      )
    }
    const fqn = pd.paymentsQualifiedName
    const collCol = pd.paymentsCollectionDateColumnName
    const crName = pd.paymentsCrNumberColumnName
    if (!/^[a-z_][a-z0-9_]*\.[a-z_][a-z0-9_]*$/i.test(fqn)) {
      throw new Error(
        `[buildAdminEntityListSqlContext] ${slug}.${col.key}: listVirtualPostdatedDaysUntilMaturity.paymentsQualifiedName invalid`,
      )
    }
    if (!/^[a-z_][a-z0-9_]*$/i.test(collCol) || !/^[a-z_][a-z0-9_]*$/i.test(crName)) {
      throw new Error(
        `[buildAdminEntityListSqlContext] ${slug}.${col.key}: listVirtualPostdatedDaysUntilMaturity payment column names invalid`,
      )
    }
    const manilaToday = sql`(now() at time zone 'Asia/Manila')::date`
    selectExtras[col.key] = sql`CASE
      WHEN (${maturityCol}::date > ${manilaToday})
      THEN (${maturityCol}::date - ${manilaToday})
      ELSE NULL
    END`.as(col.key) as unknown as SQL
  }

  for (const col of cfg.columns) {
    const cc = col.listVirtualConcatNonNull
    if (!col.list || !col.listVirtual || !cc) continue
    if (fieldsFilter && !fieldsFilter.has(col.key)) continue
    const pgCols = cc.columnKeys.map((k) => {
      const c = mainCols[k] as PgColumn | undefined
      if (!c)
        throw new Error(
          `[buildAdminEntityListSqlContext] ${slug}.${col.key}: listVirtualConcatNonNull column "${k}" missing on table`,
        )
      return c
    })
    const arrItems = sql.join(
      pgCols.map((c) => sql`${c}::text`),
      sql`, `,
    )
    selectExtras[col.key] = sql`NULLIF(array_to_string(array_remove(ARRAY[${arrItems}], NULL), ${cc.separator}), '')`.as(
      col.key,
    ) as unknown as SQL
  }
}
