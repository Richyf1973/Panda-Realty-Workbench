import { expect, type Page } from "@playwright/test"

export const STATUS_LIST_RESPONSE = {
  items: [],
  totalCount: 0,
  limit: 100,
  totalPages: 0,
  hasNextPage: false,
  hasPreviousPage: false,
  startCursor: null,
  endCursor: null,
}

export const EMPTY_LIST_RESPONSE = {
  items: [],
  totalCount: 0,
  limit: 25,
  totalPages: 0,
  hasNextPage: false,
  hasPreviousPage: false,
  startCursor: null,
  endCursor: null,
}

/**
 * Navigate to the properties quick-cards view with mocked API responses.
 *
 * Registers mocks for property-status and properties list endpoints, then
 * navigates to `/admin/properties?propertyType=<seed>` and waits for the
 * quick-cards scroll container to appear.
 *
 * NOTE: a non-map append-where filter (`propertyType`) is the quick-card trigger on
 * purpose. The map filter (`streetFilter`) deliberately shows the compact TABLE, not
 * cards, so it is no longer a valid way to enter quick-card mode.
 *
 * Register any additional page.route() mocks BEFORE calling this helper so
 * they are active when navigation triggers the initial API requests.
 *
 * @param listResponse - The response body for the filtered properties list
 *   (i.e. when the request URL contains "propertyType="). Any shape accepted.
 * @param seed - Optional property-type filter value used as the URL param value.
 *   Only needs to be present so "propertyType=" appears in the URL. Defaults to "House".
 */
export async function gotoPropertiesQuickCards(
  page: Page,
  listResponse: object,
  seed = "House",
): Promise<void> {
  await page.route("**/api/admin/property-status**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(STATUS_LIST_RESPONSE),
    })
  })
  await page.route("**/api/admin/properties**", async (route) => {
    const url = route.request().url()
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(url.includes("propertyType=") ? listResponse : EMPTY_LIST_RESPONSE),
    })
  })
  await page.goto(`/admin/properties?propertyType=${encodeURIComponent(seed)}`)
  // Generous timeout: first /admin/properties render can be a slow dev-server compile + list load.
  await expect(page.getByTestId("admin-entity-quick-cards-scroll--properties")).toBeVisible({
    timeout: 30_000,
  })
}
