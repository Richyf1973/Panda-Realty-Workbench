import type { ComponentProps } from "react"

import type { AdminEntityColumn } from "./admin-entity-types"

type InputHtml = Pick<
  ComponentProps<"input">,
  "type" | "step" | "inputMode"
>

/**
 * HTML props for admin entity CRUD single-line fields. Plain **`integer`** and **`numeric`**
 * (non-currency) use **`type="text"`** in the dialog with shared sanitize + key-filter helpers
 * (consistent with related-row editors; avoids `type="number"` quirks like **`e`**). This helper
 * still supplies **`inputMode`** for any fallback **`Input`** (e.g. **`text`** columns).
 */
export function adminEntityCrudInputHtmlProps(
  col: AdminEntityColumn,
): Partial<InputHtml> {
  if (col.valueType === "integer") {
    return {
      type: "text",
      inputMode: col.inputMode ?? "numeric",
    }
  }
  if (col.valueType === "numeric") {
    if (col.currencySymbol) {
      return {
        type: "text",
        inputMode: col.inputMode ?? "decimal",
      }
    }
    return {
      type: "number",
      step: "any",
      inputMode: col.inputMode ?? "decimal",
    }
  }
  if (col.inputMode != null) {
    return { inputMode: col.inputMode }
  }
  return {}
}
