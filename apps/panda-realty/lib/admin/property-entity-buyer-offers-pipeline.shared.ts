/**
 * Pure helpers for buyer-offer workspace lines vs buyers pipeline (Edit Buyer).
 * Shared by client UI and server sync — no server-only imports.
 */

/** Matches persistence: trim, empty → "0", then parse for comparison (commas allowed). */
export function parseBuyerOfferStringToNumber(offer: string): number {
  const normalized = (offer ?? "").trim() || "0"
  const withoutCommas = normalized.replace(/,/g, "")
  const n = Number.parseFloat(withoutCommas)
  return Number.isFinite(n) ? n : 0
}

export function buyerOffersWorkspaceLinesHavePositiveOffer(
  lines: ReadonlyArray<{ offer: string }>,
): boolean {
  return lines.some((l) => parseBuyerOfferStringToNumber(l.offer) > 0)
}
