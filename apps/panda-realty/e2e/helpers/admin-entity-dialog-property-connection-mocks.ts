import { expect, type Page, type Route } from "@playwright/test"

import { signInAsAdmin } from "./admin-auth"
import {
  BUYER_PANEL_ITEMS_RESPONSE_1001,
  EMPTY_PROPERTY_ENTITIES_RESPONSE,
  PROPERTY_EDIT_WITH_BUYER,
  SINGLE_PROPERTY_RESPONSE,
  STATUS_LIST_RESPONSE,
} from "./admin-properties-mocks"

// Buyer 201 is linked to TWO properties:
//   pe:501 → property 1001 ("12 Test Street") — lower ID, has offers
//   pe:502 → property 1002 ("98 Other Street") — HIGHER ID, no offers
// The bug would auto-select pe:502 (highest), showing "No offers recorded yet."
// The fix should select pe:501 (the source property).
export const TWO_CONNECTIONS_FOR_ENTITY_201 = {
  items: [
    {
      propertyEntityId: 501,
      entityId: 201,
      propertyListId: 1001,
      propertyEntityNote: null,
      buyerPipelineStatusId: null,
      isOriginalOwner: false,
      propertyRef: { streetAddress: "12 Test Street", state: "QLD", postcode: "4000" },
    },
    {
      propertyEntityId: 502,
      entityId: 201,
      propertyListId: 1002,
      propertyEntityNote: null,
      buyerPipelineStatusId: null,
      isOriginalOwner: false,
      propertyRef: { streetAddress: "98 Other Street", state: "QLD", postcode: "4000" },
    },
  ],
  totalCount: 2,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false,
}

export const FAVORITES_WITH_BOTH_PROPERTIES = {
  ...SINGLE_PROPERTY_RESPONSE,
  items: [
    {
      ...(SINGLE_PROPERTY_RESPONSE.items[0] as object),
      propertyListId: 1001,
      streetAddress: "12 Test Street",
      suburb: "Testville",
      state: "QLD",
      postcode: "4000",
      isFavorite: true,
    },
    {
      ...(SINGLE_PROPERTY_RESPONSE.items[0] as object),
      propertyListId: 1002,
      streetAddress: "98 Other Street",
      suburb: "Testville",
      state: "QLD",
      postcode: "4000",
      isFavorite: true,
    },
  ],
}

export const BUYER_OFFERS_FOR_PE_501 = {
  propertyListId: 1001,
  contractDate: null,
  offerFormToken: null,
  offers: [
    {
      buyerOfferId: 9001,
      offer: "500000",
      isAccepted: false,
      dateOffered: "2026-03-15",
      isCashOffer: false,
      noConditions: false,
      coolingOffDays: null,
      financeDays: null,
      buildingPestDays: null,
      dueDiligenceDays: null,
      subjectToSaleDays: null,
      subjectToSaleStage: null,
      subjectToSaleAddress: null,
      saleOfPropertyDays: null,
      unconditionalContractDays: null,
      depositInitial: null,
      depositBalance: null,
      otherConditions: null,
      customConditions: null,
      conditionNotes: null,
      settlementCalendarEventId: null,
      coolingOffCalendarEventId: null,
      financeCalendarEventId: null,
      buildingPestCalendarEventId: null,
      waiveCoolingOff: null,
      isSubjectToFinance: null,
      financePreApproved: null,
      financeBank: null,
      financeBankContactName: null,
      financeBankContactPhone: null,
      financeBankContactEmail: null,
      suggestBuildingCompanies: null,
      isSubjectToSale: null,
      saleDaysBeforeListingLive: null,
      saleIsUnconditional: null,
      saleUnconditionalDate: null,
      saleBuyerSettlementDate: null,
      saleActiveConditions: null,
      saleFreeAppraisal: null,
      settlementPeriod: null,
      settlementDate: null,
    },
  ],
}

export const BUYER_OFFERS_EMPTY = { propertyListId: 1002, contractDate: null, offerFormToken: null, offers: [] }

export const ENTITY_201_DETAIL = {
  entityId: 201,
  entityName: "Test Buyer LLC",
  entityCategoryId: 1,
  emailAddress: "buyer@test.com",
  contact: "0400 111 222",
  address: null,
  notes: null,
  property_entities: TWO_CONNECTIONS_FOR_ENTITY_201.items,
}

export async function setupEntityDialogPropertyConnectionRoutes(page: Page) {
  await page.route("**/api/admin/property-status**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(STATUS_LIST_RESPONSE) })
  })
  await page.route("**/api/admin/buyer-status**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [] }) })
  })
  await page.route("**/api/admin/properties**", async (route: Route) => {
    const url = route.request().url()
    if (url.includes("isFavorite=true")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(FAVORITES_WITH_BOTH_PROPERTIES) })
      return
    }
    if (url.match(/\/api\/admin\/properties\/1001\/buyers(\?|$)/)) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(BUYER_PANEL_ITEMS_RESPONSE_1001) })
      return
    }
    if (url.match(/\/api\/admin\/properties\/1001(\?|$)/)) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(PROPERTY_EDIT_WITH_BUYER) })
      return
    }
    if (url.match(/\/api\/admin\/properties\/1002(\?|$)/)) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ streetAddress: "98 Other Street", state: "QLD", postcode: "4000" }) })
      return
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ...SINGLE_PROPERTY_RESPONSE, items: [{ ...PROPERTY_EDIT_WITH_BUYER }] }) })
  })
  await page.route("**/api/admin/entities**", async (route: Route) => {
    if (route.request().method() !== "GET") { await route.continue(); return }
    const url = route.request().url()
    if (url.match(/\/api\/admin\/entities\/201(\?|$)/)) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(ENTITY_201_DETAIL) })
      return
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [], totalCount: 0, limit: 20, totalPages: 0 }) })
  })
  await page.route("**/api/admin/property-entities**", async (route: Route) => {
    const url = route.request().url()
    const method = route.request().method()
    if (method === "GET" && url.includes("entityId=201") && !url.includes("/property-entities/5")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(TWO_CONNECTIONS_FOR_ENTITY_201) })
      return
    }
    if (url.includes("/property-entities/501/buyer-offers")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(BUYER_OFFERS_FOR_PE_501) })
      return
    }
    if (url.includes("/property-entities/502/buyer-offers")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(BUYER_OFFERS_EMPTY) })
      return
    }
    if (url.includes("/property-entities/501/offer-form-status") || url.includes("/property-entities/502/offer-form-status")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ formUrl: null, entityEmail: null, submission: null }) })
      return
    }
    if (url.match(/\/property-entities\/501(\?|$)/)) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(TWO_CONNECTIONS_FOR_ENTITY_201.items[0]) })
      return
    }
    if (url.match(/\/property-entities\/502(\?|$)/)) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(TWO_CONNECTIONS_FOR_ENTITY_201.items[1]) })
      return
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_PROPERTY_ENTITIES_RESPONSE) })
  })
}

export async function openEntityDialogFromProperty1001(page: Page) {
  await page.setViewportSize({ width: 1400, height: 900 })
  await page.goto("/admin/properties")
  await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible()
  await page.getByTestId("admin-entity-row--properties--1001").click()
  await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible()
  await page.getByTestId("panda-properties-form-tab-trigger--buyers").click({ timeout: 20_000 })
  const buyersTab = page.getByTestId("panda-properties-form-tab--buyers")
  await expect(buyersTab).toBeVisible()
  await expect(buyersTab.getByTestId("property-buyers-panel-add-new")).toBeEnabled({ timeout: 10_000 })
  await buyersTab.getByTestId("property-buyer-owner-row-open-profile--501").click()
  const dlg = page.getByTestId("admin-entity-crud-dialog--entities")
  await expect(dlg).toBeVisible()
  await dlg.evaluate((el) => el.scrollTo(0, el.scrollHeight))
  return dlg
}

// Re-export for use in the single-connection override test
export { EMPTY_PROPERTY_ENTITIES_RESPONSE } from "./admin-properties-mocks"
