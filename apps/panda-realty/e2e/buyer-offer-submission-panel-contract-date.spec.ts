/**
 * Run: npm run test:e2e:scratch -- --app=panda-realty --spec=apps/panda-realty/e2e/buyer-offer-submission-panel-contract-date.spec.ts --no-bail
 *
 * Covers:
 *   - Cooling Off row shows "N Days (DayName D Mon YYYY)" using contractDate as base
 *   - All timed rows (B&P, Settlement, Finance) use contractDate when present
 *   - Falls back to submittedAt when contractDate is null
 *   - Singular "1 Day" label for 1-day cooling off
 *   - "0 Days" with no appended date when waived
 *
 * Uses mocked APIs — no live DB required.
 * TDD: these tests are written BEFORE implementation (red phase).
 */

import { expect, test, type Route } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { createStory, shotFocused } from "@repo/e2e-utils"

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
  OFFER_FORM_STATUS_COOLING_OFF_FALLBACK,
  OFFER_FORM_STATUS_COOLING_OFF_ONE_DAY,
  OFFER_FORM_STATUS_COOLING_OFF_ZERO,
  OFFER_FORM_STATUS_WITH_CONTRACT_DATE,
} from "./helpers/offer-form-section-mocks"

const SHOT_DIR = join(dirname(fileURLToPath(import.meta.url)), "screenshots", "submission-panel-contract-date")

const story = createStory({ specUrl: import.meta.url, slug: "submission-panel-contract-date" })

story.setWhatWasBuilt(
  "All timed rows in the buyer offer submission panel (Cooling Off, Building & Pest, Settlement, Finance) now calculate their actual date using contractDate when set on the property, falling back to submittedAt when absent. The Cooling Off row gains date display for the first time. Day labels use correct singular/plural: '1 Day' vs 'N Days'.",
)

test.beforeEach(async () => {
  await mkdir(SHOT_DIR, { recursive: true })
})

test.afterAll(() => {
  story.write()
})

// ── Shared setup ──────────────────────────────────────────────────────────────

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
    const url = route.request().url()
    if (url.includes("/buyer-offers")) { await route.fallback(); return }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_PROPERTY_ENTITIES_RESPONSE) })
  })
  await page.route("**/api/admin/property-entities/501/buyer-offers**", async (route: Route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(BUYER_OFFERS_EMPTY) })
  })

  // Short, explicit timeouts everywhere so a wrong locator fails in ~10s rather than
  // hanging at the test timeout. The flow is fully mocked, so nothing should take long.
  const T = 10_000
  await page.goto("/admin/properties")
  await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible({ timeout: T })
  await page.getByTestId("admin-entity-row--properties--1001").click({ timeout: T })
  await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible({ timeout: T })
  await page.getByTestId("panda-properties-form-tab-trigger--buyers").click({ timeout: T })
  await expect(page.getByTestId("property-buyers-panel-add-new")).toBeEnabled({ timeout: T })
  // NOTE: prefix is `property-buyer-owner-row` (owner-style buyer row), NOT the stale
  // `property-buyer-panel-offers--` that older specs used and that no longer exists.
  await page.getByTestId("property-buyer-owner-row-offers--501").click({ timeout: T })
  await expect(page.getByTestId("property-buyer-panel-offers-dialog")).toBeVisible({ timeout: T })

  const dialog = page.getByTestId("property-buyer-panel-offers-dialog")
  await dialog.getByTestId("buyer-offer-form-view-submission--501").click({ timeout: T })
  await expect(dialog.getByTestId("buyer-offer-form-submission-panel--501")).toBeVisible({ timeout: T })

  return dialog.getByTestId("buyer-offer-form-submission-panel--501")
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe("Buyer offer submission panel — contract-date-first calculations", () => {
  // Cap each test so a hang fails fast (the flow is mocked) instead of the default 60s.
  test.describe.configure({ timeout: 30_000 })

  test.beforeEach(async ({ page }) => {
    if (!e2eAdminCredentials) throw new Error("E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set in .env.local")
    await signInAsAdmin(page)
  })

  // ── Cooling Off — contract date ────────────────────────────────────────────

  test("cooling off shows actual date using contractDate (5 days from Mon 1 Jun = Sat 6 Jun 2026)", async ({ page }) => {
    await page.route("**/api/admin/property-entities/501/offer-form-status**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(OFFER_FORM_STATUS_WITH_CONTRACT_DATE) })
    })

    const panel = await openSubmissionPanel(page)

    await expect(panel.getByTestId("submission-cooling-off-resolved")).toBeVisible({ timeout: 10_000 })
    await shotFocused(page, panel, SHOT_DIR, "01-cooling-off-with-contract-date")
    story.addScene({
      title: "01 — Cooling Off: date from contractDate",
      images: [join(SHOT_DIR, "01-cooling-off-with-contract-date.png")],
      seeing: "Cooling Off row shows '5 Days (Sat 6 Jun 2026)' — date counted from contractDate (Mon 1 Jun) not submittedAt.",
      steps: [
        "Open offer submission panel with contractDate = 2026-06-01 and coolingOffDays = 5",
        "Cooling Off row shows '5 Days (Sat 6 Jun 2026)'",
      ],
    })

    await expect(panel).toContainText("5 Days (Sat 6 Jun 2026)")
  })

  // ── All timed rows — contract date ─────────────────────────────────────────

  test("Building & Pest date uses contractDate (7 days from Mon 1 Jun = Mon 8 Jun 2026)", async ({ page }) => {
    await page.route("**/api/admin/property-entities/501/offer-form-status**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(OFFER_FORM_STATUS_WITH_CONTRACT_DATE) })
    })

    const panel = await openSubmissionPanel(page)

    await expect(panel).toBeVisible({ timeout: 10_000 })
    await expect(panel).toContainText("7 days (Mon 8 Jun 2026)")
    await expect(panel).not.toContainText("29 May")
  })

  test("Settlement date uses contractDate (33 days from Mon 1 Jun = Sat 4 Jul 2026)", async ({ page }) => {
    await page.route("**/api/admin/property-entities/501/offer-form-status**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(OFFER_FORM_STATUS_WITH_CONTRACT_DATE) })
    })

    const panel = await openSubmissionPanel(page)

    await expect(panel).toBeVisible({ timeout: 10_000 })
    await expect(panel).toContainText("33 (Sat 4 Jul 2026)")
    await expect(panel).not.toContainText("24 Jun")
  })

  test("Finance days-to-approve uses contractDate (14 days from Mon 1 Jun = Mon 15 Jun 2026)", async ({ page }) => {
    await page.route("**/api/admin/property-entities/501/offer-form-status**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(OFFER_FORM_STATUS_WITH_CONTRACT_DATE) })
    })

    const panel = await openSubmissionPanel(page)

    await expect(panel).toBeVisible({ timeout: 10_000 })
    await expect(panel).toContainText("14 (Mon 15 Jun 2026)")
    // The submittedAt-based date (Fri 5 Jun 2026) must NOT appear — use the full
    // date so "5 Jun" doesn't false-match the substring inside "15 Jun".
    await expect(panel).not.toContainText("Fri 5 Jun 2026")
  })

  // ── Fallback to submittedAt ────────────────────────────────────────────────

  test("all timed rows fall back to submittedAt when contractDate is null — cooling off shows Wed 27 May 2026", async ({ page }) => {
    await page.route("**/api/admin/property-entities/501/offer-form-status**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(OFFER_FORM_STATUS_COOLING_OFF_FALLBACK) })
    })

    const panel = await openSubmissionPanel(page)

    await expect(panel).toBeVisible({ timeout: 10_000 })
    await shotFocused(page, panel, SHOT_DIR, "02-cooling-off-fallback-submitted-at")
    story.addScene({
      title: "02 — Cooling Off: fallback to submittedAt",
      images: [join(SHOT_DIR, "02-cooling-off-fallback-submitted-at.png")],
      seeing: "When contractDate is absent, all timed rows count from submittedAt. Cooling off shows '5 Days (Wed 27 May 2026)'.",
      steps: [
        "Open offer submission panel with contractDate = null and coolingOffDays = 5",
        "Cooling Off row shows '5 Days (Wed 27 May 2026)' (submittedAt Fri 22 May + 5)",
      ],
    })

    await expect(panel).toContainText("5 Days (Wed 27 May 2026)")
    await expect(panel).toContainText("7 days (Fri 29 May 2026)")
  })

  // ── Singular label ─────────────────────────────────────────────────────────

  test("1 cooling-off day shows singular label '1 Day (Tue 2 Jun 2026)'", async ({ page }) => {
    await page.route("**/api/admin/property-entities/501/offer-form-status**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(OFFER_FORM_STATUS_COOLING_OFF_ONE_DAY) })
    })

    const panel = await openSubmissionPanel(page)

    await expect(panel).toBeVisible({ timeout: 10_000 })
    await expect(panel).toContainText("1 Day (Tue 2 Jun 2026)")
    await expect(panel).not.toContainText("1 Days")
  })

  // ── Waived (0 days) ────────────────────────────────────────────────────────

  test("0 cooling-off days shows '0 Days' with no appended date", async ({ page }) => {
    await page.route("**/api/admin/property-entities/501/offer-form-status**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(OFFER_FORM_STATUS_COOLING_OFF_ZERO) })
    })

    const panel = await openSubmissionPanel(page)

    await expect(panel).toBeVisible({ timeout: 10_000 })
    await shotFocused(page, panel, SHOT_DIR, "03-cooling-off-zero-days")
    story.addScene({
      title: "03 — Cooling Off: 0 Days (waived, no date)",
      images: [join(SHOT_DIR, "03-cooling-off-zero-days.png")],
      seeing: "When cooling-off is waived (0 days), the row shows '0 Days' with no parenthetical date.",
      steps: [
        "Open offer submission panel with coolingOffDays = 0 (waiveCoolingOff = true)",
        "Cooling Off row shows '0 Days' with no date",
      ],
    })

    const coolingOffRow = panel.getByTestId("submission-cooling-off-resolved")
    await expect(coolingOffRow).toContainText("0 Days")
    await expect(coolingOffRow).not.toContainText("(")
  })
})
