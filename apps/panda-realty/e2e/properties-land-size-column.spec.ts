// Run: npm run test:e2e:scratch -- --app=panda-realty --spec=apps/panda-realty/e2e/properties-land-size-column.spec.ts

import { expect, test } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { createStory, shotFocused } from "@repo/e2e-utils"

import { e2eAdminCredentials, refreshPandaE2eEnv, signInAsAdmin } from "./helpers/admin-auth"
import { EMPTY_LIST_RESPONSE, STATUS_LIST_RESPONSE } from "./helpers/admin-properties-mocks"

/**
 * Properties admin — land size column in the regular (non-favorites/all) table.
 *
 * Success factors:
 * 1. Favorites OFF (isFavorite=all): "Land size" column header visible in the regular table.
 * 2. Row with landSize=600: cell shows "600.00" (numeric formatted).
 * 3. Row with null landSize: cell is empty (no "0" or error text).
 * 4. Favorites ON (default, no filters): Land size column absent (not in favorites column set).
 * 5. Quick-cards mode (Favorites ON + property-type filter active, row has landSize): card field is visible.
 */

const SHOT_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "screenshots",
  "properties-land-size-column",
)

const story = createStory({
  specUrl: import.meta.url,
  slug: "properties-land-size-column",
})

story.setWhatWasBuilt(
  "Added the Land size column to the regular (non-favorites/All) properties table. " +
    "Removed listSuppressedFromTable from the landSize column definition and added " +
    "landSize to pandaPropertiesEntity.listColumnOrder after salePrice.",
)

const baseItem = {
  propertyListId: 9001,
  streetAddress: "5 CLEARVIEW CRESCENT",
  suburb: "PETRIE",
  state: "QLD",
  postcode: "4502",
  propertyType: "House",
  bed: 3,
  bath: 2,
  car: 1,
  buildingArea: null as number | null,
  landSize: null as number | null,
  salePrice: 520000,
  saleDate: "2024-03-10",
  propertyStatusId: 1,
  buyerName: null,
  buyerId: null,
  owner1name: "TESTOWNER ONE",
  owner2name: null,
  owner3name: null,
  combinedOwner: "TESTOWNER ONE",
  isFavorite: true,
  priceUndisclosed: false,
  excludeFromReport: false,
  appraisedAmount: null,
  contractDate: null,
  contractPrice: null,
  commissionAmount: null,
  commissionRate: null,
  coolingOffDate: null,
  buildingPestDate: null,
  financeDate: null,
  dueDiligenceDate: null,
  saleOfPropertyDate: null,
  unconditionalContractDate: null,
  completionDate: null,
  isCashOffer: null,
  noConditions: null,
  isSubjectToSale: null,
  otherConditions: null,
  successfulBuyer: null,
  successfulBuyerPropertyEntityId: null,
  successfulBuyerEntityId: null,
  successfulBuyerPhoneNumber: null,
  successfulBuyerEmailAddress: null,
  updatedAt: "2026-01-01T00:00:00Z",
}

function makeListResponse(overrides: Partial<typeof baseItem>) {
  return {
    items: [{ ...baseItem, ...overrides }],
    totalCount: 1,
    limit: 25,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
    startCursor: null,
    endCursor: null,
  }
}

test.describe("Properties — land size column", () => {
  test.beforeEach(async ({ page }) => {
    refreshPandaE2eEnv()
    if (!e2eAdminCredentials) {
      throw new Error(
        "E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD must be set in apps/panda-realty/.env.local",
      )
    }
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.route("**/api/admin/property-status**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(STATUS_LIST_RESPONSE),
      })
    })
    await signInAsAdmin(page)
    await mkdir(SHOT_DIR, { recursive: true })
  })

  test.afterAll(() => {
    story.write()
  })

  // MV step 2: All mode — Land size column header visible
  test("All mode: Land size column header visible after Last sale price", async ({ page }) => {
    await page.route("**/api/admin/properties**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(EMPTY_LIST_RESPONSE),
      })
    })
    await page.goto("/admin/properties?isFavorite=all")
    const card = page.getByTestId("admin-entity-list-card--properties")
    await expect(card).toBeVisible()
    await expect(page.getByTestId("admin-entity-table-scroll--properties")).toBeVisible()

    const landSizeHeader = card.getByTestId("admin-entity-col-label--properties--landSize")
    await expect(landSizeHeader).toBeVisible({ timeout: 10_000 })

    const tableScroll = page.getByTestId("admin-entity-table-scroll--properties")
    await shotFocused(page, tableScroll, SHOT_DIR, "01-all-mode-land-size-header")
    story.addScene({
      title: "01 — All mode: Land size column header visible",
      images: [join(SHOT_DIR, "01-all-mode-land-size-header.png")],
      seeing: "The Land size column header is visible in the All-mode properties table after Last sale price.",
      steps: [
        "Navigate to /admin/properties?isFavorite=all",
        "Observe the Land size column header in the table",
      ],
    })
  })

  // MV step 3: Row with landSize=600 shows formatted value
  test("All mode: row with landSize value shows formatted numeric in cell", async ({ page }) => {
    const listResponse = makeListResponse({ landSize: 600 })
    await page.route("**/api/admin/properties**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(listResponse),
      })
    })
    await page.goto("/admin/properties?isFavorite=all")
    const tableScroll = page.getByTestId("admin-entity-table-scroll--properties")
    await expect(tableScroll).toBeVisible()

    const cell = page.getByTestId("admin-entity-row-cell--properties--9001--landSize")
    await expect(cell).toBeVisible({ timeout: 10_000 })
    await expect(cell).toContainText("600.00")

    await shotFocused(page, tableScroll, SHOT_DIR, "02-land-size-value-shown")
    story.addScene({
      title: "02 — Row with land size value",
      images: [join(SHOT_DIR, "02-land-size-value-shown.png")],
      seeing: "A row with landSize=600 shows 600.00 in the Land size cell.",
      steps: [
        "Navigate to /admin/properties?isFavorite=all with a mocked row where landSize=600",
        "Observe the Land size cell shows 600.00",
      ],
    })
  })

  // MV step 4: Row with null landSize shows empty cell
  test("All mode: row with null landSize shows blank cell", async ({ page }) => {
    const listResponse = makeListResponse({ landSize: null })
    await page.route("**/api/admin/properties**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(listResponse),
      })
    })
    await page.goto("/admin/properties?isFavorite=all")
    const card = page.getByTestId("admin-entity-list-card--properties")
    await expect(card).toBeVisible()

    const landSizeHeader = card.getByTestId("admin-entity-col-label--properties--landSize")
    await expect(landSizeHeader).toBeVisible({ timeout: 10_000 })

    // An empty numeric cell collapses to zero height — use toHaveCount instead of toBeVisible
    const cell = page.getByTestId("admin-entity-row-cell--properties--9001--landSize")
    await expect(cell).toHaveCount(1)
    await expect(cell).not.toContainText("0")
  })

  // MV step 1: Favorites ON (default) — Land size column NOT present
  test("Favorites mode: Land size column absent from favorites table", async ({ page }) => {
    await page.route("**/api/admin/properties**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(EMPTY_LIST_RESPONSE),
      })
    })
    await page.goto("/admin/properties")
    const card = page.getByTestId("admin-entity-list-card--properties")
    await expect(card).toBeVisible()
    await expect(page.getByTestId("admin-entity-table-scroll--properties")).toBeVisible()

    await expect(card.getByTestId("admin-entity-col-label--properties--landSize")).toHaveCount(0)

    const tableScroll = page.getByTestId("admin-entity-table-scroll--properties")
    await shotFocused(page, tableScroll, SHOT_DIR, "03-favorites-no-land-size")
    story.addScene({
      title: "03 — Favorites mode: Land size absent",
      images: [join(SHOT_DIR, "03-favorites-no-land-size.png")],
      seeing: "In Favorites mode the Land size column is not present (not in the favorites column set).",
      steps: [
        "Navigate to /admin/properties (default Favorites ON, no filters)",
        "Confirm Land size column header is absent",
      ],
    })
  })

  // MV step 7: Quick-cards mode — Land size card field visible when row has a value
  test("Quick-cards mode (favorites + property-type filter): Land size card field visible", async ({
    page,
  }) => {
    await page.route("**/api/admin/properties**", async (route) => {
      const url = route.request().url()
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          url.includes("propertyType=")
            ? makeListResponse({ landSize: 500 })
            : EMPTY_LIST_RESPONSE,
        ),
      })
    })
    await page.goto(`/admin/properties?propertyType=House`)
    const card = page.getByTestId("admin-entity-list-card--properties")
    await expect(card).toBeVisible()
    await expect(page.getByTestId("admin-entity-quick-cards-scroll--properties")).toBeVisible({ timeout: 30_000 })

    const landSizeField = page.getByTestId("admin-entity-quick-card-field--properties--landSize")
    await expect(landSizeField).toBeVisible({ timeout: 10_000 })

    await shotFocused(page, landSizeField, SHOT_DIR, "04-quick-cards-land-size")
    story.addScene({
      title: "04 — Quick-cards mode: Land size card field visible",
      images: [join(SHOT_DIR, "04-quick-cards-land-size.png")],
      seeing: "In quick-cards mode (Favorites + property-type filter), the Land size card field is visible for a row with landSize=500.",
      steps: [
        "Navigate to /admin/properties?propertyType=House (triggers quick cards mode)",
        "Confirm Land size field appears on the quick card",
      ],
    })
  })
})
