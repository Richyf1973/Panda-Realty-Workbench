export interface PropertyTenant {
  propertyEntityId: number
  entityId: number
  entityName: string
  phone: string | null
  emailAddress: string | null
  address: string | null
  esuburb: string | null
  estate: string | null
  epostcode: string | null
  notes: string | null
}

export interface TenantFormState {
  entityName: string
  phone: string
  emailAddress: string
  address: string
  esuburb: string
  estate: string
  epostcode: string
  notes: string
}

export interface TenantDialogState {
  open: boolean
  tenant: PropertyTenant | null
  saving: boolean
  saveError: string | null
}

export interface TenantDeleteDialogState {
  open: boolean
  tenant: PropertyTenant | null
  deleting: boolean
}

export const EMPTY_TENANT_FORM: TenantFormState = {
  entityName: "",
  phone: "",
  emailAddress: "",
  address: "",
  esuburb: "",
  estate: "",
  epostcode: "",
  notes: "",
}

export function tenantToForm(t: PropertyTenant): TenantFormState {
  return {
    entityName: t.entityName,
    phone: t.phone ?? "",
    emailAddress: t.emailAddress ?? "",
    address: t.address ?? "",
    esuburb: t.esuburb ?? "",
    estate: t.estate ?? "",
    epostcode: t.epostcode ?? "",
    notes: t.notes ?? "",
  }
}
