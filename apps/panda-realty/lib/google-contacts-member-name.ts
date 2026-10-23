import type { GoogleContactsPropertyRole } from "@/lib/google-contact-name-prefix"

export function buildGoogleContactMemberIdentity(args: {
  memberName: string
  parentEntityName: string
  parentEntityCategorySlug: string | null | undefined
  isBuyersRepresentative: boolean
}): {
  entityName: string
  propertyRole: GoogleContactsPropertyRole
} {
  const memberName = args.memberName.trim()
  const parentEntityName = args.parentEntityName.trim()
  const parentSlug = args.parentEntityCategorySlug?.trim().toLowerCase()

  if (parentSlug === "contact") {
    return {
      entityName: `${memberName} (${parentEntityName})`,
      propertyRole: "omit",
    }
  }

  if (args.isBuyersRepresentative) {
    return {
      entityName: `${memberName} (rep for ${parentEntityName})`,
      propertyRole: "buyer-rep",
    }
  }

  return {
    entityName: memberName,
    propertyRole: "omit",
  }
}
