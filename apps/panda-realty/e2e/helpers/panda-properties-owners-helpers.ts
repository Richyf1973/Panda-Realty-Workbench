import { expect, type Page } from "@playwright/test"

// ── Shared API stubs ────────────────────────────────────────────────────────

export const STATUS_LIST_RESPONSE = {
  items: [{ propertyStatusId: 1, propertyStatusCode: "ACTIVE", propertyStatus: "Active" }],
  totalCount: 1,
  limit: 100,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false,
  startCursor: null,
  endCursor: null,
}

export const EMPTY_PROPERTY_ENTITIES_RESPONSE = {
  items: [],
  totalCount: 0,
  limit: 20,
  totalPages: 0,
  hasNextPage: false,
  hasPreviousPage: false,
  startCursor: null,
  endCursor: null,
}

// ── Owner data fixtures ─────────────────────────────────────────────────────

export const BASE_PROPERTY = {
  propertyListId: 1001,
  streetAddress: "12 Test Street",
  suburb: "Testville",
  state: "QLD",
  postcode: "4000",
  propertyType: "House",
  bed: 3,
  bath: 2,
  car: 1,
  salePrice: 500000,
  propertyStatusId: 1,
  buyerName: null,
  buyerId: null,
  isFavorite: false,
  priceUndisclosed: false,
  excludeFromReport: false,
  saleDate: null,
  updatedAt: "2026-01-01T00:00:00Z",
  combinedOwner: "Smith, John / Jane Smith",
  primaryPhoneOwnerNum: 1,
  primaryEmailOwnerNum: 1,
}

/** Owner 1 has all contact info including email; owner 2 has name only (blank email). */
export const PROPERTY_TWO_OWNERS = {
  ...BASE_PROPERTY,
  owner1name: "Smith, John",
  owner1address: "182 AMY STREET MORAYFIELD",
  owner1phone: "0412345678",
  owner1email: "john@example.com",
  owner2name: "Jane Smith",
  owner2address: "",
  owner2phone: "",
  owner2email: "",
  owner3name: null,
  owner3address: null,
  owner3phone: null,
  owner3email: null,
}

/** Three owners — owner 1 has email; owner 2 and 3 have names only (no email). */
export const PROPERTY_THREE_OWNERS = {
  ...BASE_PROPERTY,
  combinedOwner: "Smith, John / Jane Smith / Bob Smith",
  owner1name: "Smith, John",
  owner1address: "182 AMY STREET MORAYFIELD",
  owner1phone: "0412345678",
  owner1email: "john@example.com",
  owner2name: "Jane Smith",
  owner2address: "",
  owner2phone: "",
  owner2email: "",
  owner3name: "Bob Smith",
  owner3address: "",
  owner3phone: "",
  owner3email: "",
}

/** Only owner 1 — copy-down button should be absent. */
export const PROPERTY_ONE_OWNER = {
  ...BASE_PROPERTY,
  combinedOwner: "Smith, John",
  owner1name: "Smith, John",
  owner1address: "182 AMY STREET MORAYFIELD",
  owner1phone: "0412345678",
  owner1email: "john@example.com",
  owner2name: null,
  owner2address: null,
  owner2phone: null,
  owner2email: null,
  owner3name: null,
  owner3address: null,
  owner3phone: null,
  owner3email: null,
}

// ── Helpers ─────────────────────────────────────────────────────────────────

export function makeListResponse(property: typeof BASE_PROPERTY) {
  return {
    items: [property],
    totalCount: 1,
    limit: 25,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
    startCursor: null,
    endCursor: null,
  }
}

/**
 * Register the catch-all properties route without navigating.
 * Call this first, then register any panel-specific routes (they must come
 * AFTER this call so LIFO gives them higher priority), then navigate.
 *
 * Note: this handler fulfills ALL HTTP methods (GET, PATCH, DELETE…) with
 * the same property-detail JSON. Tests that need to intercept PATCH must
 * register a more-specific route AFTER calling this function so that
 * Playwright's LIFO ordering gives the test's handler higher priority.
 */
export async function registerPropertyRoutes(
  page: Page,
  propertyDetail: typeof BASE_PROPERTY,
) {
  await page.route("**/api/admin/properties**", async (route) => {
    const url = route.request().url()
    if (url.match(/\/api\/admin\/properties\/1001(\?|$)/)) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(propertyDetail),
      })
      return
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(makeListResponse(propertyDetail)),
    })
  })
}

/** Register property list + detail mocks, then open the edit dialog for row 1001. */
export async function openPropertyEditDialog(
  page: Page,
  propertyDetail: typeof BASE_PROPERTY,
) {
  await registerPropertyRoutes(page, propertyDetail)

  await page.goto("/admin/properties")
  await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible()
  await page.getByTestId("admin-entity-row--properties--1001").click()
  await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible()
  await expect(page.getByTestId("panda-properties-dialog-form")).toBeVisible()
}
