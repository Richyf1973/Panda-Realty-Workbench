/**
 * E2E: Offer conditions — calendar icon date picker
 *
 * Requires: E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD + DATABASE_URL.
 * Playwright globalSetup runs the sellers pipeline seed when DATABASE_URL is set.
 */

import { expect, test } from "@playwright/test"

import { signInAsAdmin } from "./helpers/admin-auth"
import {
  buyersCardByAddressSnippet,
  goToPropertySummaryTab as goToSummaryTab,
  gotoBuyersPipeline,
  gotoSellersPipeline,
  openBuyerPanel,
  openPropertyPanel,
  PANDA_E2E_BUYERS_SEED_SNIPPET,
  PANDA_E2E_SELLERS_NO_CONTRACT_SNIPPET,
  PANDA_PIPELINE_SEED_CARD_ADDRESS_SNIPPET,
  sellersCardByAddressSnippet,
} from "./helpers/panda-pipeline-panels"
import { requirePandaLiveE2eEnv } from "./helpers/require-panda-live-e2e-env"

const CONDITION_FIELD_IDS = [
  "cooling-off",
  "finance",
  "building-pest",
  "due-diligence",
  "subject-to-sale",
] as const

test.describe("Offer conditions — calendar icon buttons (property Summary tab)", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaLiveE2eEnv()
    await signInAsAdmin(page)
    await gotoSellersPipeline(page)
  })

  test("all 5 calendar buttons appear next to condition day fields for a property with accepted offer", async ({
    page,
  }) => {
    const targetCard = sellersCardByAddressSnippet(page, PANDA_PIPELINE_SEED_CARD_ADDRESS_SNIPPET).first()
    await expect(targetCard).toBeVisible({ timeout: 20_000 })

    const panel = await openPropertyPanel(page, targetCard)
    await goToSummaryTab(panel)

    const firstBtn = panel.locator('[data-testid^="offer-conditions-calendar-btn--cooling-off--"]')
    await expect(firstBtn).toBeVisible({ timeout: 8_000 })

    const offerId = (await firstBtn.getAttribute("data-testid"))!.replace(
      "offer-conditions-calendar-btn--cooling-off--",
      "",
    )

    for (const fieldId of CONDITION_FIELD_IDS) {
      await expect(
        panel.locator(`[data-testid="offer-conditions-calendar-btn--${fieldId}--${offerId}"]`),
      ).toBeVisible()
    }
  })

  test("calendar buttons are disabled when property has no contract date", async ({ page }) => {
    const targetCard = sellersCardByAddressSnippet(page, PANDA_E2E_SELLERS_NO_CONTRACT_SNIPPET).first()
    await expect(targetCard).toBeVisible({ timeout: 20_000 })

    const panel = await openPropertyPanel(page, targetCard)
    await goToSummaryTab(panel)

    const firstBtn = panel.locator('[data-testid^="offer-conditions-calendar-btn--cooling-off--"]')
    await expect(firstBtn).toBeVisible({ timeout: 8_000 })

    const offerId = (await firstBtn.getAttribute("data-testid"))!.replace(
      "offer-conditions-calendar-btn--cooling-off--",
      "",
    )

    for (const fieldId of CONDITION_FIELD_IDS) {
      const btn = panel.locator(
        `[data-testid="offer-conditions-calendar-btn--${fieldId}--${offerId}"]`,
      )
      await expect(btn).toBeDisabled()
    }
  })

  test("calendar buttons are enabled and open a date picker when contract date is set", async ({
    page,
  }) => {
    const targetCard = sellersCardByAddressSnippet(page, PANDA_PIPELINE_SEED_CARD_ADDRESS_SNIPPET).first()
    await expect(targetCard).toBeVisible({ timeout: 20_000 })

    const panel = await openPropertyPanel(page, targetCard)
    await goToSummaryTab(panel)

    const firstBtn = panel.locator('[data-testid^="offer-conditions-calendar-btn--cooling-off--"]')
    await expect(firstBtn).toBeVisible({ timeout: 8_000 })
    await expect(firstBtn).toBeEnabled()

    const foundOfferId = (await firstBtn.getAttribute("data-testid"))!.replace(
      "offer-conditions-calendar-btn--cooling-off--",
      "",
    )

    for (const fieldId of CONDITION_FIELD_IDS) {
      await expect(
        panel.locator(`[data-testid="offer-conditions-calendar-btn--${fieldId}--${foundOfferId}"]`),
      ).toBeEnabled()
    }

    const coolingOffBtn = panel.locator(
      `[data-testid="offer-conditions-calendar-btn--cooling-off--${foundOfferId}"]`,
    )
    await coolingOffBtn.click()

    const calendarPopover = page.locator('[data-slot="calendar"]')
    await expect(calendarPopover).toBeVisible({ timeout: 5_000 })
  })

  test("selecting a date updates the days input to a non-negative integer", async ({ page }) => {
    const targetCard = sellersCardByAddressSnippet(page, PANDA_PIPELINE_SEED_CARD_ADDRESS_SNIPPET).first()
    await expect(targetCard).toBeVisible({ timeout: 20_000 })

    const panel = await openPropertyPanel(page, targetCard)
    await goToSummaryTab(panel)

    const firstBtn = panel.locator('[data-testid^="offer-conditions-calendar-btn--cooling-off--"]')
    await expect(firstBtn).toBeVisible({ timeout: 8_000 })
    await expect(firstBtn).toBeEnabled()

    const foundOfferId = (await firstBtn.getAttribute("data-testid"))!.replace(
      "offer-conditions-calendar-btn--cooling-off--",
      "",
    )

    const financeBtn = panel.locator(
      `[data-testid="offer-conditions-calendar-btn--finance--${foundOfferId}"]`,
    )
    await financeBtn.click()

    const calendar = page.locator('[data-slot="calendar"]')
    await expect(calendar).toBeVisible({ timeout: 5_000 })

    const pickableDay = calendar.locator("button[data-day]:enabled").first()
    await expect(pickableDay).toBeVisible({ timeout: 5_000 })
    await pickableDay.click()

    await expect(calendar).not.toBeVisible({ timeout: 3_000 })

    const financeInput = panel.locator(
      `[data-testid="offer-conditions-days-input--finance--${foundOfferId}"]`,
    )
    const inputValue = await financeInput.inputValue()
    expect(inputValue).not.toBe("")
    const parsed = parseInt(inputValue, 10)
    expect(Number.isInteger(parsed)).toBe(true)
    expect(parsed).toBeGreaterThanOrEqual(0)
  })
})

test.describe("Offer conditions — calendar icon buttons (buyer Offers tab)", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaLiveE2eEnv()
    await signInAsAdmin(page)
    await gotoBuyersPipeline(page)
  })

  test("calendar buttons appear in buyer Offers tab expanded conditions row", async ({ page }) => {
    const card = buyersCardByAddressSnippet(page, PANDA_E2E_BUYERS_SEED_SNIPPET).first()
    await expect(card).toBeVisible({ timeout: 20_000 })

    const targetPanel = await openBuyerPanel(page, card)

    await targetPanel.getByTestId("buyer-panel-tab--offers").click()

    const toggles = targetPanel.locator('[data-testid^="buyer-offer-conditions-toggle--"]')
    await expect(toggles.first()).toBeVisible({ timeout: 10_000 })
    await toggles.first().click()

    const toggleTestId = await toggles.first().getAttribute("data-testid")
    const offerId = toggleTestId!.replace("buyer-offer-conditions-toggle--", "")

    const firstCalendarBtn = targetPanel.locator(
      `[data-testid="offer-conditions-calendar-btn--cooling-off--${offerId}"]`,
    )
    await expect(firstCalendarBtn).toBeVisible({ timeout: 5_000 })

    for (const fieldId of CONDITION_FIELD_IDS) {
      await expect(
        targetPanel.locator(`[data-testid="offer-conditions-calendar-btn--${fieldId}--${offerId}"]`),
      ).toBeVisible()
    }
  })
})
