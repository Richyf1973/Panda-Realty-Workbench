/**
 * E2E: Buyer offer form history — server-side insert verification (live DB)
 *
 * Covers: final submit always INSERTs a new buyer_offers row, draft saves skip insert,
 * double-submit creates two rows, offer-form-status returns latest final submission.
 *
 * Requires: E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD, DATABASE_URL
 */

import { expect, test, type Page } from "@playwright/test"

import {
  e2eAdminCredentials,
  e2ePandaAdminListApiConfigured,
  signInAsAdmin,
} from "./helpers/admin-auth"

const FINAL_SUBMIT_BODY = {
  buyers: [{ name: "Test Buyer", phone: "0400000001", email: "test@example.com", address: "1 Test St" }],
  buyer1Name: "Test Buyer",
  offerAmount: "949000",
}

const DRAFT_SUBMIT_BODY = { ...FINAL_SUBMIT_BODY, offerAmount: "900000" }

async function getFormUrlAndPropertyEntityId(page: Page): Promise<{ formUrl: string; apiUrl: string; propertyEntityId: number }> {
  await page.goto("/admin/properties")
  await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible({ timeout: 20_000 })
  const firstPropRow = page.getByTestId(/^admin-entity-row--properties--/).first()
  await firstPropRow.click()
  await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible()
  await page.getByTestId("panda-properties-form-tab-trigger--buyers").click()
  await expect(page.getByTestId("property-buyers-panel-add-new")).toBeEnabled({ timeout: 10_000 })

  const firstOfferBtn = page.getByTestId(/^property-buyer-owner-row-offers--/).first()
  await firstOfferBtn.waitFor({ timeout: 10_000 })
  const testId = (await firstOfferBtn.getAttribute("data-testid")) ?? ""
  const propertyEntityId = parseInt(testId.replace("property-buyer-owner-row-offers--", ""), 10)

  await firstOfferBtn.click()
  const dialog = page.getByTestId("property-buyer-panel-offers-dialog")
  await expect(dialog).toBeVisible()

  // buyer-offer-form-url--{id} is an <a> tag — use textContent(), not inputValue()
  const formUrlEl = dialog.getByTestId(`buyer-offer-form-url--${propertyEntityId}`)
  await expect(formUrlEl).toBeVisible({ timeout: 10_000 })
  const formUrl = (await formUrlEl.textContent()) ?? ""
  const apiUrl = formUrl.replace("/offer-form/", "/api/offer-form/")
  return { formUrl, apiUrl, propertyEntityId }
}

test.describe("Buyer offer form history — server-side inserts (live DB)", () => {
  test.describe.configure({ mode: "serial" })

  test.beforeEach(async ({ page }) => {
    if (!e2eAdminCredentials) {
      throw new Error("Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD (see apps/panda-realty/.env.example).")
    }
    if (!e2ePandaAdminListApiConfigured) {
      throw new Error("Set DATABASE_URL for Panda live E2E — buyer_offers insert verification requires DB access.")
    }
    await signInAsAdmin(page)
  })

  test("Final form submit always inserts a new buyer_offers row (old rows preserved)", async ({ page }) => {
    const { apiUrl } = await getFormUrlAndPropertyEntityId(page)
    const dialog = page.getByTestId("property-buyer-panel-offers-dialog")
    const table = dialog.getByTestId("offers-tab-table")

    const initialRows = await dialog.getByTestId(/^offers-row--/).count()

    const res = await page.request.post(apiUrl, {
      data: { ...FINAL_SUBMIT_BODY, offerAmount: "949000" },
      headers: { "Content-Type": "application/json" },
    })
    expect(res.status()).toBe(200)

    await dialog.getByTestId("buyer-offers-panel-refresh-btn").click()
    await expect(dialog.getByTestId(/^offers-row--/)).toHaveCount(initialRows + 1, { timeout: 10_000 })
    await expect(table).toContainText("949,000")
  })

  test("Draft form submit does NOT create a new buyer_offers row", async ({ page }) => {
    const { apiUrl } = await getFormUrlAndPropertyEntityId(page)
    const dialog = page.getByTestId("property-buyer-panel-offers-dialog")

    const initialRows = await dialog.getByTestId(/^offers-row--/).count()

    const res = await page.request.post(`${apiUrl}?draft=true`, {
      data: { ...DRAFT_SUBMIT_BODY },
      headers: { "Content-Type": "application/json" },
    })
    expect(res.status()).toBe(200)
    const body = await res.json() as { ok: boolean; draft?: boolean }
    expect(body.draft).toBe(true)

    await dialog.getByTestId("buyer-offers-panel-refresh-btn").click()
    // Wait for loading to complete before asserting unchanged count
    await page.waitForTimeout(2_000)
    await expect(dialog.getByTestId(/^offers-row--/)).toHaveCount(initialRows, { timeout: 10_000 })
  })

  test("Submitting form twice creates two separate offer rows", async ({ page }) => {
    const { apiUrl } = await getFormUrlAndPropertyEntityId(page)
    const dialog = page.getByTestId("property-buyer-panel-offers-dialog")

    const initialRows = await dialog.getByTestId(/^offers-row--/).count()

    const res1 = await page.request.post(apiUrl, {
      data: { ...FINAL_SUBMIT_BODY, offerAmount: "900000" },
      headers: { "Content-Type": "application/json" },
    })
    expect(res1.status()).toBe(200)

    const res2 = await page.request.post(apiUrl, {
      data: { ...FINAL_SUBMIT_BODY, offerAmount: "900000" },
      headers: { "Content-Type": "application/json" },
    })
    expect(res2.status()).toBe(200)

    await dialog.getByTestId("buyer-offers-panel-refresh-btn").click()
    await expect(dialog.getByTestId(/^offers-row--/)).toHaveCount(initialRows + 2, { timeout: 10_000 })
  })

  test("offer-form-status View Submission shows latest final submission (not a stale one)", async ({ page }) => {
    const { apiUrl, propertyEntityId } = await getFormUrlAndPropertyEntityId(page)
    const dialog = page.getByTestId("property-buyer-panel-offers-dialog")

    const res1 = await page.request.post(apiUrl, {
      data: { ...FINAL_SUBMIT_BODY, offerAmount: "800000" },
      headers: { "Content-Type": "application/json" },
    })
    expect(res1.status()).toBe(200)

    const res2 = await page.request.post(apiUrl, {
      data: { ...FINAL_SUBMIT_BODY, offerAmount: "950000" },
      headers: { "Content-Type": "application/json" },
    })
    expect(res2.status()).toBe(200)

    // Reopen the dialog to re-fetch offer-form-status
    await page.keyboard.press("Escape")
    await expect(dialog).not.toBeVisible({ timeout: 5_000 })
    await page.getByTestId(`property-buyer-owner-row-offers--${propertyEntityId}`).click()
    const freshDialog = page.getByTestId("property-buyer-panel-offers-dialog")
    await expect(freshDialog).toBeVisible()

    const viewBtn = freshDialog.getByTestId(`buyer-offer-form-view-submission--${propertyEntityId}`)
    await expect(viewBtn).toBeVisible({ timeout: 10_000 })
    await viewBtn.click()
    const submissionPanel = freshDialog.getByTestId(`buyer-offer-form-submission-panel--${propertyEntityId}`)
    await expect(submissionPanel).toBeVisible()
    await expect(submissionPanel).toContainText("$950000")
    await expect(submissionPanel).not.toContainText("$800000")
  })
})
