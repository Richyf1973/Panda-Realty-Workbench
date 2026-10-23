/** Maps CRM entity categories and owner-slot sync to Google Contacts display-name prefixes. */

export type GoogleContactsPropertyRole = "seller" | "contact" | "tenant" | "enquiry" | "buyer-rep" | "omit"

const ROLE_RANK: Record<GoogleContactsPropertyRole, number> = {
  seller: 4,
  contact: 3,
  tenant: 2,
  enquiry: 1,
  "buyer-rep": 1,
  omit: 0,
}

/**
 * Map `entity_categories.slug` (case-insensitive) to a property role for display names.
 * Unknown slugs → **omit** (no `Label:` segment per product rules).
 */
export function entityCategorySlugToPropertyRole(
  slug: string | null | undefined,
): GoogleContactsPropertyRole {
  if (slug == null || typeof slug !== "string") return "omit"
  const s = slug.trim().toLowerCase()
  if (s === "buyer") return "enquiry"
  if (s === "contact") return "contact"
  if (s === "tenant") return "tenant"
  if (s === "seller") return "seller"
  return "omit"
}

export function propertyRoleRank(role: GoogleContactsPropertyRole): number {
  return ROLE_RANK[role]
}

export function maxPropertyRole(
  a: GoogleContactsPropertyRole,
  b: GoogleContactsPropertyRole,
): GoogleContactsPropertyRole {
  return propertyRoleRank(a) >= propertyRoleRank(b) ? a : b
}

/** Label before `:` — `null` means omit the role segment (unknown category). */
export function propertyRoleToPrefixLabel(role: GoogleContactsPropertyRole): string | null {
  switch (role) {
    case "seller":
      return "Seller"
    case "contact":
      return "Contact"
    case "tenant":
      return "Tenant"
    case "enquiry":
      return "Enq"
    case "buyer-rep":
      return "Buyer Rep"
    case "omit":
      return null
    default:
      return null
  }
}

export function buildGoogleContactsDisplayName(args: {
  entityName: string
  propertyAddress?: string
  phoneNumber?: string
  propertyRole: GoogleContactsPropertyRole
}): string {
  const { entityName, propertyAddress, phoneNumber, propertyRole } = args
  const trimmedAddr = propertyAddress?.trim()
  if (!trimmedAddr) return entityName
  const label = propertyRoleToPrefixLabel(propertyRole)
  const contextSegment = label ? `${label}: ${trimmedAddr};` : `${trimmedAddr};`
  const parts = [entityName, contextSegment]
  const phone = phoneNumber?.trim()
  if (phone) parts.push(phone)
  return parts.join(" ")
}
