import { expect, test } from "@playwright/test"

import { e2eAdminCredentials, refreshPandaE2eEnv, signInAsAdmin } from "./helpers/admin-auth"

/**
 * Properties admin — quick card mode suppression rules (desktop).
 *
 * Rules under test:
 * 1. Favorites filter OFF (segment "all" or "false") → quick cards must never appear, regardless of other filters.
 * 2. Status filter active → quick cards must never appear, even when other triggering filters are on.
 * 3. Map-area filter (streetFilter) active → quick cards must never appear; the list shows the
 *    compact table instead (map search is for scanning comparables). Map only — other triggers keep cards.
 *
 * Regression:
 * 4. Favorites ON + search / non-map append-where filter (no status) → quick cards still appear.
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

const ONE_ROW_QUICK_LIST_RESPONSE = {
  items: [
    {
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
      propertyStatusId: 1,
      buyerName: null,
      buyerId: null,
      owner1name: null,
      owner2name: null,
      owner3name: null,
      combinedOwner: "—",
      isFavorite: true,
      priceUndisclosed: false,
      excludeFromReport: false,
      saleDate: "2021-06-01",
      updatedAt: "2026-01-01T00:00:00Z",
    },
  ],
  totalCount: 1,
  limit: 25,
  totalPages: 1,
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

function requirePandaAdminAuthForMockedList(): void {
  refreshPandaE2eEnv()
  if (!e2eAdminCredentials) {
    throw new Error(
      "Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD (see apps/panda-realty/.env.example).",
    )
  }
}

const STREET_FILTER = encodeURIComponent("E2E Quick Street~QLD")

test.describe("Properties — quick card mode suppression (desktop)", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaAdminAuthForMockedList()
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.route("**/api/admin/properties**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(ONE_ROW_QUICK_LIST_RESPONSE),
      })
    })
    await page.route("**/api/admin/property-status**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(STATUS_LIST_RESPONSE),
      })
    })
    await signInAsAdmin(page)
  })

  // ── Rule 3: map-area filter suppresses quick cards → table ───────────────────

  test("Favorites ON + map filter → default table, no quick cards", async ({ page }) => {
    await page.goto(`/admin/properties?isFavorite=true&streetFilter=${STREET_FILTER}`)
    const card = page.getByTestId("admin-entity-list-card--properties")
    await expect(card).toBeVisible()
    await expect(page.getByTestId("admin-entity-table-scroll--properties")).toBeVisible()
    await expect(page.getByTestId("admin-entity-quick-cards-scroll--properties")).toHaveCount(0)
  })

  // ── Regression: non-map quick-card triggers must still show cards ─────────────

  test("regression: Favorites ON + search → quick cards appear", async ({ page }) => {
    await page.goto(`/admin/properties?isFavorite=true&search=waterview`)
    const card = page.getByTestId("admin-entity-list-card--properties")
    await expect(card).toBeVisible()
    await expect(page.getByTestId("admin-entity-quick-cards-scroll--properties")).toBeVisible()
    await expect(page.getByTestId("admin-entity-table-scroll--properties")).toHaveCount(0)
  })

  test("regression: Favorites ON + property-type filter → quick cards appear", async ({ page }) => {
    await page.goto(`/admin/properties?isFavorite=true&propertyType=House`)
    const card = page.getByTestId("admin-entity-list-card--properties")
    await expect(card).toBeVisible()
    await expect(page.getByTestId("admin-entity-quick-cards-scroll--properties")).toBeVisible()
    await expect(page.getByTestId("admin-entity-table-scroll--properties")).toHaveCount(0)
  })

  // ── Rule 1: status filter suppresses quick cards ─────────────────────────────

  test("Favorites ON + status filter only → default table, no quick cards", async ({ page }) => {
    await page.goto(`/admin/properties?isFavorite=true&propertyStatusId=1`)
    const card = page.getByTestId("admin-entity-list-card--properties")
    await expect(card).toBeVisible()
    await expect(page.getByTestId("admin-entity-table-scroll--properties")).toBeVisible()
    await expect(page.getByTestId("admin-entity-quick-cards-scroll--properties")).toHaveCount(0)
  })

  test("Favorites ON + status filter + map filter → status suppression wins, default table", async ({
    page,
  }) => {
    await page.goto(
      `/admin/properties?isFavorite=true&propertyStatusId=1&streetFilter=${STREET_FILTER}`,
    )
    const card = page.getByTestId("admin-entity-list-card--properties")
    await expect(card).toBeVisible()
    await expect(page.getByTestId("admin-entity-table-scroll--properties")).toBeVisible()
    await expect(page.getByTestId("admin-entity-quick-cards-scroll--properties")).toHaveCount(0)
  })

  test("Favorites ON + status filter + search → status suppression wins, default table", async ({
    page,
  }) => {
    await page.goto(`/admin/properties?isFavorite=true&propertyStatusId=1&search=waterview`)
    const card = page.getByTestId("admin-entity-list-card--properties")
    await expect(card).toBeVisible()
    await expect(page.getByTestId("admin-entity-table-scroll--properties")).toBeVisible()
    await expect(page.getByTestId("admin-entity-quick-cards-scroll--properties")).toHaveCount(0)
  })

  // ── Rule 2: Favorites OFF ("all") suppresses quick cards ─────────────────────

  test("Favorites 'all' + map filter → default table, no quick cards", async ({ page }) => {
    await page.goto(`/admin/properties?isFavorite=all&streetFilter=${STREET_FILTER}`)
    const card = page.getByTestId("admin-entity-list-card--properties")
    await expect(card).toBeVisible()
    await expect(page.getByTestId("admin-entity-table-scroll--properties")).toBeVisible()
    await expect(page.getByTestId("admin-entity-quick-cards-scroll--properties")).toHaveCount(0)
  })

  test("Favorites 'all' + search → default table, no quick cards", async ({ page }) => {
    await page.goto(`/admin/properties?isFavorite=all&search=waterview`)
    const card = page.getByTestId("admin-entity-list-card--properties")
    await expect(card).toBeVisible()
    await expect(page.getByTestId("admin-entity-table-scroll--properties")).toBeVisible()
    await expect(page.getByTestId("admin-entity-quick-cards-scroll--properties")).toHaveCount(0)
  })

  // ── Rule 2: Favorites OFF ("false" / non-favorites) suppresses quick cards ───

  test("Favorites 'false' (non-favorites) + map filter → default table, no quick cards", async ({
    page,
  }) => {
    await page.goto(`/admin/properties?isFavorite=false&streetFilter=${STREET_FILTER}`)
    const card = page.getByTestId("admin-entity-list-card--properties")
    await expect(card).toBeVisible()
    await expect(page.getByTestId("admin-entity-table-scroll--properties")).toBeVisible()
    await expect(page.getByTestId("admin-entity-quick-cards-scroll--properties")).toHaveCount(0)
  })

  test("Favorites 'false' (non-favorites) + search → default table, no quick cards", async ({
    page,
  }) => {
    await page.goto(`/admin/properties?isFavorite=false&search=waterview`)
    const card = page.getByTestId("admin-entity-list-card--properties")
    await expect(card).toBeVisible()
    await expect(page.getByTestId("admin-entity-table-scroll--properties")).toBeVisible()
    await expect(page.getByTestId("admin-entity-quick-cards-scroll--properties")).toHaveCount(0)
  })

  // ── Combined: all three conditions (Favorites OFF + status + map) ────────────

  test("Favorites 'all' + status filter + map filter → default table, no quick cards", async ({
    page,
  }) => {
    await page.route("**/api/admin/properties**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(EMPTY_LIST_RESPONSE),
      })
    })
    await page.goto(
      `/admin/properties?isFavorite=all&propertyStatusId=1&streetFilter=${STREET_FILTER}`,
    )
    const card = page.getByTestId("admin-entity-list-card--properties")
    await expect(card).toBeVisible()
    await expect(page.getByTestId("admin-entity-table-scroll--properties")).toBeVisible()
    await expect(page.getByTestId("admin-entity-quick-cards-scroll--properties")).toHaveCount(0)
  })
})
