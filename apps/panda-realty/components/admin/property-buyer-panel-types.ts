export interface PropertyBuyerPanel {
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
  buyerPipelineStatusId: number | null
  pipelineStatusLabel: string | null
  hasOfferFormSubmission: boolean
  isPrimaryPhone: boolean
  isPrimaryEmail: boolean
}

export interface BuyerPanelFormState {
  entityName: string
  phoneNumber: string
  emailAddress: string
  address: string
  esuburb: string
  estate: string
  epostcode: string
  notes: string
}

export interface BuyerPanelDialogState {
  open: boolean
  buyer: null
  saving: boolean
  saveError: string | null
}

export interface BuyerPanelDeleteDialogState {
  open: boolean
  buyer: PropertyBuyerPanel | null
  deleting: boolean
}

export const EMPTY_BUYER_PANEL_FORM: BuyerPanelFormState = {
  entityName: "",
  phoneNumber: "",
  emailAddress: "",
  address: "",
  esuburb: "",
  estate: "",
  epostcode: "",
  notes: "",
}
