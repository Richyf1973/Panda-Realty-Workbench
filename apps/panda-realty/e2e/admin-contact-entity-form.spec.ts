import { expect, test } from "@playwright/test"

import { e2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

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

const BASE_PROPERTY_LIST_ROW = {
  propertyListId: 1001,
  streetAddress: "12 Test Street",
  suburb: "Testville",
  state: "QLD",
  postcode: "4000",
  propertyType: "House",
  bed: 3,
  bath: 2,
  car: 1,
  isFavorite: true,
  propertyStatusId: 1,
  owner1name: null,
  owner2name: null,
  owner3name: null,
  combinedOwner: null,
  salePrice: null,
  priceUndisclosed: false,
  excludeFromReport: false,
  saleDate: null,
  buyerName: null,
  buyerId: null,
  updatedAt: "2026-01-01T00:00:00Z",
}

const CONTACT_JUNCTION_ROW = {
  propertyEntityId: 601,
  entityId: 401,
  isOriginalOwner: false,
  contactCategoryId: null,
  contactCategory: null,
  association: null,
  propertyEntity: {
    entityId: 401,
    entityName: "CCQ Law",
    entityCategoryId: 4,
    address: "1 Legal St",
    emailAddress: "tanya@ccqlaw.com.au",
    contact: "0457 233 838",
    phoneNumber: null,
  },
}

const PROPERTY_DETAIL_WITH_CONTACT = {
  ...BASE_PROPERTY_LIST_ROW,
  propertyEntities: [CONTACT_JUNCTION_ROW],
  propertyContacts: [CONTACT_JUNCTION_ROW],
  propertyBuyers: [],
  propertyTenants: [],
}

const ENTITY_401_CONTACT_DETAIL = {
  entityId: 401,
  entityName: "CCQ Law",
  entityCategoryId: 4,
  emailAddress: "tanya@ccqlaw.com.au",
  contact: "0457 233 838",
  phoneNumber: null,
  mobile: null,
  website: null,
  address: "1 Legal St",
  esuburb: null,
  estate: null,
  epostcode: null,
  notes: null,
  contactCategoryId: null,
  association: null,
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe("Panda Realty — contact entity form (mocked APIs)", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")

    await page.route("**/api/admin/property-status**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: [{ propertyStatusId: 1, propertyStatus: "Active", propertyStatusCode: "ACTIVE" }],
          totalCount: 1,
          limit: 100,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: null,
          endCursor: null,
        }),
      })
    })

    await page.route("**/api/admin/property-entities**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(EMPTY_LIST),
      })
    })

    await page.route("**/api/admin/entity-categories**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: [
            { entityCategoryId: 1, entityCategory: "Buyer" },
            { entityCategoryId: 3, entityCategory: "Tenant" },
            { entityCategoryId: 4, entityCategory: "Contact" },
          ],
          totalCount: 3,
          limit: 100,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: null,
          endCursor: null,
        }),
      })
    })

    await page.route("**/api/admin/contact-categories**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: [
            { contactCategoryId: 1, contactCategoryName: "Solicitor" },
            { contactCategoryId: 2, contactCategoryName: "Accountant" },
          ],
          totalCount: 2,
          limit: 100,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: null,
          endCursor: null,
        }),
      })
    })

    await page.route("**/api/admin/buyer-pipeline-status**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(EMPTY_LIST),
      })
    })

    await page.route("**/api/admin/lead-sources**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(EMPTY_LIST),
      })
    })

    await signInAsAdmin(page)
  })

  // ── Contact entity form shows both selects ───────────────────────────────

  test("contact entity form shows Contact category select and Association select", async ({
    page,
  }) => {
    await page.route("**/api/admin/entities**", async (route) => {
      if (route.request().method() !== "GET") {
        await route.continue()
        return
      }
      const url = route.request().url()
      if (url.match(/\/api\/admin\/entities\/401(\?|$)/)) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(ENTITY_401_CONTACT_DETAIL),
        })
        return
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ...EMPTY_LIST,
          items: [{ ...ENTITY_401_CONTACT_DETAIL }],
          totalCount: 1,
          totalPages: 1,
        }),
      })
    })

    await page.goto("/admin/entities")
    await expect(page.getByTestId("admin-entity-row-edit--entities--401")).toBeVisible({
      timeout: 15_000,
    })
    await page.getByTestId("admin-entity-row-edit--entities--401").click()

    const entitiesDialog = page.getByTestId("admin-entity-crud-dialog--entities")
    await expect(entitiesDialog).toBeVisible({ timeout: 10_000 })
    await expect(entitiesDialog.getByTestId("panda-entities-dialog-form")).toBeVisible()

    // Success factor 1: Contact category shown as a select
    await expect(
      entitiesDialog.getByTestId("panda-entities-form-select--contactCategoryId"),
    ).toBeVisible()

    // Success factor 2: Association shown as a select (not a plain text input)
    await expect(
      entitiesDialog.getByTestId("panda-entities-form-select--association"),
    ).toBeVisible()

    // Success factor 3: No plain-text input for Association in a contact form
    await expect(
      entitiesDialog.getByTestId("panda-entities-form-field--association"),
    ).toHaveCount(0)
  })

  // ── Association select has exactly Buyer and Seller options ───────────────

  test("Association select in contact entity form has Buyer and Seller options", async ({
    page,
  }) => {
    await page.route("**/api/admin/entities**", async (route) => {
      if (route.request().method() !== "GET") {
        await route.continue()
        return
      }
      const url = route.request().url()
      if (url.match(/\/api\/admin\/entities\/401(\?|$)/)) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(ENTITY_401_CONTACT_DETAIL),
        })
        return
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ...EMPTY_LIST,
          items: [{ ...ENTITY_401_CONTACT_DETAIL }],
          totalCount: 1,
          totalPages: 1,
        }),
      })
    })

    await page.goto("/admin/entities")
    await expect(page.getByTestId("admin-entity-row-edit--entities--401")).toBeVisible({
      timeout: 15_000,
    })
    await page.getByTestId("admin-entity-row-edit--entities--401").click()

    const entitiesDialog = page.getByTestId("admin-entity-crud-dialog--entities")
    await expect(entitiesDialog).toBeVisible({ timeout: 10_000 })

    const associationTrigger = entitiesDialog.getByTestId(
      "panda-entities-form-select--association",
    )
    await expect(associationTrigger).toBeVisible()

    // Open the Association dropdown
    await associationTrigger.click()

    // Both choices must be present
    await expect(page.getByRole("option", { name: "Buyer" })).toBeVisible()
    await expect(page.getByRole("option", { name: "Seller" })).toBeVisible()

    // No extra choices beyond None / Buyer / Seller
    await expect(page.getByRole("option")).toHaveCount(3)
  })

})
