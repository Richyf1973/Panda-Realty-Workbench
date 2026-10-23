/**
 * Panda Realty — Status filter: Select All / Select visible + persistent collapse (Hide)
 *
 * localStorage key used by the implementation:
 *   panda-realty:list-filter:properties:propertyStatusId:values    — comma-separated selected ids
 *   panda-realty:list-filter:properties:propertyStatusId:collapsed  — "1" when section is collapsed
 *
 * testids expected on the new controls:
 *   admin-entity-list-relation-filter-select-all--properties--propertyStatusId
 *   admin-entity-list-relation-filter-toggle--properties--propertyStatusId  (the collapse header button)
 */

import { expect, test } from "@playwright/test"

import { e2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import { EMPTY_LIST_RESPONSE } from "./helpers/admin-properties-mocks"
import { getLocalStorage, setLocalStorage, STATUS_OPTIONS, setupMocks } from "./helpers/status-filter-helpers"

// ─── test IDs ─────────────────────────────────────────────────────────────────

const SECTION_TESTID   = "admin-entity-list-relation-filter--properties--propertyStatusId"
const TOGGLE_TESTID    = "admin-entity-list-relation-filter-toggle--properties--propertyStatusId"
const SELECT_ALL_TESTID = "admin-entity-list-relation-filter-select-all--properties--propertyStatusId"
const SEARCH_TESTID    = "admin-entity-list-relation-filter-search--properties--propertyStatusId"
const CLEAR_TESTID     = "admin-entity-list-relation-filter-clear--properties--propertyStatusId"
const PANEL_TOGGLE_TESTID = "admin-entity-filter-side-panel-toggle--properties"

const LS_VALUES_KEY    = "panda-realty:list-filter:properties:propertyStatusId:values"
const LS_COLLAPSED_KEY = "panda-realty:list-filter:properties:propertyStatusId:collapsed"

async function expandSideFilterPanel(page: import("@playwright/test").Page) {
  await page.getByTestId("admin-entity-list-card--properties").waitFor({ state: "visible" })
  const toggle = page.getByTestId(PANEL_TOGGLE_TESTID)
  const isExpanded = await toggle.getAttribute("aria-expanded").then((val) => val === "true")
  if (!isExpanded) {
    await toggle.click()
  }
}

// ─── tests ────────────────────────────────────────────────────────────────────

test.describe("Panda Realty — Status filter: Select All & persistent collapse (mocked APIs)", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")
    // Use a unique run-id per test so the clear script runs exactly once (first navigation),
    // but skips subsequent navigations AND page.reload() within the same test.
    const runId = Math.random().toString(36).slice(2)
    await page.addInitScript((id) => {
      const FLAG = "__panda_test_run_id__"
      if (window.localStorage.getItem(FLAG) === id) return
      window.localStorage.setItem(FLAG, id)
      window.localStorage.removeItem("panda-realty:list-filter:properties:propertyStatusId:values")
      window.localStorage.removeItem("panda-realty:list-filter:properties:propertyStatusId:collapsed")
    }, runId)
    await setupMocks(page)
    await signInAsAdmin(page)
  })

  // ── Happy path ──────────────────────────────────────────────────────────────

  test("Status section is visible and expanded by default", async ({ page }) => {
    await page.goto("/admin/properties")
    await expandSideFilterPanel(page)
    const section = page.getByTestId(SECTION_TESTID)
    await expect(section).toBeVisible()
    // checkboxes should be visible (section expanded)
    const firstCheckbox = section.locator("input[type='checkbox']").first()
    await expect(firstCheckbox).toBeVisible()
  })

  test("Select All button exists inside the Status section", async ({ page }) => {
    await page.goto("/admin/properties")
    await expandSideFilterPanel(page)
    const section = page.getByTestId(SECTION_TESTID)
    await expect(section).toBeVisible()
    const selectAllBtn = page.getByTestId(SELECT_ALL_TESTID)
    await expect(selectAllBtn).toBeVisible()
    await expect(selectAllBtn).toHaveText(/select all/i)
  })

  test("Select All checks all visible options", async ({ page }) => {
    await page.goto("/admin/properties")
    await expandSideFilterPanel(page)
    await page.getByTestId(SELECT_ALL_TESTID).click()

    const section = page.getByTestId(SECTION_TESTID)
    const checkboxes = section.locator("input[type='checkbox']")
    const count = await checkboxes.count()
    expect(count).toBeGreaterThanOrEqual(5)
    for (let i = 0; i < count; i++) {
      await expect(checkboxes.nth(i)).toBeChecked()
    }
  })

  test("Select All label becomes 'Select visible' when search is active", async ({ page }) => {
    await page.goto("/admin/properties")
    await expandSideFilterPanel(page)
    const searchInput = page.getByTestId(SEARCH_TESTID)
    await searchInput.fill("App")

    const selectAllBtn = page.getByTestId(SELECT_ALL_TESTID)
    await expect(selectAllBtn).toHaveText(/select visible/i)
  })

  test("Select visible only checks currently filtered options", async ({ page }) => {
    await page.goto("/admin/properties")
    await expandSideFilterPanel(page)

    // Type to filter — only "Appraised" and "To Be Appraised" should be visible
    const searchInput = page.getByTestId(SEARCH_TESTID)
    await searchInput.fill("appraised")

    await page.getByTestId(SELECT_ALL_TESTID).click()

    // Clear search to see all options
    await searchInput.fill("")

    const section = page.getByTestId(SECTION_TESTID)
    const checkboxes = section.locator("input[type='checkbox']")
    const allCount = await checkboxes.count()

    // Count checked boxes
    let checkedCount = 0
    for (let i = 0; i < allCount; i++) {
      if (await checkboxes.nth(i).isChecked()) checkedCount++
    }
    // Only the "Appraised" options should be checked, not all 5
    expect(checkedCount).toBeGreaterThan(0)
    expect(checkedCount).toBeLessThan(allCount)
  })

  test("label reverts to 'Select All' when search is cleared", async ({ page }) => {
    await page.goto("/admin/properties")
    await expandSideFilterPanel(page)
    const searchInput = page.getByTestId(SEARCH_TESTID)
    await searchInput.fill("App")
    await expect(page.getByTestId(SELECT_ALL_TESTID)).toHaveText(/select visible/i)

    await searchInput.fill("")
    await expect(page.getByTestId(SELECT_ALL_TESTID)).toHaveText(/select all/i)
  })

  // ── Collapse (Hide) ─────────────────────────────────────────────────────────

  test("chevron/toggle button collapses the Status section", async ({ page }) => {
    await page.goto("/admin/properties")
    await expandSideFilterPanel(page)
    const section = page.getByTestId(SECTION_TESTID)

    // Checkboxes visible before collapse
    await expect(section.locator("input[type='checkbox']").first()).toBeVisible()

    await page.getByTestId(TOGGLE_TESTID).click()

    // Checkboxes hidden after collapse
    await expect(section.locator("input[type='checkbox']").first()).not.toBeVisible()
  })

  test("clicking toggle again re-expands the section", async ({ page }) => {
    await page.goto("/admin/properties")
    await expandSideFilterPanel(page)
    const section = page.getByTestId(SECTION_TESTID)

    await page.getByTestId(TOGGLE_TESTID).click()
    await expect(section.locator("input[type='checkbox']").first()).not.toBeVisible()

    await page.getByTestId(TOGGLE_TESTID).click()
    await expect(section.locator("input[type='checkbox']").first()).toBeVisible()
  })

  // ── Persistence — selections ────────────────────────────────────────────────

  test("selecting statuses writes them to localStorage", async ({ page }) => {
    await page.goto("/admin/properties")
    await expandSideFilterPanel(page)
    const section = page.getByTestId(SECTION_TESTID)

    // Check the first two options
    const checkboxes = section.locator("input[type='checkbox']")
    await checkboxes.nth(0).click()
    await checkboxes.nth(1).click()

    const stored = await getLocalStorage(page, LS_VALUES_KEY)
    expect(stored).toBeTruthy()
    // Should contain ids "1" and "2"
    expect(stored).toContain("1")
    expect(stored).toContain("2")
  })

  test("selected statuses are restored from localStorage on page reload", async ({ page }) => {
    await page.goto("/admin/properties")
    await expandSideFilterPanel(page)

    // Select two options
    const section = page.getByTestId(SECTION_TESTID)
    const checkboxes = section.locator("input[type='checkbox']")
    await checkboxes.nth(0).click()
    await checkboxes.nth(2).click()

    // Reload
    await page.reload()
    await expandSideFilterPanel(page)
    await expect(page.getByTestId(SECTION_TESTID)).toBeVisible()

    // Wait for checkboxes to load
    const restoredCheckboxes = page.getByTestId(SECTION_TESTID).locator("input[type='checkbox']")
    await expect(restoredCheckboxes.first()).toBeVisible()

    await expect(restoredCheckboxes.nth(0)).toBeChecked()
    await expect(restoredCheckboxes.nth(2)).toBeChecked()
    await expect(restoredCheckboxes.nth(1)).not.toBeChecked()
  })
})
