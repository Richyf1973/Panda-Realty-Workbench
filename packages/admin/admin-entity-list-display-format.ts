import { cellString } from "./admin-entity-admin-cell"
import {
  adminEntityDateStringYmdToMdy,
  formatAdminEntityDateStringYmdForDisplay,
} from "./admin-entity-crud-date-string-form"
import { formatAdminEntityYearMonthPeriodLabel } from "./admin-entity-list-year-month-period-parse"
import {
  formatAdminEntitySignedDayCountLabel,
  parseAdminEntityListDayCountInteger,
} from "./admin-entity-list-day-count-label"
import { formatAdminEntityNumericListCell } from "./admin-entity-list-numeric-format"
import type { AdminEntityColumn } from "./admin-entity-types"

type ParsedDate = { date: Date } | { fallback: string } | null

function parseRawToDate(raw: unknown): ParsedDate {
  if (raw == null || raw === "") return null
  if (raw instanceof Date) {
    return Number.isNaN(raw.getTime()) ? { fallback: cellString(raw) } : { date: raw }
  }
  if (typeof raw === "number" && Number.isFinite(raw)) {
    const d = new Date(raw)
    return Number.isNaN(d.getTime()) ? { fallback: cellString(raw) } : { date: d }
  }
  if (typeof raw === "string") {
    const t = raw.trim()
    if (t === "") return null
    const d = new Date(t)
    return Number.isNaN(d.getTime()) ? { fallback: t } : { date: d }
  }
  return { fallback: cellString(raw) }
}

/**
 * Format a `valueType: "timestamp"` for list/delete-label display like the calendar button:
 * **`Mar 1, 2026`** using the **UTC** calendar date (matches values stored as `…T00:00:00.000Z`).
 */
export function formatAdminEntityTimestampListDateUsUtc(raw: unknown): string {
  const parsed = parseRawToDate(raw)
  if (parsed === null) return ""
  if ("fallback" in parsed) return parsed.fallback
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(parsed.date)
}

/**
 * Format a `valueType: "timestamp"` for list/delete-label / calendar-button display as **`DD/MM/YYYY`**
 * using the **UTC** calendar date (matches values stored as `…T00:00:00.000Z`).
 */
export function formatAdminEntityTimestampListDmyUtc(raw: unknown): string {
  const parsed = parseRawToDate(raw)
  if (parsed === null) return ""
  if ("fallback" in parsed) return parsed.fallback
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(parsed.date)
}

/**
 * Format a `valueType: "timestamp"` for list display as **`MM/DD/YYYY HH:MM AM/PM`**
 * using the **UTC** calendar date and time.
 */
export function formatAdminEntityTimestampListDatetimeUsUtc(raw: unknown): string {
  const parsed = parseRawToDate(raw)
  if (parsed === null) return ""
  if ("fallback" in parsed) return parsed.fallback
  return new Intl.DateTimeFormat("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  }).format(parsed.date)
}

/** Create/edit timestamp calendar button + read-only field: match {@link AdminEntityColumn.timestampListDisplay}. */
export function formatAdminEntityTimestampCalendarLabelUtc(
  raw: unknown,
  col: Pick<AdminEntityColumn, "timestampListDisplay">,
): string {
  if (col.timestampListDisplay === "date-dmy") {
    return formatAdminEntityTimestampListDmyUtc(raw)
  }
  return formatAdminEntityTimestampListDateUsUtc(raw)
}

/**
 * List table cell text: **`listYearMonthPair`** → short month + year (same as reporting-period filter),
 * numeric currency, **`dateStringFormControl: "calendar"`** / **`timestampListDisplay: "date-us"`** like the
 * calendar buttons, else `cellString`.
 *
 * Also used for **`listVirtualRelationLabel`** cells via the related entity’s column definitions so
 * embedded dates and amounts match that entity’s list (e.g. sales **`salesDate`**).
 */
export function formatAdminEntityListCellDisplay(
  raw: unknown,
  field: AdminEntityColumn,
): string {
  if (field.listYearMonthPair) {
    const s = cellString(raw).trim()
    if (s === "") return ""
    return formatAdminEntityYearMonthPeriodLabel(s)
  }
  if (field.listDayCountBadgeBands && field.valueType === "integer") {
    const n = parseAdminEntityListDayCountInteger(raw)
    if (n == null) return ""
    return formatAdminEntitySignedDayCountLabel(n)
  }
  if (field.valueType === "numeric") {
    return formatAdminEntityNumericListCell(raw, {
      currencySymbol: field.currencySymbol,
      allowLeadingMinus: field.currencyAmountAllowLeadingMinus === true,
    })
  }
  if (field.valueType === "timestamp") {
    if (field.timestampListDisplay === "date-us") {
      return formatAdminEntityTimestampListDateUsUtc(raw)
    }
    if (field.timestampListDisplay === "date-dmy") {
      return formatAdminEntityTimestampListDmyUtc(raw)
    }
    if (field.timestampListDisplay === "datetime-us") {
      return formatAdminEntityTimestampListDatetimeUsUtc(raw)
    }
  }
  if (
    field.valueType === "text" &&
    (field.dateStringFormControl === "calendar" ||
      field.dateStringFormControl === "yearMonthEnd")
  ) {
    return formatAdminEntityDateStringYmdForDisplay(raw)
  }
  if (field.valueType === "text" && field.dateStringFormControl === "textInput") {
    return adminEntityDateStringYmdToMdy(raw == null ? "" : String(raw))
  }
  return cellString(raw)
}
