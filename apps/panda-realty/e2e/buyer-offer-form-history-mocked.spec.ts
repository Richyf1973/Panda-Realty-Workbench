/**
 * E2E: Buyer offer form history — UI verification with mocked APIs
 *
 * Covers: refresh button visibility and behavior, missing detail fields rendered
 * in offer rows, View Submission panel showing latest amount, all historical rows visible.
 *
 * Requires: E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD
 */

import { expect, test, type Page, type Route } from "@playwright/test"

import { e2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import {
  BUYER_PANEL_ITEMS_RESPONSE_1001,
  EMPTY_PROPERTY_ENTITIES_RESPONSE,
  PROPERTY_EDIT_WITH_BUYER,
  SINGLE_PROPERTY_RESPONSE,
  STATUS_LIST_RESPONSE,
} from "./helpers/admin-properties-mocks"
import {
  OFFER_FORM_STATUS_NOT_SUBMITTED,
  OFFER_FORM_STATUS_SUBMITTED,
  OFFER_FORM_SUBMISSION,
} from "./helpers/offer-form-section-mocks"

// ── Shared mock payloads ──────────────────────────────────────────────────────

const BASE_OFFER = {
  buyerOfferId: 9001,
  offer: "900000",
  isAccepted: false,
  dateOffered: "2026-05-21",
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
}

const OFFER_WITH_DETAIL = {
  ...BASE_OFFER,
  buyerOfferId: 9002,
  offer: "949000",
  settlementPeriod: "42 days",
  waiveCoolingOff: true,
  isSubjectToFinance: true,
  financeBank: "CBA",
}

const OFFERS_RESPONSE_ONE = { propertyListId: 1001, contractDate: null, offers: [BASE_OFFER] }
const OFFERS_RESPONSE_TWO = {
  propertyListId: 1001,
  contractDate: null,
  offers: [OFFER_WITH_DETAIL, BASE_OFFER],
}

// ── Route installer helpers ───────────────────────────────────────────────────

async function installPropertyRoutes(page: Page): Promise<void> {
  await page.route("**/api/admin/property-status**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(STATUS_LIST_RESPONSE) })
  })
  await page.route("**/api/admin/buyer-status**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [] }) })
  })
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

async function openBuyersTab(page: Page): Promise<void> {
  await page.goto("/admin/properties")
  await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible()
  await page.getByTestId("admin-entity-row--properties--1001").click()
  await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible()
  await page.getByTestId("panda-properties-form-tab-trigger--buyers").click()
  await expect(page.getByTestId("panda-properties-form-tab--buyers")).toBeVisible()
  await expect(page.getByTestId("property-buyers-panel-add-new")).toBeEnabled({ timeout: 10_000 })
}

async function openOffersDialog(page: Page): Promise<void> {
  await openBuyersTab(page)
  await page.getByTestId("property-buyer-owner-row-offers--501").click()
  await expect(page.getByTestId("property-buyer-panel-offers-dialog")).toBeVisible()
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe("Buyer offer form history — UI (mocked APIs)", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")
    await signInAsAdmin(page)
    await installPropertyRoutes(page)
  })

  test("Refresh button is visible in the offers table header", async ({ page }) => {
    await page.route("**/api/admin/property-entities/501/buyer-offers**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(OFFERS_RESPONSE_ONE) })
    })
    await page.route("**/api/admin/property-entities/501/offer-form-status**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(OFFER_FORM_STATUS_NOT_SUBMITTED) })
    })
    await openOffersDialog(page)
    const dialog = page.getByTestId("property-buyer-panel-offers-dialog")
    await expect(dialog.getByTestId("buyer-offers-panel-refresh-btn")).toBeVisible()
  })

  test("Clicking Refresh reloads the offers table with updated data", async ({ page }) => {
    let callCount = 0
    await page.route("**/api/admin/property-entities/501/buyer-offers**", async (route) => {
      callCount++
      const response = callCount === 1 ? OFFERS_RESPONSE_ONE : OFFERS_RESPONSE_TWO
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(response) })
    })
    await page.route("**/api/admin/property-entities/501/offer-form-status**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(OFFER_FORM_STATUS_NOT_SUBMITTED) })
    })
    await openOffersDialog(page)
    const dialog = page.getByTestId("property-buyer-panel-offers-dialog")

    await expect(dialog.getByTestId("offers-tab-table")).toContainText("900,000")
    await expect(dialog.getByTestId(/^offers-row--9001/)).toBeVisible()

    await dialog.getByTestId("buyer-offers-panel-refresh-btn").click()
    await expect(dialog.getByTestId(/^offers-row--9002/)).toBeVisible({ timeout: 8_000 })
    await expect(dialog.getByTestId("offers-tab-table")).toContainText("949,000")
    await expect(dialog.getByTestId(/^offers-row--9001/)).toBeVisible()
  })

  test("Offer row renders settlementPeriod sub-line when present", async ({ page }) => {
    await page.route("**/api/admin/property-entities/501/buyer-offers**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
        propertyListId: 1001, contractDate: null, offers: [OFFER_WITH_DETAIL],
      }) })
    })
    await page.route("**/api/admin/property-entities/501/offer-form-status**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(OFFER_FORM_STATUS_NOT_SUBMITTED) })
    })
    await openOffersDialog(page)
    const dialog = page.getByTestId("property-buyer-panel-offers-dialog")
    await expect(dialog.getByTestId("offers-tab-table")).toBeVisible()
    await expect(dialog).toContainText("Settlement:")
    await expect(dialog).toContainText("42 days")
  })

  test("Offer row renders Cooling off waived sub-line when waiveCoolingOff is set", async ({ page }) => {
    await page.route("**/api/admin/property-entities/501/buyer-offers**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
        propertyListId: 1001, contractDate: null, offers: [{ ...OFFER_WITH_DETAIL, waiveCoolingOff: true }],
      }) })
    })
    await page.route("**/api/admin/property-entities/501/offer-form-status**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(OFFER_FORM_STATUS_NOT_SUBMITTED) })
    })
    await openOffersDialog(page)
    const dialog = page.getByTestId("property-buyer-panel-offers-dialog")
    await expect(dialog.getByTestId("offers-tab-table")).toBeVisible()
    await expect(dialog).toContainText("Cooling off waived:")
    await expect(dialog).toContainText("Yes")
  })

  test("Offer row renders finance bank sub-line when isSubjectToFinance and bank are set", async ({ page }) => {
    await page.route("**/api/admin/property-entities/501/buyer-offers**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
        propertyListId: 1001, contractDate: null, offers: [{ ...OFFER_WITH_DETAIL, isSubjectToFinance: true, financeBank: "CBA" }],
      }) })
    })
    await page.route("**/api/admin/property-entities/501/offer-form-status**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(OFFER_FORM_STATUS_NOT_SUBMITTED) })
    })
    await openOffersDialog(page)
    const dialog = page.getByTestId("property-buyer-panel-offers-dialog")
    await expect(dialog.getByTestId("offers-tab-table")).toBeVisible()
    await expect(dialog).toContainText("Bank:")
    await expect(dialog).toContainText("CBA")
  })

  test("View Submission panel shows the latest final submission amount (not a stale one)", async ({ page }) => {
    const latestSubmission = {
      ...OFFER_FORM_SUBMISSION,
      offerAmount: "949000",
      submittedAt: "2026-05-21T10:00:00.000Z",
    }
    await page.route("**/api/admin/property-entities/501/buyer-offers**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(OFFERS_RESPONSE_ONE) })
    })
    await page.route("**/api/admin/property-entities/501/offer-form-status**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
        ...OFFER_FORM_STATUS_SUBMITTED,
        submission: latestSubmission,
      }) })
    })
    await openOffersDialog(page)
    const dialog = page.getByTestId("property-buyer-panel-offers-dialog")

    await dialog.getByTestId("buyer-offer-form-view-submission--501").click()
    const submissionPanel = dialog.getByTestId("buyer-offer-form-submission-panel--501")
    await expect(submissionPanel).toBeVisible()
    await expect(submissionPanel).toContainText("$949000")
  })

  test("All historical offer rows are visible (not collapsed or hidden)", async ({ page }) => {
    const threeOffers = [
      { ...BASE_OFFER, buyerOfferId: 9003, offer: "1000000" },
      { ...BASE_OFFER, buyerOfferId: 9002, offer: "950000" },
      { ...BASE_OFFER, buyerOfferId: 9001, offer: "900000" },
    ]
    await page.route("**/api/admin/property-entities/501/buyer-offers**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
        propertyListId: 1001, contractDate: null, offers: threeOffers,
      }) })
    })
    await page.route("**/api/admin/property-entities/501/offer-form-status**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(OFFER_FORM_STATUS_NOT_SUBMITTED) })
    })
    await openOffersDialog(page)
    const dialog = page.getByTestId("property-buyer-panel-offers-dialog")
    await expect(dialog.getByTestId("offers-tab-table")).toBeVisible()
    await expect(dialog.getByTestId(/^offers-row--9001/)).toBeVisible()
    await expect(dialog.getByTestId(/^offers-row--9002/)).toBeVisible()
    await expect(dialog.getByTestId(/^offers-row--9003/)).toBeVisible()
    await expect(dialog.getByTestId("offers-tab-table")).toContainText("1,000,000")
    await expect(dialog.getByTestId("offers-tab-table")).toContainText("950,000")
    await expect(dialog.getByTestId("offers-tab-table")).toContainText("900,000")
  })
})

test.describe("Cooling off waived behaviour (mocked APIs)", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")
    await signInAsAdmin(page)
    await installPropertyRoutes(page)
  })

  async function installOffersAndOpen(page: Page, offers: object[]): Promise<ReturnType<Page["getByTestId"]>> {
    await page.route("**/api/admin/property-entities/501/buyer-offers**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ propertyListId: 1001, contractDate: null, offers }) })
    })
    await page.route("**/api/admin/property-entities/501/offer-form-status**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(OFFER_FORM_STATUS_NOT_SUBMITTED) })
    })
    await openOffersDialog(page)
    return page.getByTestId("property-buyer-panel-offers-dialog")
  }

  test("row summary shows 'Cooling off waived: Yes' when waiveCoolingOff is true", async ({ page }) => {
    const dialog = await installOffersAndOpen(page, [{ ...OFFER_WITH_DETAIL, waiveCoolingOff: true }])
    await expect(dialog).toContainText("Cooling off waived:")
    await expect(dialog).toContainText("Yes")
  })

  test("row summary does NOT show 'Cooling off waived' label when waiveCoolingOff is false", async ({ page }) => {
    const dialog = await installOffersAndOpen(page, [{ ...BASE_OFFER, waiveCoolingOff: false }])
    await expect(dialog.getByTestId("offers-tab-table")).toBeVisible()
    await expect(dialog).not.toContainText("Cooling off waived:")
  })

  test("row summary does NOT show 'Cooling off waived' label when waiveCoolingOff is null", async ({ page }) => {
    const dialog = await installOffersAndOpen(page, [{ ...BASE_OFFER, waiveCoolingOff: null }])
    await expect(dialog.getByTestId("offers-tab-table")).toBeVisible()
    await expect(dialog).not.toContainText("Cooling off waived:")
  })

  test("conditions panel: cooling off field is disabled and shows 0 when waiveCoolingOff is true", async ({ page }) => {
    const offerId = OFFER_WITH_DETAIL.buyerOfferId
    const dialog = await installOffersAndOpen(page, [{ ...OFFER_WITH_DETAIL, waiveCoolingOff: true, coolingOffDays: null }])
    await dialog.getByTestId(`buyer-offer-conditions-toggle--${offerId}`).click()
    const coolingOffInput = dialog.getByTestId(`offer-conditions-days-input--cooling-off--${offerId}`)
    await expect(coolingOffInput).toBeVisible()
    await expect(coolingOffInput).toBeDisabled()
    await expect(coolingOffInput).toHaveValue("0")
  })

  test("conditions panel: shows a note near cooling off field when waiveCoolingOff is true", async ({ page }) => {
    const offerId = OFFER_WITH_DETAIL.buyerOfferId
    const dialog = await installOffersAndOpen(page, [{ ...OFFER_WITH_DETAIL, waiveCoolingOff: true, coolingOffDays: null }])
    await dialog.getByTestId(`buyer-offer-conditions-toggle--${offerId}`).click()
    const panel = dialog.getByTestId(`offer-conditions-panel--${offerId}`)
    await expect(panel).toContainText("waived")
  })

  test("conditions panel: 'Cooling Off Not Waived' text is NOT shown when waiveCoolingOff is false", async ({ page }) => {
    const offerId = BASE_OFFER.buyerOfferId
    const dialog = await installOffersAndOpen(page, [{ ...BASE_OFFER, waiveCoolingOff: false }])
    await dialog.getByTestId(`buyer-offer-conditions-toggle--${offerId}`).click()
    const panel = dialog.getByTestId(`offer-conditions-panel--${offerId}`)
    await expect(panel).toBeVisible()
    await expect(panel).not.toContainText("Cooling Off Not Waived")
  })

  test("conditions panel: 'Cooling Off Waived' text IS shown in Form Conditions when waiveCoolingOff is true", async ({ page }) => {
    const offerId = OFFER_WITH_DETAIL.buyerOfferId
    const dialog = await installOffersAndOpen(page, [{ ...OFFER_WITH_DETAIL, waiveCoolingOff: true }])
    await dialog.getByTestId(`buyer-offer-conditions-toggle--${offerId}`).click()
    const panel = dialog.getByTestId(`offer-conditions-panel--${offerId}`)
    await expect(panel).toContainText("Cooling Off Waived")
  })

  test("conditions panel: cooling off field is editable when waiveCoolingOff is false", async ({ page }) => {
    const offerId = BASE_OFFER.buyerOfferId
    const dialog = await installOffersAndOpen(page, [{ ...BASE_OFFER, waiveCoolingOff: false }])
    await dialog.getByTestId(`buyer-offer-conditions-toggle--${offerId}`).click()
    const coolingOffInput = dialog.getByTestId(`offer-conditions-days-input--cooling-off--${offerId}`)
    await expect(coolingOffInput).toBeVisible()
    await expect(coolingOffInput).not.toBeDisabled()
  })
})
