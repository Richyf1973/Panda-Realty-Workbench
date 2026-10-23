/**
 * E2E: Accepting an existing (already-saved) buyer offer
 *
 * Covers the Manual Verification checklist from:
 *   specs/panda-realty-accept-existing-offer.md
 *
 * Flow:
 *   1. Pipeline → Buyers tab → click buyer card → detail panel → Offers tab
 *   2. Seed at least one non-accepted offer
 *   3. Assert "Accept" ghost button appears on non-accepted rows only
 *   4. Click Accept → green "Accepted" badge replaces button; no error
 *   5. Reload → badge persists (DB write confirmed)
 *   6. Second Accept on a different row → blocked with inline per-row error
 *
 * Requires: E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD, DATABASE_URL
 * Run: npx playwright test apps/panda-realty/e2e/accept-existing-offer.spec.ts --config=apps/panda-realty/playwright.config.ts --workers=2
 */

import { expect, test, type Page } from "@playwright/test"

import {
  e2eAdminCredentials,
  e2ePandaAdminListApiConfigured,
  signInAsAdmin,
} from "./helpers/admin-auth"
import { deletePandaBuyerOffersForEntityId } from "./helpers/delete-panda-buyer-offers-for-entity"

// ── Helpers ───────────────────────────────────────────────────────────────────

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
  await page.getByTestId("offers-tab-toggle-btn").waitFor({ timeout: 15_000 })
}

/** Seed one non-accepted offer via the new-offer form. Returns the row testid prefix. */
async function seedNonAcceptedOffer(page: Page, amount: string) {
  await page.getByTestId("offers-tab-toggle-btn").click()
  await expect(page.getByTestId("offers-tab-form")).toBeVisible()
  await page.getByTestId("offers-tab-amount-input").fill(amount)
  // Do NOT tick Accepted
  await page.getByTestId("offers-tab-submit-btn").click()
  await expect(page.getByTestId("offers-tab-form")).not.toBeVisible({ timeout: 8_000 })
  await expect(page.getByTestId("offers-tab-table")).toBeVisible({ timeout: 8_000 })
}

/** Seed one accepted offer via the new-offer form. */
async function seedAcceptedOffer(page: Page, amount: string) {
  await page.getByTestId("offers-tab-toggle-btn").click()
  await expect(page.getByTestId("offers-tab-form")).toBeVisible()
  await page.getByTestId("offers-tab-amount-input").fill(amount)
  await page.getByTestId("offers-tab-accepted-checkbox").click()
  await page.getByTestId("offers-tab-submit-btn").click()
  await expect(page.getByTestId("offers-tab-form")).not.toBeVisible({ timeout: 8_000 })
  await expect(page.getByTestId("offers-tab-table")).toBeVisible({ timeout: 10_000 })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe.configure({ mode: "serial" })

test.describe("Accepting an existing buyer offer", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")
    test.skip(!e2ePandaAdminListApiConfigured, "DATABASE_URL not set — live DB required")
    await signInAsAdmin(page)
  })

  // ── Happy path: Accept button appears and works ───────────────────────────

  test("Accept button appears on a non-accepted offer row", async ({ page }) => {
    const { entityId } = await openFirstBuyerOffersTab(page)
    if (!isNaN(entityId)) await deletePandaBuyerOffersForEntityId(entityId)
    await page.reload()
    await reopenOffersTabAfterReload(page, entityId)

    await seedNonAcceptedOffer(page, "750000")

    const table = page.getByTestId("offers-tab-table")
    await expect(table).toContainText("750,000")

    // Accept button must be visible on the non-accepted row
    const acceptBtn = table.getByTestId(/^offers-row-accept-btn--/).first()
    await expect(acceptBtn).toBeVisible()
    await expect(acceptBtn).toContainText("Accept")

    if (!isNaN(entityId)) await deletePandaBuyerOffersForEntityId(entityId)
  })

  test("clicking Accept marks the offer accepted and shows green badge", async ({ page }) => {
    const { entityId } = await openFirstBuyerOffersTab(page)
    if (!isNaN(entityId)) await deletePandaBuyerOffersForEntityId(entityId)
    await page.reload()
    await reopenOffersTabAfterReload(page, entityId)

    await seedNonAcceptedOffer(page, "650000")

    const table = page.getByTestId("offers-tab-table")
    const acceptBtn = table.getByTestId(/^offers-row-accept-btn--/).first()
    await expect(acceptBtn).toBeVisible()
    await acceptBtn.click()

    // Button gone, green badge appears, no error
    await expect(acceptBtn).not.toBeVisible({ timeout: 8_000 })
    await expect(table).toContainText("Accepted")
    // No inline error
    const anyError = table.getByTestId(/^offers-row-accept-error--/)
    await expect(anyError).not.toBeVisible()

    if (!isNaN(entityId)) await deletePandaBuyerOffersForEntityId(entityId)
  })

  // ── Already-accepted row has no button ───────────────────────────────────

  test("accepted row shows no Accept button", async ({ page }) => {
    const { entityId } = await openFirstBuyerOffersTab(page)
    if (!isNaN(entityId)) await deletePandaBuyerOffersForEntityId(entityId)
    await page.reload()
    await reopenOffersTabAfterReload(page, entityId)

    await seedAcceptedOffer(page, "720000")

    const table = page.getByTestId("offers-tab-table")
    await expect(table).toContainText("Accepted")
    // No Accept button on an already-accepted row
    const acceptBtn = table.getByTestId(/^offers-row-accept-btn--/)
    await expect(acceptBtn).not.toBeVisible()

    if (!isNaN(entityId)) await deletePandaBuyerOffersForEntityId(entityId)
  })

  // ── Persistence check ─────────────────────────────────────────────────────

  test("Accepted badge persists after page reload", async ({ page }) => {
    const { entityId } = await openFirstBuyerOffersTab(page)
    if (!isNaN(entityId)) await deletePandaBuyerOffersForEntityId(entityId)
    await page.reload()
    await reopenOffersTabAfterReload(page, entityId)

    await seedNonAcceptedOffer(page, "680000")

    const table = page.getByTestId("offers-tab-table")
    const acceptBtn = table.getByTestId(/^offers-row-accept-btn--/).first()
    await acceptBtn.click()
    await expect(acceptBtn).not.toBeVisible({ timeout: 8_000 })
    await expect(table).toContainText("Accepted")

    // Reload and verify badge survives
    await page.goto("/admin/pipeline?pipeline=buyers")
    await reopenOffersTabAfterReload(page, entityId)
    const reloadedTable = page.getByTestId("offers-tab-table")
    await expect(reloadedTable).toBeVisible({ timeout: 20_000 })
    await expect(reloadedTable).toContainText("Accepted")
    // Still no Accept button on the accepted row
    await expect(reloadedTable.getByTestId(/^offers-row-accept-btn--/)).not.toBeVisible()

    if (!isNaN(entityId)) await deletePandaBuyerOffersForEntityId(entityId)
  })

  // ── Block: another offer already accepted ─────────────────────────────────

  test("Accept is blocked with inline error when another offer is already accepted", async ({
    page,
  }) => {
    const { entityId } = await openFirstBuyerOffersTab(page)
    if (!isNaN(entityId)) await deletePandaBuyerOffersForEntityId(entityId)
    await page.reload()
    await reopenOffersTabAfterReload(page, entityId)

    // Seed one accepted + one non-accepted
    await seedAcceptedOffer(page, "500000")
    await seedNonAcceptedOffer(page, "600000")

    const table = page.getByTestId("offers-tab-table")
    // The non-accepted row should still show an Accept button
    const acceptBtn = table.getByTestId(/^offers-row-accept-btn--/).first()
    await expect(acceptBtn).toBeVisible()
    await acceptBtn.click()

    // Button stays visible (not accepted), inline error appears
    await expect(acceptBtn).toBeVisible({ timeout: 8_000 })
    const inlineError = table.getByTestId(/^offers-row-accept-error--/).first()
    await expect(inlineError).toBeVisible({ timeout: 8_000 })
    await expect(inlineError).toContainText("already accepted")

    // Original accepted offer unchanged
    await expect(table).toContainText("500,000")
    await expect(table).toContainText("Accepted")

    if (!isNaN(entityId)) await deletePandaBuyerOffersForEntityId(entityId)
  })
})
