// Buyer pipeline aging — hardcoded constants (no UI config)
// Stage IDs from panda_realty.property_status (pipeline = 'buyers')
export const BUYER_AGING = {
  STAGE_IDS: {
    ACTIVE_BUYERS: 47,
    ACTIVE_3_TO_6_MONTHS: 55,
    ARCHIVED: 13,
  },
  THRESHOLDS_DAYS: {
    AMBER: 90,
    RED: 180,
  },
} as const

export type BuyerAgingColor = "green" | "amber" | "red"

export function getBuyerAgingColor(updatedAt: Date | null, createdAt: Date): BuyerAgingColor {
  const ref = updatedAt ?? createdAt
  const days = Math.floor((Date.now() - ref.getTime()) / (1000 * 60 * 60 * 24))
  if (days >= BUYER_AGING.THRESHOLDS_DAYS.RED) return "red"
  if (days >= BUYER_AGING.THRESHOLDS_DAYS.AMBER) return "amber"
  return "green"
}
