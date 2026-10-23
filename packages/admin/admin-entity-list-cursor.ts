import "server-only"

import { and, asc, desc, or, sql, type SQL } from "drizzle-orm"

import type {
  AdminEntityDefinition,
  AdminEntityListServerContext,
  AdminValueType,
  ListOrderSpec,
} from "./admin-entity-types"
import type { ListOrderExpr } from "./admin-entity-list-sql-context"

function normalizeCursorPart(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString()
  return value
}

export function encodeAdminEntityCursor(values: unknown[]): string {
  const v = values.map(normalizeCursorPart)
  return Buffer.from(JSON.stringify({ v }), "utf8").toString("base64url")
}

export function decodeAdminEntityCursor(encoded: string): unknown[] | null {
  try {
    const raw = Buffer.from(encoded, "base64url").toString("utf8")
    const parsed = JSON.parse(raw) as { v?: unknown }
    if (!Array.isArray(parsed.v)) return null
    return parsed.v
  } catch {
    return null
  }
}

export function forwardOrderBy(orderParts: ListOrderExpr[]) {
  return orderParts.map(({ expr, direction }) =>
    direction === "asc" ? asc(expr as never) : desc(expr as never),
  )
}

export function backwardScanOrderBy(orderParts: ListOrderExpr[]) {
  return orderParts.map(({ expr, direction }) =>
    direction === "asc" ? desc(expr as never) : asc(expr as never),
  )
}

/** Cursor predicates: `expr` may be a base column or a relation label `SQL` fragment. */
function orderExprEq(expr: ListOrderExpr["expr"], v: unknown): SQL {
  return sql`${expr} = ${v}`
}

function orderExprGt(expr: ListOrderExpr["expr"], v: unknown): SQL {
  return sql`${expr} > ${v}`
}

function orderExprLt(expr: ListOrderExpr["expr"], v: unknown): SQL {
  return sql`${expr} < ${v}`
}

function coerceByValueType(
  raw: unknown,
  valueType: AdminValueType,
  listSortAsNumeric?: boolean,
): unknown {
  if (listSortAsNumeric === true) {
    if (raw == null) return null
    const n =
      typeof raw === "number"
        ? raw
        : Number(String(raw).trim().replaceAll(/\s+/g, ""))
    return Number.isFinite(n) ? n : raw
  }
  switch (valueType) {
    case "integer":
      return typeof raw === "number" ? raw : Number(raw)
    case "numeric":
      return raw == null ? raw : String(raw)
    case "uuid":
    case "text":
      return raw == null ? raw : String(raw)
    case "timestamp":
      if (raw == null) return null
      if (typeof raw === "string") return raw
      if (raw instanceof Date) return raw.toISOString()
      return String(raw)
    case "boolean":
      return raw
    default:
      return raw
  }
}

export function sortStrictlyAfter(
  orderParts: ListOrderExpr[],
  values: unknown[],
): SQL {
  const branches: SQL[] = []
  for (let i = 0; i < orderParts.length; i++) {
    const parts: SQL[] = []
    for (let j = 0; j < i; j++) {
      parts.push(orderExprEq(orderParts[j]!.expr, values[j]))
    }
    const { expr, direction } = orderParts[i]!
    const v = values[i]
    parts.push(
      direction === "asc" ? orderExprGt(expr, v) : orderExprLt(expr, v),
    )
    branches.push(and(...parts)!)
  }
  return branches.length === 1 ? branches[0]! : or(...branches)!
}

export function sortStrictlyBefore(
  orderParts: ListOrderExpr[],
  values: unknown[],
): SQL {
  const branches: SQL[] = []
  for (let i = 0; i < orderParts.length; i++) {
    const parts: SQL[] = []
    for (let j = 0; j < i; j++) {
      parts.push(orderExprEq(orderParts[j]!.expr, values[j]))
    }
    const { expr, direction } = orderParts[i]!
    const v = values[i]
    parts.push(
      direction === "asc" ? orderExprLt(expr, v) : orderExprGt(expr, v),
    )
    branches.push(and(...parts)!)
  }
  return branches.length === 1 ? branches[0]! : or(...branches)!
}

function coerceBoundaryValue(
  entities: AdminEntityListServerContext["entities"],
  slug: string,
  columnKey: string,
  raw: unknown,
): unknown {
  const cfg = entities[slug] as AdminEntityDefinition
  const meta = cfg.columns.find((c) => c.key === columnKey)
  if (meta?.listRelation) {
    const relSortKey = meta.listRelation.orderByRelatedColumnKey
    if (relSortKey != null && meta.listRelation.listCellShow !== "storedFk") {
      const relCfg = entities[meta.listRelation.relatedEntitySlug] as
        | AdminEntityDefinition
        | undefined
      const relCol = relCfg?.columns.find((c) => c.key === relSortKey)
      if (relCol) {
        return coerceByValueType(raw, relCol.valueType, relCol.listSortAsNumeric)
      }
    }
    if (meta.listRelation.listCellShow !== "storedFk") {
      if (raw == null) return ""
      return String(raw)
    }
  }
  if (!meta) return raw
  return coerceByValueType(raw, meta.valueType as AdminValueType, meta.listSortAsNumeric)
}

export function coerceBoundaryRow(
  entities: AdminEntityListServerContext["entities"],
  slug: string,
  specs: ListOrderSpec[],
  raw: unknown[],
): unknown[] | null {
  if (raw.length !== specs.length) return null
  return specs.map((s, i) =>
    coerceBoundaryValue(entities, slug, s.columnKey, raw[i]),
  )
}

export function rowToCursorValues(
  entities: AdminEntityListServerContext["entities"],
  slug: string,
  row: Record<string, unknown>,
  specs: ListOrderSpec[],
): unknown[] {
  const cfg = entities[slug] as AdminEntityDefinition
  return specs.map((s) => {
    const meta = cfg.columns.find((c) => c.key === s.columnKey)
    const useRelationLabelCursor =
      meta?.listRelation != null &&
      meta.listRelation.listCellShow !== "storedFk"
    const jsonKey = useRelationLabelCursor ? `_cursor_${s.columnKey}` : s.columnKey
    return normalizeCursorPart(row[jsonKey])
  })
}
