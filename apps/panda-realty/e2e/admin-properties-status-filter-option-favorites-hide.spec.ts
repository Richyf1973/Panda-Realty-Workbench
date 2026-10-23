/**
 * Panda Realty — Status filter: per-option Favorite and Hide
 *
 * Run:
 *   npm run test:e2e:scratch -- --app=panda-realty --spec="apps/panda-realty/e2e/admin-properties-status-filter-option-favorites-hide.spec.ts" --no-bail
 *
 * localStorage keys used by this feature:
 *   panda-realty:list-filter:properties:propertyStatusId:favorites  — comma-separated favorited ids
 *   panda-realty:list-filter:properties:propertyStatusId:hidden     — comma-separated hidden ids
 *
 * testids introduced:
 *   admin-entity-list-relation-filter-option-star--properties--propertyStatusId--{id}
 *   admin-entity-list-relation-filter-option-hide--properties--propertyStatusId--{id}
 *   admin-entity-list-relation-filter-show-hidden--properties--propertyStatusId
 *   admin-entity-list-relation-filter-favorites-divider--properties--propertyStatusId
 */

import { expect, test } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { createStory, shotFocused } from "@repo/e2e-utils"

import { e2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import { getLocalStorage, setLocalStorage, STATUS_OPTIONS, setupMocks } from "./helpers/status-filter-helpers"

const SHOT_DIR = join(dirname(fileURLToPath(import.meta.url)), "screenshots", "status-filter-option-favorites-hide")

const story = createStory({ specUrl: import.meta.url, slug: "status-filter-option-favorites-hide" })
story.setWhatWasBuilt(
  "Per-option Favorite and Hide controls on the Status multi-select filter in the Panda Realty property admin list. Favorites float to the top above a divider; hidden options are excluded from the visible list and revealable via a 'Show N hidden' toggle. A 'Favorites only' button re-selects just the favorited statuses in one tap (respecting the search box), and it appears only when at least one status is starred. Clearing the filter now resets only the selection — stars and hidden state survive a clear and a reload. All state is persisted in localStorage.",
)

// ─── constants ─────────────────────────────────────────────────────────────────

const SECTION_TESTID   = "admin-entity-list-relation-filter--properties--propertyStatusId"
const TOGGLE_TESTID    = "admin-entity-list-relation-filter-toggle--properties--propertyStatusId"
const SELECT_ALL_TESTID = "admin-entity-list-relation-filter-select-all--properties--propertyStatusId"
const SEARCH_TESTID    = "admin-entity-list-relation-filter-search--properties--propertyStatusId"
const CLEAR_TESTID     = "admin-entity-list-relation-filter-clear--properties--propertyStatusId"
const PANEL_TOGGLE_TESTID = "admin-entity-filter-side-panel-toggle--properties"
const SHOW_HIDDEN_TESTID = "admin-entity-list-relation-filter-show-hidden--properties--propertyStatusId"
const DIVIDER_TESTID   = "admin-entity-list-relation-filter-favorites-divider--properties--propertyStatusId"
const FAVORITES_ONLY_TESTID = "admin-entity-list-relation-filter-select-favorites--properties--propertyStatusId"

const LS_FAVORITES_KEY = "panda-realty:list-filter:properties:propertyStatusId:favorites"
const LS_HIDDEN_KEY    = "panda-realty:list-filter:properties:propertyStatusId:hidden"
const LS_VALUES_KEY    = "panda-realty:list-filter:properties:propertyStatusId:values"

// IDs from STATUS_OPTIONS mock fixture (ids 1–5)
const OPT_1_ID = "1" // Quiet Listing
const OPT_2_ID = "2" // Coming Soon
const OPT_3_ID = "3" // Appraised
const OPT_4_ID = "4" // To Be Appraised
const OPT_5_ID = "5" // Listed With Another Agent

// Option rows render the status CODE as their visible label / accessible name.
const OPT_1_LABEL = "QUIET"     // Quiet Listing
const OPT_2_LABEL = "COMING"    // Coming Soon
const OPT_3_LABEL = "APPRAISED" // Appraised

function starTestId(id: string) {
  return `admin-entity-list-relation-filter-option-star--properties--propertyStatusId--${id}`
}
function hideTestId(id: string) {
  return `admin-entity-list-relation-filter-option-hide--properties--propertyStatusId--${id}`
}

// ─── helpers ──────────────────────────────────────────────────────────────────

async function expandSideFilterPanel(page: import("@playwright/test").Page) {
  await page.getByTestId("admin-entity-list-card--properties").waitFor({ state: "visible" })
  const toggle = page.getByTestId(PANEL_TOGGLE_TESTID)
  const isExpanded = await toggle.getAttribute("aria-expanded").then((val) => val === "true")
  if (!isExpanded) await toggle.click()
}

async function goToProperties(page: import("@playwright/test").Page) {
  await page.goto("/admin/properties")
  await expandSideFilterPanel(page)
  await page.getByTestId(SECTION_TESTID).waitFor({ state: "visible" })
}

// ─── suite ────────────────────────────────────────────────────────────────────

test.beforeEach(async ({ page }) => {
  test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")
  const runId = Math.random().toString(36).slice(2)
  await page.addInitScript((id) => {
    const FLAG = "__panda_test_run_id_fav__"
    if (window.localStorage.getItem(FLAG) === id) return
    window.localStorage.setItem(FLAG, id)
    window.localStorage.removeItem("panda-realty:list-filter:properties:propertyStatusId:favorites")
    window.localStorage.removeItem("panda-realty:list-filter:properties:propertyStatusId:hidden")
    window.localStorage.removeItem("panda-realty:list-filter:properties:propertyStatusId:values")
    window.localStorage.removeItem("panda-realty:list-filter:properties:propertyStatusId:collapsed")
  }, runId)
  await setupMocks(page)
  await signInAsAdmin(page)
})

test.afterAll(() => {
  story.write()
})

test.beforeEach(async () => {
  await mkdir(SHOT_DIR, { recursive: true })
})

test.describe("Panda Realty — Status filter: per-option Favorite and Hide", () => {

  // ── Icon visibility ──────────────────────────────────────────────────────────

  test("star and eye icons are visible on every option row (always visible)", async ({ page }) => {
    await goToProperties(page)
    const section = page.getByTestId(SECTION_TESTID)

    await expect(page.getByTestId(starTestId(OPT_1_ID))).toBeVisible()
    await expect(page.getByTestId(hideTestId(OPT_1_ID))).toBeVisible()
    await expect(page.getByTestId(starTestId(OPT_2_ID))).toBeVisible()
    await expect(page.getByTestId(hideTestId(OPT_2_ID))).toBeVisible()

    await shotFocused(page, section, SHOT_DIR, "01-icons-visible")
    story.addScene({
      title: "01 — Icons visible on every option row",
      images: [join(SHOT_DIR, "01-icons-visible.png")],
      seeing: "Each status option row shows a star icon and an eye icon on the right edge, always visible without hovering.",
      steps: ["Open /admin/properties", "Expand Status filter section", "Observe star and eye icons on each row"],
    })
  })

  // ── Favorites ────────────────────────────────────────────────────────────────

  test("clicking star on an option favorites it and moves it above the divider", async ({ page }) => {
    await goToProperties(page)

    await shotFocused(page, page.getByTestId(SECTION_TESTID), SHOT_DIR, "02a-before-favorite")

    await page.getByTestId(starTestId(OPT_2_ID)).click() // Coming Soon

    const divider = page.getByTestId(DIVIDER_TESTID)
    await expect(divider).toBeVisible()

    // Coming Soon's star should appear before the divider in document order
    const isBefore = await page.evaluate(({ starId, dividerId }) => {
      const star = document.querySelector(`[data-testid="${starId}"]`)
      const div = document.querySelector(`[data-testid="${dividerId}"]`)
      if (!star || !div) return false
      return !!(star.compareDocumentPosition(div) & Node.DOCUMENT_POSITION_FOLLOWING)
    }, { starId: starTestId(OPT_2_ID), dividerId: DIVIDER_TESTID })
    expect(isBefore).toBe(true)

    const section = page.getByTestId(SECTION_TESTID)
    await shotFocused(page, section, SHOT_DIR, "02b-after-favorite")
    story.addScene({
      title: "02 — Favorite: option moves above the divider",
      images: [join(SHOT_DIR, "02a-before-favorite.png"), join(SHOT_DIR, "02b-after-favorite.png")],
      seeing: "Left: normal list before starring. Right: Coming Soon floated to top above a divider line.",
      steps: ["Click the star icon on Coming Soon", "Observe it moves to the favorites section above the divider"],
    })
  })

  test("clicking filled star un-favorites an option and returns it below the divider", async ({ page }) => {
    await goToProperties(page)
    await page.getByTestId(starTestId(OPT_2_ID)).click() // favorite
    const divider = page.getByTestId(DIVIDER_TESTID)
    await expect(divider).toBeVisible()

    await page.getByTestId(starTestId(OPT_2_ID)).click() // un-favorite
    await expect(divider).not.toBeVisible()
  })

  test("multiple options can be favorited and all float to top", async ({ page }) => {
    await goToProperties(page)
    await page.getByTestId(starTestId(OPT_1_ID)).click()
    await page.getByTestId(starTestId(OPT_3_ID)).click()

    const divider = page.getByTestId(DIVIDER_TESTID)
    await expect(divider).toBeVisible()

    // Both favorited items' stars should appear before the divider in document order
    for (const id of [OPT_1_ID, OPT_3_ID]) {
      const isBefore = await page.evaluate(({ starId, dividerId }) => {
        const star = document.querySelector(`[data-testid="${starId}"]`)
        const div = document.querySelector(`[data-testid="${dividerId}"]`)
        if (!star || !div) return false
        return !!(star.compareDocumentPosition(div) & Node.DOCUMENT_POSITION_FOLLOWING)
      }, { starId: starTestId(id), dividerId: DIVIDER_TESTID })
      expect(isBefore).toBe(true)
    }
  })

  // ── Hide ─────────────────────────────────────────────────────────────────────

  test("clicking eye hides an option and shows the Show hidden link", async ({ page }) => {
    await goToProperties(page)
    const section = page.getByTestId(SECTION_TESTID)

    await shotFocused(page, section, SHOT_DIR, "03a-before-hide")

    await page.getByTestId(hideTestId(OPT_5_ID)).click() // Listed With Another Agent

    // Option should not appear as a visible (non-dimmed) row
    await expect(page.getByTestId(hideTestId(OPT_5_ID))).not.toBeVisible()

    // Show hidden link appears
    const showHidden = page.getByTestId(SHOW_HIDDEN_TESTID)
    await expect(showHidden).toBeVisible()
    await expect(showHidden).toContainText("1")

    await shotFocused(page, section, SHOT_DIR, "03b-after-hide")
    story.addScene({
      title: "03 — Hide: option disappears and Show hidden link appears",
      images: [join(SHOT_DIR, "03a-before-hide.png"), join(SHOT_DIR, "03b-after-hide.png")],
      seeing: "Left: all 5 options visible. Right: option 5 hidden, Show 1 hidden link visible at bottom.",
      steps: ["Click eye icon on Listed With Another Agent", "Observe it disappears and Show 1 hidden link appears"],
    })
  })

  test("Show hidden counter increments as more options are hidden", async ({ page }) => {
    await goToProperties(page)
    await page.getByTestId(hideTestId(OPT_4_ID)).click()
    await page.getByTestId(hideTestId(OPT_5_ID)).click()

    const showHidden = page.getByTestId(SHOW_HIDDEN_TESTID)
    await expect(showHidden).toContainText("2")
  })

  test("clicking Show hidden reveals hidden options in dimmed state", async ({ page }) => {
    await goToProperties(page)
    await page.getByTestId(hideTestId(OPT_5_ID)).click()

    const showHidden = page.getByTestId(SHOW_HIDDEN_TESTID)
    await showHidden.click()

    // Hidden option is now visible in dimmed state with its eye icon
    await expect(page.getByTestId(hideTestId(OPT_5_ID))).toBeVisible()

    const section = page.getByTestId(SECTION_TESTID)
    await shotFocused(page, section, SHOT_DIR, "04-show-hidden-expanded")
    story.addScene({
      title: "04 — Show hidden reveals dimmed options",
      images: [join(SHOT_DIR, "04-show-hidden-expanded.png")],
      seeing: "Hidden option appears dimmed at the bottom of the list with its eye icon still accessible.",
      steps: ["Hide an option", "Click Show N hidden link", "Observe option appears dimmed"],
    })
  })

  test("clicking eye on dimmed option restores it and decrements the counter", async ({ page }) => {
    await goToProperties(page)
    await page.getByTestId(hideTestId(OPT_4_ID)).click()
    await page.getByTestId(hideTestId(OPT_5_ID)).click()

    // Reveal hidden options
    await page.getByTestId(SHOW_HIDDEN_TESTID).click()

    // Restore option 5
    await page.getByTestId(hideTestId(OPT_5_ID)).click()

    // Counter drops to 1
    const showHidden = page.getByTestId(SHOW_HIDDEN_TESTID)
    await expect(showHidden).toContainText("1")

    // Option 5 is back in the main list
    await expect(page.getByTestId(hideTestId(OPT_5_ID))).toBeVisible()
  })

  test("Show hidden link disappears when all hidden options are restored", async ({ page }) => {
    await goToProperties(page)
    await page.getByTestId(hideTestId(OPT_5_ID)).click()

    await page.getByTestId(SHOW_HIDDEN_TESTID).click()
    await page.getByTestId(hideTestId(OPT_5_ID)).click() // restore

    await expect(page.getByTestId(SHOW_HIDDEN_TESTID)).not.toBeVisible()
  })

  // ── Select All skips hidden ──────────────────────────────────────────────────

  test("Select All skips hidden options", async ({ page }) => {
    await goToProperties(page)
    // Hide option 4 and 5
    await page.getByTestId(hideTestId(OPT_4_ID)).click()
    await page.getByTestId(hideTestId(OPT_5_ID)).click()

    // Click Select All
    await page.getByTestId(SELECT_ALL_TESTID).click()

    const section = page.getByTestId(SECTION_TESTID)
    const checkboxes = section.locator("input[type='checkbox']:not([disabled])")
    const checkedCount = await checkboxes.evaluateAll(
      (boxes) => boxes.filter((b) => (b as HTMLInputElement).checked).length
    )
    // Only 3 options visible (1, 2, 3) — 4 and 5 are hidden
    expect(checkedCount).toBe(3)
  })

  // ── Persistence ──────────────────────────────────────────────────────────────

  test("favorites persist on page reload", async ({ page }) => {
    await goToProperties(page)
    await page.getByTestId(starTestId(OPT_1_ID)).click()
    await page.getByTestId(starTestId(OPT_2_ID)).click()

    const stored = await getLocalStorage(page, LS_FAVORITES_KEY)
    expect(stored).toContain(OPT_1_ID)
    expect(stored).toContain(OPT_2_ID)

    await page.reload()
    await expandSideFilterPanel(page)

    const divider = page.getByTestId(DIVIDER_TESTID)
    await expect(divider).toBeVisible({ timeout: 10_000 })
  })

  test("hidden options persist on page reload", async ({ page }) => {
    await goToProperties(page)
    await page.getByTestId(hideTestId(OPT_5_ID)).click()

    const stored = await getLocalStorage(page, LS_HIDDEN_KEY)
    expect(stored).toContain(OPT_5_ID)

    await page.reload()
    await expandSideFilterPanel(page)

    const showHidden = page.getByTestId(SHOW_HIDDEN_TESTID)
    await expect(showHidden).toBeVisible({ timeout: 10_000 })
    await expect(showHidden).toContainText("1")
  })

  // ── Clear filter ─────────────────────────────────────────────────────────────

  test("Clear filter resets selection but preserves favorites and hidden state", async ({ page }) => {
    await goToProperties(page)
    await page.getByTestId(starTestId(OPT_1_ID)).click() // favorite Quiet Listing
    await page.getByTestId(hideTestId(OPT_5_ID)).click()  // hide Listed With Another Agent

    // Select a couple of options so Clear has something to reset
    await page.getByRole("checkbox", { name: OPT_2_LABEL }).check()
    await page.getByRole("checkbox", { name: OPT_3_LABEL, exact: true }).check()

    // Confirm the selection landed before clearing — Clear is enabled off selectedValues,
    // so click before the state propagates can no-op (observed flake).
    await expect(page.getByRole("checkbox", { name: OPT_2_LABEL })).toBeChecked()
    await expect(page.getByRole("checkbox", { name: OPT_3_LABEL, exact: true })).toBeChecked()

    await page.getByTestId(CLEAR_TESTID).click()

    // Selection is reset — no option checkbox remains checked
    const section = page.getByTestId(SECTION_TESTID)
    const checkedCount = await section
      .locator("input[type='checkbox']")
      .evaluateAll((boxes) => boxes.filter((b) => (b as HTMLInputElement).checked).length)
    expect(checkedCount).toBe(0)
    // The selection (:values) localStorage key is cleared
    expect(await getLocalStorage(page, LS_VALUES_KEY)).toBeNull()

    // Clearing the selection empties the mocked list, which re-renders the list card and
    // collapses the side filter panel (its open state resets on remount). Re-expand it so the
    // assertions below test state PERSISTENCE rather than the panel's transient open/closed state.
    await expandSideFilterPanel(page)

    // Favorites SURVIVE — divider still present and the favorites key is intact
    await expect(page.getByTestId(DIVIDER_TESTID)).toBeVisible({ timeout: 10_000 })
    expect(await getLocalStorage(page, LS_FAVORITES_KEY)).toContain(OPT_1_ID)
    // Hidden SURVIVES — Show hidden link still present and the hidden key is intact
    await expect(page.getByTestId(SHOW_HIDDEN_TESTID)).toBeVisible({ timeout: 10_000 })
    expect(await getLocalStorage(page, LS_HIDDEN_KEY)).toContain(OPT_5_ID)
  })

  test("favorites and hidden state survive a Clear followed by a page reload", async ({ page }) => {
    await goToProperties(page)
    await page.getByTestId(starTestId(OPT_1_ID)).click()
    await page.getByTestId(hideTestId(OPT_5_ID)).click()

    // Clear only resets the selection, so it is disabled until something is selected
    await page.getByRole("checkbox", { name: OPT_2_LABEL }).check()
    await page.getByTestId(CLEAR_TESTID).click()

    await page.reload()
    await expandSideFilterPanel(page)

    await expect(page.getByTestId(DIVIDER_TESTID)).toBeVisible({ timeout: 10_000 })
    await expect(page.getByTestId(SHOW_HIDDEN_TESTID)).toBeVisible({ timeout: 10_000 })
  })

  // ── Favorites only button ──────────────────────────────────────────────────

  test("Favorites only button is not rendered when there are no favorites", async ({ page }) => {
    await goToProperties(page)
    await expect(page.getByTestId(FAVORITES_ONLY_TESTID)).toHaveCount(0)
  })

  test("Favorites only button appears after a status is starred", async ({ page }) => {
    await goToProperties(page)
    await expect(page.getByTestId(FAVORITES_ONLY_TESTID)).toHaveCount(0)

    await page.getByTestId(starTestId(OPT_1_ID)).click()

    const favOnly = page.getByTestId(FAVORITES_ONLY_TESTID)
    await expect(favOnly).toBeVisible()

    const section = page.getByTestId(SECTION_TESTID)
    await shotFocused(page, section, SHOT_DIR, "05-favorites-only-button")
    story.addScene({
      title: "05 — Favorites only button appears once a status is starred",
      images: [join(SHOT_DIR, "05-favorites-only-button.png")],
      seeing: "After starring Quiet Listing, a Favorites only button sits next to Select All. It re-selects just the favorited statuses in one tap.",
      steps: ["Star a status", "Observe the Favorites only button appear next to Select All"],
    })
  })

  test("Favorites only selects exactly the favorited statuses in one tap", async ({ page }) => {
    await goToProperties(page)
    await page.getByTestId(starTestId(OPT_1_ID)).click() // Quiet Listing
    await page.getByTestId(starTestId(OPT_3_ID)).click() // Appraised

    const favOnly = page.getByTestId(FAVORITES_ONLY_TESTID)
    await expect(favOnly).toBeVisible()
    await favOnly.click()

    await expect(page.getByRole("checkbox", { name: OPT_1_LABEL })).toBeChecked()
    await expect(page.getByRole("checkbox", { name: OPT_3_LABEL, exact: true })).toBeChecked()
    await expect(page.getByRole("checkbox", { name: OPT_2_LABEL })).not.toBeChecked()
  })

  test("Favorites only respects the search box and selects only matching favorites", async ({ page }) => {
    await goToProperties(page)
    await page.getByTestId(starTestId(OPT_1_ID)).click() // Quiet Listing
    await page.getByTestId(starTestId(OPT_2_ID)).click() // Coming Soon

    // Narrow the option list to only Quiet Listing, then select favorites
    await page.getByTestId(SEARCH_TESTID).fill("Quiet")
    const favOnly = page.getByTestId(FAVORITES_ONLY_TESTID)
    await expect(favOnly).toBeVisible()
    await favOnly.click()

    // Clear the search to inspect the full selection
    await page.getByTestId(SEARCH_TESTID).fill("")

    await expect(page.getByRole("checkbox", { name: OPT_1_LABEL })).toBeChecked()
    await expect(page.getByRole("checkbox", { name: OPT_2_LABEL })).not.toBeChecked()
  })

  // ── Edge cases ───────────────────────────────────────────────────────────────

  test("favoriting then hiding the same option keeps the star and moves it into the hidden list", async ({ page }) => {
    await goToProperties(page)
    await page.getByTestId(starTestId(OPT_2_ID)).click() // favorite Coming Soon

    const divider = page.getByTestId(DIVIDER_TESTID)
    await expect(divider).toBeVisible()

    await page.getByTestId(hideTestId(OPT_2_ID)).click() // now hide it

    // Divider disappears — the starred item left the top favorites section
    await expect(divider).not.toBeVisible()
    // Show hidden link should appear
    await expect(page.getByTestId(SHOW_HIDDEN_TESTID)).toBeVisible()

    // Star is PRESERVED — the favorites key still contains the id (star & hide are independent)
    expect(await getLocalStorage(page, LS_FAVORITES_KEY)).toContain(OPT_2_ID)
    expect(await getLocalStorage(page, LS_HIDDEN_KEY)).toContain(OPT_2_ID)
  })

  test("search does not reveal hidden options", async ({ page }) => {
    await goToProperties(page)
    // Hide option 5 (Listed With Another Agent)
    await page.getByTestId(hideTestId(OPT_5_ID)).click()

    // Search for text that would match option 5
    await page.getByTestId(SEARCH_TESTID).fill("Listed")

    // The hide button for option 5 should NOT be visible in main list
    await expect(page.getByTestId(hideTestId(OPT_5_ID))).not.toBeVisible()
  })

})
