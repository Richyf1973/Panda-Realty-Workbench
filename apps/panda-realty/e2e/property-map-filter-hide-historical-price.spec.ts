// Run: npm run test:e2e:scratch -- --app=panda-realty --spec=apps/panda-realty/e2e/property-map-filter-hide-historical-price.spec.ts --no-bail

import { expect, test, type Locator, type Page } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { createStory, shotFocused } from "@repo/e2e-utils"

import { e2eAdminCredentials, refreshPandaE2eEnv, signInAsAdmin } from "./helpers/admin-auth"

/**
 * Properties admin — MAP-RESULTS view: hide the historical Last sale price + date per row when that
 * property already has a contract or appraised price (Richard's map-comparison request).
 *
 *   MV-1  map view shows the comparison columns (price/date/appraised/contract date/contract price)
 *   MV-2  contract-only row → Last sale price + date BLANK; contract date + price shown
 *   MV-3  appraised-only row → Last sale price + date BLANK; appraised shown
 *   MV-4  neither row → Last sale price + date KEPT (historical values)
 *   MV-5  both-present row → Last sale price + date BLANK; appraised AND contract price shown
 *   MV-7  the per-row hiding survives a reload
 * MV-6 (non-map list unchanged) is asserted at the unit layer — see spec ## E2E.
 *
 * The mock returns FULL historical data on every row, so this is genuinely RED before implementation
 * (cells show the price) and GREEN after (contract/appraised rows blank).
 *
 * Success factors map 1:1 to specs/panda-realty-map-filter-hide-historical-price.md ## Manual Verification.
 */

const SHOT_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "screenshots",
  "property-map-filter-hide-historical-price",
)

const story = createStory({
  specUrl: import.meta.url,
  slug: "property-map-filter-hide-historical-price",
})

story.setWhatWasBuilt(
  "On the panda-realty map-area-filter (streetFilter) results view, each property row now hides its " +
    "historical Last sale price and Last sale date once that property has a contract price or an " +
    "appraised price, so the comparison reads off the relevant figure (Appraised, Contract date, " +
    "Contract Price). Properties with neither keep their historical sale price and date. The hide is " +
    "presentational and scoped to the map view only — the normal list and the underlying data are " +
    "unchanged.",
)

function row(
  over: Record<string, unknown> & { propertyListId: number; streetAddress: string },
) {
  return {
    id: over.propertyListId,
    suburb: "BELLMERE",
    state: "QLD",
    postcode: "4500",
    propertyType: "House",
    bed: 4,
    bath: 2,
    car: 2,
    buildingArea: 136,
    landSize: 420,
    salePrice: null,
    saleDate: null,
    appraisedAmount: null,
    contractDate: null,
    contractPrice: null,
    completionDate: null,
    propertyStatusId: 1,
    combinedOwner: "OWNER NAME",
    successfulBuyer: null,
    isFavorite: true,
    priceUndisclosed: false,
    excludeFromReport: false,
    updatedAt: "2026-01-01T00:00:00Z",
    ...over,
  }
}

// Every row carries a real historical sale price + date. The contract/appraised columns vary so we
// can prove the per-row rule.
const ROW_CONTRACT = row({
  propertyListId: 9101,
  streetAddress: "1 CONTRACT COURT",
  salePrice: 385000,
  saleDate: "2021-06-01",
  contractPrice: "940000",
  contractDate: "2026-05-07",
}) // MV-2
const ROW_APPRAISED = row({
  propertyListId: 9102,
  streetAddress: "2 APPRAISED AVENUE",
  salePrice: 899000,
  saleDate: "2026-02-18",
  appraisedAmount: 850000,
}) // MV-3
const ROW_NEITHER = row({
  propertyListId: 9103,
  streetAddress: "3 NEITHER NOOK",
  salePrice: 825000,
  saleDate: "2026-02-02",
}) // MV-4
const ROW_BOTH = row({
  propertyListId: 9104,
  streetAddress: "4 BOTH BOULEVARD",
  salePrice: 880000,
  saleDate: "2026-01-11",
  appraisedAmount: 870000,
  contractPrice: "955000",
  contractDate: "2026-05-01",
}) // MV-5

const MAP_ROWS = {
  items: [ROW_CONTRACT, ROW_APPRAISED, ROW_NEITHER, ROW_BOTH],
  totalCount: 4,
  limit: 25,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false,
  startCursor: null,
  endCursor: null,
}

const STATUS_LIST_RESPONSE = {
  items: [{ id: 1, name: "Unconditional" }],
  totalCount: 1,
  limit: 100,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false,
  startCursor: null,
  endCursor: null,
}

const STREET_FILTER = encodeURIComponent("Hollywood Avenue~QLD")
const TABLE_SCROLL = "admin-entity-table-scroll--properties"

function header(page: Page, columnId: string) {
  return page.getByTestId(`admin-entity-col-header--properties--${columnId}`)
}

/** The body row whose Street cell contains `street`. */
function rowByStreet(page: Page, street: string): Locator {
  return page.locator("tr").filter({ hasText: street })
}

function cell(page: Page, street: string, key: string): Locator {
  return rowByStreet(page, street).locator(`[data-testid$="--${key}"]`).first()
}

async function cellText(page: Page, street: string, key: string): Promise<string> {
  return (await cell(page, street, key).innerText()).trim()
}

async function gotoMapResults(page: Page) {
  await page.goto(`/admin/properties?streetFilter=${STREET_FILTER}`)
  await expect(page.getByTestId("admin-entity-list-card--properties")).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId(TABLE_SCROLL)).toBeVisible({ timeout: 30_000 })
}

test.describe("Properties — map results hide historical sale price (desktop)", () => {
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

  // MV-1 — the comparison columns are present in the map view.
  test("MV-1 map view shows the comparison columns", async ({ page }) => {
    await gotoMapResults(page)
    for (const key of ["salePrice", "saleDate", "appraisedAmount", "contractDate", "contractPrice"]) {
      await expect(header(page, key), `column ${key} should be present`).toHaveCount(1)
    }
    await shotFocused(page, page.getByTestId(TABLE_SCROLL), SHOT_DIR, "01-columns")
    story.addScene({
      title: "01 — Map view shows the comparison columns",
      images: [join(SHOT_DIR, "01-columns.png")],
      seeing:
        "The map-area results table shows Last sale price, Last sale date, Appraised, Contract date and " +
        "Contract Price columns together.",
      steps: ["Open /admin/properties?streetFilter=...", "Confirm all five comparison column headers exist"],
    })
  })

  // MV-2 — contract-only row: historical sale price + date blank; contract figures shown.
  test("MV-2 contract row hides the historical sale price and date", async ({ page }) => {
    await gotoMapResults(page)
    const street = "1 CONTRACT COURT"
    expect(await cellText(page, street, "salePrice"), "Last sale price must be blank").toBe("")
    expect(await cellText(page, street, "saleDate"), "Last sale date must be blank").toBe("")
    expect(await cellText(page, street, "contractPrice")).toContain("940,000")
    expect(await cellText(page, street, "contractDate")).toContain("07/05/2026")
    await shotFocused(page, rowByStreet(page, street), SHOT_DIR, "02-contract-row")
    story.addScene({
      title: "02 — Contract row: historical sale price/date hidden",
      images: [join(SHOT_DIR, "02-contract-row.png")],
      seeing:
        "The property under contract shows no Last sale price or Last sale date; its Contract date " +
        "(07/05/2026) and Contract Price ($940,000.00) carry the comparison instead.",
      steps: ["Open the map results", "Find the under-contract property", "Confirm Last sale price + date are blank"],
    })
  })

  // MV-3 — appraised-only row: historical sale price + date blank; appraised shown.
  test("MV-3 appraised row hides the historical sale price and date", async ({ page }) => {
    await gotoMapResults(page)
    const street = "2 APPRAISED AVENUE"
    expect(await cellText(page, street, "salePrice"), "Last sale price must be blank").toBe("")
    expect(await cellText(page, street, "saleDate"), "Last sale date must be blank").toBe("")
    expect(await cellText(page, street, "appraisedAmount")).toContain("850,000")
    await shotFocused(page, rowByStreet(page, street), SHOT_DIR, "03-appraised-row")
    story.addScene({
      title: "03 — Appraised row: historical sale price/date hidden",
      images: [join(SHOT_DIR, "03-appraised-row.png")],
      seeing:
        "The property with an appraisal but no contract shows no Last sale price or date; its Appraised " +
        "figure ($850,000.00) shows.",
      steps: ["Open the map results", "Find the appraised-only property", "Confirm Last sale price + date are blank"],
    })
  })

  // MV-4 — neither row: historical sale price + date kept.
  test("MV-4 a row with neither contract nor appraised keeps its historical sale price and date", async ({
    page,
  }) => {
    await gotoMapResults(page)
    const street = "3 NEITHER NOOK"
    expect(await cellText(page, street, "salePrice")).toContain("825,000")
    expect(await cellText(page, street, "saleDate")).toContain("02/02/2026")
    await shotFocused(page, rowByStreet(page, street), SHOT_DIR, "04-neither-row")
    story.addScene({
      title: "04 — Neither row: historical sale price/date kept",
      images: [join(SHOT_DIR, "04-neither-row.png")],
      seeing:
        "The property with no contract and no appraisal still shows its historical Last sale price " +
        "($825,000.00) and Last sale date (02/02/2026).",
      steps: ["Open the map results", "Find the property with neither figure", "Confirm the historical sale price + date show"],
    })
  })

  // MV-5 — both present: historical blank; appraised AND contract price shown.
  test("MV-5 a row with both appraised and contract price hides historical but shows both", async ({
    page,
  }) => {
    await gotoMapResults(page)
    const street = "4 BOTH BOULEVARD"
    expect(await cellText(page, street, "salePrice"), "Last sale price must be blank").toBe("")
    expect(await cellText(page, street, "saleDate"), "Last sale date must be blank").toBe("")
    expect(await cellText(page, street, "appraisedAmount")).toContain("870,000")
    expect(await cellText(page, street, "contractPrice")).toContain("955,000")
    await shotFocused(page, rowByStreet(page, street), SHOT_DIR, "05-both-row")
    story.addScene({
      title: "05 — Both present: historical hidden, appraised + contract shown",
      images: [join(SHOT_DIR, "05-both-row.png")],
      seeing:
        "The property with both an appraisal and a contract shows no Last sale price/date; both Appraised " +
        "($870,000.00) and Contract Price ($955,000.00) show.",
      steps: ["Open the map results", "Find the property with both figures", "Confirm Last sale price + date are blank, both figures show"],
    })
  })

  // MV-7 — persistence across reload.
  test("MV-7 the per-row hiding survives a reload", async ({ page }) => {
    await gotoMapResults(page)
    await page.reload()
    await expect(page.getByTestId(TABLE_SCROLL)).toBeVisible({ timeout: 30_000 })
    expect(await cellText(page, "1 CONTRACT COURT", "salePrice"), "contract row stays blank").toBe("")
    expect(await cellText(page, "2 APPRAISED AVENUE", "saleDate"), "appraised row stays blank").toBe("")
    expect(await cellText(page, "3 NEITHER NOOK", "salePrice"), "neither row keeps history").toContain(
      "825,000",
    )
    await shotFocused(page, page.getByTestId(TABLE_SCROLL), SHOT_DIR, "06-after-reload")
    story.addScene({
      title: "06 — Per-row hiding survives a reload",
      images: [join(SHOT_DIR, "06-after-reload.png")],
      seeing:
        "After reloading with the map filter still active, the contract/appraised rows stay blank and the " +
        "neither-row keeps its historical sale price.",
      steps: ["Open the map results", "Reload the page", "Confirm the per-row behaviour holds"],
    })
  })
})
