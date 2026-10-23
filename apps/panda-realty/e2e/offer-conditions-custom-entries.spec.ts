/**
 * E2E: Contract Conditions — Custom User-Defined Entries
 *
 * Mocked tests verify:
 * - "+ Add condition" button renders.
 * - Clicking it adds a row with label input, days input, calendar button, ✕ button.
 * - Existing custom conditions from mock offer render with correct values.
 * - ✕ button removes a row.
 * - Calendar button is disabled when no contract date is set.
 * - Existing "Other" textarea is still present.
 *
 * Live test verifies:
 * - Adding a custom condition, saving, and reloading shows the value persisted.
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

const ACCEPTED_OFFER_WITH_CUSTOM = {
  buyerOfferId: 196,
  entityName: "E2E Test Buyer",
  offer: "805000.00",
  isAccepted: true,
  dateOffered: "2026-04-26",
  createdAt: "2026-04-26T00:00:00Z",
  isCashOffer: false,
  noConditions: false,
  coolingOffDays: 14,
  financeDays: null,
  buildingPestDays: null,
  dueDiligenceDays: null,
  subjectToSaleDays: 60,
  subjectToSaleStage: null,
  saleOfPropertyDays: null,
  unconditionalContractDays: null,
  completionDateDays: null,
  depositInitial: "2000.00",
  depositBalance: "18000.00",
  otherConditions: null,
  customConditions: [{ label: "smoke alarm check", days: 45 }],
  conditionNotes: null,
}

const ACCEPTED_OFFER_NO_CONTRACT = {
  ...ACCEPTED_OFFER_WITH_CUSTOM,
  customConditions: null,
}

const PROPERTY_WITH_CONTRACT = {
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

const PROPERTY_NO_CONTRACT = {
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
  property: object,
  buyerOffers: unknown[],
): Promise<void> {
  const listResponse = {
    items: [property],
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
        body: JSON.stringify(property),
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
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(STATUS_MIN) }),
  )
  await page.route("**/api/admin/property-entities**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_LIST) }),
  )
}

async function openSalesTabConditionsPanel(page: Page) {
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

// ─── Mocked rendering tests ───────────────────────────────────────────────────

test.describe("Custom conditions — rendering (mocked)", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaE2eAdminCredentials()
    await signInAsAdmin(page)
  })

  test("'+ Add condition' button renders in the panel", async ({ page }) => {
    await setupMockedRoutes(page, PROPERTY_WITH_CONTRACT, [ACCEPTED_OFFER_WITH_CUSTOM])
    const { panel, offerId } = await openSalesTabConditionsPanel(page)
    await expect(panel.getByTestId(`offer-conditions-custom-add--${offerId}`)).toBeVisible()
  })

  test("existing custom conditions from mock render with correct values", async ({ page }) => {
    await setupMockedRoutes(page, PROPERTY_WITH_CONTRACT, [ACCEPTED_OFFER_WITH_CUSTOM])
    const { panel, offerId } = await openSalesTabConditionsPanel(page)
    await expect(panel.getByTestId(`offer-conditions-custom-label--0--${offerId}`)).toHaveValue(
      "smoke alarm check",
    )
    await expect(panel.getByTestId(`offer-conditions-custom-days--0--${offerId}`)).toHaveValue("45")
    await expect(
      panel.getByTestId(`offer-conditions-custom-calendar-btn--0--${offerId}`),
    ).toBeEnabled()
  })

  test("clicking '+ Add condition' adds a new empty row", async ({ page }) => {
    await setupMockedRoutes(page, PROPERTY_WITH_CONTRACT, [ACCEPTED_OFFER_WITH_CUSTOM])
    const { panel, offerId } = await openSalesTabConditionsPanel(page)
    await panel.getByTestId(`offer-conditions-custom-add--${offerId}`).click()
    await expect(panel.getByTestId(`offer-conditions-custom-label--1--${offerId}`)).toBeVisible()
    await expect(panel.getByTestId(`offer-conditions-custom-days--1--${offerId}`)).toBeVisible()
    await expect(panel.getByTestId(`offer-conditions-custom-remove--1--${offerId}`)).toBeVisible()
  })

  test("✕ button removes the row", async ({ page }) => {
    await setupMockedRoutes(page, PROPERTY_WITH_CONTRACT, [ACCEPTED_OFFER_WITH_CUSTOM])
    const { panel, offerId } = await openSalesTabConditionsPanel(page)
    await expect(panel.getByTestId(`offer-conditions-custom-label--0--${offerId}`)).toBeVisible()
    await panel.getByTestId(`offer-conditions-custom-remove--0--${offerId}`).click()
    await expect(panel.getByTestId(`offer-conditions-custom-label--0--${offerId}`)).not.toBeVisible()
  })

  test("calendar button is disabled when contract date is null", async ({ page }) => {
    await setupMockedRoutes(page, PROPERTY_NO_CONTRACT, [ACCEPTED_OFFER_NO_CONTRACT])
    const { panel, offerId } = await openSalesTabConditionsPanel(page)
    await panel.getByTestId(`offer-conditions-custom-add--${offerId}`).click()
    await expect(
      panel.getByTestId(`offer-conditions-custom-calendar-btn--0--${offerId}`),
    ).toBeDisabled()
  })

  test("existing 'Other' textarea is still present", async ({ page }) => {
    await setupMockedRoutes(page, PROPERTY_WITH_CONTRACT, [ACCEPTED_OFFER_WITH_CUSTOM])
    const { panel, offerId } = await openSalesTabConditionsPanel(page)
    await expect(panel.locator(`#other-${offerId}`)).toBeVisible()
  })
})

// ─── Live persistence test ────────────────────────────────────────────────────

test.describe("Custom conditions — persistence (live)", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaLiveE2eEnv()
    requirePandaE2eAdminCredentials()
    await signInAsAdmin(page)
    await gotoSellersPipeline(page)
  })

  test("custom condition saves and persists after dialog close/reopen", async ({ page }) => {
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
    const offerId = (await conditionsRoot.getAttribute("data-testid"))!.replace(
      "offer-conditions-panel--",
      "",
    )

    const addBtn = dialog.getByTestId(`offer-conditions-custom-add--${offerId}`)
    await expect(addBtn).toBeVisible({ timeout: 10_000 })

    // Remove any pre-existing custom rows so the test is deterministic
    const existingRows = dialog.locator(`[data-testid^="offer-conditions-custom-remove--"]`)
    const count = await existingRows.count()
    for (let i = count - 1; i >= 0; i--) {
      await existingRows.nth(i).click()
    }

    await addBtn.click()
    const labelInput = dialog.getByTestId(`offer-conditions-custom-label--0--${offerId}`)
    const daysInput = dialog.getByTestId(`offer-conditions-custom-days--0--${offerId}`)
    await labelInput.fill("e2e test condition")
    await daysInput.fill("17")

    const saveBtn = dialog.getByRole("button", { name: /^save conditions$/i })
    await saveBtn.click()
    await expect(saveBtn).toBeEnabled({ timeout: 20_000 })
    await expect(
      dialog.getByTestId(`offer-conditions-saved-ok--${offerId}`),
    ).toBeVisible({ timeout: 5_000 })

    // Close and reopen
    await dialog
      .getByRole("button", { name: /close/i })
      .first()
      .click()
      .catch(() => propertiesPage.keyboard.press("Escape"))
    await expect(dialog).not.toBeVisible({ timeout: 10_000 })

    await propertiesPage.locator('[data-testid^="admin-entity-row--properties--"]').first().click()
    const dialog2 = propertiesPage.getByTestId("admin-entity-crud-dialog--properties")
    await expect(dialog2).toBeVisible({ timeout: 20_000 })
    await propertiesPage.getByTestId("panda-properties-form-tab-trigger--sales").click()
    const conditionsRoot2 = dialog2.locator('[data-testid^="offer-conditions-panel--"]')
    await expect(conditionsRoot2).toBeVisible({ timeout: 15_000 })
    const offerId2 = (await conditionsRoot2.getAttribute("data-testid"))!.replace(
      "offer-conditions-panel--",
      "",
    )

    await expect(
      dialog2.getByTestId(`offer-conditions-custom-label--0--${offerId2}`),
    ).toHaveValue("e2e test condition", { timeout: 10_000 })
    await expect(
      dialog2.getByTestId(`offer-conditions-custom-days--0--${offerId2}`),
    ).toHaveValue("17")

    // Restore: remove the test row
    await dialog2.getByTestId(`offer-conditions-custom-remove--0--${offerId2}`).click()
    await dialog2.getByRole("button", { name: /^save conditions$/i }).click()
    await expect(
      dialog2.getByRole("button", { name: /^save conditions$/i }),
    ).toBeEnabled({ timeout: 20_000 })
  })
})
