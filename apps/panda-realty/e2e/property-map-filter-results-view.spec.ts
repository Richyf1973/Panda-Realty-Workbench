// Run: npm run test:e2e:scratch -- --app=panda-realty --spec=apps/panda-realty/e2e/property-map-filter-results-view.spec.ts --no-bail

import { expect, test, type Page } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { createStory, shotFocused } from "@repo/e2e-utils"

import { e2eAdminCredentials, refreshPandaE2eEnv, signInAsAdmin } from "./helpers/admin-auth"

/**
 * Properties admin — MAP-RESULTS view cleanup (follow-up to the "map shows the table" change).
 *
 * When the map-area filter (`streetFilter`) is active, the results table must read like the normal
 * one-line table, NOT the compact stacked quick comparison table:
 *   MV-1  table renders (not the quick-card panel)                       [regression guard]
 *   MV-2  Street + Suburb each on a single line (no line-clamp-2)        [RED on current compact code]
 *   MV-3  Owner does not bleed under the frozen Street column on scroll  [RED / visual-confirm]
 *   MV-4+5 no Status column, but the comparable columns remain           [RED — Status present today]
 *   MV-6+7 extra-action icon cluster removed, edit + delete kept         [RED — icons present today]
 *   MV-8  row-locator + Street stay frozen-left on horizontal scroll     [RED — Status still frozen today]
 *   MV-13 the cleanups survive a reload                                  [RED]
 * Scope guards (map OFF — green before AND after, prove isolation):
 *   MV-9  default shows the quick-card view
 *   MV-10/11/12 a non-map table view keeps Status + the icon cluster
 *   MV-14 Clear restores the default view
 *
 * Success factors map 1:1 to specs/panda-map-filter-results-view-cleanup.md ## Manual Verification.
 */

const SHOT_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "screenshots",
  "property-map-filter-results-view",
)

const story = createStory({
  specUrl: import.meta.url,
  slug: "property-map-filter-results-view",
})

story.setWhatWasBuilt(
  "Cleaned up the panda-realty map-area-filter (streetFilter) results table so it reads like the " +
    "normal one-line property table instead of the compact stacked quick comparison table: Street and " +
    "Suburb render on a single line, the owner no longer bleeds under the frozen Street column, the " +
    "Status column and the right-side extra-action icon cluster are removed in this view (edit/delete " +
    "kept), and the comparable columns (bed/bath/car/building/land/price/sold) remain. Scoped to the " +
    "map view only — the favourites cards, search, and bed/bath/type-filtered list are unchanged.",
)

const LONG_STREET_1 = "80 HOLLYWOOD AVENUE EXTENSION ROAD"
const LONG_OWNER_1 = "AARON ROSS UREN / SALLIE-ANN MICHELLE UREN"

const MAP_ROWS = {
  items: [
    {
      id: 9001,
      propertyListId: 9001,
      streetAddress: LONG_STREET_1,
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
      combinedOwner: LONG_OWNER_1,
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
const QUICK_CARDS = "admin-entity-quick-cards-scroll--properties"
const COMPARABLE_KEYS = [
  "streetAddress",
  "suburb",
  "combinedOwner",
  "bed",
  "bath",
  "car",
  "buildingArea",
  "landSize",
  "salePrice",
  "saleDate",
] as const

// Dropped in the map-results view. NOTE: the locate-on-map button and the hide tick are KEPT
// (see property-map-results-hide-tick.spec.ts), so they are intentionally not in this list.
const EXTRA_ACTION_PREFIXES = [
  "property-list-call-button--",
  "property-list-add-reminder-button--",
  "property-list-add-note-button--",
  "property-list-add-calendar-event-button--",
] as const

function header(page: Page, columnId: string) {
  return page.getByTestId(`admin-entity-col-header--properties--${columnId}`)
}

/** The <td> that wraps a body cell for `key` (the clamp / sticky classes live on the td). */
function bodyCellTd(page: Page, key: string) {
  return page
    .locator(
      `td:has([data-testid^="admin-entity-row-cell--properties--"][data-testid$="--${key}"])`,
    )
    .first()
}

async function gotoMapResults(page: Page) {
  await page.goto(`/admin/properties?streetFilter=${STREET_FILTER}`)
  await expect(page.getByTestId("admin-entity-list-card--properties")).toBeVisible({
    timeout: 30_000,
  })
  await expect(page.getByTestId(TABLE_SCROLL)).toBeVisible({ timeout: 30_000 })
}

test.describe("Properties — map-results view cleanup (desktop)", () => {
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

  // MV-1 — regression guard (already green): the map shows the table, not the card panel.
  test("MV-1 map filter active renders the properties table not the quick-card panel", async ({
    page,
  }) => {
    await gotoMapResults(page)
    await expect(page.getByTestId(QUICK_CARDS)).toHaveCount(0)
    await shotFocused(page, page.getByTestId(TABLE_SCROLL), SHOT_DIR, "01-map-table")
    story.addScene({
      title: "01 — Map filter active renders the table (not cards)",
      images: [join(SHOT_DIR, "01-map-table.png")],
      seeing: "The map-area results render as a table; the quick-card panel is absent.",
      steps: ["Open /admin/properties?streetFilter=...", "See the results table, no card panel"],
    })
  })

  // MV-2 — Street + Suburb each on a single line (no 2-line wrap). RED on current compact transform.
  test("MV-2 map results render Street and Suburb each on a single line", async ({ page }) => {
    await gotoMapResults(page)
    const streetTd = bodyCellTd(page, "streetAddress")
    const suburbTd = bodyCellTd(page, "suburb")
    await expect(streetTd).toBeVisible()
    await expect(suburbTd).toBeVisible()

    const streetClamp = await streetTd.evaluate((el) => getComputedStyle(el).webkitLineClamp)
    const suburbClamp = await suburbTd.evaluate((el) => getComputedStyle(el).webkitLineClamp)
    // Compact quick transform sets line-clamp-2 → "2". The one-line table must not clamp to 2 lines.
    expect(streetClamp, "Street cell should not be clamped to 2 lines").not.toBe("2")
    expect(suburbClamp, "Suburb cell should not be clamped to 2 lines").not.toBe("2")

    await shotFocused(page, page.getByTestId(TABLE_SCROLL), SHOT_DIR, "02-one-line")
    story.addScene({
      title: "02 — Street and Suburb on a single line",
      images: [join(SHOT_DIR, "02-one-line.png")],
      seeing:
        "The long street address and suburb each sit on one line (no 2-line wrap/stacking). " +
        `Asserted: webkit-line-clamp of the Street/Suburb cells is not "2".`,
      steps: ["Open the map results", "Inspect the Street and Suburb cells", "Confirm single-line rendering"],
    })
  })

  // MV-3 — Owner must not bleed under the frozen Street column when scrolled right.
  // NOTE: the bleed is partly a paint/z-index effect; if headless measurement does not reproduce it,
  // this is confirmed visually in /visual-debug (see spec). The opaque-background assertion is the
  // behavioural proxy that the frozen Street cell hides scrolled content.
  test("MV-3 map results Owner column does not overlap the frozen Street column", async ({
    page,
  }) => {
    await gotoMapResults(page)
    const scroll = page.getByTestId(TABLE_SCROLL)
    await scroll.evaluate((el) => {
      el.scrollLeft = el.scrollWidth
    })
    const streetTd = bodyCellTd(page, "streetAddress")
    await expect(streetTd).toBeVisible()
    const bg = await streetTd.evaluate((el) => getComputedStyle(el).backgroundColor)
    // An opaque (non-transparent) background means the sticky Street cell paints over scrolled cells.
    expect(bg, "Frozen Street cell must have an opaque background").not.toBe("rgba(0, 0, 0, 0)")
    expect(bg).not.toBe("transparent")

    await shotFocused(page, page.getByTestId(TABLE_SCROLL), SHOT_DIR, "03-scrolled-no-bleed")
    story.addScene({
      title: "03 — Scrolled right: Owner does not bleed under frozen Street",
      images: [join(SHOT_DIR, "03-scrolled-no-bleed.png")],
      seeing:
        "After scrolling the table right, the frozen Street column keeps an opaque background and the " +
        "owner text does not show through underneath it.",
      steps: ["Open the map results", "Scroll the table fully right", "Confirm no owner text bleeds under Street"],
    })
  })

  // MV-4+5 — no Status column, comparable columns retained. RED — Status present today.
  test("MV-4-5 map results omit the Status column but keep the comparable columns", async ({
    page,
  }) => {
    await gotoMapResults(page)
    await expect(
      header(page, "propertyStatusId"),
      "Status column must be absent in the map results",
    ).toHaveCount(0)
    for (const key of COMPARABLE_KEYS) {
      await expect(header(page, key), `comparable column ${key} should be present`).toHaveCount(1)
    }
    await shotFocused(page, page.getByTestId(TABLE_SCROLL), SHOT_DIR, "04-no-status")
    story.addScene({
      title: "04 — No Status column, comparable columns kept",
      images: [join(SHOT_DIR, "04-no-status.png")],
      seeing:
        "The Sts/Status column is gone; Street, Suburb, Owner, B, Bt, C, Bld, Land Size, Price, Sold remain.",
      steps: ["Open the map results", "Confirm no Status header", "Confirm the comparable headers exist"],
    })
  })

  // MV-6+7 — call/reminder/note/meeting cluster removed; edit + delete kept. The locate-on-map button
  // and hide tick are KEPT (asserted in property-map-results-hide-tick.spec.ts).
  test("MV-6-7 map results remove the extra-action icons but keep edit and delete", async ({
    page,
  }) => {
    await gotoMapResults(page)
    for (const prefix of EXTRA_ACTION_PREFIXES) {
      await expect(
        page.locator(`[data-testid^="${prefix}"]`),
        `extra-action ${prefix} should be removed in map results`,
      ).toHaveCount(0)
    }
    await expect(
      page.locator(`[data-testid^="admin-entity-row-edit--properties--"]`),
      "edit control must remain",
    ).not.toHaveCount(0)
    await expect(
      page.locator(`[data-testid^="admin-entity-row-delete--properties--"]`),
      "delete control must remain",
    ).not.toHaveCount(0)

    await shotFocused(page, page.getByTestId(TABLE_SCROLL), SHOT_DIR, "05-icons-removed")
    story.addScene({
      title: "05 — Call/reminder/note/meeting removed, edit/delete kept",
      images: [join(SHOT_DIR, "05-icons-removed.png")],
      seeing:
        "The call/email/reminder/note/meeting icons are gone from each row; the standard edit and delete " +
        "controls remain. The locate-on-map button and the hide-from-view tick are kept (see " +
        "property-map-results-hide-tick.spec.ts).",
      steps: ["Open the map results", "Confirm call/reminder/note/meeting are gone", "Confirm edit + delete remain"],
    })
  })

  // MV-8 — row-locator + Street stay frozen on horizontal scroll; Status no longer a frozen column.
  test("MV-8 map results keep row-locator and Street frozen on horizontal scroll", async ({
    page,
  }) => {
    await gotoMapResults(page)
    const scroll = page.getByTestId(TABLE_SCROLL)
    await scroll.evaluate((el) => {
      el.scrollLeft = el.scrollWidth
    })
    const rowLinksHeader = header(page, "row-links")
    const streetHeader = header(page, "streetAddress")
    await expect(streetHeader).toBeVisible()
    const streetPos = await streetHeader.evaluate((el) => getComputedStyle(el).position)
    expect(streetPos, "Street header should be sticky-left").toBe("sticky")
    if ((await rowLinksHeader.count()) > 0) {
      const rowLinksPos = await rowLinksHeader.evaluate((el) => getComputedStyle(el).position)
      expect(rowLinksPos, "row-links header should be sticky-left").toBe("sticky")
    }
    // Status is removed in this view, so it is not a frozen column either.
    await expect(header(page, "propertyStatusId")).toHaveCount(0)

    await shotFocused(page, page.getByTestId(TABLE_SCROLL), SHOT_DIR, "06-frozen-scroll")
    story.addScene({
      title: "06 — Street frozen on horizontal scroll (Status no longer frozen)",
      images: [join(SHOT_DIR, "06-frozen-scroll.png")],
      seeing: "Scrolled right, the row-locator and Street columns stay pinned; there is no Status column.",
      steps: ["Open the map results", "Scroll the table right", "Confirm Street stays frozen, no Status"],
    })
  })

  // MV-13 — the cleanups survive a reload (URL keeps streetFilter). RED.
  test("MV-13 map results cleanups survive a reload", async ({ page }) => {
    await gotoMapResults(page)
    await page.reload()
    await expect(page.getByTestId(TABLE_SCROLL)).toBeVisible({ timeout: 30_000 })
    await expect(header(page, "propertyStatusId")).toHaveCount(0)
    // The dropped icons stay dropped after reload (reminder is representative). The locate-on-map
    // button and hide tick remain kept — covered by property-map-results-hide-tick.spec.ts.
    await expect(page.locator(`[data-testid^="property-list-add-reminder-button--"]`)).toHaveCount(0)
    await shotFocused(page, page.getByTestId(TABLE_SCROLL), SHOT_DIR, "09-after-reload")
    story.addScene({
      title: "09 — Cleanups survive a reload",
      images: [join(SHOT_DIR, "09-after-reload.png")],
      seeing:
        "After reloading with the map filter still in the URL, the map-results table persists with no Status " +
        "column and the dropped icons (call/reminder/note/meeting) still gone.",
      steps: ["Open the map results", "Reload the page (URL keeps streetFilter)", "Confirm no Status column and the dropped icons stay gone"],
    })
  })

  // ── Scope guards — map OFF; green before AND after (prove the change is scoped to streetFilter) ──

  // MV-9 — a non-map quick-card trigger (Favourites on + property-type) still shows the cards.
  // (The default /admin/properties with no narrowing filter shows the favourites TABLE, not cards —
  // quick cards require a non-map narrowing filter or search. See properties-quick-card-suppression.spec.ts.)
  test("MV-9 a non-map quick-card trigger still shows the quick-card view", async ({ page }) => {
    await page.goto(`/admin/properties?isFavorite=true&propertyType=House`)
    await expect(page.getByTestId("admin-entity-list-card--properties")).toBeVisible({
      timeout: 30_000,
    })
    await expect(page.getByTestId(QUICK_CARDS)).toBeVisible({ timeout: 30_000 })
    await expect(page.getByTestId(TABLE_SCROLL)).toHaveCount(0)
    await shotFocused(page, page.getByTestId("admin-entity-list-card--properties"), SHOT_DIR, "07-cards")
    story.addScene({
      title: "07 — Map off: quick-card view unchanged",
      images: [join(SHOT_DIR, "07-cards.png")],
      seeing:
        "With a non-map narrowing filter (Favourites on + property-type) and no map filter, the quick-card " +
        "panel still shows — the map cleanup did not touch the card view.",
      steps: ["Open /admin/properties?isFavorite=true&propertyType=House", "Confirm the quick-card panel shows, no table"],
    })
  })

  // MV-10/11/12 — a non-map table view keeps Status + the extra-action icon cluster.
  test("MV-10-12 non-map table view keeps the Status column and the extra-action icons", async ({
    page,
  }) => {
    await page.goto(`/admin/properties?isFavorite=all`)
    await expect(page.getByTestId("admin-entity-list-card--properties")).toBeVisible({
      timeout: 30_000,
    })
    await expect(page.getByTestId(TABLE_SCROLL)).toBeVisible({ timeout: 30_000 })
    await expect(header(page, "propertyStatusId"), "Status column kept off the map").toHaveCount(1)
    await expect(
      page.locator(`[data-testid^="property-list-map-button--"]`),
      "extra-action icons kept off the map",
    ).not.toHaveCount(0)
    await shotFocused(page, page.getByTestId(TABLE_SCROLL), SHOT_DIR, "08-scope-guard")
    story.addScene({
      title: "08 — Non-map table view keeps Status + icons",
      images: [join(SHOT_DIR, "08-scope-guard.png")],
      seeing:
        "A non-map table view (Favourites off) still shows the Status column and the right-side icon cluster — " +
        "proving the removals are scoped to the map filter only.",
      steps: ["Open /admin/properties?isFavorite=all", "Confirm Status header present", "Confirm icons present"],
    })
  })

  // MV-14 — Clear drops streetFilter and the default view returns.
  // Keep the clear-click flow free of any intervening action (screenshot/scroll): this control is a
  // fragile React island — the proven pattern dispatches the click immediately after asserting ON.
  test("MV-14 clearing the map filter restores the default view", async ({ page }) => {
    await gotoMapResults(page)
    await expect(page.getByTestId("property-map-filter-trigger")).toContainText("ON")
    await page.getByTestId("property-map-filter-clear").dispatchEvent("click")
    await page.waitForURL((url) => !url.searchParams.has("streetFilter"), { timeout: 30_000 })
    await expect(page.getByTestId("property-map-filter-trigger")).not.toContainText("ON")
    await shotFocused(page, page.getByTestId("admin-entity-list-card--properties"), SHOT_DIR, "10-cleared")
    story.addScene({
      title: "10 — Clearing the map filter restores the default view",
      images: [join(SHOT_DIR, "10-cleared.png")],
      seeing:
        "After clicking the map Clear button, streetFilter is dropped from the URL and the trigger no longer " +
        "reads ON — the default favourites view returns (Status column and the icon cluster are back).",
      steps: ["Open the map results", "Click the map Clear button", "Confirm streetFilter is gone and the default view returns"],
    })
  })
})
