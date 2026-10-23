import { expect, test } from "@playwright/test"

import { e2eAdminCredentials, refreshPandaE2eEnv, signInAsAdmin } from "./helpers/admin-auth"

/**
 * Properties admin — quick mode when non-map filters narrow the list (desktop).
 *
 * Success factors:
 * 1. With no narrowing hints/search/status, the default **table** does **not** show a Building area column header.
 * 2. With a non-map append-where filter (`propertyType`) in the URL, **quick desktop cards** replace the table;
 *    Building area and Sold appear as stacked fields on each card.
 * 3. Removing that filter restores the default table and Owner column header.
 *
 * Note: the map filter (`streetFilter`) deliberately shows the compact TABLE, not cards — covered in
 * properties-quick-card-suppression.spec.ts and property-map-filter-table-view.spec.ts.
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
      isFavorite: false,
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

test.describe("Properties — quick mode when filtered (desktop cards)", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaAdminAuthForMockedList()
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.route("**/api/admin/properties**", async (route) => {
      const url = route.request().url()
      const useQuickRow = url.includes("propertyType=")
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          useQuickRow ? ONE_ROW_QUICK_LIST_RESPONSE : EMPTY_LIST_RESPONSE,
        ),
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

  test("default table headers omit Building area; property-type filter shows quick cards with Building + Sold fields", async ({
    page,
  }) => {
    await page.goto("/admin/properties")
    const card = page.getByTestId("admin-entity-list-card--properties")
    await expect(card).toBeVisible()

    await expect(page.getByTestId("admin-entity-table-scroll--properties")).toBeVisible()
    await expect(page.getByTestId("admin-entity-quick-cards-scroll--properties")).toHaveCount(0)

    await expect(card.getByTestId("admin-entity-col-label--properties--combinedOwner")).toBeVisible()
    await expect(card.getByTestId("admin-entity-col-label--properties--buildingArea")).toHaveCount(0)

    await page.goto(`/admin/properties?propertyType=House`)
    await expect(card).toBeVisible()

    await expect(page.getByTestId("admin-entity-quick-cards-scroll--properties")).toBeVisible({ timeout: 30_000 })
    await expect(page.getByTestId("admin-entity-table-scroll--properties")).toHaveCount(0)

    await expect(
      page.getByTestId("admin-entity-quick-card-field--properties--buildingArea"),
    ).toBeVisible()
    await expect(
      page.getByTestId("admin-entity-quick-card-field--properties--saleDate"),
    ).toContainText("01/06/2021")

    // Removing the filter restores the default table and Owner column.
    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-table-scroll--properties")).toBeVisible()
    await expect(page.getByTestId("admin-entity-quick-cards-scroll--properties")).toHaveCount(0)
    await expect(card.getByTestId("admin-entity-col-label--properties--combinedOwner")).toBeVisible()
    await expect(card.getByTestId("admin-entity-col-label--properties--buildingArea")).toHaveCount(0)
  })
})
