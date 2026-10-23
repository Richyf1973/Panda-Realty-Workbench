/**
 * E2E: Offer conditions panel — "Other" textarea removed
 *
 * Mocked tests verify:
 * 1. "Other" textarea (placeholder "Any other conditions…") is absent from the
 *    conditions panel in the property dialog Sales tab.
 * 2. "Condition Notes" field is still present.
 * 3. An offer with only `otherConditions` set (all day/deposit fields null,
 *    no cash/conditions flags) shows "+ Conditions" on the toggle button
 *    (i.e. hasAnyCondition no longer counts otherConditions).
 *
 * All HTTP calls are mocked — no live DB required.
 *
 * Run:
 *   npm run test:e2e -w panda-realty -- apps/panda-realty/e2e/offer-conditions-remove-other-field.spec.ts
 */

import { expect, test, type Page } from "@playwright/test"

import { requirePandaE2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import {
  BUYER_ENTITY_DETAIL,
  BUYER_ENTITY_ROW,
  EMPTY_LIST,
} from "./helpers/buyer-offers-edit-mocks"

// ─── Shared fixtures ──────────────────────────────────────────────────────────

const OFFER_ID = 196
const PROPERTY_LIST_ID = 1001
const MOCK_PE_ID = 501

const BASE_OFFER = {
  buyerOfferId: OFFER_ID,
  entityName: "E2E Test Buyer",
  offer: "805000.00",
  isAccepted: true,
  dateOffered: "2026-04-24",
  createdAt: "2026-04-24T00:00:00Z",
  isCashOffer: false,
  noConditions: false,
  coolingOffDays: null,
  financeDays: null,
  buildingPestDays: null,
  dueDiligenceDays: null,
  subjectToSaleDays: null,
  subjectToSaleStage: null,
  saleOfPropertyDays: null,
  unconditionalContractDays: null,
  depositInitial: null,
  depositBalance: null,
  otherConditions: null,
  customConditions: null,
  conditionNotes: null,
}

const PROPERTY_FAVORITE = {
  propertyListId: PROPERTY_LIST_ID,
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

const EMPTY_PAGINATED = {
  items: [],
  totalCount: 0,
  limit: 20,
  totalPages: 0,
  hasNextPage: false,
  hasPreviousPage: false,
  startCursor: null,
  endCursor: null,
}

// ─── Properties dialog helpers ─────────────────────────────────────────────────

async function setupPropertiesRoutes(page: Page, offer: object): Promise<void> {
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
        body: JSON.stringify([offer]),
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
      body: JSON.stringify(EMPTY_PAGINATED),
    }),
  )
}

async function openSalesConditionsPanel(page: Page) {
  await page.goto("/admin/properties")
  await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible({
    timeout: 15_000,
  })
  await page.getByTestId(`admin-entity-row--properties--${PROPERTY_LIST_ID}`).click()
  const dialog = page.getByTestId("admin-entity-crud-dialog--properties")
  await expect(dialog).toBeVisible({ timeout: 15_000 })
  await page.getByTestId("panda-properties-form-tab-trigger--sales").click()
  await expect(page.getByTestId("panda-properties-form-tab--sales")).toBeVisible()
  const panel = dialog.locator(`[data-testid="offer-conditions-panel--${OFFER_ID}"]`)
  await expect(panel).toBeVisible({ timeout: 10_000 })
  return { dialog, panel }
}

// ─── Entity panel helpers ──────────────────────────────────────────────────────

async function installEntityRoutes(page: Page, offers: object[]): Promise<void> {
  const buyerOffersResponse = {
    propertyListId: MOCK_PE_ID,
    contractDate: null,
    offers,
  }

  await page.route("**/api/admin/entities**", async (route) => {
    if (route.request().method() !== "GET") { await route.continue(); return }
    const url = route.request().url()
    if (url.match(/\/api\/admin\/entities\/201(\?|$)/)) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(BUYER_ENTITY_DETAIL) })
      return
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ...EMPTY_LIST, items: [BUYER_ENTITY_ROW], totalCount: 1, totalPages: 1 }),
    })
  })

  const CONNECTION = {
    propertyEntityId: MOCK_PE_ID, entityId: 201, propertyListId: PROPERTY_LIST_ID,
    propertyEntityNote: null, buyerPipelineStatusId: null, isOriginalOwner: false,
    buyerPipelineStatus: null,
    propertyRef: { streetAddress: "45 Test Street", state: "QLD", postcode: "4505" },
    entityMembers: [], propertyEntityFiles: [], propertyEntityNotes: [],
  }

  await page.route("**/api/admin/property-entities**", async (route) => {
    if (route.request().method() !== "GET") { await route.continue(); return }
    const url = route.request().url()
    if (url.match(/\/property-entities\/\d+\/buyer-offers/)) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(buyerOffersResponse) })
      return
    }
    if (url.match(/\/property-entities\/\d+/)) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(CONNECTION) })
      return
    }
    // List endpoint — return the connection so the "Offers" tab appears
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [CONNECTION] }) })
  })

  for (const pattern of [
    "**/api/admin/entity-members**",
    "**/api/admin/buyer-status**",
    "**/api/admin/property-status**",
    "**/api/admin/buyer-pipeline-status**",
    "**/api/admin/entity-categories**",
    "**/api/admin/lead-sources**",
    "**/api/admin/contact-categories**",
  ]) {
    await page.route(pattern, (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_LIST) }),
    )
  }
}

async function openEntityOffersTab(page: Page) {
  await page.goto("/admin/entities?limit=25&page=1&sortKey=entityName&sortDir=asc&entityCategoryId=1&listLayout=grid")
  await page.waitForLoadState("domcontentloaded")
  await page.getByTestId(/^admin-entity-row-edit--entities--/).first().click()
  const dialog = page.getByTestId("admin-entity-crud-dialog--entities")
  await expect(dialog).toBeVisible()
  const dialogForm = dialog.getByTestId("panda-entities-dialog-form")
  await dialogForm.evaluate((el) => el.scrollTo(0, el.scrollHeight))
  const connections = dialog.getByTestId("panda-entities-property-connections")
  await expect(connections).toBeVisible({ timeout: 10_000 })
  const peTabs = connections.getByTestId("admin-entity-crud-related-tabs--property-entities")
  await expect(peTabs.getByRole("tab", { name: /^offers$/i })).toBeVisible({ timeout: 10_000 })
  await peTabs.getByRole("tab", { name: /^offers$/i }).click()
  const panel = connections.getByTestId("admin-entity-crud-related-panel--property-entities--buyer-offers-tab")
  await expect(panel).toBeVisible({ timeout: 10_000 })
  return { dialog, panel }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe("Offer conditions panel — Other field removed", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaE2eAdminCredentials()
    await signInAsAdmin(page)
  })

  test("Other textarea is absent from the conditions panel", async ({ page }) => {
    await setupPropertiesRoutes(page, { ...BASE_OFFER, isAccepted: true })
    const { panel } = await openSalesConditionsPanel(page)
    await expect(panel.locator('textarea[placeholder="Any other conditions…"]')).toHaveCount(0)
  })

  test("Condition Notes field is still present", async ({ page }) => {
    await setupPropertiesRoutes(page, { ...BASE_OFFER, isAccepted: true })
    const { panel } = await openSalesConditionsPanel(page)
    await expect(panel.getByTestId(`offer-conditions-condition-notes--${OFFER_ID}`)).toBeVisible()
  })

  test("Other label text is absent from the conditions panel", async ({ page }) => {
    await setupPropertiesRoutes(page, { ...BASE_OFFER, isAccepted: true })
    const { panel } = await openSalesConditionsPanel(page)
    // The "Other" label must not appear (only "Condition Notes" / "Other conditions" labels remain)
    const otherLabel = panel.locator("label", { hasText: /^Other$/ })
    await expect(otherLabel).toHaveCount(0)
  })

  test("offer with only otherConditions set shows '+ Conditions' toggle (hasAnyCondition excludes it)", async ({
    page,
  }) => {
    // All condition fields null/false except otherConditions — after the change,
    // hasAnyCondition must return false, so the toggle shows "+ Conditions" not "Conditions".
    const offerOnlyOtherConditions = {
      buyerOfferId: 9001,
      offer: "750000",
      isAccepted: true,
      dateOffered: "2026-04-01",
      isCashOffer: false,
      noConditions: false,
      coolingOffDays: null,
      financeDays: null,
      buildingPestDays: null,
      dueDiligenceDays: null,
      subjectToSaleDays: null,
      subjectToSaleStage: null,
      saleOfPropertyDays: null,
      unconditionalContractDays: null,
      depositInitial: null,
      depositBalance: null,
      otherConditions: "Some legacy free-text condition from before structured fields existed",
      customConditions: null,
      conditionNotes: null,
      settlementCalendarEventId: null,
      coolingOffCalendarEventId: null,
      financeCalendarEventId: null,
      buildingPestCalendarEventId: null,
    }

    await installEntityRoutes(page, [offerOnlyOtherConditions])
    const { panel } = await openEntityOffersTab(page)

    const toggle = panel.getByTestId(`buyer-offer-conditions-toggle--9001`)
    await expect(toggle).toBeVisible({ timeout: 10_000 })
    // Must show "+ Conditions" (hasAnyCondition returned false)
    await expect(toggle).toHaveText(/^\+ Conditions/)
    // Must NOT show plain "Conditions" without the "+" prefix
    await expect(toggle).not.toHaveText(/^Conditions/)
  })
})
