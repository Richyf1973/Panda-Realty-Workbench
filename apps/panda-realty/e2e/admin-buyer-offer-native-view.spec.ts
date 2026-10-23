import { expect, test, type Route } from "@playwright/test"

import { e2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import {
  BUYER_PANEL_ITEMS_RESPONSE_1001,
  EMPTY_PROPERTY_ENTITIES_RESPONSE,
  PROPERTY_EDIT_WITH_BUYER,
  SINGLE_PROPERTY_RESPONSE,
  STATUS_LIST_RESPONSE,
} from "./helpers/admin-properties-mocks"

// ─── Mock data ────────────────────────────────────────────────────────────────

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
  depositInitial: "2000",
  depositBalance: "18000",
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
  settlementPeriod: "60",
  settlementDate: null,
}

const BUYER_OFFERS_WITH_TOKEN = {
  propertyListId: 1001,
  contractDate: null,
  offerFormToken: "testtoken501",
  offers: [OFFER_9001],
}

const BUYER_OFFERS_NO_TOKEN = {
  propertyListId: 1001,
  contractDate: null,
  offerFormToken: null,
  offers: [OFFER_9001],
}

const OFFER_FORM_PREFILL = {
  propertyAddress: "12 Test Street, Testville, QLD, 4000",
  buyers: [{ name: "Test Buyer", phone: "0400 000 000", email: "buyer@test.com", address: "1 Buyer Rd" }],
  rep: null,
  solicitorName: "Jane Solicitor",
  solicitorPhone: "0411 111 111",
  solicitorAddress: "5 Law St",
  solicitorEmail: "jane@lawfirm.com",
  offerAmount: "750000",
  depositInitial: "2000",
  depositBalance: "18000",
  isCashOffer: false,
  waiveCoolingOff: false,
  isSubjectToFinance: false,
  settlementPeriod: "60",
  viewMode: true,
}

const OFFER_FORM_PREFILL_NO_SOLICITOR = {
  ...OFFER_FORM_PREFILL,
  solicitorName: null,
  solicitorPhone: null,
  solicitorAddress: null,
  solicitorEmail: null,
}

const OFFER_FORM_STATUS_RESPONSE = {
  token: "testtoken501",
  formUrl: "http://localhost:3014/offer-form/testtoken501",
  propertyAddress: "12 Test Street, Testville, QLD, 4000",
  entityEmail: "buyer@test.com",
  submission: null,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

async function setupNativeViewRoutes(
  page: Parameters<typeof signInAsAdmin>[0],
  prefill: Record<string, unknown> = OFFER_FORM_PREFILL,
) {
  await page.route("**/api/admin/property-entities/501/buyer-offers**", async (route: Route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(BUYER_OFFERS_WITH_TOKEN) })
  })
  await page.route("**/api/admin/property-entities/501/offer-form-status**", async (route: Route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(OFFER_FORM_STATUS_RESPONSE) })
  })
  await page.route("**/api/offer-form/testtoken501**", async (route: Route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(prefill) })
  })
}

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

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe("Buyer offer dialog — native admin view panel (mocked APIs)", () => {
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

  // ── Happy path ──────────────────────────────────────────────────────────────

  test("View Form button is shown on each offer row when offerFormToken is present", async ({ page }) => {
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

  test("clicking View Form renders the native admin panel (not the white OfferFormClient)", async ({ page }) => {
    await setupPropertyRoutes(page)
    await setupNativeViewRoutes(page)

    await openOffersDialog(page)

    const dialog = page.getByTestId("property-buyer-panel-offers-dialog")
    await dialog.getByTestId("buyer-offer-conditions-toggle--9001").click()

    // Native panel must appear
    await expect(dialog.getByTestId("buyer-offer-native-view--9001")).toBeVisible({ timeout: 10_000 })

    // The old white OfferFormClient must NOT be rendered
    await expect(dialog.getByTestId("offer-form-page")).not.toBeVisible()
  })

  test("native panel shows property address from prefill", async ({ page }) => {
    await setupPropertyRoutes(page)
    await setupNativeViewRoutes(page)

    await openOffersDialog(page)
    const dialog = page.getByTestId("property-buyer-panel-offers-dialog")
    await dialog.getByTestId("buyer-offer-conditions-toggle--9001").click()

    const panel = dialog.getByTestId("buyer-offer-native-view--9001")
    await expect(panel).toBeVisible({ timeout: 10_000 })
    await expect(panel.getByTestId("buyer-offer-native--property-address")).toHaveValue("12 Test Street, Testville, QLD, 4000")
  })

  test("native panel shows buyer name from prefill", async ({ page }) => {
    await setupPropertyRoutes(page)
    await setupNativeViewRoutes(page)

    await openOffersDialog(page)
    const dialog = page.getByTestId("property-buyer-panel-offers-dialog")
    await dialog.getByTestId("buyer-offer-conditions-toggle--9001").click()

    const panel = dialog.getByTestId("buyer-offer-native-view--9001")
    await expect(panel).toBeVisible({ timeout: 10_000 })
    await expect(panel.getByTestId("buyer-offer-native--buyer-1-name")).toHaveValue("Test Buyer")
  })

  test("native panel shows solicitor details from prefill", async ({ page }) => {
    await setupPropertyRoutes(page)
    await setupNativeViewRoutes(page)

    await openOffersDialog(page)
    const dialog = page.getByTestId("property-buyer-panel-offers-dialog")
    await dialog.getByTestId("buyer-offer-conditions-toggle--9001").click()

    const panel = dialog.getByTestId("buyer-offer-native-view--9001")
    await expect(panel).toBeVisible({ timeout: 10_000 })
    await expect(panel.getByTestId("buyer-offer-native--solicitor-name")).toHaveValue("Jane Solicitor")
  })

  test("native panel shows offer amount and deposits", async ({ page }) => {
    await setupPropertyRoutes(page)
    await setupNativeViewRoutes(page)

    await openOffersDialog(page)
    const dialog = page.getByTestId("property-buyer-panel-offers-dialog")
    await dialog.getByTestId("buyer-offer-conditions-toggle--9001").click()

    const panel = dialog.getByTestId("buyer-offer-native-view--9001")
    await expect(panel).toBeVisible({ timeout: 10_000 })
    await expect(panel.getByTestId("buyer-offer-native--offer-amount")).toHaveValue("750000")
    await expect(panel.getByTestId("buyer-offer-native--initial-payment")).toHaveValue("2000")
    await expect(panel.getByTestId("buyer-offer-native--second-payment")).toHaveValue("18000")
  })

  test("native panel does NOT contain a submit button", async ({ page }) => {
    await setupPropertyRoutes(page)
    await setupNativeViewRoutes(page)

    await openOffersDialog(page)
    const dialog = page.getByTestId("property-buyer-panel-offers-dialog")
    await dialog.getByTestId("buyer-offer-conditions-toggle--9001").click()

    await expect(dialog.getByTestId("buyer-offer-native-view--9001")).toBeVisible({ timeout: 10_000 })
    // Neither the old form submit nor any "Submit Offer" text should exist
    await expect(dialog.getByTestId("offer-form-submit")).not.toBeVisible()
    await expect(dialog.getByText(/submit offer/i)).not.toBeVisible()
  })

  test("native panel does NOT contain a signatures section", async ({ page }) => {
    await setupPropertyRoutes(page)
    await setupNativeViewRoutes(page)

    await openOffersDialog(page)
    const dialog = page.getByTestId("property-buyer-panel-offers-dialog")
    await dialog.getByTestId("buyer-offer-conditions-toggle--9001").click()

    await expect(dialog.getByTestId("buyer-offer-native-view--9001")).toBeVisible({ timeout: 10_000 })
    await expect(dialog.getByText(/signatures/i)).not.toBeVisible()
  })

  test("clicking Hide Form collapses the native panel", async ({ page }) => {
    await setupPropertyRoutes(page)
    await setupNativeViewRoutes(page)

    await openOffersDialog(page)
    const dialog = page.getByTestId("property-buyer-panel-offers-dialog")
    const toggleBtn = dialog.getByTestId("buyer-offer-conditions-toggle--9001")

    await toggleBtn.click()
    await expect(dialog.getByTestId("buyer-offer-native-view--9001")).toBeVisible({ timeout: 10_000 })

    await toggleBtn.click()
    await expect(dialog.getByTestId("buyer-offer-native-view--9001")).not.toBeVisible()
    await expect(toggleBtn).toContainText("View Form")
  })

  test("View ↗ external link is present on each offer row", async ({ page }) => {
    await setupPropertyRoutes(page)
    await page.route("**/api/admin/property-entities/501/buyer-offers**", async (route: Route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(BUYER_OFFERS_WITH_TOKEN) })
    })
    await page.route("**/api/admin/property-entities/501/offer-form-status**", async (route: Route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(OFFER_FORM_STATUS_RESPONSE) })
    })

    await openOffersDialog(page)
    const dialog = page.getByTestId("property-buyer-panel-offers-dialog")
    await expect(dialog.getByTestId("offers-row-view-btn--9001")).toBeVisible()
  })

  // ── Edge cases ──────────────────────────────────────────────────────────────

  test("native panel handles empty solicitor gracefully (no crash)", async ({ page }) => {
    await setupPropertyRoutes(page)
    await setupNativeViewRoutes(page, OFFER_FORM_PREFILL_NO_SOLICITOR)

    await openOffersDialog(page)
    const dialog = page.getByTestId("property-buyer-panel-offers-dialog")
    await dialog.getByTestId("buyer-offer-conditions-toggle--9001").click()

    const panel = dialog.getByTestId("buyer-offer-native-view--9001")
    await expect(panel).toBeVisible({ timeout: 10_000 })
    // Still shows other sections without crashing
    await expect(panel.getByTestId("buyer-offer-native--buyer-1-name")).toHaveValue("Test Buyer")
    await expect(panel.getByTestId("buyer-offer-native--offer-amount")).toHaveValue("750000")
  })

  test("fallback: when offerFormToken is null, old Conditions toggle is shown (not native panel)", async ({ page }) => {
    await setupPropertyRoutes(page)
    await page.route("**/api/admin/property-entities/501/buyer-offers**", async (route: Route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(BUYER_OFFERS_NO_TOKEN) })
    })
    await page.route("**/api/admin/property-entities/501/offer-form-status**", async (route: Route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ...OFFER_FORM_STATUS_RESPONSE, token: null }) })
    })

    await openOffersDialog(page)
    const dialog = page.getByTestId("property-buyer-panel-offers-dialog")
    const toggleBtn = dialog.getByTestId("buyer-offer-conditions-toggle--9001")
    await expect(toggleBtn).toBeVisible()
    await expect(toggleBtn).not.toContainText("View Form")
  })

  // ── Error state ─────────────────────────────────────────────────────────────

  test("native panel shows inline error when token API returns 500", async ({ page }) => {
    await setupPropertyRoutes(page)
    await page.route("**/api/admin/property-entities/501/buyer-offers**", async (route: Route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(BUYER_OFFERS_WITH_TOKEN) })
    })
    await page.route("**/api/admin/property-entities/501/offer-form-status**", async (route: Route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(OFFER_FORM_STATUS_RESPONSE) })
    })
    await page.route("**/api/offer-form/testtoken501**", async (route: Route) => {
      await route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "Server error" }) })
    })

    await openOffersDialog(page)
    const dialog = page.getByTestId("property-buyer-panel-offers-dialog")
    await dialog.getByTestId("buyer-offer-conditions-toggle--9001").click()

    // Should show an error message — no white crash screen
    await expect(dialog.getByTestId("buyer-offer-native-view-error--9001")).toBeVisible({ timeout: 10_000 })
    // The old OfferFormClient must not appear
    await expect(dialog.getByTestId("offer-form-page")).not.toBeVisible()
  })
})
