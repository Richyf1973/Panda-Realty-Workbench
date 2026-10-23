import { type Page } from "@playwright/test"

export async function getLocalStorage(page: Page, key: string): Promise<string | null> {
  return page.evaluate((k) => window.localStorage.getItem(k), key)
}

export async function setLocalStorage(page: Page, key: string, value: string) {
  await page.evaluate(([k, v]) => window.localStorage.setItem(k, v), [key, value] as [string, string])
}

export const STATUS_OPTIONS = {
  items: [
    { propertyStatusId: 1, propertyStatus: "Quiet Listing", propertyStatusCode: "QUIET" },
    { propertyStatusId: 2, propertyStatus: "Coming Soon", propertyStatusCode: "COMING" },
    { propertyStatusId: 3, propertyStatus: "Appraised", propertyStatusCode: "APPRAISED" },
    { propertyStatusId: 4, propertyStatus: "To Be Appraised", propertyStatusCode: "TBA" },
    { propertyStatusId: 5, propertyStatus: "Listed With Another Agent", propertyStatusCode: "LISTED_OTHER" },
  ],
  totalCount: 5,
  limit: 100,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false,
  startCursor: null,
  endCursor: null,
}

export async function setupMocks(page: Page) {
  await page.route("**/api/admin/property-status**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(STATUS_OPTIONS) })
  })
  await page.route("**/api/admin/properties**", async (route) => {
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
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_LIST_RESPONSE) })
  })
  await page.route("**/api/admin/property-entities**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [], totalCount: 0 }) })
  })
}
