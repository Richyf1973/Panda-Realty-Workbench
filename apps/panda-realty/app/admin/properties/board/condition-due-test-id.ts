/** Stable `data-testid` suffix for Summary "Condition Due Dates" rows (e.g. "Building & Pest" → `building-and-pest`). */
export function conditionDueRowTestIdSlug(label: string): string {
  return label
    .toLowerCase()
    .trim()
    .replace(/\s*&\s*/g, "-and-")
    .replace(/&/g, "-and-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}
