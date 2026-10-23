/**
 * Edit Property dialog — "Property to sell" pre-fill from buyer member address.
 *
 * Verifies that the Edit Property dialog's Contract Conditions panel seeds the
 * "Property to sell" field from the accepted buyer's member data
 * (`memberPropertyToSellAddress`) when no address is stored in the DB.
 *
 * Covers MV happy path steps 1–9, 15–28 and edge cases 29–35.
 */
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

const MEMBER_PROPERTY_TO_SELL = "28 RIDGEGARDEN DRIVE MORAYFIELD QLD 4506"
const MEMBER_HOME_ADDRESS = "10 FALLBACK STREET BRISBANE QLD 4000"
const PROPERTY_STREET = "184/46 AMY STREET"
const PROPERTY_ADDRESS_FULL = "184/46 AMY STREET MORAYFIELD QLD 4506"
const SEED_REP_ADDRESS = "55 E2E Rep Street, Brisbane QLD 4000"

// ─── Mock fixtures ───────────────────────────────────────────────────────────

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
  salePrice: 805000,
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

function makeOffer(overrides: {
  subjectToSaleAddress?: string | null
  memberPropertyToSellAddress?: string | null
  subjectToSaleStage?: string | null
}) {
  return {
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
    subjectToSaleStage: overrides.subjectToSaleStage ?? null,
    subjectToSaleAddress: overrides.subjectToSaleAddress ?? null,
    memberPropertyToSellAddress: overrides.memberPropertyToSellAddress ?? null,
    saleOfPropertyDays: 30,
    unconditionalContractDays: 45,
    depositInitial: "2000.00",
    depositBalance: "18000.00",
    otherConditions: null,
    customConditions: null,
    conditionNotes: null,
  }
}

const STATUS_MIN = {
  items: [{ propertyStatusId: 1, propertyStatusCode: "ACTIVE", propertyStatus: "Active" }],
  totalCount: 1, limit: 100, totalPages: 1, hasNextPage: false, hasPreviousPage: false,
  startCursor: null, endCursor: null,
}
const EMPTY_LIST = {
  items: [] as unknown[], totalCount: 0, limit: 20, totalPages: 0,
  hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null,
}

async function installMockedRoutes(page: Page, offer: ReturnType<typeof makeOffer>) {
  const listResponse = {
    items: [PROPERTY_FAVORITE], totalCount: 1, limit: 25, totalPages: 1,
    hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null,
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

async function openEditPropertySalesTab(page: Page) {
  await page.goto("/admin/properties")
  await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible({ timeout: 15_000 })
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

// ─── Mocked: Edit Property dialog — new suggestedAddress wiring ──────────────

test.describe("Edit Property dialog — Property to sell pre-fill from buyer member (mocked)", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaE2eAdminCredentials()
    await signInAsAdmin(page)
  })

  test("pre-fills from memberPropertyToSellAddress when subjectToSaleAddress is null", async ({ page }) => {
    const offer = makeOffer({ subjectToSaleAddress: null, memberPropertyToSellAddress: MEMBER_PROPERTY_TO_SELL, subjectToSaleStage: "To be listed" })
    await installMockedRoutes(page, offer)
    const { panel, offerId } = await openEditPropertySalesTab(page)
    const addressInput = panel.getByTestId(`offer-conditions-subject-to-sale-address--${offerId}`)
    await expect(addressInput).toBeVisible()
    await expect(addressInput).toHaveValue(MEMBER_PROPERTY_TO_SELL)
  })

  test("stored subjectToSaleAddress takes precedence over memberPropertyToSellAddress", async ({ page }) => {
    const storedAddress = "42 STORED STREET BRISBANE QLD 4000"
    const offer = makeOffer({ subjectToSaleAddress: storedAddress, memberPropertyToSellAddress: MEMBER_PROPERTY_TO_SELL, subjectToSaleStage: "To be listed" })
    await installMockedRoutes(page, offer)
    const { panel, offerId } = await openEditPropertySalesTab(page)
    const addressInput = panel.getByTestId(`offer-conditions-subject-to-sale-address--${offerId}`)
    await expect(addressInput).toBeVisible()
    await expect(addressInput).toHaveValue(storedAddress)
    expect(await addressInput.inputValue()).not.toBe(MEMBER_PROPERTY_TO_SELL)
  })

  test("field is empty when both subjectToSaleAddress and memberPropertyToSellAddress are null", async ({ page }) => {
    const offer = makeOffer({ subjectToSaleAddress: null, memberPropertyToSellAddress: null, subjectToSaleStage: "To be listed" })
    await installMockedRoutes(page, offer)
    const { panel, offerId } = await openEditPropertySalesTab(page)
    const addressInput = panel.getByTestId(`offer-conditions-subject-to-sale-address--${offerId}`)
    await expect(addressInput).toBeVisible()
    await expect(addressInput).toHaveValue("")
  })

  test("pre-fills from memberAddress fallback when propertyToSellAddress is null (field contains home address)", async ({ page }) => {
    // memberPropertyToSellAddress may be computed from memberAddress on the server — test that any non-null value is honoured
    const offer = makeOffer({ subjectToSaleAddress: null, memberPropertyToSellAddress: MEMBER_HOME_ADDRESS, subjectToSaleStage: "To be listed" })
    await installMockedRoutes(page, offer)
    const { panel, offerId } = await openEditPropertySalesTab(page)
    const addressInput = panel.getByTestId(`offer-conditions-subject-to-sale-address--${offerId}`)
    await expect(addressInput).toBeVisible()
    await expect(addressInput).toHaveValue(MEMBER_HOME_ADDRESS)
  })

  test("field never shows property's own street address when memberPropertyToSellAddress is set", async ({ page }) => {
    const offer = makeOffer({ subjectToSaleAddress: null, memberPropertyToSellAddress: MEMBER_PROPERTY_TO_SELL, subjectToSaleStage: "To be listed" })
    await installMockedRoutes(page, offer)
    const { panel, offerId } = await openEditPropertySalesTab(page)
    const addressInput = panel.getByTestId(`offer-conditions-subject-to-sale-address--${offerId}`)
    const value = await addressInput.inputValue()
    expect(value).not.toContain(PROPERTY_STREET)
    expect(value).not.toContain(PROPERTY_ADDRESS_FULL)
  })
})

// ─── Live seeded: Edit Property dialog ──────────────────────────────────────

test.describe("Edit Property dialog — Property to sell pre-fill (live seeded)", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaLiveE2eEnv()
    await signInAsAdmin(page)
  })

  test("edit dialog: pre-fills with seed buyer rep propertyToSellAddress when stored is null", async ({ page }) => {
    test.setTimeout(120_000)

    // Navigate to admin properties and find seed property by address
    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible({ timeout: 15_000 })

    // Find the seed property row by its address text and click it
    const seedRow = page.getByRole("row").filter({ hasText: PANDA_PIPELINE_SEED_CARD_ADDRESS_SNIPPET }).first()
    await expect(seedRow, "Seed property row not found — run: npm run e2e:seed:sellers-accepted -w panda-realty").toBeVisible({ timeout: 10_000 })
    await seedRow.click()

    const dialog = page.getByTestId("admin-entity-crud-dialog--properties")
    await expect(dialog).toBeVisible({ timeout: 15_000 })
    await page.getByTestId("panda-properties-form-tab-trigger--sales").click()
    await expect(page.getByTestId("panda-properties-form-tab--sales")).toBeVisible()

    const panel = dialog.locator('[data-testid^="offer-conditions-panel--"]')
    await expect(panel).toBeVisible({ timeout: 15_000 })
    const offerId = (await panel.getAttribute("data-testid"))!.replace("offer-conditions-panel--", "")

    const checkbox = panel.getByTestId(`offer-conditions-subject-to-sale-checkbox--${offerId}`)
    const saveBtn = panel.getByRole("button", { name: /^save conditions$/i })

    // Ensure clean state — clear any stored subject_to_sale_address
    if (await checkbox.isChecked()) {
      await checkbox.click()
      await expect(checkbox).not.toBeChecked()
      await saveBtn.click()
      await expect(saveBtn).toBeEnabled({ timeout: 20_000 })
      // Reopen dialog to get fresh data
      await page.keyboard.press("Escape")
      await page.waitForTimeout(300)
      await seedRow.click()
      await expect(dialog).toBeVisible({ timeout: 15_000 })
      await page.getByTestId("panda-properties-form-tab-trigger--sales").click()
      await expect(panel).toBeVisible({ timeout: 15_000 })
    }

    // Enable subject to sale — should pre-fill with rep's propertyToSellAddress
    await checkbox.click()
    await expect(checkbox).toBeChecked()

    const addressInput = panel.getByTestId(`offer-conditions-subject-to-sale-address--${offerId}`)
    await expect(addressInput).toBeVisible()
    await expect(addressInput).toHaveValue(SEED_REP_ADDRESS)

    // Restore
    await checkbox.click()
    await expect(checkbox).not.toBeChecked()
    await saveBtn.click()
    await expect(saveBtn).toBeEnabled({ timeout: 20_000 })
  })
})

// ─── Live seeded: Pipeline board — memberAddress fallback ────────────────────

test.describe("Pipeline board — memberAddress fallback in suggestedAddress (live seeded)", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaLiveE2eEnv()
    await signInAsAdmin(page)
    await gotoSellersPipeline(page)
  })

  test("pipeline board: pre-fills from rep propertyToSellAddress (confirms property-queries.ts fix)", async ({ page }) => {
    test.setTimeout(120_000)

    const seedCard = sellersCardByAddressSnippet(page, PANDA_PIPELINE_SEED_CARD_ADDRESS_SNIPPET)
    await expect(seedCard.first(), "Seed card not found — run: npm run e2e:seed:sellers-accepted -w panda-realty").toBeVisible({ timeout: 15_000 })
    const panel = await openPropertyPanel(page, seedCard.first())
    await goToPropertySummaryTab(panel)

    const conditionsPanel = panel.locator('[data-testid^="offer-conditions-panel--"]')
    await expect(conditionsPanel).toBeVisible({ timeout: 15_000 })
    const offerId = (await conditionsPanel.getAttribute("data-testid"))!.replace("offer-conditions-panel--", "")
    const checkbox = conditionsPanel.getByTestId(`offer-conditions-subject-to-sale-checkbox--${offerId}`)
    const saveBtn = conditionsPanel.getByRole("button", { name: /^save conditions$/i })

    // Ensure clean state
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
})
