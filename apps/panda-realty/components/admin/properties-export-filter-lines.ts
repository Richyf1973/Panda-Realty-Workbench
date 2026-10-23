import { pandaPropertiesEntity } from "@/lib/admin/entities/pandaProperties"

export type FilterLine = { label: string; value: string }

export function buildFilterSummaryLines(search: string): FilterLine[] {
  const params = new URLSearchParams(search)
  const lines: FilterLine[] = []

  const q = params.get("search")?.trim()
  if (q) lines.push({ label: "Search", value: q })

  const fav = params.get("isFavorite")
  if (fav === "true") lines.push({ label: "Favorite", value: "Favorites only" })
  else if (fav === "false") lines.push({ label: "Favorite", value: "Non-favorites only" })

  const statusRaw = params.get("propertyStatusId")?.trim()
  if (statusRaw) lines.push({ label: "Status IDs", value: statusRaw.replace(/,/g, ", ") })

  for (const spec of pandaPropertiesEntity.listAppendWhereHintFilters) {
    const val = params.get(spec.queryParam)?.trim()
    if (!val) continue
    const displayVal = val
      .replace(/\|\|/g, " / ")
      .replace(/\|/g, " – ")
      .replace(/,/g, ", ")
    lines.push({ label: spec.groupLabel, value: displayVal })
  }

  return lines
}
