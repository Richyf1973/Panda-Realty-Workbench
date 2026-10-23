/**
 * Panda Realty — Status filter: keep stars on hide + sort starred-hidden atop the hidden list
 *
 * Run:
 *   npm run test:e2e:scratch -- --app=panda-realty --spec="apps/panda-realty/e2e/admin-properties-status-filter-hidden-favorites-sort.spec.ts" --no-bail
 *
 * Behavior under test (star & hide are now INDEPENDENT toggles):
 *   - Hiding a starred status keeps its star.
 *   - A starred-hidden status leaves the top favorites section and lives in the hidden list.
 *   - Inside the "Show N hidden" list, starred-hidden statuses sort above non-starred hidden ones.
 *   - Starring a hidden status keeps it hidden (just re-sorts it to the top of the hidden group).
 *   - Select All / Favorites only never select hidden statuses (starred or not).
 *
 * localStorage keys:
 *   panda-realty:list-filter:properties:propertyStatusId:favorites
 *   panda-realty:list-filter:properties:propertyStatusId:hidden
 */

import { expect, test } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { createStory, shotFocused } from "@repo/e2e-utils"

import { e2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import { getLocalStorage, setupMocks } from "./helpers/status-filter-helpers"

const SHOT_DIR = join(dirname(fileURLToPath(import.meta.url)), "screenshots", "status-filter-hidden-favorites-sort")

const story = createStory({ specUrl: import.meta.url, slug: "status-filter-hidden-favorites-sort" })
story.setWhatWasBuilt(
  "Star and hide on the Status multi-select filter (Panda Realty property admin) are now independent toggles. Hiding a starred status keeps its star instead of stripping it. A starred-hidden status leaves the top favorites section and appears at the top of the 'Show N hidden' list, above all non-starred hidden statuses. Starring a hidden status keeps it hidden and just re-sorts it to the top of the hidden group. Select All and Favorites only continue to skip hidden statuses entirely. State persists in localStorage and survives reload.",
)

// ─── constants ─────────────────────────────────────────────────────────────────

const SECTION_TESTID = "admin-entity-list-relation-filter--properties--propertyStatusId"
const SELECT_ALL_TESTID = "admin-entity-list-relation-filter-select-all--properties--propertyStatusId"
const CLEAR_TESTID = "admin-entity-list-relation-filter-clear--properties--propertyStatusId"
const PANEL_TOGGLE_TESTID = "admin-entity-filter-side-panel-toggle--properties"
const SHOW_HIDDEN_TESTID = "admin-entity-list-relation-filter-show-hidden--properties--propertyStatusId"
const DIVIDER_TESTID = "admin-entity-list-relation-filter-favorites-divider--properties--propertyStatusId"
const FAVORITES_ONLY_TESTID = "admin-entity-list-relation-filter-select-favorites--properties--propertyStatusId"

const LS_FAVORITES_KEY = "panda-realty:list-filter:properties:propertyStatusId:favorites"
const LS_HIDDEN_KEY = "panda-realty:list-filter:properties:propertyStatusId:hidden"

// IDs from STATUS_OPTIONS mock fixture (ids 1–5)
const OPT_1_ID = "1" // Quiet Listing  (QUIET)
const OPT_2_ID = "2" // Coming Soon    (COMING)
const OPT_3_ID = "3" // Appraised      (APPRAISED)
const OPT_4_ID = "4" // To Be Appraised (TBA)
const OPT_5_ID = "5" // Listed With Another Agent (LISTED_OTHER)

const OPT_1_LABEL = "QUIET"
const OPT_2_LABEL = "COMING"
const OPT_3_LABEL = "APPRAISED"

function starTestId(id: string) {
  return `admin-entity-list-relation-filter-option-star--properties--propertyStatusId--${id}`
}
function hideTestId(id: string) {
  return `admin-entity-list-relation-filter-option-hide--properties--propertyStatusId--${id}`
}

/** True if element `a` precedes element `b` in document order. */
async function aPrecedesB(page: import("@playwright/test").Page, aTestId: string, bTestId: string) {
  return page.evaluate(({ a, b }) => {
    const elA = document.querySelector(`[data-testid="${a}"]`)
    const elB = document.querySelector(`[data-testid="${b}"]`)
    if (!elA || !elB) return false
    return !!(elA.compareDocumentPosition(elB) & Node.DOCUMENT_POSITION_FOLLOWING)
  }, { a: aTestId, b: bTestId })
}

/** Is the star button's icon filled (favorited)? Checks for the amber fill class on the inner svg. */
async function isStarFilled(page: import("@playwright/test").Page, id: string) {
  return page.evaluate((testId) => {
    const btn = document.querySelector(`[data-testid="${testId}"]`)
    const svg = btn?.querySelector("svg")
    return !!svg && svg.classList.contains("fill-current")
  }, starTestId(id))
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
    const FLAG = "__panda_test_run_id_hidden_fav_sort__"
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

test.describe("Panda Realty — Status filter: keep stars on hide + sort starred-hidden atop hidden", () => {

  // ── Hiding a starred option keeps the star ─────────────────────────────────────

  test("hiding a starred option keeps its star and moves it into the hidden list", async ({ page }) => {
    await goToProperties(page)
    const section = page.getByTestId(SECTION_TESTID)

    // Star Coming Soon — it floats to the favorites section
    await page.getByTestId(starTestId(OPT_2_ID)).click()
    await expect(page.getByTestId(DIVIDER_TESTID)).toBeVisible()
    await shotFocused(page, section, SHOT_DIR, "01a-starred-visible")

    // Hide it
    await page.getByTestId(hideTestId(OPT_2_ID)).click()

    // The favorites divider disappears (the only favorite is now hidden)
    await expect(page.getByTestId(DIVIDER_TESTID)).not.toBeVisible()
    // The Show hidden link appears
    await expect(page.getByTestId(SHOW_HIDDEN_TESTID)).toBeVisible()

    // Reveal the hidden list and confirm the star is STILL filled
    await page.getByTestId(SHOW_HIDDEN_TESTID).click()
    await expect(page.getByTestId(starTestId(OPT_2_ID))).toBeVisible()
    expect(await isStarFilled(page, OPT_2_ID)).toBe(true)

    // The favorites localStorage key still contains the id (star preserved)
    expect(await getLocalStorage(page, LS_FAVORITES_KEY)).toContain(OPT_2_ID)
    expect(await getLocalStorage(page, LS_HIDDEN_KEY)).toContain(OPT_2_ID)

    await shotFocused(page, section, SHOT_DIR, "01b-starred-hidden")
    story.addScene({
      title: "01 — Hiding a starred status keeps the star",
      images: [join(SHOT_DIR, "01a-starred-visible.png"), join(SHOT_DIR, "01b-starred-hidden.png")],
      seeing:
        "Left: Coming Soon starred and floated to the favorites section. " +
        "Right: after hiding it, it leaves the favorites section and appears in the hidden list with its star still filled.",
      steps: [
        "Star Coming Soon",
        "Hide it with the eye icon",
        "Open Show N hidden",
        "Observe the star is still filled in the hidden list",
      ],
    })
  })

  test("a starred-hidden option does not appear in the top favorites section", async ({ page }) => {
    await goToProperties(page)
    await page.getByTestId(starTestId(OPT_2_ID)).click()
    await expect(page.getByTestId(DIVIDER_TESTID)).toBeVisible()

    await page.getByTestId(hideTestId(OPT_2_ID)).click()

    // No favorites remain visible, so the divider is gone
    await expect(page.getByTestId(DIVIDER_TESTID)).not.toBeVisible()
  })

  // ── Sorting inside the hidden list ──────────────────────────────────────────────

  test("starred-hidden options sort above non-starred hidden options", async ({ page }) => {
    await goToProperties(page)
    const section = page.getByTestId(SECTION_TESTID)

    // Hide a non-starred option first (id 1, which sorts BEFORE id 2 in original order)
    await page.getByTestId(hideTestId(OPT_1_ID)).click()
    // Star then hide a later option (id 2)
    await page.getByTestId(starTestId(OPT_2_ID)).click()
    await page.getByTestId(hideTestId(OPT_2_ID)).click()

    // Reveal the hidden list
    await page.getByTestId(SHOW_HIDDEN_TESTID).click()

    // Both are now in the hidden list. Despite id 1 < id 2 in original order,
    // the STARRED one (id 2) must render FIRST.
    await expect(page.getByTestId(hideTestId(OPT_1_ID))).toBeVisible()
    await expect(page.getByTestId(hideTestId(OPT_2_ID))).toBeVisible()
    expect(await aPrecedesB(page, hideTestId(OPT_2_ID), hideTestId(OPT_1_ID))).toBe(true)

    await shotFocused(page, section, SHOT_DIR, "02-hidden-sorted")
    story.addScene({
      title: "02 — Starred-hidden sorts to the top of the hidden list",
      images: [join(SHOT_DIR, "02-hidden-sorted.png")],
      seeing: "Inside Show N hidden, the starred Coming Soon appears above the non-starred Quiet Listing, even though Quiet Listing has a lower id.",
      steps: [
        "Hide Quiet Listing (not starred)",
        "Star then hide Coming Soon",
        "Open Show N hidden",
        "Observe Coming Soon sorts above Quiet Listing",
      ],
    })
  })

  // ── Starring a hidden option keeps it hidden ────────────────────────────────────

  test("starring a hidden option keeps it hidden and re-sorts it to the top of the hidden group", async ({ page }) => {
    await goToProperties(page)

    // Hide two options (ids 4 and 5)
    await page.getByTestId(hideTestId(OPT_4_ID)).click()
    await page.getByTestId(hideTestId(OPT_5_ID)).click()
    await page.getByTestId(SHOW_HIDDEN_TESTID).click()

    // Star the LATER one (id 5) from inside the hidden list
    await page.getByTestId(starTestId(OPT_5_ID)).click()

    // It stays hidden (Show hidden still reports 2, both still present)
    await expect(page.getByTestId(SHOW_HIDDEN_TESTID)).toContainText("2")
    await expect(page.getByTestId(hideTestId(OPT_5_ID))).toBeVisible()
    await expect(page.getByTestId(hideTestId(OPT_4_ID))).toBeVisible()
    // It is NOT promoted to the top favorites section
    await expect(page.getByTestId(DIVIDER_TESTID)).not.toBeVisible()
    // It now sorts above the non-starred hidden option (id 4)
    expect(await aPrecedesB(page, hideTestId(OPT_5_ID), hideTestId(OPT_4_ID))).toBe(true)
    // Both keys reflect it
    expect(await getLocalStorage(page, LS_FAVORITES_KEY)).toContain(OPT_5_ID)
    expect(await getLocalStorage(page, LS_HIDDEN_KEY)).toContain(OPT_5_ID)
  })

  test("un-starring a starred-hidden option keeps it hidden and drops it below the starred group", async ({ page }) => {
    await goToProperties(page)

    // Hide id 4 (plain) and star+hide id 5
    await page.getByTestId(hideTestId(OPT_4_ID)).click()
    await page.getByTestId(starTestId(OPT_5_ID)).click()
    await page.getByTestId(hideTestId(OPT_5_ID)).click()
    await page.getByTestId(SHOW_HIDDEN_TESTID).click()

    // id 5 starts above id 4
    expect(await aPrecedesB(page, hideTestId(OPT_5_ID), hideTestId(OPT_4_ID))).toBe(true)

    // Un-star id 5 from the hidden list
    await page.getByTestId(starTestId(OPT_5_ID)).click()

    // Still hidden (both present, counter still 2), but now sorts AFTER id 4
    await expect(page.getByTestId(SHOW_HIDDEN_TESTID)).toContainText("2")
    expect(await aPrecedesB(page, hideTestId(OPT_4_ID), hideTestId(OPT_5_ID))).toBe(true)
    expect(await getLocalStorage(page, LS_FAVORITES_KEY)).toBeNull()
  })

  test("unhiding a starred-hidden option returns it to the favorites section", async ({ page }) => {
    await goToProperties(page)
    await page.getByTestId(starTestId(OPT_2_ID)).click()
    await page.getByTestId(hideTestId(OPT_2_ID)).click()
    await expect(page.getByTestId(DIVIDER_TESTID)).not.toBeVisible()

    // Reveal hidden list, then unhide id 2
    await page.getByTestId(SHOW_HIDDEN_TESTID).click()
    await page.getByTestId(hideTestId(OPT_2_ID)).click()

    // It returns to the favorites section (divider visible again)
    await expect(page.getByTestId(DIVIDER_TESTID)).toBeVisible()
    // Its star precedes the divider in document order
    expect(await aPrecedesB(page, starTestId(OPT_2_ID), DIVIDER_TESTID)).toBe(true)
  })

  // ── Selection rules unchanged ───────────────────────────────────────────────────

  test("Select All skips starred-hidden options", async ({ page }) => {
    await goToProperties(page)
    // Star+hide id 4 and id 5
    await page.getByTestId(starTestId(OPT_4_ID)).click()
    await page.getByTestId(hideTestId(OPT_4_ID)).click()
    await page.getByTestId(starTestId(OPT_5_ID)).click()
    await page.getByTestId(hideTestId(OPT_5_ID)).click()

    await page.getByTestId(SELECT_ALL_TESTID).click()

    const section = page.getByTestId(SECTION_TESTID)
    const checkedCount = await section
      .locator("input[type='checkbox']")
      .evaluateAll((boxes) => boxes.filter((b) => (b as HTMLInputElement).checked).length)
    // Only 3 visible options (1, 2, 3) — the two starred-hidden ones are skipped
    expect(checkedCount).toBe(3)
  })

  test("Favorites only skips starred-hidden options", async ({ page }) => {
    await goToProperties(page)
    // Visible favorite: id 1. Starred-hidden: id 5.
    await page.getByTestId(starTestId(OPT_1_ID)).click()
    await page.getByTestId(starTestId(OPT_5_ID)).click()
    await page.getByTestId(hideTestId(OPT_5_ID)).click()

    const favOnly = page.getByTestId(FAVORITES_ONLY_TESTID)
    await expect(favOnly).toBeVisible()
    await favOnly.click()

    // Visible favorite is checked; the starred-hidden one is not part of the visible set
    await expect(page.getByRole("checkbox", { name: OPT_1_LABEL })).toBeChecked()
    const section = page.getByTestId(SECTION_TESTID)
    const checkedCount = await section
      .locator("input[type='checkbox']")
      .evaluateAll((boxes) => boxes.filter((b) => (b as HTMLInputElement).checked).length)
    expect(checkedCount).toBe(1)
  })

  // ── Persistence ─────────────────────────────────────────────────────────────────

  test("starred-hidden state persists in both keys and survives a reload", async ({ page }) => {
    await goToProperties(page)
    // Plain hidden id 1, starred-hidden id 2
    await page.getByTestId(hideTestId(OPT_1_ID)).click()
    await page.getByTestId(starTestId(OPT_2_ID)).click()
    await page.getByTestId(hideTestId(OPT_2_ID)).click()

    expect(await getLocalStorage(page, LS_FAVORITES_KEY)).toContain(OPT_2_ID)
    expect(await getLocalStorage(page, LS_HIDDEN_KEY)).toContain(OPT_2_ID)

    await page.reload()
    await expandSideFilterPanel(page)

    const showHidden = page.getByTestId(SHOW_HIDDEN_TESTID)
    await expect(showHidden).toBeVisible({ timeout: 10_000 })
    await expect(showHidden).toContainText("2")
    await showHidden.click()

    // Star still filled and still sorted above the plain hidden option
    expect(await isStarFilled(page, OPT_2_ID)).toBe(true)
    expect(await aPrecedesB(page, hideTestId(OPT_2_ID), hideTestId(OPT_1_ID))).toBe(true)
  })
})
