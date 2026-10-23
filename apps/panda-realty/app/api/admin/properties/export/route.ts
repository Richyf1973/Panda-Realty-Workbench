import "server-only"

import * as XLSX from "xlsx"
import { NextResponse } from "next/server"
import { and, count, desc, eq, getTableColumns, inArray } from "drizzle-orm"
import type { SQL } from "drizzle-orm"

import { adminJsonError } from "@repo/admin/admin-api"
import { parseAdminEntityBooleanListFilter } from "@repo/admin/admin-entity-list-boolean-filter-parse-server"
import { parseAdminEntityRelationListFilters } from "@repo/admin/admin-entity-list-relation-filter-parse-server"
import { adminEntityListAppendWhereHintsFromSearchParams } from "@repo/admin/admin-entity-admin-list-fetch"
import { buildAdminEntityListSearchSql } from "@repo/admin/admin-entity-list-search-sql"

import { getSessionUser } from "@/lib/auth/session"
import { db } from "@/db"
import { pandaProperties } from "@/db/schema"
import { adminEntities } from "@/lib/admin/admin-entities-bundled"
import { adminEntityListContextCore } from "@/lib/admin/admin-server-context"
import { pandaPropertiesAppendListWhere } from "@/lib/admin/panda-properties-list-append-where.server"
import { formatDateDdMmYyyyCompact } from "@/lib/format-date-ddmmyyyy-compact"

import {
  buildFilterSummaryRow,
  ENTITY_COLUMN_LABELS,
  EXPORT_MAX,
  SCHEMA_COLUMN_KEYS,
  serializeValue,
} from "./properties-export-format.server"
import { renderPropertiesExportPdf } from "./properties-export-pdf.server"

export async function GET(request: Request) {
  const user = await getSessionUser()
  if (!user) return adminJsonError("Unauthorized", 401)

  const url = new URL(request.url)
  const countOnly = url.searchParams.get("countOnly") === "true"

  const booleanFilterValue = parseAdminEntityBooleanListFilter(
    adminEntities,
    "properties",
    url.searchParams,
  )
  const booleanWhere: SQL | undefined =
    booleanFilterValue !== undefined
      ? eq(pandaProperties.isFavorite, booleanFilterValue)
      : undefined

  const { api: relationFilterValues } = parseAdminEntityRelationListFilters(
    adminEntities,
    "properties",
    url.searchParams,
  )
  let relationWhere: SQL | undefined
  const statusIds = relationFilterValues["propertyStatusId"]
  if (statusIds !== undefined) {
    const arr = Array.isArray(statusIds) ? statusIds : [statusIds]
    const nums = arr.filter((v): v is number => typeof v === "number")
    if (nums.length === 1) {
      relationWhere = eq(pandaProperties.propertyStatusId, nums[0]!)
    } else if (nums.length > 1) {
      relationWhere = inArray(pandaProperties.propertyStatusId, nums)
    }
  }

  const baseHints = adminEntityListAppendWhereHintsFromSearchParams(
    adminEntities["properties"],
    url.searchParams,
  )
  const rawStreetFilter = url.searchParams.get("streetFilter")?.trim() ?? ""
  const appendListWhereHints = rawStreetFilter
    ? { ...baseHints, streetFilter: rawStreetFilter }
    : baseHints

  const appendWhere = pandaPropertiesAppendListWhere({
    db,
    slug: "properties",
    table: pandaProperties,
    relationFilterValues,
    appendListWhereHints:
      Object.keys(appendListWhereHints).length > 0 ? appendListWhereHints : undefined,
    dateRangeFilters: undefined,
  })

  const searchTrimmed = (url.searchParams.get("search") ?? "").trim()
  const searchWhere = searchTrimmed
    ? buildAdminEntityListSearchSql(
        { ...adminEntityListContextCore, db },
        "properties",
        searchTrimmed,
      )
    : undefined

  const whereClause = and(booleanWhere, relationWhere, appendWhere, searchWhere)

  if (countOnly) {
    const [result] = await db
      .select({ value: count() })
      .from(pandaProperties)
      .where(whereClause)
    return NextResponse.json({ count: result?.value ?? 0 })
  }

  const rawColumns = url.searchParams.get("columns")?.trim()
  const requestedKeys = rawColumns
    ? rawColumns.split(",").map((k) => k.trim()).filter(Boolean)
    : null

  const allSchemaKeys = [...SCHEMA_COLUMN_KEYS]
  const selectedKeys =
    requestedKeys != null
      ? requestedKeys.filter((k) => SCHEMA_COLUMN_KEYS.has(k))
      : allSchemaKeys

  if (selectedKeys.length === 0) {
    return adminJsonError("No valid columns requested", 400)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const schemaCols = getTableColumns(pandaProperties) as Record<string, any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const selectShape: any = Object.fromEntries(
    selectedKeys.map((k) => [k, schemaCols[k]]),
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: Record<string, unknown>[] = await (db as any)
    .select(selectShape)
    .from(pandaProperties)
    .where(whereClause)
    .orderBy(desc(pandaProperties.updatedAt), desc(pandaProperties.propertyListId))
    .limit(EXPORT_MAX)

  const columnHeaders = selectedKeys.map((k) => ENTITY_COLUMN_LABELS[k] ?? k)
  const filterSummaryRow = buildFilterSummaryRow(url, rows.length)
  const dataRows = rows.map((row) => selectedKeys.map((k) => serializeValue(row[k])))
  const format = url.searchParams.get("format") === "pdf" ? "pdf" : "xlsx"
  const date = formatDateDdMmYyyyCompact(new Date())

  if (format === "xlsx") {
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet([filterSummaryRow, columnHeaders, ...dataRows])
    ws["!cols"] = selectedKeys.map(() => ({ wch: 20 }))
    XLSX.utils.book_append_sheet(wb, ws, "Properties")

    const buffer: Buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="properties-export-${date}.xlsx"`,
      },
    })
  }

  const pdfArrayBuffer = renderPropertiesExportPdf({
    filterSummaryRow,
    columnHeaders,
    dataRows,
    selectedKeys,
  })

  return new NextResponse(new Uint8Array(pdfArrayBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="properties-export-${date}.pdf"`,
    },
  })
}
