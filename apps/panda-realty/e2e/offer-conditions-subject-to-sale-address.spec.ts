/**
 * E2E: Offer Conditions — Subject to sale address field
 *
 * Mocked tests (no DB required):
 * 1. Address input absent when subjectToSaleStage is null (condition not active).
 * 2. Checking checkbox reveals an empty address input (no pre-fill in dialog context).
 * 3. Unchecking checkbox hides the address input.
 * 4. Address input shows stored subjectToSaleAddress when pre-set (not overwritten by member address).
 * 5. Stage select and address input both present when condition is active.
 *
 * Live seeded tests (requires E2E_ADMIN_* + DATABASE_URL):
 * 6. Pipeline panel: address input pre-fills from representative member's propertyToSellAddress when subjectToSaleAddress is null.
 * 7. Pipeline panel: save and persist a custom address via pipeline summary panel.
 * 8. Pipeline panel: uncheck → save → re-enable shows pre-fill from member again (stored value is null).
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

// ─── Mock fixtures ─────────────────────────────────────────────────────────────

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
  subjectToSaleAddress: null as string | null,
  saleOfPropertyDays: null,
  unconditionalContractDays: null,
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

// ─── Mocked tests ──────────────────────────────────────────────────────────────

test.describe("Offer conditions — Subject to sale address (mocked)", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaE2eAdminCredentials()
    await signInAsAdmin(page)
  })

  test("address input absent when subjectToSaleStage is null", async ({ page }) => {
    await setupMockedRoutes(page, { ...BASE_OFFER, subjectToSaleStage: null, subjectToSaleAddress: null })
    const { panel } = await openSalesTabPanel(page)
    await expect(panel.getByTestId(`offer-conditions-subject-to-sale-address--196`)).toHaveCount(0)
  })

  test("checking checkbox reveals an empty address input (no pre-fill in dialog context)", async ({ page }) => {
    await setupMockedRoutes(page, { ...BASE_OFFER, subjectToSaleStage: null, subjectToSaleAddress: null })
    const { panel } = await openSalesTabPanel(page)
    const checkbox = panel.getByTestId(`offer-conditions-subject-to-sale-checkbox--196`)
    await checkbox.click()
    await expect(checkbox).toBeChecked()
    const addressInput = panel.getByTestId(`offer-conditions-subject-to-sale-address--196`)
    await expect(addressInput).toBeVisible()
    await expect(addressInput).toHaveValue("")
  })

  test("unchecking checkbox hides the address input", async ({ page }) => {
    await setupMockedRoutes(page, { ...BASE_OFFER, subjectToSaleStage: "On the Market", subjectToSaleAddress: "5 Some St, Brisbane QLD 4000" })
    const { panel } = await openSalesTabPanel(page)
    const checkbox = panel.getByTestId(`offer-conditions-subject-to-sale-checkbox--196`)
    await expect(checkbox).toBeChecked()
    await expect(panel.getByTestId(`offer-conditions-subject-to-sale-address--196`)).toBeVisible()
    await checkbox.click()
    await expect(checkbox).not.toBeChecked()
    await expect(panel.getByTestId(`offer-conditions-subject-to-sale-address--196`)).toHaveCount(0)
  })

  test("address input shows stored subjectToSaleAddress when pre-set", async ({ page }) => {
    const storedAddress = "42 Stored Street, Sydney NSW 2000"
    await setupMockedRoutes(page, {
      ...BASE_OFFER,
      subjectToSaleStage: "Under Contract",
      subjectToSaleAddress: storedAddress,
    })
    const { panel } = await openSalesTabPanel(page)
    const addressInput = panel.getByTestId(`offer-conditions-subject-to-sale-address--196`)
    await expect(addressInput).toBeVisible()
    await expect(addressInput).toHaveValue(storedAddress)
  })

  test("stage select and address input both visible when condition is active", async ({ page }) => {
    await setupMockedRoutes(page, {
      ...BASE_OFFER,
      subjectToSaleStage: "To be listed",
      subjectToSaleAddress: null,
    })
    const { panel } = await openSalesTabPanel(page)
    await expect(panel.getByTestId(`offer-conditions-subject-to-sale-stage--196`)).toBeVisible()
    await expect(panel.getByTestId(`offer-conditions-subject-to-sale-address--196`)).toBeVisible()
  })
})

// ─── Live seeded tests ─────────────────────────────────────────────────────────

test.describe("Offer conditions — Subject to sale address (live seeded)", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaLiveE2eEnv()
    await signInAsAdmin(page)
    await gotoSellersPipeline(page)
  })

  test("pipeline panel: address input pre-fills from representative member's propertyToSellAddress when stored value is null", async ({ page }) => {
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

    // Ensure clean state: uncheck first if checked, clear address
    const checkbox = conditionsPanel.getByTestId(`offer-conditions-subject-to-sale-checkbox--${offerId}`)
    if (await checkbox.isChecked()) {
      await checkbox.click()
      const saveBtn = conditionsPanel.getByRole("button", { name: /^save conditions$/i })
      await saveBtn.click()
      await expect(saveBtn).toBeEnabled({ timeout: 20_000 })
    }

    // Check the condition — address input should pre-fill from member's propertyToSellAddress
    await checkbox.click()
    await expect(checkbox).toBeChecked()
    const addressInput = conditionsPanel.getByTestId(`offer-conditions-subject-to-sale-address--${offerId}`)
    await expect(addressInput).toBeVisible()
    // Pre-fill must be non-empty (comes from the representative member's propertyToSellAddress)
    const prefilledValue = await addressInput.inputValue()
    expect(prefilledValue.trim().length, "Expected address input to be pre-filled from member's propertyToSellAddress").toBeGreaterThan(0)

    // Restore: uncheck and save
    await checkbox.click()
    const restoreBtn = conditionsPanel.getByRole("button", { name: /^save conditions$/i })
    await restoreBtn.click()
    await expect(restoreBtn).toBeEnabled({ timeout: 20_000 })
  })

  test("pipeline panel: save and persist a custom address via pipeline summary panel", async ({ page }) => {
    test.setTimeout(120_000)

    const targetCard = await findSellersCardWithAcceptedOffer(page)
    expect(targetCard, "Expected a sellers card with accepted offer").not.toBeNull()

    const panel = await openPropertyPanel(page, targetCard!)
    await goToPropertySummaryTab(panel)

    const conditionsPanel = panel.locator('[data-testid^="offer-conditions-panel--"]')
    await expect(conditionsPanel).toBeVisible({ timeout: 15_000 })
    const offerId = (await conditionsPanel.getAttribute("data-testid"))!.replace("offer-conditions-panel--", "")

    const checkbox = conditionsPanel.getByTestId(`offer-conditions-subject-to-sale-checkbox--${offerId}`)
    if (!await checkbox.isChecked()) {
      await checkbox.click()
      await expect(checkbox).toBeChecked()
    }

    const addressInput = conditionsPanel.getByTestId(`offer-conditions-subject-to-sale-address--${offerId}`)
    await expect(addressInput).toBeVisible()
    await addressInput.fill("99 E2E Custom Street, Brisbane QLD 4000")

    const saveBtn = conditionsPanel.getByRole("button", { name: /^save conditions$/i })
    await saveBtn.click()
    await expect(saveBtn).toBeEnabled({ timeout: 20_000 })
    await expect(conditionsPanel.getByText("Failed to save")).toHaveCount(0)

    // Reload pipeline and verify address persisted
    await page.reload()
    await gotoSellersPipeline(page)
    const reloadedCard = await findSellersCardWithAcceptedOffer(page)
    const reloadedPanel = await openPropertyPanel(page, reloadedCard!)
    await goToPropertySummaryTab(reloadedPanel)

    const reloadedConditions = reloadedPanel.locator('[data-testid^="offer-conditions-panel--"]')
    await expect(reloadedConditions).toBeVisible({ timeout: 15_000 })
    const reloadedAddress = reloadedConditions.getByTestId(`offer-conditions-subject-to-sale-address--${offerId}`)
    await expect(reloadedAddress).toBeVisible()
    await expect(reloadedAddress).toHaveValue("99 E2E Custom Street, Brisbane QLD 4000")

    // Restore: uncheck and save
    const reloadedCheckbox = reloadedConditions.getByTestId(`offer-conditions-subject-to-sale-checkbox--${offerId}`)
    await reloadedCheckbox.click()
    const restoreBtn = reloadedConditions.getByRole("button", { name: /^save conditions$/i })
    await restoreBtn.click()
    await expect(restoreBtn).toBeEnabled({ timeout: 20_000 })
  })

  test("pipeline panel: uncheck → save → re-enable shows pre-fill from member address again", async ({ page }) => {
    test.setTimeout(120_000)

    const targetCard = await findSellersCardWithAcceptedOffer(page)
    expect(targetCard, "Expected a sellers card with accepted offer").not.toBeNull()

    const panel = await openPropertyPanel(page, targetCard!)
    await goToPropertySummaryTab(panel)

    const conditionsPanel = panel.locator('[data-testid^="offer-conditions-panel--"]')
    await expect(conditionsPanel).toBeVisible({ timeout: 15_000 })
    const offerId = (await conditionsPanel.getAttribute("data-testid"))!.replace("offer-conditions-panel--", "")
    const checkbox = conditionsPanel.getByTestId(`offer-conditions-subject-to-sale-checkbox--${offerId}`)

    // Enable, type custom address, save
    if (!await checkbox.isChecked()) {
      await checkbox.click()
    }
    const addressInput = conditionsPanel.getByTestId(`offer-conditions-subject-to-sale-address--${offerId}`)
    await addressInput.fill("77 Temp Address Lane, Sydney NSW 2000")
    const saveBtn = conditionsPanel.getByRole("button", { name: /^save conditions$/i })
    await saveBtn.click()
    await expect(saveBtn).toBeEnabled({ timeout: 20_000 })

    // Uncheck and save (clears address to null)
    await checkbox.click()
    await expect(checkbox).not.toBeChecked()
    await saveBtn.click()
    await expect(saveBtn).toBeEnabled({ timeout: 20_000 })

    // Re-enable — address input should pre-fill from member's propertyToSellAddress (stored is null)
    await checkbox.click()
    await expect(checkbox).toBeChecked()
    const refillInput = conditionsPanel.getByTestId(`offer-conditions-subject-to-sale-address--${offerId}`)
    await expect(refillInput).toBeVisible()
    const refillValue = await refillInput.inputValue()
    expect(
      refillValue !== "77 Temp Address Lane, Sydney NSW 2000",
      "Expected address to pre-fill from member (not the previously saved custom address) after a null save",
    ).toBeTruthy()

    // Restore: uncheck and save
    await checkbox.click()
    await saveBtn.click()
    await expect(saveBtn).toBeEnabled({ timeout: 20_000 })
  })
})
