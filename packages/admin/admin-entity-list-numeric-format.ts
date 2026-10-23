import type { AdminEntityDecimalAmountInputOptions } from "./admin-entity-currency-decimal-input"
import { sanitizeAdminEntityDecimalAmountInput } from "./admin-entity-currency-decimal-input"

/** Excel-style `#,##0.00` for admin list cells and blurred currency form fields (en-US grouping). */
const ADMIN_LIST_NUMERIC_DISPLAY = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  useGrouping: true,
})

export type FormatAdminEntityDecimalAmountDisplayOptions = {
  readonly allowLeadingMinus?: boolean
}

export type FormatAdminEntityNumericListCellOptions = {
  readonly currencySymbol?: string
  readonly allowLeadingMinus?: boolean
}

function decimalSanitizeOptionsFromDisplay(
  o?: FormatAdminEntityDecimalAmountDisplayOptions,
): AdminEntityDecimalAmountInputOptions | undefined {
  return o?.allowLeadingMinus === true ? { allowLeadingMinus: true } : undefined
}

/**
 * Format a plain or pasted decimal string for display (grouping + two fraction digits).
 * Used when a currency form control is not focused. Odd / non-numeric input falls back to a
 * sensible pass-through so list cells and edge API values still render.
 */
export function formatAdminEntityDecimalAmountFormDisplay(
  raw: string,
  options?: FormatAdminEntityDecimalAmountDisplayOptions,
): string {
  const s = raw.trim()
  if (s === "") return ""
  const decOpts = decimalSanitizeOptionsFromDisplay(options)
  const plain = sanitizeAdminEntityDecimalAmountInput(s, decOpts)
  if (plain === "") return s
  const n = Number(plain)
  if (!Number.isFinite(n)) return plain
  return ADMIN_LIST_NUMERIC_DISPLAY.format(n)
}

/**
 * Format a `valueType: "numeric"` list value for display. Non-finite or non-numeric strings fall
 * back to the trimmed string so odd API values still show something.
 */
export function formatAdminEntityNumericListCell(
  raw: unknown,
  options?: FormatAdminEntityNumericListCellOptions,
): string {
  if (raw == null) return ""
  const s = typeof raw === "string" ? raw.trim() : String(raw).trim()
  if (s === "") return ""
  const allowLeadingMinus = options?.allowLeadingMinus === true
  const formatted = formatAdminEntityDecimalAmountFormDisplay(s, {
    allowLeadingMinus,
  })
  const sym = options?.currencySymbol?.trim()
  if (!sym) return formatted
  return `${sym} ${formatted}`
}
