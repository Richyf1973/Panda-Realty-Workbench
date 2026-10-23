import { expect, test } from "@playwright/test"

import { requirePandaE2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const PROPERTY_LIST_ID = 1001

const LIST_ITEM = {
  propertyListId: PROPERTY_LIST_ID,
  streetAddress: "195/46 AMY STREET",
  suburb: "MORAYFIELD",
  state: "QLD",
  postcode: "4506",
  propertyType: "Unit",
  bed: 2,
  bath: 1,
  car: 1,
  salePrice: 450000,
  propertyStatusId: 1,
  buyerName: null,
  buyerId: null,
  owner1name: "LAWRENCE JOSEPH BAKER",
  owner2name: null,
  owner3name: null,
  combinedOwner: "LAWRENCE JOSEPH BAKER",
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

const STATUS_LIST_RESPONSE = {
  items: [{ propertyStatusId: 1, propertyStatusCode: "ACTIVE", propertyStatus: "Active" }],
  totalCount: 1,
  limit: 100,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false,
  startCursor: null,
  endCursor: null,
}

const EMPTY_LIST = { items: [] }

function makeBuyerRow(overrides: {
  entityId?: number
  entityName?: string
  phoneNumber?: string | null
  emailAddress?: string | null
}) {
  return {
    propertyEntityId: 88,
    entityId: overrides.entityId ?? 42,
    entityName: overrides.entityName ?? "Test Buyer",
    phoneNumber: overrides.phoneNumber ?? null,
    emailAddress: overrides.emailAddress ?? null,
    address: null,
    esuburb: null,
    estate: null,
    epostcode: null,
    notes: null,
    buyerPipelineStatusId: null,
    pipelineStatusLabel: null,
    hasOfferFormSubmission: false,
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function mountBaseRoutes(page: import("@playwright/test").Page) {
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

  await page.route("**/api/admin/properties/1001/contacts**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_LIST) })
  })
}

async function openPropertyBuyersTab(page: import("@playwright/test").Page) {
  await page.goto("/admin/properties")
  await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible()
  await page.getByTestId(`admin-entity-row--properties--${PROPERTY_LIST_ID}`).click()
  await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible()
  await page.getByTestId("panda-properties-form-tab-trigger--buyers").click()
  await expect(page.getByTestId("panda-properties-form-tab--buyers")).toBeVisible()
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe("Panda Realty — Buyer panel phone display", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaE2eAdminCredentials()
    await signInAsAdmin(page)
  })

  test("buyer card shows phone number when API returns one", async ({ page }) => {
    await mountBaseRoutes(page)

    await page.route("**/api/admin/properties/1001/buyers**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: [makeBuyerRow({ entityName: "Liam Cann", phoneNumber: "0466275112", emailAddress: "lc20400@outlook.com" })],
        }),
      })
    })

    await openPropertyBuyersTab(page)

    const buyerRow = page.getByTestId("property-buyer-panel-row--88")
    await expect(buyerRow).toBeVisible()
    await expect(buyerRow.getByText("Liam Cann")).toBeVisible()
    await expect(buyerRow.getByText("0466275112")).toBeVisible()
  })

  test("buyer card shows no phone when API returns null phone", async ({ page }) => {
    await mountBaseRoutes(page)

    await page.route("**/api/admin/properties/1001/buyers**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: [makeBuyerRow({ entityName: "No Phone Buyer", phoneNumber: null, emailAddress: "buyer@example.com" })],
        }),
      })
    })

    await openPropertyBuyersTab(page)

    const buyerRow = page.getByTestId("property-buyer-panel-row--88")
    await expect(buyerRow).toBeVisible()
    await expect(buyerRow.getByText("No Phone Buyer")).toBeVisible()
    // Phone span must not exist
    await expect(buyerRow.locator("span").filter({ hasText: /^04/ })).toHaveCount(0)
  })

  test("buyer card shows contact-field phone (from API)", async ({ page }) => {
    await mountBaseRoutes(page)

    // The API returns phoneNumber sourced from the `contact` column (COALESCE(contact, member_phone)).
    // The legacy `phone_number` column has been dropped — `contact` is the sole phone source.
    await page.route("**/api/admin/properties/1001/buyers**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: [
            makeBuyerRow({
              entityName: "Priority Test Buyer",
              // contact value wins — API should return this, not the phone_number value
              phoneNumber: "0400000001",
              emailAddress: "priority@example.com",
            }),
          ],
        }),
      })
    })

    await openPropertyBuyersTab(page)

    const buyerRow = page.getByTestId("property-buyer-panel-row--88")
    await expect(buyerRow).toBeVisible()
    await expect(buyerRow.getByText("0400000001")).toBeVisible()
  })

  test("buyer panel shows multiple buyers each with their own phone", async ({ page }) => {
    await mountBaseRoutes(page)

    await page.route("**/api/admin/properties/1001/buyers**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: [
            { ...makeBuyerRow({ entityName: "Buyer A", phoneNumber: "0411111111" }), propertyEntityId: 88 },
            { ...makeBuyerRow({ entityName: "Buyer B", phoneNumber: "0422222222" }), propertyEntityId: 89 },
          ],
        }),
      })
    })

    await openPropertyBuyersTab(page)

    await expect(page.getByTestId("property-buyer-panel-row--88").getByText("0411111111")).toBeVisible()
    await expect(page.getByTestId("property-buyer-panel-row--89").getByText("0422222222")).toBeVisible()
  })
})
