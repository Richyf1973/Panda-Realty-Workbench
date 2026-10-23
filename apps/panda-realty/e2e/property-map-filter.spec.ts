import { expect, test } from "@playwright/test"

import { e2eAdminCredentials, refreshPandaE2eEnv, signInAsAdmin } from "./helpers/admin-auth"
import {
  MAP_FILTER_EMPTY_LIST_RESPONSE as EMPTY_LIST_RESPONSE,
  MAP_FILTER_STATUS_LIST_RESPONSE as STATUS_LIST_RESPONSE,
} from "./helpers/map-filter-mocks"

/**
 * Map filter — properties admin toolbar (Leaflet dialog + `streetFilter` URL).
 *
 * Success factors:
 * 1. "Map Filter" opens a near-fullscreen dialog titled "Filter properties by map area" with a Leaflet map.
 * 2. "Cancel" closes the dialog without adding `streetFilter`.
 * 3. "Clear" removes `streetFilter` when the filter is active.
 */

function requirePandaAdminAuthForMockedList(): void {
  refreshPandaE2eEnv()
  if (!e2eAdminCredentials) {
    throw new Error(
      "Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD (see apps/panda-realty/.env.example).",
    )
  }
}

test.describe("Properties — map filter dialog", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaAdminAuthForMockedList()
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
    await signInAsAdmin(page)
  })

  test("opens near-fullscreen dialog with leaflet map surface", async ({ page }) => {
    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-list-card--properties")).toBeVisible()

    await page.getByTestId("property-map-filter-trigger").click()

    const dialog = page.getByTestId("property-map-filter-dialog")
    await expect(dialog).toBeVisible()
    await expect(
      page.getByRole("dialog", { name: "Filter properties by map area" }),
    ).toBeVisible()

    const vp = page.viewportSize()
    expect(vp).not.toBeNull()
    const box = await dialog.boundingBox()
    expect(box).not.toBeNull()
    expect(box!.height).toBeGreaterThan((vp!.height - 4) * 0.85)
    expect(box!.width).toBeGreaterThan((vp!.width - 4) * 0.85)

    await expect(
      page.getByTestId("property-map-filter-map-wrap").locator(".leaflet-container"),
    ).toBeVisible({ timeout: 15_000 })
  })

  test("Cancel closes the dialog without applying streetFilter", async ({ page }) => {
    await page.goto("/admin/properties")
    await page.getByTestId("property-map-filter-trigger").click()
    await expect(page.getByTestId("property-map-filter-dialog")).toBeVisible()

    await page.getByTestId("property-map-filter-cancel").click()
    await expect(page.getByTestId("property-map-filter-dialog")).not.toBeVisible()

    expect(new URL(page.url()).searchParams.has("streetFilter")).toBe(false)
  })

  test("Clear removes streetFilter from the URL", async ({ page }) => {
    const seed = encodeURIComponent("E2E Map Street~QLD")
    await page.goto(`/admin/properties?streetFilter=${seed}`)
    await expect(page.getByTestId("property-map-filter-trigger")).toContainText("ON")

    await page.getByTestId("property-map-filter-clear").click()
    await expect.poll(() => new URL(page.url()).searchParams.has("streetFilter")).toBe(false)
  })
})
