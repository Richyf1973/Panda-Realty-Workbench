import "server-only"

import { eq, getTableColumns, inArray, sql, type SQL } from "drizzle-orm"
import type { PgColumn } from "drizzle-orm/pg-core"
import type { PgTable } from "drizzle-orm/pg-core"

import {
  adminEntityListChildSumIsIntegerTimesPayrollAllowance,
  adminEntityListChildSumIsIntegerTimesPayrollPeriodNumeric,
  adminEntityListChildSumIsProductOfTwoColumns,
  adminEntityListChildSumIsWithJoinFilter,
  type AdminEntityDefinition,
  type AdminEntityQueryServerContext,
  type AdminEntityTablesRegistry,
  type AdminDrizzleDb,
} from "./admin-entity-types"

function slugInEntities(
  entities: Readonly<Record<string, AdminEntityDefinition>>,
  s: string,
): boolean {
  return Object.hasOwn(entities, s)
}

/**
 * Adds correlated `SUM` subqueries for each `columns[].listChildSum` on the entity.
 */
export function appendListChildSumSelectExtras(args: {
  entities: Readonly<Record<string, AdminEntityDefinition>>
  tables: AdminEntityTablesRegistry
  slug: string
  mainTable: PgTable
  selectExtras: Record<string, PgColumn | SQL>
}): void {
  const cfg = args.entities[args.slug]
  if (!cfg) return
  const mainCols = getTableColumns(args.mainTable)
  const idKey = cfg.idColumn.jsonKey
  const mainPk = mainCols[idKey as keyof typeof mainCols] as PgColumn | undefined
  if (!mainPk) return

  for (const col of cfg.columns) {
    if (!col.list || !col.listChildSum) continue
    const s = col.listChildSum
    if (!slugInEntities(args.entities, s.childEntitySlug)) continue
    const childTable = args.tables[s.childEntitySlug]
    if (!childTable) continue
    const childCols = getTableColumns(childTable)
    const fkCol = childCols[
      s.childFkColumnKey as keyof typeof childCols
    ] as PgColumn | undefined
    if (!fkCol) continue

    if (adminEntityListChildSumIsIntegerTimesPayrollAllowance(s)) {
      const payrollTable = args.tables["payrolls"]
      if (!payrollTable) continue
      const payrollCols = getTableColumns(payrollTable)
      const daysCol = childCols[
        s.childIntegerColumnKey as keyof typeof childCols
      ] as PgColumn | undefined
      const allowanceFkCol = childCols[
        s.allowancePayrollFkColumnKey as keyof typeof childCols
      ] as PgColumn | undefined
      const payrollPk = payrollCols.payrollId as PgColumn | undefined
      const payrollGuardFk = payrollCols.guardId as PgColumn | undefined
      const payrollPeriodFk = payrollCols.payrollPeriodId as
        | PgColumn
        | undefined
      if (!daysCol || !allowanceFkCol || !payrollPk || !payrollGuardFk) {
        continue
      }
      const useProrate = s.divideAllowanceByPayrollPeriodDays === true
      const ppTable = useProrate ? args.tables["payroll-periods"] : undefined
      const ppCols = ppTable ? getTableColumns(ppTable) : undefined
      const ppDays = ppCols?.days as PgColumn | undefined
      const ppPeriodPk = ppCols?.payrollPeriodId as PgColumn | undefined
      if (useProrate && (!ppTable || !payrollPeriodFk || !ppDays || !ppPeriodPk)) {
        continue
      }
      const denomSql =
        useProrate && ppDays
          ? sql`nullif(cast(${ppDays} as numeric), 0)`
          : null

      const mult = s.allowanceMultSource ?? "payrollAllowance"
      if (mult === "coveringPayrollGuardAllowance") {
        const guardsTable = args.tables["guards"]
        if (!guardsTable) continue
        const guardCols = getTableColumns(guardsTable)
        const guardAllowance = guardCols.allowance as PgColumn | undefined
        const guardPk = guardCols.guardId as PgColumn | undefined
        if (!guardAllowance || !guardPk) continue
        const lineSum =
          useProrate && denomSql
            ? sql`${daysCol} * (${guardAllowance} / ${denomSql})`
            : sql`${daysCol} * ${guardAllowance}`
        if (useProrate && ppTable && ppPeriodPk && payrollPeriodFk) {
          args.selectExtras[col.key] = sql`(
            SELECT coalesce(sum(${lineSum}), 0)
            FROM ${childTable}
            INNER JOIN ${payrollTable} ON ${eq(payrollPk, allowanceFkCol)}
            INNER JOIN ${guardsTable} ON ${eq(guardPk, payrollGuardFk)}
            INNER JOIN ${ppTable} ON ${eq(ppPeriodPk, payrollPeriodFk)}
            WHERE ${eq(fkCol, mainPk)}
          )`.as(col.key) as unknown as SQL
        } else {
          args.selectExtras[col.key] = sql`(
            SELECT coalesce(sum(${lineSum}), 0)
            FROM ${childTable}
            INNER JOIN ${payrollTable} ON ${eq(payrollPk, allowanceFkCol)}
            INNER JOIN ${guardsTable} ON ${eq(guardPk, payrollGuardFk)}
            WHERE ${eq(fkCol, mainPk)}
          )`.as(col.key) as unknown as SQL
        }
      } else {
        const payrollAllowance = payrollCols.allowance as PgColumn | undefined
        if (!payrollAllowance) continue
        const lineSum =
          useProrate && denomSql
            ? sql`${daysCol} * (${payrollAllowance} / ${denomSql})`
            : sql`${daysCol} * ${payrollAllowance}`
        if (useProrate && ppTable && ppPeriodPk && payrollPeriodFk) {
          args.selectExtras[col.key] = sql`(
            SELECT coalesce(sum(${lineSum}), 0)
            FROM ${childTable}
            INNER JOIN ${payrollTable} ON ${eq(payrollPk, allowanceFkCol)}
            INNER JOIN ${ppTable} ON ${eq(ppPeriodPk, payrollPeriodFk)}
            WHERE ${eq(fkCol, mainPk)}
          )`.as(col.key) as unknown as SQL
        } else {
          args.selectExtras[col.key] = sql`(
            SELECT coalesce(sum(${lineSum}), 0)
            FROM ${childTable}
            INNER JOIN ${payrollTable} ON ${eq(payrollPk, allowanceFkCol)}
            WHERE ${eq(fkCol, mainPk)}
          )`.as(col.key) as unknown as SQL
        }
      }
      continue
    }

    if (adminEntityListChildSumIsIntegerTimesPayrollPeriodNumeric(s)) {
      const payrollTable = args.tables["payrolls"]
      const ppTable = args.tables["payroll-periods"]
      if (!payrollTable || !ppTable) continue
      const payrollCols = getTableColumns(payrollTable)
      const ppCols = getTableColumns(ppTable)
      const daysCol = childCols[
        s.childIntegerColumnKey as keyof typeof childCols
      ] as PgColumn | undefined
      const workerPk = payrollCols.payrollId as PgColumn | undefined
      const payrollPeriodFk = payrollCols.payrollPeriodId as
        | PgColumn
        | undefined
      const ppPeriodPk = ppCols.payrollPeriodId as PgColumn | undefined
      const periodNumericCol = ppCols[
        s.periodNumericColumnKey as keyof typeof ppCols
      ] as PgColumn | undefined
      if (
        !daysCol ||
        !workerPk ||
        !payrollPeriodFk ||
        !ppPeriodPk ||
        !periodNumericCol
      ) {
        continue
      }
      const lineSum = sql`${daysCol} * ${periodNumericCol}`
      args.selectExtras[col.key] = sql`(
        SELECT coalesce(sum(${lineSum}), 0)
        FROM ${childTable}
        INNER JOIN ${payrollTable} ON ${eq(workerPk, fkCol)}
        INNER JOIN ${ppTable} ON ${eq(ppPeriodPk, payrollPeriodFk)}
        WHERE ${eq(fkCol, mainPk)}
      )`.as(col.key) as unknown as SQL
      continue
    }

    if (adminEntityListChildSumIsWithJoinFilter(s)) {
      if (!slugInEntities(args.entities, s.joinEntitySlug)) continue
      const joinTable = args.tables[s.joinEntitySlug]
      if (!joinTable) continue
      const joinCols = getTableColumns(joinTable)
      const childJoinFkCol = childCols[
        s.childJoinFkColumnKey as keyof typeof childCols
      ] as PgColumn | undefined
      const joinPkCol = joinCols[
        s.joinPkColumnKey as keyof typeof joinCols
      ] as PgColumn | undefined
      const joinFilterCol = joinCols[
        s.joinFilterColumnKey as keyof typeof joinCols
      ] as PgColumn | undefined
      const sumCol = childCols[
        s.sumColumnKey as keyof typeof childCols
      ] as PgColumn | undefined
      if (!childJoinFkCol || !joinPkCol || !joinFilterCol || !sumCol) continue
      args.selectExtras[col.key] = sql`(
        SELECT coalesce(sum(${sumCol}), 0)
        FROM ${childTable}
        INNER JOIN ${joinTable} ON ${eq(joinPkCol, childJoinFkCol)}
        WHERE ${eq(fkCol, mainPk)}
          AND ${joinFilterCol} = ${s.filterValue}
      )`.as(col.key) as unknown as SQL
      continue
    }

    if (adminEntityListChildSumIsProductOfTwoColumns(s)) {
      const leftCol = childCols[
        s.leftColumnKey as keyof typeof childCols
      ] as PgColumn | undefined
      const rightCol = childCols[
        s.rightColumnKey as keyof typeof childCols
      ] as PgColumn | undefined
      if (!leftCol || !rightCol) continue
      args.selectExtras[col.key] = sql`(
        SELECT coalesce(sum(${leftCol} * ${rightCol}), 0)
        FROM ${childTable}
        WHERE ${eq(fkCol, mainPk)}
      )`.as(col.key) as unknown as SQL
      continue
    }

    const sumCol = childCols[
      s.sumColumnKey as keyof typeof childCols
    ] as PgColumn | undefined
    if (!sumCol) continue
    args.selectExtras[col.key] = sql`(
      SELECT coalesce(sum(${sumCol}), 0)
      FROM ${childTable}
      WHERE ${eq(fkCol, mainPk)}
    )`.as(col.key) as unknown as SQL
  }
}

function coalesceSumToNumber(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v)
    if (Number.isFinite(n)) return n
  }
  return 0
}

/**
 * Batch-loads `listChildSum` values and merges them into raw rows before `stripAdminEntityApiRow`.
 */
export async function mergeListChildSumsIntoRows(
  ctx: Pick<AdminEntityQueryServerContext, "entities" | "tables">,
  slug: string,
  rows: Record<string, unknown>[],
  exec: AdminDrizzleDb,
): Promise<Record<string, unknown>[]> {
  const cfg = ctx.entities[slug] as AdminEntityDefinition | undefined
  if (!cfg || rows.length === 0) return rows

  const sumSpecs = cfg.columns.filter((c) => c.list && c.listChildSum)
  if (sumSpecs.length === 0) return rows

  const idKey = cfg.idColumn.jsonKey
  const idVT = cfg.idColumn.valueType

  const normalizeId = (raw: unknown): string | number | null => {
    if (raw == null || raw === "") return null
    if (idVT === "integer") {
      const n = Number(raw)
      return Number.isFinite(n) ? n : null
    }
    return String(raw)
  }

  let out = rows.map((r) => ({ ...r }))

  for (const col of sumSpecs) {
    const s = col.listChildSum!
    if (!slugInEntities(ctx.entities, s.childEntitySlug)) continue
    const childTable = ctx.tables[s.childEntitySlug]
    if (!childTable) continue
    const childCols = getTableColumns(childTable)
    const fkCol = childCols[
      s.childFkColumnKey as keyof typeof childCols
    ] as PgColumn | undefined
    if (!fkCol) continue

    const ids = [
      ...new Set(
        out
          .map((r) => normalizeId(r[idKey]))
          .filter((v): v is string | number => v != null),
      ),
    ]
    if (ids.length === 0) continue

    let aggRows: { fk: unknown; total: unknown }[]

    if (adminEntityListChildSumIsIntegerTimesPayrollAllowance(s)) {
      const payrollTable = ctx.tables["payrolls"]
      if (!payrollTable) continue
      const payrollCols = getTableColumns(payrollTable)
      const daysCol = childCols[
        s.childIntegerColumnKey as keyof typeof childCols
      ] as PgColumn | undefined
      const allowanceFkCol = childCols[
        s.allowancePayrollFkColumnKey as keyof typeof childCols
      ] as PgColumn | undefined
      const payrollPk = payrollCols.payrollId as PgColumn | undefined
      const payrollGuardFk = payrollCols.guardId as PgColumn | undefined
      const payrollPeriodFk = payrollCols.payrollPeriodId as
        | PgColumn
        | undefined
      if (!daysCol || !allowanceFkCol || !payrollPk || !payrollGuardFk) {
        continue
      }
      const useProrate = s.divideAllowanceByPayrollPeriodDays === true
      const ppTable = useProrate ? ctx.tables["payroll-periods"] : undefined
      const ppCols = ppTable ? getTableColumns(ppTable) : undefined
      const ppDays = ppCols?.days as PgColumn | undefined
      const ppPeriodPk = ppCols?.payrollPeriodId as PgColumn | undefined
      if (useProrate && (!ppTable || !payrollPeriodFk || !ppDays || !ppPeriodPk)) {
        continue
      }
      const denomSql =
        useProrate && ppDays
          ? sql`nullif(cast(${ppDays} as numeric), 0)`
          : null

      const mult = s.allowanceMultSource ?? "payrollAllowance"
      if (mult === "coveringPayrollGuardAllowance") {
        const guardsTable = ctx.tables["guards"]
        if (!guardsTable) continue
        const guardCols = getTableColumns(guardsTable)
        const guardAllowance = guardCols.allowance as PgColumn | undefined
        const guardPk = guardCols.guardId as PgColumn | undefined
        if (!guardAllowance || !guardPk) continue
        const lineSum =
          useProrate && denomSql
            ? sql`${daysCol} * (${guardAllowance} / ${denomSql})`
            : sql`${daysCol} * ${guardAllowance}`
        let q = exec
          .select({
            fk: fkCol,
            total: sql`coalesce(sum(${lineSum}), 0)`.as("total"),
          })
          .from(childTable)
          .innerJoin(payrollTable, eq(payrollPk, allowanceFkCol))
          .innerJoin(guardsTable, eq(guardPk, payrollGuardFk))
        if (useProrate && ppTable && ppPeriodPk && payrollPeriodFk) {
          q = q.innerJoin(ppTable, eq(ppPeriodPk, payrollPeriodFk))
        }
        aggRows = await q
          .where(inArray(fkCol, ids as never))
          .groupBy(fkCol)
      } else {
        const payrollAllowance = payrollCols.allowance as PgColumn | undefined
        if (!payrollAllowance) continue
        const lineSum =
          useProrate && denomSql
            ? sql`${daysCol} * (${payrollAllowance} / ${denomSql})`
            : sql`${daysCol} * ${payrollAllowance}`
        let q = exec
          .select({
            fk: fkCol,
            total: sql`coalesce(sum(${lineSum}), 0)`.as("total"),
          })
          .from(childTable)
          .innerJoin(payrollTable, eq(payrollPk, allowanceFkCol))
        if (useProrate && ppTable && ppPeriodPk && payrollPeriodFk) {
          q = q.innerJoin(ppTable, eq(ppPeriodPk, payrollPeriodFk))
        }
        aggRows = await q
          .where(inArray(fkCol, ids as never))
          .groupBy(fkCol)
      }
    } else if (adminEntityListChildSumIsIntegerTimesPayrollPeriodNumeric(s)) {
      const payrollTable = ctx.tables["payrolls"]
      const ppTable = ctx.tables["payroll-periods"]
      if (!payrollTable || !ppTable) continue
      const payrollCols = getTableColumns(payrollTable)
      const ppCols = getTableColumns(ppTable)
      const daysCol = childCols[
        s.childIntegerColumnKey as keyof typeof childCols
      ] as PgColumn | undefined
      const workerPk = payrollCols.payrollId as PgColumn | undefined
      const payrollPeriodFk = payrollCols.payrollPeriodId as
        | PgColumn
        | undefined
      const ppPeriodPk = ppCols.payrollPeriodId as PgColumn | undefined
      const periodNumericCol = ppCols[
        s.periodNumericColumnKey as keyof typeof ppCols
      ] as PgColumn | undefined
      if (
        !daysCol ||
        !workerPk ||
        !payrollPeriodFk ||
        !ppPeriodPk ||
        !periodNumericCol
      ) {
        continue
      }
      const lineSum = sql`${daysCol} * ${periodNumericCol}`
      aggRows = await exec
        .select({
          fk: fkCol,
          total: sql`coalesce(sum(${lineSum}), 0)`.as("total"),
        })
        .from(childTable)
        .innerJoin(payrollTable, eq(workerPk, fkCol))
        .innerJoin(ppTable, eq(ppPeriodPk, payrollPeriodFk))
        .where(inArray(fkCol, ids as never))
        .groupBy(fkCol)
    } else if (adminEntityListChildSumIsWithJoinFilter(s)) {
      if (!slugInEntities(ctx.entities, s.joinEntitySlug)) continue
      const joinTable = ctx.tables[s.joinEntitySlug]
      if (!joinTable) continue
      const joinCols = getTableColumns(joinTable)
      const childJoinFkCol = childCols[
        s.childJoinFkColumnKey as keyof typeof childCols
      ] as PgColumn | undefined
      const joinPkCol = joinCols[
        s.joinPkColumnKey as keyof typeof joinCols
      ] as PgColumn | undefined
      const joinFilterCol = joinCols[
        s.joinFilterColumnKey as keyof typeof joinCols
      ] as PgColumn | undefined
      const sumCol = childCols[
        s.sumColumnKey as keyof typeof childCols
      ] as PgColumn | undefined
      if (!childJoinFkCol || !joinPkCol || !joinFilterCol || !sumCol) continue
      aggRows = await exec
        .select({
          fk: fkCol,
          total: sql`coalesce(sum(${sumCol}), 0)`.as("total"),
        })
        .from(childTable)
        .innerJoin(joinTable, eq(joinPkCol, childJoinFkCol))
        .where(
          sql`${inArray(fkCol, ids as never)} AND ${joinFilterCol} = ${s.filterValue}`,
        )
        .groupBy(fkCol)
    } else if (adminEntityListChildSumIsProductOfTwoColumns(s)) {
      const leftCol = childCols[
        s.leftColumnKey as keyof typeof childCols
      ] as PgColumn | undefined
      const rightCol = childCols[
        s.rightColumnKey as keyof typeof childCols
      ] as PgColumn | undefined
      if (!leftCol || !rightCol) continue
      aggRows = await exec
        .select({
          fk: fkCol,
          total: sql`coalesce(sum(${leftCol} * ${rightCol}), 0)`.as("total"),
        })
        .from(childTable)
        .where(inArray(fkCol, ids as never))
        .groupBy(fkCol)
    } else {
      const sumCol = childCols[
        s.sumColumnKey as keyof typeof childCols
      ] as PgColumn | undefined
      if (!sumCol) continue
      aggRows = await exec
        .select({
          fk: fkCol,
          total: sql`coalesce(sum(${sumCol}), 0)`.as("total"),
        })
        .from(childTable)
        .where(inArray(fkCol, ids as never))
        .groupBy(fkCol)
    }

    const totals = new Map<string | number, number>()
    for (const ar of aggRows) {
      const k = normalizeId(ar.fk)
      if (k == null) continue
      totals.set(k, coalesceSumToNumber(ar.total))
    }

    out = out.map((r) => {
      const kid = normalizeId(r[idKey])
      const t = kid != null ? (totals.get(kid) ?? 0) : 0
      return { ...r, [col.key]: t }
    })
  }

  return out
}
