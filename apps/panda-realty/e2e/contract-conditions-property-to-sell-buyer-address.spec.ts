import { expect, test, type Page } from "@playwright/test"

import { requirePandaE2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import {
  PANDA_PIPELINE_SEED_CARD_ADDRESS_SNIPPET,
  goToPropertySummaryTab,
  gotoSellersPipeline,
  openPropertyPanel,
  sellersCardByAddressSnippet,
} from "./helpers/panda-pipeline-panels"
import { requirePandaLiveE2eEnv } from "./helpers/require-panda-live-e2e-env"

const BUYER_SALE_ADDRESS = "28 RIDGEGARDEN DRIVE MORAYFIELD QLD 4506"
const PROPERTY_ADDRESS_FRAGMENT = "184/46 AMY STREET"
const SEED_REP_ADDRESS = "55 E2E Rep Street, Brisbane QLD 4000"

// ─── Mock fixtures ──────────────────────────────────────────────────────────────

const BASE_OFFER = {
  buyerOfferId: 196,
  entityName: "Chris & Merilyn Matthews",
  offer: "805000.00",
  isAccepted: true,
  dateOffered: "2026-04-24",
  createdAt: "2026-04-24T00:00:00Z",
  isCashOffer: false,
  noConditions: false,
  coolingOffDays: 21,
  financeDays: 0,
  buildingPestDays: 7,
  dueDiligenceDays: null,
  subjectToSaleDays: 30,
  subjectToSaleStage: "To be listed" as string | null,
  subjectToSaleAddress: BUYER_SALE_ADDRESS as string | null,
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
  streetAddress: "184/46 AMY STREET",
  suburb: "MORAYFIELD",
  state: "QLD",
  postcode: "4506",
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
  items: [] as unknown[],
  totalCount: 0,
  limit: 20,
  totalPages: 0,
  hasNextPage: false,
  hasPreviousPage: false,
  startCursor: null,
  endCursor: null,
}

async function setupMockedRoutes(page: Page, offer: typeof BASE_OFFER): Promise<void> {
  const listResponse = { items: [PROPERTY_FAVORITE], totalCount: 1, limit: 25, totalPages: 1, hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null }
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

async function openSeedConditionsPanel(page: Page) {
  const seedCard = sellersCardByAddressSnippet(page, PANDA_PIPELINE_SEED_CARD_ADDRESS_SNIPPET)
  await expect(seedCard.first()).toBeVisible({ timeout: 15_000 })
  const panel = await openPropertyPanel(page, seedCard.first())
  await goToPropertySummaryTab(panel)
  const conditionsPanel = panel.locator('[data-testid^="offer-conditions-panel--"]')
  await expect(conditionsPanel).toBeVisible({ timeout: 15_000 })
  const offerId = (await conditionsPanel.getAttribute("data-testid"))!.replace("offer-conditions-panel--", "")
  const checkbox = conditionsPanel.getByTestId(`offer-conditions-subject-to-sale-checkbox--${offerId}`)
  const saveBtn = conditionsPanel.getByRole("button", { name: /^save conditions$/i })
  return { conditionsPanel, offerId, checkbox, saveBtn }
}

// ─── Mocked tests ───────────────────────────────────────────────────────────────

test.describe("Contract conditions — Property to sell buyer address (mocked)", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaE2eAdminCredentials()
    await signInAsAdmin(page)
  })

  test("edit dialog: stored buyer sale address is displayed in Property to sell field", async ({ page }) => {
    await setupMockedRoutes(page, { ...BASE_OFFER })
    const { panel } = await openSalesTabPanel(page)
    const addressInput = panel.getByTestId("offer-conditions-subject-to-sale-address--196")
    await expect(addressInput).toBeVisible()
    await expect(addressInput).toHaveValue(BUYER_SALE_ADDRESS)
  })

  test("edit dialog: field shows buyer sale address, NOT the property address", async ({ page }) => {
    await setupMockedRoutes(page, { ...BASE_OFFER })
    const { panel } = await openSalesTabPanel(page)
    const addressInput = panel.getByTestId("offer-conditions-subject-to-sale-address--196")
    await expect(addressInput).toBeVisible()
    const value = await addressInput.inputValue()
    expect(value).toBe(BUYER_SALE_ADDRESS)
    expect(value).not.toContain(PROPERTY_ADDRESS_FRAGMENT)
  })
})

// ─── Live seeded tests ──────────────────────────────────────────────────────────

test.describe("Contract conditions — Property to sell buyer address (live seeded)", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaLiveE2eEnv()
    await signInAsAdmin(page)
    await gotoSellersPipeline(page)
  })

  test("pipeline board: pre-fills from buyer rep propertyToSellAddress, not property address", async ({ page }) => {
    test.setTimeout(120_000)

    const { conditionsPanel, offerId, checkbox, saveBtn } = await openSeedConditionsPanel(page)

    // Clear any stored address first
    if (await checkbox.isChecked()) {
      await checkbox.click()
      await expect(checkbox).not.toBeChecked()
      await saveBtn.click()
      await expect(saveBtn).toBeEnabled({ timeout: 20_000 })
    }

    await checkbox.click()
    await expect(checkbox).toBeChecked()

    const addressInput = conditionsPanel.getByTestId(`offer-conditions-subject-to-sale-address--${offerId}`)
    await expect(addressInput).toBeVisible()
    await expect(addressInput).toHaveValue(SEED_REP_ADDRESS)

    // Restore
    await checkbox.click()
    await saveBtn.click()
    await expect(saveBtn).toBeEnabled({ timeout: 20_000 })
  })

  test("pipeline board: stored address takes precedence over member pre-fill", async ({ page }) => {
    test.setTimeout(120_000)

    const { conditionsPanel, offerId, checkbox, saveBtn } = await openSeedConditionsPanel(page)

    if (!await checkbox.isChecked()) {
      await checkbox.click()
      await expect(checkbox).toBeChecked()
    }

    const customAddress = "42 Custom Override, Sydney NSW 2000"
    const addressInput = conditionsPanel.getByTestId(`offer-conditions-subject-to-sale-address--${offerId}`)
    await addressInput.fill(customAddress)
    await saveBtn.click()
    await expect(saveBtn).toBeEnabled({ timeout: 20_000 })

    // Close and reopen
    await page.keyboard.press("Escape")
    await page.waitForTimeout(300)
    await gotoSellersPipeline(page)

    const { conditionsPanel: reopenedConditions, offerId: reopenedOfferId, checkbox: reopenedCheckbox, saveBtn: restoreBtn } = await openSeedConditionsPanel(page)
    const reopenedAddress = reopenedConditions.getByTestId(`offer-conditions-subject-to-sale-address--${reopenedOfferId}`)
    await expect(reopenedAddress).toHaveValue(customAddress)
    expect(await reopenedAddress.inputValue()).not.toBe(SEED_REP_ADDRESS)

    // Restore
    await reopenedCheckbox.click()
    await restoreBtn.click()
    await expect(restoreBtn).toBeEnabled({ timeout: 20_000 })
  })

  test("pipeline board: uncheck → save → re-enable re-fills from buyer member address", async ({ page }) => {
    test.setTimeout(120_000)

    const { conditionsPanel, offerId, checkbox, saveBtn } = await openSeedConditionsPanel(page)

    if (!await checkbox.isChecked()) {
      await checkbox.click()
      await expect(checkbox).toBeChecked()
      await saveBtn.click()
      await expect(saveBtn).toBeEnabled({ timeout: 20_000 })
    }

    // Uncheck and save (clears subject_to_sale_address to null in DB)
    await checkbox.click()
    await expect(checkbox).not.toBeChecked()
    await saveBtn.click()
    await expect(saveBtn).toBeEnabled({ timeout: 20_000 })

    // Re-enable — must pre-fill from buyer rep's propertyToSellAddress
    await checkbox.click()
    await expect(checkbox).toBeChecked()

    const addressInput = conditionsPanel.getByTestId(`offer-conditions-subject-to-sale-address--${offerId}`)
    await expect(addressInput).toBeVisible()
    await expect(addressInput).toHaveValue(SEED_REP_ADDRESS)

    // Restore
    await checkbox.click()
    await saveBtn.click()
    await expect(saveBtn).toBeEnabled({ timeout: 20_000 })
  })
})
