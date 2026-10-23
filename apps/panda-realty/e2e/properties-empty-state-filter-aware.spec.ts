// Run: npm run test:e2e:scratch -- --app=panda-realty --spec=apps/panda-realty/e2e/properties-empty-state-filter-aware.spec.ts --no-bail
//
// Feature: filter-aware empty state for admin entity lists (spec: specs/admin-list-empty-state-filter-aware.md).
//
// Richard's report: the Properties list came up empty ("No properties yet.") even though the database
// is full. Root cause: the Favorites toggle defaults ON and a persisted Status selection AND-combines
// with it; when the chosen status has zero favorites, the list is empty and the static label reads as
// an empty database with no way to recover.
//
// These tests assert the fix: when the list is empty AND the active filters DIFFER from the entity
// defaults, the footer shows "No matches for the current filters." + a Clear filters button that resets
// to defaults (favorites view returns). At pure defaults with 0 rows, the plain emptyLabel still shows.
//
// Status side-panel mock keys + reveal pattern: discoveries/basics/panda-status-side-filter-e2e-mock.md.

import { expect, test, type Page } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { createStory, shotFocused } from "@repo/e2e-utils"

import { e2eAdminCredentials, refreshPandaE2eEnv, signInAsAdmin } from "./helpers/admin-auth"

const SHOT_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "screenshots",
  "properties-empty-state-filter-aware",
)

const story = createStory({
  specUrl: import.meta.url,
  slug: "properties-empty-state-filter-aware",
})

story.setWhatWasBuilt(
  "Filter-aware empty state for admin entity lists. When a list returns zero rows AND the active " +
    "filters differ from the entity defaults, the footer shows 'No matches for the current filters.' " +
    "plus a Clear filters button that resets to defaults (e.g. panda-realty Properties returns to its " +
    "favorites home view). At pure defaults with zero rows, the static emptyLabel ('No properties " +
    "yet.') still shows with no button.",
)

// property-status: idColumn.jsonKey = "propertyStatusId", relation label = propertyStatusCode.
// "Form 6 Signed" stands in for a status that has ZERO favorited properties.
const STATUS_LIST_RESPONSE = {
  items: [
    { propertyStatusId: 1, propertyStatusCode: "Appraised", propertyStatus: "Appraised", isShownOnFavorite: true, pipeline: "sellers" },
    { propertyStatusId: 20, propertyStatusCode: "Form 6 Signed", propertyStatus: "Form 6 Signed", isShownOnFavorite: true, pipeline: "sellers" },
  ],
  totalCount: 2,
  limit: 100,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false,
  startCursor: null,
  endCursor: null,
}

const ONE_FAVORITE_ROW = {
  items: [
    {
      id: 7001,
      propertyListId: 7001,
      streetAddress: "1 ABBEY ROAD",
      suburb: "CABOOLTURE",
      state: "QLD",
      postcode: "4510",
      propertyType: "House",
      bed: 3,
      bath: 1,
      car: 1,
      buildingArea: 120,
      landSize: 600,
      salePrice: 350000,
      saleDate: "2020-01-01",
      propertyStatusId: 1,
      combinedOwner: "TEST OWNER",
      owner1name: "TEST OWNER",
      owner1phone: null,
      owner1email: null,
      owner2name: null,
      owner3name: null,
      buyerName: null,
      buyerId: null,
      isFavorite: true,
      priceUndisclosed: false,
      excludeFromReport: false,
      updatedAt: "2026-01-01T00:00:00Z",
    },
  ],
  totalCount: 1,
  limit: 25,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false,
  startCursor: null,
  endCursor: null,
}

const EMPTY_LIST = {
  items: [],
  totalCount: 0,
  limit: 25,
  totalPages: 0,
  hasNextPage: false,
  hasPreviousPage: false,
  startCursor: null,
  endCursor: null,
}

const STATUS_LS_KEY = "panda-realty:list-filter:properties:propertyStatusId:values"
const STATUS_GROUP = "admin-entity-list-relation-filter--properties--propertyStatusId"
const STATUS_TOGGLE = "admin-entity-list-relation-filter-toggle--properties--propertyStatusId"
const SIDE_PANEL_TOGGLE = "admin-entity-filter-side-panel-toggle--properties"
const LIST_CARD = "admin-entity-list-card--properties"
const EMPTY_FOOTER = "admin-entity-list-empty--properties"
const EMPTY_CLEAR_BTN = "admin-entity-list-empty-clear-filters--properties"
const REFRESH_BTN = "admin-entity-list-refresh--properties"

/**
 * Default route: a search/status query that selects "Form 6 Signed" (propertyStatusId=20) returns an
 * empty list (that status has no favorites); anything else returns one favorite row. This reproduces
 * "Favorites ON + a status with zero favorites = empty" without needing real seed data.
 */
async function routeProperties(page: Page) {
  await page.route("**/api/admin/properties**", (route) => {
    const url = new URL(route.request().url())
    const status = url.searchParams.get("propertyStatusId")
    // The properties general-search box drives the `generalSearch` append-where param (not `search`).
    const search = (url.searchParams.get("generalSearch") ?? "").trim()
    const empty = status === "20" || search === "zzznomatch"
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(empty ? EMPTY_LIST : ONE_FAVORITE_ROW),
    })
  })
}

/** Always-empty route for the pure-defaults-empty edge case. The caller first `unroute`s the
 *  beforeEach properties handler, then registers this so every default query refetches into empty. */
async function routePropertiesAlwaysEmpty(page: Page) {
  await page.route("**/api/admin/properties**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_LIST) }),
  )
}

async function revealStatusGroup(page: Page) {
  const group = page.getByTestId(STATUS_GROUP)
  await expect(async () => {
    if (!(await group.isVisible().catch(() => false))) {
      const sideToggle = page.getByTestId(SIDE_PANEL_TOGGLE)
      if (await sideToggle.isVisible().catch(() => false)) {
        await sideToggle.click()
      }
    }
    await expect(group).toBeVisible({ timeout: 2_000 })
  }).toPass({ timeout: 20_000 })
  const toggle = page.getByTestId(STATUS_TOGGLE)
  if ((await toggle.getAttribute("aria-expanded")) === "false") {
    await toggle.click()
  }
}

function form6Checkbox(page: Page) {
  return page
    .getByTestId(STATUS_GROUP)
    .locator("label")
    .filter({ hasText: /^Form 6 Signed$/ })
    .getByRole("checkbox")
}

async function gotoPropertiesClean(page: Page) {
  await page.goto("/admin/properties", { waitUntil: "domcontentloaded" })
  await expect(page.getByTestId(LIST_CARD)).toBeVisible({ timeout: 30_000 })
  await page.evaluate((k) => window.localStorage.removeItem(k), STATUS_LS_KEY)
}

async function selectForm6AndGoEmpty(page: Page) {
  await revealStatusGroup(page)
  const form6 = form6Checkbox(page)
  await form6.check()
  await expect(form6, "Form 6 Signed should be checked").toBeChecked()
  await expect
    .poll(() => new URL(page.url()).searchParams.get("propertyStatusId"), { timeout: 10_000 })
    .toBe("20")
  await expect(page.getByTestId(EMPTY_FOOTER), "list should be empty for a zero-favorite status").toBeVisible({
    timeout: 15_000,
  })
}

test.describe("Properties — filter-aware empty state", () => {
  test.setTimeout(120_000)

  test.beforeEach(async ({ page }) => {
    refreshPandaE2eEnv()
    if (!e2eAdminCredentials) {
      throw new Error("E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set in apps/panda-realty/.env.local")
    }
    await page.setViewportSize({ width: 1400, height: 900 })
    await mkdir(SHOT_DIR, { recursive: true })
    await page.route("**/api/admin/property-status**", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(STATUS_LIST_RESPONSE) }),
    )
    await routeProperties(page)
    await signInAsAdmin(page)
  })

  test.afterAll(() => {
    story.write()
  })

  // MV-1
  test("default load shows favorites, not an empty list", async ({ page }) => {
    await gotoPropertiesClean(page)
    // Positive proof the client load settled on the mocked favorites row (not just empty-during-load).
    await expect(page.getByText("1 ABBEY ROAD"), "the favorites row is shown").toBeVisible({
      timeout: 30_000,
    })
    await expect(page.getByTestId(EMPTY_FOOTER), "default favorites view should not be empty").toHaveCount(0)
    await shotFocused(page, page.getByTestId(LIST_CARD), SHOT_DIR, "01-default-favorites")
    story.addScene({
      title: "01 — Default load: favorites view (not empty)",
      images: [join(SHOT_DIR, "01-default-favorites.png")],
      seeing: "At /admin/properties the favorites view renders a row; no empty footer is shown.",
      steps: ["Open /admin/properties", "Confirm the list shows a row and no empty footer"],
    })
  })

  // MV-2 + MV-3
  test("status with no favorites shows filter-aware empty message + Clear button, not the plain label", async ({
    page,
  }) => {
    await gotoPropertiesClean(page)
    await selectForm6AndGoEmpty(page)

    const footer = page.getByTestId(EMPTY_FOOTER)
    await expect(footer, "empty footer shows the filter-aware copy").toContainText(
      "No matches for the current filters.",
    )
    await expect(footer, "must NOT read as an empty database").not.toContainText("No properties yet.")
    await expect(
      page.getByTestId(EMPTY_CLEAR_BTN),
      "a Clear filters button is offered to recover",
    ).toBeVisible()

    await shotFocused(page, footer, SHOT_DIR, "02-filter-aware-empty")
    story.addScene({
      title: "02 — Status with no favorites: filter-aware empty state",
      images: [join(SHOT_DIR, "02-filter-aware-empty.png")],
      seeing:
        "With Favorites ON and Form 6 Signed selected (zero favorites), the footer reads 'No matches " +
        "for the current filters.' with a Clear filters button — not 'No properties yet.'",
      steps: [
        "Open /admin/properties (Favorites ON by default)",
        "Select the Form 6 Signed status (no favorites)",
        "Confirm the empty footer shows the filter-aware message and a Clear filters button",
      ],
    })
  })

  // MV-4
  test("Clear filters resets to defaults (favorites view returns, not clear-to-all)", async ({ page }) => {
    await gotoPropertiesClean(page)
    await selectForm6AndGoEmpty(page)

    await page.getByTestId(EMPTY_CLEAR_BTN).click()

    // propertyStatusId leaves the URL...
    await expect
      .poll(() => new URL(page.url()).searchParams.has("propertyStatusId"), { timeout: 15_000 })
      .toBe(false)
    // ...and the boolean filter is reset to the entity DEFAULT (favorites), NOT to "all".
    expect(
      new URL(page.url()).searchParams.get("isFavorite"),
      "reset-to-defaults must not set isFavorite=all (that is the toolbar Clear behavior)",
    ).not.toBe("all")
    // The favorites row returns and the empty footer is gone.
    await expect(page.getByTestId(EMPTY_FOOTER)).toHaveCount(0)
    await revealStatusGroup(page)
    await expect(form6Checkbox(page), "Status selection cleared after reset").not.toBeChecked()

    await shotFocused(page, page.getByTestId(LIST_CARD), SHOT_DIR, "03-cleared-back-to-favorites")
    story.addScene({
      title: "03 — Clear filters: back to the favorites home view",
      images: [join(SHOT_DIR, "03-cleared-back-to-favorites.png")],
      seeing: "After Clear filters the Status selection is gone, the favorites row is back, and the URL no longer carries propertyStatusId or isFavorite=all.",
      steps: ["From the empty state, click Clear filters", "Confirm the favorites view returns and Status is unchecked"],
    })
  })

  // MV-5
  // Client-driven (not a fresh SSR load): the initial /admin/properties render is server-side and
  // its data fetch is NOT interceptable by page.route, so a fresh default navigation would hang on
  // the real query. Instead load normally (mock → one row), then swap the route to always-empty and
  // click Refresh to refetch into the empty state while filters sit at their defaults.
  test("pure defaults with zero rows shows the plain label and no Clear button", async ({ page }) => {
    await gotoPropertiesClean(page)
    // Wait out the initial load: Refresh is disabled while loading/refetching.
    const refresh = page.getByTestId(REFRESH_BTN)
    await expect(refresh).toBeEnabled({ timeout: 30_000 })

    // Now make the same default query return empty, and refetch via Refresh (filters stay at defaults).
    await page.unroute("**/api/admin/properties**")
    await routePropertiesAlwaysEmpty(page)
    await refresh.click()

    const footer = page.getByTestId(EMPTY_FOOTER)
    await expect(footer, "empty at defaults shows the static label").toBeVisible({ timeout: 30_000 })
    await expect(footer).toContainText("No properties yet.")
    await expect(
      page.getByTestId(EMPTY_CLEAR_BTN),
      "no Clear button when filters are already at defaults",
    ).toHaveCount(0)

    await shotFocused(page, footer, SHOT_DIR, "04-pure-defaults-empty")
    story.addScene({
      title: "04 — Pure defaults, zero rows: plain label only",
      images: [join(SHOT_DIR, "04-pure-defaults-empty.png")],
      seeing: "At defaults with no matching rows, the footer shows 'No properties yet.' and no Clear filters button.",
      steps: ["Open /admin/properties with no rows at defaults", "Confirm the plain label shows and no Clear button"],
    })
  })

  // MV-6
  // Client-driven: load default, then submit a non-matching search so the refetch (mocked empty)
  // applies without depending on a fresh SSR navigation.
  test("a non-matching search also triggers the filter-aware empty message", async ({ page }) => {
    await gotoPropertiesClean(page)
    await expect(page.getByText("1 ABBEY ROAD")).toBeVisible({ timeout: 30_000 })

    await page.getByTestId("properties-general-search-input").fill("zzznomatch")
    await page.getByTestId("properties-general-search-submit").click()

    const footer = page.getByTestId(EMPTY_FOOTER)
    await expect(footer).toBeVisible({ timeout: 30_000 })
    await expect(footer).toContainText("No matches for the current filters.")
    await expect(page.getByTestId(EMPTY_CLEAR_BTN)).toBeVisible()
  })

  // MV-8
  test("empty + filter-aware message survive a reload (status persisted)", async ({ page }) => {
    await gotoPropertiesClean(page)
    await selectForm6AndGoEmpty(page)

    await page.reload({ waitUntil: "domcontentloaded" })
    await expect(page.getByTestId(LIST_CARD)).toBeVisible({ timeout: 30_000 })

    expect(await page.evaluate((k) => window.localStorage.getItem(k), STATUS_LS_KEY)).toContain("20")
    const footer = page.getByTestId(EMPTY_FOOTER)
    await expect(footer, "empty + message restored after reload").toBeVisible({ timeout: 30_000 })
    await expect(footer).toContainText("No matches for the current filters.")
    await expect(page.getByTestId(EMPTY_CLEAR_BTN)).toBeVisible()

    // Clear still recovers after reload.
    await page.getByTestId(EMPTY_CLEAR_BTN).click()
    await expect(page.getByTestId(EMPTY_FOOTER)).toHaveCount(0, { timeout: 15_000 })
  })

  // MV-7: NOT AUTOMATED here — the cross-entity/cross-app generality of listFiltersDifferFromDefaults
  // is covered by a Vitest unit test in the green phase (a panda-only E2E cannot exercise an entity
  // whose boolean default segment is "all").

  // MV-9: NOT AUTOMATED — the toolbar Clear control has no stable testid and its clear-to-"all"
  // behavior is unchanged by this work (handler clearAllListFilters untouched). Re-verify manually.
})
