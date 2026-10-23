/**
 * Regression: Edit Buyer dialog — Offers tab renders custom panel (PropertyEntityBuyerOffersPanel).
 *
 * The buyerOffers collection was migrated from an inline grid to a custom panel backed by
 * GET /api/admin/property-entities/{id}/buyer-offers. Tests updated from inline-grid
 * assertions (now removed) to custom-panel assertions.
 */

import { expect, test } from "@playwright/test"

import { requirePandaE2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import {
  BUYER_ENTITY_DETAIL,
  BUYER_ENTITY_ROW,
  CONNECTION_501_DETAIL,
  EMPTY_LIST,
} from "./helpers/buyer-offers-edit-mocks"

// ---------------------------------------------------------------------------
// Mock buyer-offers response (matches /api/admin/property-entities/{id}/buyer-offers)
// ---------------------------------------------------------------------------

const MOCK_BUYER_OFFERS_RESPONSE = {
  propertyListId: 1001,
  contractDate: null,
  offers: [
    {
      buyerOfferId: 9001,
      offer: "1240000",
      isAccepted: true,
      dateOffered: "2026-03-09",
      isCashOffer: false,
      noConditions: false,
      coolingOffDays: null,
      financeDays: null,
      buildingPestDays: null,
      dueDiligenceDays: null,
      subjectToSaleDays: null,
      depositInitial: null,
      depositBalance: null,
      otherConditions: null,
      conditionNotes: null,
      settlementCalendarEventId: null,
      coolingOffCalendarEventId: null,
      financeCalendarEventId: null,
      buildingPestCalendarEventId: null,
    },
  ],
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe("Edit Buyer dialog — Offers inline grid regression", () => {
  test.describe.configure({ timeout: 120_000 })

  test.beforeEach(async ({ page }) => {
    requirePandaE2eAdminCredentials()

    // Entities list → one buyer row; detail → buyer entity
    await page.route("**/api/admin/entities**", async (route) => {
      if (route.request().method() !== "GET") {
        await route.continue()
        return
      }
      const url = route.request().url()
      if (url.match(/\/api\/admin\/entities\/201(\?|$)/)) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(BUYER_ENTITY_DETAIL),
        })
        return
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ...EMPTY_LIST,
          items: [BUYER_ENTITY_ROW],
          totalCount: 1,
          totalPages: 1,
        }),
      })
    })

    // Property connections list, detail, and buyer-offers sub-route
    await page.route("**/api/admin/property-entities**", async (route) => {
      const method = route.request().method()
      if (method !== "GET") {
        await route.continue()
        return
      }
      const url = route.request().url()

      // Must check buyer-offers sub-route BEFORE the generic detail match
      if (url.match(/\/property-entities\/\d+\/buyer-offers/)) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(MOCK_BUYER_OFFERS_RESPONSE),
        })
        return
      }

      const detailMatch = url.match(/\/property-entities\/(\d+)/)
      if (detailMatch) {
        const id = Number(detailMatch[1])
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(id === 501 ? CONNECTION_501_DETAIL : {}),
        })
        return
      }
      // List: return the single connection
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: [CONNECTION_501_DETAIL] }),
      })
    })

    // Ancillary APIs the entities form loads
    for (const pattern of [
      "**/api/admin/entity-members**",
      "**/api/admin/buyer-status**",
      "**/api/admin/property-status**",
      "**/api/admin/buyer-pipeline-status**",
      "**/api/admin/entity-categories**",
      "**/api/admin/lead-sources**",
    ]) {
      await page.route(pattern, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(EMPTY_LIST),
        })
      })
    }

    await signInAsAdmin(page)
  })

  test("Offers tab renders custom panel with saved offer row", async ({
    page,
  }) => {
    await page.goto(
      "/admin/entities?limit=25&page=1&sortKey=entityName&sortDir=asc&entityCategoryId=1&listLayout=grid",
    )
    await page.waitForLoadState("domcontentloaded")

    // Open the Edit Buyer dialog
    await page.getByTestId(/^admin-entity-row-edit--entities--/).first().click()

    const dialog = page.getByTestId("admin-entity-crud-dialog--entities")
    await expect(dialog).toBeVisible()
    await expect(dialog.getByTestId("panda-entities-dialog-form")).toBeVisible()

    // Scroll to property connections section
    const dialogForm = dialog.getByTestId("panda-entities-dialog-form")
    await dialogForm.evaluate((el) => el.scrollTo(0, el.scrollHeight))

    const connections = dialog.getByTestId("panda-entities-property-connections")
    await expect(connections).toBeVisible({ timeout: 10_000 })

    // Click the Offers tab
    const offersTab = connections
      .getByTestId("admin-entity-crud-related-tabs--property-entities")
      .getByRole("tab", { name: /^offers$/i })
    await expect(offersTab).toBeVisible({ timeout: 30_000 })
    await offersTab.click()

    const panel = connections.getByTestId(
      "admin-entity-crud-related-panel--property-entities--buyer-offers-tab",
    )
    await expect(panel).toBeVisible({ timeout: 10_000 })

    // Saved offer row is visible in the custom panel
    await expect(panel.getByTestId("offers-tab-table")).toBeVisible({ timeout: 8_000 })
    await expect(panel.getByTestId("offers-row--9001")).toBeVisible()
    await expect(panel.getByTestId("offers-row--9001")).toContainText("1,240,000")
    await expect(panel.getByTestId("offers-row--9001")).toContainText("Accepted")
  })

  test("deleting a saved accepted offer issues DELETE immediately; row stays gone after tab switch", async ({
    page,
  }) => {
    let deleteCalls = 0
    const emptyOffersResponse = { ...MOCK_BUYER_OFFERS_RESPONSE, offers: [] }

    await page.route("**/api/admin/buyer-offers/**", async (route) => {
      const req = route.request()
      if (req.method() === "DELETE" && req.url().includes("/buyer-offers/9001")) {
        deleteCalls += 1
        // After delete, the refetch returns empty offers
        await page.route("**/api/admin/property-entities**", async (r) => {
          const url = r.request().url()
          if (url.match(/\/property-entities\/\d+\/buyer-offers/)) {
            await r.fulfill({
              status: 200,
              contentType: "application/json",
              body: JSON.stringify(emptyOffersResponse),
            })
            return
          }
          await r.continue()
        })
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true }),
        })
        return
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({}),
      })
    })

    await page.goto(
      "/admin/entities?limit=25&page=1&sortKey=entityName&sortDir=asc&entityCategoryId=1&listLayout=grid",
    )
    await page.waitForLoadState("domcontentloaded")

    await page.getByTestId(/^admin-entity-row-edit--entities--/).first().click()

    const dialog = page.getByTestId("admin-entity-crud-dialog--entities")
    await expect(dialog).toBeVisible()
    const dialogForm = dialog.getByTestId("panda-entities-dialog-form")
    await dialogForm.evaluate((el) => el.scrollTo(0, el.scrollHeight))

    const connections = dialog.getByTestId("panda-entities-property-connections")
    await expect(connections).toBeVisible({ timeout: 10_000 })

    const peTabs = connections.getByTestId("admin-entity-crud-related-tabs--property-entities")
    await expect(peTabs.getByRole("tab", { name: /^offers$/i })).toBeVisible({ timeout: 30_000 })
    await peTabs.getByRole("tab", { name: /^offers$/i }).click()

    const panel = connections.getByTestId(
      "admin-entity-crud-related-panel--property-entities--buyer-offers-tab",
    )
    await expect(panel).toBeVisible({ timeout: 10_000 })
    await expect(panel.getByTestId("offers-row--9001")).toBeVisible({ timeout: 8_000 })

    // Delete the offer
    await panel.getByTestId("offers-tab-delete--9001").click()

    // Row disappears immediately
    await expect(panel.getByTestId("offers-row--9001")).not.toBeVisible({ timeout: 5_000 })
    expect(deleteCalls).toBe(1)

    // Switch to Notes tab and back — row should still be gone
    await peTabs.getByRole("tab", { name: /^notes$/i }).click()
    await peTabs.getByRole("tab", { name: /^offers$/i }).click()

    await expect(panel.getByTestId("offers-row--9001")).not.toBeVisible({ timeout: 5_000 })
  })
})
