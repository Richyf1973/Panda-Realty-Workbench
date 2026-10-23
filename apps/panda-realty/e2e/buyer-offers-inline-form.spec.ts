/**
 * E2E: Buyer detail panel — "New Offer" inline form (Offers tab)
 *
 * Success factors:
 * 1. "+ New Offer" toggle button is visible when the Offers tab is active
 * 2. Clicking the button reveals the inline form (amount input, date btn, accepted checkbox, submit btn)
 * 3. "Add Offer" button is disabled while amount is empty; enabled once text is entered
 * 4. Date Offered defaults to today's date
 * 5. After a successful submit the form collapses and the new offer row appears in the table
 * 6. Submitting with isAccepted=true shows an "Accepted" badge on the new row
 * 7. Clicking "Cancel" hides the form without submitting
 * 8. After submit the form resets (amount cleared, date back to today, accepted unchecked)
 *
 * Requires: E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD, DATABASE_URL
 * Run: PLAYWRIGHT_HEADED=1 npx playwright test e2e/buyer-offers-inline-form.spec.ts
 */

import { expect, test, type Page } from "@playwright/test"

import {
  e2eAdminCredentials,
  e2ePandaAdminListApiConfigured,
  signInAsAdmin,
} from "./helpers/admin-auth"
import { deletePandaBuyerOffersForEntityId } from "./helpers/delete-panda-buyer-offers-for-entity"

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Navigate to the buyers pipeline, open the first buyer card, go to Offers tab. */
async function openFirstBuyerOffersTab(page: Page) {
  await page.goto("/admin/pipeline?pipeline=buyers")

  const firstCard = page.getByTestId(/^kanban-buyer-card--/).first()
  await firstCard.waitFor({ timeout: 20_000 })

  // Grab the entityId from the testid so callers can clean up offers
  const testId = (await firstCard.getAttribute("data-testid")) ?? ""
  const entityId = parseInt(testId.replace("kanban-buyer-card--", ""), 10)

  await firstCard.click()
  await page.getByTestId("panel-content-ready").waitFor({ timeout: 15_000 })
  await page.getByTestId("buyer-panel-tab--offers").click()

  return { entityId }
}

/**
 * Full reload drops client selection — the pipeline renders but the detail panel is empty.
 * Re-click the same buyer card (when we have a valid entity id) then wait for panel + Offers tab.
 */
async function reopenBuyerOffersAfterReload(page: Page, entityId: number) {
  await page.waitForLoadState("networkidle")
  const card =
    Number.isFinite(entityId) && entityId > 0
      ? page.getByTestId(`kanban-buyer-card--${entityId}`)
      : page.getByTestId(/^kanban-buyer-card--/).first()
  await card.waitFor({ state: "visible", timeout: 20_000 })
  await card.click()
  await page.getByTestId("panel-content-ready").waitFor({ timeout: 20_000 })
  await page.getByTestId("buyer-panel-tab--offers").click()
}

/** Today's date formatted the same way the panel does: "16 Apr 2026" */
function todayFormatted(): string {
  return new Date().toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

// ── Tests ────────────────────────────────────────────────────────────────────

test.describe("Buyer detail panel — New Offer inline form", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")
    test.skip(!e2ePandaAdminListApiConfigured, "DATABASE_URL not set — live DB required")
    await signInAsAdmin(page)
  })

  // ── SF1: toggle button visible ─────────────────────────────────────────────

  test("SF1 — New Offer toggle button is visible on Offers tab", async ({ page }) => {
    const { entityId } = await openFirstBuyerOffersTab(page)
    if (isNaN(entityId)) test.skip(true, "Could not parse entityId from card testid")

    await expect(page.getByTestId("offers-tab-toggle-btn")).toBeVisible()
    await expect(page.getByTestId("offers-tab-toggle-btn")).toContainText("New Offer")
  })

  // ── SF2: form fields appear on click ──────────────────────────────────────

  test("SF2 — clicking New Offer reveals the inline form fields", async ({ page }) => {
    await openFirstBuyerOffersTab(page)

    await page.getByTestId("offers-tab-toggle-btn").click()

    await expect(page.getByTestId("offers-tab-form")).toBeVisible()
    await expect(page.getByTestId("offers-tab-amount-input")).toBeVisible()
    await expect(page.getByTestId("offers-tab-date-btn")).toBeVisible()
    await expect(page.getByTestId("offers-tab-accepted-checkbox")).toBeVisible()
    await expect(page.getByTestId("offers-tab-submit-btn")).toBeVisible()
  })

  // ── SF3: submit disabled while amount empty ────────────────────────────────

  test("SF3 — Add Offer button is disabled until amount is entered", async ({ page }) => {
    await openFirstBuyerOffersTab(page)
    await page.getByTestId("offers-tab-toggle-btn").click()

    const submit = page.getByTestId("offers-tab-submit-btn")
    await expect(submit).toBeDisabled()

    await page.getByTestId("offers-tab-amount-input").fill("500000")
    await expect(submit).toBeEnabled()

    await page.getByTestId("offers-tab-amount-input").fill("")
    await expect(submit).toBeDisabled()
  })

  // ── SF4: date defaults to today ────────────────────────────────────────────

  test("SF4 — Date Offered defaults to today", async ({ page }) => {
    await openFirstBuyerOffersTab(page)
    await page.getByTestId("offers-tab-toggle-btn").click()

    await expect(page.getByTestId("offers-tab-date-btn")).toContainText(todayFormatted())
  })

  // ── SF5: successful submit adds row to table ───────────────────────────────

  test("SF5 — submitting the form adds a new offer row (not accepted)", async ({ page }) => {
    const { entityId } = await openFirstBuyerOffersTab(page)

    // Pre-cleanup so the table is predictable
    if (!isNaN(entityId)) await deletePandaBuyerOffersForEntityId(entityId)

    // Reload to reflect cleared state
    await page.reload()
    await reopenBuyerOffersAfterReload(page, entityId)

    // Open form and submit
    await page.getByTestId("offers-tab-toggle-btn").click()
    await page.getByTestId("offers-tab-amount-input").fill("620000")
    await page.getByTestId("offers-tab-submit-btn").click()

    // Form should collapse
    await expect(page.getByTestId("offers-tab-form")).not.toBeVisible({ timeout: 8_000 })

    // Table appears with the new row
    await expect(page.getByTestId("offers-tab-table")).toBeVisible({ timeout: 8_000 })
    await expect(page.getByTestId("offers-tab-table")).toContainText("620,000")

    // Cleanup
    if (!isNaN(entityId)) await deletePandaBuyerOffersForEntityId(entityId)
  })

  // ── SF6: accepted offer shows Accepted badge ───────────────────────────────

  test("SF6 — submitting with Accepted checked shows Accepted badge on new row", async ({
    page,
  }) => {
    const { entityId } = await openFirstBuyerOffersTab(page)
    if (!isNaN(entityId)) await deletePandaBuyerOffersForEntityId(entityId)

    await page.reload()
    await reopenBuyerOffersAfterReload(page, entityId)

    await page.getByTestId("offers-tab-toggle-btn").click()
    await page.getByTestId("offers-tab-amount-input").fill("750000")
    await page.getByTestId("offers-tab-accepted-checkbox").click()
    await page.getByTestId("offers-tab-submit-btn").click()

    await expect(page.getByTestId("offers-tab-table")).toBeVisible({ timeout: 8_000 })
    await expect(page.getByTestId("offers-tab-table")).toContainText("Accepted")

    if (!isNaN(entityId)) await deletePandaBuyerOffersForEntityId(entityId)
  })

  // ── SF7: Cancel hides form ─────────────────────────────────────────────────

  test("SF7 — clicking Cancel hides the form without submitting", async ({ page }) => {
    await openFirstBuyerOffersTab(page)

    await page.getByTestId("offers-tab-toggle-btn").click()
    await expect(page.getByTestId("offers-tab-form")).toBeVisible()

    await page.getByTestId("offers-tab-amount-input").fill("999000")

    // Toggle closes the form
    await page.getByTestId("offers-tab-toggle-btn").click()
    await expect(page.getByTestId("offers-tab-form")).not.toBeVisible()

    // Button label returns to "New Offer"
    await expect(page.getByTestId("offers-tab-toggle-btn")).toContainText("New Offer")
  })

  // ── SF8: form resets after submit ─────────────────────────────────────────

  test("SF8 — form resets to empty state after a successful submit", async ({ page }) => {
    const { entityId } = await openFirstBuyerOffersTab(page)
    if (!isNaN(entityId)) await deletePandaBuyerOffersForEntityId(entityId)

    await page.reload()
    await reopenBuyerOffersAfterReload(page, entityId)

    // Submit first offer
    await page.getByTestId("offers-tab-toggle-btn").click()
    await page.getByTestId("offers-tab-amount-input").fill("400000")
    await page.getByTestId("offers-tab-accepted-checkbox").click()
    await page.getByTestId("offers-tab-submit-btn").click()
    await expect(page.getByTestId("offers-tab-form")).not.toBeVisible({ timeout: 8_000 })

    // Re-open form — it should be reset
    await page.getByTestId("offers-tab-toggle-btn").click()
    await expect(page.getByTestId("offers-tab-amount-input")).toHaveValue("")
    await expect(page.getByTestId("offers-tab-date-btn")).toContainText(todayFormatted())
    await expect(page.getByTestId("offers-tab-accepted-checkbox")).not.toBeChecked()

    if (!isNaN(entityId)) await deletePandaBuyerOffersForEntityId(entityId)
  })
})
