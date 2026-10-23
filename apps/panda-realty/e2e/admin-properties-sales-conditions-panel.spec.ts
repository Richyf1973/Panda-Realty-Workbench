/**
 * E2E: Property dialog Sales tab — contract conditions native view (legacy suite)
 *
 * Mocked tests verify rendering state after replacement of OfferConditionsPanel:
 * - BuyerOfferNativeView visible when accepted offer present.
 * - Contract Date grid field hidden when accepted offer present.
 * - Placeholder visible + Contract Date field visible when no accepted offer.
 *
 * Live seeded tests verify native view renders via the "99 E2E Seed Street" fixture.
 *
 * Requires for live: E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD + DATABASE_URL.
 */

import { expect, test, type Page } from "@playwright/test"

import {
  requirePandaE2eAdminCredentials,
  signInAsAdmin,
} from "./helpers/admin-auth"
import {
  gotoSellersPipeline,
  openPropertyPanel,
  PANDA_PIPELINE_SEED_CARD_ADDRESS_SNIPPET,
  sellersCardByAddressSnippet,
} from "./helpers/panda-pipeline-panels"
import { requirePandaLiveE2eEnv } from "./helpers/require-panda-live-e2e-env"

// ─── Mock fixtures ────────────────────────────────────────────────────────────

const ACCEPTED_OFFER = {
  buyerOfferId: 196,
  entityName: "E2E Test Buyer",
  propertyEntityId: 501,
  offerFormToken: "legacy-test-token-196",
  offer: "805000.00",
  isAccepted: true,
  dateOffered: "2026-04-24",
  createdAt: "2026-04-24T00:00:00Z",
  isCashOffer: false,
  noConditions: false,
  coolingOffDays: 14,
  financeDays: 0,
  buildingPestDays: 7,
  dueDiligenceDays: null,
  subjectToSaleDays: 30,
  subjectToSaleStage: null,
  saleOfPropertyDays: null,
  unconditionalContractDays: null,
  depositInitial: "2000.00",
  depositBalance: "18000.00",
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
  settlementPeriod: "38",
  memberPropertyToSellAddress: null,
}

const PROPERTY_FAVORITE = {
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
  owner2name: null,
  owner3name: null,
  combinedOwner: "Smith, John",
  isFavorite: true,
  priceUndisclosed: false,
  excludeFromReport: false,
  saleDate: null,
  contractDate: "2026-03-29T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  propertyEntities: [],
  propertyBuyers: [],
  propertyContacts: [],
  propertyTenants: [],
}

const STATUS_MIN = {
  items: [{ propertyStatusId: 1, propertyStatusCode: "ACTIVE", propertyStatus: "Active" }],
  totalCount: 1,
  limit: 100,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false,
  startCursor: null,
  endCursor: null,
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

const MOCK_PREFILL = {
  propertyAddress: "12 Test Street, Testville, QLD, 4000",
  buyers: [{ name: "E2E Test Buyer", phone: "0400000001", email: "buyer@test.com", address: "1 Buyer St" }],
  rep: null,
  solicitorName: null,
  solicitorPhone: null,
  solicitorAddress: null,
  solicitorEmail: null,
  offerAmount: "805000.00",
  isCashOffer: false,
  waiveCoolingOff: false,
  isSubjectToFinance: false,
  buildingPestDays: 7,
  isSubjectToSale: false,
  settlementPeriod: "38",
  conditionNotes: null,
  viewMode: true,
}

async function setupMockedPropertyRoutes(page: Page, buyerOffers: unknown[]): Promise<void> {
  const listResponse = {
    items: [PROPERTY_FAVORITE],
    totalCount: 1,
    limit: 25,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
    startCursor: null,
    endCursor: null,
  }
  await page.route("**/api/admin/properties**", async (route) => {
    const url = route.request().url()
    if (url.includes("/buyer-offers") && route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(buyerOffers),
      })
      return
    }
    if (url.match(/\/api\/admin\/properties\/1001(\?|$)/)) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(PROPERTY_FAVORITE),
      })
      return
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(listResponse),
    })
  })
  await page.route("**/api/admin/property-status**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(STATUS_MIN),
    }),
  )
  await page.route("**/api/admin/property-entities**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(EMPTY_LIST),
    }),
  )
  await page.route("**/api/offer-form/legacy-test-token-196**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_PREFILL),
    }),
  )
}

async function openSalesTab(page: Page) {
  await page.goto("/admin/properties")
  await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible({
    timeout: 15_000,
  })
  await page.getByTestId("admin-entity-row--properties--1001").click()
  const dialog = page.getByTestId("admin-entity-crud-dialog--properties")
  await expect(dialog).toBeVisible({ timeout: 15_000 })
  await page.getByTestId("panda-properties-form-tab-trigger--sales").click()
  await expect(page.getByTestId("panda-properties-form-tab--sales")).toBeVisible()
  return dialog
}

// ─── Mocked rendering tests ───────────────────────────────────────────────────

test.describe("Property dialog Sales tab — conditions panel (mocked)", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaE2eAdminCredentials()
    await signInAsAdmin(page)
  })

  test("shows BuyerOfferNativeView when accepted offer present", async ({ page }) => {
    await setupMockedPropertyRoutes(page, [ACCEPTED_OFFER])
    const dialog = await openSalesTab(page)
    await expect(dialog.getByTestId("buyer-offer-native-view--196")).toBeVisible({
      timeout: 10_000,
    })
  })

  test("hides Contract Date grid field when accepted offer present", async ({ page }) => {
    await setupMockedPropertyRoutes(page, [ACCEPTED_OFFER])
    const dialog = await openSalesTab(page)
    await expect(dialog.getByTestId("buyer-offer-native-view--196")).toBeVisible({ timeout: 10_000 })
    await expect(dialog.getByTestId("panda-properties-form-field--contractDate")).toHaveCount(0)
  })

  test("no editable save-conditions button when accepted offer present", async ({
    page,
  }) => {
    await setupMockedPropertyRoutes(page, [ACCEPTED_OFFER])
    const dialog = await openSalesTab(page)
    await expect(dialog.getByTestId("buyer-offer-native-view--196")).toBeVisible({ timeout: 10_000 })
    await expect(dialog.getByRole("button", { name: /save conditions/i })).toHaveCount(0)
  })

  test("shows placeholder when no accepted offer", async ({ page }) => {
    await setupMockedPropertyRoutes(page, [])
    const dialog = await openSalesTab(page)
    await expect(
      dialog.getByTestId("panda-properties-sales-conditions-placeholder"),
    ).toBeVisible()
  })

  test("shows Contract Date grid field when no accepted offer", async ({ page }) => {
    await setupMockedPropertyRoutes(page, [])
    const dialog = await openSalesTab(page)
    await expect(dialog.getByTestId("panda-properties-form-field--contractDate")).toBeVisible()
  })

  test("no native view rendered when no accepted offer", async ({ page }) => {
    await setupMockedPropertyRoutes(page, [])
    const dialog = await openSalesTab(page)
    await expect(dialog.locator('[data-testid^="buyer-offer-native-view--"]')).toHaveCount(0)
  })
})

// ─── Live seeded tests ────────────────────────────────────────────────────────

test.describe("Property dialog Sales tab — conditions panel (live seeded)", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaLiveE2eEnv()
    await signInAsAdmin(page)
    await gotoSellersPipeline(page)
  })

  test("native view renders in seeded property edit dialog Sales tab", async ({
    page,
  }) => {
    test.setTimeout(120_000)
    const card = sellersCardByAddressSnippet(page, PANDA_PIPELINE_SEED_CARD_ADDRESS_SNIPPET).first()
    await expect(card).toBeVisible({ timeout: 20_000 })

    const sidePanel = await openPropertyPanel(page, card)
    const addressLink = sidePanel.getByTestId("property-detail-panel-address-open-edit")
    await expect(addressLink).toBeVisible()

    const popupPromise = page.waitForEvent("popup")
    await addressLink.click()
    const propertiesPage = await popupPromise
    await propertiesPage.waitForURL((u) => u.pathname === "/admin/properties", {
      timeout: 20_000,
    })

    const dialog = propertiesPage.getByTestId("admin-entity-crud-dialog--properties")
    await expect(dialog).toBeVisible({ timeout: 30_000 })

    await propertiesPage.getByTestId("panda-properties-form-tab-trigger--sales").click()

    // Native view should be visible (accepted offer present on seed property)
    await expect(
      dialog.locator('[data-testid^="buyer-offer-native-view--"]'),
    ).toBeVisible({ timeout: 15_000 })

    // Contract Date field must NOT appear in the grid
    await expect(dialog.getByTestId("panda-properties-form-field--contractDate")).toHaveCount(0)

    // No editable save-conditions button
    await expect(dialog.getByRole("button", { name: /save conditions/i })).toHaveCount(0)
  })
})
