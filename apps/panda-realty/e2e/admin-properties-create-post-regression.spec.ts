import { expect, test, type Page } from "@playwright/test"

import { e2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import {
  EMPTY_LIST_RESPONSE,
  EMPTY_PROPERTY_ENTITIES_RESPONSE,
  STATUS_LIST_RESPONSE,
} from "./helpers/admin-properties-mocks"

const PROPERTY_TYPES_RESPONSE = {
  options: [{ value: "House", label: "House" }],
}

const CREATED_PROPERTY_RESPONSE = {
  propertyListId: 9999,
  streetAddress: "1 Regression St",
  suburb: "Brisbane",
  state: "QLD",
  postcode: "4000",
  propertyType: "House",
  bed: 0,
  bath: 0,
  car: 0,
  isFavorite: false,
  priceUndisclosed: false,
  excludeFromReport: false,
  updatedAt: "2026-01-01T00:00:00Z",
}

function setupBaseGets(page: Page) {
  return Promise.all([
    page.route("**/api/admin/property-status**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(STATUS_LIST_RESPONSE) })
    }),
    page.route("**/api/admin/property-entities**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_PROPERTY_ENTITIES_RESPONSE) })
    }),
    page.route("**/api/admin/property-types/options**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(PROPERTY_TYPES_RESPONSE) })
    }),
  ])
}

test.describe("Panda Realty — POST /api/admin/properties regression (405 fix)", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")
    await signInAsAdmin(page)
  })

  // Manual verification step 6-7: POST returns 201 (not 405), dialog closes, row appears.
  test("happy path: submitting valid form returns 201 and closes dialog", async ({ page }) => {
    let postStatus: number | null = null

    await page.route("**/api/admin/properties**", async (route) => {
      if (route.request().method() === "POST") {
        // Capture status from real server — do NOT mock, so we prove the route exists.
        const response = await route.fetch()
        postStatus = response.status()
        // Fulfill with the real response so UI can proceed.
        await route.fulfill({ response })
        return
      }
      if (route.request().method() === "GET") {
        const url = route.request().url()
        if (/\/api\/admin\/properties\/\d+$/.test(url)) {
          await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(CREATED_PROPERTY_RESPONSE) })
          return
        }
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ...EMPTY_LIST_RESPONSE, items: [CREATED_PROPERTY_RESPONSE], totalCount: 1 }) })
        return
      }
      await route.continue()
    })
    await setupBaseGets(page)

    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-list-card--properties")).toBeVisible()

    await page.getByTestId("admin-entity-list-add-new--properties").click()
    const dialog = page.getByTestId("admin-entity-crud-dialog--properties")
    await expect(dialog).toBeVisible()

    await page.locator("#pp-streetAddress").fill("1 Regression St")
    await page.locator("#pp-suburb").fill("Brisbane")
    await page.locator("#pp-state").fill("QLD")
    await page.locator("#pp-postcode").fill("4000")
    const propertyTypeInput = page.locator("#pp-propertyType")
    await propertyTypeInput.click()
    await page.getByRole("option", { name: "House" }).first().click()

    await page.getByTestId("admin-entity-create-form--properties").getByRole("button", { name: /^create$/i }).click()

    // After a successful create the framework auto-opens the edit dialog for the
    // new row (listRowClickOpensEditDialog: true), so the dialog heading changes
    // from "Add property" to "Edit property" rather than the dialog disappearing.
    await expect(dialog.getByRole("heading", { name: /edit property/i })).toBeVisible({ timeout: 15_000 })

    // Confirm the POST did not return 405.
    expect(postStatus).not.toBe(405)
    expect(postStatus).toBe(201)
  })

  // Manual verification step 13-14: blank submit shows field validation, NOT a 405 error.
  test("blank submit shows field validation errors — no Method Not Allowed error", async ({ page }) => {
    await page.route("**/api/admin/properties**", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_LIST_RESPONSE) })
        return
      }
      await route.continue()
    })
    await setupBaseGets(page)

    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-list-card--properties")).toBeVisible()

    await page.getByTestId("admin-entity-list-add-new--properties").click()
    const dialog = page.getByTestId("admin-entity-crud-dialog--properties")
    await expect(dialog).toBeVisible()

    await page.getByTestId("admin-entity-create-form--properties").getByRole("button", { name: /create/i }).first().click()

    // Required field errors should appear.
    await expect(page.getByTestId("panda-properties-form-field-error--streetAddress")).toBeVisible()
    await expect(page.getByTestId("panda-properties-form-field-error--suburb")).toBeVisible()

    // Dialog stays open.
    await expect(dialog).toBeVisible()

    // "Method Not Allowed" error must NOT appear.
    await expect(page.getByText(/method not allowed/i)).toHaveCount(0)
  })

  // Manual verification step 8-10: owner fields are included in POST body.
  test("POST body includes owner fields when filled", async ({ page }) => {
    let postBody: Record<string, unknown> | null = null

    await page.route("**/api/admin/properties**", async (route) => {
      if (route.request().method() === "POST") {
        postBody = route.request().postDataJSON() as Record<string, unknown>
        await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify(CREATED_PROPERTY_RESPONSE) })
        return
      }
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_LIST_RESPONSE) })
    })
    await setupBaseGets(page)

    await page.goto("/admin/properties")
    await page.getByTestId("admin-entity-list-add-new--properties").click()
    const dialog = page.getByTestId("admin-entity-crud-dialog--properties")
    await expect(dialog).toBeVisible()

    // Fill owner fields (visible without expanding core section).
    await page.getByTestId("panda-properties-form-field--owner1name").locator("input").fill("Debra Owner")
    await page.getByTestId("panda-properties-form-field--owner1phone").locator("input").fill("0400 000 001")
    await page.getByTestId("panda-properties-form-field--owner1email").locator("input").fill("debra@example.com")

    // Also fill required fields.
    await page.locator("#pp-streetAddress").fill("1 Regression St")
    await page.locator("#pp-suburb").fill("Brisbane")
    await page.locator("#pp-state").fill("QLD")
    await page.locator("#pp-postcode").fill("4000")
    const propertyTypeInput = page.locator("#pp-propertyType")
    await propertyTypeInput.click()
    await page.getByRole("option", { name: "House" }).first().click()

    await page.getByTestId("admin-entity-create-form--properties").getByRole("button", { name: /^create$/i }).click()

    await expect.poll(() => postBody, { timeout: 10_000 }).not.toBeNull()
    expect(postBody!.owner1name).toBe("Debra Owner")
    expect(postBody!.owner1phone).toBe("0400 000 001")
    expect(postBody!.owner1email).toBe("debra@example.com")
  })

  // Manual verification step 11-12: isFavorite is included in POST body when toggled.
  test("POST body includes isFavorite=true when toggled on", async ({ page }) => {
    let postBody: Record<string, unknown> | null = null

    await page.route("**/api/admin/properties**", async (route) => {
      if (route.request().method() === "POST") {
        postBody = route.request().postDataJSON() as Record<string, unknown>
        await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ ...CREATED_PROPERTY_RESPONSE, isFavorite: true }) })
        return
      }
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_LIST_RESPONSE) })
    })
    await setupBaseGets(page)

    await page.goto("/admin/properties")
    await page.getByTestId("admin-entity-list-add-new--properties").click()
    const dialog = page.getByTestId("admin-entity-crud-dialog--properties")
    await expect(dialog).toBeVisible()

    await page.getByTestId("panda-properties-form-switch--isFavorite").click()

    await page.locator("#pp-streetAddress").fill("1 Regression St")
    await page.locator("#pp-suburb").fill("Brisbane")
    await page.locator("#pp-state").fill("QLD")
    await page.locator("#pp-postcode").fill("4000")
    const propertyTypeInput = page.locator("#pp-propertyType")
    await propertyTypeInput.click()
    await page.getByRole("option", { name: "House" }).first().click()

    await page.getByTestId("admin-entity-create-form--properties").getByRole("button", { name: /^create$/i }).click()

    await expect.poll(() => postBody, { timeout: 10_000 }).not.toBeNull()
    expect(postBody!.isFavorite).toBe("true")
  })
})
