import { expect, test } from "@playwright/test"

import { e2eAdminCredentials, refreshPandaE2eEnv, signInAsAdmin } from "./helpers/admin-auth"
import {
  EMPTY_LIST_RESPONSE,
  makePropertiesListResponse,
  STATUS_LIST_RESPONSE,
} from "./helpers/admin-properties-mocks"

/**
 * Properties admin — condition columns center-aligned in favorites table.
 *
 * MV steps covered:
 * 1. Cooling Off column header is centered (text-align: center).
 * 2. Building & Pest column header is centered.
 * 3. Finance column header is centered.
 * 4. Due Diligence column header is centered.
 * 5. Sale of Property column header is centered.
 * 6. Unconditional column header is centered.
 * 7. A condition date cell value is centered.
 * 8. Non-condition columns (Appraised, Contract Price) are NOT centered.
 */

const CONDITION_COLUMN_IDS = [
  "coolingOffDate",
  "buildingPestDate",
  "financeDate",
  "dueDiligenceDate",
  "saleOfPropertyDate",
  "unconditionalContractDate",
] as const

const FAVORITES_EMPTY_RESPONSE = { ...EMPTY_LIST_RESPONSE, limit: 25 }

const BASE_OVERRIDES = {
  propertyListId: 9301,
  streetAddress: "1 ALIGN STREET",
  suburb: "BRISBANE",
  state: "QLD",
  postcode: "4000",
  isFavorite: true,
  appraisedAmount: "800000",
  commissionRate: "2.0",
  contractDate: "2026-04-26T00:00:00.000Z",
  contractPrice: "850000",
  commissionAmount: "$17,000.00",
  successfulBuyer: "TEST BUYER",
  successfulBuyerPropertyEntityId: 1,
  successfulBuyerEntityId: 1,
  coolingOffDate: "2026-05-01T00:00:00.000Z",
  buildingPestDate: "2026-05-03T00:00:00.000Z",
  financeDate: "2026-05-10T00:00:00.000Z",
  dueDiligenceDate: "2026-05-06T00:00:00.000Z",
  saleOfPropertyDate: "2026-05-26T00:00:00.000Z",
  unconditionalContractDate: "2026-06-10T00:00:00.000Z",
  completionDate: "2026-07-25T00:00:00.000Z",
}

test.describe("Properties — condition columns are center-aligned in favorites table", () => {
  test.beforeEach(async ({ page }) => {
    refreshPandaE2eEnv()
    test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.route("**/api/admin/property-status**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(STATUS_LIST_RESPONSE),
      })
    })
    await signInAsAdmin(page)
  })

  // MV step 1–6: all six condition column headers are center-aligned
  for (const columnId of CONDITION_COLUMN_IDS) {
    test(`condition column header "${columnId}" has text-align: center`, async ({ page }) => {
      await page.route("**/api/admin/properties**", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(FAVORITES_EMPTY_RESPONSE),
        })
      })
      await page.goto("/admin/properties")
      await expect(page.getByTestId("admin-entity-table-scroll--properties")).toBeVisible()

      const th = page.getByTestId(`admin-entity-col-header--properties--${columnId}`)
      await expect(th).toBeVisible()
      const textAlign = await th.evaluate((el) => getComputedStyle(el).textAlign)
      expect(textAlign).toBe("center")
    })
  }

  // MV step 7: a populated condition date cell is center-aligned
  test("populated condition date cell value is center-aligned", async ({ page }) => {
    await page.route("**/api/admin/properties**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(makePropertiesListResponse(BASE_OVERRIDES)),
      })
    })
    await page.goto("/admin/properties")
    const table = page.getByTestId("admin-entity-table-scroll--properties")
    await expect(table).toBeVisible()
    await expect(table).toContainText("01/05/2026")

    // Find a td in the coolingOffDate column by locating it via its column index
    const th = page.getByTestId("admin-entity-col-header--properties--coolingOffDate")
    const columnIndex = await th.evaluate((el) => {
      const row = el.closest("tr")
      if (!row) return -1
      return Array.from(row.children).indexOf(el)
    })
    expect(columnIndex).toBeGreaterThanOrEqual(0)

    const firstRow = page.getByTestId("admin-entity-table-body--properties").locator("tr").first()
    const cell = firstRow.locator("td").nth(columnIndex)
    const textAlign = await cell.evaluate((el) => getComputedStyle(el).textAlign)
    expect(textAlign).toBe("center")
  })

  // MV step 8: non-condition columns are NOT center-aligned
  test("non-condition column headers (appraisedAmount, contractPrice) are not center-aligned", async ({
    page,
  }) => {
    await page.route("**/api/admin/properties**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(FAVORITES_EMPTY_RESPONSE),
      })
    })
    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-table-scroll--properties")).toBeVisible()

    const appraisedTh = page.getByTestId("admin-entity-col-header--properties--appraisedAmount")
    await expect(appraisedTh).toBeVisible()
    const appraisedAlign = await appraisedTh.evaluate((el) => getComputedStyle(el).textAlign)
    expect(appraisedAlign).not.toBe("center")

    const contractPriceTh = page.getByTestId("admin-entity-col-header--properties--contractPrice")
    await expect(contractPriceTh).toBeVisible()
    const contractPriceAlign = await contractPriceTh.evaluate((el) => getComputedStyle(el).textAlign)
    expect(contractPriceAlign).not.toBe("center")
  })
})
