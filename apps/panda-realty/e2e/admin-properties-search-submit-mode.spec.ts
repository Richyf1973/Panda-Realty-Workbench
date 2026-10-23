/**
 * TDD spec: Properties side-panel search input — submit mode typing performance.
 *
 * Manual verification: specs/panda-realty-properties-search-input-typing-delay.md
 *
 * Root cause: the search input was a fully controlled component whose state lived in
 * `useAdminEntityAdmin`. Every keystroke called `setListSearchInput`, triggering a full
 * re-render of the AdminEntityAdmin tree and causing visible input lag.
 *
 * Fix: the side-panel input (submit mode) now owns local state; the parent is only updated
 * on form submit or explicit clear. The desktop toolbar input (debounce mode) is also
 * decoupled via local state + in-component debounce.
 *
 * These tests verify the behavioural contract of the fix:
 * - Typing characters does NOT fire an API request (submit mode).
 * - Submitting fires exactly one API request with the correct search term.
 * - Clearing to empty immediately removes the filter.
 * - URL params pre-fill the input on load.
 * - Debounce mode (desktop toolbar, e.g. Agents) fires only after the debounce delay.
 */

import { expect, test } from "@playwright/test"

import { e2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import {
  EMPTY_LIST_RESPONSE,
  EMPTY_PROPERTY_ENTITIES_RESPONSE,
  STATUS_LIST_RESPONSE,
} from "./helpers/admin-properties-mocks"

const TOGGLE = "admin-entity-filter-side-panel-toggle--properties"
const SEARCH = "admin-entity-list-search--properties"

async function setupPropertyMocks(page: import("@playwright/test").Page) {
  // Wildcard fallback registered first (lowest Playwright priority)
  await page.route("**/api/admin/**", async (route) => {
    if (route.request().method() !== "GET") { await route.continue(); return }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ options: [] }) })
  })
  await page.route("**/api/admin/property-entities**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_PROPERTY_ENTITIES_RESPONSE) })
  })
  await page.route("**/api/admin/property-status**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(STATUS_LIST_RESPONSE) })
  })
  await page.route("**/api/admin/properties**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_LIST_RESPONSE) })
  })
}

async function expandSidePanel(page: import("@playwright/test").Page) {
  await page.getByTestId(TOGGLE).click()
  await expect(page.getByTestId(SEARCH)).toBeVisible()
}

// ── Properties — side-panel search (submit mode) ──────────────────────────────

test.describe("Properties — side-panel search input (submit mode)", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")
    await setupPropertyMocks(page)
    await signInAsAdmin(page)
  })

  test("search input is visible in the side filter panel after expanding", async ({ page }) => {
    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-list-card--properties")).toBeVisible()
    await expandSidePanel(page)
    await expect(page.getByTestId("admin-entity-relation-filters-side--properties")).toBeVisible()
    await expect(page.getByTestId(SEARCH)).toBeVisible()
  })

  test("typing characters appear in the input immediately", async ({ page }) => {
    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-list-card--properties")).toBeVisible()
    await expandSidePanel(page)
    const input = page.getByTestId(SEARCH)
    await input.click()
    await input.pressSequentially("test")
    await expect(input).toHaveValue("test")
  })

  test("typing does NOT fire an API request on each keystroke (submit mode)", async ({ page }) => {
    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-list-card--properties")).toBeVisible()
    await expandSidePanel(page)

    let searchCallCount = 0
    page.on("request", (req) => {
      if (req.url().includes("/api/admin/properties") && new URL(req.url()).searchParams.has("search")) {
        searchCallCount++
      }
    })

    const input = page.getByTestId(SEARCH)
    await input.click()
    await input.pressSequentially("test", { delay: 30 })
    await page.waitForTimeout(200)

    expect(searchCallCount).toBe(0)
  })

  test("pressing Enter submits the search and fires an API request with the term", async ({ page }) => {
    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-list-card--properties")).toBeVisible()
    await expandSidePanel(page)

    const input = page.getByTestId(SEARCH)
    await input.fill("smith")

    const searchRequest = page.waitForRequest(
      (req) => req.url().includes("/api/admin/properties") && new URL(req.url()).searchParams.get("search") === "smith",
      { timeout: 5_000 },
    )
    await input.press("Enter")
    await searchRequest
  })

  test("clicking the submit button fires an API request with the typed term", async ({ page }) => {
    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-list-card--properties")).toBeVisible()
    await expandSidePanel(page)

    const input = page.getByTestId(SEARCH)
    await input.fill("jones")

    const searchRequest = page.waitForRequest(
      (req) => req.url().includes("/api/admin/properties") && new URL(req.url()).searchParams.get("search") === "jones",
      { timeout: 5_000 },
    )
    await page.getByRole("button", { name: "Submit search" }).click()
    await searchRequest
  })

  test("clearing the input to empty immediately removes the search filter", async ({ page }) => {
    await page.goto("/admin/properties?search=smith")
    await expect(page.getByTestId("admin-entity-list-card--properties")).toBeVisible()
    await expandSidePanel(page)

    const input = page.getByTestId(SEARCH)
    await expect(input).toHaveValue("smith")

    const clearRequest = page.waitForRequest(
      (req) => req.url().includes("/api/admin/properties") && !new URL(req.url()).searchParams.has("search"),
      { timeout: 5_000 },
    )
    await input.clear()
    await clearRequest
  })

  test("URL updates to include search param after submitting", async ({ page }) => {
    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-list-card--properties")).toBeVisible()
    await expandSidePanel(page)

    const input = page.getByTestId(SEARCH)
    await input.fill("taylor")
    await input.press("Enter")
    await expect(page).toHaveURL(/search=taylor/, { timeout: 5_000 })
  })

  test("URL search param pre-fills the input on page load", async ({ page }) => {
    await page.goto("/admin/properties?search=johnson")
    await expect(page.getByTestId("admin-entity-list-card--properties")).toBeVisible()
    await expandSidePanel(page)
    await expect(page.getByTestId(SEARCH)).toHaveValue("johnson")
  })

  test("Clear filters button resets the search input to empty", async ({ page }) => {
    await page.goto("/admin/properties?search=smith")
    await expect(page.getByTestId("admin-entity-list-card--properties")).toBeVisible()
    await expandSidePanel(page)

    await expect(page.getByTestId(SEARCH)).toHaveValue("smith")
    await page.getByTestId("admin-entity-list-clear-filters--properties").click()

    await expect(page.getByTestId(SEARCH)).toHaveValue("")
    await expect(page).not.toHaveURL(/search=/, { timeout: 5_000 })
  })

  test("submitting a search retains the term in the input", async ({ page }) => {
    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-list-card--properties")).toBeVisible()
    await expandSidePanel(page)

    const input = page.getByTestId(SEARCH)
    await input.fill("zzz-no-match-zzz")
    await input.press("Enter")
    await expect(input).toHaveValue("zzz-no-match-zzz")
  })
})

// ── Desktop toolbar search — debounce mode (Agents entity) ───────────────────

test.describe("Desktop toolbar search — debounce mode (Agents entity)", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")
    await page.route("**/api/admin/**", async (route) => {
      if (route.request().method() !== "GET") { await route.continue(); return }
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ options: [] }) })
    })
    await page.route("**/api/admin/agents**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_LIST_RESPONSE) })
    })
    await signInAsAdmin(page)
  })

  test("search input is visible in the desktop toolbar", async ({ page }) => {
    await page.goto("/admin/agents")
    await expect(page.getByTestId("admin-entity-list-card--agents")).toBeVisible()
    await expect(page.getByTestId("admin-entity-list-search--agents")).toBeVisible()
  })

  test("typing characters appear in the input immediately", async ({ page }) => {
    await page.goto("/admin/agents")
    await expect(page.getByTestId("admin-entity-list-card--agents")).toBeVisible()
    const input = page.getByTestId("admin-entity-list-search--agents")
    await input.click()
    await input.pressSequentially("smith")
    await expect(input).toHaveValue("smith")
  })

  test("typing does NOT fire an API request immediately on each keystroke", async ({ page }) => {
    await page.goto("/admin/agents")
    await expect(page.getByTestId("admin-entity-list-card--agents")).toBeVisible()

    let searchCallFired = false
    page.on("request", (req) => {
      if (req.url().includes("/api/admin/agents") && new URL(req.url()).searchParams.has("search")) {
        searchCallFired = true
      }
    })

    const input = page.getByTestId("admin-entity-list-search--agents")
    await input.click()
    await input.pressSequentially("sm", { delay: 20 })
    await page.waitForTimeout(50)
    expect(searchCallFired).toBe(false)
  })

  test("after debounce delay the API fires with the typed term", async ({ page }) => {
    await page.goto("/admin/agents")
    await expect(page.getByTestId("admin-entity-list-card--agents")).toBeVisible()

    const input = page.getByTestId("admin-entity-list-search--agents")
    const searchRequest = page.waitForRequest(
      (req) => req.url().includes("/api/admin/agents") && new URL(req.url()).searchParams.get("search") === "smith",
      { timeout: 5_000 },
    )
    await input.fill("smith")
    await searchRequest
  })

  test("clearing the input fires an API request without a search param", async ({ page }) => {
    await page.goto("/admin/agents?search=smith")
    await expect(page.getByTestId("admin-entity-list-card--agents")).toBeVisible()
    const input = page.getByTestId("admin-entity-list-search--agents")
    await expect(input).toHaveValue("smith")

    const clearRequest = page.waitForRequest(
      (req) => req.url().includes("/api/admin/agents") && !new URL(req.url()).searchParams.has("search"),
      { timeout: 5_000 },
    )
    await input.clear()
    await clearRequest
  })

  test("URL updates to include search param after debounce", async ({ page }) => {
    await page.goto("/admin/agents")
    await expect(page.getByTestId("admin-entity-list-card--agents")).toBeVisible()
    await page.getByTestId("admin-entity-list-search--agents").fill("test")
    await expect(page).toHaveURL(/search=test/, { timeout: 5_000 })
  })
})
