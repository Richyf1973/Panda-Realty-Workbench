import { expect, test } from "@playwright/test"

import { e2eAdminCredentials, refreshPandaE2eEnv, signInAsAdmin } from "./helpers/admin-auth"

/**
 * Properties admin - quick desktop cards extra fields.
 *
 * Success factors:
 * 1. Owner names appear in the quick card when present.
 * 2. Land Size shows as an icon + value when the value is set.
 * 3. Land Size is absent from the metrics row when the value is null.
 * 4. Appraised Amount appears as a label-value row when set.
 * 5. Appraised Amount is absent when null.
 * 6. Contract Price appears from the accepted buyer offer value when present.
 * 7. Completion Date appears from the accepted offer completion date when present.
 * 8. Completion Date shows "-" when unresolved.
 * 9. Successful Buyer appears from the accepted buyer entity name when present.
 * 10. Contract Price and Successful Buyer are absent when there is no accepted offer.
 * 11. Default table (no filters active) shows no new columns (unchanged).
 * 12. Favorites-only mode shows default table, not quick cards.
 */

const EMPTY_LIST_RESPONSE = {
  items: [],
  totalCount: 0,
  limit: 25,
  totalPages: 0,
  hasNextPage: false,
  hasPreviousPage: false,
  startCursor: null,
  endCursor: null,
}

const STATUS_LIST_RESPONSE = {
  items: [],
  totalCount: 0,
  limit: 100,
  totalPages: 0,
  hasNextPage: false,
  hasPreviousPage: false,
  startCursor: null,
  endCursor: null,
}

const baseItem = {
  propertyListId: 9001,
  streetAddress: "80 HOLLYWOOD AVENUE",
  suburb: "BELLMERE",
  state: "QLD",
  postcode: "4500",
  propertyType: "House",
  bed: 4,
  bath: 2,
  car: 2,
  buildingArea: 136,
  salePrice: 385000,
  saleDate: "2021-06-01",
  propertyStatusId: 1,
  buyerName: null,
  buyerId: null,
  owner1name: null,
  owner2name: null,
  owner3name: null,
  combinedOwner: "—",
  isFavorite: false,
  priceUndisclosed: false,
  excludeFromReport: false,
  updatedAt: "2026-01-01T00:00:00Z",
}

function makeQuickListResponse(overrides: Record<string, unknown>) {
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

function requirePandaAdminAuthForMockedList(): void {
  refreshPandaE2eEnv()
  if (!e2eAdminCredentials) {
    throw new Error(
      "Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD (see apps/panda-realty/.env.example).",
    )
  }
}

test.describe("Properties quick cards - extra fields", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaAdminAuthForMockedList()
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.route("**/api/admin/property-status**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(STATUS_LIST_RESPONSE),
      })
    })
    await signInAsAdmin(page)
  })

  async function gotoQuickCards(page: Parameters<typeof signInAsAdmin>[0], listResponse: object) {
    await page.route("**/api/admin/properties**", async (route) => {
      const url = route.request().url()
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(url.includes("propertyType=") ? listResponse : EMPTY_LIST_RESPONSE),
      })
    })
    await page.goto(`/admin/properties?propertyType=House`)
    // Generous timeout: first /admin/properties render can be a slow dev-server compile + list load.
    await expect(page.getByTestId("admin-entity-quick-cards-scroll--properties")).toBeVisible({
      timeout: 30_000,
    })
  }

  test("owner names appear in the quick card when present", async ({ page }) => {
    await gotoQuickCards(
      page,
      makeQuickListResponse({
        owner1name: "MARY SMITH",
        owner2name: "JOHN SMITH",
        combinedOwner: "MARY SMITH / JOHN SMITH",
      }),
    )
    await expect(page.getByTestId("property-owner-row--1")).toBeVisible()
    await expect(page.getByTestId("property-owner-row--1")).toContainText("MARY SMITH")
    await expect(page.getByTestId("property-owner-row--2")).toBeVisible()
    await expect(page.getByTestId("property-owner-row--2")).toContainText("JOHN SMITH")
  })

  test("land size shows as an icon and value in the metrics row when set", async ({ page }) => {
    await gotoQuickCards(page, makeQuickListResponse({ landSize: "153.00" }))
    const metricsRow = page.getByTestId("admin-entity-quick-card-field--properties--metrics")
    await expect(metricsRow).toBeVisible()
    const buildingArea = page.getByTestId("admin-entity-quick-card-field--properties--buildingArea")
    const landSize = page.getByTestId("admin-entity-quick-card-field--properties--landSize")
    await expect(buildingArea).toBeVisible()
    await expect(landSize).toBeVisible()
    await expect(landSize).toContainText("153")
    const buildingSvg = await buildingArea.locator("svg").first().evaluate((el) => el.outerHTML)
    const landSvg = await landSize.locator("svg").first().evaluate((el) => el.outerHTML)
    expect(landSvg).not.toBe(buildingSvg)
    const landSizeIcon = landSize.locator("[aria-label='Land Size']")
    await landSizeIcon.hover()
    await expect(page.getByRole("tooltip")).toContainText("Land Size")
  })

  test("metric icons show a tooltip when hovered", async ({ page }) => {
    await gotoQuickCards(page, makeQuickListResponse({ landSize: "153.00" }))
    const bed = page.getByTestId("admin-entity-quick-card-field--properties--bed")
    await expect(bed).toBeVisible()
    await bed.locator("span").first().hover()
    await expect(page.getByRole("tooltip")).toContainText("Bed")
  })

  test("land size is absent from the metrics row when null", async ({ page }) => {
    await gotoQuickCards(page, makeQuickListResponse({ landSize: null }))
    const metricsRow = page.getByTestId("admin-entity-quick-card-field--properties--metrics")
    await expect(metricsRow).toBeVisible()
    await expect(metricsRow).not.toContainText("Land Size")
  })

  test("appraised amount appears as a label-value row when set", async ({ page }) => {
    await gotoQuickCards(page, makeQuickListResponse({ appraisedAmount: "450000" }))
    const appraisedRow = page.getByTestId("admin-entity-quick-card-field--properties--appraisedAmount")
    await expect(appraisedRow).toBeVisible()
    await expect(appraisedRow).toContainText("450")
  })

  test("appraised amount is absent when null", async ({ page }) => {
    await gotoQuickCards(page, makeQuickListResponse({ appraisedAmount: null }))
    await expect(
      page.getByTestId("admin-entity-quick-card-field--properties--appraisedAmount"),
    ).toHaveCount(0)
  })

  test("contract price appears from the accepted buyer offer", async ({ page }) => {
    await gotoQuickCards(page, makeQuickListResponse({ contractPrice: "400000" }))
    const contractRow = page.getByTestId("admin-entity-quick-card-field--properties--contractPrice")
    await expect(contractRow).toBeVisible()
    await expect(contractRow).toContainText("400")
  })

  test("completion date appears from the accepted offer completion date", async ({ page }) => {
    await gotoQuickCards(page, makeQuickListResponse({ completionDate: "2026-05-15T00:00:00.000Z" }))
    const completionRow = page.getByTestId("admin-entity-quick-card-field--properties--completionDate")
    await expect(completionRow).toBeVisible()
    await expect(completionRow).toContainText("15/05/2026")
  })

  test('completion date shows "-" when unresolved', async ({ page }) => {
    await gotoQuickCards(page, makeQuickListResponse({ completionDate: null }))
    const completionRow = page.getByTestId("admin-entity-quick-card-field--properties--completionDate")
    await expect(completionRow).toBeVisible()
    await expect(completionRow).toContainText("-")
  })

  test("successful buyer appears from the accepted buyer entity name", async ({ page }) => {
    await gotoQuickCards(
      page,
      makeQuickListResponse({ successfulBuyer: "John Smith", contractPrice: "400000" }),
    )
    const buyerRow = page.getByTestId("admin-entity-quick-card-field--properties--successfulBuyer")
    await expect(buyerRow).toBeVisible()
    await expect(buyerRow).toContainText("John Smith")
  })

  test("contract price and successful buyer are absent when no accepted offer", async ({ page }) => {
    await gotoQuickCards(
      page,
      makeQuickListResponse({ contractPrice: null, completionDate: null, successfulBuyer: null }),
    )
    await expect(
      page.getByTestId("admin-entity-quick-card-field--properties--contractPrice"),
    ).toHaveCount(0)
    await expect(
      page.getByTestId("admin-entity-quick-card-field--properties--completionDate"),
    ).toContainText("-")
    await expect(
      page.getByTestId("admin-entity-quick-card-field--properties--successfulBuyer"),
    ).toHaveCount(0)
  })

  test("default favorites table omits the land-size column when no filters are active", async ({ page }) => {
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
    await expect(page.getByTestId("admin-entity-quick-cards-scroll--properties")).toHaveCount(0)
    await expect(card.getByTestId("admin-entity-col-label--properties--combinedOwner")).toBeVisible()
    // landSize is the one quick-card extra that is NOT part of the favorites table column set, so it
    // stays absent here. appraisedAmount / contractPrice / completionDate ARE favorites columns
    // (see PANDA_PROPERTIES_FAVORITES_TABLE_COLUMN_KEYS), so they legitimately appear in this table.
    await expect(card.getByTestId("admin-entity-col-label--properties--landSize")).toHaveCount(0)
  })

  test("favorites-only filter shows default table, not quick cards", async ({ page }) => {
    await page.route("**/api/admin/properties**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(EMPTY_LIST_RESPONSE),
      })
    })
    await page.goto("/admin/properties?isFavorite=true")
    const card = page.getByTestId("admin-entity-list-card--properties")
    await expect(card).toBeVisible()
    await expect(page.getByTestId("admin-entity-table-scroll--properties")).toBeVisible()
    await expect(page.getByTestId("admin-entity-quick-cards-scroll--properties")).toHaveCount(0)
  })
})
