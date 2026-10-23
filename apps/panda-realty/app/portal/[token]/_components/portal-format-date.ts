export function formatPortalDate(date: Date | null, fallback = "Date to be confirmed"): string {
  if (!date) return fallback
  return date.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })
}
