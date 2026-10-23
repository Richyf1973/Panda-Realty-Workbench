import { expect, test } from "@playwright/test"

import { e2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import {
  EMPTY_LIST_RESPONSE,
  EMPTY_PROPERTY_ENTITIES_RESPONSE,
  SINGLE_PROPERTY_RESPONSE,
  STATUS_LIST_RESPONSE,
} from "./helpers/admin-properties-mocks"

test.describe("Panda Realty admin — properties list (mocked APIs)", () => {
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

  test("properties admin page loads", async ({ page }) => {
    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-page")).toBeVisible()
    await expect(page.getByTestId("admin-entity-list-card--properties")).toBeVisible()
  })

  test("Owner column appears in the list with owner1name/owner2name/owner3name data", async ({ page }) => {
    await page.route("**/api/admin/properties**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(SINGLE_PROPERTY_RESPONSE),
      })
    })
    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-list-card--properties")).toBeVisible()

    await expect(
      page.getByTestId("admin-entity-col-header--properties--combinedOwner"),
    ).toBeVisible()

    await expect(
      page.getByTestId("admin-entity-table-body--properties"),
    ).toContainText("Smith, John / Jane Smith")
  })

  test("clicking a table row opens the edit dialog", async ({ page }) => {
    await page.route("**/api/admin/properties**", async (route) => {
      const url = route.request().url()
      if (url.includes("/1001")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(SINGLE_PROPERTY_RESPONSE.items[0]),
        })
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(SINGLE_PROPERTY_RESPONSE),
        })
      }
    })
    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible()

    await page.getByTestId("admin-entity-row--properties--1001").click()

    await expect(
      page.getByTestId("admin-entity-crud-dialog--properties"),
    ).toBeVisible()
    await expect(page.getByTestId("panda-properties-form-bottom-tabs")).toHaveCount(0)
  })
})
