import { expect, test } from "@playwright/test"

import { e2eAdminCredentials, refreshPandaE2eEnv, signInAsAdmin } from "./helpers/admin-auth"
import {
  EMPTY_LIST_RESPONSE,
  EMPTY_PROPERTY_ENTITIES_RESPONSE,
  SINGLE_PROPERTY_RESPONSE,
  STATUS_LIST_RESPONSE,
} from "./helpers/admin-properties-mocks"

/**
 * Properties admin — Favorite column removed from table.
 *
 * Success factors:
 * 1. Default table (Favorites ON): isFavorite column header is absent.
 * 2. All filter (isFavorite=all): isFavorite column header is absent.
 * 3. Non-favorites filter (isFavorite=false): isFavorite column header is absent.
 * 4. Edit form: Favorite switch is still present (only table column removed).
 */

test.describe("Properties — Favorite column removed from table", () => {
  test.beforeEach(async ({ page }) => {
    refreshPandaE2eEnv()
    test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.route("**/api/admin/property-status**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(STATUS_LIST_RESPONSE),
      })
    })
    await signInAsAdmin(page)
  })

  // MV step 1: Default table (Favorites ON) — isFavorite column header absent
  test("default table (Favorites ON) has no isFavorite column header", async ({ page }) => {
    await page.route("**/api/admin/properties**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(EMPTY_LIST_RESPONSE),
      })
    })
    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-table-scroll--properties")).toBeVisible()
    await expect(
      page.getByTestId("admin-entity-sort-header--properties--isFavorite"),
    ).toHaveCount(0)
  })

  // MV step 2 (All): isFavorite column header absent when filter = all
  test("All filter view has no isFavorite column header", async ({ page }) => {
    await page.route("**/api/admin/properties**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(EMPTY_LIST_RESPONSE),
      })
    })
    await page.goto("/admin/properties?isFavorite=all")
    await expect(page.getByTestId("admin-entity-table-scroll--properties")).toBeVisible()
    await expect(
      page.getByTestId("admin-entity-sort-header--properties--isFavorite"),
    ).toHaveCount(0)
  })

  // MV step 2 (Non-favorites): isFavorite column header absent when filter = false
  test("Non-favorites filter view has no isFavorite column header", async ({ page }) => {
    await page.route("**/api/admin/properties**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(EMPTY_LIST_RESPONSE),
      })
    })
    await page.goto("/admin/properties?isFavorite=false")
    await expect(page.getByTestId("admin-entity-table-scroll--properties")).toBeVisible()
    await expect(
      page.getByTestId("admin-entity-sort-header--properties--isFavorite"),
    ).toHaveCount(0)
  })

  // MV step 3: Edit form still has Favorite switch (form not affected by table column removal)
  test("edit form still shows Favorite switch", async ({ page }) => {
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
    await page.route("**/api/admin/property-entities**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(EMPTY_PROPERTY_ENTITIES_RESPONSE),
      })
    })
    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible()
    await page.getByTestId("admin-entity-row--properties--1001").click()
    await expect(page.getByTestId("panda-properties-form-switch--isFavorite")).toBeVisible()
  })
})
