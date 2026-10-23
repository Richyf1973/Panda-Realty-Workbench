export function buildOfferEmailSubject(
  buyerName: string | null | undefined,
  propertyLabel: string | null | undefined,
): string {
  const parts: string[] = ["Offer Form"]
  if (buyerName) parts.push(buyerName)
  if (propertyLabel) parts.push(propertyLabel)
  return parts.join(" — ")
}
