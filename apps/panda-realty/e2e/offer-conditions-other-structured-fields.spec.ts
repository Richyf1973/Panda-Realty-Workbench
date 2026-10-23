/**
 * E2E: Contract Conditions — Sale of Property, Unconditional Contract, Completion Date
 *
 * Mocked tests verify:
 * - Three new fields render with correct labels and testids.
 *
 * Live tests verify:
 * - New field values save and persist after dialog close/reopen.
 *
 * Requires for live: E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD + DATABASE_URL.
 * Seed: "99 E2E Seed Street" must have an accepted buyer offer with a contract date.
 */

import { expect, test, type Page } from "@playwright/test"

import { requirePandaE2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
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
  saleOfPropertyDays: 30,
  unconditionalContractDays: 45,
  depositInitial: "2000.00",
  depositBalance: "18000.00",
  otherConditions: null,
  customConditions: null,
  conditionNotes: null,
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
}

async function openSalesTabConditionsPanel(page: Page) {
  await page.goto("/admin/properties")
  await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible({
    timeout: 15_000,
  })
  await page.getByTestId("admin-entity-row--properties--1001").click()
  const dialog = page.getByTestId("admin-entity-crud-dialog--properties")
  await expect(dialog).toBeVisible({ timeout: 15_000 })
  await page.getByTestId("panda-properties-form-tab-trigger--sales").click()
  await expect(page.getByTestId("panda-properties-form-tab--sales")).toBeVisible()
  const panel = dialog.locator('[data-testid^="offer-conditions-panel--"]')
  await expect(panel).toBeVisible({ timeout: 10_000 })
  const offerId = (await panel.getAttribute("data-testid"))!.replace("offer-conditions-panel--", "")
  return { dialog, panel, offerId }
}

// ─── Mocked rendering tests ───────────────────────────────────────────────────

test.describe("Contract Conditions — new structured fields (mocked)", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaE2eAdminCredentials()
    await signInAsAdmin(page)
    await setupMockedPropertyRoutes(page, [ACCEPTED_OFFER])
  })

  test("Sale of Property field renders with input and calendar button", async ({ page }) => {
    const { dialog, offerId } = await openSalesTabConditionsPanel(page)
    await expect(
      dialog.locator(`[data-testid="offer-conditions-days-input--sale-of-property--${offerId}"]`),
    ).toBeVisible()
    await expect(
      dialog.locator(`[data-testid="offer-conditions-calendar-btn--sale-of-property--${offerId}"]`),
    ).toBeVisible()
  })

  test("Unconditional Contract field renders with input and calendar button", async ({ page }) => {
    const { dialog, offerId } = await openSalesTabConditionsPanel(page)
    await expect(
      dialog.locator(`[data-testid="offer-conditions-days-input--unconditional-contract--${offerId}"]`),
    ).toBeVisible()
    await expect(
      dialog.locator(`[data-testid="offer-conditions-calendar-btn--unconditional-contract--${offerId}"]`),
    ).toBeVisible()
  })

  test("Completion Date field renders with input and calendar button", async ({ page }) => {
    const { dialog, offerId } = await openSalesTabConditionsPanel(page)
    await expect(
      dialog.locator(`[data-testid="offer-conditions-days-input--subject-to-sale--${offerId}"]`),
    ).toBeVisible()
    await expect(
      dialog.locator(`[data-testid="offer-conditions-calendar-btn--subject-to-sale--${offerId}"]`),
    ).toBeVisible()
  })

  test("new fields show populated values from mock offer", async ({ page }) => {
    const { dialog, offerId } = await openSalesTabConditionsPanel(page)
    await expect(
      dialog.locator(`[data-testid="offer-conditions-days-input--sale-of-property--${offerId}"]`),
    ).toHaveValue("30")
    await expect(
      dialog.locator(`[data-testid="offer-conditions-days-input--unconditional-contract--${offerId}"]`),
    ).toHaveValue("45")
    await expect(
      dialog.locator(`[data-testid="offer-conditions-days-input--subject-to-sale--${offerId}"]`),
    ).toHaveValue("30")
  })


})

// ─── Live persistence tests ───────────────────────────────────────────────────

test.describe("Contract Conditions — new structured fields persistence (live)", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaLiveE2eEnv()
    requirePandaE2eAdminCredentials()
    await signInAsAdmin(page)
    await gotoSellersPipeline(page)
  })

  test("saleOfPropertyDays persists after dialog close/reopen", async ({ page }) => {
    test.setTimeout(180_000)

    const card = sellersCardByAddressSnippet(page, PANDA_PIPELINE_SEED_CARD_ADDRESS_SNIPPET).first()
    await expect(card).toBeVisible({ timeout: 20_000 })

    const sidePanel = await openPropertyPanel(page, card)
    const addressLink = sidePanel.getByTestId("property-detail-panel-address-open-edit")
    await expect(addressLink).toBeVisible()

    const popupPromise = page.waitForEvent("popup")
    await addressLink.click()
    const propertiesPage = await popupPromise
    await propertiesPage.waitForURL((u) => u.pathname === "/admin/properties", { timeout: 20_000 })

    const dialog = propertiesPage.getByTestId("admin-entity-crud-dialog--properties")
    await expect(dialog).toBeVisible({ timeout: 30_000 })
    await propertiesPage.getByTestId("panda-properties-form-tab-trigger--sales").click()

    const conditionsRoot = dialog.locator('[data-testid^="offer-conditions-panel--"]')
    await expect(conditionsRoot).toBeVisible({ timeout: 15_000 })
    const offerId = (await conditionsRoot.getAttribute("data-testid"))!.replace("offer-conditions-panel--", "")

    const saleInput = dialog.locator(
      `[data-testid="offer-conditions-days-input--sale-of-property--${offerId}"]`,
    )
    await expect(saleInput).toBeVisible({ timeout: 10_000 })

    const originalValue = await saleInput.inputValue()
    const newValue = originalValue === "31" ? "32" : "31"
    await saleInput.fill(newValue)

    const saveBtn = dialog.getByRole("button", { name: /^save conditions$/i })
    await saveBtn.click()
    await expect(saveBtn).toBeEnabled({ timeout: 20_000 })
    await expect(dialog.locator(`[data-testid="offer-conditions-saved-ok--${offerId}"]`)).toBeVisible({ timeout: 5_000 })
    await expect(dialog.locator("text=Failed to save")).toHaveCount(0)

    // Close and reopen
    await dialog.getByRole("button", { name: /close/i }).first().click().catch(() =>
      propertiesPage.keyboard.press("Escape"),
    )
    await expect(dialog).not.toBeVisible({ timeout: 10_000 })

    await propertiesPage.locator('[data-testid^="admin-entity-row--properties--"]').first().click()
    const dialog2 = propertiesPage.getByTestId("admin-entity-crud-dialog--properties")
    await expect(dialog2).toBeVisible({ timeout: 20_000 })
    await propertiesPage.getByTestId("panda-properties-form-tab-trigger--sales").click()
    const conditionsRoot2 = dialog2.locator('[data-testid^="offer-conditions-panel--"]')
    await expect(conditionsRoot2).toBeVisible({ timeout: 15_000 })
    const offerId2 = (await conditionsRoot2.getAttribute("data-testid"))!.replace("offer-conditions-panel--", "")

    const saleInput2 = dialog2.locator(
      `[data-testid="offer-conditions-days-input--sale-of-property--${offerId2}"]`,
    )
    await expect(saleInput2).toHaveValue(newValue, { timeout: 10_000 })

    // Restore
    await saleInput2.fill(originalValue)
    await dialog2.getByRole("button", { name: /^save conditions$/i }).click()
    await expect(dialog2.getByRole("button", { name: /^save conditions$/i })).toBeEnabled({ timeout: 20_000 })
  })
})
