/**
 * E2E: Contract date selector in Contract Conditions (property Summary tab)
 *
 * Success factors:
 * 1. Contract Conditions exposes a contract date button (`offer-conditions-contract-date-btn`).
 * 2. Choosing a calendar day and clicking "Save conditions" persists the date (same server
 *    round-trip as other condition fields).
 * 3. The Summary tab "Contract date" row reflects the saved value (`panda-property-summary-row--contract-date`).
 * 4. Clear + Save removes the contract date from the DB and the Summary row hides (no value).
 *
 * Requires: E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD + DATABASE_URL.
 * Playwright globalSetup runs the sellers pipeline seed when DATABASE_URL is set.
 */

import { expect, test } from "@playwright/test"

import { signInAsAdmin } from "./helpers/admin-auth"
import {
  goToPropertySummaryTab as goToSummaryTab,
  gotoSellersPipeline,
  openPropertyPanel,
  PANDA_PIPELINE_SEED_CARD_ADDRESS_SNIPPET,
  sellersCardByAddressSnippet,
} from "./helpers/panda-pipeline-panels"
import { requirePandaLiveE2eEnv } from "./helpers/require-panda-live-e2e-env"

test.describe("Offer conditions — contract date (Summary tab)", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaLiveE2eEnv()
    await signInAsAdmin(page)
    await gotoSellersPipeline(page)
  })

  test("selecting a contract date and saving updates the Summary Contract date row", async ({
    page,
  }) => {
    const targetCard = sellersCardByAddressSnippet(page, PANDA_PIPELINE_SEED_CARD_ADDRESS_SNIPPET).first()
    await expect(targetCard).toBeVisible({ timeout: 20_000 })

    const panel = await openPropertyPanel(page, targetCard)
    await goToSummaryTab(panel)

    const conditionsRoot = panel.locator('[data-testid^="offer-conditions-panel--"]')
    await expect(conditionsRoot).toBeVisible({ timeout: 12_000 })

    const offerId = (await conditionsRoot.getAttribute("data-testid"))!.replace(
      "offer-conditions-panel--",
      "",
    )

    await panel.locator(`[data-testid="offer-conditions-contract-date-btn--${offerId}"]`).click()

    const cal = page.locator('[data-slot="calendar"]')
    await expect(cal).toBeVisible({ timeout: 8_000 })

    // react-day-picker v9 renders day cells as buttons (not gridcell roles)
    const day15 = cal.locator("tbody button").filter({ hasText: /^15$/ }).first()
    await expect(day15).toBeVisible({ timeout: 8_000 })
    await day15.click()

    await panel.getByRole("button", { name: /^save conditions$/i }).click()

    const contractRow = panel.locator('[data-testid="panda-property-summary-row--contract-date"]')
    await expect(contractRow).toBeVisible({ timeout: 15_000 })
    const dd = contractRow.locator("dd")
    await expect(dd).not.toHaveText("")
    await expect(dd).toContainText(/\d{4}/)
  })

  test("Clear + Save removes Contract date from Summary when property had a contract date", async ({
    page,
  }) => {
    const targetCard = sellersCardByAddressSnippet(page, PANDA_PIPELINE_SEED_CARD_ADDRESS_SNIPPET).first()
    await expect(targetCard).toBeVisible({ timeout: 20_000 })

    const panel = await openPropertyPanel(page, targetCard)
    await goToSummaryTab(panel)

    const contractRow = panel.locator('[data-testid="panda-property-summary-row--contract-date"]')
    await expect(contractRow).toBeVisible({ timeout: 12_000 })

    const conditionsRoot = panel.locator('[data-testid^="offer-conditions-panel--"]')
    await expect(conditionsRoot).toBeVisible({ timeout: 12_000 })
    const offerId = (await conditionsRoot.getAttribute("data-testid"))!.replace(
      "offer-conditions-panel--",
      "",
    )

    await panel.locator(`[data-testid="offer-conditions-contract-date-clear--${offerId}"]`).click()
    await panel.getByRole("button", { name: /^save conditions$/i }).click()

    await expect(
      panel.locator('[data-testid="panda-property-summary-row--contract-date"]'),
    ).toHaveCount(0, { timeout: 15_000 })

    // Restore `contract_date` on the shared seed row so other specs in the same run keep a stable fixture.
    await panel.locator(`[data-testid="offer-conditions-contract-date-btn--${offerId}"]`).click()
    const calRestore = page.locator('[data-slot="calendar"]')
    await expect(calRestore).toBeVisible({ timeout: 8_000 })
    await calRestore.locator("button[data-day]:enabled").first().click()
    await panel.getByRole("button", { name: /^save conditions$/i }).click()
    await expect(panel.locator('[data-testid="panda-property-summary-row--contract-date"]')).toBeVisible({
      timeout: 15_000,
    })
  })
})
