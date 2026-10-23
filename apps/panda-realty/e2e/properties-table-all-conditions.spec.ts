import { expect, test } from "@playwright/test"

import { e2eAdminCredentials, refreshPandaE2eEnv, signInAsAdmin } from "./helpers/admin-auth"
import {
  EMPTY_LIST_RESPONSE,
  makePropertiesListResponse,
  STATUS_LIST_RESPONSE,
} from "./helpers/admin-properties-mocks"

/**
 * Properties admin — all conditions columns in the favorites table.
 *
 * MV steps covered:
 * 1. All 11 condition column headers visible in favorites table (incl. 7 new).
 * 2. Columns appear in timeline order: Cooling Off → Building & Pest → Finance →
 *    Due Diligence → Sale of Property → Unconditional Contract → Completion Date →
 *    Cash Offer → No Conditions → Subject to Sale → Other Conditions.
 * 3. 3 new date columns show correct DD/MM/YYYY dates from contractDate + days.
 * 4. isCashOffer=true renders green CircleCheck (aria-label="True"); blank when false.
 * 5. noConditions=true renders green CircleCheck; isSubjectToSale=true renders green CircleCheck.
 * 6. Other Conditions shows comma-joined customConditions labels.
 * 7. No accepted offer → all condition columns blank.
 * 8. Empty customConditions → Other Conditions column blank.
 * 9. Quick table mode (street filter) → 7 new columns absent.
 * 10. Reload preserves values (server-computed per request).
 */

const FAVORITES_EMPTY_RESPONSE = { ...EMPTY_LIST_RESPONSE, limit: 25 }

const BASE_OVERRIDES = {
  propertyListId: 9201,
  streetAddress: "55 CONDITION STREET",
  suburb: "BRISBANE",
  state: "QLD",
  postcode: "4000",
  isFavorite: true,
  appraisedAmount: "900000",
  commissionRate: "2.0",
  contractDate: "2026-04-26T00:00:00.000Z",
  contractPrice: "950000",
  commissionAmount: "$19,000.00",
  successfulBuyer: "TEST BUYER",
  successfulBuyerPropertyEntityId: 1,
  successfulBuyerEntityId: 1,
  // pre-existing condition date columns
  coolingOffDate: "2026-05-01T00:00:00.000Z",
  saleOfPropertyDate: "2026-05-26T00:00:00.000Z",
  unconditionalContractDate: "2026-06-10T00:00:00.000Z",
  completionDate: "2026-07-25T00:00:00.000Z",
  // new date columns (contractDate 2026-04-26 + days)
  buildingPestDate: "2026-05-03T00:00:00.000Z",   // +7d
  financeDate: "2026-05-10T00:00:00.000Z",         // +14d
  dueDiligenceDate: "2026-05-06T00:00:00.000Z",    // +10d
  // boolean columns
  isCashOffer: false,
  noConditions: false,
  isSubjectToSale: true,
  // other conditions
  otherConditions: "Finance, Building & Pest",
}

test.describe("Properties — all conditions columns in favorites table", () => {
  test.beforeEach(async ({ page }) => {
    refreshPandaE2eEnv()
    test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")
    await page.setViewportSize({ width: 1600, height: 900 })
    await page.route("**/api/admin/property-status**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(STATUS_LIST_RESPONSE),
      })
    })
    await signInAsAdmin(page)
  })

  // MV step 1 — all 11 condition column headers visible in favorites table
  test("favorites table shows all 11 condition column headers", async ({ page }) => {
    await page.route("**/api/admin/properties**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(FAVORITES_EMPTY_RESPONSE),
      })
    })
    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-table-scroll--properties")).toBeVisible()
    const card = page.getByTestId("admin-entity-list-card--properties")

    for (const key of [
      "coolingOffDate",
      "buildingPestDate",
      "financeDate",
      "dueDiligenceDate",
      "saleOfPropertyDate",
      "unconditionalContractDate",
      "completionDate",
      "isCashOffer",
      "noConditions",
      "isSubjectToSale",
      "otherConditions",
    ]) {
      await expect(card.getByTestId(`admin-entity-col-label--properties--${key}`)).toBeVisible()
    }
  })

  // MV step 2 — columns appear in the correct timeline order in the DOM
  test("condition columns appear in timeline order in the table header", async ({ page }) => {
    await page.route("**/api/admin/properties**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(FAVORITES_EMPTY_RESPONSE),
      })
    })
    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-table-scroll--properties")).toBeVisible()

    const expectedOrder = [
      "coolingOffDate",
      "buildingPestDate",
      "financeDate",
      "dueDiligenceDate",
      "saleOfPropertyDate",
      "unconditionalContractDate",
      "completionDate",
      "isCashOffer",
      "noConditions",
      "isSubjectToSale",
      "otherConditions",
    ]
    const allHeaders = page.locator("[data-testid^='admin-entity-col-label--properties--']")
    const testIds = await allHeaders.evaluateAll((els) =>
      els.map((el) => el.getAttribute("data-testid") ?? ""),
    )
    const conditionKeys = testIds
      .map((id) => id.replace("admin-entity-col-label--properties--", ""))
      .filter((k) => expectedOrder.includes(k))

    expect(conditionKeys).toEqual(expectedOrder)
  })

  // MV step 3 — 3 new date columns show correct DD/MM/YYYY dates
  // contractDate 2026-04-26 + 7d BP = 03/05/2026, +14d Finance = 10/05/2026, +10d DD = 06/05/2026
  test("Building & Pest, Finance, Due Diligence columns show correct computed dates", async ({
    page,
  }) => {
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

    await expect(table).toContainText("03/05/2026") // buildingPestDate
    await expect(table).toContainText("10/05/2026") // financeDate
    await expect(table).toContainText("06/05/2026") // dueDiligenceDate
  })

  // MV step 4 — isCashOffer=true renders CircleCheck; isCashOffer=false cell has no "True" aria-label
  test("isCashOffer true renders CircleCheck icon; false renders blank", async ({ page }) => {
    await page.route("**/api/admin/properties**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(makePropertiesListResponse({ ...BASE_OVERRIDES, isCashOffer: true })),
      })
    })
    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-table-scroll--properties")).toBeVisible()

    // true → CircleCheck cell has aria-label="True"
    await expect(
      page.getByTestId(`admin-entity-row-cell--properties--9201--isCashOffer`),
    ).toHaveAttribute("aria-label", "True")

    // now test false: re-route with isCashOffer=false
    await page.route("**/api/admin/properties**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(makePropertiesListResponse({ ...BASE_OVERRIDES, isCashOffer: false })),
      })
    })
    await page.reload()
    await expect(page.getByTestId("admin-entity-table-scroll--properties")).toBeVisible()
    const cell = page.getByTestId(`admin-entity-row-cell--properties--9201--isCashOffer`)
    // false → blank: no aria-label, no icon text
    await expect(cell).not.toHaveAttribute("aria-label", "True")
    await expect(cell).toBeEmpty()
  })

  // MV step 5 — noConditions=true and isSubjectToSale=true both render CircleCheck
  test("noConditions and isSubjectToSale true each render CircleCheck icon", async ({ page }) => {
    await page.route("**/api/admin/properties**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          makePropertiesListResponse({
            ...BASE_OVERRIDES,
            noConditions: true,
            isSubjectToSale: true,
          }),
        ),
      })
    })
    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-table-scroll--properties")).toBeVisible()

    await expect(
      page.getByTestId(`admin-entity-row-cell--properties--9201--noConditions`),
    ).toHaveAttribute("aria-label", "True")
    await expect(
      page.getByTestId(`admin-entity-row-cell--properties--9201--isSubjectToSale`),
    ).toHaveAttribute("aria-label", "True")
  })

  // MV step 6 — Other Conditions shows comma-joined customConditions labels
  test("Other Conditions column shows comma-joined customConditions labels", async ({ page }) => {
    await page.route("**/api/admin/properties**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          makePropertiesListResponse({
            ...BASE_OVERRIDES,
            otherConditions: "Finance, Building & Pest",
          }),
        ),
      })
    })
    await page.goto("/admin/properties")
    const table = page.getByTestId("admin-entity-table-scroll--properties")
    await expect(table).toBeVisible()
    await expect(table).toContainText("Finance, Building & Pest")
  })

  // MV step 7 — no accepted offer → all new condition columns blank
  test("row with no accepted offer shows blank for all new condition columns", async ({ page }) => {
    await page.route("**/api/admin/properties**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          makePropertiesListResponse({
            propertyListId: 9201,
            isFavorite: true,
            contractPrice: null,
            commissionAmount: null,
            buildingPestDate: null,
            financeDate: null,
            dueDiligenceDate: null,
            isCashOffer: null,
            noConditions: null,
            isSubjectToSale: null,
            otherConditions: null,
          }),
        ),
      })
    })
    await page.goto("/admin/properties")
    const table = page.getByTestId("admin-entity-table-scroll--properties")
    await expect(table).toBeVisible()

    await expect(table).not.toContainText("03/05/2026")
    await expect(table).not.toContainText("10/05/2026")
    await expect(table).not.toContainText("06/05/2026")
    await expect(
      page.getByTestId(`admin-entity-row-cell--properties--9201--isCashOffer`),
    ).toBeEmpty()
  })

  // MV step 8 — empty customConditions → Other Conditions blank
  test("empty customConditions renders blank Other Conditions cell", async ({ page }) => {
    await page.route("**/api/admin/properties**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          makePropertiesListResponse({ ...BASE_OVERRIDES, otherConditions: null }),
        ),
      })
    })
    await page.goto("/admin/properties")
    const table = page.getByTestId("admin-entity-table-scroll--properties")
    await expect(table).toBeVisible()

    const otherCell = page.getByTestId(`admin-entity-row-cell--properties--9201--otherConditions`)
    await expect(otherCell).toBeEmpty()
  })

  // MV step 9 — quick card mode (property-type filter active) → new columns NOT present
  test("quick table mode does not show the 7 new condition columns", async ({ page }) => {
    await page.route("**/api/admin/properties**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(FAVORITES_EMPTY_RESPONSE),
      })
    })
    await page.goto(`/admin/properties?propertyType=House`)
    const card = page.getByTestId("admin-entity-list-card--properties")
    await expect(card).toBeVisible()
    await expect(page.getByTestId("admin-entity-quick-cards-scroll--properties")).toBeVisible({ timeout: 30_000 })
    await expect(page.getByTestId("admin-entity-table-scroll--properties")).toHaveCount(0)

    for (const key of [
      "buildingPestDate",
      "financeDate",
      "dueDiligenceDate",
      "isCashOffer",
      "noConditions",
      "isSubjectToSale",
      "otherConditions",
    ]) {
      await expect(
        card.getByTestId(`admin-entity-col-label--properties--${key}`),
      ).toHaveCount(0)
    }
  })

  // MV step 10 — reload preserves values (server-computed per request)
  test("reloading the favorites list preserves all new condition column values", async ({
    page,
  }) => {
    await page.route("**/api/admin/properties**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(makePropertiesListResponse(BASE_OVERRIDES)),
      })
    })
    await page.goto("/admin/properties")
    const table = page.getByTestId("admin-entity-table-scroll--properties")
    await expect(table).toContainText("03/05/2026")
    await expect(table).toContainText("Finance, Building & Pest")

    await page.reload()
    await expect(page.getByTestId("admin-entity-table-scroll--properties")).toContainText(
      "03/05/2026",
    )
    await expect(page.getByTestId("admin-entity-table-scroll--properties")).toContainText(
      "Finance, Building & Pest",
    )
  })
})
