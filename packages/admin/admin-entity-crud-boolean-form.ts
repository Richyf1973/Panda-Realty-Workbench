import type { AdminEntityColumn } from "./admin-entity-types"

/** Default form draft for a boolean column from `docSqlType` (e.g. `bool default true`). */
export function adminEntityBooleanFormDefaultString(
  col: Pick<AdminEntityColumn, "docSqlType">,
): "true" | "false" {
  const d = col.docSqlType ?? ""
  return /\bdefault\s+true\b/i.test(d) ? "true" : "false"
}

/** Whether the string form value should show the switch as checked. */
export function adminEntityBooleanFormChecked(value: string): boolean {
  return value.trim().toLowerCase() === "true"
}
