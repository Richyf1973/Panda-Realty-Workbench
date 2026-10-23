/**
 * Property List — per-row Map icon button
 *
 * Success factors (from specs/panda-realty-property-map-row-button.md):
 * 1. Map button is the leftmost extra-action button on each property row.
 * 2. data-testid="property-list-map-button--{propertyListId}" is present.
 * 3. Clicking opens the map filter dialog pre-filled with the property address.
 * 4. Auto-geocode fires on open — a Leaflet marker pin appears on the map.
 * 5. Toolbar Map Filter button still opens blank dialog (no pre-fill).
 * 6. Second row click updates dialog with new address, not stale first address.
 * 7. Empty suburb: address search uses streetAddress + state (suburb omitted).
 * 8. Autocomplete returns empty: dialog opens, no pin, no crash.
 *
 * Run: npm run test:e2e:scratch -- --app=panda-realty --spec=apps/panda-realty/e2e/property-map-filter-row-button.spec.ts --no-bail
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
} from "./helpers/map-filter-mocks"
import { waitForLeafletMap } from "./helpers/map-filter-draw"

const SHOT_DIR = join(dirname(fileURLToPath(import.meta.url)), "screenshots", "map-filter-row-button")

const story = createStory({ specUrl: import.meta.url, slug: "map-filter-row-button" })

story.setWhatWasBuilt(
  "Added a map icon button as the leftmost extra-action on each property list row in panda-realty. " +
    "Clicking it opens the Map Street Finder dialog pre-filled with the property address and auto-geocodes it, " +
    "placing a Leaflet pin marker as a datum point for polygon drawing. " +
    "Files changed: property-list-row-extra-actions.tsx (map button), property-map-filter.tsx (accept initialAddress prop + context), " +
    "property-map-filter-context.tsx (new), property-map-filter-map.tsx (marker support), " +
    "property-map-filter-address-search.tsx (autoSearch prop).",
)

const MOCK_AUTOCOMPLETE_RESULT = {
  items: [
    {
      id: "nominatim-1",
      title: "51 Hollywood Avenue, Bellmere, QLD 4510",
      lat: -27.0664,
      lng: 152.9519,
    },
  ],
}

const LIST_WITH_ONE_ROW = {
  ...EMPTY_LIST_RESPONSE,
  items: [
    {
      propertyListId: 999,
      streetAddress: "51 Hollywood Avenue",
      suburb: "Bellmere",
      state: "QLD",
      postcode: "4510",
      propertyType: "House",
      bed: 4,
      bath: 2,
      car: 2,
    },
  ],
  totalCount: 1,
  totalPages: 1,
}

const LIST_WITH_TWO_ROWS = {
  ...EMPTY_LIST_RESPONSE,
  items: [
    {
      propertyListId: 1001,
      streetAddress: "1 Nancybell Court",
      suburb: "Bellmere",
      state: "QLD",
      postcode: "4510",
      propertyType: "House",
      bed: 3,
      bath: 2,
      car: 1,
    },
    {
      propertyListId: 1002,
      streetAddress: "12 Rhiannon Court",
      suburb: "Bellmere",
      state: "QLD",
      postcode: "4510",
      propertyType: "House",
      bed: 3,
      bath: 1,
      car: 2,
    },
  ],
  totalCount: 2,
  totalPages: 1,
}

const LIST_WITH_NO_SUBURB_ROW = {
  ...EMPTY_LIST_RESPONSE,
  items: [
    {
      propertyListId: 888,
      streetAddress: "37 Seville Street",
      suburb: "",
      state: "QLD",
      postcode: "4510",
      propertyType: "House",
      bed: 3,
      bath: 2,
      car: 2,
    },
  ],
  totalCount: 1,
  totalPages: 1,
}

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

test.describe("Properties — per-row map button", () => {
  test.beforeEach(async ({ page }) => {
    setupAdminCredentials()
    await page.route("**/api/admin/property-status**", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(STATUS_LIST_RESPONSE) }),
    )
    await signInAsAdmin(page)
  })

  // ── Test 1: Map button present and leftmost ──────────────────────────────────

  test("map button appears as leftmost extra-action with correct data-testid", async ({ page }) => {
    await page.route("**/api/admin/properties**", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(LIST_WITH_ONE_ROW) }),
    )
    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-list-card--properties")).toBeVisible()

    // Admin framework renders both desktop table row and mobile card — both have the same testid.
    // Use first() to target the desktop table row.
    const mapBtn = page.getByTestId("property-list-map-button--999").first()
    await expect(mapBtn).toBeVisible({ timeout: 10_000 })

    // Confirm map button precedes phone button in DOM order (leftmost)
    const rowActions = page.locator('[data-testid^="property-list-"][data-testid$="--999"]')
    const firstAction = rowActions.first()
    await expect(firstAction).toHaveAttribute("data-testid", "property-list-map-button--999")

    await shotFocused(page, mapBtn, SHOT_DIR, "01-map-button-visible")
    story.addScene({
      title: "01 — Map Button: Leftmost Extra Action",
      images: [join(SHOT_DIR, "01-map-button-visible.png")],
      seeing: "Map icon button visible as the leftmost extra-action button on the property row.",
      steps: ["Load /admin/properties", "Observe map button is first in the row actions"],
    })
  })

  // ── Test 2: Clicking opens dialog with pre-filled address ────────────────────

  test("clicking map button opens dialog pre-filled with property address", async ({ page }) => {
    await page.route("**/api/admin/properties**", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(LIST_WITH_ONE_ROW) }),
    )
    await page.route("**/api/streets/autocomplete**", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_AUTOCOMPLETE_RESULT) }),
    )
    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-list-card--properties")).toBeVisible()

    await page.getByTestId("property-list-map-button--999").first().click()

    const dialog = page.getByTestId("property-map-filter-dialog")
    await expect(dialog).toBeVisible({ timeout: 10_000 })

    // Address search input should be pre-filled with the property's address
    const searchInput = dialog.getByPlaceholder("Search for an address…")
    await expect(searchInput).toHaveValue(/51 Hollywood Avenue.*Bellmere.*QLD/i, { timeout: 5_000 })

    await shotFocused(page, dialog, SHOT_DIR, "02-dialog-prefilled")
    story.addScene({
      title: "02 — Dialog Opens Pre-filled",
      images: [join(SHOT_DIR, "02-dialog-prefilled.png")],
      seeing: "Map filter dialog open with address input pre-filled with the row property address.",
      steps: [
        "Click map icon button on the property row",
        "Observe dialog opens with address pre-filled",
      ],
    })
  })

  // ── Test 3: Auto-geocode places a pin marker ─────────────────────────────────

  test("dialog auto-geocodes and places a Leaflet pin marker on the map", async ({ page }) => {
    await page.route("**/api/admin/properties**", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(LIST_WITH_ONE_ROW) }),
    )
    await page.route("**/api/streets/autocomplete**", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_AUTOCOMPLETE_RESULT) }),
    )
    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-list-card--properties")).toBeVisible()

    const autoCompleteReq = page.waitForRequest(
      (req) => req.method() === "GET" && req.url().includes("/api/streets/autocomplete"),
    )

    await page.getByTestId("property-list-map-button--999").first().click()
    await page.getByTestId("property-map-filter-dialog").waitFor({ state: "visible" })

    await autoCompleteReq

    const mapWrap = await waitForLeafletMap(page)

    // A Leaflet marker should be placed on the map after auto-geocode
    const marker = mapWrap.locator(".leaflet-marker-icon")
    await expect(marker).toBeVisible({ timeout: 10_000 })

    await shotFocused(page, mapWrap, SHOT_DIR, "03-pin-marker")
    story.addScene({
      title: "03 — Auto-geocode: Pin Marker on Map",
      images: [join(SHOT_DIR, "03-pin-marker.png")],
      seeing: "Leaflet map showing a balloon pin marker placed at the geocoded property address.",
      steps: [
        "Click row map button",
        "Dialog opens, auto-geocode fires",
        "Observe pin marker appears on map at property location",
      ],
    })
  })

  // ── Test 4: Toolbar button still opens blank dialog ──────────────────────────

  test("toolbar Map Filter button opens dialog without pre-fill after a row button was clicked", async ({ page }) => {
    await page.route("**/api/admin/properties**", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(LIST_WITH_ONE_ROW) }),
    )
    await page.route("**/api/streets/autocomplete**", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [] }) }),
    )
    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-list-card--properties")).toBeVisible()

    // First open via row button (pre-filled)
    await page.getByTestId("property-list-map-button--999").first().click()
    const dialog = page.getByTestId("property-map-filter-dialog")
    await expect(dialog).toBeVisible({ timeout: 10_000 })
    const searchInput = dialog.getByPlaceholder("Search for an address…")
    await expect(searchInput).toHaveValue(/51 Hollywood/i, { timeout: 5_000 })

    // Close dialog
    await page.getByTestId("property-map-filter-cancel").click()
    await expect(dialog).not.toBeVisible()

    // Now open via toolbar button — should NOT show the row address
    await page.getByTestId("property-map-filter-trigger").click()
    await expect(dialog).toBeVisible({ timeout: 10_000 })

    // Toolbar button must open without the previous row address pre-filled
    await expect(searchInput).not.toHaveValue(/51 Hollywood/i)

    await shotFocused(page, dialog, SHOT_DIR, "04-toolbar-blank")
    story.addScene({
      title: "04 — Toolbar Button: No Pre-fill After Row Button Used",
      images: [join(SHOT_DIR, "04-toolbar-blank.png")],
      seeing: "After using a row map button then closing, the toolbar button opens dialog without any row address pre-filled.",
      steps: [
        "Click row map button (pre-fills address)",
        "Close dialog",
        "Click toolbar Map Filter button",
        "Observe address input is blank/default (not previous row address)",
      ],
    })
  })

  // ── Test 5: Second row click updates address ─────────────────────────────────

  test("clicking a second row map button updates dialog with new address", async ({ page }) => {
    await page.route("**/api/admin/properties**", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(LIST_WITH_TWO_ROWS) }),
    )
    await page.route("**/api/streets/autocomplete**", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [] }) }),
    )
    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-list-card--properties")).toBeVisible()

    // Click first row
    await page.getByTestId("property-list-map-button--1001").first().click()
    const dialog = page.getByTestId("property-map-filter-dialog")
    await expect(dialog).toBeVisible({ timeout: 10_000 })

    const searchInput = dialog.getByPlaceholder("Search for an address…")
    await expect(searchInput).toHaveValue(/1 Nancybell/i, { timeout: 5_000 })

    // Close dialog
    await page.getByTestId("property-map-filter-cancel").click()
    await expect(dialog).not.toBeVisible()

    // Click second row
    await page.getByTestId("property-list-map-button--1002").first().click()
    await expect(dialog).toBeVisible({ timeout: 10_000 })

    // Address should update to second row address, not stale first-row address
    await expect(searchInput).toHaveValue(/12 Rhiannon/i, { timeout: 5_000 })
    await expect(searchInput).not.toHaveValue(/Nancybell/i)

    await shotFocused(page, dialog, SHOT_DIR, "05-second-row-address")
    story.addScene({
      title: "05 — Second Row Click: Address Updates",
      images: [join(SHOT_DIR, "05-second-row-address.png")],
      seeing: "After clicking a second row map button, dialog shows the second row address (not stale first address).",
      steps: [
        "Click map button on first row (1 Nancybell Court)",
        "Close dialog",
        "Click map button on second row (12 Rhiannon Court)",
        "Observe address input shows 12 Rhiannon Court",
      ],
    })
  })

  // ── Test 6: Empty suburb — uses state instead ────────────────────────────────

  test("property with empty suburb uses state in address search", async ({ page }) => {
    await page.route("**/api/admin/properties**", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(LIST_WITH_NO_SUBURB_ROW) }),
    )
    await page.route("**/api/streets/autocomplete**", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [] }) }),
    )
    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-list-card--properties")).toBeVisible()

    await page.getByTestId("property-list-map-button--888").first().click()

    const dialog = page.getByTestId("property-map-filter-dialog")
    await expect(dialog).toBeVisible({ timeout: 10_000 })

    const searchInput = dialog.getByPlaceholder("Search for an address…")
    // Should contain the street address and state, but no empty suburb fragment
    await expect(searchInput).toHaveValue(/37 Seville.*QLD/i, { timeout: 5_000 })
    // Should not have a double comma from an empty suburb
    const value = await searchInput.inputValue()
    expect(value).not.toMatch(/,\s*,/)

    await shotFocused(page, dialog, SHOT_DIR, "06-no-suburb")
    story.addScene({
      title: "06 — Empty Suburb: Graceful Address",
      images: [join(SHOT_DIR, "06-no-suburb.png")],
      seeing: "When suburb is empty, address input shows streetAddress + state without a double comma.",
      steps: [
        "Click map button on a property with no suburb",
        "Observe address input contains street + state, no double comma",
      ],
    })
  })

  // ── Test 7: Autocomplete returns empty — no crash ────────────────────────────

  test("autocomplete returning empty results does not crash — dialog stays open", async ({ page }) => {
    await page.route("**/api/admin/properties**", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(LIST_WITH_ONE_ROW) }),
    )
    await page.route("**/api/streets/autocomplete**", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [] }) }),
    )
    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-list-card--properties")).toBeVisible()

    await page.getByTestId("property-list-map-button--999").first().click()

    const dialog = page.getByTestId("property-map-filter-dialog")
    await expect(dialog).toBeVisible({ timeout: 10_000 })

    // Wait for any auto-geocode attempt to settle
    await page.waitForTimeout(1000)

    // Dialog must remain open and usable — no crash
    await expect(dialog).toBeVisible()

    // No pin marker expected — fallback is silent
    const mapWrap = await waitForLeafletMap(page)
    await expect(mapWrap.locator(".leaflet-marker-icon")).toHaveCount(0)

    await shotFocused(page, dialog, SHOT_DIR, "07-no-results-fallback")
    story.addScene({
      title: "07 — Empty Autocomplete: Silent Fallback",
      images: [join(SHOT_DIR, "07-no-results-fallback.png")],
      seeing: "When autocomplete returns no results, dialog stays open with no pin — no crash or error message.",
      steps: [
        "Click row map button (autocomplete returns empty)",
        "Observe dialog open, no marker, no error",
      ],
    })
  })
})
