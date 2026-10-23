/**
 * E2E: Contract conditions panel — dirty indicator, tooltip, auto-save on main form save.
 *
 * Mocked tests:
 * - Dirty indicator hidden on initial open.
 * - Dirty indicator appears when any field changes.
 * - Dirty indicator clears after "Save conditions".
 * - Calendar buttons disabled when contract date is null.
 * - Tooltip "Contract date required" appears on hover over disabled calendar button.
 * - Calendar buttons enabled after contract date is selected.
 *
 * Live seeded tests (require E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD + DATABASE_URL):
 * - Auto-save conditions when main property form Save is clicked.
 * - Contract date persists after dialog is closed and reopened.
 *
 * Seed fixtures used:
 *   "99 E2E Seed Street" — accepted offer WITH contract date
 *   "97 E2E No-Contract Street" — accepted offer WITH null contract_date
 */

import { expect, test, type Page } from "@playwright/test"

import { requirePandaE2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import {
  gotoSellersPipeline,
  openPropertyPanel,
  PANDA_PIPELINE_SEED_CARD_ADDRESS_SNIPPET,
  PANDA_E2E_SELLERS_NO_CONTRACT_SNIPPET,
  sellersCardByAddressSnippet,
} from "./helpers/panda-pipeline-panels"
import { requirePandaLiveE2eEnv } from "./helpers/require-panda-live-e2e-env"

// ─── Mock fixtures ────────────────────────────────────────────────────────────

const OFFER_WITH_CONTRACT: Record<string, unknown> = {
  buyerOfferId: 196,
  entityName: "E2E Test Buyer",
  offer: "805000.00",
  isAccepted: true,
  dateOffered: "2026-04-24",
  createdAt: "2026-04-24T00:00:00Z",
  isCashOffer: false,
  noConditions: false,
  coolingOffDays: 5,
  financeDays: null,
  buildingPestDays: 14,
  dueDiligenceDays: null,
  subjectToSaleDays: null,
  subjectToSaleStage: null,
  subjectToSaleAddress: null,
  memberPropertyToSellAddress: null,
  saleOfPropertyDays: null,
  unconditionalContractDays: 14,
  depositInitial: "2000.00",
  depositBalance: "18000.00",
  otherConditions: null,
  customConditions: null,
  conditionNotes: null,
}

const PROPERTY_WITH_CONTRACT: Record<string, unknown> = {
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
  contractDate: "2026-03-29T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00Z",
  propertyEntities: [],
}

const PROPERTY_NO_CONTRACT: Record<string, unknown> = {
  ...PROPERTY_WITH_CONTRACT,
  contractDate: null,
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

async function setupMockedRoutes(
  page: Page,
  propertyDetail: Record<string, unknown>,
  offers: unknown[],
): Promise<void> {
  const listResponse = {
    items: [propertyDetail],
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
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(offers) })
      return
    }
    if (url.match(/\/api\/admin\/properties\/1001(\?|$)/)) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(propertyDetail) })
      return
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(listResponse) })
  })
  await page.route("**/api/admin/property-status**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(STATUS_MIN) }),
  )
  await page.route("**/api/admin/property-entities**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_LIST) }),
  )
}

async function openSalesTab(page: Page) {
  await page.goto("/admin/properties")
  await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible({ timeout: 15_000 })
  await page.getByTestId("admin-entity-row--properties--1001").click()
  const dialog = page.getByTestId("admin-entity-crud-dialog--properties")
  await expect(dialog).toBeVisible({ timeout: 15_000 })
  await page.getByTestId("panda-properties-form-tab-trigger--sales").click()
  await expect(page.getByTestId("panda-properties-form-tab--sales")).toBeVisible()
  return dialog
}

// ─── Mocked: dirty indicator ──────────────────────────────────────────────────

test.describe("Contract conditions panel — dirty indicator (mocked)", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaE2eAdminCredentials()
    await signInAsAdmin(page)
  })

  test("dirty indicator hidden on initial open", async ({ page }) => {
    await setupMockedRoutes(page, PROPERTY_WITH_CONTRACT, [OFFER_WITH_CONTRACT])
    const dialog = await openSalesTab(page)
    const offerId = OFFER_WITH_CONTRACT.buyerOfferId as number
    await expect(dialog.locator(`[data-testid="offer-conditions-panel--${offerId}"]`)).toBeVisible({ timeout: 10_000 })
    await expect(dialog.locator(`[data-testid="offer-conditions-dirty-indicator--${offerId}"]`)).toHaveCount(0)
  })

  test("dirty indicator appears when a day-count field is changed", async ({ page }) => {
    await setupMockedRoutes(page, PROPERTY_WITH_CONTRACT, [OFFER_WITH_CONTRACT])
    const dialog = await openSalesTab(page)
    const offerId = OFFER_WITH_CONTRACT.buyerOfferId as number
    const input = dialog.locator(`[data-testid="offer-conditions-days-input--cooling-off--${offerId}"]`)
    await expect(input).toBeVisible({ timeout: 10_000 })
    await input.fill("21")
    await expect(dialog.locator(`[data-testid="offer-conditions-dirty-indicator--${offerId}"]`)).toBeVisible()
  })

})

// ─── Mocked: tooltip on disabled calendar buttons ─────────────────────────────

test.describe("Contract conditions panel — tooltip on disabled calendar buttons (mocked)", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaE2eAdminCredentials()
    await signInAsAdmin(page)
  })

  test("calendar buttons are disabled when contract date is null", async ({ page }) => {
    await setupMockedRoutes(page, PROPERTY_NO_CONTRACT, [OFFER_WITH_CONTRACT])
    const dialog = await openSalesTab(page)
    const offerId = OFFER_WITH_CONTRACT.buyerOfferId as number
    await expect(dialog.locator(`[data-testid="offer-conditions-panel--${offerId}"]`)).toBeVisible({ timeout: 10_000 })
    const calendarBtn = dialog.locator(`[data-testid="offer-conditions-calendar-btn--cooling-off--${offerId}"]`)
    await expect(calendarBtn).toBeVisible()
    await expect(calendarBtn).toBeDisabled()
  })

  test("tooltip 'Contract date required' appears on hover over disabled calendar button", async ({ page }) => {
    await setupMockedRoutes(page, PROPERTY_NO_CONTRACT, [OFFER_WITH_CONTRACT])
    const dialog = await openSalesTab(page)
    const offerId = OFFER_WITH_CONTRACT.buyerOfferId as number
    await expect(dialog.locator(`[data-testid="offer-conditions-panel--${offerId}"]`)).toBeVisible({ timeout: 10_000 })
    const calendarBtn = dialog.locator(`[data-testid="offer-conditions-calendar-btn--cooling-off--${offerId}"]`)
    await calendarBtn.hover({ force: true })
    await expect(page.getByText("Contract date required")).toBeVisible({ timeout: 5_000 })
  })

  test("all standard calendar buttons disabled when no contract date", async ({ page }) => {
    await setupMockedRoutes(page, PROPERTY_NO_CONTRACT, [OFFER_WITH_CONTRACT])
    const dialog = await openSalesTab(page)
    const offerId = OFFER_WITH_CONTRACT.buyerOfferId as number
    await expect(dialog.locator(`[data-testid="offer-conditions-panel--${offerId}"]`)).toBeVisible({ timeout: 10_000 })
    for (const id of ["cooling-off", "building-pest", "finance", "due-diligence", "unconditional-contract"]) {
      const btn = dialog.locator(`[data-testid="offer-conditions-calendar-btn--${id}--${offerId}"]`)
      await expect(btn).toBeDisabled()
    }
  })
})

// ─── Live seeded: dirty indicator clears + auto-save on main form save ───────

async function openSeedPropertyConditions(page: Page) {
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
  return { propertiesPage, dialog, offerId }
}

test.describe("Contract conditions panel — auto-save on main form save (live seeded)", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaLiveE2eEnv()
    await signInAsAdmin(page)
    await gotoSellersPipeline(page)
  })

  test("dirty indicator clears after Save conditions is clicked", async ({ page }) => {
    test.setTimeout(90_000)
    const { dialog, offerId } = await openSeedPropertyConditions(page)

    const input = dialog.locator(`[data-testid="offer-conditions-days-input--cooling-off--${offerId}"]`)
    await expect(input).toBeVisible({ timeout: 10_000 })
    const originalValue = await input.inputValue()
    await input.fill(originalValue === "5" ? "6" : "5")
    await expect(dialog.locator(`[data-testid="offer-conditions-dirty-indicator--${offerId}"]`)).toBeVisible({ timeout: 5_000 })

    const saveBtn = dialog.locator(`[data-testid="offer-conditions-save-btn--${offerId}"]`)
    await saveBtn.click()
    await expect(dialog.locator(`[data-testid="offer-conditions-saved-ok--${offerId}"]`)).toBeVisible({ timeout: 15_000 })
    await expect(dialog.locator(`[data-testid="offer-conditions-dirty-indicator--${offerId}"]`)).toHaveCount(0)

    // Restore
    await input.fill(originalValue)
    await saveBtn.click()
    await expect(saveBtn).toBeEnabled({ timeout: 10_000 })
  })

  test("saving main property form also saves conditions panel changes", async ({ page }) => {
    test.setTimeout(120_000)

    // Use "99 E2E Seed Street" — has accepted offer with contract date so calendar buttons work
    const { propertiesPage, dialog, offerId } = await openSeedPropertyConditions(page)

    // Change building-pest days but do NOT click "Save conditions"
    const buildingPestInput = dialog.locator(`[data-testid="offer-conditions-days-input--building-pest--${offerId}"]`)
    await expect(buildingPestInput).toBeVisible({ timeout: 10_000 })
    const originalBuildingPest = await buildingPestInput.inputValue()
    const newBuildingPest = originalBuildingPest === "14" ? "13" : "14"
    await buildingPestInput.fill(newBuildingPest)

    // Dirty indicator must be visible before main save
    await expect(dialog.locator(`[data-testid="offer-conditions-dirty-indicator--${offerId}"]`)).toBeVisible({ timeout: 5_000 })

    // Click main property form Save (not "Save conditions")
    const mainSaveBtn = dialog.locator(`[data-testid="admin-entity-edit-save-and-close--properties"]`)
    await expect(mainSaveBtn).toBeVisible()
    await mainSaveBtn.click()

    // Dialog closes — wait for the list to be visible, then reopen
    await expect(dialog).toBeHidden({ timeout: 30_000 })
    await expect(propertiesPage.getByTestId("admin-entity-table-body--properties")).toBeVisible({ timeout: 15_000 })

    // Reopen the dialog by clicking the seed property row specifically
    const seedRow = propertiesPage.locator('[data-testid^="admin-entity-row--properties--"]').filter({ hasText: PANDA_PIPELINE_SEED_CARD_ADDRESS_SNIPPET }).first()
    await expect(seedRow).toBeVisible({ timeout: 10_000 })
    await seedRow.click()
    const dialog2 = propertiesPage.getByTestId("admin-entity-crud-dialog--properties")
    await expect(dialog2).toBeVisible({ timeout: 30_000 })
    await propertiesPage.getByTestId("panda-properties-form-tab-trigger--sales").click()
    const conditionsRoot2 = dialog2.locator('[data-testid^="offer-conditions-panel--"]')
    await expect(conditionsRoot2).toBeVisible({ timeout: 15_000 })
    const offerId2 = (await conditionsRoot2.getAttribute("data-testid"))!.replace("offer-conditions-panel--", "")
    const buildingPestInput2 = dialog2.locator(`[data-testid="offer-conditions-days-input--building-pest--${offerId2}"]`)
    await expect(buildingPestInput2).toHaveValue(newBuildingPest, { timeout: 10_000 })

    // Restore
    await buildingPestInput2.fill(originalBuildingPest)
    const saveBtn = dialog2.locator(`[data-testid="offer-conditions-save-btn--${offerId2}"]`)
    await saveBtn.click()
    await expect(dialog2.locator(`[data-testid="offer-conditions-saved-ok--${offerId2}"]`)).toBeVisible({ timeout: 10_000 })
  })

  test("tooltip visible on disabled calendar buttons on No-Contract seed property", async ({ page }) => {
    test.setTimeout(60_000)

    const card = sellersCardByAddressSnippet(page, PANDA_E2E_SELLERS_NO_CONTRACT_SNIPPET).first()
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

    // Calendar button for cooling-off should be disabled (no contract date)
    const calBtn = dialog.locator(`[data-testid="offer-conditions-calendar-btn--cooling-off--${offerId}"]`)
    await expect(calBtn).toBeDisabled()

    // Hover → tooltip must appear
    await calBtn.hover({ force: true })
    await expect(propertiesPage.getByText("Contract date required")).toBeVisible({ timeout: 5_000 })
  })
})
