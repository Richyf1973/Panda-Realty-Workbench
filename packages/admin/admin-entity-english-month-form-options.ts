/**
 * Calendar months **1–12** with English full names (January … December) for admin integer `<select>`s.
 * Uses **UTC** mid-month dates so labels are stable across time zones.
 */
export function adminEntityEnglishMonthIntegerFormOptions(): readonly {
  value: number
  label: string
}[] {
  const out: { value: number; label: string }[] = []
  for (let i = 0; i < 12; i++) {
    const value = i + 1
    const label = new Intl.DateTimeFormat("en-US", { month: "long" }).format(
      new Date(Date.UTC(2000, i, 15)),
    )
    out.push({ value, label })
  }
  return out
}
