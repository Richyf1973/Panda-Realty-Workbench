import { expect, test } from "@playwright/test"

import { e2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import {
  EMPTY_LIST_RESPONSE,
  EMPTY_PROPERTY_ENTITIES_RESPONSE,
  STATUS_LIST_RESPONSE,
} from "./helpers/admin-properties-mocks"

test.describe("Panda Realty admin — properties create dialog (mocked APIs)", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")
    await page.route("**/api/admin/properties**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(EMPTY_LIST_RESPONSE),
      })
    })
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
        body: JSON.stringify(EMPTY_PROPERTY_ENTITIES_RESPONSE),
      })
    })
    await signInAsAdmin(page)
  })

  test("create dialog renders the custom tabbed form", async ({ page }) => {
    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-list-card--properties")).toBeVisible()

    await page.getByTestId("admin-entity-list-add-new--properties").click()

    const dialog = page.getByTestId("admin-entity-crud-dialog--properties")
    await expect(dialog).toBeVisible()

    const form = page.getByTestId("panda-properties-dialog-form")
    await expect(form).toBeVisible()

    // Bottom tabs only render when Favorite is on
    await expect(page.getByTestId("panda-properties-form-bottom-tabs")).toHaveCount(0)

    await page.getByTestId("panda-properties-form-switch--isFavorite").click()

    // All five tab triggers should be visible once favorited
    await expect(
      page.getByTestId("panda-properties-form-tab-trigger--sales"),
    ).toBeVisible()
    await expect(
      page.getByTestId("panda-properties-form-tab-trigger--buyers"),
    ).toBeVisible()
    await expect(
      page.getByTestId("panda-properties-form-tab-trigger--contacts"),
    ).toBeVisible()
    await expect(
      page.getByTestId("panda-properties-form-tab-trigger--tenants"),
    ).toBeVisible()
    await expect(
      page.getByTestId("panda-properties-form-tab-trigger--files"),
    ).toBeVisible()

    await expect(
      page.getByTestId("panda-properties-form-section--core"),
    ).toBeVisible()
    await expect(
      page.getByTestId("panda-properties-form-field--streetAddress"),
    ).toBeVisible()
    await expect(
      page.getByTestId("panda-properties-form-field--suburb"),
    ).toBeVisible()
    await expect(
      page.getByTestId("panda-properties-form-field--propertyStatusId"),
    ).toBeVisible()
  })

  test("required fields show validation errors when submitting empty", async ({
    page,
  }) => {
    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-list-card--properties")).toBeVisible()

    await page.getByTestId("admin-entity-list-add-new--properties").click()
    await expect(page.getByTestId("panda-properties-dialog-form")).toBeVisible()

    await page
      .getByTestId("admin-entity-create-form--properties")
      .getByRole("button", { name: /create/i })
      .first()
      .click()

    await expect(
      page.getByTestId("panda-properties-form-field-error--streetAddress"),
    ).toBeVisible()
    await expect(
      page.getByTestId("panda-properties-form-field-error--suburb"),
    ).toBeVisible()
  })

  test("create dialog: POST body uses bed bath car 0 when left empty", async ({ page }) => {
    let posted: Record<string, unknown> | null = null
    await page.route("**/api/admin/property-types/options**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ options: [{ value: "House", label: "House" }] }),
      })
    })
    await page.route("**/api/admin/properties**", async (route) => {
      if (route.request().method() === "POST") {
        posted = route.request().postDataJSON() as Record<string, unknown>
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            propertyListId: 9002,
            streetAddress: "1 Test Rd",
            suburb: "Suburbia",
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
          }),
        })
        return
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(EMPTY_LIST_RESPONSE),
      })
    })

    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-list-card--properties")).toBeVisible()

    await page.getByTestId("admin-entity-list-add-new--properties").click()
    await expect(page.getByTestId("panda-properties-dialog-form")).toBeVisible()

    const street = page.locator("#pp-streetAddress")
    await expect(street).toBeVisible({ timeout: 15_000 })
    await street.fill("1 Test Rd")
    await page.locator("#pp-suburb").fill("Suburbia")
    await page.locator("#pp-state").fill("QLD")
    await page.locator("#pp-postcode").fill("4000")

    // Open the propertyType combobox and select "House" from the option list.
    const propertyTypeInput = page.locator("#pp-propertyType")
    await propertyTypeInput.click()
    await page.getByRole("option", { name: "House" }).first().click()

    await page
      .getByTestId("admin-entity-create-form--properties")
      .getByRole("button", { name: /^create$/i })
      .click()

    await expect.poll(() => posted).not.toBeNull()
    expect(posted!.bed).toBe("0")
    expect(posted!.bath).toBe("0")
    expect(posted!.car).toBe("0")
  })

  test("switching to Sales tab shows sale fields", async ({ page }) => {
    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-list-card--properties")).toBeVisible()

    await page.getByTestId("admin-entity-list-add-new--properties").click()
    await expect(page.getByTestId("panda-properties-dialog-form")).toBeVisible()

    await page.getByTestId("panda-properties-form-switch--isFavorite").click()
    await page.getByTestId("panda-properties-form-tab-trigger--sales").click()
    await expect(page.getByTestId("panda-properties-form-tab--sales")).toBeVisible()
    await expect(
      page.getByTestId("panda-properties-sales-field--contractPrice"),
    ).toBeVisible()
  })

  test("owner fields section is visible in the dialog", async ({ page }) => {
    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-list-card--properties")).toBeVisible()

    await page.getByTestId("admin-entity-list-add-new--properties").click()
    await expect(page.getByTestId("panda-properties-dialog-form")).toBeVisible()

    await expect(
      page.getByTestId("panda-properties-form-section--owners"),
    ).toBeVisible()
    await expect(
      page.getByTestId("panda-properties-form-owners-section-title"),
    ).toHaveText("Owner information")
    await expect(
      page.getByTestId("panda-properties-form-owners-column-headers"),
    ).toBeVisible()
    await expect(
      page.getByTestId("panda-properties-form-field--owner1name"),
    ).toBeVisible()
    await expect(
      page.getByTestId("panda-properties-form-field--owner1phone"),
    ).toBeVisible()
    await expect(
      page.getByTestId("panda-properties-form-field--owner1email"),
    ).toBeVisible()
  })

  test("switching to Buyers tab in create mode shows save-first prompt", async ({ page }) => {
    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-list-card--properties")).toBeVisible()

    await page.getByTestId("admin-entity-list-add-new--properties").click()
    await expect(page.getByTestId("panda-properties-dialog-form")).toBeVisible()

    await page.getByTestId("panda-properties-form-switch--isFavorite").click()
    await page.getByTestId("panda-properties-form-tab-trigger--buyers").click()
    await expect(page.getByTestId("panda-properties-form-tab--buyers")).toBeVisible()

    await expect(
      page.getByTestId("panda-properties-form-tab--buyers"),
    ).toContainText("Save the property first to manage contacts.")
  })
})
