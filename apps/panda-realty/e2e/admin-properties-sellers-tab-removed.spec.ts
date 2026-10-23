import { expect, test } from "@playwright/test"

import { e2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import { STATUS_LIST_RESPONSE } from "./helpers/admin-properties-mocks"

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const FAVORITE_PROPERTY = {
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
  isFavorite: true,
  priceUndisclosed: false,
  excludeFromReport: false,
  saleDate: null,
  updatedAt: "2026-01-01T00:00:00Z",
  combinedOwner: "Smith, John / Jane Smith",
  owner1name: "Smith, John",
  owner1phone: "0412000001",
  owner1email: "john.smith@example.com",
  owner1address: "12 Test Street",
  owner2name: "Jane Smith",
  owner2phone: null,
  owner2email: null,
  owner2address: null,
  owner3name: null,
  owner3phone: null,
  owner3email: null,
  propertyEntities: [],
  propertyBuyers: [],
  propertyContacts: [],
  propertyTenants: [],
}

const NON_FAVORITE_PROPERTY = { ...FAVORITE_PROPERTY, isFavorite: false }

const EMPTY_PANEL = { items: [] }

function makeListResponse(property: typeof FAVORITE_PROPERTY) {
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

// ---------------------------------------------------------------------------
// Setup helpers
// ---------------------------------------------------------------------------

async function setupRoutes(
  page: import("@playwright/test").Page,
  property: typeof FAVORITE_PROPERTY = FAVORITE_PROPERTY,
) {
  await page.route("**/api/admin/property-status**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(STATUS_LIST_RESPONSE) })
  })
  await page.route("**/api/admin/property-entities**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_PANEL) })
  })
  await page.route("**/api/admin/properties/**/buyers**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_PANEL) })
  })
  await page.route("**/api/admin/properties/**/contacts**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_PANEL) })
  })
  await page.route("**/api/admin/properties/**/tenants**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_PANEL) })
  })
  await page.route("**/api/admin/calendar/status**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ connected: false }) })
  })
  await page.route("**/api/admin/portal-tokens/**", async (route) => {
    await route.fulfill({ status: 404 })
  })
  await page.route("**/api/admin/properties**", async (route) => {
    const url = route.request().url()
    if (url.includes("/buyer-offers")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) })
      return
    }
    if (url.match(/\/api\/admin\/properties\/1001(\?|$)/)) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(property) })
      return
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(makeListResponse(property)) })
  })
}

async function openPropertyDialog(page: import("@playwright/test").Page) {
  await page.goto("/admin/properties")
  await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible()
  await page.getByTestId("admin-entity-row--properties--1001").click()
  await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible()
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe("Property dialog — Sellers tab removed", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")
    await setupRoutes(page)
    await signInAsAdmin(page)
  })

  test("Sellers tab is not present in the tab bar for a favorite property", async ({ page }) => {
    await openPropertyDialog(page)
    await expect(page.getByTestId("panda-properties-form-tab-trigger--sellers")).toHaveCount(0)
  })

  test("Sellers tab is not present for a non-favorite property", async ({ page }) => {
    await setupRoutes(page, NON_FAVORITE_PROPERTY)
    await openPropertyDialog(page)
    await expect(page.getByTestId("panda-properties-form-tab-trigger--sellers")).toHaveCount(0)
  })

  test("Remaining tabs are still visible after Sellers tab removal", async ({ page }) => {
    await openPropertyDialog(page)
    await expect(page.getByTestId("panda-properties-form-tab-trigger--sales")).toHaveCount(0)
    await expect(page.getByTestId("panda-properties-form-tab-trigger--buyers")).toBeVisible()
    await expect(page.getByTestId("panda-properties-form-tab-trigger--contacts")).toBeVisible()
    await expect(page.getByTestId("panda-properties-form-tab-trigger--tenants")).toBeVisible()
    await expect(page.getByTestId("panda-properties-form-tab-trigger--files")).toBeVisible()
    await expect(page.getByTestId("panda-properties-form-tab-trigger--forms")).toBeVisible()
  })

  test("Buyers tab is the first tab when no offer is accepted", async ({ page }) => {
    await openPropertyDialog(page)
    await expect(page.getByTestId("panda-properties-form-tab-trigger--sales")).toHaveCount(0)
    const tabs = page.locator('[role="tablist"] [role="tab"]')
    await expect(tabs.nth(0)).toHaveAttribute("data-testid", "panda-properties-form-tab-trigger--buyers")
  })
})
