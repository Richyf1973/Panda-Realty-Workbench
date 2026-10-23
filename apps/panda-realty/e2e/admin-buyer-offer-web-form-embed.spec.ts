import { expect, test, type Route } from "@playwright/test"

import { e2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import {
  BUYER_PANEL_ITEMS_RESPONSE_1001,
  EMPTY_PROPERTY_ENTITIES_RESPONSE,
  PROPERTY_EDIT_WITH_BUYER,
  SINGLE_PROPERTY_RESPONSE,
  STATUS_LIST_RESPONSE,
} from "./helpers/admin-properties-mocks"

const OFFER_9001 = {
  buyerOfferId: 9001,
  offer: "750000",
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
}

// Response that includes an offerFormToken — enables the web form embed
const BUYER_OFFERS_WITH_TOKEN = {
  propertyListId: 1001,
  contractDate: null,
  offerFormToken: "testtoken501",
  offers: [OFFER_9001],
}

// Response with no offerFormToken — fallback path (old Conditions panel)
const BUYER_OFFERS_NO_TOKEN = {
  propertyListId: 1001,
  contractDate: null,
  offerFormToken: null,
  offers: [OFFER_9001],
}

const OFFER_FORM_STATUS_RESPONSE = {
  token: "testtoken501",
  formUrl: "http://localhost:3014/offer-form/testtoken501",
  propertyAddress: "12 Test Street, Testville, QLD, 4000",
  entityEmail: "buyer@test.com",
  submission: null,
}

// Sets up base property routes (general — must be registered before specific overrides)
async function setupPropertyRoutes(page: Parameters<typeof signInAsAdmin>[0]) {
  await page.route("**/api/admin/properties**", async (route: Route) => {
    const url = route.request().url()
    if (url.match(/\/api\/admin\/properties\/1001\/buyers(\?|$)/)) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(BUYER_PANEL_ITEMS_RESPONSE_1001) })
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
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_PROPERTY_ENTITIES_RESPONSE) })
  })
}

// Pure navigation helper — no route setup (caller must register all routes first)
async function openOffersDialog(page: Parameters<typeof signInAsAdmin>[0]) {
  await page.goto("/admin/properties")
  await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible()
  await page.getByTestId("admin-entity-row--properties--1001").click()
  await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible()
  await page.getByTestId("panda-properties-form-tab-trigger--buyers").click()
  await expect(page.getByTestId("panda-properties-form-tab--buyers")).toBeVisible()
  await expect(page.getByTestId("property-buyers-panel-add-new")).toBeEnabled({ timeout: 10_000 })
  await page.getByTestId("property-buyer-owner-row-offers--501").click()
  await expect(page.getByTestId("property-buyer-panel-offers-dialog")).toBeVisible()
}

test.describe("Buyer offer dialog — web form embed (mocked APIs)", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")
    await page.route("**/api/admin/property-status**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(STATUS_LIST_RESPONSE) })
    })
    await page.route("**/api/admin/buyer-status**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [] }) })
    })
    await signInAsAdmin(page)
  })

  test("View Form button is shown on each offer row when offerFormToken is present", async ({ page }) => {
    // General routes first, then specific overrides (LIFO — specific registered last takes precedence)
    await setupPropertyRoutes(page)
    await page.route("**/api/admin/property-entities/501/buyer-offers**", async (route: Route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(BUYER_OFFERS_WITH_TOKEN) })
    })
    await page.route("**/api/admin/property-entities/501/offer-form-status**", async (route: Route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(OFFER_FORM_STATUS_RESPONSE) })
    })

    await openOffersDialog(page)

    const dialog = page.getByTestId("property-buyer-panel-offers-dialog")
    await expect(dialog.getByTestId("offers-row--9001")).toBeVisible()
    const toggleBtn = dialog.getByTestId("buyer-offer-conditions-toggle--9001")
    await expect(toggleBtn).toBeVisible()
    await expect(toggleBtn).toContainText("View Form")
  })

  // Tests for expand/collapse, pre-fill data display, and error states are now in
  // admin-buyer-offer-native-view.spec.ts (native admin panel replaced OfferFormClient embed).

  test("View ↗ link is still present on offer rows when token exists", async ({ page }) => {
    await setupPropertyRoutes(page)
    await page.route("**/api/admin/property-entities/501/buyer-offers**", async (route: Route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(BUYER_OFFERS_WITH_TOKEN) })
    })
    await page.route("**/api/admin/property-entities/501/offer-form-status**", async (route: Route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(OFFER_FORM_STATUS_RESPONSE) })
    })

    await openOffersDialog(page)

    const dialog = page.getByTestId("property-buyer-panel-offers-dialog")
    await expect(dialog.getByTestId("offers-row--9001")).toBeVisible()
    await expect(dialog.getByTestId("offers-row-view-btn--9001")).toBeVisible()
  })

  test("fallback: when offerFormToken is null, old Conditions toggle is shown", async ({ page }) => {
    await setupPropertyRoutes(page)
    await page.route("**/api/admin/property-entities/501/buyer-offers**", async (route: Route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(BUYER_OFFERS_NO_TOKEN) })
    })
    await page.route("**/api/admin/property-entities/501/offer-form-status**", async (route: Route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ...OFFER_FORM_STATUS_RESPONSE, token: null }) })
    })

    await openOffersDialog(page)

    const dialog = page.getByTestId("property-buyer-panel-offers-dialog")
    await expect(dialog.getByTestId("offers-row--9001")).toBeVisible()
    const toggleBtn = dialog.getByTestId("buyer-offer-conditions-toggle--9001")
    await expect(toggleBtn).toBeVisible()
    // Without a token, the old label is shown (not "View Form")
    await expect(toggleBtn).not.toContainText("View Form")
  })
})
