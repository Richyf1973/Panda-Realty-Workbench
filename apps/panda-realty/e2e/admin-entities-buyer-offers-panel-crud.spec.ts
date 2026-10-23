/**
 * E2E: Entities dialog — Buyer Offers panel (CRUD tests)
 *
 * Covers: SF1 (table render), SF2 (conditions toggle), SF3 (delete), SF4 (add offer), SF5 (empty state)
 * Display tests (SF6–SF9) live in admin-entities-buyer-offers-panel-display.spec.ts.
 *
 * All HTTP calls are mocked — no live DB required.
 *
 * Run (from repo root):
 *   npx playwright test apps/panda-realty/e2e/admin-entities-buyer-offers-panel-crud.spec.ts --config=apps/panda-realty/playwright.config.ts
 * Or via workspace script:
 *   npm run test:e2e -w panda-realty -- apps/panda-realty/e2e/admin-entities-buyer-offers-panel-crud.spec.ts
 */

import { expect, test } from "@playwright/test"

import { requirePandaE2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import {
  CONNECTION_501,
  MOCK_BUYER_OFFERS_RESPONSE,
  MOCK_PE_ID,
  MOCK_PROPERTY_LIST_ID,
  installBaseRoutes,
  openOffersTab,
} from "./helpers/buyer-offers-panel"

test.describe("Entities dialog — Buyer Offers panel (CRUD)", () => {
  test.describe.configure({ timeout: 120_000 })

  test.beforeEach(async ({ page }) => {
    requirePandaE2eAdminCredentials()
    await installBaseRoutes(page)
    await signInAsAdmin(page)
  })

  // ── SF1: Offers table renders ──────────────────────────────────────────────

  test("SF1 — Offers tab renders table with two offer rows", async ({ page }) => {
    const { panel } = await openOffersTab(page)

    const table = panel.getByTestId("offers-tab-table")
    await expect(table).toBeVisible({ timeout: 8_000 })

    const row1 = panel.getByTestId("offers-row--9001")
    await expect(row1).toBeVisible()
    await expect(row1).toContainText("805,000")
    await expect(row1).toContainText("Accepted")

    const row2 = panel.getByTestId("offers-row--9002")
    await expect(row2).toBeVisible()
    await expect(row2).toContainText("790,000")
  })

  // ── SF2: Conditions toggle expands and collapses ───────────────────────────

  test("SF2 — Conditions toggle expands OfferConditionsPanel inline", async ({ page }) => {
    const { panel } = await openOffersTab(page)
    await expect(panel.getByTestId("offers-tab-table")).toBeVisible({ timeout: 8_000 })

    const toggle = panel.getByTestId("buyer-offer-conditions-toggle--9001")
    await expect(toggle).toBeVisible()
    await toggle.click()

    const conditionsPanel = panel.getByTestId("offer-conditions-panel--9001")
    await expect(conditionsPanel).toBeVisible({ timeout: 5_000 })

    await toggle.click()
    await expect(conditionsPanel).not.toBeVisible()
  })

  // ── SF3: Delete button removes row ────────────────────────────────────────

  test("SF3 — Delete button sends DELETE request and removes row", async ({ page }) => {
    let deleteCalled = false
    const refreshedOffersResponse = { ...MOCK_BUYER_OFFERS_RESPONSE, offers: [MOCK_BUYER_OFFERS_RESPONSE.offers[1]!] }

    await page.route("**/api/admin/buyer-offers/**", async (route) => {
      if (route.request().method() === "DELETE") {
        deleteCalled = true
        await page.route("**/api/admin/property-entities**", async (r) => {
          const url = r.request().url()
          if (url.match(/\/property-entities\/\d+\/buyer-offers/)) {
            await r.fulfill({
              status: 200,
              contentType: "application/json",
              body: JSON.stringify(refreshedOffersResponse),
            })
            return
          }
          await r.continue()
        })
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) })
        return
      }
      await route.continue()
    })

    const { panel } = await openOffersTab(page)
    await expect(panel.getByTestId("offers-tab-table")).toBeVisible({ timeout: 8_000 })
    await expect(panel.getByTestId("offers-row--9001")).toBeVisible()

    await panel.getByTestId("offers-tab-delete--9001").click()

    await expect(panel.getByTestId("offers-row--9001")).not.toBeVisible({ timeout: 5_000 })
    expect(deleteCalled).toBe(true)
  })

  // ── SF4: Add Offer form ────────────────────────────────────────────────────

  test("SF4 — New Offer form appears, submits, and new row is rendered", async ({ page }) => {
    const newOffer = {
      buyerOfferId: 9003,
      offer: "750000",
      isAccepted: false,
      dateOffered: new Date().toISOString().slice(0, 10),
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
    }
    const updatedResponse = {
      ...MOCK_BUYER_OFFERS_RESPONSE,
      offers: [...MOCK_BUYER_OFFERS_RESPONSE.offers, newOffer],
    }

    await page.route("**/api/admin/buyer-offers", async (route) => {
      if (route.request().method() === "POST") {
        await page.route("**/api/admin/property-entities**", async (r) => {
          const url = r.request().url()
          if (url.match(/\/property-entities\/\d+\/buyer-offers/)) {
            await r.fulfill({
              status: 200,
              contentType: "application/json",
              body: JSON.stringify(updatedResponse),
            })
            return
          }
          await r.continue()
        })
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ buyerOfferId: 9003 }),
        })
        return
      }
      await route.continue()
    })

    const { panel } = await openOffersTab(page)
    await expect(panel.getByTestId("offers-tab-table")).toBeVisible({ timeout: 8_000 })

    await panel.getByTestId("offers-tab-toggle-btn").click()
    const form = panel.getByTestId("offers-tab-form")
    await expect(form).toBeVisible()

    await expect(panel.getByTestId("offers-tab-submit-btn")).toBeDisabled()
    await panel.getByTestId("offers-tab-amount-input").fill("750000")
    await expect(panel.getByTestId("offers-tab-submit-btn")).toBeEnabled()

    await panel.getByTestId("offers-tab-submit-btn").click()

    await expect(form).not.toBeVisible({ timeout: 8_000 })
    await expect(panel.getByTestId("offers-row--9003")).toBeVisible({ timeout: 8_000 })
    await expect(panel.getByTestId("offers-row--9003")).toContainText("750,000")
  })

  // ── SF5: Empty state ───────────────────────────────────────────────────────

  test("SF5 — shows empty state message when no offers exist", async ({ page }) => {
    const emptyResponse = { propertyListId: MOCK_PROPERTY_LIST_ID, contractDate: null, offers: [] }

    await page.route("**/api/admin/property-entities**", async (route) => {
      const url = route.request().url()
      const method = route.request().method()

      if (method !== "GET") {
        await route.continue()
        return
      }

      if (url.match(/\/property-entities\/\d+\/buyer-offers/)) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(emptyResponse),
        })
        return
      }

      const detailMatch = url.match(/\/property-entities\/(\d+)/)
      if (detailMatch) {
        const id = Number(detailMatch[1])
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(id === MOCK_PE_ID ? CONNECTION_501 : {}),
        })
        return
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: [CONNECTION_501] }),
      })
    })

    const { panel } = await openOffersTab(page)

    await expect(panel.getByText(/no offers recorded yet/i)).toBeVisible({ timeout: 8_000 })
    await expect(panel.getByTestId("offers-tab-table")).not.toBeVisible()
  })
})
