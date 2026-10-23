import { expect } from "@playwright/test"

export const SINGLE_PROPERTY_ROW = {
  propertyListId: 1001,
  streetAddress: "12 Test Street",
  suburb: "Testville",
  state: "QLD",
  postcode: "4000",
  propertyType: "House",
  bed: 3,
  bath: 2,
  car: 1,
  salePrice: null,
  propertyStatusId: null,
  buyerName: null,
  buyerId: null,
  owner1name: "Test Owner",
  owner2name: null,
  owner3name: null,
  combinedOwner: "Test Owner",
  isFavorite: true,
  priceUndisclosed: false,
  excludeFromReport: false,
  saleDate: null,
  updatedAt: "2026-01-01T00:00:00Z",
}

export const PROPERTY_DETAIL_EMPTY_CATEGORIES = {
  ...SINGLE_PROPERTY_ROW,
  isFavorite: true,
  propertyEntities: [],
  propertyBuyers: [],
  propertyContacts: [],
  propertyTenants: [],
}

export const EMPTY_LIST = {
  items: [],
  totalCount: 0,
  limit: 20,
  totalPages: 0,
  hasNextPage: false,
  hasPreviousPage: false,
  startCursor: null,
  endCursor: null,
}

export async function emptyList(route: import("@playwright/test").Route) {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(EMPTY_LIST),
  })
}

export async function setupBaseRoutes(
  page: import("@playwright/test").Page,
  entityPostResponse: Record<string, unknown>,
) {
  await page.route("**/api/admin/properties**", async (route) => {
    const url = route.request().url()
    if (url.match(/\/api\/admin\/properties\/1001(\?|$)/)) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(PROPERTY_DETAIL_EMPTY_CATEGORIES),
      })
      return
    }
    if (url.match(/\/api\/admin\/properties\/1001\/buyers(\?|$)/)) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: [] }),
      })
      return
    }
    if (url.match(/\/api\/admin\/properties\/1001\/tenants(\?|$)/)) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: [] }),
      })
      return
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ...EMPTY_LIST, items: [SINGLE_PROPERTY_ROW], totalCount: 1 }),
    })
  })

  await page.route("**/api/admin/property-entities**", emptyList)

  await page.route("**/api/admin/entities**", async (route) => {
    const method = route.request().method()
    const url = route.request().url()
    const newId = entityPostResponse.entityId as number

    if (method === "POST") {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify(entityPostResponse),
      })
      return
    }
    if (url.match(new RegExp(`\\/api\\/admin\\/entities\\/${newId}(\\?|$)`))) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(entityPostResponse),
      })
      return
    }
    await emptyList(route)
  })

  await page.route("**/api/admin/entity-categories**", emptyList)
  await page.route("**/api/admin/contact-categories**", emptyList)
  await page.route("**/api/admin/lead-sources**", emptyList)
  await page.route("**/api/admin/property-status**", emptyList)
  await page.route("**/api/admin/buyer-status**", emptyList)
}

export async function openPropertyAndBuyersTab(page: import("@playwright/test").Page) {
  await page.goto("/admin/properties")
  await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible({ timeout: 15_000 })
  await page.getByTestId("admin-entity-row--properties--1001").click()
  await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible()
  await page.getByTestId("panda-properties-form-tab-trigger--buyers").click()
  await expect(page.getByTestId("panda-properties-form-tab--buyers")).toBeVisible()
  await expect(page.getByTestId("property-buyers-panel-add-new")).toBeVisible({ timeout: 15_000 })
  await expect(page.getByTestId("property-buyers-panel-add-new")).toBeEnabled({ timeout: 10_000 })
}

export async function openPropertyAndTenantsTab(page: import("@playwright/test").Page) {
  await page.goto("/admin/properties")
  await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible({ timeout: 15_000 })
  await page.getByTestId("admin-entity-row--properties--1001").click()
  await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible()
  await page.getByTestId("panda-properties-form-tab-trigger--tenants").click()
  await expect(page.getByTestId("panda-properties-form-tab--tenants")).toBeVisible()
  await expect(page.getByTestId("property-tenants-add-new")).toBeVisible({ timeout: 15_000 })
  await expect(page.getByTestId("property-tenants-add-new")).toBeEnabled({ timeout: 10_000 })
}

export async function openPropertyAndContactsTab(page: import("@playwright/test").Page) {
  await page.goto("/admin/properties")
  await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible({ timeout: 15_000 })
  await page.getByTestId("admin-entity-row--properties--1001").click()
  await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible()
  await page.getByTestId("panda-properties-form-tab-trigger--contacts").click()
  await expect(page.getByTestId("panda-properties-form-tab--contacts")).toBeVisible()
  await expect(page.getByTestId("property-contacts-add-new")).toBeVisible({ timeout: 15_000 })
  await expect(page.getByTestId("property-contacts-add-new")).toBeEnabled({ timeout: 10_000 })
}
