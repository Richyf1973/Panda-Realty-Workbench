export interface EntitySearchResult {
  entityId: number
  entityName: string
  phoneNumber: string | null
  emailAddress: string | null
}

export interface PropertyContact {
  propertyEntityId: number
  entityId: number
  entityName: string
  phoneNumber: string | null
  emailAddress: string | null
  address: string | null
  esuburb: string | null
  estate: string | null
  epostcode: string | null
  notes: string | null
  contactCategoryId: number | null
  contactCategoryName: string | null
  association: string | null
}

export interface ContactFormState {
  entityName: string
  phoneNumber: string
  emailAddress: string
  address: string
  esuburb: string
  estate: string
  epostcode: string
  notes: string
  contactCategoryId: string
  association: string
}

export interface ContactDialogState {
  open: boolean
  contact: PropertyContact | null
  saving: boolean
  saveError: string | null
}

export interface ContactDeleteDialogState {
  open: boolean
  contact: PropertyContact | null
  deleting: boolean
}

export interface ContactCategory {
  contactCategoryId: number
  contactCategoryName: string
}

export const EMPTY_CONTACT_FORM: ContactFormState = {
  entityName: "",
  phoneNumber: "",
  emailAddress: "",
  address: "",
  esuburb: "",
  estate: "",
  epostcode: "",
  notes: "",
  contactCategoryId: "",
  association: "",
}

export function contactToForm(c: PropertyContact): ContactFormState {
  return {
    entityName: c.entityName,
    phoneNumber: c.phoneNumber ?? "",
    emailAddress: c.emailAddress ?? "",
    address: c.address ?? "",
    esuburb: c.esuburb ?? "",
    estate: c.estate ?? "",
    epostcode: c.epostcode ?? "",
    notes: c.notes ?? "",
    contactCategoryId: c.contactCategoryId != null ? String(c.contactCategoryId) : "",
    association: c.association ?? "",
  }
}
