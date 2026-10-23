import { expect, test } from "@playwright/test"

import { e2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import {
  EMPTY_LIST_RESPONSE,
  EMPTY_PROPERTY_ENTITIES_RESPONSE,
  PROPERTY_EDIT_WITH_BUYER,
  SINGLE_PROPERTY_RESPONSE,
  STATUS_LIST_RESPONSE,
} from "./helpers/admin-properties-mocks"

test.describe("Panda Realty admin — properties edit dialog (mocked APIs)", () => {
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

  test("edit property dialog footer omits Add New and Delete", async ({ page }) => {
    await page.route("**/api/admin/properties**", async (route) => {
      const url = route.request().url()
      if (url.match(/\/api\/admin\/properties\/1001(\?|$)/)) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(PROPERTY_EDIT_WITH_BUYER),
        })
        return
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(SINGLE_PROPERTY_RESPONSE),
      })
    })

    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible()
    await page.getByTestId("admin-entity-row--properties--1001").click()

    const dialog = page.getByTestId("admin-entity-crud-dialog--properties")
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole("button", { name: /^add new$/i })).toHaveCount(0)
    await expect(dialog.getByTestId("admin-entity-crud-dialog-delete--properties")).toHaveCount(0)
    await expect(dialog.getByTestId("admin-entity-edit-submit--properties")).toBeVisible()
  })

  test("Save changes keeps dialog open; Save & Close closes it", async ({ page }) => {
    const patchedRow = { ...SINGLE_PROPERTY_RESPONSE.items[0], streetAddress: "99 Updated St" }
    await page.route("**/api/admin/properties**", async (route) => {
      const req = route.request()
      const url = req.url()
      if (req.method() === "PATCH") {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(patchedRow) })
        return
      }
      if (url.match(/\/api\/admin\/properties\/\d+(\?|$)/)) {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SINGLE_PROPERTY_RESPONSE.items[0]) })
        return
      }
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SINGLE_PROPERTY_RESPONSE) })
    })
    await page.route("**/api/admin/property-entities**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_PROPERTY_ENTITIES_RESPONSE) })
    })

    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible()
    await page.getByTestId("admin-entity-row--properties--1001").click()

    const dialog = page.getByTestId("admin-entity-crud-dialog--properties")
    await expect(dialog).toBeVisible()

    // Save changes — dialog must stay open
    await dialog.getByTestId("admin-entity-edit-submit--properties").click()
    await expect(dialog).toBeVisible()

    // Save & Close — dialog must close
    await dialog.getByTestId("admin-entity-edit-save-and-close--properties").click()
    await expect(dialog).toHaveCount(0)
  })

  test("server field error appears inline on commissionRate field", async ({ page }) => {
    await page.route("**/api/admin/properties**", async (route) => {
      const req = route.request()
      const url = req.url()
      const method = req.method()

      if (method === "PATCH") {
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({ error: "Commission rate must be numeric" }),
        })
        return
      }
      if (url.match(/\/api\/admin\/properties\/\d+$/)) {
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

    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible()

    await page.getByTestId("admin-entity-row--properties--1001").click()
    const dialog = page.getByTestId("admin-entity-crud-dialog--properties")
    await expect(dialog).toBeVisible()
    await expect(page.getByTestId("panda-properties-dialog-form")).toBeVisible()

    await page.getByTestId("panda-properties-form-switch--isFavorite").click()
    await page.getByTestId("panda-properties-form-tab-trigger--sales").click()
    // Non-empty invalid value so normalizeValuesBeforeSubmit does not replace it with "0"
    await page.locator("#pp-commissionRate").fill("not-a-number")

    await dialog.getByTestId("admin-entity-edit-submit--properties").click()

    // commissionRate lives on the Sales tab
    await expect(
      page.getByTestId("panda-properties-form-field-error--commissionRate"),
    ).toBeVisible()
  })
})
