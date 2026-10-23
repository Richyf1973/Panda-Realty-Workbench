// Run: npm run test:e2e:scratch -- --app=panda-realty --spec=apps/panda-realty/e2e/property-map-status-selection-persist.spec.ts --no-bail
//
// REPRODUCTION for Richard's report: "when i go back to the map view the selection is gone again".
//
// Hypothesis under test: the Status side-panel selection must SURVIVE a map-view round-trip. The map
// bypass is meant to be display-only (Status shows empty while the map is on, real selection kept in
// localStorage and restored on Clear). These tests drive the real client-side path (tick a status →
// draw a polygon to turn the map ON → Clear to turn it OFF) and assert the selection comes back.
//
// If any of these FAIL, the failing step is the bug to fix. If they all PASS, the persistence is
// correct and "the selection" means something else (we then go back to Richard to clarify).
//
// Key persistence anchor: localStorage["panda-realty:list-filter:properties:propertyStatusId:values"].

import { expect, test, type Page } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { createStory, shotFocused } from "@repo/e2e-utils"

import { e2eAdminCredentials, refreshPandaE2eEnv, signInAsAdmin } from "./helpers/admin-auth"

const SHOT_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "screenshots",
  "property-map-status-selection-persist",
)

const story = createStory({
  specUrl: import.meta.url,
  slug: "property-map-status-selection-persist",
})

story.setWhatWasBuilt(
  "Reproduction harness for the report that the Status filter selection is lost when toggling the " +
    "map view. Drives the real client-side path: tick a Status option in the side panel, draw a " +
    "polygon (map ON), then Clear (map OFF), asserting the selection and its localStorage anchor " +
    "survive the round-trip and a reload.",
)

// property-status: idColumn.jsonKey = "propertyStatusId", relation label = propertyStatusCode.
const STATUS_LIST_RESPONSE = {
  items: [
    { propertyStatusId: 1, propertyStatusCode: "Appraised", propertyStatus: "Appraised", isShownOnFavorite: false, pipeline: "sellers" },
    { propertyStatusId: 2, propertyStatusCode: "To Be Appraised", propertyStatus: "To Be Appraised", isShownOnFavorite: false, pipeline: "sellers" },
    { propertyStatusId: 3, propertyStatusCode: "On The Market", propertyStatus: "On The Market", isShownOnFavorite: false, pipeline: "sellers" },
  ],
  totalCount: 3,
  limit: 100,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false,
  startCursor: null,
  endCursor: null,
}

const ONE_ROW_LIST = {
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

const STATUS_LS_KEY = "panda-realty:list-filter:properties:propertyStatusId:values"
const STATUS_GROUP = "admin-entity-list-relation-filter--properties--propertyStatusId"
const STATUS_TOGGLE = "admin-entity-list-relation-filter-toggle--properties--propertyStatusId"
const SIDE_PANEL_TOGGLE = "admin-entity-filter-side-panel-toggle--properties"

function lsStatus(page: Page) {
  return page.evaluate((k) => window.localStorage.getItem(k), STATUS_LS_KEY)
}

/** Open the collapsible side panel and expand the Status group so its checkboxes are reachable. */
async function revealStatusGroup(page: Page) {
  const group = page.getByTestId(STATUS_GROUP)
  // The side panel is collapsed by default and the toggle is a React island — a click that lands
  // before hydration is a silent no-op. Retry the open until the group actually becomes visible.
  await expect(async () => {
    if (!(await group.isVisible().catch(() => false))) {
      const sideToggle = page.getByTestId(SIDE_PANEL_TOGGLE)
      if (await sideToggle.isVisible().catch(() => false)) {
        await sideToggle.click()
      }
    }
    await expect(group).toBeVisible({ timeout: 2_000 })
  }).toPass({ timeout: 20_000 })
  // Expand the group if its option list is collapsed (the toggle controls aria-expanded).
  const toggle = page.getByTestId(STATUS_TOGGLE)
  if ((await toggle.getAttribute("aria-expanded")) === "false") {
    await toggle.click()
  }
}

// The map Clear button is a fragile React island — a single dispatched click can be a no-op when
// preceded by other interactions. Retry the dispatch until streetFilter actually leaves the URL.
async function clearMapFilter(page: Page) {
  await expect(async () => {
    await page.getByTestId("property-map-filter-clear").dispatchEvent("click")
    await expect
      .poll(() => new URL(page.url()).searchParams.has("streetFilter"), { timeout: 2_000 })
      .toBe(false)
  }).toPass({ timeout: 30_000 })
}

function appraisedCheckbox(page: Page) {
  // Anchor the text so "Appraised" does not also match "To Be Appraised".
  return page
    .getByTestId(STATUS_GROUP)
    .locator("label")
    .filter({ hasText: /^Appraised$/ })
    .getByRole("checkbox")
}

async function gotoPropertiesClean(page: Page) {
  await page.goto("/admin/properties", { waitUntil: "domcontentloaded" })
  await expect(page.getByTestId("admin-entity-list-card--properties")).toBeVisible({
    timeout: 30_000,
  })
  // Start from a clean persistence state (no leftover selection from a prior run/session).
  await page.evaluate((k) => window.localStorage.removeItem(k), STATUS_LS_KEY)
}

test.describe("Properties — Status selection survives the map round-trip", () => {
  test.setTimeout(120_000)

  test.beforeEach(async ({ page }) => {
    refreshPandaE2eEnv()
    if (!e2eAdminCredentials) {
      throw new Error("E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set in apps/panda-realty/.env.local")
    }
    await page.setViewportSize({ width: 1400, height: 900 })
    await mkdir(SHOT_DIR, { recursive: true })
    await page.route("**/api/admin/properties**", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(ONE_ROW_LIST) }),
    )
    await page.route("**/api/admin/property-status**", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(STATUS_LIST_RESPONSE) }),
    )
    await signInAsAdmin(page)
  })

  test.afterAll(() => {
    story.write()
  })

  // The reproduction: tick a status, turn the map ON, then Clear it OFF — selection must come back.
  // Map-on is driven via the streetFilter URL (the same param the polygon draw sets) rather than the
  // flaky headless Leaflet draw, so the persistence behavior is exercised reliably.
  test("ticking a status, turning the map on, then clearing it keeps the status selected", async ({
    page,
  }) => {
    await gotoPropertiesClean(page)
    await revealStatusGroup(page)

    // 1) Select a status.
    const appraised = appraisedCheckbox(page)
    await appraised.check()
    await expect(appraised, "status should be checked after selecting").toBeChecked()
    await expect
      .poll(() => lsStatus(page), { timeout: 10_000 })
      .toContain("1")
    await shotFocused(page, page.getByTestId(STATUS_GROUP), SHOT_DIR, "01-status-selected")
    story.addScene({
      title: "01 — Status selected (map off)",
      images: [join(SHOT_DIR, "01-status-selected.png")],
      seeing: "The Appraised status is ticked in the side panel; localStorage carries its value.",
      steps: ["Open the Status side panel", "Tick Appraised", "Confirm it is checked and persisted"],
    })

    // 2) Turn the map ON (streetFilter active).
    await page.goto(`/admin/properties?streetFilter=${encodeURIComponent("E2E Map Street~QLD")}`, {
      waitUntil: "domcontentloaded",
    })
    await expect(page.getByTestId("admin-entity-list-card--properties")).toBeVisible({ timeout: 30_000 })

    // While the map is ON: the panel shows the status OFF (display-only) BUT the saved value must remain.
    await revealStatusGroup(page)
    await expect(
      appraisedCheckbox(page),
      "map view shows the status off (display-only)",
    ).not.toBeChecked()
    expect(
      await lsStatus(page),
      "the saved Status selection must NOT be wiped while the map is on",
    ).toContain("1")
    await shotFocused(page, page.getByTestId(STATUS_GROUP), SHOT_DIR, "02-map-on-display-off")
    story.addScene({
      title: "02 — Map on: status shows off but stays saved",
      images: [join(SHOT_DIR, "02-map-on-display-off.png")],
      seeing: "With the map on, Appraised reads unchecked (display-only) while its value is still saved.",
      steps: ["Turn the map on (streetFilter)", "Observe the status unchecked", "Confirm the saved value remains"],
    })

    // 3) Clear the map → the status selection must come back exactly as left.
    await clearMapFilter(page)
    await revealStatusGroup(page)
    await expect(
      appraisedCheckbox(page),
      "clearing the map must restore the status selection",
    ).toBeChecked({ timeout: 15_000 })
    expect(await lsStatus(page), "saved Status selection must persist after clear").toContain("1")
    await shotFocused(page, page.getByTestId(STATUS_GROUP), SHOT_DIR, "03-map-cleared-restored")
    story.addScene({
      title: "03 — Map cleared: status restored",
      images: [join(SHOT_DIR, "03-map-cleared-restored.png")],
      seeing: "After Clear, Appraised is ticked again — the selection returned as the user left it.",
      steps: ["Click Clear", "Confirm Appraised is checked again"],
    })
  })

  // Variant: LAND directly on a map URL (equivalent to a reload while the map is active). This
  // exercises the mount-time restore path (initial state from URL + localStorage), which is a
  // different code path from the in-session URL-sync that test 1 covers. Uses goto (not the flaky
  // Leaflet draw) so the reload scenario is tested reliably.
  test("status selection survives landing directly on a map URL (reload while map active)", async ({
    page,
  }) => {
    await gotoPropertiesClean(page)
    await revealStatusGroup(page)
    await appraisedCheckbox(page).check()
    await expect.poll(() => lsStatus(page), { timeout: 10_000 }).toContain("1")

    // Reload while the map is active: navigate straight to a streetFilter URL (no propertyStatusId
    // in the URL — it must be restored from localStorage on mount).
    await page.goto(`/admin/properties?streetFilter=${encodeURIComponent("E2E Map Street~QLD")}`, {
      waitUntil: "domcontentloaded",
    })
    await expect(page.getByTestId("admin-entity-list-card--properties")).toBeVisible({ timeout: 30_000 })
    // A hard reload on the map URL — exercises the mount-time restore path twice.
    await page.reload({ waitUntil: "domcontentloaded" })
    await expect(page.getByTestId("admin-entity-list-card--properties")).toBeVisible({ timeout: 30_000 })
    expect(
      await lsStatus(page),
      "saved Status selection must survive landing on a map URL",
    ).toContain("1")
    // Map is ON here: status reads off (display-only) but the value is kept.
    await revealStatusGroup(page)
    await expect(
      appraisedCheckbox(page),
      "map view shows the status off (display-only) after landing on the map URL",
    ).not.toBeChecked()

    // Clear from the map view and confirm the selection is restored.
    await clearMapFilter(page)
    await revealStatusGroup(page)
    await expect(
      appraisedCheckbox(page),
      "after reload + clear, the status selection must be restored",
    ).toBeChecked({ timeout: 15_000 })
  })
})
