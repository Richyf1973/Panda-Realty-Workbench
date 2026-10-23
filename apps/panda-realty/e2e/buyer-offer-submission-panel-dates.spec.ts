/**
 * E2E: Buyer offer submission panel — deadline dates, formatted labels & buyer layout
 *
 * Covers:
 *   - Settlement row: shows "N (DayName D Mon YYYY)" using submittedAt as base
 *   - Building & Pest: "7_days" → "7 days (…date…)", "no" → "No" (no date)
 *   - Finance Days to Approve: shows inline deadline date
 *   - Subject to Sale status: human-readable label ("To Be Listed" etc.)
 *   - Subject to Sale timeline phases: only non-null phases shown with dates
 *   - Visual gap between buyer block and offer conditions
 *
 * Uses mocked APIs — no live DB required.
 * TDD: these tests are written BEFORE implementation.
 *
 * Requires: E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD
 */

import { expect, test, type Route } from "@playwright/test"

import { e2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import {
  BUYER_PANEL_ITEMS_RESPONSE_1001,
  EMPTY_PROPERTY_ENTITIES_RESPONSE,
  PROPERTY_EDIT_WITH_BUYER,
  SINGLE_PROPERTY_RESPONSE,
  STATUS_LIST_RESPONSE,
} from "./helpers/admin-properties-mocks"
import {
  BUYER_OFFERS_EMPTY,
  OFFER_FORM_STATUS_NO_BPEST,
  OFFER_FORM_STATUS_NULL_SETTLEMENT,
  OFFER_FORM_STATUS_WITH_DATES,
} from "./helpers/offer-form-section-mocks"

// ── Helpers ──────────────────────────────────────────────────────────────────

async function openSubmissionPanel(page: Parameters<typeof signInAsAdmin>[0]) {
  await page.route("**/api/admin/property-status**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(STATUS_LIST_RESPONSE) })
  })
  await page.route("**/api/admin/buyer-status**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [] }) })
  })
  await page.route("**/api/admin/properties**", async (route: Route) => {
    const url = route.request().url()
    if (url.match(/\/api\/admin\/properties\/1001\/buyers(\?|$)/)) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(BUYER_PANEL_ITEMS_RESPONSE_1001) })
      return
    }
    if (url.match(/\/api\/admin\/properties\/1001(\?|$)/)) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(PROPERTY_EDIT_WITH_BUYER) })
      return
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ...SINGLE_PROPERTY_RESPONSE, items: [{ ...PROPERTY_EDIT_WITH_BUYER }] }),
    })
  })
  await page.route("**/api/admin/property-entities*", async (route: Route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_PROPERTY_ENTITIES_RESPONSE) })
  })
  await page.route("**/api/admin/property-entities/501/buyer-offers**", async (route: Route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(BUYER_OFFERS_EMPTY) })
  })

  await page.goto("/admin/properties")
  await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible()
  await page.getByTestId("admin-entity-row--properties--1001").click()
  await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible()
  await page.getByTestId("panda-properties-form-tab-trigger--buyers").click()
  await expect(page.getByTestId("property-buyers-panel-add-new")).toBeEnabled({ timeout: 10_000 })
  await page.getByTestId("property-buyer-owner-row-offers--501").click()
  await expect(page.getByTestId("property-buyer-panel-offers-dialog")).toBeVisible()

  const dialog = page.getByTestId("property-buyer-panel-offers-dialog")
  await dialog.getByTestId("buyer-offer-form-view-submission--501").click()
  await expect(dialog.getByTestId("buyer-offer-form-submission-panel--501")).toBeVisible()

  return dialog.getByTestId("buyer-offer-form-submission-panel--501")
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe("Buyer offer submission panel — deadline dates and label formatting", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")
    await signInAsAdmin(page)
  })

  // ── Settlement ──────────────────────────────────────────────────────────────

  test("settlement shows days + calculated date with weekday (submittedAt 22 May + 33 = Wed 24 Jun 2026)", async ({ page }) => {
    await page.route("**/api/admin/property-entities/501/offer-form-status**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(OFFER_FORM_STATUS_WITH_DATES) })
    })

    const panel = await openSubmissionPanel(page)

    // Expect "33 (Wed 24 Jun 2026)" — days count + weekday + date
    await expect(panel).toContainText("33 (Wed 24 Jun 2026)")
  })

  test("settlement row is absent when settlementPeriod is null", async ({ page }) => {
    await page.route("**/api/admin/property-entities/501/offer-form-status**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(OFFER_FORM_STATUS_NULL_SETTLEMENT) })
    })

    const panel = await openSubmissionPanel(page)

    // Settlement row must not appear when no period stored
    await expect(panel).not.toContainText("Settlement:")
  })

  test("settlement period text format '38 Days' still parses and shows date", async ({ page }) => {
    const statusWith38Days = {
      ...OFFER_FORM_STATUS_WITH_DATES,
      submission: { ...OFFER_FORM_STATUS_WITH_DATES.submission, settlementPeriod: "38 Days", isSubjectToSale: false, isSubjectToFinance: false },
    }
    await page.route("**/api/admin/property-entities/501/offer-form-status**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(statusWith38Days) })
    })

    const panel = await openSubmissionPanel(page)

    // 22 May + 38 = 29 Jun 2026 (Mon)
    await expect(panel).toContainText("38 (Mon 29 Jun 2026)")
  })

  // ── Building & Pest ─────────────────────────────────────────────────────────

  test("building & pest '7_days' formatted as '7 days' with deadline date (Fri 29 May 2026)", async ({ page }) => {
    await page.route("**/api/admin/property-entities/501/offer-form-status**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(OFFER_FORM_STATUS_WITH_DATES) })
    })

    const panel = await openSubmissionPanel(page)

    await expect(panel).toContainText("7 days (Fri 29 May 2026)")
    // Raw enum value must not appear
    await expect(panel).not.toContainText("7_days")
  })

  test("building & pest 'no' shown as 'No' with no deadline date", async ({ page }) => {
    await page.route("**/api/admin/property-entities/501/offer-form-status**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(OFFER_FORM_STATUS_NO_BPEST) })
    })

    const panel = await openSubmissionPanel(page)

    await expect(panel).toContainText("No")
    // Raw "no" must not appear; no date appended
    await expect(panel).not.toContainText('"no"')
    await expect(panel).not.toContainText("29 May")
  })

  // ── Finance ─────────────────────────────────────────────────────────────────

  test("finance days to approve shows deadline date (14 days → Fri 5 Jun 2026)", async ({ page }) => {
    await page.route("**/api/admin/property-entities/501/offer-form-status**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(OFFER_FORM_STATUS_WITH_DATES) })
    })

    const panel = await openSubmissionPanel(page)

    await expect(panel).toContainText("14 (Fri 5 Jun 2026)")
  })

  // ── Subject to Sale ─────────────────────────────────────────────────────────

  test("subject to sale status 'to_be_listed' displayed as 'To Be Listed'", async ({ page }) => {
    await page.route("**/api/admin/property-entities/501/offer-form-status**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(OFFER_FORM_STATUS_WITH_DATES) })
    })

    const panel = await openSubmissionPanel(page)

    await expect(panel).toContainText("To Be Listed")
    await expect(panel).not.toContainText("to_be_listed")
  })

  test("subject to sale shows all 4 non-null timeline phases with calculated dates", async ({ page }) => {
    await page.route("**/api/admin/property-entities/501/offer-form-status**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(OFFER_FORM_STATUS_WITH_DATES) })
    })

    const panel = await openSubmissionPanel(page)

    // saleDaysBeforeListingLive: 7 → Fri 29 May 2026
    await expect(panel).toContainText("7 (Fri 29 May 2026)")
    // saleDaysToGetSaleContract: 20 → Thu 11 Jun 2026
    await expect(panel).toContainText("20 (Thu 11 Jun 2026)")
    // saleDaysToGetUnconditionalContract: 45 → Mon 6 Jul 2026
    await expect(panel).toContainText("45 (Mon 6 Jul 2026)")
    // saleDaysToSettleExistingProperty: 60 → Tue 21 Jul 2026
    await expect(panel).toContainText("60 (Tue 21 Jul 2026)")
  })

  test("subject to sale omits timeline rows where value is null", async ({ page }) => {
    const statusWithPartialTimeline = {
      ...OFFER_FORM_STATUS_WITH_DATES,
      submission: {
        ...OFFER_FORM_STATUS_WITH_DATES.submission,
        saleDaysBeforeListingLive: null,
        saleDaysToGetSaleContract: 20,
        saleDaysToGetUnconditionalContract: null,
        saleDaysToSettleExistingProperty: 60,
      },
    }
    await page.route("**/api/admin/property-entities/501/offer-form-status**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(statusWithPartialTimeline) })
    })

    const panel = await openSubmissionPanel(page)

    // Present phases
    await expect(panel).toContainText("20 (Thu 11 Jun 2026)")
    await expect(panel).toContainText("60 (Tue 21 Jul 2026)")
    // Absent phases (null) must not show dates for days 7 or 45
    await expect(panel).not.toContainText("Days to List:")
    await expect(panel).not.toContainText("Days to Unconditional:")
  })

  // ── Visual separation ───────────────────────────────────────────────────────

  test("buyer section is visually separated from offer conditions block", async ({ page }) => {
    await page.route("**/api/admin/property-entities/501/offer-form-status**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(OFFER_FORM_STATUS_WITH_DATES) })
    })

    const panel = await openSubmissionPanel(page)

    // Both buyer info and conditions are present
    await expect(panel).toContainText("Test Buyer")
    await expect(panel).toContainText("2nd test")
    await expect(panel).toContainText("Offer Amount:")

    // Separator element is in DOM between buyer block and conditions
    await expect(panel.locator("[data-testid='submission-conditions-start']")).toBeAttached()
  })
})
