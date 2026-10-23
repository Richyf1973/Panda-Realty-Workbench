/**
 * Panda Realty — Properties page: collapsible side filter panel
 *
 * The side filter panel is collapsed by default on every page load.
 * A narrow chevron-strip button at the right border of the card toggles it open/closed.
 * No localStorage persistence — state always resets to collapsed on load.
 *
 * New testid added by implementation:
 *   admin-entity-filter-side-panel-toggle--properties  — the toggle strip button
 *
 * Existing testids used:
 *   admin-entity-relation-filters-side--properties     — the <aside> side panel
 *   admin-entity-list-search--properties               — search input inside panel
 *   admin-entity-list-card--properties                 — the card root
 */

import { expect, test } from "@playwright/test"

import { e2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import {
  EMPTY_LIST_RESPONSE,
  EMPTY_PROPERTY_ENTITIES_RESPONSE,
  STATUS_LIST_RESPONSE,
} from "./helpers/admin-properties-mocks"

const TOGGLE_TESTID = "admin-entity-filter-side-panel-toggle--properties"
const PANEL_TESTID  = "admin-entity-relation-filters-side--properties"
const SEARCH_TESTID = "admin-entity-list-search--properties"

async function setupMocks(page: import("@playwright/test").Page) {
  // Fallback registered first (lowest priority — Playwright matches last-registered first)
  await page.route("**/api/admin/**", async (route) => {
    if (route.request().method() !== "GET") { await route.continue(); return }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ options: [] }),
    })
  })
  // More specific routes registered after (higher priority)
  await page.route("**/api/admin/property-entities**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(EMPTY_PROPERTY_ENTITIES_RESPONSE),
    })
  })
  await page.route("**/api/admin/property-status**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(STATUS_LIST_RESPONSE),
    })
  })
  await page.route("**/api/admin/properties**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(EMPTY_LIST_RESPONSE),
    })
  })
}

test.describe("Panda Realty — Properties: side filter panel collapsible", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")
    await setupMocks(page)
    await signInAsAdmin(page)
  })

  // ── Happy path ──────────────────────────────────────────────────────────────

  test("panel is collapsed by default on initial page load", async ({ page }) => {
    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-list-card--properties")).toBeVisible()

    // Toggle button must be visible
    await expect(page.getByTestId(TOGGLE_TESTID)).toBeVisible()

    // Panel contents (search input) must NOT be visible when collapsed
    await expect(page.getByTestId(SEARCH_TESTID)).not.toBeVisible()
  })

  test("clicking the toggle strip expands the panel", async ({ page }) => {
    await page.goto("/admin/properties")
    await expect(page.getByTestId(TOGGLE_TESTID)).toBeVisible()

    await page.getByTestId(TOGGLE_TESTID).click()

    // Panel and its search input are now visible
    await expect(page.getByTestId(PANEL_TESTID)).toBeVisible()
    await expect(page.getByTestId(SEARCH_TESTID)).toBeVisible()
  })

  test("clicking the toggle strip again collapses the panel", async ({ page }) => {
    await page.goto("/admin/properties")
    const toggle = page.getByTestId(TOGGLE_TESTID)

    // Expand
    await toggle.click()
    await expect(page.getByTestId(SEARCH_TESTID)).toBeVisible()

    // Collapse
    await toggle.click()
    await expect(page.getByTestId(SEARCH_TESTID)).not.toBeVisible()
  })

  // ── Persistence / reset ─────────────────────────────────────────────────────

  test("panel resets to collapsed after a hard reload (no localStorage persistence)", async ({ page }) => {
    await page.goto("/admin/properties")

    // Expand
    await page.getByTestId(TOGGLE_TESTID).click()
    await expect(page.getByTestId(SEARCH_TESTID)).toBeVisible()

    // Reload
    await page.reload()
    await expect(page.getByTestId("admin-entity-list-card--properties")).toBeVisible()

    // Must be collapsed again — no persistence
    await expect(page.getByTestId(SEARCH_TESTID)).not.toBeVisible()
    await expect(page.getByTestId(TOGGLE_TESTID)).toBeVisible()
  })

  test("panel resets to collapsed after navigating away and back", async ({ page }) => {
    await page.goto("/admin/properties")

    // Expand
    await page.getByTestId(TOGGLE_TESTID).click()
    await expect(page.getByTestId(SEARCH_TESTID)).toBeVisible()

    // Navigate away then back
    await page.goto("/admin")
    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-list-card--properties")).toBeVisible()

    // Must be collapsed again
    await expect(page.getByTestId(SEARCH_TESTID)).not.toBeVisible()
  })

  // ── Edge cases ──────────────────────────────────────────────────────────────

  test("toggle button is present and accessible when panel is collapsed", async ({ page }) => {
    await page.goto("/admin/properties")

    const toggle = page.getByTestId(TOGGLE_TESTID)
    await expect(toggle).toBeVisible()
    await expect(toggle).toBeEnabled()
    // Must have accessible label or aria-expanded
    const ariaExpanded = await toggle.getAttribute("aria-expanded")
    expect(ariaExpanded).toBe("false")
  })

  test("toggle button aria-expanded reflects open state", async ({ page }) => {
    await page.goto("/admin/properties")
    const toggle = page.getByTestId(TOGGLE_TESTID)

    await expect(toggle).toHaveAttribute("aria-expanded", "false")

    await toggle.click()
    await expect(toggle).toHaveAttribute("aria-expanded", "true")

    await toggle.click()
    await expect(toggle).toHaveAttribute("aria-expanded", "false")
  })

  test("collapsing the panel does not reset active search value", async ({ page }) => {
    await page.goto("/admin/properties")

    // Expand and type a search value
    await page.getByTestId(TOGGLE_TESTID).click()
    await page.getByTestId(SEARCH_TESTID).fill("test search")

    // Collapse then re-expand
    await page.getByTestId(TOGGLE_TESTID).click()
    await expect(page.getByTestId(SEARCH_TESTID)).not.toBeVisible()
    await page.getByTestId(TOGGLE_TESTID).click()

    // Search value must survive the collapse/expand cycle
    await expect(page.getByTestId(SEARCH_TESTID)).toHaveValue("test search")
  })

  // ── Mobile viewport ─────────────────────────────────────────────────────────

  test("toggle strip is not visible on mobile/compact viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-list-card--properties")).toBeVisible()

    // On mobile, the side panel and its toggle never render
    await expect(page.getByTestId(TOGGLE_TESTID)).not.toBeVisible()
    await expect(page.getByTestId(PANEL_TESTID)).not.toBeVisible()
  })
})
