import { expect, test } from "@playwright/test"

import { e2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"

// ─── shared mock data ─────────────────────────────────────────────────────────

const SINGLE_PROPERTY_ROW = {
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

const PROPERTY_DETAIL_EMPTY_CATEGORIES = {
  ...SINGLE_PROPERTY_ROW,
  isFavorite: true,
  propertyEntities: [],
  propertyBuyers: [],
  propertyContacts: [],
  propertyTenants: [],
}

const EMPTY_LIST = {
  items: [],
  totalCount: 0,
  limit: 20,
  totalPages: 0,
  hasNextPage: false,
  hasPreviousPage: false,
  startCursor: null,
  endCursor: null,
}

/** Fulfils any route with an empty list response. */
async function emptyList(route: import("@playwright/test").Route) {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(EMPTY_LIST),
  })
}

// ─── success factors ──────────────────────────────────────────────────────────
//
// 1. "Add new buyer" button is visible in the Buyers tab of a Favorite property.
// 2. "Add new tenant" button is visible in the Tenants tab of a Favorite property.
// 3. "Add new" in Buyers tab opens the buyer panel dialog; card appears after save.
// 4. "Add new" in Tenants tab opens the tenant panel dialog; card appears after save.
//
// Contacts tab "Add new" tests live in admin-properties-contacts-add-new.spec.ts.

test.describe("Panda Realty admin — Add new buyer / contact / tenant", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")
    await signInAsAdmin(page)
  })

  // ── shared route setup ────────────────────────────────────────────────────

  async function setupBaseRoutes(
    page: import("@playwright/test").Page,
    entityPostResponse: Record<string, unknown>,
  ) {
    // Properties list → single row; property detail → isFavorite with empty category rows
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

    // Property entities - all empty
    await page.route("**/api/admin/property-entities**", emptyList)

    // Entities API: POST → new entity, GET list/detail → empty / the new entity
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

    // Lookup lists used by the entity create form and contact dialog
    await page.route("**/api/admin/entity-categories**", emptyList)
    await page.route("**/api/admin/contact-categories**", emptyList)
    await page.route("**/api/admin/lead-sources**", emptyList)
    await page.route("**/api/admin/property-status**", emptyList)
    await page.route("**/api/admin/buyer-status**", emptyList)
  }

  async function openPropertyAndBuyersTab(page: import("@playwright/test").Page) {
    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible()
    await page.getByTestId("admin-entity-row--properties--1001").click()
    await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible()
    await page.getByTestId("panda-properties-form-tab-trigger--buyers").click()
    await expect(page.getByTestId("panda-properties-form-tab--buyers")).toBeVisible()
    await expect(page.getByTestId("property-buyers-panel-add-new")).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId("property-buyers-panel-add-new")).toBeEnabled({ timeout: 10_000 })
  }

  async function openPropertyAndTenantsTab(page: import("@playwright/test").Page) {
    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible()
    await page.getByTestId("admin-entity-row--properties--1001").click()
    await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible()
    await page.getByTestId("panda-properties-form-tab-trigger--tenants").click()
    await expect(page.getByTestId("panda-properties-form-tab--tenants")).toBeVisible()
    await expect(page.getByTestId("property-tenants-add-new")).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId("property-tenants-add-new")).toBeEnabled({ timeout: 10_000 })
  }

  // ── test 1: "Add new" button is visible in Buyers tab ────────────────────

  test('Buyers tab shows "Add new" button for a Favorite property', async ({ page }) => {
    await setupBaseRoutes(page, { entityId: 901, entityName: "Dummy" })
    await openPropertyAndBuyersTab(page)
    await expect(page.getByTestId("property-buyers-panel-add-new")).toBeVisible()
  })

  // ── test 2: Tenants tab shows its add button ─────────────────────────────

  test('Tenants tab shows "Add new" button for a Favorite property', async ({ page }) => {
    await setupBaseRoutes(page, { entityId: 903, entityName: "Dummy" })
    await openPropertyAndTenantsTab(page)
    await expect(page.getByTestId("property-tenants-add-new")).toBeVisible()
  })

  // ── test 4: "Add new" opens buyer panel dialog and shows card after save ──

  test('"Add new" in Buyers tab keeps the buyer dialog open and switches to edit mode after save', async ({
    page,
  }) => {
    await setupBaseRoutes(page, { entityId: 999, entityName: "E2E New Buyer" })

    let releaseLinkRequest: (() => void) | null = null
    const linkRequestSeen = new Promise<void>((resolve) => {
      releaseLinkRequest = resolve
    })
    let buyersCallCount = 0
    await page.route("**/api/admin/properties/1001/buyers**", async (route) => {
      buyersCallCount++
      if (buyersCallCount === 1) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ items: [] }),
        })
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            items: [
              {
                propertyEntityId: 8001,
                entityId: 999,
                entityName: "E2E New Buyer",
                entityCategoryId: 1,
                address: null,
                emailAddress: null,
                phoneNumber: null,
                esuburb: null,
                estate: null,
                epostcode: null,
                notes: null,
                buyerPipelineStatusId: null,
                pipelineStatusLabel: null,
              },
            ],
          }),
        })
      }
    })
    await page.route("**/api/admin/property-entities**", async (route) => {
      if (route.request().method() === "POST") {
        releaseLinkRequest?.()
        await new Promise((resolve) => setTimeout(resolve, 250))
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({ propertyEntityId: 8001 }),
        })
        return
      }
      await emptyList(route)
    })

    await openPropertyAndBuyersTab(page)

    await page.getByTestId("property-buyers-panel-add-new").click()

    const dialog = page.getByTestId("admin-entity-crud-dialog--entities")
    await expect(dialog).toBeVisible({ timeout: 10_000 })
    await expect(dialog.getByTestId("admin-entity-create-dialog-title--entities")).toContainText(
      "Add Buyer",
    )
    const submitBtn = page.getByTestId("admin-entity-create-submit--entities")
    await expect(submitBtn).toContainText("Create & Edit")

    await dialog.getByTestId("panda-entities-form-field--entityName").fill("E2E New Buyer")
    await submitBtn.click()

    await linkRequestSeen
    await expect(dialog).toBeVisible({ timeout: 5_000 })
    await expect(dialog.getByTestId("admin-entity-edit-dialog-title--entities")).toContainText(
      "Edit entity",
    )

    const buyerRows = page.getByTestId(/^property-buyer-panel-row--/)
    await expect(buyerRows.first()).toBeVisible({ timeout: 10_000 })
    await expect(buyerRows.first()).toContainText("E2E New Buyer")
  })

  // ── test 5: "Add new" opens tenant panel dialog and shows card after save ─

  test('"Add new" in Tenants tab opens tenant panel dialog and shows card after save', async ({
    page,
  }) => {
    await setupBaseRoutes(page, { entityId: 997, entityName: "E2E New Tenant" })

    let tenantsCallCount = 0
    await page.route("**/api/admin/properties/1001/tenants**", async (route) => {
      tenantsCallCount++
      if (tenantsCallCount === 1) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ items: [] }),
        })
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            items: [
              {
                propertyEntityId: 8002,
                entityId: 997,
                entityName: "E2E New Tenant",
                entityCategoryId: 3,
                address: null,
                emailAddress: null,
                phoneNumber: null,
                esuburb: null,
                estate: null,
                epostcode: null,
                notes: null,
              },
            ],
          }),
        })
      }
    })

    await openPropertyAndTenantsTab(page)

    await page.getByTestId("property-tenants-add-new").click()

    const dialog = page.getByTestId("property-tenant-dialog")
    await expect(dialog).toBeVisible({ timeout: 10_000 })

    await dialog.getByTestId("property-tenant-dialog-name").fill("E2E New Tenant")
    await dialog.getByTestId("property-tenant-dialog-create-and-close").click()

    await expect(dialog).toBeHidden({ timeout: 15_000 })

    const tenantRows = page.getByTestId(/^property-tenant-row--/)
    await expect(tenantRows.first()).toBeVisible({ timeout: 10_000 })
    await expect(tenantRows.first()).toContainText("E2E New Tenant")
  })
})
