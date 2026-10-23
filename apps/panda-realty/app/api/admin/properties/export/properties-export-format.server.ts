import "server-only"

import { getTableColumns } from "drizzle-orm"

import { pandaProperties } from "@/db/schema"
import { pandaPropertiesEntity } from "@/lib/admin/entities/pandaProperties"
import { formatDateDdMmYyyyCompact } from "@/lib/format-date-ddmmyyyy-compact"

export const EXPORT_MAX = 5000

export const SCHEMA_COLUMN_KEYS = new Set(Object.keys(getTableColumns(pandaProperties)))

export const ENTITY_COLUMN_LABELS: Record<string, string> = Object.fromEntries(
  pandaPropertiesEntity.columns.map((c) => [c.key, c.label]),
)

export function buildFilterSummaryRow(url: URL, rowCount: number): [string] {
  const parts: string[] = []

  const now = new Date()
  const dateStr = formatDateDdMmYyyyCompact(now)
  const timeStr = now.toLocaleTimeString("en-AU", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
  parts.push(`Exported: ${dateStr} ${timeStr}`)

  const search = url.searchParams.get("search")?.trim()
  if (search) parts.push(`Search: ${search}`)

  const favParam = url.searchParams.get("isFavorite")
  if (favParam === "true") parts.push("Favorite: Favorites only")
  else if (favParam === "false") parts.push("Favorite: Non-favorites only")

  const statusRaw = url.searchParams.get("propertyStatusId")?.trim()
  if (statusRaw) parts.push(`Status IDs: ${statusRaw.replace(/,/g, ", ")}`)

  for (const spec of pandaPropertiesEntity.listAppendWhereHintFilters) {
    const val = url.searchParams.get(spec.queryParam)?.trim()
    if (!val) continue
    const displayVal = val
      .replace(/\|\|/g, " / ")
      .replace(/\|/g, " – ")
      .replace(/,/g, ", ")
    parts.push(`${spec.groupLabel}: ${displayVal}`)
  }

  parts.push(`Total rows: ${rowCount}`)

  return [parts.join("  |  ")]
}

export function serializeValue(val: unknown): string | number {
  if (val === null || val === undefined) return ""
  if (typeof val === "boolean") return val ? "Yes" : "No"
  if (val instanceof Date) {
    return formatDateDdMmYyyyCompact(val)
  }
  if (typeof val === "number") return val
  return String(val)
}
