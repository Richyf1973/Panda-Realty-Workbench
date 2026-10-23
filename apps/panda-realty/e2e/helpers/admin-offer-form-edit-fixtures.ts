import { expect, type Page, type Route } from "@playwright/test"

import {
  EMPTY_PROPERTY_ENTITIES_RESPONSE,
  PROPERTY_EDIT_WITH_BUYER,
  SINGLE_PROPERTY_RESPONSE,
} from "./admin-properties-mocks"

// ── Shared offer fixtures ────────────────────────────────────────────────────

export const BASE_OFFER = {
  isAccepted: false,
  dateOffered: "2026-05-22",
  createdAt: "2026-05-22T00:00:00Z",
  isCashOffer: false,
  noConditions: false,
  coolingOffDays: null,
  financeDays: null,
  buildingPestDays: null,
  dueDiligenceDays: null,
  subjectToSaleDays: null,
  subjectToSaleStage: null,
  subjectToSaleAddress: null,
  memberPropertyToSellAddress: null,
  saleOfPropertyDays: null,
  unconditionalContractDays: null,
  depositInitial: "20000",
  depositBalance: "80000",
  otherConditions: null,
  customConditions: null,
  conditionNotes: null,
  waiveCoolingOff: false,
  isSubjectToFinance: false,
  financePreApproved: null,
  financeBank: null,
  financeBankContactName: null,
  financeBankContactPhone: null,
  financeBankContactEmail: null,
  suggestBuildingCompanies: null,
  isSubjectToSale: false,
  saleDaysBeforeListingLive: null,
  saleIsUnconditional: null,
  saleUnconditionalDate: null,
  saleBuyerSettlementDate: null,
  saleActiveConditions: null,
  saleFreeAppraisal: null,
  settlementPeriod: "30",
}

export const OFFER_EDITABLE = {
  ...BASE_OFFER,
  buyerOfferId: 8001,
  entityName: "Alpha Buyer",
  offer: "1200000",
  propertyEntityId: 601,
  offerFormToken: "edit-token-abc",
}

export const OFFER_ACCEPTED = {
  ...BASE_OFFER,
  buyerOfferId: 8002,
  entityName: "Alpha Buyer",
  offer: "1200000",
  isAccepted: true,
  propertyEntityId: 601,
  offerFormToken: "edit-token-abc",
}

export const OFFER_SECOND = {
  ...BASE_OFFER,
  buyerOfferId: 8003,
  entityName: "Beta Buyer",
  offer: "950000",
  propertyEntityId: 602,
  offerFormToken: "edit-token-xyz",
}

// ── Shared prefill fixtures ──────────────────────────────────────────────────

export const PREFILL_8001: Record<string, unknown> = {
  propertyAddress: "12 Test Street, Testville QLD 4000",
  buyers: [
    { name: "Alice Smith", phone: "0400 111 111", email: "alice@test.com", address: "1 Alice St" },
  ],
  rep: null,
  solicitorName: "Joe Solicitor",
  solicitorPhone: "07 3333 4444",
  solicitorAddress: "5 Law St",
  solicitorEmail: "joe@solicitor.com",
  offerAmount: "1200000",
  depositInitial: "20000",
  depositBalance: "80000",
  isCashOffer: false,
  waiveCoolingOff: false,
  isSubjectToFinance: false,
  buildingPestDays: null,
  isSubjectToSale: false,
  settlementPeriod: "30",
  conditionNotes: "",
}

export const PREFILL_8003: Record<string, unknown> = {
  propertyAddress: "12 Test Street, Testville QLD 4000",
  buyers: [
    { name: "Bob Jones", phone: "0400 222 222", email: "bob@test.com", address: "2 Bob St" },
  ],
  rep: null,
  solicitorName: null,
  solicitorPhone: null,
  solicitorAddress: null,
  solicitorEmail: null,
  offerAmount: "950000",
  depositInitial: "20000",
  depositBalance: "80000",
  isCashOffer: false,
  waiveCoolingOff: false,
  isSubjectToFinance: false,
  buildingPestDays: null,
  isSubjectToSale: false,
  settlementPeriod: "30",
  conditionNotes: "",
}

// ── Test helpers ─────────────────────────────────────────────────────────────

export async function openSalesTab(
  page: Page,
  offers: unknown[],
  propertyEntityOverride?: (url: string) => unknown | null,
) {
  await page.route("**/api/admin/properties**", async (route: Route) => {
    const url = route.request().url()
    if (url.includes("/buyer-offers") && route.request().method() === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(offers) })
      return
    }
    if (url.match(/\/api\/admin\/properties\/1001(\?|$)/)) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(PROPERTY_EDIT_WITH_BUYER) })
      return
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ...SINGLE_PROPERTY_RESPONSE, items: [{ ...PROPERTY_EDIT_WITH_BUYER }] }),
    })
  })
  await page.route("**/api/admin/property-entities**", async (route: Route) => {
    if (propertyEntityOverride) {
      const url = route.request().url()
      const result = propertyEntityOverride(url)
      if (result !== null && result !== undefined) {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(result) })
        return
      }
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_PROPERTY_ENTITIES_RESPONSE) })
  })

  await page.goto("/admin/properties")
  await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible()
  await page.getByTestId("admin-entity-row--properties--1001").click()
  await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible()
  await page.getByTestId("panda-properties-form-tab-trigger--sales").click()
  await expect(page.getByTestId("panda-properties-form-tab--sales")).toBeVisible()
}

export async function routePrefillForOffer(
  page: Page,
  token: string,
  prefill: Record<string, unknown>,
) {
  await page.route(`**/api/offer-form/${token}**`, async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(prefill) })
  })
}

export async function routeAdminFormView(
  page: Page,
  offerId: number,
  prefill: Record<string, unknown>,
) {
  await page.route(`**/api/admin/buyer-offers/${offerId}/form-view`, async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(prefill) })
  })
}

export async function openSalesTabWithOfferFormStatus(
  page: Page,
  offers: unknown[],
  propertyEntityId: number,
  offerFormStatus: unknown,
) {
  await openSalesTab(page, offers, (url) => {
    if (url.includes(`/${propertyEntityId}/offer-form-status`)) return offerFormStatus
    return null
  })
}
