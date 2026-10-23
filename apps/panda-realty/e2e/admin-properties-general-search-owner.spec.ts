import { expect, test } from "@playwright/test"

import { e2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"

/**
 * generalSearch bar — owner name and street address matching.
 *
 * Success factors:
 * 1. Placeholder text reads "Search owners, buyers, contacts, notes…" (not the old copy).
 * 2. Typing an owner name and submitting sends generalSearch=<term> to the API.
 * 3. Typing a street address fragment and submitting sends generalSearch=<term> to the API.
 * 4. When the API returns a property matching the generalSearch term, the property appears in the list.
 * 5. Page reload with generalSearch in the URL re-issues the API call with that param.
 * 6. Submitting an empty input removes generalSearch from the URL.
 * 7. Special characters (%, _) in the input do not crash the UI.
 */

const makeListResponse = (items: Record<string, unknown>[]) => ({
  items,
  totalCount: items.length,
  limit: 25,
  totalPages: items.length > 0 ? 1 : 0,
  hasNextPage: false,
  hasPreviousPage: false,
  startCursor: null,
  endCursor: null,
})

const EMPTY_LIST_RESPONSE = makeListResponse([])

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

const LAWRENCE_PROPERTY = {
  propertyListId: 9001,
  streetAddress: "195/46 AMY STREET",
  suburb: "MORAYFIELD",
  state: "QLD",
  postcode: "4506",
  owner1name: "LAWRENCE BAKER",
  owner2name: null,
  owner3name: null,
  combinedOwner: "LAWRENCE BAKER",
  isFavorite: true,
  propertyStatusId: null,
  bed: null,
  bath: null,
  car: null,
  landSize: null,
  salePrice: null,
  saleDate: null,
  appraisedAmount: null,
  contractPrice: null,
  successfulBuyer: null,
  updatedAt: "2024-01-01T00:00:00.000Z",
}

test.describe("Properties — generalSearch: owner name and street address", () => {
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

  // MV step 2: placeholder text updated
  test("search bar placeholder reads 'Search owners, buyers, contacts, notes…'", async ({
    page,
  }) => {
    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-list-card--properties")).toBeVisible()

    await expect(page.getByTestId("properties-general-search-input")).toHaveAttribute(
      "placeholder",
      "Search owners, buyers, contacts, notes…",
    )
  })

  // MV step 3: owner name search sends correct URL param
  test("searching an owner name sends generalSearch param to the API", async ({ page }) => {
    await page.goto("/admin/properties")
    await expect(page.getByTestId("properties-general-search-input")).toBeVisible()

    const apiRequest = page.waitForRequest(
      (req) =>
        req.url().includes("/api/admin/properties") &&
        new URL(req.url()).searchParams.get("generalSearch") === "lawrence",
    )
    await page.getByTestId("properties-general-search-input").fill("lawrence")
    await page.getByTestId("properties-general-search-submit").click()
    await apiRequest

    await expect(page).toHaveURL(/generalSearch=lawrence/)
  })

  // MV step 6: street address search sends correct URL param
  test("searching a street address fragment sends generalSearch param to the API", async ({
    page,
  }) => {
    await page.goto("/admin/properties")
    await expect(page.getByTestId("properties-general-search-input")).toBeVisible()

    const apiRequest = page.waitForRequest(
      (req) =>
        req.url().includes("/api/admin/properties") &&
        new URL(req.url()).searchParams.get("generalSearch") === "amy street",
    )
    await page.getByTestId("properties-general-search-input").fill("amy street")
    await page.getByTestId("properties-general-search-submit").click()
    await apiRequest

    await expect(page).toHaveURL(/generalSearch=amy\+street/)
  })

  // MV step 4: API returning a property with matching owner name → row visible
  test("property matching owner name appears in the list", async ({ page }) => {
    await page.unroute("**/api/admin/properties**")
    await page.route("**/api/admin/properties**", async (route) => {
      const url = new URL(route.request().url())
      const gs = url.searchParams.get("generalSearch")
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          gs && "lawrence baker".includes(gs.toLowerCase())
            ? makeListResponse([LAWRENCE_PROPERTY])
            : EMPTY_LIST_RESPONSE,
        ),
      })
    })

    await page.goto("/admin/properties?generalSearch=lawrence")
    await expect(page.getByTestId("admin-entity-list-card--properties")).toBeVisible()

    await expect(page.getByText("195/46 AMY STREET")).toBeVisible()
    await expect(page.getByText("LAWRENCE BAKER")).toBeVisible()
  })

  // MV steps 21-23: reload preserves generalSearch and re-fetches
  test("page reload re-issues API call with generalSearch param", async ({ page }) => {
    await page.goto("/admin/properties?generalSearch=lawrence")
    await expect(page.getByTestId("properties-general-search-input")).toHaveValue("lawrence")

    // Wait for the API call triggered by reload to include generalSearch
    const reloadRequest = page.waitForRequest(
      (req) =>
        req.url().includes("/api/admin/properties") &&
        new URL(req.url()).searchParams.get("generalSearch") === "lawrence",
    )
    await page.reload()
    await reloadRequest

    // Input still reflects the search term and URL retains the param
    await expect(page.getByTestId("properties-general-search-input")).toHaveValue("lawrence")
    await expect(page).toHaveURL(/generalSearch=lawrence/)
  })

  // MV step 19-20: empty submit removes param
  test("submitting empty input removes generalSearch from URL", async ({ page }) => {
    await page.goto("/admin/properties?generalSearch=lawrence")
    await expect(page.getByTestId("properties-general-search-input")).toHaveValue("lawrence")

    await page.getByTestId("properties-general-search-input").clear()
    await page.getByTestId("properties-general-search-submit").click()

    await expect(page).not.toHaveURL(/generalSearch/)
  })

  // MV steps 15-16: special characters do not crash the UI
  test("special characters in search input do not crash the page", async ({ page }) => {
    await page.goto("/admin/properties")
    await expect(page.getByTestId("properties-general-search-input")).toBeVisible()

    await page.getByTestId("properties-general-search-input").fill("%_\\")
    await page.getByTestId("properties-general-search-submit").click()

    // No crash: list card still rendered, no server error
    await expect(page.getByTestId("admin-entity-list-card--properties")).toBeVisible()
    await expect(page).toHaveURL(/generalSearch/)
  })

  // MV steps 17-18: search bar hidden outside Favorites view
  test("search bar is not visible when isFavorite=all", async ({ page }) => {
    await page.goto("/admin/properties?isFavorite=all")
    await expect(page.getByTestId("admin-entity-list-card--properties")).toBeVisible()

    await expect(page.getByTestId("properties-general-search-input")).toHaveCount(0)
  })
})
