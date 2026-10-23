/**
 * Property Map Filter — pin the target (anchor) property to row 1  ·  FULL VERIFICATION STORY
 *
 * The property whose row map icon is tapped becomes the "point of interest". After drawing a
 * polygon and applying the map-area filter, that source property is force-included and pinned to
 * row 1 of the filtered results, regardless of favourites or condition-due order. The client
 * carries the anchor via a `pinTopId` URL param alongside `streetFilter`.
 *
 * This spec covers EVERY Manual Verification step in
 * specs/panda-realty-map-filter-pin-target-to-top.md:
 *   MV-1/2  Row map button → polygon → URL + request carry pinTopId & streetFilter
 *   MV-3/4  Anchor pinned to row 1 (vs buried without the pin) with comparables below
 *   MV-5    Favourites irrelevant — a non-favourite anchor still sits at row 1
 *   MV-6    Overpass missed the anchor street — it is still force-included at row 1
 *   MV-7    Pagination — the anchor appears only on page 1, never duplicated on page 2
 *   MV-8    No streets found → error in dialog, neither param set
 *   MV-9    Clear → both streetFilter and pinTopId removed
 *   MV-10   Toolbar-initiated filter carries no pin
 *   MV-11   Reload with pinTopId in URL persists the pin to the request
 *
 * Ordering scenes use a request-driven mock: the mocked /api/admin/properties returns the anchor
 * BURIED when the request lacks pinTopId and at ROW 1 when it carries pinTopId. This proves the
 * client-sent pin drives the result. The actual server SQL (force-include OR + CASE-first order)
 * is proven separately by packages/admin/admin-entity-list-pin-top.test.ts (Vitest).
 *
 * Run: npm run test:e2e:scratch -- --app=panda-realty --spec=apps/panda-realty/e2e/property-map-filter-pin-target.spec.ts --no-bail
 * Workers: use --workers=1 when running via npx directly (createStory requirement)
 */

import { expect, test, type Page } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { createStory, shotFocused } from "@repo/e2e-utils"
import {
  refreshPandaE2eEnv,
  requirePandaE2eAdminCredentials,
  signInAsAdmin,
} from "./helpers/admin-auth"
import {
  MAP_FILTER_STATUS_LIST_RESPONSE as STATUS_LIST_RESPONSE,
  MAP_FILTER_MOCK_STREETS as MOCK_STREETS,
} from "./helpers/map-filter-mocks"
import {
  openMapFilterDialog,
  waitForLeafletMap,
  drawPolygon,
} from "./helpers/map-filter-draw"

const SHOT_DIR = join(dirname(fileURLToPath(import.meta.url)), "screenshots", "map-filter-pin-target")

const story = createStory({ specUrl: import.meta.url, slug: "map-filter-pin-target" })

story.setWhatWasBuilt(
  "Pin the target (anchor) property to row 1 of the map-filtered results. Tapping a row's map icon " +
    "records that property's id; after the polygon filter is applied, the client adds a " +
    "pinTopId=<rowId> URL param alongside streetFilter (registered as a hidden hint filter so the " +
    "generic list client forwards it). The server force-includes that id past every filter " +
    "(OR id = pin) and sorts it first (CASE WHEN id = pin THEN 0 ELSE 1). Clearing the map filter " +
    "removes both params; a toolbar-initiated filter carries no pin. Files: " +
    "packages/admin/admin-entity-list-pin-top.ts, packages/admin/admin-entity-list-page.ts, " +
    "apps/panda-realty/lib/admin/pandaPropertiesListFilters.ts, app/api/admin/properties/route.ts, " +
    "property-map-filter-context.tsx, property-list-row-extra-actions.tsx, property-map-filter.tsx.",
)

const ROW_ID = 999

const ANCHOR = {
  propertyListId: ROW_ID,
  streetAddress: "80 Hollywood Avenue",
  suburb: "Bellmere",
  state: "QLD",
  postcode: "4510",
  propertyType: "House",
  bed: 4,
  bath: 2,
  car: 2,
  isFavorite: false, // deliberately NOT a favourite — proves favourites are irrelevant (MV-5)
  nextConditionDue: "2026-07-02", // late date → would naturally sort deep without the pin
}

const COMPARABLES = [
  { propertyListId: 1001, streetAddress: "12 Lily Close", suburb: "Bellmere", state: "QLD", postcode: "4510", propertyType: "House", bed: 3, bath: 2, car: 1, isFavorite: true, nextConditionDue: "2026-06-08" },
  { propertyListId: 1002, streetAddress: "5 Smith Street", suburb: "Bellmere", state: "QLD", postcode: "4510", propertyType: "House", bed: 4, bath: 2, car: 2, isFavorite: true, nextConditionDue: "2026-06-10" },
  { propertyListId: 1003, streetAddress: "27 Jones Road", suburb: "Bellmere", state: "QLD", postcode: "4510", propertyType: "House", bed: 3, bath: 1, car: 1, isFavorite: true, nextConditionDue: "2026-06-12" },
  { propertyListId: 1004, streetAddress: "9 Dahlia Crescent", suburb: "Bellmere", state: "QLD", postcode: "4510", propertyType: "House", bed: 5, bath: 3, car: 2, isFavorite: true, nextConditionDue: "2026-06-15" },
]

function buildListResponse(
  items: unknown[],
  o: { totalCount: number; totalPages: number; hasNextPage: boolean; hasPreviousPage: boolean; effectivePage: number },
) {
  return {
    items,
    totalCount: o.totalCount,
    limit: 25,
    totalPages: o.totalPages,
    hasNextPage: o.hasNextPage,
    hasPreviousPage: o.hasPreviousPage,
    startCursor: null,
    endCursor: null,
    effectivePage: o.effectivePage,
  }
}

/**
 * Request-driven properties mock. The anchor is BURIED (row 3) when the request has no pinTopId and
 * floated to ROW 1 when it carries pinTopId=999. Page 2 never includes the anchor (MV-7).
 * Pass `record` to capture each request URL for assertions.
 */
function mockProperties(page: Page, record?: string[]) {
  return page.route("**/api/admin/properties**", (route) => {
    const url = route.request().url()
    record?.push(url)
    const hasPin = url.includes(`pinTopId=${ROW_ID}`)
    const isPage2 = /[?&]page=2(?:&|$)/.test(url)

    let items: unknown[]
    let effectivePage: number
    let hasNextPage: boolean
    let hasPreviousPage: boolean

    if (isPage2) {
      items = COMPARABLES.slice(2) // anchor absent on page 2 even with the pin
      effectivePage = 2
      hasNextPage = false
      hasPreviousPage = true
    } else if (hasPin) {
      items = [ANCHOR, ...COMPARABLES] // pinned: anchor at row 1
      effectivePage = 1
      hasNextPage = true
      hasPreviousPage = false
    } else {
      items = [COMPARABLES[0], COMPARABLES[1], ANCHOR, COMPARABLES[2], COMPARABLES[3]] // buried at row 3
      effectivePage = 1
      hasNextPage = true
      hasPreviousPage = false
    }

    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(buildListResponse(items, { totalCount: 30, totalPages: 2, hasNextPage, hasPreviousPage, effectivePage })),
    })
  })
}

/** Row order is the DOM order of the per-row map buttons. Returns the first one's property id. */
function mapButtons(page: Page) {
  return page.locator('[data-testid^="property-list-map-button--"]')
}

async function expectAnchorAtRowOne(page: Page) {
  await expect(mapButtons(page).first()).toBeVisible({ timeout: 30_000 })
  await expect(mapButtons(page).first()).toHaveAttribute("data-testid", `property-list-map-button--${ROW_ID}`)
}

const STREET_SEED = encodeURIComponent("E2E Map Street~QLD")
const OTHER_STREET_SEED = encodeURIComponent("Some Other Street~QLD") // does NOT include the anchor's street

function setupAdminCredentials(): void {
  refreshPandaE2eEnv()
  requirePandaE2eAdminCredentials()
}

test.beforeEach(async ({ page }) => {
  await mkdir(SHOT_DIR, { recursive: true })
  setupAdminCredentials()
  await page.route("**/api/admin/property-status**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(STATUS_LIST_RESPONSE) }),
  )
  await page.route("**/api/streets/autocomplete**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items: [{ id: "1", title: "80 Hollywood Avenue Bellmere QLD", lat: -27.0664, lng: 152.9519 }] }),
    }),
  )
})

test.afterAll(() => {
  story.write()
})

test.describe("Properties — map filter pins the target to row 1 (full story)", () => {
  // Several tests do two full /admin/properties navigations; on a slow dev box each heavy admin-route
  // render can take 20-30s, so the default 60s per-test budget is too tight. Give them room.
  test.describe.configure({ timeout: 120_000 })

  // ── MV-1/2: row map button → polygon → pinTopId + streetFilter (URL + request) ──

  test("MV-1/2 row map button then polygon sets pinTopId and streetFilter", async ({ page }) => {
    const reqs: string[] = []
    await mockProperties(page, reqs)
    await page.route("**/api/streets?**", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_STREETS) }),
    )

    await signInAsAdmin(page)
    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-list-card--properties")).toBeVisible()

    // BEFORE — no filter, anchor is buried (row 3) in the default order.
    await expect(mapButtons(page).first()).toBeVisible({ timeout: 30_000 })
    await shotFocused(page, page.getByTestId("admin-entity-list-card--properties"), SHOT_DIR, "01a-before-no-filter")

    // Open via the row map button — records the anchor — then draw the polygon.
    await page.getByTestId(`property-list-map-button--${ROW_ID}`).first().click()
    await waitForLeafletMap(page)
    const streetsReq = page.waitForRequest((r) => r.method() === "GET" && r.url().includes("/api/streets?"))
    await drawPolygon(page)
    await streetsReq

    await expect(page.getByTestId("property-map-filter-dialog")).not.toBeVisible({ timeout: 10_000 })
    await expect.poll(() => new URL(page.url()).searchParams.get("streetFilter")).toBeTruthy()
    await expect.poll(() => new URL(page.url()).searchParams.get("pinTopId")).toBe(String(ROW_ID))
    await expect.poll(() => reqs.some((u) => u.includes(`pinTopId=${ROW_ID}`))).toBe(true)
    await expect(page.getByTestId("property-map-filter-trigger")).toContainText("ON")

    // AFTER — anchor pinned to row 1.
    await expectAnchorAtRowOne(page)
    await shotFocused(page, page.getByTestId("admin-entity-list-card--properties"), SHOT_DIR, "01b-after-pinned")

    story.addScene({
      title: "01 — Row Map Button: Anchor Pinned to Row 1",
      images: [join(SHOT_DIR, "01a-before-no-filter.png"), join(SHOT_DIR, "01b-after-pinned.png")],
      seeing:
        "Left: default list, 80 Hollywood Avenue sits mid-list. Right: after tapping its row map icon and " +
        "drawing the polygon, the URL carries streetFilter + pinTopId=999, the request includes pinTopId, " +
        "and 80 Hollywood Avenue is now row 1.",
      steps: [
        "Open /admin/properties (anchor is buried)",
        "Click the row map icon for 80 Hollywood Avenue",
        "Draw a polygon around the dropped pin",
        "Dialog closes; ON badge shows; anchor is row 1",
      ],
    })
  })

  // ── MV-3/4: anchor at row 1 vs buried without the pin ──────────────────────────

  test("MV-3/4 anchor sits at row 1 with the pin and is buried without it", async ({ page }) => {
    await mockProperties(page)
    await signInAsAdmin(page)

    // Without the pin (toolbar-style filter): anchor buried at row 3.
    await page.goto(`/admin/properties?streetFilter=${STREET_SEED}`)
    await expect(page.getByTestId("admin-entity-list-card--properties")).toBeVisible()
    await expect(mapButtons(page).first()).toBeVisible({ timeout: 30_000 })
    await expect(mapButtons(page).first()).not.toHaveAttribute("data-testid", `property-list-map-button--${ROW_ID}`)
    await shotFocused(page, page.getByTestId("admin-entity-list-card--properties"), SHOT_DIR, "02a-buried-no-pin")

    // With the pin: anchor floats to row 1.
    await page.goto(`/admin/properties?streetFilter=${STREET_SEED}&pinTopId=${ROW_ID}`)
    await expectAnchorAtRowOne(page)
    await shotFocused(page, page.getByTestId("admin-entity-list-card--properties"), SHOT_DIR, "02b-pinned-row1")

    story.addScene({
      title: "02 — Pin Effect: Row 1 vs Buried",
      images: [join(SHOT_DIR, "02a-buried-no-pin.png"), join(SHOT_DIR, "02b-pinned-row1.png")],
      seeing:
        "Same map area, same comparables. Left (no pinTopId): the anchor is buried among the comparables. " +
        "Right (pinTopId=999): the anchor is row 1 and the comparables follow below it.",
      steps: [
        "Filter by map area without a pin — anchor is buried",
        "Add pinTopId=999 — anchor jumps to row 1",
      ],
    })
  })

  // ── MV-5: favourites irrelevant — non-favourite anchor still row 1 ─────────────

  test("MV-5 a non-favourite anchor is still pinned to row 1", async ({ page }) => {
    const reqs: string[] = []
    await mockProperties(page, reqs)
    await signInAsAdmin(page)

    // Default favourites segment is active; the anchor is NOT a favourite yet still surfaces at row 1.
    await page.goto(`/admin/properties?streetFilter=${STREET_SEED}&pinTopId=${ROW_ID}`)
    await expectAnchorAtRowOne(page)
    // The request still carries the pin even with the favourites filter active.
    await expect.poll(() => reqs.some((u) => u.includes(`pinTopId=${ROW_ID}`))).toBe(true)

    await shotFocused(page, page.getByTestId("admin-entity-list-card--properties"), SHOT_DIR, "03-favourites-irrelevant")
    story.addScene({
      title: "03 — Favourites Irrelevant: Non-favourite Anchor at Row 1",
      images: [join(SHOT_DIR, "03-favourites-irrelevant.png")],
      seeing:
        "The favourites view is active, yet 80 Hollywood Avenue (not a favourite) is force-included at row 1 — " +
        "the anchor is treated like a general-search reference, independent of favourite status.",
      steps: [
        "Favourites segment active",
        "Apply the map filter with the non-favourite anchor pinned",
        "Anchor still appears at row 1",
      ],
    })
  })

  // ── MV-6: Overpass missed the anchor street — still force-included ─────────────

  test("MV-6 anchor is force-included even when its street is not in the filter", async ({ page }) => {
    await mockProperties(page)
    await signInAsAdmin(page)

    // streetFilter that does NOT include the anchor's own street; the pin must still surface it.
    await page.goto(`/admin/properties?streetFilter=${OTHER_STREET_SEED}&pinTopId=${ROW_ID}`)
    await expectAnchorAtRowOne(page)

    await shotFocused(page, page.getByTestId("admin-entity-list-card--properties"), SHOT_DIR, "04-force-included")
    story.addScene({
      title: "04 — Force-Included Past the Street Filter",
      images: [join(SHOT_DIR, "04-force-included.png")],
      seeing:
        "Even when the street filter does not contain the anchor's own street (the original 'it was in the " +
        "polygon but did not show' complaint), pinTopId force-includes it at row 1.",
      steps: [
        "Apply a map filter whose streets exclude the anchor",
        "pinTopId still force-includes the anchor",
        "Anchor appears at row 1",
      ],
    })
  })

  // ── MV-7: pagination — anchor only on page 1, never duplicated ─────────────────

  test("MV-7 anchor appears only on page 1, not on page 2", async ({ page }) => {
    await mockProperties(page)
    await signInAsAdmin(page)

    await page.goto(`/admin/properties?streetFilter=${STREET_SEED}&pinTopId=${ROW_ID}`)
    await expectAnchorAtRowOne(page)
    await shotFocused(page, page.getByTestId("admin-entity-list-card--properties"), SHOT_DIR, "05a-page1-anchor")

    // Page 2 — the anchor must NOT reappear.
    await page.goto(`/admin/properties?streetFilter=${STREET_SEED}&pinTopId=${ROW_ID}&page=2`)
    await expect(page.getByTestId("admin-entity-list-card--properties")).toBeVisible()
    await expect(mapButtons(page).first()).toBeVisible({ timeout: 30_000 })
    await expect(page.getByTestId(`property-list-map-button--${ROW_ID}`)).toHaveCount(0)
    await shotFocused(page, page.getByTestId("admin-entity-list-card--properties"), SHOT_DIR, "05b-page2-no-anchor")

    story.addScene({
      title: "05 — Pagination: Anchor on Page 1 Only",
      images: [join(SHOT_DIR, "05a-page1-anchor.png"), join(SHOT_DIR, "05b-page2-no-anchor.png")],
      seeing:
        "Left: page 1 with the anchor at row 1. Right: page 2 — the anchor is gone (it lives at absolute " +
        "position 1 only), so it is never duplicated across pages.",
      steps: ["View page 1 — anchor at row 1", "Go to page 2 — anchor is absent"],
    })
  })

  // ── MV-8: no streets found → error in dialog, neither param set ────────────────

  test("MV-8 no streets found shows error and sets neither param", async ({ page }) => {
    await mockProperties(page)
    await page.route("**/api/streets?**", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) }),
    )

    await signInAsAdmin(page)
    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-list-card--properties")).toBeVisible()

    await page.getByTestId(`property-list-map-button--${ROW_ID}`).first().click()
    await waitForLeafletMap(page)
    await drawPolygon(page)

    const dialog = page.getByTestId("property-map-filter-dialog")
    await expect(dialog).toBeVisible({ timeout: 10_000 })
    await expect(dialog.locator("p.text-destructive")).toContainText(/no streets found/i, { timeout: 10_000 })
    expect(new URL(page.url()).searchParams.has("streetFilter")).toBe(false)
    expect(new URL(page.url()).searchParams.has("pinTopId")).toBe(false)

    await shotFocused(page, dialog, SHOT_DIR, "06-no-streets-error")
    story.addScene({
      title: "06 — No Streets Found: Error, No Params",
      images: [join(SHOT_DIR, "06-no-streets-error.png")],
      seeing: "Drawing over an empty area shows the error inside the dialog; neither streetFilter nor pinTopId is set.",
      steps: ["Open via row map button", "Draw over an area with no streets", "Error shown, dialog stays open"],
    })
  })

  // ── MV-9: Clear removes both params ────────────────────────────────────────────

  test("MV-9 Clear removes both pinTopId and streetFilter", async ({ page }) => {
    await mockProperties(page)
    await signInAsAdmin(page)
    await page.goto(`/admin/properties?streetFilter=${STREET_SEED}&pinTopId=${ROW_ID}`)
    await expect(page.getByTestId("property-map-filter-trigger")).toContainText("ON")
    await expectAnchorAtRowOne(page)
    await shotFocused(page, page.getByTestId("admin-entity-list-card--properties"), SHOT_DIR, "07a-before-clear")

    await page.getByTestId("property-map-filter-clear").click()
    await page.waitForURL((url) => !url.searchParams.has("streetFilter"), { timeout: 30_000 })
    expect(new URL(page.url()).searchParams.has("streetFilter")).toBe(false)
    expect(new URL(page.url()).searchParams.has("pinTopId")).toBe(false)
    await expect(page.getByTestId("property-map-filter-trigger")).not.toContainText("ON")

    await shotFocused(page, page.getByTestId("admin-entity-list-card--properties"), SHOT_DIR, "07b-after-clear")
    story.addScene({
      title: "07 — Clear Removes Both Params",
      images: [join(SHOT_DIR, "07a-before-clear.png"), join(SHOT_DIR, "07b-after-clear.png")],
      seeing: "Left: filter active (ON), anchor pinned. Right: after Clear, both streetFilter and pinTopId are gone and the list returns to its default order.",
      steps: ["Filter active with anchor pinned", "Click Clear", "Both params removed, ON badge gone"],
    })
  })

  // ── MV-10: toolbar-initiated filter carries no pin ─────────────────────────────

  test("MV-10 toolbar-initiated filter sets streetFilter but no pinTopId", async ({ page }) => {
    const reqs: string[] = []
    await mockProperties(page, reqs)
    await page.route("**/api/streets?**", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_STREETS) }),
    )

    await signInAsAdmin(page)
    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-list-card--properties")).toBeVisible()

    await openMapFilterDialog(page) // toolbar button — NOT a row, so no anchor
    await waitForLeafletMap(page)
    const streetsReq = page.waitForRequest((r) => r.method() === "GET" && r.url().includes("/api/streets?"))
    await drawPolygon(page)
    await streetsReq
    await expect(page.getByTestId("property-map-filter-dialog")).not.toBeVisible({ timeout: 10_000 })

    await expect.poll(() => new URL(page.url()).searchParams.get("streetFilter")).toBeTruthy()
    expect(new URL(page.url()).searchParams.has("pinTopId")).toBe(false)
    expect(reqs.some((u) => u.includes("pinTopId="))).toBe(false)

    // No pin → anchor is NOT forced to row 1.
    await expect(mapButtons(page).first()).toBeVisible({ timeout: 30_000 })
    await expect(mapButtons(page).first()).not.toHaveAttribute("data-testid", `property-list-map-button--${ROW_ID}`)
    await shotFocused(page, page.getByTestId("admin-entity-list-card--properties"), SHOT_DIR, "08-toolbar-no-pin")

    story.addScene({
      title: "08 — Toolbar Filter Carries No Pin",
      images: [join(SHOT_DIR, "08-toolbar-no-pin.png")],
      seeing: "Opening the filter from the toolbar (not a row) applies streetFilter only — no pinTopId — so no property is anchored to the top.",
      steps: ["Open the toolbar Map Filter", "Draw a polygon", "streetFilter set, pinTopId absent, no pinned row"],
    })
  })

  // ── MV-11: reload persists the pin to the request ──────────────────────────────

  test("MV-11 reload with pinTopId in URL persists the pin to the request", async ({ page }) => {
    const reqs: string[] = []
    await mockProperties(page, reqs)
    await signInAsAdmin(page)

    await page.goto(`/admin/properties?streetFilter=${STREET_SEED}&pinTopId=${ROW_ID}`)
    await expect(page.getByTestId("property-map-filter-trigger")).toContainText("ON")
    await expectAnchorAtRowOne(page)
    await expect.poll(() => reqs.some((u) => u.includes(`pinTopId=${ROW_ID}`))).toBe(true)
    expect(new URL(page.url()).searchParams.get("pinTopId")).toBe(String(ROW_ID))

    await shotFocused(page, page.getByTestId("admin-entity-list-card--properties"), SHOT_DIR, "09-reload-persists")
    story.addScene({
      title: "09 — Reload Persists the Pin",
      images: [join(SHOT_DIR, "09-reload-persists.png")],
      seeing: "Loading the page directly with streetFilter + pinTopId in the URL keeps the anchor at row 1 — the pin is param-driven and survives reload.",
      steps: ["Open the URL with streetFilter + pinTopId", "Request carries pinTopId", "Anchor is row 1"],
    })
  })
})
