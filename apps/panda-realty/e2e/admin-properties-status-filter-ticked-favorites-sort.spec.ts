/**
 * Panda Realty — Status filter: ticked favorites sort to top of the favorites group on panel open
 *
 * Run:
 *   npm run test:e2e:scratch -- --app=panda-realty --spec="apps/panda-realty/e2e/admin-properties-status-filter-ticked-favorites-sort.spec.ts" --no-bail
 *
 * Within the favorites group (starred, not hidden), ticked favorites sort to the top and unticked
 * favorites drop to the bottom of that group — but ordering uses a SNAPSHOT of the ticked selection
 * captured when the panel opens (mount + each expand). While the panel stays open the order is
 * frozen, so rows do not jump as the user ticks/unticks; it re-settles only on the next open.
 *
 * Reuses the existing favorites/hide testids — no new testids are introduced.
 */

import { expect, test } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { createStory, shotFocused } from "@repo/e2e-utils"

import { e2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import { STATUS_OPTIONS, setupMocks } from "./helpers/status-filter-helpers"

const SHOT_DIR = join(dirname(fileURLToPath(import.meta.url)), "screenshots", "status-filter-ticked-favorites-sort")

const story = createStory({ specUrl: import.meta.url, slug: "status-filter-ticked-favorites-sort" })
story.setWhatWasBuilt(
  "Ticked-first ordering for the favorites group in the Panda Realty property Status filter. Within the starred (not hidden) favorites group, ticked statuses sort to the top and unticked ones drop to the bottom of the group, still above the divider. Ordering uses a snapshot of the ticked selection captured when the panel opens (mount + each expand), so while the panel stays open the order is frozen and rows do not jump as the user ticks/unticks. It re-settles only on the next open. No new localStorage key is added — order derives from the existing persisted selection at open time.",
)

// ─── constants ─────────────────────────────────────────────────────────────────

const SECTION_TESTID = "admin-entity-list-relation-filter--properties--propertyStatusId"
const TOGGLE_TESTID = "admin-entity-list-relation-filter-toggle--properties--propertyStatusId"
const DIVIDER_TESTID = "admin-entity-list-relation-filter-favorites-divider--properties--propertyStatusId"
const FAVORITES_ONLY_TESTID = "admin-entity-list-relation-filter-select-favorites--properties--propertyStatusId"
const PANEL_TOGGLE_TESTID = "admin-entity-filter-side-panel-toggle--properties"

// STATUS_OPTIONS mock fixture order: 1 QUIET, 2 COMING, 3 APPRAISED, 4 TBA, 5 LISTED_OTHER
const LABEL: Record<string, string> = Object.fromEntries(
  STATUS_OPTIONS.items.map((o) => [String(o.propertyStatusId), o.propertyStatusCode]),
)

function starTestId(id: string) {
  return `admin-entity-list-relation-filter-option-star--properties--propertyStatusId--${id}`
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

async function setSectionExpanded(page: import("@playwright/test").Page, expanded: boolean) {
  const toggle = page.getByTestId(TOGGLE_TESTID)
  const cur = (await toggle.getAttribute("aria-expanded")) === "true"
  if (cur !== expanded) await toggle.click()
}

/** Collapse then re-expand the Status section to force a fresh open-time snapshot. */
async function reopenSection(page: import("@playwright/test").Page) {
  await setSectionExpanded(page, false)
  await setSectionExpanded(page, true)
  // Wait until the option rows are rendered again before reading order.
  await page.getByTestId(starTestId("1")).waitFor({ state: "visible" })
}

async function star(page: import("@playwright/test").Page, id: string) {
  await page.getByTestId(starTestId(id)).click()
}

async function tick(page: import("@playwright/test").Page, id: string) {
  await page.getByRole("checkbox", { name: LABEL[id], exact: true }).check()
}

async function untick(page: import("@playwright/test").Page, id: string) {
  await page.getByRole("checkbox", { name: LABEL[id], exact: true }).uncheck()
}

/**
 * Returns the given star ids in DOM document order. Star buttons render in
 * order: favorites group first, then visible group, then (if shown) hidden.
 * Filtering to a starred-only id set yields the favorites group order.
 */
async function favoritesOrder(page: import("@playwright/test").Page, ids: string[]): Promise<string[]> {
  return page.evaluate((idList) => {
    const prefix = "admin-entity-list-relation-filter-option-star--properties--propertyStatusId--"
    const all = Array.from(document.querySelectorAll(`[data-testid^="${prefix}"]`))
    const order = all
      .map((el) => el.getAttribute("data-testid")?.slice(prefix.length) ?? "")
      .filter((id) => idList.includes(id))
    return order
  }, ids)
}

// ─── suite ────────────────────────────────────────────────────────────────────

test.beforeEach(async ({ page }) => {
  if (!e2eAdminCredentials) throw new Error("E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set in apps/panda-realty/.env.local")
  const runId = Math.random().toString(36).slice(2)
  await page.addInitScript((id) => {
    const FLAG = "__panda_test_run_id_ticked_fav__"
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

test.beforeEach(async () => {
  await mkdir(SHOT_DIR, { recursive: true })
})

test.afterAll(() => {
  story.write()
})

test.describe("Panda Realty — Status filter: ticked favorites sort to top of favorites group", () => {

  // ── Happy path ───────────────────────────────────────────────────────────────

  test("ticked favorites sort to the top of the favorites group when the panel reopens", async ({ page }) => {
    await goToProperties(page)
    const section = page.getByTestId(SECTION_TESTID)

    // Star four options; they enter the favorites group in original order 1,2,3,4.
    for (const id of ["1", "2", "3", "4"]) await star(page, id)
    // Tick only 1 and 3.
    await tick(page, "1")
    await tick(page, "3")

    await shotFocused(page, section, SHOT_DIR, "01a-before-reopen")

    // Re-open captures a fresh snapshot ticked = {1,3}.
    await reopenSection(page)

    await shotFocused(page, section, SHOT_DIR, "01b-after-reopen")

    // Ticked-first, stable within each partition: [1,3] then [2,4].
    expect(await favoritesOrder(page, ["1", "2", "3", "4"])).toEqual(["1", "3", "2", "4"])
    // Bottom = bottom of the favorites GROUP — divider still present, all four stars precede it.
    await expect(page.getByTestId(DIVIDER_TESTID)).toBeVisible()

    story.addScene({
      title: "01 — Ticked favorites sort to the top of the favorites group on open",
      images: [join(SHOT_DIR, "01a-before-reopen.png"), join(SHOT_DIR, "01b-after-reopen.png")],
      seeing:
        "Left: four starred statuses in original order with 1 (QUIET) and 3 (APPRAISED) ticked. " +
        "Right: after reopening the section, ticked 1 and 3 float to the top of the favorites group and unticked 2 and 4 drop to the bottom, still above the divider.",
      steps: [
        "Star QUIET, COMING, APPRAISED, TBA",
        "Tick QUIET and APPRAISED",
        "Collapse and re-expand the Status section",
        "Observe ticked favorites sorted to the top of the favorites group",
      ],
    })
  })

  test("favorites group re-settles from a fresh snapshot on each open", async ({ page }) => {
    await goToProperties(page)
    const section = page.getByTestId(SECTION_TESTID)
    for (const id of ["1", "2", "3", "4"]) await star(page, id)

    await tick(page, "1")
    await tick(page, "3")
    await reopenSection(page)
    expect(await favoritesOrder(page, ["1", "2", "3", "4"])).toEqual(["1", "3", "2", "4"])
    await shotFocused(page, section, SHOT_DIR, "02a-first-settle")

    // Change selection to ticked = {3,4}, then reopen → re-settles.
    await untick(page, "1")
    await tick(page, "4")
    await reopenSection(page)
    expect(await favoritesOrder(page, ["1", "2", "3", "4"])).toEqual(["3", "4", "1", "2"])
    await shotFocused(page, section, SHOT_DIR, "02b-re-settle")

    story.addScene({
      title: "02 — Order re-settles from a fresh snapshot on each open",
      images: [join(SHOT_DIR, "02a-first-settle.png"), join(SHOT_DIR, "02b-re-settle.png")],
      seeing:
        "Left: after first open the favorites group is ordered [1,3,2,4] (ticked 1 and 3 on top). " +
        "Right: selection changed to ticked {3,4} and the section reopened — the group re-settles to [3,4,1,2], proving the snapshot refreshes on each open.",
      steps: [
        "Star QUIET, COMING, APPRAISED, TBA and tick QUIET + APPRAISED",
        "Collapse and re-expand — observe order [1,3,2,4]",
        "Untick QUIET, tick TBA, then collapse and re-expand again",
        "Observe the group re-settles to [3,4,1,2] from the new snapshot",
      ],
    })
  })

  // ── Frozen-while-open invariants ──────────────────────────────────────────────

  test("favorites group order is frozen while the panel stays open", async ({ page }) => {
    await goToProperties(page)
    const section = page.getByTestId(SECTION_TESTID)
    for (const id of ["1", "2", "3", "4"]) await star(page, id)

    await tick(page, "1")
    await tick(page, "3")
    await reopenSection(page) // settle to [1,3,2,4]
    expect(await favoritesOrder(page, ["1", "2", "3", "4"])).toEqual(["1", "3", "2", "4"])
    await shotFocused(page, section, SHOT_DIR, "03a-settled")

    // Change ticks WITHOUT reopening — order must not move.
    await untick(page, "1")
    await tick(page, "4")
    expect(await favoritesOrder(page, ["1", "2", "3", "4"])).toEqual(["1", "3", "2", "4"])
    await shotFocused(page, section, SHOT_DIR, "03b-frozen-after-retick")

    story.addScene({
      title: "03 — Order is frozen while the panel stays open",
      images: [join(SHOT_DIR, "03a-settled.png"), join(SHOT_DIR, "03b-frozen-after-retick.png")],
      seeing:
        "Left: settled order [1,3,2,4] with QUIET and APPRAISED checked. " +
        "Right: QUIET unchecked and TBA checked WITHOUT closing the panel — the rows do not move, the layout is identical to the left. The frozen sameness is the proof.",
      steps: [
        "Settle the favorites group to [1,3,2,4]",
        "Without collapsing, untick QUIET and tick TBA",
        "Observe the row order does not change — only the checkboxes do",
      ],
    })
  })

  test("Favorites only selection does not reorder the favorites group until next open", async ({ page }) => {
    await goToProperties(page)
    const section = page.getByTestId(SECTION_TESTID)
    for (const id of ["1", "2", "3", "4"]) await star(page, id)

    await tick(page, "1")
    await tick(page, "3")
    await reopenSection(page) // settle to [1,3,2,4]
    expect(await favoritesOrder(page, ["1", "2", "3", "4"])).toEqual(["1", "3", "2", "4"])
    await shotFocused(page, section, SHOT_DIR, "04a-before-favorites-only")

    // Selecting all favorites changes the selection but must not reorder while open.
    await page.getByTestId(FAVORITES_ONLY_TESTID).click()
    expect(await favoritesOrder(page, ["1", "2", "3", "4"])).toEqual(["1", "3", "2", "4"])
    await shotFocused(page, section, SHOT_DIR, "04b-after-favorites-only")

    story.addScene({
      title: "04 — Button-driven selection does not reorder live",
      images: [join(SHOT_DIR, "04a-before-favorites-only.png"), join(SHOT_DIR, "04b-after-favorites-only.png")],
      seeing:
        "Left: settled order [1,3,2,4] before clicking Favorites only. " +
        "Right: after Favorites only checks all four, the order stays [1,3,2,4] — selection changes do not reorder the group until the next open, even when triggered by a button.",
      steps: [
        "Settle the favorites group to [1,3,2,4]",
        "Click the Favorites only button (selects all favorites)",
        "Observe all four become checked but the row order is unchanged",
      ],
    })
  })

  // ── Edge ──────────────────────────────────────────────────────────────────────

  test("with no ticks the favorites keep their original option order", async ({ page }) => {
    await goToProperties(page)
    const section = page.getByTestId(SECTION_TESTID)
    for (const id of ["1", "2", "3", "4"]) await star(page, id)

    await reopenSection(page)
    expect(await favoritesOrder(page, ["1", "2", "3", "4"])).toEqual(["1", "2", "3", "4"])
    await expect(page.getByTestId(DIVIDER_TESTID)).toBeVisible()
    await shotFocused(page, section, SHOT_DIR, "05-no-ticks-original-order")

    story.addScene({
      title: "05 — With no ticks, favorites keep their original option order",
      images: [join(SHOT_DIR, "05-no-ticks-original-order.png")],
      seeing:
        "Four starred but unchecked statuses sit in original option order [1,2,3,4] above the divider. With an empty ticked snapshot the group is simply the original order — no crash, divider present.",
      steps: [
        "Star QUIET, COMING, APPRAISED, TBA without ticking any",
        "Collapse and re-expand the Status section",
        "Observe the favorites group is in original order with the divider visible",
      ],
    })
  })

  // ── Persistence ────────────────────────────────────────────────────────────────

  test("ticked-first order survives a page reload", async ({ page }) => {
    await goToProperties(page)
    const section = page.getByTestId(SECTION_TESTID)
    for (const id of ["1", "2", "3", "4"]) await star(page, id)
    await tick(page, "1")
    await tick(page, "3")

    await page.reload()
    await expandSideFilterPanel(page)
    await page.getByTestId(SECTION_TESTID).waitFor({ state: "visible" })
    await reopenSection(page) // fresh snapshot from the persisted selection

    expect(await favoritesOrder(page, ["1", "2", "3", "4"])).toEqual(["1", "3", "2", "4"])
    await shotFocused(page, section, SHOT_DIR, "06-after-reload")

    story.addScene({
      title: "06 — Ticked-first order survives a page reload",
      images: [join(SHOT_DIR, "06-after-reload.png")],
      seeing:
        "After a full page reload (F5), the favorites group opens in [1,3,2,4] — ticked QUIET and APPRAISED restored to the top from the persisted selection. No new ordering localStorage key was added; order derives from the existing saved selection at open time.",
      steps: [
        "Star QUIET, COMING, APPRAISED, TBA and tick QUIET + APPRAISED",
        "Reload the page (F5) and reopen the filter panel and Status section",
        "Observe ticked-first order [1,3,2,4] is restored",
      ],
    })
  })

})
