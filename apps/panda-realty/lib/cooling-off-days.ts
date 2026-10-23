/**
 * Cooling-off period resolver for Panda Realty offers.
 *
 * Two contract types share one offer form. The number of cooling-off days is
 * derived from the property type plus the single "waive cooling off" answer on
 * the offer form — no separate day-count is collected from the buyer:
 *
 *   Manufactured Home → 21 days, or 7 if waived (the buyer may only waive 14 of 21)
 *   anything else     →  5 days, or 0 if waived
 *
 * Manufactured homes are flagged by setting the property type category to
 * "Manufactured Home" (they are added manually; they do not appear in RP Data).
 */

export const MANUFACTURED_HOME_TYPE = "Manufactured Home"

export function isManufacturedHome(propertyType: string | null | undefined): boolean {
  return (propertyType ?? "").trim().toLowerCase() === MANUFACTURED_HOME_TYPE.toLowerCase()
}

export function resolveCoolingOffDays(
  propertyType: string | null | undefined,
  waiveCoolingOff: boolean | null | undefined,
): number {
  if (isManufacturedHome(propertyType)) {
    return waiveCoolingOff ? 7 : 21
  }
  return waiveCoolingOff ? 0 : 5
}

export function formatCoolingOffLine(days: number): string {
  return `Cooling Off - ${days}`
}
