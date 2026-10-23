import type { Page } from "@playwright/test"
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

/** General contact entity (categoryId=4) with a phone number stored in `contact` column */
const CONTACT_ENTITY_DETAIL = {
  entityId: 501,
  entityName: "E2E Contact Corp",
  entityCategoryId: 4,
  emailAddress: "corp@example.com",
  contact: "0411 222 333",
  phoneNumber: null,
  mobile: null,
  website: null,
  address: null,
  esuburb: null,
  estate: null,
  epostcode: null,
  notes: null,
  contactCategoryId: null,
  association: null,
}

/** Buyer entity (categoryId=1) with a phone number stored in `contact` column */
const BUYER_ENTITY_DETAIL = {
  entityId: 502,
  entityName: "E2E Buyer Person",
  entityCategoryId: 1,
  emailAddress: "buyer@example.com",
  contact: "0422 333 444",
  phoneNumber: null,
  mobile: null,
  website: null,
  address: null,
  esuburb: null,
  estate: null,
  epostcode: null,
  notes: null,
  contactCategoryId: null,
  association: null,
}

// ---------------------------------------------------------------------------
// Shared beforeEach helpers
// ---------------------------------------------------------------------------

async function mockCommonApis(page: Page) {
  await page.route("**/api/admin/property-status**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        items: [{ propertyStatusId: 1, propertyStatus: "Active", propertyStatusCode: "ACTIVE" }],
        totalCount: 1, limit: 100, totalPages: 1,
        hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null,
      }),
    })
  })
  await page.route("**/api/admin/property-entities**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_LIST) })
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
        totalCount: 3, limit: 100, totalPages: 1,
        hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null,
      }),
    })
  })
  await page.route("**/api/admin/contact-categories**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_LIST) })
  })
  await page.route("**/api/admin/buyer-pipeline-status**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_LIST) })
  })
  await page.route("**/api/admin/lead-sources**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_LIST) })
  })
  await page.route("**/api/admin/property-lists**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_LIST) })
  })
  await page.route("**/api/admin/property-entity-notes**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_LIST) })
  })
  await page.route("**/api/admin/buyer-offers**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_LIST) })
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe("Panda Realty — entity Contact number field uses `contact` column key", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")
    await mockCommonApis(page)
    await signInAsAdmin(page)
  })

  // ── Test 1: General entity — form prefills from `contact` column ────────

  test("general entity edit dialog prefills Contact number from `contact` API key", async ({
    page,
  }) => {
    await page.route("**/api/admin/entities**", async (route) => {
      if (route.request().method() !== "GET") { await route.continue(); return }
      const url = route.request().url()
      if (url.match(/\/api\/admin\/entities\/501(\?|$)/)) {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(CONTACT_ENTITY_DETAIL) })
        return
      }
      await route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify({ ...EMPTY_LIST, items: [CONTACT_ENTITY_DETAIL], totalCount: 1, totalPages: 1 }),
      })
    })

    await page.goto("/admin/entities")
    await expect(page.getByTestId("admin-entity-row-edit--entities--501")).toBeVisible({ timeout: 15_000 })
    await page.getByTestId("admin-entity-row-edit--entities--501").click()

    const dialog = page.getByTestId("admin-entity-crud-dialog--entities")
    await expect(dialog).toBeVisible({ timeout: 10_000 })

    // Field must exist with the `contact` key name (not `phoneNumber`)
    const contactField = dialog.getByTestId("panda-entities-form-field--contact")
    await expect(contactField).toBeVisible()

    // Field must show the value from the `contact` key in the API response
    await expect(contactField).toHaveValue("0411 222 333")
  })

  // ── Test 2: General entity — PATCH body sends `contact` key ────────────

  test("general entity edit dialog PATCH sends `contact` key (not `phoneNumber`)", async ({
    page,
  }) => {
    let patchBody: Record<string, unknown> | null = null

    await page.route("**/api/admin/entities**", async (route) => {
      const method = route.request().method()
      const url = route.request().url()

      if (method === "PATCH" && url.match(/\/api\/admin\/entities\/501(\?|$)/)) {
        patchBody = JSON.parse(route.request().postData() ?? "{}")
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(CONTACT_ENTITY_DETAIL) })
        return
      }
      if (method !== "GET") { await route.continue(); return }
      if (url.match(/\/api\/admin\/entities\/501(\?|$)/)) {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(CONTACT_ENTITY_DETAIL) })
        return
      }
      await route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify({ ...EMPTY_LIST, items: [CONTACT_ENTITY_DETAIL], totalCount: 1, totalPages: 1 }),
      })
    })

    await page.goto("/admin/entities")
    await expect(page.getByTestId("admin-entity-row-edit--entities--501")).toBeVisible({ timeout: 15_000 })
    await page.getByTestId("admin-entity-row-edit--entities--501").click()

    const dialog = page.getByTestId("admin-entity-crud-dialog--entities")
    await expect(dialog).toBeVisible({ timeout: 10_000 })

    const contactField = dialog.getByTestId("panda-entities-form-field--contact")
    await expect(contactField).toBeVisible()
    await contactField.fill("0499 000 111")

    await dialog.getByTestId("admin-entity-edit-save-and-close--entities").click()
    await expect(dialog).not.toBeVisible({ timeout: 10_000 })

    // The PATCH body must contain `contact` — not `phoneNumber`
    expect(patchBody).not.toBeNull()
    expect(patchBody!["contact"]).toBe("0499 000 111")
    expect(patchBody!).not.toHaveProperty("phoneNumber")
  })

  // ── Test 3: Buyer entity — form prefills from `contact` column ──────────

  test("buyer entity edit dialog prefills Contact number from `contact` API key", async ({
    page,
  }) => {
    await page.route("**/api/admin/entities**", async (route) => {
      if (route.request().method() !== "GET") { await route.continue(); return }
      const url = route.request().url()
      if (url.match(/\/api\/admin\/entities\/502(\?|$)/)) {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(BUYER_ENTITY_DETAIL) })
        return
      }
      await route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify({ ...EMPTY_LIST, items: [BUYER_ENTITY_DETAIL], totalCount: 1, totalPages: 1 }),
      })
    })

    await page.goto("/admin/entities")
    await expect(page.getByTestId("admin-entity-row-edit--entities--502")).toBeVisible({ timeout: 15_000 })
    await page.getByTestId("admin-entity-row-edit--entities--502").click()

    const dialog = page.getByTestId("admin-entity-crud-dialog--entities")
    await expect(dialog).toBeVisible({ timeout: 10_000 })

    // Buyer form surface also must use the `contact` key
    const contactField = dialog.getByTestId("panda-entities-form-field--contact")
    await expect(contactField).toBeVisible()
    await expect(contactField).toHaveValue("0422 333 444")
  })

  // ── Test 4: Buyer entity — PATCH body sends `contact` key ───────────────

  test("buyer entity edit dialog PATCH sends `contact` key (not `phoneNumber`)", async ({
    page,
  }) => {
    let patchBody: Record<string, unknown> | null = null

    await page.route("**/api/admin/entities**", async (route) => {
      const method = route.request().method()
      const url = route.request().url()

      if (method === "PATCH" && url.match(/\/api\/admin\/entities\/502(\?|$)/)) {
        patchBody = JSON.parse(route.request().postData() ?? "{}")
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(BUYER_ENTITY_DETAIL) })
        return
      }
      if (method !== "GET") { await route.continue(); return }
      if (url.match(/\/api\/admin\/entities\/502(\?|$)/)) {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(BUYER_ENTITY_DETAIL) })
        return
      }
      await route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify({ ...EMPTY_LIST, items: [BUYER_ENTITY_DETAIL], totalCount: 1, totalPages: 1 }),
      })
    })

    await page.goto("/admin/entities")
    await expect(page.getByTestId("admin-entity-row-edit--entities--502")).toBeVisible({ timeout: 15_000 })
    await page.getByTestId("admin-entity-row-edit--entities--502").click()

    const dialog = page.getByTestId("admin-entity-crud-dialog--entities")
    await expect(dialog).toBeVisible({ timeout: 10_000 })

    const contactField = dialog.getByTestId("panda-entities-form-field--contact")
    await expect(contactField).toBeVisible()
    await contactField.fill("0488 999 777")

    await dialog.getByTestId("admin-entity-edit-save-and-close--entities").click()
    await expect(dialog).not.toBeVisible({ timeout: 10_000 })

    expect(patchBody).not.toBeNull()
    expect(patchBody!["contact"]).toBe("0488 999 777")
    expect(patchBody!).not.toHaveProperty("phoneNumber")
  })
})
