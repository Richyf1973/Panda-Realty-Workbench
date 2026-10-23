/**
 * Local calendar date as compact ddmmyyyy (no separators), e.g. 21042026 for 2026-04-21.
 * Used for properties export cell values and download filenames (XLSX/PDF).
 */
export function formatDateDdMmYyyyCompact(d: Date): string {
  const day = String(d.getDate()).padStart(2, "0")
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const year = String(d.getFullYear())
  return `${day}${month}${year}`
}
