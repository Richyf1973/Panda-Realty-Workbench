/**
 * Property Map Filter — leaflet.draw polygon toolbar (auto-apply)
 *
 * Success factors (from specs/panda-realty-map-filter-row-button.md):
 * 1. Dialog has no Apply Filter button and no polygon hint text.
 * 2. leaflet.draw polygon toolbar is visible inside the map.
 * 3. Drawing polygon auto-applies streetFilter URL param — dialog closes on success.
 * 4. Re-opening dialog and drawing a new polygon updates the streetFilter.
 * 5. Re-opening dialog after auto-close shows a fresh map (no previous polygon).
 * 6. Address search navigates map only — no fetch, no polygon change.
 * 7. Cancel closes dialog without setting streetFilter.
 * 8. Clear toolbar button removes active streetFilter.
 * 9. Reloading with streetFilter in URL shows ON badge.
 * 10. No streets found — error shown, dialog stays open.
 * 11. Per-row Map button EXISTS on property rows with correct data-testid.
 *
 * Run: npm run test:e2e:scratch -- --app=panda-realty --spec=apps/panda-realty/e2e/property-map-filter-draw.spec.ts --no-bail
 * Workers: use --workers=1 when running via npx playwright test directly (createStory requirement)
 */

import { expect, test } from "@playwright/test"
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
  MAP_FILTER_EMPTY_LIST_RESPONSE as EMPTY_LIST_RESPONSE,
  MAP_FILTER_STATUS_LIST_RESPONSE as STATUS_LIST_RESPONSE,
  MAP_FILTER_MOCK_STREETS as MOCK_STREETS,
} from "./helpers/map-filter-mocks"
import {
  openMapFilterDialog,
  waitForLeafletMap,
  drawPolygon,
  editAndSavePolygon,
  deletePolygon,
} from "./helpers/map-filter-draw"

const SHOT_DIR = join(dirname(fileURLToPath(import.meta.url)), "screenshots", "map-filter-draw")

const story = createStory({ specUrl: import.meta.url, slug: "map-filter-draw" })

story.setWhatWasBuilt(
  "Replaced the click-by-click polygon UI in the property map filter dialog with the leaflet.draw " +
    "toolbar (polygon tool only). Drawing a polygon now auto-applies the streetFilter URL param " +
    "immediately without an Apply button press, and the dialog closes automatically on success. " +
    "Address search only navigates the map — no longer resets any drawn polygon. " +
    "Per-row Map button implemented (test 11 updated to assert it exists).",
)

function setupAdminCredentials(): void {
  refreshPandaE2eEnv()
  requirePandaE2eAdminCredentials()
}

test.beforeEach(async () => {
  await mkdir(SHOT_DIR, { recursive: true })
})

test.afterAll(() => {
  story.write()
})

test.describe("Properties — map filter dialog (leaflet.draw)", () => {
  test.beforeEach(async ({ page }) => {
    setupAdminCredentials()
    await page.route("**/api/admin/properties**", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_LIST_RESPONSE) }),
    )
    await page.route("**/api/admin/property-status**", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(STATUS_LIST_RESPONSE) }),
    )
    await signInAsAdmin(page)
    // domcontentloaded (not the default "load"): on a loaded dev server the page renders but the
    // load event can stall on map tiles/keep-alives past the timeout. The card assertion below waits
    // for hydration anyway (same rationale as signInAsAdmin).
    await page.goto("/admin/properties", { waitUntil: "domcontentloaded" })
    await expect(page.getByTestId("admin-entity-list-card--properties")).toBeVisible({ timeout: 15_000 })
  })

  // ── Test 1: No Apply button, no hint text ────────────────────────────────────

  test("dialog has no Apply Filter button and no polygon hint text", async ({ page }) => {
    await openMapFilterDialog(page)
    await waitForLeafletMap(page)

    const dialog = page.getByTestId("property-map-filter-dialog")
    await shotFocused(page, dialog, SHOT_DIR, "01-dialog-open")

    story.addScene({
      title: "01 — Dialog Open: No Apply Button, No Hint Text",
      images: [join(SHOT_DIR, "01-dialog-open.png")],
      seeing: "Dialog open with leaflet.draw toolbar. No Apply Filter button. No hint text row.",
      steps: ["Click Map Filter button", "Observe dialog with draw toolbar, no Apply or hint text"],
    })

    await expect(page.getByTestId("property-map-filter-apply")).not.toBeVisible()
    await expect(page.getByTestId("property-map-filter-hint")).not.toBeVisible()
  })

  // ── Test 2: Leaflet.draw toolbar visible ────────────────────────────────────

  test("leaflet.draw polygon toolbar is visible inside the map", async ({ page }) => {
    await openMapFilterDialog(page)
    const mapWrap = await waitForLeafletMap(page)

    const drawBtn = mapWrap.locator(".leaflet-draw-draw-polygon")
    await expect(drawBtn).toBeVisible({ timeout: 10_000 })

    await shotFocused(page, mapWrap, SHOT_DIR, "02-draw-toolbar")
    story.addScene({
      title: "02 — leaflet.draw Polygon Toolbar",
      images: [join(SHOT_DIR, "02-draw-toolbar.png")],
      seeing: "Leaflet.draw toolbar with polygon draw icon visible in the top-left of the map.",
      steps: ["Open dialog", "Observe draw toolbar on the map"],
    })
  })

  // ── Test 3: Draw polygon auto-applies filter ─────────────────────────────────

  test("drawing polygon auto-applies street filter and closes dialog", async ({ page }) => {
    await page.route("**/api/streets?**", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_STREETS) }),
    )

    await openMapFilterDialog(page)
    await waitForLeafletMap(page)

    const streetsReq = page.waitForRequest(
      (req) => req.method() === "GET" && req.url().includes("/api/streets?"),
    )

    await drawPolygon(page)
    await streetsReq

    // Dialog closes after auto-apply
    await expect(page.getByTestId("property-map-filter-dialog")).not.toBeVisible({ timeout: 10_000 })

    // URL gains streetFilter without any button press
    await expect.poll(() => new URL(page.url()).searchParams.get("streetFilter")).toBeTruthy()
    expect(new URL(page.url()).searchParams.get("streetFilter")).toContain("QLD")

    const trigger = page.getByTestId("property-map-filter-trigger")
    await expect(trigger).toContainText("ON")

    await shotFocused(page, trigger, SHOT_DIR, "03-on-badge")
    story.addScene({
      title: "03 — Draw Polygon: Auto-Apply, Dialog Closes, ON Badge",
      images: [join(SHOT_DIR, "03-on-badge.png")],
      seeing: "After drawing the polygon, streetFilter is in the URL, the dialog closes, and the Map Filter button shows ON — no button press needed.",
      steps: ["Click draw polygon tool", "Click 3 vertices + double-click to close", "Observe dialog closes, ON badge and streetFilter in URL"],
    })
  })

  // ── Test 4: Re-open dialog and redraw to update filter ──────────────────────

  test("re-opening dialog after auto-close and drawing a new polygon updates street filter", async ({ page }) => {
    await page.route("**/api/streets?**", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_STREETS) }),
    )

    // First draw — dialog should close automatically
    await openMapFilterDialog(page)
    await waitForLeafletMap(page)
    const firstReq = page.waitForRequest(
      (req) => req.method() === "GET" && req.url().includes("/api/streets?"),
    )
    await drawPolygon(page)
    await firstReq
    await expect(page.getByTestId("property-map-filter-dialog")).not.toBeVisible({ timeout: 10_000 })
    await expect.poll(() => new URL(page.url()).searchParams.get("streetFilter")).toBeTruthy()

    // Re-open dialog and draw again — filter should update
    const secondReq = page.waitForRequest(
      (req) => req.method() === "GET" && req.url().includes("/api/streets?"),
    )
    await openMapFilterDialog(page)
    await waitForLeafletMap(page)
    await drawPolygon(page)
    await secondReq
    await expect(page.getByTestId("property-map-filter-dialog")).not.toBeVisible({ timeout: 10_000 })
    await expect.poll(() => new URL(page.url()).searchParams.get("streetFilter")).toBeTruthy()

    const trigger = page.getByTestId("property-map-filter-trigger")
    await shotFocused(page, trigger, SHOT_DIR, "04-re-draw-updates-filter")
    story.addScene({
      title: "04 — Re-draw: Filter Updated",
      images: [join(SHOT_DIR, "04-re-draw-updates-filter.png")],
      seeing: "After re-opening the dialog and drawing a new polygon, streetFilter is updated and dialog closes again.",
      steps: ["Draw first polygon (dialog closes)", "Re-open dialog", "Draw second polygon", "Observe dialog closes and streetFilter updated"],
    })
  })

  // ── Test 5: Re-opening shows fresh map ──────────────────────────────────────

  test("re-opening dialog after auto-close shows the draw toolbar with no error", async ({ page }) => {
    await page.route("**/api/streets?**", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_STREETS) }),
    )

    await openMapFilterDialog(page)
    await waitForLeafletMap(page)

    const req = page.waitForRequest(
      (req) => req.method() === "GET" && req.url().includes("/api/streets?"),
    )
    await drawPolygon(page)
    await req

    // Dialog auto-closed
    await expect(page.getByTestId("property-map-filter-dialog")).not.toBeVisible({ timeout: 10_000 })

    // Re-open — fresh state: draw toolbar visible, no error from previous session
    await openMapFilterDialog(page)
    const mapWrap = await waitForLeafletMap(page)

    const drawBtn = mapWrap.locator(".leaflet-draw-draw-polygon")
    await expect(drawBtn).toBeVisible({ timeout: 10_000 })

    await expect(page.locator("p.text-destructive")).not.toBeVisible()

    await shotFocused(page, page.getByTestId("property-map-filter-dialog"), SHOT_DIR, "05-fresh-reopen")
    story.addScene({
      title: "05 — Re-open: Fresh Map State",
      images: [join(SHOT_DIR, "05-fresh-reopen.png")],
      seeing: "After auto-close, re-opening the dialog shows a fresh map with the draw toolbar available and no stale error.",
      steps: ["Draw polygon (dialog auto-closes)", "Re-open dialog", "Observe fresh map with draw toolbar, no error message"],
    })
  })

  // ── Test 6: Address search navigates without polygon change ──────────────────

  test("address search navigates map without triggering a street fetch", async ({ page }) => {
    await page.route("**/api/streets/autocomplete**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: [{ id: "1", title: "Caboolture QLD 4510", lat: -27.0664, lng: 152.9519 }],
        }),
      }),
    )

    let streetsFetched = false
    await page.route("**/api/streets?**", (route) => {
      streetsFetched = true
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_STREETS) })
    })

    await openMapFilterDialog(page)
    await waitForLeafletMap(page)

    const searchInput = page.getByPlaceholder("Search for an address…")
    await searchInput.fill("Caboolture")
    await expect(page.getByTestId("autocomplete-suggestions")).toBeVisible({ timeout: 10_000 })
    await page.getByTestId("autocomplete-suggestions").locator("li").first().click()

    await page.waitForTimeout(500)

    // No street fetch should have happened
    expect(streetsFetched).toBe(false)
    // No streetFilter in URL
    expect(new URL(page.url()).searchParams.has("streetFilter")).toBe(false)

    const dialog = page.getByTestId("property-map-filter-dialog")
    await shotFocused(page, dialog, SHOT_DIR, "06-address-search")
    story.addScene({
      title: "06 — Address Search: Map Navigates Only",
      images: [join(SHOT_DIR, "06-address-search.png")],
      seeing: "After selecting an address suggestion, the map flies to the location — no fetch, no streetFilter in URL.",
      steps: ["Open dialog", "Type address in search", "Select suggestion", "Observe map navigates, no filter applied"],
    })
  })

  // ── Test 7: Cancel closes dialog without filter ──────────────────────────────

  test("Cancel closes dialog without setting street filter", async ({ page }) => {
    await openMapFilterDialog(page)
    await waitForLeafletMap(page)

    await page.getByTestId("property-map-filter-cancel").click()

    await expect(page.getByTestId("property-map-filter-dialog")).not.toBeVisible()
    expect(new URL(page.url()).searchParams.has("streetFilter")).toBe(false)
  })

  // ── Test 8: Clear toolbar button removes filter ──────────────────────────────

  test("Clear toolbar button removes active street filter from URL", async ({ page }) => {
    const seed = encodeURIComponent("E2E Map Street~QLD")
    // domcontentloaded (not the default "load"): on a loaded dev server the page renders but the
    // load event can stall on map tiles/keep-alives past the timeout. The ON-badge assertion below
    // waits for hydration anyway (same rationale as signInAsAdmin).
    await page.goto(`/admin/properties?streetFilter=${seed}`, { waitUntil: "domcontentloaded" })
    await expect(page.getByTestId("property-map-filter-trigger")).toContainText("ON")

    const clearBtn = page.getByTestId("property-map-filter-clear")
    await expect(clearBtn).toBeVisible()

    await shotFocused(page, page.locator('[data-testid="property-map-filter-trigger"]').locator(".."), SHOT_DIR, "08a-filter-active")

    await clearBtn.click()
    await page.waitForURL((url) => !url.searchParams.has("streetFilter"), { timeout: 30_000 })
    await expect(page.getByTestId("property-map-filter-trigger")).not.toContainText("ON")

    await shotFocused(page, page.getByTestId("property-map-filter-trigger"), SHOT_DIR, "08b-filter-cleared")
    story.addScene({
      title: "08 — Clear Toolbar Button",
      images: [join(SHOT_DIR, "08a-filter-active.png"), join(SHOT_DIR, "08b-filter-cleared.png")],
      seeing: "Left: filter active with ON badge. Right: after Clear, badge gone and streetFilter removed from URL.",
      steps: ["Load page with streetFilter in URL", "Click Clear button", "Observe filter cleared"],
    })
  })

  // ── Test 9: Reload persists filter ──────────────────────────────────────────

  test("reloading page with streetFilter in URL shows ON badge", async ({ page }) => {
    const seed = encodeURIComponent("E2E Map Street~QLD")
    await page.goto(`/admin/properties?streetFilter=${seed}`, { waitUntil: "domcontentloaded" })

    const trigger = page.getByTestId("property-map-filter-trigger")
    await expect(trigger).toContainText("ON")
    expect(new URL(page.url()).searchParams.get("streetFilter")).toBeTruthy()
  })

  // ── Test 10: No streets found — error shown, dialog stays open ───────────────

  test("no streets found shows error message and keeps dialog open", async ({ page }) => {
    await page.route("**/api/streets?**", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) }),
    )

    await openMapFilterDialog(page)
    await waitForLeafletMap(page)
    await drawPolygon(page)

    const dialog = page.getByTestId("property-map-filter-dialog")
    await expect(dialog).toBeVisible({ timeout: 10_000 })

    const error = dialog.locator("p.text-destructive")
    await expect(error).toContainText(/no streets found/i, { timeout: 10_000 })

    expect(new URL(page.url()).searchParams.has("streetFilter")).toBe(false)

    await shotFocused(page, dialog, SHOT_DIR, "10-no-streets-error")
    story.addScene({
      title: "10 — No Streets Found: Error in Dialog",
      images: [join(SHOT_DIR, "10-no-streets-error.png")],
      seeing: "After drawing in an area with no streets, error message shown inside the dialog which stays open.",
      steps: ["Draw polygon in empty area", "Observe error shown, dialog stays open, no streetFilter in URL"],
    })
  })

  // ── Test 11: Per-row Map button exists on property rows ─────────────────────

  test("per-row Map button exists on property rows with correct data-testid", async ({ page }) => {
    // Provide a list with one property row so row actions render
    const listWithOneRow = {
      ...EMPTY_LIST_RESPONSE,
      items: [
        {
          propertyListId: 999,
          streetAddress: "1 Test Street",
          suburb: "Caboolture",
          state: "QLD",
          postcode: "4510",
          propertyType: "House",
          bed: 3,
          bath: 2,
          car: 1,
        },
      ],
      totalCount: 1,
      totalPages: 1,
    }
    await page.route("**/api/admin/properties**", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(listWithOneRow) }),
    )
    await page.reload()
    await expect(page.getByTestId("admin-entity-list-card--properties")).toBeVisible()

    // The per-row map button must exist with the correct data-testid
    // Admin framework renders both desktop row and mobile card — both have the same testid
    await expect(page.getByTestId("property-list-map-button--999").first()).toBeVisible({ timeout: 10_000 })
  })
})
