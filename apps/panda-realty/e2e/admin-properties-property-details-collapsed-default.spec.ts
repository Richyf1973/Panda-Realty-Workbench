import { expect, test } from "@playwright/test"

import { e2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import {
  EMPTY_LIST_RESPONSE,
  EMPTY_PROPERTY_ENTITIES_RESPONSE,
  SINGLE_PROPERTY_RESPONSE,
  STATUS_LIST_RESPONSE,
} from "./helpers/admin-properties-mocks"

test.describe("Panda Realty — Property Details section collapsed by default", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")
    await page.route("**/api/admin/properties**", async (route) => {
      const url = route.request().url()
      if (url.match(/\/api\/admin\/properties\/1001(\?|$)/)) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(SINGLE_PROPERTY_RESPONSE.items[0]),
        })
        return
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(SINGLE_PROPERTY_RESPONSE),
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

  test("Property Details section is collapsed on edit dialog open", async ({ page }) => {
    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible()
    await page.getByTestId("admin-entity-row--properties--1001").click()

    const dialog = page.getByTestId("admin-entity-crud-dialog--properties")
    await expect(dialog).toBeVisible()

    const coreSection = page.getByTestId("panda-properties-form-section--core")
    await expect(coreSection).toBeVisible()
    await expect(coreSection).toHaveAttribute("data-state", "closed")

    // Fields inside the collapsed section must not be visible
    await expect(page.locator("#pp-streetAddress")).not.toBeVisible()
  })

  test("Property Details section is collapsed on create dialog open", async ({ page }) => {
    await page.route("**/api/admin/properties**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(EMPTY_LIST_RESPONSE),
      })
    })

    await page.goto("/admin/properties")
    await page.getByTestId("admin-entity-list-add-new--properties").click()

    await expect(page.getByTestId("panda-properties-dialog-form")).toBeVisible()

    const coreSection = page.getByTestId("panda-properties-form-section--core")
    await expect(coreSection).toBeVisible()
    await expect(coreSection).toHaveAttribute("data-state", "closed")
    await expect(page.locator("#pp-streetAddress")).not.toBeVisible()
  })

  test("clicking the section trigger expands and re-collapses it", async ({ page }) => {
    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible()
    await page.getByTestId("admin-entity-row--properties--1001").click()

    const coreSection = page.getByTestId("panda-properties-form-section--core")
    await expect(coreSection).toHaveAttribute("data-state", "closed")

    // Expand
    await page.getByTestId("panda-properties-form-section--core-trigger").click()
    await expect(coreSection).toHaveAttribute("data-state", "open")
    await expect(page.locator("#pp-streetAddress")).toBeVisible()

    // Collapse again
    await page.getByTestId("panda-properties-form-section--core-trigger").click()
    await expect(coreSection).toHaveAttribute("data-state", "closed")
    await expect(page.locator("#pp-streetAddress")).not.toBeVisible()
  })

  test("reopening the dialog resets the section to collapsed", async ({ page }) => {
    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible()
    await page.getByTestId("admin-entity-row--properties--1001").click()

    const dialog = page.getByTestId("admin-entity-crud-dialog--properties")
    await expect(dialog).toBeVisible()

    // Expand the section
    await page.getByTestId("panda-properties-form-section--core-trigger").click()
    await expect(page.getByTestId("panda-properties-form-section--core")).toHaveAttribute("data-state", "open")

    // Close the dialog
    await dialog.getByRole("button", { name: /cancel/i }).click()
    await expect(dialog).toHaveCount(0)

    // Reopen
    await page.getByTestId("admin-entity-row--properties--1001").click()
    await expect(dialog).toBeVisible()

    // Section must be collapsed again on fresh open
    await expect(page.getByTestId("panda-properties-form-section--core")).toHaveAttribute("data-state", "closed")
  })
})
