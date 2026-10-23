/**
 * Escape a user fragment for `ILIKE … ESCAPE '\\'` so `%` / `_` are literal
 * and backslashes do not break the pattern.
 */
export function escapeAdminEntityIlikePattern(fragment: string): string {
  return fragment
    .replaceAll("\\", "\\\\")
    .replaceAll("%", "\\%")
    .replaceAll("_", "\\_")
}
