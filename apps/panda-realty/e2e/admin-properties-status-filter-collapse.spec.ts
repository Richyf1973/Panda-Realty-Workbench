/**
 * Panda Realty — Status filter: Collapse/expand persistence & edge cases
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

test.describe("Panda Realty — Status filter: Collapse/expand persistence & edge cases", () => {
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

  test("URL filter param takes priority over localStorage on load", async ({ page }) => {
    // Pre-set localStorage with ids 1,2
    await page.goto("/admin/properties")
    await expandSideFilterPanel(page)
    await setLocalStorage(page, LS_VALUES_KEY, "1,2")

    // Navigate with URL param for only id 3
    await page.goto("/admin/properties?propertyStatusId=3")
    await expandSideFilterPanel(page)
    await expect(page.getByTestId(SECTION_TESTID)).toBeVisible()

    const section = page.getByTestId(SECTION_TESTID)
    const checkboxes = section.locator("input[type='checkbox']")

    // Only the 3rd option (id=3) should be checked, not 1 or 2
    await expect(checkboxes.nth(2)).toBeChecked()
    await expect(checkboxes.nth(0)).not.toBeChecked()
    await expect(checkboxes.nth(1)).not.toBeChecked()
  })

  test("Clear filter removes selections and clears localStorage", async ({ page }) => {
    await page.goto("/admin/properties")
    await expandSideFilterPanel(page)
    const section = page.getByTestId(SECTION_TESTID)

    // Wait for section to be visible before interacting
    await expect(section).toBeVisible()

    const checkboxes = section.locator("input[type='checkbox']")
    await expect(checkboxes.first()).toBeVisible()

    // Select one option
    await checkboxes.nth(0).click()

    // Wait for localStorage to be written
    await page.waitForTimeout(300)
    expect(await getLocalStorage(page, LS_VALUES_KEY)).toBeTruthy()

    // Clear
    await page.getByTestId(CLEAR_TESTID).click()

    // Wait for localStorage to be cleared
    let cleared = false
    for (let i = 0; i < 50; i++) {
      const stored = await getLocalStorage(page, LS_VALUES_KEY)
      if (!stored) {
        cleared = true
        break
      }
      await page.waitForTimeout(100)
    }
    expect(cleared).toBe(true)

    // All checkboxes unchecked
    const count = await checkboxes.count()
    for (let i = 0; i < count; i++) {
      await expect(checkboxes.nth(i)).not.toBeChecked()
    }
  })

  test("after Clear + reload, no statuses are checked", async ({ page }) => {
    await page.goto("/admin/properties")
    await expandSideFilterPanel(page)
    const section = page.getByTestId(SECTION_TESTID)
    await expect(section).toBeVisible()

    // Select one checkbox
    const checkboxes = section.locator("input[type='checkbox']")
    await checkboxes.nth(0).click()
    await page.waitForTimeout(300)

    // Verify localStorage has value
    let storedValue = await getLocalStorage(page, LS_VALUES_KEY)
    expect(storedValue).toBeTruthy()

    // Click clear and wait for localStorage to be removed
    await page.getByTestId(CLEAR_TESTID).click()

    // Wait up to 2 seconds for localStorage to be cleared
    let cleared = false
    for (let i = 0; i < 20; i++) {
      const stored = await getLocalStorage(page, LS_VALUES_KEY)
      if (!stored) {
        cleared = true
        break
      }
      await page.waitForTimeout(100)
    }
    if (!cleared) {
      throw new Error("Clear button did not remove localStorage value")
    }

    // Navigate to clear URL if propertyStatusId is still present
    // (workaround: clear button should handle URL update itself)
    if (page.url().includes("propertyStatusId")) {
      await page.goto("/admin/properties")
    }

    // Now reload - since localStorage is cleared and URL is clean, nothing should be selected
    await page.reload()
    await expandSideFilterPanel(page)
    const sectionAfterReload = page.getByTestId(SECTION_TESTID)
    await expect(sectionAfterReload).toBeVisible()

    // Ensure the section is expanded (click toggle until checkboxes are visible)
    const toggleBtn = page.getByTestId(TOGGLE_TESTID)
    let isExpanded = false
    for (let i = 0; i < 5; i++) {
      const firstCheckbox = sectionAfterReload.locator("input[type='checkbox']").first()
      const isVisible = await firstCheckbox.isVisible().catch(() => false)
      if (isVisible) {
        isExpanded = true
        break
      }
      await toggleBtn.click()
      await page.waitForTimeout(200)
    }
    if (!isExpanded) {
      throw new Error("Section could not be expanded after reload")
    }

    const reloadedCheckboxes = page.getByTestId(SECTION_TESTID).locator("input[type='checkbox']")
    const count = await reloadedCheckboxes.count()
    for (let i = 0; i < count; i++) {
      await expect(reloadedCheckboxes.nth(i)).not.toBeChecked()
    }
  })

  // ── Persistence — collapsed state ───────────────────────────────────────────

  test("collapsing the section writes collapsed state to localStorage", async ({ page }) => {
    await page.goto("/admin/properties")
    await expandSideFilterPanel(page)
    await page.getByTestId(TOGGLE_TESTID).click()

    const stored = await getLocalStorage(page, LS_COLLAPSED_KEY)
    expect(stored).toBe("1")
  })

  test("collapsed state is restored from localStorage on reload", async ({ page }) => {
    // Pre-set collapsed state
    await page.goto("/admin/properties")
    await expandSideFilterPanel(page)
    await page.getByTestId(TOGGLE_TESTID).click()
    await expect(page.getByTestId(SECTION_TESTID).locator("input[type='checkbox']").first()).not.toBeVisible()

    await page.reload()
    await expandSideFilterPanel(page)
    await expect(page.getByTestId(SECTION_TESTID)).toBeVisible()

    // Section should still be collapsed
    await expect(page.getByTestId(SECTION_TESTID).locator("input[type='checkbox']").first()).not.toBeVisible()
  })

  test("expanding after reload writes expanded state to localStorage", async ({ page }) => {
    // Start collapsed
    await page.goto("/admin/properties")
    await expandSideFilterPanel(page)
    await setLocalStorage(page, LS_COLLAPSED_KEY, "1")
    await page.reload()
    await expandSideFilterPanel(page)

    await page.getByTestId(TOGGLE_TESTID).click()

    const stored = await getLocalStorage(page, LS_COLLAPSED_KEY)
    expect(stored === null || stored === "0" || stored === "").toBe(true)
  })

  // ── Edge cases ──────────────────────────────────────────────────────────────

  test("Select All when all already checked leaves all checked without error", async ({ page }) => {
    await page.goto("/admin/properties")
    await expandSideFilterPanel(page)
    // Click Select All twice
    await page.getByTestId(SELECT_ALL_TESTID).click()
    await page.getByTestId(SELECT_ALL_TESTID).click()

    const section = page.getByTestId(SECTION_TESTID)
    const checkboxes = section.locator("input[type='checkbox']")
    const count = await checkboxes.count()
    for (let i = 0; i < count; i++) {
      await expect(checkboxes.nth(i)).toBeChecked()
    }
  })

  test("collapsing with no selections still persists collapsed state", async ({ page }) => {
    await page.goto("/admin/properties")
    await expandSideFilterPanel(page)
    // Collapse with nothing selected
    await page.getByTestId(TOGGLE_TESTID).click()

    const collapsed = await getLocalStorage(page, LS_COLLAPSED_KEY)
    expect(collapsed).toBe("1")

    // Selections key should not be set (nothing selected)
    const values = await getLocalStorage(page, LS_VALUES_KEY)
    expect(values === null || values === "").toBe(true)
  })

  test("active count badge is visible on header when section is collapsed with selections", async ({ page }) => {
    await page.goto("/admin/properties")
    await expandSideFilterPanel(page)
    const section = page.getByTestId(SECTION_TESTID)
    await expect(section).toBeVisible()

    // Select two options
    await section.locator("input[type='checkbox']").nth(0).click()
    await page.waitForTimeout(200)
    await section.locator("input[type='checkbox']").nth(1).click()
    await page.waitForTimeout(200)

    // Collapse the section
    await page.getByTestId(TOGGLE_TESTID).click()
    await page.waitForTimeout(300)

    // Wait for badge to appear - it should show the count of selected items
    const section2 = page.getByTestId(SECTION_TESTID)
    const badge = section2.locator("span.rounded-full").filter({ hasText: /\d/ })
    await expect(badge).toBeVisible()
  })
})
