/**
 * Radix Select only shows the current value when it matches a `SelectItem`; otherwise
 * the trigger shows the placeholder. Keep active ids in the option list (e.g. list
 * pagination omits the current row's related id).
 */
export function adminEntityRelationOptionsEnsureSelected(
  options: readonly { value: string; label: string }[],
  selectedValues: readonly string[],
): { value: string; label: string }[] {
  const out = [...options]
  const seen = new Set(out.map((o) => o.value))
  for (const raw of selectedValues) {
    const v = raw.trim()
    if (v === "" || seen.has(v)) continue
    seen.add(v)
    out.push({ value: v, label: v })
  }
  return out
}

/**
 * Builds Select items for an FK control. While `optionsPending` and the current value is not yet
 * present in `baseOptions`, skips injecting a synthetic `{ value, label: value }` row so Radix
 * shows the placeholder instead of a brief flash of the raw id. After load, missing ids are still
 * backfilled via {@link adminEntityRelationOptionsEnsureSelected} (e.g. paginated lists).
 */
export function adminEntityCrudRelationSelectOptionsForDisplay(
  baseOptions: readonly { readonly value: string; readonly label: string }[],
  value: string,
  optionsPending: boolean,
): {
  readonly merged: { value: string; label: string }[]
  readonly resolving: boolean
} {
  const trimmed = value.trim()
  const hasResolvedOption =
    trimmed === "" || baseOptions.some((o) => o.value === trimmed)
  const injectSelected = !(optionsPending && !hasResolvedOption)
  const merged = adminEntityRelationOptionsEnsureSelected(
    baseOptions,
    injectSelected ? [value] : [],
  )
  const resolving =
    trimmed !== "" && optionsPending && !hasResolvedOption
  return { merged, resolving }
}
