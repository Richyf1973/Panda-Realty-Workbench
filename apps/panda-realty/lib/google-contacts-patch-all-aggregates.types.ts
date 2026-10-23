import type { GoogleContactsPropertyRole } from "@/lib/google-contact-name-prefix"

export type ContributingOwnerRef = { propertyListId: number; slot: 1 | 2 | 3 }

export type EmailAggWithContributors = {
  canonicalEmail: string
  entityName: string
  parentEntityNames?: Set<string>
  phoneNumber?: string
  /** Dominant role for Google display name (merge: Seller > Contact > Tenant > Enq). */
  propertyRole: GoogleContactsPropertyRole
  streets: string[]
  fromEntity: boolean
  fromOwner: boolean
  contributingEntityIds: Set<number>
  contributingOwners: Map<string, ContributingOwnerRef>
}

export type PhoneOnlyAggWithContributors = {
  normalizedDigits: string
  displayPhone: string
  entityName: string
  parentEntityNames?: Set<string>
  propertyRole: GoogleContactsPropertyRole
  streets: string[]
  fromEntity: boolean
  fromOwner: boolean
  contributingEntityIds: Set<number>
  contributingOwners: Map<string, ContributingOwnerRef>
}

export type EntityBulkSyncRow = {
  entityId: number
  entityName: string
  emailAddress?: string | null
  contact?: string | null
  streetAddress?: string | null
  /** `entity_categories.slug` from bulk fetch. */
  entityCategorySlug?: string | null
}
