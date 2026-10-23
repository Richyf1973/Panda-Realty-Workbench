import { expect, test } from "@playwright/test"

import { e2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"

/**
 * General keyword search bar — properties admin page.
 *
 * Success factors:
 * 1. Search bar is visible above the toolbar when Favorites filter is active (default on load).
 * 2. Search bar is hidden when the Favorites filter is toggled to "All".
 * 3. Typing a term and submitting adds `generalSearch` to the URL.
 * 4. Clearing via the X button removes `generalSearch` from the URL.
 * 5. The API call includes `generalSearch` in the query string when submitted.
 * 6. The search bar is visible again when Favorites is re-activated.
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

test.describe("Properties — general keyword search bar", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")
    await page.route("**/api/admin/properties**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(EMPTY_LIST_RESPONSE),
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

  test("search bar is visible on load (favorites active by default)", async ({ page }) => {
    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-list-card--properties")).toBeVisible()

    // isFavorite is absent from URL on initial load — defaultSegment treats it as "true"
    await expect(page.getByTestId("properties-general-search-input")).toBeVisible()
    await expect(page.getByTestId("properties-general-search-submit")).toBeVisible()
  })

  test("search bar is hidden when favorites filter is set to All", async ({ page }) => {
    // Navigate with isFavorite explicitly set to "all"
    await page.goto("/admin/properties?isFavorite=all")
    await expect(page.getByTestId("admin-entity-list-card--properties")).toBeVisible()

    await expect(page.getByTestId("properties-general-search-input")).toHaveCount(0)
    await expect(page.getByTestId("properties-general-search-submit")).toHaveCount(0)
  })

  test("search bar is visible when favorites filter is explicitly true", async ({ page }) => {
    await page.goto("/admin/properties?isFavorite=true")
    await expect(page.getByTestId("admin-entity-list-card--properties")).toBeVisible()

    await expect(page.getByTestId("properties-general-search-input")).toBeVisible()
  })

  test("submitting search adds generalSearch param to URL", async ({ page }) => {
    await page.goto("/admin/properties")
    await expect(page.getByTestId("properties-general-search-input")).toBeVisible()

    await page.getByTestId("properties-general-search-input").fill("Smith Holdings")
    await page.getByTestId("properties-general-search-submit").click()

    await expect(page).toHaveURL(/generalSearch=Smith\+Holdings/)
  })

  test("pressing Enter submits the search", async ({ page }) => {
    await page.goto("/admin/properties")
    await expect(page.getByTestId("properties-general-search-input")).toBeVisible()

    await page.getByTestId("properties-general-search-input").fill("test buyer")
    await page.getByTestId("properties-general-search-input").press("Enter")

    await expect(page).toHaveURL(/generalSearch=test\+buyer/)
  })

  test("clear button removes generalSearch from URL", async ({ page }) => {
    await page.goto("/admin/properties?generalSearch=hello")
    await expect(page.getByTestId("properties-general-search-input")).toBeVisible()
    await expect(page.getByTestId("properties-general-search-input")).toHaveValue("hello")

    await page.getByTestId("properties-general-search-clear").click()

    await expect(page).not.toHaveURL(/generalSearch/)
    await expect(page.getByTestId("properties-general-search-input")).toHaveValue("")
  })

  test("clear button is absent when input is empty", async ({ page }) => {
    await page.goto("/admin/properties")
    await expect(page.getByTestId("properties-general-search-input")).toBeVisible()

    // No generalSearch in URL → input is empty → clear button not rendered
    await expect(page.getByTestId("properties-general-search-clear")).toHaveCount(0)
  })

  test("pre-existing generalSearch URL param is reflected in input on load", async ({ page }) => {
    await page.goto("/admin/properties?generalSearch=Smith+Holdings")
    await expect(page.getByTestId("properties-general-search-input")).toBeVisible()

    // Input should be pre-filled with the current search value from the URL
    await expect(page.getByTestId("properties-general-search-input")).toHaveValue("Smith Holdings")

    // Clear button should be shown because input is not empty
    await expect(page.getByTestId("properties-general-search-clear")).toBeVisible()
  })

  test("search bar hidden when isFavorite=false (non-favorites view)", async ({ page }) => {
    await page.goto("/admin/properties?isFavorite=false")
    await expect(page.getByTestId("admin-entity-list-card--properties")).toBeVisible()

    await expect(page.getByTestId("properties-general-search-input")).toHaveCount(0)
  })

  test("API request includes generalSearch param when search is submitted", async ({ page }) => {
    await page.goto("/admin/properties")
    await expect(page.getByTestId("properties-general-search-input")).toBeVisible()

    await page.getByTestId("properties-general-search-input").fill("ccq")

    const request = page.waitForRequest(
      (req) =>
        req.url().includes("/api/admin/properties") &&
        new URL(req.url()).searchParams.get("generalSearch") === "ccq",
    )
    await page.getByTestId("properties-general-search-submit").click()
    await request
  })

  test("API request includes generalSearch param on direct page load with param in URL", async ({
    page,
  }) => {
    const request = page.waitForRequest(
      (req) =>
        req.url().includes("/api/admin/properties") &&
        new URL(req.url()).searchParams.get("generalSearch") === "smith",
    )
    await page.goto("/admin/properties?generalSearch=smith")
    await expect(page.getByTestId("properties-general-search-input")).toHaveValue("smith")
    await request
  })
})
