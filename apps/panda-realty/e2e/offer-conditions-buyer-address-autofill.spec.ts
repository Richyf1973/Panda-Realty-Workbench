import { expect, test } from "@playwright/test"

import { requirePandaLiveE2eEnv } from "./helpers/require-panda-live-e2e-env"
import { signInAsAdmin } from "./helpers/admin-auth"
import {
  PANDA_PIPELINE_SEED_CARD_ADDRESS_SNIPPET,
  goToPropertySummaryTab,
  gotoSellersPipeline,
  openPropertyPanel,
  sellersCardByAddressSnippet,
} from "./helpers/panda-pipeline-panels"

/** E2E seed buyer representative member's property_to_sell_address. */
const SEED_REP_ADDRESS = "55 E2E Rep Street, Brisbane QLD 4000"

test.describe("Offer conditions — Buyer address auto-fill", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaLiveE2eEnv()
    await signInAsAdmin(page)
    await gotoSellersPipeline(page)
  })

  test("pre-fills address input with buyer rep propertyToSellAddress on first enable (pipeline board)", async ({ page }) => {
    const seedCard = sellersCardByAddressSnippet(page, PANDA_PIPELINE_SEED_CARD_ADDRESS_SNIPPET)
    await expect(seedCard.first(), "Seed card not found — run: npm run e2e:seed:sellers-accepted -w panda-realty").toBeVisible({ timeout: 15_000 })

    const panel = await openPropertyPanel(page, seedCard.first())
    await goToPropertySummaryTab(panel)

    const subjectToSaleCheckbox = panel.getByTestId(/offer-conditions-subject-to-sale-checkbox--/)
    const addressInput = panel.getByTestId(/offer-conditions-subject-to-sale-address--/)

    // Ensure clean state: clear any stored address
    if (await subjectToSaleCheckbox.isChecked()) {
      await subjectToSaleCheckbox.uncheck()
      await panel.getByRole("button", { name: /save conditions/i }).click()
      await expect(panel.getByRole("button", { name: /save conditions/i })).toBeEnabled({ timeout: 20_000 })
    }

    await expect(subjectToSaleCheckbox).not.toBeChecked()
    await expect(addressInput).not.toBeVisible()

    await subjectToSaleCheckbox.check()

    await expect(panel.getByTestId(/offer-conditions-subject-to-sale-stage--/)).toBeVisible()
    await expect(addressInput).toBeVisible()
    await expect(addressInput).toHaveValue(SEED_REP_ADDRESS)

    // Restore
    await subjectToSaleCheckbox.uncheck()
    await panel.getByRole("button", { name: /save conditions/i }).click()
    await expect(panel.getByRole("button", { name: /save conditions/i })).toBeEnabled({ timeout: 20_000 })
  })

  test("stored address takes precedence over pre-fill on reload", async ({ page }) => {
    const seedCard = sellersCardByAddressSnippet(page, PANDA_PIPELINE_SEED_CARD_ADDRESS_SNIPPET)
    await expect(seedCard.first()).toBeVisible({ timeout: 15_000 })
    const panel = await openPropertyPanel(page, seedCard.first())
    await goToPropertySummaryTab(panel)

    const subjectToSaleCheckbox = panel.getByTestId(/offer-conditions-subject-to-sale-checkbox--/)
    await subjectToSaleCheckbox.check()

    const addressInput = panel.getByTestId(/offer-conditions-subject-to-sale-address--/)
    const preFillValue = await addressInput.inputValue()
    expect(preFillValue).toBe(SEED_REP_ADDRESS)

    const customAddress = "999 Custom Street, Brisbane QLD 4000"
    await addressInput.clear()
    await addressInput.fill(customAddress)

    await panel.getByRole("button", { name: /save conditions/i }).click()
    await expect(panel.getByRole("button", { name: /save conditions/i })).toBeEnabled({ timeout: 20_000 })

    await page.keyboard.press("Escape")
    await page.waitForTimeout(300)

    const reopenedPanel = await openPropertyPanel(page, seedCard.first())
    await goToPropertySummaryTab(reopenedPanel)

    const addressValueAfterReopen = await reopenedPanel
      .getByTestId(/offer-conditions-subject-to-sale-address--/)
      .inputValue()
    expect(addressValueAfterReopen).toBe(customAddress)
    expect(addressValueAfterReopen).not.toBe(SEED_REP_ADDRESS)

    // Restore
    await reopenedPanel.getByTestId(/offer-conditions-subject-to-sale-checkbox--/).uncheck()
    await reopenedPanel.getByRole("button", { name: /save conditions/i }).click()
    await expect(reopenedPanel.getByRole("button", { name: /save conditions/i })).toBeEnabled({ timeout: 20_000 })
  })

  test("unchecking clears the address and re-enabling pre-fills again", async ({ page }) => {
    const seedCard = sellersCardByAddressSnippet(page, PANDA_PIPELINE_SEED_CARD_ADDRESS_SNIPPET)
    await expect(seedCard.first()).toBeVisible({ timeout: 15_000 })
    const panel = await openPropertyPanel(page, seedCard.first())
    await goToPropertySummaryTab(panel)

    const subjectToSaleCheckbox = panel.getByTestId(/offer-conditions-subject-to-sale-checkbox--/)

    // Ensure clean state
    if (await subjectToSaleCheckbox.isChecked()) {
      await subjectToSaleCheckbox.uncheck()
      await panel.getByRole("button", { name: /save conditions/i }).click()
      await expect(panel.getByRole("button", { name: /save conditions/i })).toBeEnabled({ timeout: 20_000 })
    }

    await subjectToSaleCheckbox.check()
    const addressInput = panel.getByTestId(/offer-conditions-subject-to-sale-address--/)
    await expect(addressInput).toHaveValue(SEED_REP_ADDRESS)

    await subjectToSaleCheckbox.uncheck()
    await expect(addressInput).not.toBeVisible()

    await panel.getByRole("button", { name: /save conditions/i }).click()
    await page.keyboard.press("Escape")
    await page.waitForTimeout(300)

    const reopenedPanel = await openPropertyPanel(page, seedCard.first())
    await goToPropertySummaryTab(reopenedPanel)

    const reopenedCheckbox = reopenedPanel.getByTestId(/offer-conditions-subject-to-sale-checkbox--/)
    await expect(reopenedCheckbox).not.toBeChecked()
    await expect(reopenedPanel.getByTestId(/offer-conditions-subject-to-sale-address--/)).not.toBeVisible()

    await reopenedCheckbox.check()

    const reopenedAddressInput = reopenedPanel.getByTestId(/offer-conditions-subject-to-sale-address--/)
    await expect(reopenedAddressInput).toBeVisible()
    await expect(reopenedAddressInput).toHaveValue(SEED_REP_ADDRESS)

    // Restore
    await reopenedCheckbox.uncheck()
    await reopenedPanel.getByRole("button", { name: /save conditions/i }).click()
    await expect(reopenedPanel.getByRole("button", { name: /save conditions/i })).toBeEnabled({ timeout: 20_000 })
  })

  test("address persists after full page reload", async ({ page }) => {
    test.setTimeout(180_000)

    const seedCard = sellersCardByAddressSnippet(page, PANDA_PIPELINE_SEED_CARD_ADDRESS_SNIPPET)
    await expect(seedCard.first()).toBeVisible({ timeout: 15_000 })
    let panel = await openPropertyPanel(page, seedCard.first())
    await goToPropertySummaryTab(panel)

    const subjectToSaleCheckbox = panel.getByTestId(/offer-conditions-subject-to-sale-checkbox--/)
    await subjectToSaleCheckbox.check()

    const addressInput = panel.getByTestId(/offer-conditions-subject-to-sale-address--/)
    const customAddress = "42 Persist Street, Sydney NSW 2000"
    await addressInput.clear()
    await addressInput.fill(customAddress)

    await panel.getByRole("button", { name: /save conditions/i }).click()
    await expect(panel.getByRole("button", { name: /save conditions/i })).toBeEnabled({ timeout: 60_000 })

    await page.reload()
    await page.waitForLoadState("networkidle")

    await gotoSellersPipeline(page)
    const reopenedCard = sellersCardByAddressSnippet(page, PANDA_PIPELINE_SEED_CARD_ADDRESS_SNIPPET)
    panel = await openPropertyPanel(page, reopenedCard.first())
    await goToPropertySummaryTab(panel)

    const persistedAddress = await panel
      .getByTestId(/offer-conditions-subject-to-sale-address--/)
      .inputValue()
    expect(persistedAddress).toBe(customAddress)

    // Restore
    await panel.getByTestId(/offer-conditions-subject-to-sale-checkbox--/).uncheck()
    await panel.getByRole("button", { name: /save conditions/i }).click()
    await expect(panel.getByRole("button", { name: /save conditions/i })).toBeEnabled({ timeout: 60_000 })
  })
})
