import { expect, test } from "@playwright/test"

import { e2eAdminCredentials, refreshPandaE2eEnv, signInAsAdmin } from "./helpers/admin-auth"
import {
  EMPTY_LIST_RESPONSE,
  makePropertiesListResponse,
  STATUS_LIST_RESPONSE,
} from "./helpers/admin-properties-mocks"

/**
 * Properties admin — condition due date columns in the favorites table.
 *
 * MV steps covered:
 * 1. Four new columns appear in the favorites table header (Cooling Off, Sale of Property,
 *    Unconditional Contract, Completion Date).
 * 2. A row with all day counts set and a contract date shows correct DD/MM/YYYY dates.
 * 3. noConditions=true → Cooling Off column is blank; other three columns show dates.
 * 4. No accepted offer → all four condition columns blank.
 * 5. No contract date → all four condition columns blank.
 * 6. Only some day counts set → only those columns show dates, others blank.
 * 7. Quick table mode (property-type filter active) → new columns do NOT appear.
 * 8. Reload preserves values (server-computed, not client-cached).
 */

const FAVORITES_EMPTY_RESPONSE = { ...EMPTY_LIST_RESPONSE, limit: 25 }

const BASE_OVERRIDES = {
  propertyListId: 9101,
  streetAddress: "12/176 TORRENS ROAD",
  suburb: "CABOOLTURE SOUTH",
  state: "QLD",
  postcode: "4510",
  propertyType: "Villa",
  isFavorite: true,
  appraisedAmount: "775000",
  commissionRate: "2.0",
  contractDate: "2026-04-26T00:00:00.000Z",
  contractPrice: "805000",
  commissionAmount: "$16,100.00",
  successfulBuyer: "TEST BUYER",
  successfulBuyerPropertyEntityId: 1,
  successfulBuyerEntityId: 1,
}

test.describe("Properties — condition due date columns in favorites table", () => {
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

  // MV step 1 — four new column headers visible in favorites table
  test("favorites table shows coolingOffDate, saleOfPropertyDate, unconditionalContractDate, completionDate headers", async ({
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
    const card = page.getByTestId("admin-entity-list-card--properties")
    await expect(page.getByTestId("admin-entity-table-scroll--properties")).toBeVisible()

    await expect(card.getByTestId("admin-entity-col-label--properties--coolingOffDate")).toBeVisible()
    await expect(
      card.getByTestId("admin-entity-col-label--properties--saleOfPropertyDate"),
    ).toBeVisible()
    await expect(
      card.getByTestId("admin-entity-col-label--properties--unconditionalContractDate"),
    ).toBeVisible()
    await expect(
      card.getByTestId("admin-entity-col-label--properties--completionDate"),
    ).toBeVisible()
  })

  // MV step 2 — all four day counts set → correct DD/MM/YYYY dates shown
  // contract 2026-04-26 + 21d = 17/05/2026, +30d = 26/05/2026, +45d = 10/06/2026, +90d = 25/07/2026
  test("row with all condition day counts and contract date shows correct dates", async ({
    page,
  }) => {
    await page.route("**/api/admin/properties**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          makePropertiesListResponse({
            ...BASE_OVERRIDES,
            coolingOffDate: "2026-05-17T00:00:00.000Z",
            saleOfPropertyDate: "2026-05-26T00:00:00.000Z",
            unconditionalContractDate: "2026-06-10T00:00:00.000Z",
            completionDate: "2026-07-25T00:00:00.000Z",
          }),
        ),
      })
    })
    await page.goto("/admin/properties")
    const table = page.getByTestId("admin-entity-table-scroll--properties")
    await expect(table).toBeVisible()

    await expect(table).toContainText("17/05/2026")
    await expect(table).toContainText("26/05/2026")
    await expect(table).toContainText("10/06/2026")
    await expect(table).toContainText("25/07/2026")
  })

  // MV step 3 — noConditions=true → coolingOffDate blank, others show dates
  test("row with noConditions=true shows blank coolingOffDate but other condition dates", async ({
    page,
  }) => {
    await page.route("**/api/admin/properties**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          makePropertiesListResponse({
            ...BASE_OVERRIDES,
            coolingOffDate: null,
            saleOfPropertyDate: "2026-05-26T00:00:00.000Z",
            unconditionalContractDate: "2026-06-10T00:00:00.000Z",
            completionDate: "2026-07-25T00:00:00.000Z",
          }),
        ),
      })
    })
    await page.goto("/admin/properties")
    const table = page.getByTestId("admin-entity-table-scroll--properties")
    await expect(table).toBeVisible()

    await expect(table).not.toContainText("17/05/2026")
    await expect(table).toContainText("26/05/2026")
    await expect(table).toContainText("10/06/2026")
    await expect(table).toContainText("25/07/2026")
  })

  // MV step 4 — no accepted offer → all four condition columns blank
  test("row with no accepted offer shows blank condition due date cells", async ({ page }) => {
    await page.route("**/api/admin/properties**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          makePropertiesListResponse({
            propertyListId: 9101,
            isFavorite: true,
            contractPrice: null,
            commissionAmount: null,
          }),
        ),
      })
    })
    await page.goto("/admin/properties")
    const table = page.getByTestId("admin-entity-table-scroll--properties")
    await expect(table).toBeVisible()

    await expect(table).not.toContainText("17/05/2026")
    await expect(table).not.toContainText("26/05/2026")
    await expect(table).not.toContainText("10/06/2026")
    await expect(table).not.toContainText("25/07/2026")
  })

  // MV step 5 — no contract date → all four condition columns blank
  test("row with no contract date shows blank condition due date cells", async ({ page }) => {
    await page.route("**/api/admin/properties**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          makePropertiesListResponse({ ...BASE_OVERRIDES, contractDate: null }),
        ),
      })
    })
    await page.goto("/admin/properties")
    const table = page.getByTestId("admin-entity-table-scroll--properties")
    await expect(table).toBeVisible()

    await expect(table).not.toContainText("/2026")
  })

  // MV step 6 — only some day counts set → only those columns show dates
  test("row with only coolingOffDate and completionDate set shows only those two dates", async ({
    page,
  }) => {
    await page.route("**/api/admin/properties**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          makePropertiesListResponse({
            ...BASE_OVERRIDES,
            coolingOffDate: "2026-05-17T00:00:00.000Z",
            completionDate: "2026-07-25T00:00:00.000Z",
          }),
        ),
      })
    })
    await page.goto("/admin/properties")
    const table = page.getByTestId("admin-entity-table-scroll--properties")
    await expect(table).toBeVisible()

    await expect(table).toContainText("17/05/2026")
    await expect(table).toContainText("25/07/2026")
    await expect(table).not.toContainText("26/05/2026")
    await expect(table).not.toContainText("10/06/2026")
  })

  // MV step 7 — quick table mode (property-type filter) → new columns NOT present
  test("quick table mode (property-type filter active) does not show the new condition due date columns", async ({
    page,
  }) => {
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

    await expect(
      card.getByTestId("admin-entity-col-label--properties--coolingOffDate"),
    ).toHaveCount(0)
    await expect(
      card.getByTestId("admin-entity-col-label--properties--saleOfPropertyDate"),
    ).toHaveCount(0)
    await expect(
      card.getByTestId("admin-entity-col-label--properties--unconditionalContractDate"),
    ).toHaveCount(0)
  })

  // MV step 8 — reload preserves values (server-computed)
  test("reloading the favorites list page preserves condition due date column values", async ({
    page,
  }) => {
    await page.route("**/api/admin/properties**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          makePropertiesListResponse({
            ...BASE_OVERRIDES,
            coolingOffDate: "2026-05-17T00:00:00.000Z",
            saleOfPropertyDate: "2026-05-26T00:00:00.000Z",
            unconditionalContractDate: "2026-06-10T00:00:00.000Z",
            completionDate: "2026-07-25T00:00:00.000Z",
          }),
        ),
      })
    })
    await page.goto("/admin/properties")
    const table = page.getByTestId("admin-entity-table-scroll--properties")
    await expect(table).toContainText("17/05/2026")

    await page.reload()
    await expect(page.getByTestId("admin-entity-table-scroll--properties")).toContainText(
      "17/05/2026",
    )
  })
})
