/**
 * E2E: Offer Conditions — Subject to sale of property checkbox + Stage dropdown
 *
 * Mocked tests (no DB required):
 * 1. Checkbox renders unchecked and Stage select is absent when subjectToSaleStage is null.
 * 2. Checking the checkbox reveals the Stage select.
 * 3. Unchecking hides the Stage select.
 * 4. Checkbox renders checked with correct stage value when subjectToSaleStage is pre-set.
 *
 * Live seeded test (requires E2E_ADMIN_* + DATABASE_URL):
 * 5. Save a stage value via the pipeline panel; verify it persists on reload.
 */

import { expect, test, type Page } from "@playwright/test"

import {
  requirePandaE2eAdminCredentials,
  signInAsAdmin,
} from "./helpers/admin-auth"
import {
  findSellersCardWithAcceptedOffer,
  goToPropertySummaryTab,
  gotoSellersPipeline,
  openPropertyPanel,
} from "./helpers/panda-pipeline-panels"
import { requirePandaLiveE2eEnv } from "./helpers/require-panda-live-e2e-env"

// ─── Mock fixtures ────────────────────────────────────────────────────────────

const BASE_OFFER = {
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
  subjectToSaleStage: null as string | null,
  depositInitial: "2000.00",
  depositBalance: "18000.00",
  otherConditions: null,
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

async function setupMockedRoutes(page: Page, offer: typeof BASE_OFFER): Promise<void> {
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
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([offer]) })
      return
    }
    if (url.match(/\/api\/admin\/properties\/1001(\?|$)/)) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(PROPERTY_FAVORITE) })
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

async function openSalesTabPanel(page: Page) {
  await page.goto("/admin/properties")
  await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible({ timeout: 15_000 })
  await page.getByTestId("admin-entity-row--properties--1001").click()
  const dialog = page.getByTestId("admin-entity-crud-dialog--properties")
  await expect(dialog).toBeVisible({ timeout: 15_000 })
  await page.getByTestId("panda-properties-form-tab-trigger--sales").click()
  await expect(page.getByTestId("panda-properties-form-tab--sales")).toBeVisible()
  const panel = dialog.locator('[data-testid^="offer-conditions-panel--"]')
  await expect(panel).toBeVisible({ timeout: 10_000 })
  return { dialog, panel }
}

// ─── Mocked tests ─────────────────────────────────────────────────────────────

test.describe("Offer conditions — Subject to sale of property (mocked)", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaE2eAdminCredentials()
    await signInAsAdmin(page)
  })

  test("checkbox unchecked and Stage select absent when subjectToSaleStage is null", async ({ page }) => {
    await setupMockedRoutes(page, { ...BASE_OFFER, subjectToSaleStage: null })
    const { panel } = await openSalesTabPanel(page)
    const checkbox = panel.getByTestId(`offer-conditions-subject-to-sale-checkbox--196`)
    await expect(checkbox).toBeVisible()
    await expect(checkbox).not.toBeChecked()
    await expect(panel.getByTestId(`offer-conditions-subject-to-sale-stage--196`)).toHaveCount(0)
  })

  test("checking the checkbox reveals the Stage select", async ({ page }) => {
    await setupMockedRoutes(page, { ...BASE_OFFER, subjectToSaleStage: null })
    const { panel } = await openSalesTabPanel(page)
    const checkbox = panel.getByTestId(`offer-conditions-subject-to-sale-checkbox--196`)
    await checkbox.click()
    await expect(checkbox).toBeChecked()
    await expect(panel.getByTestId(`offer-conditions-subject-to-sale-stage--196`)).toBeVisible()
  })

  test("unchecking the checkbox hides the Stage select", async ({ page }) => {
    await setupMockedRoutes(page, { ...BASE_OFFER, subjectToSaleStage: null })
    const { panel } = await openSalesTabPanel(page)
    const checkbox = panel.getByTestId(`offer-conditions-subject-to-sale-checkbox--196`)
    await checkbox.click()
    await expect(panel.getByTestId(`offer-conditions-subject-to-sale-stage--196`)).toBeVisible()
    await checkbox.click()
    await expect(panel.getByTestId(`offer-conditions-subject-to-sale-stage--196`)).toHaveCount(0)
  })

  test("checkbox pre-checked and Stage shows correct value when subjectToSaleStage is set", async ({ page }) => {
    await setupMockedRoutes(page, { ...BASE_OFFER, subjectToSaleStage: "On the Market" })
    const { panel } = await openSalesTabPanel(page)
    const checkbox = panel.getByTestId(`offer-conditions-subject-to-sale-checkbox--196`)
    await expect(checkbox).toBeChecked()
    const stageSelect = panel.getByTestId(`offer-conditions-subject-to-sale-stage--196`)
    await expect(stageSelect).toBeVisible()
    await expect(stageSelect).toContainText("On the Market")
  })
})

// ─── Live seeded tests ────────────────────────────────────────────────────────

test.describe("Offer conditions — Subject to sale of property (live seeded)", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaLiveE2eEnv()
    await signInAsAdmin(page)
    await gotoSellersPipeline(page)
  })

  test("save and persist subject-to-sale stage via pipeline summary panel", async ({ page }) => {
    test.setTimeout(120_000)

    const targetCard = await findSellersCardWithAcceptedOffer(page)
    expect(
      targetCard,
      "Expected a sellers card with accepted offer — run: npm run e2e:seed:sellers-accepted -w panda-realty",
    ).not.toBeNull()

    const panel = await openPropertyPanel(page, targetCard!)
    await goToPropertySummaryTab(panel)

    const conditionsPanel = panel.locator('[data-testid^="offer-conditions-panel--"]')
    await expect(conditionsPanel).toBeVisible({ timeout: 15_000 })

    const offerId = (await conditionsPanel.getAttribute("data-testid"))!.replace("offer-conditions-panel--", "")
    const checkbox = conditionsPanel.getByTestId(`offer-conditions-subject-to-sale-checkbox--${offerId}`)
    await expect(checkbox).toBeVisible()

    // Ensure clean state: uncheck first if checked
    if (await checkbox.isChecked()) {
      await checkbox.click()
      const saveBtn = conditionsPanel.getByRole("button", { name: /^save conditions$/i })
      await saveBtn.click()
      await expect(saveBtn).toBeEnabled({ timeout: 20_000 })
    }

    // Check and pick "Under Contract"
    await checkbox.click()
    await expect(checkbox).toBeChecked()
    const stageSelect = conditionsPanel.getByTestId(`offer-conditions-subject-to-sale-stage--${offerId}`)
    await expect(stageSelect).toBeVisible()
    await stageSelect.click()
    await page.getByRole("option", { name: "Under Contract" }).click()

    const saveBtn = conditionsPanel.getByRole("button", { name: /^save conditions$/i })
    await saveBtn.click()
    await expect(saveBtn).toBeEnabled({ timeout: 20_000 })
    await expect(conditionsPanel.getByText("Failed to save")).toHaveCount(0)

    // Reload pipeline and verify persisted
    await page.reload()
    await gotoSellersPipeline(page)
    const reloadedCard = await findSellersCardWithAcceptedOffer(page)
    const reloadedPanel = await openPropertyPanel(page, reloadedCard!)
    await goToPropertySummaryTab(reloadedPanel)

    const reloadedConditions = reloadedPanel.locator('[data-testid^="offer-conditions-panel--"]')
    await expect(reloadedConditions).toBeVisible({ timeout: 15_000 })
    const reloadedCheckbox = reloadedConditions.getByTestId(`offer-conditions-subject-to-sale-checkbox--${offerId}`)
    await expect(reloadedCheckbox).toBeChecked()
    await expect(reloadedConditions.getByTestId(`offer-conditions-subject-to-sale-stage--${offerId}`)).toContainText("Under Contract")

    // Restore: uncheck and save
    await reloadedCheckbox.click()
    const restoreBtn = reloadedConditions.getByRole("button", { name: /^save conditions$/i })
    await restoreBtn.click()
    await expect(restoreBtn).toBeEnabled({ timeout: 20_000 })
  })
})
