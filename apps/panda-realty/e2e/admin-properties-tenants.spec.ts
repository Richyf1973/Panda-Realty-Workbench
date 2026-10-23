import { expect, test } from "@playwright/test"

import { e2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import {
  EMPTY_LIST_RESPONSE,
  EMPTY_PROPERTY_ENTITIES_RESPONSE,
  PROPERTY_EDIT_WITH_TENANT,
  SINGLE_PROPERTY_RESPONSE,
  STATUS_LIST_RESPONSE,
  TENANT_PANEL_ITEMS_RESPONSE_1001,
} from "./helpers/admin-properties-mocks"

test.describe("Panda Realty admin — properties tenants panel (mocked APIs)", () => {
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

  test("tenant panel edit dialog opens without buyer workspace tabs", async ({
    page,
  }) => {
    await page.route("**/api/admin/properties**", async (route) => {
      const url = route.request().url()
      if (url.match(/\/api\/admin\/properties\/1001\/tenants(\?|$)/)) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(TENANT_PANEL_ITEMS_RESPONSE_1001),
        })
        return
      }
      if (url.match(/\/api\/admin\/properties\/1001(\?|$)/)) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(PROPERTY_EDIT_WITH_TENANT),
        })
        return
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ...SINGLE_PROPERTY_RESPONSE,
          items: [{ ...PROPERTY_EDIT_WITH_TENANT }],
        }),
      })
    })

    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible()
    await page.getByTestId("admin-entity-row--properties--1001").click()
    await expect(
      page.getByTestId("admin-entity-crud-dialog--properties"),
    ).toBeVisible()

    await page.getByTestId("panda-properties-form-tab-trigger--tenants").click()
    await expect(page.getByTestId("panda-properties-form-tab--tenants")).toBeVisible()
    await expect(page.getByTestId("property-tenants-add-new")).toBeEnabled({ timeout: 10_000 })

    await page.getByTestId("property-tenant-edit--502").click()

    // Tenants panel opens a simple card dialog — no buyer workspace tabs
    await expect(page.getByTestId("property-tenant-dialog")).toBeVisible()
    await expect(page.getByTestId("panda-property-entity-buyer-dialog-form")).toHaveCount(0)
    await expect(page.getByRole("tab", { name: /buyer members/i })).toHaveCount(0)
  })
})
