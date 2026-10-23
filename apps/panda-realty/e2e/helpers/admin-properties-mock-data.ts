type PropertyListItem = {
  propertyListId: number
  streetAddress: string
  suburb: string
  state: string
  postcode: string
  propertyType: string
  bed: number
  bath: number
  car: number
  salePrice: number
  propertyStatusId: number
  buyerName: string | null
  buyerId: number | null
  owner1name: string | null
  owner2name: string | null
  owner3name: string | null
  combinedOwner: string | null
  isFavorite: boolean
  priceUndisclosed: boolean
  excludeFromReport: boolean
  buildingArea: number | null
  landSize: number | null
  saleDate: string | null
  appraisedAmount: number | null
  contractDate: string | null
  contractPrice: string | null
  commissionAmount: string | null
  commissionRate: string | null
  coolingOffDate: string | null
  buildingPestDate: string | null
  financeDate: string | null
  dueDiligenceDate: string | null
  saleOfPropertyDate: string | null
  unconditionalContractDate: string | null
  completionDate: string | null
  isCashOffer: boolean | null
  noConditions: boolean | null
  isSubjectToSale: boolean | null
  otherConditions: string | null
  successfulBuyer: string | null
  successfulBuyerPropertyEntityId: number | null
  successfulBuyerEntityId: number | null
  successfulBuyerPhoneNumber: string | null
  successfulBuyerEmailAddress: string | null
  updatedAt: string
}

type PropertyListResponse = {
  items: PropertyListItem[]
  totalCount: number
  limit: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
  startCursor: null
  endCursor: null
}

export const SINGLE_PROPERTY_RESPONSE: PropertyListResponse = {
  items: [
    {
      propertyListId: 1001,
      streetAddress: "12 Test Street",
      suburb: "Testville",
      state: "QLD",
      postcode: "4000",
      propertyType: "House",
      bed: 3,
      bath: 2,
      car: 1,
      salePrice: 500000,
      propertyStatusId: 1,
      buyerName: null,
      buyerId: null,
      owner1name: "Smith, John",
      owner2name: "Jane Smith",
      owner3name: null,
      combinedOwner: "Smith, John / Jane Smith",
      isFavorite: false,
      priceUndisclosed: false,
      excludeFromReport: false,
      buildingArea: null,
      landSize: null,
      saleDate: null,
      appraisedAmount: null,
      contractDate: null,
      contractPrice: null,
      commissionAmount: null,
      commissionRate: null,
      coolingOffDate: null,
      buildingPestDate: null,
      financeDate: null,
      dueDiligenceDate: null,
      saleOfPropertyDate: null,
      unconditionalContractDate: null,
      completionDate: null,
      isCashOffer: null,
      noConditions: null,
      isSubjectToSale: null,
      otherConditions: null,
      successfulBuyer: null,
      successfulBuyerPropertyEntityId: null,
      successfulBuyerEntityId: null,
      successfulBuyerPhoneNumber: null,
      successfulBuyerEmailAddress: null,
      updatedAt: "2026-01-01T00:00:00Z",
    },
  ],
  totalCount: 1,
  limit: 25,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false,
  startCursor: null,
  endCursor: null,
}

export const EMPTY_LIST_RESPONSE = {
  items: [],
  totalCount: 0,
  limit: 20,
  totalPages: 0,
  hasNextPage: false,
  hasPreviousPage: false,
  startCursor: null,
  endCursor: null,
}

export const EMPTY_PROPERTY_ENTITIES_RESPONSE = {
  items: [],
  totalCount: 0,
  limit: 20,
  totalPages: 0,
  hasNextPage: false,
  hasPreviousPage: false,
  startCursor: null,
  endCursor: null,
}

export const STATUS_LIST_RESPONSE = {
  items: [
    {
      propertyStatusId: 1,
      propertyStatusCode: "ACTIVE",
      propertyStatus: "Active",
    },
  ],
  totalCount: 1,
  limit: 100,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false,
  startCursor: null,
  endCursor: null,
}

/** Same junction row as `propertyBuyers[]` — real GET also includes `propertyEntities` for listDetailSeed merge. */
export const PROPERTY_1001_BUYER_JUNCTION_ROW = {
  propertyEntityId: 501,
  entityId: 201,
  isOriginalOwner: false,
  propertyEntity: {
    entityId: 201,
    entityName: "Test Buyer LLC",
    entityCategoryId: 1,
    address: "1 Buyer Rd",
    emailAddress: "buyer@test.com",
    phoneNumber: "0400 111 222",
  },
}

export const PROPERTY_EDIT_WITH_BUYER = {
  ...SINGLE_PROPERTY_RESPONSE.items[0],
  isFavorite: true,
  // Non-clearing patch fields (no patchEmptyClears) — required so the property PATCH
  // payload builds when the main dialog "Save changes" is clicked. Without them the
  // form value is "" and buildAdminEntityPatchBody returns null, aborting the submit
  // before the before-patch hook (offer auto-save) can run.
  primaryPhoneOwnerNum: 1,
  primaryEmailOwnerNum: 1,
  propertyEntities: [PROPERTY_1001_BUYER_JUNCTION_ROW],
  propertyBuyers: [PROPERTY_1001_BUYER_JUNCTION_ROW],
}

export const PROPERTY_ENTITY_501_DETAIL = {
  propertyEntityId: 501,
  entityId: 201,
  propertyListId: 1001,
  propertyEntityNote: null,
  isOriginalOwner: false,
  propertyEntity: {
    entityId: 201,
    entityName: "Test Buyer LLC",
    entityCategoryId: 1,
  },
  entityMembers: [],
  buyerOffers: [],
  propertyEntityFiles: [],
  propertyEntityNotes: [],
}

export const PROPERTY_EDIT_WITH_TENANT = {
  ...SINGLE_PROPERTY_RESPONSE.items[0],
  isFavorite: true,
  propertyTenants: [
    {
      propertyEntityId: 502,
      entityId: 301,
      isOriginalOwner: false,
      propertyEntity: {
        entityId: 301,
        entityName: "Test Tenant Pty",
        entityCategoryId: 3,
        address: "9 Tenant Ave",
        emailAddress: "tenant@test.com",
        phoneNumber: "0400 333 444",
      },
    },
  ],
}

export const PROPERTY_ENTITY_502_DETAIL = {
  propertyEntityId: 502,
  entityId: 301,
  propertyListId: 1001,
  propertyEntityNote: "Lease note",
  isOriginalOwner: false,
  propertyEntity: {
    entityId: 301,
    entityName: "Test Tenant Pty",
    entityCategoryId: 3,
  },
  entityMembers: [],
  buyerOffers: [],
  propertyEntityFiles: [],
  propertyEntityNotes: [],
}

/** Buyers panel API response for property 1001 — mirrors GET /api/admin/properties/1001/buyers. */
export const BUYER_PANEL_ITEMS_RESPONSE_1001 = {
  items: [
    {
      propertyEntityId: 501,
      entityId: 201,
      entityName: "Test Buyer LLC",
      phoneNumber: "0400 111 222",
      emailAddress: "buyer@test.com",
      address: "1 Buyer Rd",
      esuburb: null,
      estate: null,
      epostcode: null,
      notes: null,
      buyerPipelineStatusId: null,
      pipelineStatusLabel: null,
      hasOfferFormSubmission: false,
    },
  ],
}

/** Tenants panel API response for property 1001 — mirrors GET /api/admin/properties/1001/tenants. */
export const TENANT_PANEL_ITEMS_RESPONSE_1001 = {
  items: [
    {
      propertyEntityId: 502,
      entityId: 301,
      entityName: "Test Tenant Pty",
      phoneNumber: "0400 333 444",
      emailAddress: "tenant@test.com",
      address: "9 Tenant Ave",
      esuburb: null,
      estate: null,
      epostcode: null,
      notes: null,
    },
  ],
}

export const MOCK_ENTITY_201_DETAIL = {
  entityId: 201,
  entityName: "Test Buyer LLC",
  entityCategoryId: 1,
  emailAddress: "buyer@test.com",
  phoneNumber: "0400 111 222",
  address: "1 Buyer Rd",
  entityBuyerStatuses: [],
} as const

export const BUYER_OFFER_ACCEPTED = {
  buyerOfferId: 9002,
  entityName: "Test Buyer LLC",
  offer: "850000.00",
  isAccepted: true,
  dateOffered: "2026-03-20",
  createdAt: "2026-03-20T00:00:00Z",
}

export const BUYER_OFFER_NOT_ACCEPTED = {
  buyerOfferId: 9001,
  entityName: "Another Buyer",
  offer: "800000.00",
  isAccepted: false,
  dateOffered: "2026-03-15",
  createdAt: "2026-03-15T00:00:00Z",
}
