import type { AdminEntityDecimalAmountInputOptions } from "./admin-entity-currency-decimal-input"
import { sanitizeAdminEntityDecimalAmountInput } from "./admin-entity-currency-decimal-input"
import {
  sanitizeAdminEntityIntegerInput,
  type AdminEntityIntegerInputOptions,
} from "./admin-entity-integer-input"
import type { AdminEntityColumn } from "./admin-entity-types"

/**
 * When true, empty (or incomplete) numeric input should become `"0"` on blur so NOT NULL /
 * required fields do not stay blank.
 *
 * - **Create:** required columns (`optionalOnCreate` omitted or false).
 * - **Edit:** columns that do not clear to NULL when empty (`patchEmptyClears` not true).
 */
export function adminEntityNumericCoerceEmptyToZeroOnBlur(
  col: AdminEntityColumn,
  variant: "create" | "edit",
): boolean {
  if (col.formControlReadOnly === true) return false
  if (variant === "edit" && col.crudEditReadOnly === true) return false
  if (col.listRelation) return false
  if (col.valueType === "integer") {
    const useSelect =
      col.integerFormOptions != null &&
      col.integerFormOptions.length > 0 &&
      col.integerInputAllowLeadingMinus !== true &&
      col.integerInputAllowCommaSeparatedQuantities !== true
    if (useSelect) return false
  }
  if (col.valueType !== "integer" && col.valueType !== "numeric") return false
  if (variant === "create") return !col.optionalOnCreate
  return col.patchEmptyClears !== true
}

function decimalBlurLooksEmpty(
  raw: string,
  decOpts: AdminEntityDecimalAmountInputOptions | undefined,
): boolean {
  const s = sanitizeAdminEntityDecimalAmountInput(raw, decOpts).trim()
  return s === "" || s === "-" || s === "." || s === "-."
}

function integerBlurLooksEmpty(
  raw: string,
  intOpts: AdminEntityIntegerInputOptions | undefined,
): boolean {
  const s = sanitizeAdminEntityIntegerInput(raw, intOpts).trim()
  if (intOpts?.allowCommaSeparatedQuantities === true) {
    const t = s.replace(/,/g, "").replace(/\s/g, "")
    return t === ""
  }
  return s === "" || s === "-"
}

/**
 * Returns the string to set on blur, or `null` if the value should stay as-is.
 */
export function nextCoercedAdminEntityNumericStringOnBlur(
  col: AdminEntityColumn,
  variant: "create" | "edit",
  rawValue: string,
): string | null {
  if (!adminEntityNumericCoerceEmptyToZeroOnBlur(col, variant)) return null

  if (col.valueType === "integer") {
    const intOpts: AdminEntityIntegerInputOptions | undefined =
      col.integerInputAllowCommaSeparatedQuantities === true
        ? { allowCommaSeparatedQuantities: true }
        : col.integerInputAllowLeadingMinus
          ? { allowLeadingMinus: true }
          : undefined
    if (!integerBlurLooksEmpty(rawValue, intOpts)) return null
    return "0"
  }

  if (col.valueType === "numeric") {
    const allowLeadingMinus =
      col.numericInputAllowLeadingMinus === true ||
      (Boolean(col.currencySymbol?.trim()) &&
        col.currencyAmountAllowLeadingMinus === true)
    const decOpts: AdminEntityDecimalAmountInputOptions | undefined =
      allowLeadingMinus ? { allowLeadingMinus: true } : undefined
    if (!decimalBlurLooksEmpty(rawValue, decOpts)) return null
    return "0"
  }

  return null
}
