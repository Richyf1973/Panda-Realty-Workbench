import type { AdminEntityListAppendWhereHintFilter } from "./admin-entity-types"
import type { AdminEntityListRelationFilterRow } from "./components/admin/admin-entity-list-relation-filter-row"

export type ListBooleanFilterSegment = "all" | "true" | "false"

export type AdminEntityListFilterSummaryInput = {
  listSearchEnabled?: boolean
  listSearchValue?: string
  listSearchPlaceholder?: string
  listBooleanFilterEnabled?: boolean
  listBooleanFilterSegment?: ListBooleanFilterSegment
  listBooleanFilterLabels?: { all: string; true: string; false: string }
  listBooleanFilterGroupLabel?: string
  listAppendWhereHintFilterEnabled?: boolean
  listAppendWhereHintSpecs?: readonly AdminEntityListAppendWhereHintFilter[]
  listAppendWhereHintSegments?: Record<string, string>
  listYearMonthFilterEnabled?: boolean
  listYearMonthFilterLabel?: string
  listYearMonthFilterValue?: string
  listYearMonthFilterAllowAll?: boolean
  listYearMonthFilterOptions?: { value: string; label: string }[]
  listDateRangeFilterEnabled?: boolean
  listDateRangeFilterRows?: readonly {
    columnKey: string
    label: string
    from: string
    to: string
  }[]
  listRelationFilterRows?: readonly AdminEntityListRelationFilterRow[]
}

function parseIsoToLocalDate(iso: string): Date | undefined {
  const t = iso.trim()
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t)
  if (!m) return undefined
  const y = Number(m[1])
  const mo = Number(m[2]) - 1
  const d = Number(m[3])
  const dt = new Date(y, mo, d)
  if (
    dt.getFullYear() !== y ||
    dt.getMonth() !== mo ||
    dt.getDate() !== d
  ) {
    return undefined
  }
  return dt
}

function formatShortIso(iso: string): string {
  const dt = parseIsoToLocalDate(iso)
  if (!dt) return iso.trim() || "—"
  return dt.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function dateRangeSummaryLabel(
  from: string,
  to: string,
): { label: string; isActive: boolean } {
  const f = from.trim()
  const t = to.trim()
  if (f === "" && t === "") {
    return { label: "All dates", isActive: false }
  }
  if (f !== "" && t !== "") {
    if (f === t) {
      return { label: formatShortIso(f), isActive: true }
    }
    return {
      label: `${formatShortIso(f)} – ${formatShortIso(t)}`,
      isActive: true,
    }
  }
  if (f !== "") {
    return { label: `From ${formatShortIso(f)}`, isActive: true }
  }
  return { label: `Until ${formatShortIso(t)}`, isActive: true }
}

function relationRowSummary(row: AdminEntityListRelationFilterRow): {
  label: string
  isActive: boolean
} {
  if (row.multiSelect) {
    if (row.selectedValues.length === 0) {
      return { label: "All", isActive: false }
    }
    const labels = row.selectedValues.map((v) => {
      const o = row.options.find((x) => x.value === v)
      return o?.label ?? v
    })
    return { label: labels.join(", "), isActive: true }
  }
  const v = row.value.trim()
  if (v === "") {
    return { label: "All", isActive: false }
  }
  const o = row.options.find((x) => x.value === v)
  return { label: o?.label ?? v, isActive: true }
}

export type AdminEntityListFilterSummaryLine = {
  groupLabel: string
  valueLabel: string
  /** True when this filter restricts rows (not “all”). */
  isActive: boolean
}

/**
 * Human-readable lines for the current list filter state (mobile summary + dialog context).
 */
export function buildAdminEntityListFilterSummaryLines(
  input: AdminEntityListFilterSummaryInput,
): readonly AdminEntityListFilterSummaryLine[] {
  const lines: AdminEntityListFilterSummaryLine[] = []

  if (input.listSearchEnabled) {
    const q = (input.listSearchValue ?? "").trim()
    lines.push({
      /** Placeholder belongs on the search input only; a long hint here overflows narrow summaries. */
      groupLabel: "Search",
      valueLabel: q === "" ? "Any" : q,
      isActive: q !== "",
    })
  }

  if (
    input.listBooleanFilterEnabled &&
    input.listBooleanFilterLabels &&
    input.listBooleanFilterGroupLabel
  ) {
    const seg = input.listBooleanFilterSegment ?? "all"
    const label =
      seg === "all"
        ? input.listBooleanFilterLabels.all
        : seg === "true"
          ? input.listBooleanFilterLabels.true
          : input.listBooleanFilterLabels.false
    lines.push({
      groupLabel: input.listBooleanFilterGroupLabel,
      valueLabel: label,
      isActive: seg !== "all",
    })
  }

  if (
    input.listAppendWhereHintFilterEnabled &&
    input.listAppendWhereHintSpecs &&
    input.listAppendWhereHintSegments &&
    input.listAppendWhereHintSpecs.length > 0
  ) {
    for (const spec of input.listAppendWhereHintSpecs) {
      const param = spec.queryParam.trim()
      if (param === "") continue
      const segment = (input.listAppendWhereHintSegments[param] ?? "").trim()
      const isAll = segment === ""
      const opt = spec.options.find((o) => o.value === segment)
      lines.push({
        groupLabel: spec.groupLabel,
        valueLabel: isAll ? spec.allLabel : (opt?.label ?? segment),
        isActive: !isAll,
      })
    }
  }

  if (
    input.listYearMonthFilterEnabled &&
    input.listYearMonthFilterLabel &&
    input.listYearMonthFilterValue !== undefined
  ) {
    const v = input.listYearMonthFilterValue
    const isAll = v === "__all__" || v === ""
    let valueLabel = "All periods"
    if (!isAll && input.listYearMonthFilterOptions) {
      const opt = input.listYearMonthFilterOptions.find((o) => o.value === v)
      valueLabel = opt?.label ?? v
    }
    lines.push({
      groupLabel: input.listYearMonthFilterLabel,
      valueLabel,
      isActive: !isAll,
    })
  }

  if (input.listDateRangeFilterEnabled && input.listDateRangeFilterRows) {
    for (const row of input.listDateRangeFilterRows) {
      const { label, isActive } = dateRangeSummaryLabel(row.from, row.to)
      lines.push({
        groupLabel: row.label,
        valueLabel: label,
        isActive,
      })
    }
  }

  if (input.listRelationFilterRows) {
    for (const row of input.listRelationFilterRows) {
      const { label, isActive } = relationRowSummary(row)
      lines.push({
        groupLabel: row.columnLabel,
        valueLabel: label,
        isActive,
      })
    }
  }

  return lines
}
