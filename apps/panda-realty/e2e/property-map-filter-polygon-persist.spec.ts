/**
 * Property Map Filter — polygon persistence (saved polygon restored on re-open)
 *
 * Success factors (from specs/panda-realty-map-filter-polygon-persist.md):
 * 1. (MV 1-6)   After applying polygon filter, re-opening the dialog shows the restored polygon.
 * 2. (MV 7-10)  After editing and re-applying, re-opening shows the updated polygon.
 * 3. (MV 11-13) Clear button removes both streetFilter and the saved polygon.
 * 4. (MV 14-18) Cancel discards in-dialog edits; saved polygon unchanged on next open.
 * 5. (MV 19-20) First open with no prior polygon shows an empty map.
 * 6. (MV 21)    Opening via row map button does not restore a saved polygon.
 * 7. (MV 22-24) Saved polygon is in-memory only — lost after page reload.
 *
 * Run: npm run test:e2e:scratch -- --app=panda-realty --spec=apps/panda-realty/e2e/property-map-filter-polygon-persist.spec.ts --no-bail
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
} from "./helpers/map-filter-draw"

const SHOT_DIR = join(dirname(fileURLToPath(import.meta.url)), "screenshots", "map-filter-polygon-persist")

const story = createStory({ specUrl: import.meta.url, slug: "map-filter-polygon-persist" })

story.setWhatWasBuilt(
  "Preserved the drawn polygon after applying the map filter. When the user draws a polygon, " +
    "applies the street filter, and reopens the Map Filter dialog, the polygon is restored on the " +
    "map and the map viewport flies to the polygon centroid. Clearing the filter also clears the " +
    "saved polygon. Cancel discards in-dialog edits without modifying the saved polygon. " +
    "Polygon is in-memory only (lost on page reload). " +
    "Files changed: property-map-filter.tsx, property-map-filter-map.tsx.",
)

function setupAdminCredentials(): void {
  refreshPandaE2eEnv()
  requirePandaE2eAdminCredentials()
}

const LIST_WITH_ONE_ROW = {
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

test.beforeEach(async () => {
  await mkdir(SHOT_DIR, { recursive: true })
})

test.afterAll(() => {
  story.write()
})

test.describe("Properties — map filter polygon persistence", () => {
  test.beforeEach(async ({ page }) => {
    setupAdminCredentials()
    await page.route("**/api/admin/properties**", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_LIST_RESPONSE) }),
    )
    await page.route("**/api/admin/property-status**", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(STATUS_LIST_RESPONSE) }),
    )
    await page.route("**/api/streets?**", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_STREETS) }),
    )
    await signInAsAdmin(page)
    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-list-card--properties")).toBeVisible()
  })

  // ── Test 1: MV 1-6 — restored polygon visible after re-open ─────────────────

  test("reopening dialog after applying filter shows restored polygon", async ({ page }) => {
    // Apply the filter by drawing a polygon
    await openMapFilterDialog(page)
    await waitForLeafletMap(page)
    const req = page.waitForRequest((r) => r.method() === "GET" && r.url().includes("/api/streets?"))
    await drawPolygon(page)
    await req
    await expect(page.getByTestId("property-map-filter-dialog")).not.toBeVisible({ timeout: 10_000 })
    await expect.poll(() => new URL(page.url()).searchParams.get("streetFilter")).toBeTruthy()

    // Re-open — polygon must be restored
    await openMapFilterDialog(page)
    const mapWrap = await waitForLeafletMap(page)

    const restoredPolygon = mapWrap.locator("path.leaflet-interactive")
    await expect(restoredPolygon).toBeVisible({ timeout: 8_000 })

    await shotFocused(page, mapWrap, SHOT_DIR, "01-polygon-restored")
    story.addScene({
      title: "01 — Polygon Restored on Re-open",
      images: [join(SHOT_DIR, "01-polygon-restored.png")],
      seeing: "After applying the filter and reopening the dialog, the previously drawn polygon is visible on the map.",
      steps: [
        "Draw polygon and apply filter (dialog closes)",
        "Click Map Filter (ON) to reopen",
        "Observe polygon is restored on the map",
      ],
    })
  })

  // ── Test 2: MV 7-10 — updated polygon visible after edit + re-apply ──────────

  test("after editing and re-applying, reopen shows the updated polygon", async ({ page }) => {
    // First draw and apply
    await openMapFilterDialog(page)
    await waitForLeafletMap(page)
    const req1 = page.waitForRequest((r) => r.method() === "GET" && r.url().includes("/api/streets?"))
    await drawPolygon(page)
    await req1
    await expect(page.getByTestId("property-map-filter-dialog")).not.toBeVisible({ timeout: 10_000 })

    // Re-open — polygon must be visible before editing
    await openMapFilterDialog(page)
    const mapWrap = await waitForLeafletMap(page)
    await expect(mapWrap.locator("path.leaflet-interactive")).toBeVisible({ timeout: 8_000 })

    // Edit and save (fires EDITED → handlePolygonComplete → dialog closes)
    const req2 = page.waitForRequest((r) => r.method() === "GET" && r.url().includes("/api/streets?"))
    await editAndSavePolygon(page)
    await req2
    await expect(page.getByTestId("property-map-filter-dialog")).not.toBeVisible({ timeout: 10_000 })

    // Re-open — updated polygon must still be visible
    await openMapFilterDialog(page)
    const mapWrap2 = await waitForLeafletMap(page)
    const updatedPolygon = mapWrap2.locator("path.leaflet-interactive")
    await expect(updatedPolygon).toBeVisible({ timeout: 8_000 })

    await shotFocused(page, mapWrap2, SHOT_DIR, "02-updated-polygon")
    story.addScene({
      title: "02 — Updated Polygon Visible After Re-apply",
      images: [join(SHOT_DIR, "02-updated-polygon.png")],
      seeing: "After editing the polygon and re-applying the filter, reopening shows the updated polygon.",
      steps: [
        "Draw and apply polygon (dialog closes)",
        "Reopen, polygon visible",
        "Edit via leaflet-draw Save",
        "Reopen — updated polygon visible",
      ],
    })
  })

  // ── Test 3: MV 11-13 — Clear removes both filter and saved polygon ────────────

  test("Clear button removes both the street filter and the saved polygon", async ({ page }) => {
    // Apply filter
    await openMapFilterDialog(page)
    await waitForLeafletMap(page)
    const req = page.waitForRequest((r) => r.method() === "GET" && r.url().includes("/api/streets?"))
    await drawPolygon(page)
    await req
    await expect(page.getByTestId("property-map-filter-dialog")).not.toBeVisible({ timeout: 10_000 })

    // Verify polygon exists on re-open
    await openMapFilterDialog(page)
    const mapWrap = await waitForLeafletMap(page)
    await expect(mapWrap.locator("path.leaflet-interactive")).toBeVisible({ timeout: 8_000 })

    await shotFocused(page, mapWrap, SHOT_DIR, "03a-before-clear")

    // Close dialog, then click Clear
    await page.getByTestId("property-map-filter-cancel").click()
    await expect(page.getByTestId("property-map-filter-dialog")).not.toBeVisible()
    await page.getByTestId("property-map-filter-clear").click()
    await page.waitForURL((url) => !url.searchParams.has("streetFilter"), { timeout: 10_000 })

    // Re-open — no polygon should be present
    await openMapFilterDialog(page)
    const mapWrap2 = await waitForLeafletMap(page)
    await expect(mapWrap2.locator("path.leaflet-interactive")).not.toBeVisible({ timeout: 5_000 })

    await shotFocused(page, mapWrap2, SHOT_DIR, "03b-after-clear")
    story.addScene({
      title: "03 — Clear Removes Filter and Saved Polygon",
      images: [join(SHOT_DIR, "03a-before-clear.png"), join(SHOT_DIR, "03b-after-clear.png")],
      seeing: "Left: polygon visible before clearing. Right: empty map after Clear button removes both the filter and saved polygon.",
      steps: [
        "Apply polygon filter",
        "Reopen — polygon visible",
        "Cancel dialog",
        "Click Clear button",
        "Reopen — empty map, no polygon",
      ],
    })
  })

  // ── Test 4: MV 14-18 — Cancel discards edits; saved polygon unchanged ────────

  test("Cancel discards in-dialog edits and saved polygon is unchanged on next open", async ({ page }) => {
    // Apply filter — saves the polygon
    await openMapFilterDialog(page)
    await waitForLeafletMap(page)
    const req = page.waitForRequest((r) => r.method() === "GET" && r.url().includes("/api/streets?"))
    await drawPolygon(page)
    await req
    await expect(page.getByTestId("property-map-filter-dialog")).not.toBeVisible({ timeout: 10_000 })

    // Re-open — polygon visible; enter edit mode then Cancel dialog without saving
    await openMapFilterDialog(page)
    const mapWrap = await waitForLeafletMap(page)
    await expect(mapWrap.locator("path.leaflet-interactive")).toBeVisible({ timeout: 8_000 })

    // Enter edit mode but do NOT click leaflet-draw Save — just cancel the dialog
    await mapWrap.locator(".leaflet-draw-edit-edit").click()
    await shotFocused(page, mapWrap, SHOT_DIR, "04a-editing")
    await page.getByTestId("property-map-filter-cancel").click()
    await expect(page.getByTestId("property-map-filter-dialog")).not.toBeVisible()

    // Re-open — original saved polygon must still be there
    await openMapFilterDialog(page)
    const mapWrap2 = await waitForLeafletMap(page)
    const restoredAfterCancel = mapWrap2.locator("path.leaflet-interactive")
    await expect(restoredAfterCancel).toBeVisible({ timeout: 8_000 })

    await shotFocused(page, mapWrap2, SHOT_DIR, "04b-after-cancel")
    story.addScene({
      title: "04 — Cancel Discards Edits; Original Polygon Unchanged",
      images: [join(SHOT_DIR, "04a-editing.png"), join(SHOT_DIR, "04b-after-cancel.png")],
      seeing: "Left: edit mode active. Right: after Cancel, reopening shows the original polygon unmodified.",
      steps: [
        "Apply polygon filter",
        "Reopen, enter edit mode",
        "Click Cancel (no leaflet-draw Save)",
        "Reopen — original polygon still visible",
      ],
    })
  })

  // ── Test 5: MV 19-20 — First open with no prior polygon shows empty map ────────

  test("first open with no prior polygon shows an empty map", async ({ page }) => {
    await openMapFilterDialog(page)
    const mapWrap = await waitForLeafletMap(page)

    // No polygon should be visible on a fresh open
    await expect(mapWrap.locator("path.leaflet-interactive")).not.toBeVisible()

    await shotFocused(page, mapWrap, SHOT_DIR, "05-empty-first-open")
    story.addScene({
      title: "05 — First Open: Empty Map",
      images: [join(SHOT_DIR, "05-empty-first-open.png")],
      seeing: "Opening the Map Filter for the first time shows an empty map with no pre-drawn polygon.",
      steps: ["Navigate to /admin/properties with no streetFilter", "Click Map Filter", "Observe empty map"],
    })
  })

  // ── Test 6: MV 21 — Row map button open does not restore saved polygon ────────

  test("opening via row map button does not restore a saved polygon", async ({ page }) => {
    // Provide a property row so the row map button is available
    await page.route("**/api/admin/properties**", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(LIST_WITH_ONE_ROW) }),
    )
    await page.reload()
    await expect(page.getByTestId("admin-entity-list-card--properties")).toBeVisible()

    // Apply a polygon filter (saves polygon in memory)
    await openMapFilterDialog(page)
    await waitForLeafletMap(page)
    const req = page.waitForRequest((r) => r.method() === "GET" && r.url().includes("/api/streets?"))
    await drawPolygon(page)
    await req
    await expect(page.getByTestId("property-map-filter-dialog")).not.toBeVisible({ timeout: 10_000 })

    // Confirm polygon IS restored when opening via the toolbar Map Filter button
    await openMapFilterDialog(page)
    const mapWrap = await waitForLeafletMap(page)
    await expect(mapWrap.locator("path.leaflet-interactive")).toBeVisible({ timeout: 8_000 })
    await page.getByTestId("property-map-filter-cancel").click()

    // Now open via row map button — should NOT show saved polygon
    await page.route("**/api/streets/autocomplete**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: [{ id: "1", title: "1 Test Street Caboolture", lat: -27.0664, lng: 152.9519 }] }),
      }),
    )
    await page.getByTestId("property-list-map-button--999").first().click()
    const mapWrapRow = await waitForLeafletMap(page)
    await expect(mapWrapRow.locator("path.leaflet-interactive")).not.toBeVisible({ timeout: 5_000 })

    await shotFocused(page, mapWrapRow, SHOT_DIR, "06-row-button-no-polygon")
    story.addScene({
      title: "06 — Row Map Button: No Saved Polygon",
      images: [join(SHOT_DIR, "06-row-button-no-polygon.png")],
      seeing: "Opening via the per-row map button shows only a pin marker for that property address — no saved polygon.",
      steps: [
        "Apply polygon filter via toolbar",
        "Confirm polygon restored via toolbar open",
        "Click per-row Map button",
        "Observe empty map (no saved polygon)",
      ],
    })
  })

  // ── Test 7: MV 22-24 — Saved polygon is in-memory only (lost on reload) ─────

  test("saved polygon is lost after page reload (in-memory only)", async ({ page }) => {
    // Apply filter
    await openMapFilterDialog(page)
    await waitForLeafletMap(page)
    const req = page.waitForRequest((r) => r.method() === "GET" && r.url().includes("/api/streets?"))
    await drawPolygon(page)
    await req
    await expect(page.getByTestId("property-map-filter-dialog")).not.toBeVisible({ timeout: 10_000 })
    await expect.poll(() => new URL(page.url()).searchParams.get("streetFilter")).toBeTruthy()

    // Confirm polygon IS restored before reload
    await openMapFilterDialog(page)
    const mapWrap = await waitForLeafletMap(page)
    await expect(mapWrap.locator("path.leaflet-interactive")).toBeVisible({ timeout: 8_000 })
    await shotFocused(page, mapWrap, SHOT_DIR, "07a-before-reload")
    await page.getByTestId("property-map-filter-cancel").click()

    // Reload — URL still has streetFilter but polygon must be gone (in-memory only)
    await page.reload()
    await expect(page.getByTestId("admin-entity-list-card--properties")).toBeVisible()
    await expect(page.getByTestId("property-map-filter-trigger")).toContainText("ON")

    await openMapFilterDialog(page)
    const mapWrap2 = await waitForLeafletMap(page)
    await expect(mapWrap2.locator("path.leaflet-interactive")).not.toBeVisible({ timeout: 5_000 })

    await shotFocused(page, mapWrap2, SHOT_DIR, "07b-after-reload")
    story.addScene({
      title: "07 — In-Memory Only: Polygon Lost After Reload",
      images: [join(SHOT_DIR, "07a-before-reload.png"), join(SHOT_DIR, "07b-after-reload.png")],
      seeing: "Left: polygon visible in same session. Right: after reload, dialog opens to empty map (polygon not persisted).",
      steps: [
        "Apply polygon filter",
        "Verify polygon visible on reopen (same session)",
        "Reload page (streetFilter stays in URL)",
        "Reopen dialog — empty map, polygon lost",
      ],
    })
  })
})
