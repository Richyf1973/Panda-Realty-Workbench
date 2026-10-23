import type { Page } from "@playwright/test"
import { expect } from "@playwright/test"

export const PROPERTY_LIST_ID = 1001

export const LIST_ITEM = {
  propertyListId: PROPERTY_LIST_ID,
  streetAddress: "99 Sync Test Street",
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
  owner1name: "Smith, John",
  owner2name: null,
  owner3name: null,
  combinedOwner: "Smith, John",
  isFavorite: true,
  priceUndisclosed: false,
  excludeFromReport: false,
  saleDate: null,
  updatedAt: "2026-01-01T00:00:00Z",
}

export const PROPERTY_DETAIL = {
  ...LIST_ITEM,
  propertyEntities: [],
  propertyBuyers: [],
  propertyContacts: [],
  propertyTenants: [],
}

export const LIST_RESPONSE = {
  items: [LIST_ITEM],
  totalCount: 1,
  limit: 25,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false,
  startCursor: null,
  endCursor: null,
}

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

export const EMPTY_LIST = { items: [] }

export const SEARCH_CONTACT_RESULT = {
  items: [
    {
      entityId: 55,
      entityName: "McAuley Law",
      phoneNumber: "0478 848 131",
      emailAddress: "admin@mcauleylaw.com.au",
    },
  ],
  totalCount: 1,
  limit: 10,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false,
  startCursor: null,
  endCursor: null,
}

export const LINKED_CONTACT_ROW = {
  propertyEntityId: 99,
  entityId: 55,
  entityName: "McAuley Law",
  phoneNumber: "0478 848 131",
  emailAddress: "admin@mcauleylaw.com.au",
  address: null,
  esuburb: null,
  estate: null,
  epostcode: null,
  notes: null,
  contactCategoryId: null,
  contactCategoryName: null,
  association: null,
}

export const ENTITY_CATEGORIES_RESPONSE = {
  items: [{ entityCategoryId: 4, entityCategoryName: "Contact", slug: "contact" }],
  totalCount: 1,
  limit: 100,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false,
  startCursor: null,
  endCursor: null,
}

export const GOOGLE_CONTACTS_WARNING = "Google not connected — contact not synced"

export async function mountPropertyRoutes(page: Page) {
  await page.route("**/api/admin/property-status**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(STATUS_LIST_RESPONSE),
    })
  })

  await page.route("**/api/admin/properties**", async (route) => {
    const url = route.request().url()
    if (/\/api\/admin\/properties\/1001\/.+/.test(url)) return route.fallback()
    if (/\/api\/admin\/properties\/1001(\?|$)/.test(url)) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(PROPERTY_DETAIL),
      })
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(LIST_RESPONSE),
    })
  })
}

export async function openPropertyDialog(page: Page) {
  await page.goto("/admin/properties")
  await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible()
  await page.getByTestId(`admin-entity-row--properties--${PROPERTY_LIST_ID}`).click()
  await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible()
  await expect(page.getByTestId("panda-properties-form-bottom-tabs")).toBeVisible()
}
