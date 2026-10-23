import type { Page } from "@playwright/test"

import { makePropertiesListResponse, STATUS_LIST_RESPONSE } from "./admin-properties-mocks"

/** contractDate stored correctly as midnight UTC (2026-04-26 00:00:00 UTC) */
export const CONTRACT_DATE_MIDNIGHT_UTC = "2026-04-26T00:00:00.000Z"

/** 14 cooling-off days after 2026-04-26 = 2026-05-10 */
export const COOLING_OFF_DATE_UTC = "2026-05-10T00:00:00.000Z"
/** 7 building-pest days after 2026-04-26 = 2026-05-03 */
export const BUILDING_PEST_DATE_UTC = "2026-05-03T00:00:00.000Z"
/** 21 sale-of-property days after 2026-04-26 = 2026-05-17 */
export const SALE_OF_PROPERTY_DATE_UTC = "2026-05-17T00:00:00.000Z"

export const ACCEPTED_OFFER = {
  buyerOfferId: 212,
  entityName: "UTC Sync Test Buyer",
  offer: "820000.00",
  isAccepted: true,
  dateOffered: "2026-04-20",
  createdAt: "2026-04-20T00:00:00Z",
  isCashOffer: false,
  noConditions: false,
  coolingOffDays: 14,
  financeDays: null,
  buildingPestDays: 7,
  dueDiligenceDays: null,
  subjectToSaleDays: null,
  subjectToSaleStage: null,
  subjectToSaleAddress: null,
  saleOfPropertyDays: 21,
  unconditionalContractDays: null,
  depositInitial: "2000.00",
  depositBalance: "18000.00",
  otherConditions: null,
  customConditions: null,
  conditionNotes: null,
}

export const PROPERTY_WITH_ACCEPTED_OFFER = {
  propertyListId: 2001,
  streetAddress: "26 UTC Test Avenue",
  suburb: "Testville",
  state: "QLD",
  postcode: "4000",
  propertyType: "House",
  bed: 4,
  bath: 2,
  car: 2,
  salePrice: 820000,
  propertyStatusId: 1,
  buyerName: null,
  buyerId: null,
  owner1name: "UTC, Owner",
  owner2name: null,
  owner3name: null,
  combinedOwner: "UTC, Owner",
  isFavorite: true,
  priceUndisclosed: false,
  excludeFromReport: false,
  buildingArea: null,
  landSize: null,
  saleDate: null,
  appraisedAmount: null,
  contractDate: CONTRACT_DATE_MIDNIGHT_UTC,
  contractPrice: "820000.00",
  commissionAmount: null,
  commissionRate: "2.0",
  // condition dates computed server-side from midnight-UTC contractDate + days
  coolingOffDate: COOLING_OFF_DATE_UTC,          // +14d
  buildingPestDate: BUILDING_PEST_DATE_UTC,      // +7d
  financeDate: null,
  dueDiligenceDate: null,
  saleOfPropertyDate: SALE_OF_PROPERTY_DATE_UTC, // +21d
  unconditionalContractDate: null,
  completionDate: null,
  isCashOffer: false,
  noConditions: false,
  isSubjectToSale: false,
  otherConditions: null,
  successfulBuyer: "UTC Sync Test Buyer",
  successfulBuyerPropertyEntityId: 601,
  successfulBuyerEntityId: 401,
  successfulBuyerPhoneNumber: null,
  successfulBuyerEmailAddress: null,
  updatedAt: "2026-04-26T00:00:00Z",
  propertyEntities: [],
  propertyBuyers: [],
  propertyContacts: [],
  propertyTenants: [],
}

const EMPTY_LIST = {
  items: [],
  totalCount: 0,
  limit: 20,
  totalPages: 0,
  hasNextPage: false,
  hasPreviousPage: false,
  startCursor: null,
  endCursor: null,
}

export async function setupConditionsUtcPropertyRoutes(page: Page): Promise<void> {
  const listResponse = makePropertiesListResponse({ ...PROPERTY_WITH_ACCEPTED_OFFER })
  await page.route("**/api/admin/properties**", async (route) => {
    const url = route.request().url()
    if (url.includes("/buyer-offers") && route.request().method() === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([ACCEPTED_OFFER]) })
      return
    }
    if (url.match(/\/api\/admin\/properties\/2001(\?|$)/)) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(PROPERTY_WITH_ACCEPTED_OFFER) })
      return
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(listResponse) })
  })
  await page.route("**/api/admin/property-status**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(STATUS_LIST_RESPONSE) }),
  )
  await page.route("**/api/admin/property-entities**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_LIST) }),
  )
}
