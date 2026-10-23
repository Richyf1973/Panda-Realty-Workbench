import { expect, test } from "@playwright/test"

import { e2eAdminCredentials, refreshPandaE2eEnv, signInAsAdmin } from "./helpers/admin-auth"

/**
 * Properties admin — the map-area filter shows the compact TABLE list, not the quick-card panel,
 * and the side-panel Favorites toggle reflects OFF while the map filter is active (display-only,
 * restored on Clear). Scope: MAP ONLY — non-map triggers (search, property-type) keep the cards.
 *
 * Success factors:
 * 1. With a map filter (`streetFilter`) active and Favorites on (default), the list renders the
 *    table (`admin-entity-table-scroll--properties`), NOT the quick-card panel.
 * 2. Clearing the map filter returns to the default favorites view — which (no narrowing filter,
 *    Favorites on) is the favorites TABLE, not the card panel. Quick cards need a non-map filter/search.
 * 3. While the map filter is active, the side-panel Favorites switch shows OFF (aria-checked=false);
 *    after Clear it returns to ON — the underlying segment is untouched (display-only).
 */

const ONE_ROW_RESPONSE = {
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

const STREET_FILTER = encodeURIComponent("E2E Map Street~QLD")
const SWITCH = "admin-entity-list-boolean-filter--properties--switch"
const SIDE_PANEL_TOGGLE = "admin-entity-filter-side-panel-toggle--properties"

test.describe("Properties — map filter shows the table list (desktop)", () => {
  test.beforeEach(async ({ page }) => {
    refreshPandaE2eEnv()
    test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.route("**/api/admin/properties**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(ONE_ROW_RESPONSE),
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

  test("map filter active → table list, not the quick-card panel; Clear returns to the favorites table", async ({
    page,
  }) => {
    // Map filter active (Favorites defaults on) → table, not cards.
    // Generous timeout: the first /admin/properties render can be a slow dev-server compile + list load.
    await page.goto(`/admin/properties?streetFilter=${STREET_FILTER}`)
    await expect(page.getByTestId("admin-entity-list-card--properties")).toBeVisible({ timeout: 30_000 })
    await expect(page.getByTestId("admin-entity-table-scroll--properties")).toBeVisible({ timeout: 30_000 })
    await expect(page.getByTestId("admin-entity-quick-cards-scroll--properties")).toHaveCount(0)

    // Clear the map filter → default favorites view returns. With no narrowing filter and Favorites
    // on, that view is the favorites TABLE (quick cards need a non-map filter/search), so the table
    // stays and cards never appear. The Clear button updates React state via onClick (router.push);
    // CDP click() is unreliable on these client islands, so dispatch the event directly.
    await expect(page.getByTestId("property-map-filter-trigger")).toContainText("ON")
    await page.getByTestId("property-map-filter-clear").dispatchEvent("click")
    await page.waitForURL((url) => !url.searchParams.has("streetFilter"), { timeout: 30_000 })
    await expect(page.getByTestId("property-map-filter-trigger")).not.toContainText("ON")
    await expect(page.getByTestId("admin-entity-table-scroll--properties")).toBeVisible({ timeout: 30_000 })
    await expect(page.getByTestId("admin-entity-quick-cards-scroll--properties")).toHaveCount(0)
  })

  test("Favorites switch shows OFF while the map filter is active, ON after Clear", async ({
    page,
  }) => {
    await page.goto(`/admin/properties?streetFilter=${STREET_FILTER}`)
    await expect(page.getByTestId("admin-entity-list-card--properties")).toBeVisible({ timeout: 30_000 })
    await expect(page.getByTestId("property-map-filter-trigger")).toContainText("ON", { timeout: 30_000 })

    // Open the (collapsible) side filter panel so the Favorites switch is visible. The toggle
    // updates React state via onClick, so dispatch the event directly (CDP click is unreliable here).
    await page.getByTestId(SIDE_PANEL_TOGGLE).dispatchEvent("click")
    const favSwitch = page.getByTestId(SWITCH)
    await expect(favSwitch).toBeVisible()

    // While the map filter is active the switch reflects OFF, even though Favorites defaults on.
    await expect(favSwitch).toHaveAttribute("aria-checked", "false")

    // Clear the map filter → the switch snaps back ON (segment was never mutated).
    await page.getByTestId("property-map-filter-clear").dispatchEvent("click")
    await page.waitForURL((url) => !url.searchParams.has("streetFilter"), { timeout: 30_000 })
    await expect(favSwitch).toHaveAttribute("aria-checked", "true")
  })
})
