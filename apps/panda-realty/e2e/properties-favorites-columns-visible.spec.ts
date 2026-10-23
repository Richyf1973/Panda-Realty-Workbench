// Run: npm run test:e2e:scratch -- --app=panda-realty --spec=apps/panda-realty/e2e/properties-favorites-columns-visible.spec.ts

import { expect, test } from "@playwright/test"

import { e2eAdminCredentials, refreshPandaE2eEnv, signInAsAdmin } from "./helpers/admin-auth"
import { EMPTY_LIST_RESPONSE, STATUS_LIST_RESPONSE } from "./helpers/admin-properties-mocks"

/**
 * Properties admin — favorites column set visibility (desktop table).
 *
 * Success factors:
 * 1. With Favorites filter ON (default), the table shows Appraised / Contract date / Contract Price / Commission Amount columns.
 * 2. With Favorites ON, the columns Bed / Bath / Car / Last sale price / Last sale date are absent from the table.
 * 3. A row with an accepted offer shows a dollar-formatted commissionAmount (e.g. "$8,580.00").
 * 4. A row with commissionRate set but no accepted offer shows "No offer yet" in the commissionAmount cell.
 * 5. A row with null commissionRate shows a blank commissionAmount cell.
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

test.describe("Properties — favorites column set visible (desktop table)", () => {
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

  // MV step 1: Favorites ON (default) — favorites columns visible
  test("Favorites ON shows appraised/contractDate/contractPrice/commissionAmount columns", async ({
    page,
  }) => {
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

    await expect(card.getByTestId("admin-entity-col-label--properties--appraisedAmount")).toBeVisible()
    await expect(card.getByTestId("admin-entity-col-label--properties--contractDate")).toBeVisible()
    await expect(card.getByTestId("admin-entity-col-label--properties--contractPrice")).toBeVisible()
    await expect(card.getByTestId("admin-entity-col-label--properties--commissionAmount")).toBeVisible()
  })

  // MV step 1 (continued): Favorites ON — default columns absent
  test("Favorites ON hides bed/bath/car/salePrice/saleDate columns", async ({ page }) => {
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

    await expect(card.getByTestId("admin-entity-sort-header--properties--bed")).toHaveCount(0)
    await expect(card.getByTestId("admin-entity-sort-header--properties--bath")).toHaveCount(0)
    await expect(card.getByTestId("admin-entity-sort-header--properties--car")).toHaveCount(0)
    await expect(card.getByTestId("admin-entity-sort-header--properties--salePrice")).toHaveCount(0)
    await expect(card.getByTestId("admin-entity-sort-header--properties--saleDate")).toHaveCount(0)
    await expect(card.getByTestId("admin-entity-sort-header--properties--state")).toHaveCount(0)
    await expect(card.getByTestId("admin-entity-sort-header--properties--postcode")).toHaveCount(0)
    await expect(card.getByTestId("admin-entity-sort-header--properties--propertyType")).toHaveCount(0)
  })

  // MV step 2: Row with accepted offer shows dollar-formatted commissionAmount
  test("row with accepted offer shows formatted commissionAmount dollar string", async ({ page }) => {
    const listResponse = makeListResponse({
      appraisedAmount: "460000",
      contractDate: "2024-03-15T00:00:00Z",
      contractPrice: "440000",
      commissionAmount: "$8,580.00",
      commissionRate: "1.95",
    })
    await page.route("**/api/admin/properties**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(listResponse),
      })
    })
    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-table-scroll--properties")).toBeVisible()
    await expect(page.getByTestId("admin-entity-table-scroll--properties")).toContainText("$8,580.00")
  })

  // MV step 3: Row with commissionRate set but no offer shows "No offer yet"
  test("row with commissionRate set but no accepted offer shows No offer yet", async ({ page }) => {
    const listResponse = makeListResponse({
      appraisedAmount: "350000",
      contractDate: null,
      contractPrice: null,
      commissionAmount: "No offer yet",
      commissionRate: "2.0",
    })
    await page.route("**/api/admin/properties**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(listResponse),
      })
    })
    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-table-scroll--properties")).toBeVisible()
    await expect(page.getByTestId("admin-entity-table-scroll--properties")).toContainText("No offer yet")
  })

  // MV step 4: Row with null commissionRate shows blank (not "No offer yet")
  test("row with null commissionRate shows blank commissionAmount cell", async ({ page }) => {
    const listResponse = makeListResponse({
      commissionAmount: null,
      commissionRate: null,
    })
    await page.route("**/api/admin/properties**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(listResponse),
      })
    })
    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-table-scroll--properties")).toBeVisible()
    await expect(page.getByTestId("admin-entity-table-scroll--properties")).not.toContainText("No offer yet")
  })
})
