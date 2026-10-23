import { expect, test } from "@playwright/test"

import { requirePandaE2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"

const STATUS_LIST_RESPONSE = {
  items: [
    {
      propertyStatusId: 1,
      propertyStatusCode: "ACTIVE",
      propertyStatus: "Active",
    },
  ],
  totalCount: 1,
  limit: 100,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false,
  startCursor: null,
  endCursor: null,
}

const EMPTY_PROPERTY_ENTITIES_LIST = {
  items: [],
  totalCount: 0,
  limit: 20,
  totalPages: 0,
  hasNextPage: false,
  hasPreviousPage: false,
  startCursor: null,
  endCursor: null,
}

const LIST_ITEM = {
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

const PROPERTY_DETAIL = {
  ...LIST_ITEM,
  propertyEntities: [],
  propertyBuyers: [],
  propertyContacts: [],
  propertyTenants: [],
}

const LIST_RESPONSE = {
  items: [LIST_ITEM],
  totalCount: 1,
  limit: 25,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false,
  startCursor: null,
  endCursor: null,
}

test.describe("Panda Realty — Google Contacts sync warning banner", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaE2eAdminCredentials()
    await page.route("**/api/admin/property-status**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(STATUS_LIST_RESPONSE),
      })
    })
    await page.route("**/api/admin/property-entities**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(EMPTY_PROPERTY_ENTITIES_LIST),
      })
    })
    await signInAsAdmin(page)
  })

  test("PATCH property response with googleContactsWarnings shows banner and dismiss clears it", async ({
    page,
  }) => {
    const warningText = "Google Contacts: E2E simulated sync notice"

    await page.route("**/api/admin/properties**", async (route) => {
      const url = route.request().url()
      if (url.match(/\/api\/admin\/properties\/1001(\?|$)/)) {
        if (route.request().method() === "PATCH") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              ...PROPERTY_DETAIL,
              googleContactsWarnings: [warningText],
            }),
          })
          return
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(PROPERTY_DETAIL),
        })
        return
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(LIST_RESPONSE),
      })
    })

    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible()
    await page.getByTestId("admin-entity-row--properties--1001").click()
    await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible()

    await page.getByTestId("admin-entity-edit-submit--properties").click()

    const banner = page.getByTestId("panda-google-contacts-warning-banner")
    await expect(banner).toBeVisible()
    await expect(banner.getByText("Google Contacts", { exact: true })).toBeVisible()
    await expect(banner.getByText(warningText)).toBeVisible()
    await page.screenshot({
      path: "test-results/google-contacts-banner-after-patch.png",
      fullPage: true,
    })

    await banner.getByTestId("panda-google-contacts-warning-banner-dismiss").click()
    await expect(banner).toHaveCount(0)
  })

  test("CustomEvent panda-realty-google-contacts-warnings shows the same banner", async ({ page }) => {
    await page.route("**/api/admin/properties**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(LIST_RESPONSE),
      })
    })

    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-page")).toBeVisible()

    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("panda-realty-google-contacts-warnings", {
          detail: ["Event-driven Google Contacts notice"],
        }),
      )
    })

    const banner = page.getByTestId("panda-google-contacts-warning-banner")
    await expect(banner).toBeVisible()
    await expect(banner.getByText("Event-driven Google Contacts notice")).toBeVisible()
  })
})
