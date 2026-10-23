import { expect, test, type Route } from "@playwright/test"

import { e2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import {
  EMPTY_PROPERTY_ENTITIES_RESPONSE,
  PROPERTY_EDIT_WITH_BUYER,
  SINGLE_PROPERTY_RESPONSE,
  STATUS_LIST_RESPONSE,
} from "./helpers/admin-properties-mocks"

// Minimal shared base for BuyerOffer rows returned by /api/admin/properties/[id]/buyer-offers
const BASE_OFFER = {
  isAccepted: false,
  dateOffered: "2026-05-01",
  createdAt: "2026-05-01T00:00:00Z",
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
  depositInitial: null,
  depositBalance: null,
  otherConditions: null,
  customConditions: null,
  conditionNotes: null,
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

const OFFER_WITH_TOKEN = {
  ...BASE_OFFER,
  buyerOfferId: 7001,
  entityName: "Buyer Alpha",
  offer: "1200000",
  propertyEntityId: 501,
  offerFormToken: "test-token-abc",
}

const OFFER_WITHOUT_TOKEN = {
  ...BASE_OFFER,
  buyerOfferId: 7002,
  entityName: "Buyer Beta",
  offer: "950000",
  propertyEntityId: 502,
  offerFormToken: null,
}

const OFFER_ACCEPTED_WITH_TOKEN = {
  ...BASE_OFFER,
  buyerOfferId: 7003,
  entityName: "Buyer Gamma",
  offer: "1100000",
  isAccepted: true,
  propertyEntityId: 503,
  offerFormToken: "test-token-ghi",
}

const OFFER_SECOND_WITH_TOKEN = {
  ...BASE_OFFER,
  buyerOfferId: 7004,
  entityName: "Buyer Delta",
  offer: "880000",
  propertyEntityId: 504,
  offerFormToken: "test-token-xyz",
}

// Minimal PrefillData for BuyerOfferNativeView to render (non-null prefill = fully loaded)
const MOCK_PREFILL_7001 = {
  propertyAddress: "12 Test Street, Testville QLD 4000",
  buyers: [{ name: "Buyer Alpha", phone: "0400 111 111", email: "alpha@test.com", address: "1 Alpha St" }],
  rep: null,
  solicitorName: "Alpha Solicitor",
  solicitorPhone: null,
  solicitorAddress: null,
  solicitorEmail: null,
  offerAmount: "1200000",
}

const MOCK_PREFILL_7004 = {
  propertyAddress: "12 Test Street, Testville QLD 4000",
  buyers: [{ name: "Buyer Delta", phone: "0400 444 444", email: "delta@test.com", address: "4 Delta St" }],
  rep: null,
  solicitorName: null,
  solicitorPhone: null,
  solicitorAddress: null,
  solicitorEmail: null,
  offerAmount: "880000",
}

test.describe("Sales tab — Latest Buyer Offers — View ↗ and View Form ∨ buttons (mocked)", () => {
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

  async function openSalesTab(page: Parameters<typeof signInAsAdmin>[0], offers: unknown[]) {
    await page.route("**/api/admin/properties**", async (route: Route) => {
      const url = route.request().url()
      if (url.includes("/buyer-offers")) {
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
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_PROPERTY_ENTITIES_RESPONSE) })
    })

    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible()
    await page.getByTestId("admin-entity-row--properties--1001").click()
    await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible()
    await page.getByTestId("panda-properties-form-tab-trigger--sales").click()
    await expect(page.getByTestId("panda-properties-form-tab--sales")).toBeVisible()
  }

  // ── Happy path: View ↗ button ─────────────────────────────────────────────

  test("View ↗ button is visible on rows that have an offerFormToken", async ({ page }) => {
    await openSalesTab(page, [OFFER_WITH_TOKEN, OFFER_WITHOUT_TOKEN])

    const section = page.getByTestId("panda-properties-form-section--buyer-offers")
    await expect(section.getByTestId(`panda-properties-buyer-offer-row--${OFFER_WITH_TOKEN.buyerOfferId}`)).toBeVisible()
    await expect(section.getByTestId(`buyer-offer-section-view-btn--${OFFER_WITH_TOKEN.buyerOfferId}`)).toBeVisible()
  })

  test("View ↗ link has correct href (/offer-form/{token}?offerId={id}&view=1) and opens in new tab", async ({ page }) => {
    await openSalesTab(page, [OFFER_WITH_TOKEN])

    const section = page.getByTestId("panda-properties-form-section--buyer-offers")
    const viewLink = section.getByTestId(`buyer-offer-section-view-btn--${OFFER_WITH_TOKEN.buyerOfferId}`)
    await expect(viewLink).toHaveAttribute(
      "href",
      `/offer-form/${OFFER_WITH_TOKEN.offerFormToken}?offerId=${OFFER_WITH_TOKEN.buyerOfferId}&view=1`,
    )
    await expect(viewLink).toHaveAttribute("target", "_blank")
  })

  test("View ↗ links for two rows have distinct hrefs with their respective offerIds", async ({ page }) => {
    await openSalesTab(page, [OFFER_WITH_TOKEN, OFFER_SECOND_WITH_TOKEN])

    const section = page.getByTestId("panda-properties-form-section--buyer-offers")
    await expect(section.getByTestId(`buyer-offer-section-view-btn--${OFFER_WITH_TOKEN.buyerOfferId}`)).toHaveAttribute(
      "href",
      `/offer-form/${OFFER_WITH_TOKEN.offerFormToken}?offerId=${OFFER_WITH_TOKEN.buyerOfferId}&view=1`,
    )
    await expect(section.getByTestId(`buyer-offer-section-view-btn--${OFFER_SECOND_WITH_TOKEN.buyerOfferId}`)).toHaveAttribute(
      "href",
      `/offer-form/${OFFER_SECOND_WITH_TOKEN.offerFormToken}?offerId=${OFFER_SECOND_WITH_TOKEN.buyerOfferId}&view=1`,
    )
  })

  // ── Happy path: View Form ∨ inline expand ─────────────────────────────────

  test("View Form ∨ button expands BuyerOfferNativeView inline below the row", async ({ page }) => {
    await page.route("**/api/offer-form/test-token-abc**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_PREFILL_7001) })
    })
    await openSalesTab(page, [OFFER_WITH_TOKEN])

    const section = page.getByTestId("panda-properties-form-section--buyer-offers")
    const toggleBtn = section.getByTestId(`buyer-offer-section-view-form-btn--${OFFER_WITH_TOKEN.buyerOfferId}`)
    await expect(toggleBtn).toBeVisible()
    await expect(toggleBtn).toContainText("View Form")

    await toggleBtn.click()
    await expect(section.getByTestId(`buyer-offer-native-view--${OFFER_WITH_TOKEN.buyerOfferId}`)).toBeVisible({ timeout: 8_000 })
    await expect(toggleBtn).toContainText("Hide Form")
  })

  test("Hide Form ∧ collapses the native view and reverts button label to View Form ∨", async ({ page }) => {
    await page.route("**/api/offer-form/test-token-abc**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_PREFILL_7001) })
    })
    await openSalesTab(page, [OFFER_WITH_TOKEN])

    const section = page.getByTestId("panda-properties-form-section--buyer-offers")
    const toggleBtn = section.getByTestId(`buyer-offer-section-view-form-btn--${OFFER_WITH_TOKEN.buyerOfferId}`)

    await toggleBtn.click()
    await expect(section.getByTestId(`buyer-offer-native-view--${OFFER_WITH_TOKEN.buyerOfferId}`)).toBeVisible({ timeout: 8_000 })

    await toggleBtn.click()
    await expect(section.getByTestId(`buyer-offer-native-view--${OFFER_WITH_TOKEN.buyerOfferId}`)).not.toBeVisible()
    await expect(toggleBtn).toContainText("View Form")
  })

  test("only one row can be expanded at a time — expanding a second row collapses the first", async ({ page }) => {
    await page.route("**/api/offer-form/test-token-abc**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_PREFILL_7001) })
    })
    await page.route("**/api/offer-form/test-token-xyz**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_PREFILL_7004) })
    })
    await openSalesTab(page, [OFFER_WITH_TOKEN, OFFER_SECOND_WITH_TOKEN])

    const section = page.getByTestId("panda-properties-form-section--buyer-offers")

    await section.getByTestId(`buyer-offer-section-view-form-btn--${OFFER_WITH_TOKEN.buyerOfferId}`).click()
    await expect(section.getByTestId(`buyer-offer-native-view--${OFFER_WITH_TOKEN.buyerOfferId}`)).toBeVisible({ timeout: 8_000 })

    await section.getByTestId(`buyer-offer-section-view-form-btn--${OFFER_SECOND_WITH_TOKEN.buyerOfferId}`).click()
    await expect(section.getByTestId(`buyer-offer-native-view--${OFFER_SECOND_WITH_TOKEN.buyerOfferId}`)).toBeVisible({ timeout: 8_000 })
    await expect(section.getByTestId(`buyer-offer-native-view--${OFFER_WITH_TOKEN.buyerOfferId}`)).not.toBeVisible()
  })

  // ── Edge case: no offerFormToken ──────────────────────────────────────────

  test("rows without offerFormToken do NOT show View ↗ button", async ({ page }) => {
    await openSalesTab(page, [OFFER_WITH_TOKEN, OFFER_WITHOUT_TOKEN])

    const section = page.getByTestId("panda-properties-form-section--buyer-offers")
    await expect(section.getByTestId(`panda-properties-buyer-offer-row--${OFFER_WITHOUT_TOKEN.buyerOfferId}`)).toBeVisible()
    await expect(section.getByTestId(`buyer-offer-section-view-btn--${OFFER_WITHOUT_TOKEN.buyerOfferId}`)).not.toBeVisible()
  })

  test("rows without offerFormToken still show View Form ∨ button (fallback endpoint)", async ({ page }) => {
    await openSalesTab(page, [OFFER_WITH_TOKEN, OFFER_WITHOUT_TOKEN])

    const section = page.getByTestId("panda-properties-form-section--buyer-offers")
    await expect(section.getByTestId(`panda-properties-buyer-offer-row--${OFFER_WITHOUT_TOKEN.buyerOfferId}`)).toBeVisible()
    await expect(section.getByTestId(`buyer-offer-section-view-form-btn--${OFFER_WITHOUT_TOKEN.buyerOfferId}`)).toBeVisible()
  })

  test("row without offerFormToken renders its content normally — no crash, no blank space", async ({ page }) => {
    const consoleErrors: string[] = []
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text())
    })

    await openSalesTab(page, [OFFER_WITHOUT_TOKEN])

    const section = page.getByTestId("panda-properties-form-section--buyer-offers")
    await expect(section.getByTestId(`panda-properties-buyer-offer-row--${OFFER_WITHOUT_TOKEN.buyerOfferId}`)).toBeVisible()
    await expect(section).toContainText(OFFER_WITHOUT_TOKEN.entityName)
    await expect(section).not.toContainText("undefined")

    const uncaught = consoleErrors.filter((e) => e.toLowerCase().includes("uncaught"))
    expect(uncaught).toHaveLength(0)
  })

  // ── Edge case: accepted offer row ─────────────────────────────────────────

  test("offer row shows View ↗ and View Form ∨ buttons when token is present", async ({ page }) => {
    await openSalesTab(page, [{ ...OFFER_ACCEPTED_WITH_TOKEN, isAccepted: false }])

    const section = page.getByTestId("panda-properties-form-section--buyer-offers")
    await expect(section.getByTestId(`panda-properties-buyer-offer-row--${OFFER_ACCEPTED_WITH_TOKEN.buyerOfferId}`)).toBeVisible()
    await expect(section.getByTestId(`buyer-offer-section-view-btn--${OFFER_ACCEPTED_WITH_TOKEN.buyerOfferId}`)).toBeVisible()
    await expect(section.getByTestId(`buyer-offer-section-view-form-btn--${OFFER_ACCEPTED_WITH_TOKEN.buyerOfferId}`)).toBeVisible()
  })

  test("offer View ↗ link has correct href with its own offerId", async ({ page }) => {
    await openSalesTab(page, [{ ...OFFER_ACCEPTED_WITH_TOKEN, isAccepted: false }])

    const section = page.getByTestId("panda-properties-form-section--buyer-offers")
    await expect(
      section.getByTestId(`buyer-offer-section-view-btn--${OFFER_ACCEPTED_WITH_TOKEN.buyerOfferId}`),
    ).toHaveAttribute(
      "href",
      `/offer-form/${OFFER_ACCEPTED_WITH_TOKEN.offerFormToken}?offerId=${OFFER_ACCEPTED_WITH_TOKEN.buyerOfferId}&view=1`,
    )
  })

  // ── Error / resilience ────────────────────────────────────────────────────

  test("API 500 on buyer-offers does not crash the Sales tab — shows empty or loading state", async ({ page }) => {
    const consoleErrors: string[] = []
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text())
    })

    await page.route("**/api/admin/properties**", async (route: Route) => {
      const url = route.request().url()
      if (url.includes("/buyer-offers")) {
        await route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "Internal error" }) })
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

    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible()
    await page.getByTestId("admin-entity-row--properties--1001").click()
    await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible()
    await page.getByTestId("panda-properties-form-tab-trigger--sales").click()
    await expect(page.getByTestId("panda-properties-form-tab--sales")).toBeVisible()

    const section = page.getByTestId("panda-properties-form-section--buyer-offers")
    await expect(section).toBeVisible()
    await expect(section).not.toContainText("undefined")

    const uncaught = consoleErrors.filter((e) => e.toLowerCase().includes("uncaught"))
    expect(uncaught).toHaveLength(0)
  })

  // ── Persistence check ─────────────────────────────────────────────────────

  test("buttons are still present after closing and reopening the dialog (driven by API data)", async ({ page }) => {
    await openSalesTab(page, [OFFER_WITH_TOKEN])

    const section = page.getByTestId("panda-properties-form-section--buyer-offers")
    await expect(section.getByTestId(`buyer-offer-section-view-btn--${OFFER_WITH_TOKEN.buyerOfferId}`)).toBeVisible()

    // Close dialog via Cancel button (Escape does not close the main properties dialog)
    await page.getByRole("button", { name: "Cancel" }).click()
    await expect(page.getByTestId("admin-entity-crud-dialog--properties")).not.toBeVisible()

    // Reopen
    await page.getByTestId("admin-entity-row--properties--1001").click()
    await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible()
    await page.getByTestId("panda-properties-form-tab-trigger--sales").click()
    await expect(page.getByTestId("panda-properties-form-tab--sales")).toBeVisible()

    await expect(
      page.getByTestId("panda-properties-form-section--buyer-offers")
        .getByTestId(`buyer-offer-section-view-btn--${OFFER_WITH_TOKEN.buyerOfferId}`),
    ).toBeVisible()
  })
})
