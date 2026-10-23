/**
 * E2E: Accepting a buyer offer
 *
 * Demonstrates the two ways an offer can be accepted:
 *   Path A — tick "Accepted" while creating a new offer
 *   Path B — verify the green "Accepted" badge appears on an already-accepted offer
 *
 * Flow (both paths):
 *   1. Pipeline → Buyers tab
 *   2. Click a buyer card → detail panel opens
 *   3. Click "Offers" tab
 *   4. Click "+ New Offer"
 *   5. Fill in the amount, tick "Accepted", click "Add Offer"
 *   6. The new row shows a green "Accepted" badge
 *
 * Requires: E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD, DATABASE_URL
 * Run: PLAYWRIGHT_HEADED=1 npx playwright test e2e/accept-buyer-offer.spec.ts
 */

import { expect, test, type Page } from "@playwright/test"

import {
  e2eAdminCredentials,
  e2ePandaAdminListApiConfigured,
  signInAsAdmin,
} from "./helpers/admin-auth"
import { deletePandaBuyerOffersForEntityId } from "./helpers/delete-panda-buyer-offers-for-entity"

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Open the buyers pipeline, click the first card, go to the Offers tab. */
async function openFirstBuyerOffersTab(page: Page): Promise<{ entityId: number }> {
  await page.goto("/admin/pipeline?pipeline=buyers")

  const firstCard = page.getByTestId(/^kanban-buyer-card--/).first()
  await firstCard.waitFor({ timeout: 20_000 })

  const testId = (await firstCard.getAttribute("data-testid")) ?? ""
  const entityId = parseInt(testId.replace(/^kanban-buyer-card--(\d+).*$/, "$1"), 10)

  await firstCard.click()
  await page.getByTestId("panel-content-ready").waitFor({ timeout: 15_000 })
  await page.getByTestId("buyer-panel-tab--offers").click()

  return { entityId }
}

/** Re-open the same buyer's Offers tab after a page reload. */
async function reopenOffersTabAfterReload(page: Page, entityId: number) {
  await page.waitForLoadState("networkidle")
  const card =
    Number.isFinite(entityId) && entityId > 0
      ? page.getByTestId(new RegExp(`^kanban-buyer-card--${entityId}`))
      : page.getByTestId(/^kanban-buyer-card--/).first()
  await card.waitFor({ state: "visible", timeout: 20_000 })
  await card.click()
  await page.getByTestId("panel-content-ready").waitFor({ timeout: 20_000 })
  await page.getByTestId("buyer-panel-tab--offers").click()
  // Wait for the Offers tab shell to be ready before callers assert on tab content
  await page.getByTestId("offers-tab-toggle-btn").waitFor({ timeout: 15_000 })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe.configure({ mode: "serial" })

test.describe("Accepting a buyer offer", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")
    test.skip(!e2ePandaAdminListApiConfigured, "DATABASE_URL not set — live DB required")
    await signInAsAdmin(page)
  })

  // ── Path A: tick Accepted while creating ──────────────────────────────────

  test("Path A — new offer created with Accepted ticked shows green Accepted badge", async ({
    page,
  }) => {
    const { entityId } = await openFirstBuyerOffersTab(page)

    // Start clean so the DB uniqueness constraint won't fire
    if (!isNaN(entityId)) await deletePandaBuyerOffersForEntityId(entityId)

    await page.reload()
    await reopenOffersTabAfterReload(page, entityId)

    // Step 1 — open the new-offer form
    await page.getByTestId("offers-tab-toggle-btn").click()
    await expect(page.getByTestId("offers-tab-form")).toBeVisible()

    // Step 2 — fill in the offer amount
    await page.getByTestId("offers-tab-amount-input").fill("750000")

    // Step 3 — tick the "Accepted" checkbox
    const checkbox = page.getByTestId("offers-tab-accepted-checkbox")
    await expect(checkbox).not.toBeChecked()
    await checkbox.click()
    await expect(checkbox).toBeChecked()

    // Step 4 — submit
    await page.getByTestId("offers-tab-submit-btn").click()

    // Step 5 — form collapses, table shows the new row with "Accepted" badge
    await expect(page.getByTestId("offers-tab-form")).not.toBeVisible({ timeout: 8_000 })
    const table = page.getByTestId("offers-tab-table")
    await expect(table).toBeVisible({ timeout: 8_000 })
    await expect(table).toContainText("750,000")
    await expect(table).toContainText("Accepted")

    // Cleanup
    if (!isNaN(entityId)) await deletePandaBuyerOffersForEntityId(entityId)
  })

  // ── Path B: already-accepted offer displays badge on the Offers tab ───────

  test("Path B — an existing accepted offer shows the Accepted badge on the Offers tab", async ({
    page,
  }) => {
    const { entityId } = await openFirstBuyerOffersTab(page)

    // Seed one accepted offer
    if (!isNaN(entityId)) await deletePandaBuyerOffersForEntityId(entityId)
    await page.reload()
    await reopenOffersTabAfterReload(page, entityId)

    await page.getByTestId("offers-tab-toggle-btn").click()
    await page.getByTestId("offers-tab-amount-input").fill("600000")
    await page.getByTestId("offers-tab-accepted-checkbox").click()
    await page.getByTestId("offers-tab-submit-btn").click()
    await expect(page.getByTestId("offers-tab-form")).not.toBeVisible({ timeout: 8_000 })
    // Wait for the table to appear and settle before reloading (avoids ERR_ABORTED on
    // in-flight calendar-sync requests triggered by the offer creation)
    await expect(page.getByTestId("offers-tab-table")).toBeVisible({ timeout: 10_000 })

    // Reload and navigate back — the badge must persist
    await page.goto("/admin/pipeline?pipeline=buyers")
    await reopenOffersTabAfterReload(page, entityId)

    const table = page.getByTestId("offers-tab-table")
    await expect(table).toBeVisible({ timeout: 20_000 })
    await expect(table).toContainText("Accepted")

    // Cleanup
    if (!isNaN(entityId)) await deletePandaBuyerOffersForEntityId(entityId)
  })

  // ── Offer without Accepted has no badge ───────────────────────────────────

  test("a non-accepted offer does not show the Accepted badge", async ({ page }) => {
    const { entityId } = await openFirstBuyerOffersTab(page)

    if (!isNaN(entityId)) await deletePandaBuyerOffersForEntityId(entityId)
    await page.reload()
    await reopenOffersTabAfterReload(page, entityId)

    await page.getByTestId("offers-tab-toggle-btn").click()
    await page.getByTestId("offers-tab-amount-input").fill("480000")
    // Do NOT tick "Accepted"
    await page.getByTestId("offers-tab-submit-btn").click()

    await expect(page.getByTestId("offers-tab-form")).not.toBeVisible({ timeout: 8_000 })
    const table = page.getByTestId("offers-tab-table")
    await expect(table).toBeVisible({ timeout: 8_000 })
    await expect(table).toContainText("480,000")
    await expect(table).not.toContainText("Accepted")

    if (!isNaN(entityId)) await deletePandaBuyerOffersForEntityId(entityId)
  })

  // ── Duplicate accepted offer is blocked ───────────────────────────────────

  test("trying to accept a second offer when one is already accepted shows an error", async ({
    page,
  }) => {
    const { entityId } = await openFirstBuyerOffersTab(page)

    if (!isNaN(entityId)) await deletePandaBuyerOffersForEntityId(entityId)
    await page.reload()
    await reopenOffersTabAfterReload(page, entityId)

    // Seed the first accepted offer
    await page.getByTestId("offers-tab-toggle-btn").click()
    await page.getByTestId("offers-tab-amount-input").fill("500000")
    await page.getByTestId("offers-tab-accepted-checkbox").click()
    await page.getByTestId("offers-tab-submit-btn").click()
    await expect(page.getByTestId("offers-tab-table")).toBeVisible({ timeout: 10_000 })
    await expect(page.getByTestId("offers-tab-table")).toContainText("Accepted")

    // Try to accept a second offer on the same property
    await page.getByTestId("offers-tab-toggle-btn").click()
    await page.getByTestId("offers-tab-amount-input").fill("600000")
    await page.getByTestId("offers-tab-accepted-checkbox").click()
    await page.getByTestId("offers-tab-submit-btn").click()

    // Form stays open with an error — the original accepted offer is unchanged
    await expect(page.getByTestId("offers-tab-form")).toBeVisible({ timeout: 8_000 })
    await expect(page.getByTestId("offers-tab-form")).toContainText("Failed to create offer")
    await expect(page.getByTestId("offers-tab-table")).toContainText("500,000")
    await expect(page.getByTestId("offers-tab-table")).not.toContainText("600,000")

    if (!isNaN(entityId)) await deletePandaBuyerOffersForEntityId(entityId)
  })
})
