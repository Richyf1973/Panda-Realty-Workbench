/**
 * Panda Realty — Properties mobile filter dialog parity
 *
 * Verifies that the mobile filter dialog (compact viewport ≤ 640 px) exposes
 * the same controls as the desktop side filter panel, including:
 *   - Suburb combobox (fetched options) rendered BEFORE Favorites
 *   - Property Type combobox (fetched options)
 *   - Bedrooms / Bathrooms / Car Spaces as multi-select chips
 *   - Last Sales Price as min + max number inputs
 *   - Last Sales Date as from + to date inputs
 *   - "Land Details" collapsible group (Land Size, Zoning, Dev Zone, Land Use)
 *   - Side panel unaffected on desktop viewport
 *
 * Testids used:
 *   admin-entity-list-mobile-filters-bar--properties      — the tap target bar
 *   admin-entity-list-mobile-filters-dialog--properties   — dialog container
 *   admin-entity-list-mobile-filters-done--properties     — Done button
 *   admin-entity-list-clear-filters--properties           — Clear filters button
 *   admin-entity-list-hint-filter-side--suburb            — Suburb section
 *   admin-entity-list-hint-filter-side--propertyType      — Property Type section
 *   admin-entity-list-hint-filter-side--bed               — Bedrooms section
 *   admin-entity-list-hint-filter-side--bath              — Bathrooms section
 *   admin-entity-list-hint-filter-side--car               — Car Spaces section
 *   admin-entity-list-hint-filter-side--salePrice         — Last Sales Price section
 *   admin-entity-list-hint-filter-side--saleDate          — Last Sales Date section
 *   admin-entity-list-boolean-filter--properties          — Favorites button group
 *   admin-entity-relation-filters-side--properties        — desktop side panel aside
 */

import { expect, test } from "@playwright/test"

import { e2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import {
  EMPTY_LIST_RESPONSE,
  EMPTY_PROPERTY_ENTITIES_RESPONSE,
  STATUS_LIST_RESPONSE,
} from "./helpers/admin-properties-mocks"

const MOBILE_VIEWPORT = { width: 390, height: 844 }
const DESKTOP_VIEWPORT = { width: 1280, height: 900 }

const SUBURB_OPTIONS = ["Newtown", "Paddington", "Surry Hills", "Glebe"]
const PROPERTY_TYPE_OPTIONS = ["House", "Unit", "Townhouse", "Land"]
const ZONING_OPTIONS = ["Residential", "Commercial"]
const SUBURB_FILTER_OPTIONS_RESPONSE = {
  options: SUBURB_OPTIONS.map((s) => ({ value: s, label: s })),
}
const PROPERTY_TYPE_OPTIONS_RESPONSE = {
  options: PROPERTY_TYPE_OPTIONS.map((t) => ({ value: t, label: t })),
}
const ZONING_OPTIONS_RESPONSE = {
  options: ZONING_OPTIONS.map((z) => ({ value: z, label: z })),
}

async function setupMocks(page: import("@playwright/test").Page) {
  // Generic fallback for all admin API GETs — returns empty options
  await page.route("**/api/admin/**", async (route) => {
    if (route.request().method() !== "GET") { await route.continue(); return }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ options: [] }) })
  })
  await page.route("**/api/admin/suburbs/options**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SUBURB_FILTER_OPTIONS_RESPONSE) })
  })
  await page.route("**/api/admin/property-types/options**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(PROPERTY_TYPE_OPTIONS_RESPONSE) })
  })
  await page.route("**/api/admin/zonings/options**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(ZONING_OPTIONS_RESPONSE) })
  })
  await page.route("**/api/admin/property-entities**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_PROPERTY_ENTITIES_RESPONSE) })
  })
  await page.route("**/api/admin/property-status**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(STATUS_LIST_RESPONSE) })
  })
  await page.route("**/api/admin/properties**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_LIST_RESPONSE) })
  })
}

async function openMobileDialog(page: import("@playwright/test").Page) {
  const bar = page.getByTestId("admin-entity-list-mobile-filters-bar--properties")
  await expect(bar).toBeVisible()
  await bar.click()
  await expect(page.getByTestId("admin-entity-list-mobile-filters-dialog--properties")).toBeVisible()
}

test.describe("Panda Realty — Properties: mobile filter dialog parity", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")
    await page.setViewportSize(MOBILE_VIEWPORT)
    await setupMocks(page)
    await signInAsAdmin(page)
  })

  // ── Happy path ───────────────────────────────────────────────────────────────

  test("mobile filter bar is visible on compact viewport and opens dialog on tap", async ({ page }) => {
    await page.goto("/admin/properties")
    const bar = page.getByTestId("admin-entity-list-mobile-filters-bar--properties")
    await expect(bar).toBeVisible()
    await bar.click()
    await expect(page.getByTestId("admin-entity-list-mobile-filters-dialog--properties")).toBeVisible()
  })

  test("Suburb combobox appears ABOVE the Favorites button group in the dialog", async ({ page }) => {
    await page.goto("/admin/properties")
    await openMobileDialog(page)

    const dialog = page.getByTestId("admin-entity-list-mobile-filters-dialog--properties")
    const suburbSection = dialog.getByTestId("admin-entity-list-hint-filter-side--suburb")
    const favoritesGroup = dialog.getByTestId("admin-entity-list-boolean-filter--properties")

    await expect(suburbSection).toBeVisible()
    await expect(favoritesGroup).toBeVisible()

    // Suburb must appear before (above) Favorites in DOM order
    const suburbBox = await suburbSection.boundingBox()
    const favBox = await favoritesGroup.boundingBox()
    expect(suburbBox!.y).toBeLessThan(favBox!.y)
  })

  test("Suburb combobox shows fetched suburb options when opened", async ({ page }) => {
    await page.goto("/admin/properties")
    await openMobileDialog(page)

    const dialog = page.getByTestId("admin-entity-list-mobile-filters-dialog--properties")
    const suburbSection = dialog.getByTestId("admin-entity-list-hint-filter-side--suburb")
    await expect(suburbSection).toBeVisible()

    // Open the combobox
    await suburbSection.getByRole("combobox").click()

    // Fetched suburb options should appear
    for (const suburb of SUBURB_OPTIONS) {
      await expect(page.getByRole("option", { name: suburb })).toBeVisible()
    }
  })

  test("Property Type combobox shows fetched property type options when opened", async ({ page }) => {
    await page.goto("/admin/properties")
    await openMobileDialog(page)

    const dialog = page.getByTestId("admin-entity-list-mobile-filters-dialog--properties")
    const typeSection = dialog.getByTestId("admin-entity-list-hint-filter-side--propertyType")
    await expect(typeSection).toBeVisible()

    await typeSection.getByRole("combobox").click()

    for (const pt of PROPERTY_TYPE_OPTIONS) {
      await expect(page.getByRole("option", { name: pt, exact: true })).toBeVisible()
    }
  })

  test("Bedrooms shows all chip options (Any, 1–5, 6+)", async ({ page }) => {
    await page.goto("/admin/properties")
    await openMobileDialog(page)

    const dialog = page.getByTestId("admin-entity-list-mobile-filters-dialog--properties")
    const bedSection = dialog.getByTestId("admin-entity-list-hint-filter-side--bed")
    await expect(bedSection).toBeVisible()

    for (const label of ["Any", "1", "2", "3", "4", "5", "6+"]) {
      await expect(bedSection.getByRole("checkbox", { name: label })).toBeVisible()
    }
  })

  test("Bedrooms supports multi-select — two chips can be active simultaneously", async ({ page }) => {
    await page.goto("/admin/properties")
    await openMobileDialog(page)

    const dialog = page.getByTestId("admin-entity-list-mobile-filters-dialog--properties")
    const bedSection = dialog.getByTestId("admin-entity-list-hint-filter-side--bed")

    await bedSection.getByRole("checkbox", { name: "2" }).click()
    await bedSection.getByRole("checkbox", { name: "3" }).click()

    // Both chips should be visually active (aria-checked="true")
    await expect(bedSection.getByRole("checkbox", { name: "2" })).toHaveAttribute("aria-checked", "true")
    await expect(bedSection.getByRole("checkbox", { name: "3" })).toHaveAttribute("aria-checked", "true")
    // "Any" must NOT be active when specific values are selected
    await expect(bedSection.getByRole("checkbox", { name: "Any" })).toHaveAttribute("aria-checked", "false")
  })

  test("Bathrooms shows all chip options (Any, 1, 2, 3, 4+)", async ({ page }) => {
    await page.goto("/admin/properties")
    await openMobileDialog(page)

    const dialog = page.getByTestId("admin-entity-list-mobile-filters-dialog--properties")
    const bathSection = dialog.getByTestId("admin-entity-list-hint-filter-side--bath")
    await expect(bathSection).toBeVisible()

    for (const label of ["Any", "1", "2", "3", "4+"]) {
      await expect(bathSection.getByRole("checkbox", { name: label })).toBeVisible()
    }
  })

  test("Car Spaces shows all chip options (Any, 1, 2, 3, 4+)", async ({ page }) => {
    await page.goto("/admin/properties")
    await openMobileDialog(page)

    const dialog = page.getByTestId("admin-entity-list-mobile-filters-dialog--properties")
    const carSection = dialog.getByTestId("admin-entity-list-hint-filter-side--car")
    await expect(carSection).toBeVisible()

    for (const label of ["Any", "1", "2", "3", "4+"]) {
      await expect(carSection.getByRole("checkbox", { name: label })).toBeVisible()
    }
  })

  test("Last Sales Price shows Min and Max number inputs (not a single button)", async ({ page }) => {
    await page.goto("/admin/properties")
    await openMobileDialog(page)

    const dialog = page.getByTestId("admin-entity-list-mobile-filters-dialog--properties")
    const priceSection = dialog.getByTestId("admin-entity-list-hint-filter-side--salePrice")
    await expect(priceSection).toBeVisible()

    await expect(priceSection.getByRole("spinbutton", { name: /min/i })).toBeVisible()
    await expect(priceSection.getByRole("spinbutton", { name: /max/i })).toBeVisible()
  })

  test("Last Sales Date shows From and To date inputs (not a single button)", async ({ page }) => {
    await page.goto("/admin/properties")
    await openMobileDialog(page)

    const dialog = page.getByTestId("admin-entity-list-mobile-filters-dialog--properties")
    const dateSection = dialog.getByTestId("admin-entity-list-hint-filter-side--saleDate")
    await expect(dateSection).toBeVisible()

    // Two date inputs must exist inside the section (aria-label: "Last Sales Date from" / "to")
    await expect(dateSection.locator('input[type="date"]')).toHaveCount(2)
  })

  test("Land Details section header is visible and collapsed by default", async ({ page }) => {
    await page.goto("/admin/properties")
    await openMobileDialog(page)

    const dialog = page.getByTestId("admin-entity-list-mobile-filters-dialog--properties")
    // The collapse group header button should be visible
    const landDetailsBtn = dialog.getByRole("button", { name: /land details/i })
    await expect(landDetailsBtn).toBeVisible()
    await expect(landDetailsBtn).toHaveAttribute("aria-expanded", "false")
  })

  test("Land Details expands to show Land Size, Zoning, Development Zone, Land Use", async ({ page }) => {
    await page.goto("/admin/properties")
    await openMobileDialog(page)

    const dialog = page.getByTestId("admin-entity-list-mobile-filters-dialog--properties")
    const landDetailsBtn = dialog.getByRole("button", { name: /land details/i })
    await landDetailsBtn.click()
    await expect(landDetailsBtn).toHaveAttribute("aria-expanded", "true")

    // The 4 sub-filters inside Land Details should now be visible
    await expect(dialog.getByTestId("admin-entity-list-hint-filter-side--landSize")).toBeVisible()
    await expect(dialog.getByTestId("admin-entity-list-hint-filter-side--zoning")).toBeVisible()
    await expect(dialog.getByTestId("admin-entity-list-hint-filter-side--developmentZone")).toBeVisible()
    await expect(dialog.getByTestId("admin-entity-list-hint-filter-side--landUse1")).toBeVisible()
  })

  test("Land Details collapses again after second tap", async ({ page }) => {
    await page.goto("/admin/properties")
    await openMobileDialog(page)

    const dialog = page.getByTestId("admin-entity-list-mobile-filters-dialog--properties")
    const landDetailsBtn = dialog.getByRole("button", { name: /land details/i })
    await landDetailsBtn.click() // expand
    await landDetailsBtn.click() // collapse
    await expect(landDetailsBtn).toHaveAttribute("aria-expanded", "false")
    await expect(dialog.getByTestId("admin-entity-list-hint-filter-side--landSize")).not.toBeVisible()
  })

  test("Done button closes the dialog", async ({ page }) => {
    await page.goto("/admin/properties")
    await openMobileDialog(page)

    await page.getByTestId("admin-entity-list-mobile-filters-done--properties").click()
    await expect(page.getByTestId("admin-entity-list-mobile-filters-dialog--properties")).not.toBeVisible()
  })

  // ── Desktop side panel unaffected ────────────────────────────────────────────

  test("desktop side panel still renders all hint filters after the refactor", async ({ page }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT)
    await page.goto("/admin/properties")

    // Expand the side panel (it starts collapsed per listSideFiltersPanelCollapsible)
    const toggle = page.getByTestId("admin-entity-filter-side-panel-toggle--properties")
    await expect(toggle).toBeVisible()
    await toggle.click()

    const panel = page.getByTestId("admin-entity-relation-filters-side--properties")
    await expect(panel).toBeVisible()

    // Suburb, Property Type, Bedrooms, Last Sales Price sections should be in the side panel
    await expect(panel.getByTestId("admin-entity-list-hint-filter-side--suburb")).toBeVisible()
    await expect(panel.getByTestId("admin-entity-list-hint-filter-side--propertyType")).toBeVisible()
    await expect(panel.getByTestId("admin-entity-list-hint-filter-side--bed")).toBeVisible()
    await expect(panel.getByTestId("admin-entity-list-hint-filter-side--salePrice")).toBeVisible()
  })

  // ── Edge cases ───────────────────────────────────────────────────────────────

  test("mobile filter bar is NOT visible on desktop viewport", async ({ page }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT)
    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-list-mobile-filters-bar--properties")).not.toBeVisible()
  })

  test("Land Details badge count shows when a sub-filter is active and group is collapsed", async ({ page }) => {
    await page.goto("/admin/properties")
    await openMobileDialog(page)

    const dialog = page.getByTestId("admin-entity-list-mobile-filters-dialog--properties")
    const landDetailsBtn = dialog.getByRole("button", { name: /land details/i })

    // Expand Land Details and select a zoning value
    await landDetailsBtn.click()
    await expect(landDetailsBtn).toHaveAttribute("aria-expanded", "true")

    const zoningSection = dialog.getByTestId("admin-entity-list-hint-filter-side--zoning")
    await zoningSection.getByRole("combobox").click()
    await expect(page.getByRole("option", { name: "Residential", exact: true })).toBeVisible()
    await page.getByRole("option", { name: "Residential", exact: true }).click()

    // Collapse the group — badge must show count of 1 active sub-filter
    await landDetailsBtn.click()
    await expect(landDetailsBtn).toHaveAttribute("aria-expanded", "false")
    // The badge is a <span> sibling of the chevron inside the button
    const badge = landDetailsBtn.locator("span.rounded-full")
    await expect(badge).toBeVisible()
    await expect(badge).toHaveText("1")
  })
})

