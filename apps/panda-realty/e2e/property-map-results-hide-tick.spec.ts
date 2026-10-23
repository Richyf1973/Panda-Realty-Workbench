// Run: npm run test:e2e:scratch -- --app=panda-realty --spec=apps/panda-realty/e2e/property-map-results-hide-tick.spec.ts --no-bail

import { expect, test, type Page } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { createStory, shotFocused } from "@repo/e2e-utils"

import { e2eAdminCredentials, refreshPandaE2eEnv, signInAsAdmin } from "./helpers/admin-auth"

/**
 * Properties admin — MAP-RESULTS view shows ONLY the hide-from-view tick + the locate-on-map button.
 *
 * Regression: commit e5c5ef17 ("collapse property row actions into an overflow menu") moved the
 * map-results hide/map controls from the legacy `extraActions` slot into `pinnedActions`, but the
 * shared AdminEntityRowActions only renders `pinnedActions` on its responsive path, which is gated on
 * `collapsibleActions.length > 0`. Map-results returns an empty collapsible list, so the component
 * fell through to the legacy path and rendered ONLY edit/delete, silently dropping the hide tick and
 * map button. Per Richard's screenshot (07:21) the map-results row should show ONLY those two
 * controls — no edit, no delete, no overflow.
 *
 *   MV-3   map results show the hide tick THEN the map button, in that order
 *   MV-4   map results drop edit, delete, overflow AND call/reminder/note/meeting — only hide + map
 *   MV-5   narrow table still shows only hide + map (no overflow menu)
 *   MV-6   clearing the map filter restores the FULL action cluster incl edit + delete
 *   MV-8   ticking hide removes the row + shows the removed-from-view note
 *   MV-9   hide tick on EVERY result row (not just the pinned target)
 *   MV-10  Reset returns the hidden comparable
 *   MV-11  hidden rows are client-memory only — reappear after reload; still only hide + map
 *
 * Status-absent / one-line / favourites-unchanged are covered by property-map-filter-results-view.spec.ts.
 * Success factors map to specs/panda-map-results-pinned-only-actions.md ## Manual Verification.
 */

const SHOT_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "screenshots",
  "property-map-results-hide-tick",
)

const story = createStory({
  specUrl: import.meta.url,
  slug: "property-map-results-hide-tick",
})

story.setWhatWasBuilt(
  "Map-area (streetFilter) results rows now show ONLY two controls: the per-row hide-from-view tick " +
    "(tuck a comparable out of the list) and the locate-on-map button (return to the drawn search area " +
    "with the pin). After commit e5c5ef17 collapsed row actions into an overflow menu, these two were " +
    "silently dropped and only edit/delete showed; this restores them and removes edit/delete/overflow " +
    "from the map view entirely. Ticking hide removes a comparable from the on-screen list with a Reset " +
    "in the header; clearing the map filter brings back the full cluster (incl edit/delete); non-map " +
    "views and other apps are unchanged.",
)

const MAP_ROWS = {
  items: [
    {
      id: 9001,
      propertyListId: 9001,
      streetAddress: "80 HOLLYWOOD AVENUE",
      suburb: "BELLMERE",
      state: "QLD",
      postcode: "4500",
      propertyType: "House",
      bed: 4,
      bath: 2,
      car: 2,
      buildingArea: 136,
      landSize: 420,
      salePrice: 385000,
      saleDate: "2021-06-01",
      propertyStatusId: 1,
      combinedOwner: "AARON ROSS UREN",
      owner1name: "AARON ROSS UREN",
      owner1phone: "0400000000",
      owner1email: "aaron@example.com",
      owner2name: null,
      owner3name: null,
      buyerName: null,
      buyerId: null,
      isFavorite: true,
      priceUndisclosed: false,
      excludeFromReport: false,
      updatedAt: "2026-01-01T00:00:00Z",
    },
    {
      id: 9002,
      propertyListId: 9002,
      streetAddress: "4 VALENCIA COURT",
      suburb: "BELLMERE",
      state: "QLD",
      postcode: "4500",
      propertyType: "House",
      bed: 4,
      bath: 2,
      car: 1,
      buildingArea: null,
      landSize: 615,
      salePrice: null,
      saleDate: null,
      propertyStatusId: 2,
      combinedOwner: "VALMA JUNE DAHM",
      owner1name: "VALMA JUNE DAHM",
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
  totalCount: 2,
  limit: 25,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false,
  startCursor: null,
  endCursor: null,
}

const STATUS_LIST_RESPONSE = {
  items: [
    { id: 1, name: "Unconditional" },
    { id: 2, name: "Sold Recently My Patch" },
  ],
  totalCount: 2,
  limit: 100,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false,
  startCursor: null,
  endCursor: null,
}

const STREET_FILTER = encodeURIComponent("Hollywood Avenue~QLD")
const TABLE_SCROLL = "admin-entity-table-scroll--properties"
const LIST_CARD = "admin-entity-list-card--properties"

const HIDE_TICK = (id: number) => `admin-entity-row-hide-from-view--properties--${id}`
const MAP_BUTTON = (id: number) => `property-list-map-button--${id}`
const REMOVED_INDICATOR = "admin-entity-removed-from-view--properties"
const REMOVED_RESET = "admin-entity-removed-from-view-reset--properties"
const EDIT_PREFIX = "admin-entity-row-edit--properties--"
const DELETE_PREFIX = "admin-entity-row-delete--properties--"
const OVERFLOW_PREFIX = "admin-entity-row-actions-overflow--properties--"

// Map-results view shows ONLY the hide tick + locate-on-map button. Everything else — the
// call/email/reminder/note/meeting cluster AND the edit/delete/overflow controls — stays removed.
const REMOVED_ACTION_PREFIXES = [
  "property-list-call-button--",
  "property-list-add-reminder-button--",
  "property-list-add-note-button--",
  "property-list-add-calendar-event-button--",
  EDIT_PREFIX,
  DELETE_PREFIX,
  OVERFLOW_PREFIX,
] as const

async function gotoMapResults(page: Page) {
  await page.goto(`/admin/properties?streetFilter=${STREET_FILTER}`)
  await expect(page.getByTestId(LIST_CARD)).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId(TABLE_SCROLL)).toBeVisible({ timeout: 30_000 })
}

// Per-row action controls render twice (desktop md:flex + mobile md:hidden, CSS-toggled), so the
// testid resolves to 2 elements — take .first() for presence/click/box; keep toHaveCount(0) unscoped.
const hideTick = (page: Page, id: number) => page.getByTestId(HIDE_TICK(id)).first()
const mapButton = (page: Page, id: number) => page.getByTestId(MAP_BUTTON(id)).first()

test.describe("Properties — map-results keeps the hide-from-view tick (desktop)", () => {
  test.beforeEach(async ({ page }) => {
    refreshPandaE2eEnv()
    if (!e2eAdminCredentials) {
      throw new Error("E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set in apps/panda-realty/.env.local")
    }
    await page.setViewportSize({ width: 1280, height: 800 })
    await mkdir(SHOT_DIR, { recursive: true })
    await page.route("**/api/admin/properties**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MAP_ROWS),
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

  test.afterAll(() => {
    story.write()
  })

  // MV-3 — map results show the hide tick THEN the map button, in that order.
  test("MV-3 map results show the hide tick then the map button", async ({ page }) => {
    await gotoMapResults(page)
    const hide = hideTick(page, 9001)
    const map = mapButton(page, 9001)
    await expect(hide, "hide tick must be visible in map results").toBeVisible({ timeout: 15_000 })
    await expect(map, "locate-on-map button must be visible in map results").toBeVisible()

    const hideBox = await hide.boundingBox()
    const mapBox = await map.boundingBox()
    expect(hideBox, "hide tick should have a bounding box").not.toBeNull()
    expect(mapBox, "map button should have a bounding box").not.toBeNull()
    expect(
      hideBox!.x,
      "hide tick should sit to the left of the map button",
    ).toBeLessThan(mapBox!.x)

    await shotFocused(page, page.getByTestId(TABLE_SCROLL), SHOT_DIR, "01-hide-then-map")
    story.addScene({
      title: "01 — Map results show only the hide tick then the map button",
      images: [join(SHOT_DIR, "01-hide-then-map.png")],
      seeing:
        "Each map-results row shows exactly two controls: the hide-from-view tick, then the locate-on-map " +
        "button. Asserted: both visible and the tick's x-position is less than the map button's.",
      steps: ["Open the map results", "Confirm hide tick then map button", "Confirm the order"],
    })
  })

  // MV-4 — only the hide tick + map button remain; edit/delete/overflow and the rest are dropped.
  test("MV-4 map results drop edit, delete, overflow and the other cluster icons", async ({
    page,
  }) => {
    await gotoMapResults(page)
    await expect(hideTick(page, 9001), "hide tick must remain").toBeVisible()
    await expect(
      mapButton(page, 9001),
      "locate-on-map button must remain (go back to the search area with the pin)",
    ).toBeVisible()
    for (const prefix of REMOVED_ACTION_PREFIXES) {
      await expect(
        page.locator(`[data-testid^="${prefix}"]`),
        `${prefix} must be absent in map results (only hide + map allowed)`,
      ).toHaveCount(0)
    }
    await shotFocused(page, page.getByTestId(TABLE_SCROLL), SHOT_DIR, "02-only-hide-and-map")
    story.addScene({
      title: "02 — Map results: only hide + map, no edit/delete/overflow",
      images: [join(SHOT_DIR, "02-only-hide-and-map.png")],
      seeing:
        "Each row shows only the hide tick and the locate-on-map button. The edit, delete and overflow " +
        "controls plus the call/email/reminder/note/meeting icons are all absent.",
      steps: [
        "Open the map results",
        "Confirm only the hide tick and map button are present",
        "Confirm edit, delete and overflow are gone",
      ],
    })
  })

  // MV-5 — a narrow (but still desktop) table shows only hide + map; no overflow menu appears.
  // Width must stay >= 768 and height > 640, else the admin list switches to the mobile-card layout
  // (see useCompactAdminListViewport: width <= 767 OR height <= 640), where there is no desktop table
  // and the hide tick is intentionally not rendered. 820px is narrow enough to crowd the strip while
  // keeping the desktop table; pinned-only rows bypass the overflow collapse regardless of width.
  test("MV-5 narrow table still shows only hide and map, no overflow", async ({ page }) => {
    await page.setViewportSize({ width: 820, height: 800 })
    await gotoMapResults(page)
    await expect(hideTick(page, 9001), "hide tick must remain at a narrow width").toBeVisible({
      timeout: 15_000,
    })
    await expect(mapButton(page, 9001), "map button must remain at a narrow width").toBeVisible()
    await expect(
      page.locator(`[data-testid^="${OVERFLOW_PREFIX}"]`),
      "no overflow menu should appear in map results, even when narrow",
    ).toHaveCount(0)
    await expect(
      page.locator(`[data-testid^="${EDIT_PREFIX}"]`),
      "edit must stay absent at a narrow width",
    ).toHaveCount(0)
  })

  // MV-8 — ticking hide removes the row and shows the removed-from-view indicator.
  test("MV-8 ticking hide removes the comparable and shows the removed note", async ({ page }) => {
    await gotoMapResults(page)
    const hide = hideTick(page, 9001)
    await expect(hide).toBeVisible()
    await shotFocused(page, page.getByTestId(TABLE_SCROLL), SHOT_DIR, "03a-before-hide")

    await hide.click()
    await expect(
      page.getByTestId(HIDE_TICK(9001)),
      "hidden row should leave the table",
    ).toHaveCount(0)
    await expect(
      page.getByTestId(REMOVED_INDICATOR),
      "removed-from-view indicator should appear",
    ).toBeVisible()
    await expect(page.getByTestId(REMOVED_INDICATOR)).toContainText("removed from view")

    await shotFocused(page, page.getByTestId(LIST_CARD), SHOT_DIR, "03b-after-hide")
    story.addScene({
      title: "03 — Tick hide: comparable removed, header shows the count",
      images: [join(SHOT_DIR, "03a-before-hide.png"), join(SHOT_DIR, "03b-after-hide.png")],
      seeing:
        "Left: the comparable row before hiding. Right: after ticking hide, the row leaves the on-screen " +
        "list and the header shows the removed-from-view count with a Reset.",
      steps: ["Open the map results", "Tick the hide control on a row", "Confirm the row leaves and the note shows"],
    })
  })

  // MV-9 — the hide tick renders on EVERY result row, not just the pinned target.
  test("MV-9 every map-results row has its own hide tick", async ({ page }) => {
    await gotoMapResults(page)
    await expect(hideTick(page, 9001)).toBeVisible()
    await expect(hideTick(page, 9002)).toBeVisible()
  })

  // MV-10 — Reset brings the hidden comparable back.
  test("MV-10 Reset returns the hidden comparable", async ({ page }) => {
    await gotoMapResults(page)
    await hideTick(page, 9001).click()
    await expect(page.getByTestId(HIDE_TICK(9001))).toHaveCount(0)
    await page.getByTestId(REMOVED_RESET).click()
    await expect(
      hideTick(page, 9001),
      "Reset should restore the hidden row",
    ).toBeVisible()
    await expect(page.getByTestId(REMOVED_INDICATOR)).toHaveCount(0)
    await shotFocused(page, page.getByTestId(LIST_CARD), SHOT_DIR, "04-after-reset")
    story.addScene({
      title: "04 — Reset restores the hidden comparable",
      images: [join(SHOT_DIR, "04-after-reset.png")],
      seeing: "After clicking Reset, the previously hidden comparable returns and the count note disappears.",
      steps: ["Hide a comparable", "Click Reset in the header", "Confirm the row returns"],
    })
  })

  // MV-6 — clearing the map filter restores the FULL action cluster, including edit + delete.
  test("MV-6 clearing the map filter restores the full cluster incl edit and delete", async ({ page }) => {
    await gotoMapResults(page)
    await expect(page.getByTestId("property-map-filter-trigger")).toContainText("ON")
    await page.getByTestId("property-map-filter-clear").dispatchEvent("click")
    await page.waitForURL((url) => !url.searchParams.has("streetFilter"), { timeout: 30_000 })
    await expect(page.getByTestId(LIST_CARD)).toBeVisible({ timeout: 30_000 })
    // Full cluster back: the hide tick + map button AND the edit/delete controls that map view drops.
    await expect(page.locator(`[data-testid^="property-list-map-button--"]`)).not.toHaveCount(0)
    await expect(page.locator(`[data-testid^="admin-entity-row-hide-from-view--properties--"]`)).not.toHaveCount(0)
    // Off the map the row is back on the responsive path, so edit/delete return — inline when the table
    // is wide, or inside the overflow menu when it is narrow (Radix only mounts menu items when open).
    const editInline = page.locator(`[data-testid^="${EDIT_PREFIX}"]`)
    if ((await editInline.count()) > 0) {
      await expect(editInline, "edit must return off the map").not.toHaveCount(0)
      await expect(
        page.locator(`[data-testid^="${DELETE_PREFIX}"]`),
        "delete must return off the map",
      ).not.toHaveCount(0)
    } else {
      const overflow = page.locator(`[data-testid^="${OVERFLOW_PREFIX}"]`).first()
      await expect(overflow, "collapsed off-map row exposes an overflow menu").toBeVisible()
      await overflow.click()
      await expect(
        page.locator(`[data-testid^="${EDIT_PREFIX}"]`).first(),
        "edit must return off the map (in the overflow menu)",
      ).toBeVisible()
      await expect(
        page.locator(`[data-testid^="${DELETE_PREFIX}"]`).first(),
        "delete must return off the map (in the overflow menu)",
      ).toBeVisible()
    }
    await shotFocused(page, page.getByTestId(LIST_CARD), SHOT_DIR, "05-cluster-restored")
    story.addScene({
      title: "05 — Clearing the map restores the full action cluster",
      images: [join(SHOT_DIR, "05-cluster-restored.png")],
      seeing:
        "After Clear, streetFilter drops from the URL and the default view returns with the full action " +
        "cluster (hide tick, map button, edit and delete plus the call/email/reminder/note/meeting icons).",
      steps: ["Open the map results", "Click Clear", "Confirm the full cluster incl edit/delete is back"],
    })
  })

  // MV-11 — hidden rows are client-memory only; a reload reappears them, still with only hide + map.
  test("MV-11 hidden rows reappear after a reload, still showing only hide and map", async ({ page }) => {
    await gotoMapResults(page)
    await hideTick(page, 9001).click()
    await expect(page.getByTestId(HIDE_TICK(9001))).toHaveCount(0)
    await page.reload()
    await expect(page.getByTestId(TABLE_SCROLL)).toBeVisible({ timeout: 30_000 })
    await expect(
      hideTick(page, 9001),
      "hide is client-memory only, so the row returns after reload",
    ).toBeVisible()
    await expect(mapButton(page, 9001), "map button still present after reload").toBeVisible()
    await expect(
      page.locator(`[data-testid^="${EDIT_PREFIX}"]`),
      "edit must stay absent after reload",
    ).toHaveCount(0)
    await expect(
      page.locator(`[data-testid^="${DELETE_PREFIX}"]`),
      "delete must stay absent after reload",
    ).toHaveCount(0)
  })
})
