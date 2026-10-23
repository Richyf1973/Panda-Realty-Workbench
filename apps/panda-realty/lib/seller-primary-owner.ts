/**
 * Resolve a property's primary seller contact from its owner1/2/3 columns.
 *
 * `primaryEmailOwnerNum` (1–3) picks which owner is primary; if that owner has no email
 * (or the number is out of range), falls back to the first owner that has an email.
 * Returns null when no owner has an email on record.
 *
 * Shared by the seller portal-link send route and the agent→client message notification
 * so both pick the same recipient.
 */
export type SellerOwnerSource = {
  owner1email: string | null
  owner1name: string | null
  owner2email: string | null
  owner2name: string | null
  owner3email: string | null
  owner3name: string | null
  primaryEmailOwnerNum: number | null
}

export function resolveSellerPrimaryOwner(
  property: SellerOwnerSource,
): { email: string; name: string | null } | null {
  const owners = [
    { email: property.owner1email, name: property.owner1name },
    { email: property.owner2email, name: property.owner2name },
    { email: property.owner3email, name: property.owner3name },
  ]
  const n = property.primaryEmailOwnerNum ?? 1
  const primary = n >= 1 && n <= 3 ? owners[n - 1] : null
  const chosen = (primary?.email ? primary : null) ?? owners.find((o) => !!o.email) ?? null
  if (!chosen?.email) return null
  return { email: chosen.email, name: chosen.name ?? null }
}
