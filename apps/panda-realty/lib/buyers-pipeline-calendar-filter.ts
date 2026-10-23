/** localStorage key for Pipeline → Buyers month preset. */
export const PANDA_PIPELINE_BUYERS_MONTHS_STORAGE_KEY = "panda:pipeline:buyers:calendarMonths"

/** localStorage key for Pipeline → Properties (sellers) month preset. */
export const PANDA_PIPELINE_SELLERS_MONTHS_STORAGE_KEY = "panda:pipeline:sellers:calendarMonths"

export type BuyersCalendarMonthsPreset = "all" | "1" | "3" | "6" | "12"

export const BUYERS_CALENDAR_MONTH_PRESETS = ["1", "3", "6", "12"] as const

export type BuyerCardCreatedAtField = { createdAt: Date | string | null | undefined }

export function parseBuyersCalendarMonthsPreset(raw: string | null): BuyersCalendarMonthsPreset | null {
  if (raw === "all" || raw === "1" || raw === "3" || raw === "6" || raw === "12") return raw
  return null
}

function coerceCreatedAt(value: Date | string | null | undefined): Date | null {
  if (value == null) return null
  const d = value instanceof Date ? value : new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

/**
 * Start of the inclusive calendar-month window: first instant (UTC) of the month that is
 * (months - 1) steps before the current calendar month, counting the current month as 1.
 * Example for months=3 and "now" in April 2026 UTC: window begins 2026-02-01T00:00:00.000Z.
 */
export function getCreatedAtUtcWindowStartInclusive(months: number, now: Date): Date {
  const y = now.getUTCFullYear()
  const m = now.getUTCMonth()
  return new Date(Date.UTC(y, m - (months - 1), 1, 0, 0, 0, 0))
}

export function isBuyerCreatedAtInCalendarMonthWindow(
  createdAt: BuyerCardCreatedAtField["createdAt"],
  months: number,
  now: Date,
): boolean {
  const coerced = coerceCreatedAt(createdAt)
  if (!coerced) return false
  const start = getCreatedAtUtcWindowStartInclusive(months, now)
  return coerced.getTime() >= start.getTime() && coerced.getTime() <= now.getTime()
}

export function filterBuyerCardsMapByCalendarMonths<T extends BuyerCardCreatedAtField>(
  buyerCardsMap: Record<number, T[]>,
  preset: BuyersCalendarMonthsPreset,
  now: Date = new Date(),
): Record<number, T[]> {
  if (preset === "all") return buyerCardsMap

  const months = Number(preset)
  const next: Record<number, T[]> = {}
  for (const [statusIdStr, cards] of Object.entries(buyerCardsMap)) {
    const statusId = Number(statusIdStr)
    const filtered = cards.filter((c) => isBuyerCreatedAtInCalendarMonthWindow(c.createdAt, months, now))
    next[statusId] = filtered
  }
  return next
}

export type PropertyCardUpdatedAtField = { updatedAt: Date | string | null | undefined }

export function filterPropertyCardsMapByCalendarMonths<T extends PropertyCardUpdatedAtField>(
  cardsMap: Record<number, T[]>,
  preset: BuyersCalendarMonthsPreset,
  now: Date = new Date(),
): Record<number, T[]> {
  if (preset === "all") return cardsMap

  const months = Number(preset)
  const start = getCreatedAtUtcWindowStartInclusive(months, now)
  const next: Record<number, T[]> = {}
  for (const [statusIdStr, cards] of Object.entries(cardsMap)) {
    const statusId = Number(statusIdStr)
    next[statusId] = cards.filter((c) => {
      const d = c.updatedAt == null ? null : c.updatedAt instanceof Date ? c.updatedAt : new Date(c.updatedAt)
      if (!d || Number.isNaN(d.getTime())) return false
      return d.getTime() >= start.getTime() && d.getTime() <= now.getTime()
    })
  }
  return next
}
