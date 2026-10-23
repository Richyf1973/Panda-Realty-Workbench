// Run: npm run test:e2e:scratch -- --app=panda-realty --spec=apps/panda-realty/e2e/properties-favorites-columns-toggle.spec.ts

import { expect, test } from "@playwright/test"

import { e2eAdminCredentials, refreshPandaE2eEnv, signInAsAdmin } from "./helpers/admin-auth"
import { EMPTY_LIST_RESPONSE, STATUS_LIST_RESPONSE } from "./helpers/admin-properties-mocks"

/**
 * Properties admin — favorites column toggle behavior (desktop table).
 *
 * Success factors:
 * 6. Switching to Favorites OFF restores the default columns (Bed / Bath / Car / Last sale price / Last sale date visible).
 * 7. Switching to Non-favorites shows the same default column set.
 * 9. With Favorites ON and a status filter active, the favorites column set is still shown (table mode, not quick cards).
 * 10. With Favorites ON and a property-type filter active (quick card mode), the existing quick-card layout is shown — favorites column swap does not apply.
 * 11. Reloading with Favorites ON preserves the favorites column set.
 */

const baseItem = {
  propertyListId: 9001,
  streetAddress: "30 SILVEREYE DRIVE",
  suburb: "GRIFFIN",
  state: "QLD",
  postcode: "4503",
  propertyType: "Unit: Townhouse/Villa",
  bed: 4,
  bath: 2,
  car: 1,
  buildingArea: null,
  landSize: null,
  salePrice: 460000,
  saleDate: "2023-08-10",
  propertyStatusId: 1,
  buyerName: null,
  buyerId: null,
  owner1name: "ELAINE JOY PREBBLE",
  owner2name: null,
  owner3name: null,
  combinedOwner: "ELAINE JOY PREBBLE",
  isFavorite: true,
  priceUndisclosed: false,
  excludeFromReport: false,
  appraisedAmount: null,
  contractDate: null,
  contractPrice: null,
  commissionAmount: null,
  commissionRate: null,
  completionDate: null,
  successfulBuyer: null,
  successfulBuyerPropertyEntityId: null,
  successfulBuyerEntityId: null,
  successfulBuyerPhoneNumber: null,
  successfulBuyerEmailAddress: null,
  updatedAt: "2026-01-01T00:00:00Z",
}

function makeListResponse(overrides: Record<string, unknown>) {
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

test.describe("Properties — favorites column toggle (desktop table)", () => {
  test.beforeEach(async ({ page }) => {
    refreshPandaE2eEnv()
    test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")
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

  // MV step 5: Favorites OFF restores default columns
  test("Favorites OFF shows default columns (bed/bath/car/salePrice/saleDate visible)", async ({
    page,
  }) => {
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

    await expect(card.getByTestId("admin-entity-sort-header--properties--bed")).toBeVisible()
    await expect(card.getByTestId("admin-entity-sort-header--properties--bath")).toBeVisible()
    await expect(card.getByTestId("admin-entity-sort-header--properties--car")).toBeVisible()
    await expect(card.getByTestId("admin-entity-sort-header--properties--salePrice")).toBeVisible()
    await expect(card.getByTestId("admin-entity-sort-header--properties--saleDate")).toBeVisible()
    await expect(card.getByTestId("admin-entity-sort-header--properties--state")).toBeVisible()
    await expect(card.getByTestId("admin-entity-sort-header--properties--postcode")).toBeVisible()
    await expect(card.getByTestId("admin-entity-sort-header--properties--propertyType")).toBeVisible()

    await expect(card.getByTestId("admin-entity-col-label--properties--appraisedAmount")).toHaveCount(0)
    await expect(card.getByTestId("admin-entity-col-label--properties--contractDate")).toHaveCount(0)
    await expect(card.getByTestId("admin-entity-col-label--properties--contractPrice")).toHaveCount(0)
    await expect(card.getByTestId("admin-entity-col-label--properties--commissionAmount")).toHaveCount(0)
  })

  // MV step 6: Non-favorites also shows default columns
  test("Non-favorites shows default columns (not favorites column set)", async ({ page }) => {
    await page.route("**/api/admin/properties**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(EMPTY_LIST_RESPONSE),
      })
    })
    await page.goto("/admin/properties?isFavorite=false")
    const card = page.getByTestId("admin-entity-list-card--properties")
    await expect(card).toBeVisible()
    await expect(page.getByTestId("admin-entity-table-scroll--properties")).toBeVisible()

    await expect(card.getByTestId("admin-entity-sort-header--properties--bed")).toBeVisible()
    await expect(card.getByTestId("admin-entity-col-label--properties--commissionAmount")).toHaveCount(0)
  })

  // MV step 8: Status filter + Favorites ON → favorites columns still visible
  test("Status filter active with Favorites ON still shows favorites column set", async ({
    page,
  }) => {
    await page.route("**/api/admin/properties**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(EMPTY_LIST_RESPONSE),
      })
    })
    await page.goto("/admin/properties?propertyStatusId=1")
    const card = page.getByTestId("admin-entity-list-card--properties")
    await expect(card).toBeVisible()
    await expect(page.getByTestId("admin-entity-table-scroll--properties")).toBeVisible()
    await expect(page.getByTestId("admin-entity-quick-cards-scroll--properties")).toHaveCount(0)

    await expect(card.getByTestId("admin-entity-col-label--properties--appraisedAmount")).toBeVisible()
    await expect(card.getByTestId("admin-entity-col-label--properties--contractPrice")).toBeVisible()
    await expect(card.getByTestId("admin-entity-col-label--properties--commissionAmount")).toBeVisible()
    await expect(card.getByTestId("admin-entity-sort-header--properties--bed")).toHaveCount(0)
    await expect(card.getByTestId("admin-entity-sort-header--properties--salePrice")).toHaveCount(0)
    await expect(card.getByTestId("admin-entity-sort-header--properties--state")).toHaveCount(0)
    await expect(card.getByTestId("admin-entity-sort-header--properties--postcode")).toHaveCount(0)
    await expect(card.getByTestId("admin-entity-sort-header--properties--propertyType")).toHaveCount(0)
  })

  // MV step 10: Property-type filter (quick card mode) — favorites column swap does NOT apply
  test("Property-type filter active (quick card mode) shows quick cards, not favorites table columns", async ({
    page,
  }) => {
    await page.route("**/api/admin/properties**", async (route) => {
      const url = route.request().url()
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          url.includes("propertyType=") ? makeListResponse({}) : EMPTY_LIST_RESPONSE,
        ),
      })
    })
    await page.goto(`/admin/properties?propertyType=House`)
    const card = page.getByTestId("admin-entity-list-card--properties")
    await expect(card).toBeVisible()

    await expect(page.getByTestId("admin-entity-quick-cards-scroll--properties")).toBeVisible({ timeout: 30_000 })
    await expect(page.getByTestId("admin-entity-table-scroll--properties")).toHaveCount(0)
    await expect(card.getByTestId("admin-entity-col-label--properties--commissionAmount")).toHaveCount(0)
  })

  // MV step 11: Reload with Favorites ON preserves favorites column set
  test("reloading with Favorites ON preserves the favorites column set", async ({ page }) => {
    await page.route("**/api/admin/properties**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(EMPTY_LIST_RESPONSE),
      })
    })
    await page.goto("/admin/properties")
    const card = page.getByTestId("admin-entity-list-card--properties")
    await expect(card.getByTestId("admin-entity-col-label--properties--appraisedAmount")).toBeVisible()

    await page.reload()
    await expect(card.getByTestId("admin-entity-col-label--properties--appraisedAmount")).toBeVisible()
    await expect(card.getByTestId("admin-entity-sort-header--properties--bed")).toHaveCount(0)
  })
})
