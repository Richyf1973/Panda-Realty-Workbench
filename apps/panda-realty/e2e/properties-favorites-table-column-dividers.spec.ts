import { expect, test } from "@playwright/test"

import { e2eAdminCredentials, refreshPandaE2eEnv, signInAsAdmin } from "./helpers/admin-auth"
import { EMPTY_LIST_RESPONSE, STATUS_LIST_RESPONSE } from "./helpers/admin-properties-mocks"

/**
 * Properties admin — column dividers in the favorites table.
 *
 * MV steps covered:
 * 1. Favorites table (no search/status filter): th cells have a visible right border (column dividers).
 * 2. The last th in the row (actions) has no visible right border (last:border-r-0 / sticky seam only).
 * 3. Non-favorites table mode (isFavorite=all): th cells have NO column divider border.
 * 4. Quick-card mode (search active): cards replace the standard table, so no table dividers.
 *    (The map filter shows a table WITH dividers instead — see property-map-filter-table-view.spec.ts.)
 * 5. Sellers page table: NO column dividers (scoped to properties favorites only).
 */

test.describe("Properties — column dividers in favorites table", () => {
  test.beforeEach(async ({ page }) => {
    refreshPandaE2eEnv()
    test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.route("**/api/admin/property-status**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(STATUS_LIST_RESPONSE),
      })
    })
    await signInAsAdmin(page)
  })

  // MV step 1 — favorites table shows column dividers on data th cells
  test("favorites table th cells have a visible right border (column divider)", async ({ page }) => {
    await page.route("**/api/admin/properties**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(EMPTY_LIST_RESPONSE),
      })
    })
    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-table-scroll--properties")).toBeVisible()

    const borderRight = await page
      .getByTestId("admin-entity-col-header--properties--appraisedAmount")
      .evaluate((el) => window.getComputedStyle(el).borderRightWidth)

    expect(parseFloat(borderRight)).toBeGreaterThan(0)
  })

  // MV step 2 — last th (actions column) has no extra right border
  test("last th in favorites table (actions) has no visible right border", async ({ page }) => {
    await page.route("**/api/admin/properties**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(EMPTY_LIST_RESPONSE),
      })
    })
    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-table-scroll--properties")).toBeVisible()

    const lastThBorderRight = await page
      .locator('[data-testid="admin-entity-table--properties"] thead tr th:last-child')
      .evaluate((el) => window.getComputedStyle(el).borderRightWidth)

    expect(parseFloat(lastThBorderRight)).toBe(0)
  })

  // MV step 3 — non-favorites table mode has no column dividers
  test("non-favorites table (isFavorite=all) th cells have no right border", async ({ page }) => {
    await page.route("**/api/admin/properties**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(EMPTY_LIST_RESPONSE),
      })
    })
    await page.goto("/admin/properties?isFavorite=all")
    await expect(page.getByTestId("admin-entity-table-scroll--properties")).toBeVisible()

    const borderRight = await page
      .locator('[data-testid="admin-entity-table--properties"] thead tr th:first-child')
      .evaluate((el) => window.getComputedStyle(el).borderRightWidth)

    expect(parseFloat(borderRight)).toBe(0)
  })

  // MV step 4 — quick-card mode (search active) shows cards, not the standard table
  test("quick-card mode (search active) shows cards, not the dividers table", async ({ page }) => {
    await page.route("**/api/admin/properties**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(EMPTY_LIST_RESPONSE),
      })
    })
    await page.goto(`/admin/properties?search=waterview`)

    // Search (a non-map trigger) keeps quick-card mode: cards shown, no standard table.
    await expect(page.getByTestId("admin-entity-quick-cards-scroll--properties")).toBeVisible({ timeout: 30_000 })
    await expect(page.getByTestId("admin-entity-table-scroll--properties")).toHaveCount(0)
  })

  // MV step 5 — sellers table has no column dividers (scope is properties favorites only)
  test("sellers table th cells have no right border", async ({ page }) => {
    await page.goto("/admin/sellers")
    await expect(page.getByTestId("admin-sellers-col-name")).toBeVisible()

    const borderRight = await page
      .getByTestId("admin-sellers-col-name")
      .evaluate((el) => window.getComputedStyle(el).borderRightWidth)

    expect(parseFloat(borderRight)).toBe(0)
  })
})
