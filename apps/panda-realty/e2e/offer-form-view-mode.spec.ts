/**
 * E2E (TDD): Offer form view mode (?offerId=&view=1)
 *
 * Tests that the public offer form at /offer-form/{token} correctly handles
 * the new ?offerId= and ?view=1 query params:
 *   - ?offerId= causes the API to prefill from that specific buyerOffer row
 *   - ?view=1 renders the form in read-only mode (no submit, read-only banner)
 *   - Without view=1 the form stays editable
 *   - Graceful fallback for unknown offerId
 *
 * No sign-in required — /offer-form is a public page.
 * All API calls are mocked.
 *
 * Run:
 *   npm run test:e2e -w panda-realty -- apps/panda-realty/e2e/offer-form-view-mode.spec.ts
 */

import { expect, test } from "@playwright/test"

const MOCK_TOKEN = "test-offer-form-token-abc"
const MOCK_OFFER_ID = 9001

const MOCK_PREFILL = {
  propertyAddress: "45 Test Street, QLD 4505",
  buyers: [{ name: "John Smith", phone: "0400 111 222", email: "john@example.com", address: "" }],
  rep: null,
  solicitorName: null,
  solicitorPhone: null,
  solicitorAddress: null,
  solicitorEmail: null,
  offerAmount: "1200000",
  settlementPeriod: "38 Days",
  isCashOffer: false,
  isSubjectToFinance: true,
  financeBank: "CBA",
  financeApprovalDays: "14",
  waiveCoolingOff: false,
  viewMode: true,
}

test.describe("Offer form — view mode (?offerId=&view=1)", () => {
  test.describe.configure({ timeout: 60_000 })

  test.beforeEach(async ({ page }) => {
    await page.route(`**/api/offer-form/${MOCK_TOKEN}**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_PREFILL),
      })
    })
  })

  // ── SF1: Form shows prefill data ──────────────────────────────────────────

  test("SF1 — form shows prefilled offer amount from the specific offer", async ({ page }) => {
    await page.goto(`/offer-form/${MOCK_TOKEN}?offerId=${MOCK_OFFER_ID}&view=1`)
    await page.waitForLoadState("domcontentloaded")

    await expect(page.getByTestId("offer-form-not-found")).not.toBeVisible({ timeout: 8_000 })
    await expect(page.getByTestId("offer-form-offer-amount")).toHaveValue("1200000", { timeout: 8_000 })
  })

  // ── SF2: Read-only banner present when view=1 ─────────────────────────────

  test("SF2 — view=1 renders a read-only mode banner", async ({ page }) => {
    await page.goto(`/offer-form/${MOCK_TOKEN}?offerId=${MOCK_OFFER_ID}&view=1`)
    await page.waitForLoadState("domcontentloaded")

    await expect(page.getByTestId("offer-form-view-mode-banner")).toBeVisible({ timeout: 8_000 })
  })

  // ── SF3: Submit button absent in view mode ────────────────────────────────

  test("SF3 — submit button not rendered in view mode", async ({ page }) => {
    await page.goto(`/offer-form/${MOCK_TOKEN}?offerId=${MOCK_OFFER_ID}&view=1`)
    await page.waitForLoadState("domcontentloaded")

    await expect(page.getByTestId("offer-form-view-mode-banner")).toBeVisible({ timeout: 8_000 })
    await expect(page.getByTestId("offer-form-submit")).not.toBeVisible()
  })

  // ── SF4: Without view=1 form is editable ─────────────────────────────────

  test("SF4 — without view=1 the form is editable (no read-only banner)", async ({ page }) => {
    await page.route(`**/api/offer-form/${MOCK_TOKEN}**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ...MOCK_PREFILL, viewMode: false }),
      })
    })

    await page.goto(`/offer-form/${MOCK_TOKEN}?offerId=${MOCK_OFFER_ID}`)
    await page.waitForLoadState("domcontentloaded")

    await expect(page.getByTestId("offer-form-view-mode-banner")).not.toBeVisible({ timeout: 8_000 })
    await expect(page.getByTestId("offer-form-submit")).toBeVisible({ timeout: 8_000 })
  })

  // ── SF5: Graceful fallback for unknown offerId ────────────────────────────

  test("SF5 — unknown offerId returns graceful error, not a crash", async ({ page }) => {
    await page.route(`**/api/offer-form/${MOCK_TOKEN}**`, async (route) => {
      await route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ error: "Offer not found" }) })
    })

    await page.goto(`/offer-form/${MOCK_TOKEN}?offerId=99999&view=1`)
    await page.waitForLoadState("domcontentloaded")

    await expect(page.getByTestId("offer-form-not-found")).toBeVisible({ timeout: 8_000 })
    await expect(page.locator("body")).not.toContainText("500", { timeout: 3_000 })
  })
})
