/**
 * Regression: contract condition fields (Cooling Off, Finance, Building & Pest, Settlement)
 * must persist after save + close/reopen. Covers the case where entering "0" into a numeric
 * field was treated as falsy and silently reverted to null/default on save.
 *
 * Requires: E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD, DATABASE_URL.
 * Seed: "99 E2E Seed Street" must have an accepted buyer offer.
 * No stubs — hits the live database.
 */

import { expect, test, type Locator, type Page } from "@playwright/test"

import { requirePandaE2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import {
  gotoSellersPipeline,
  openPropertyPanel,
  PANDA_PIPELINE_SEED_CARD_ADDRESS_SNIPPET,
  sellersCardByAddressSnippet,
} from "./helpers/panda-pipeline-panels"
import { requirePandaLiveE2eEnv } from "./helpers/require-panda-live-e2e-env"

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function openPropertiesPopup(page: Page): Promise<{ propertiesPage: Page; dialog: Locator }> {
  const card = sellersCardByAddressSnippet(page, PANDA_PIPELINE_SEED_CARD_ADDRESS_SNIPPET).first()
  await expect(card).toBeVisible({ timeout: 20_000 })

  const sidePanel = await openPropertyPanel(page, card)
  const addressLink = sidePanel.getByTestId("property-detail-panel-address-open-edit")
  await expect(addressLink).toBeVisible()

  const popupPromise = page.waitForEvent("popup")
  await addressLink.click()
  const propertiesPage = await popupPromise
  await propertiesPage.waitForURL((u) => u.pathname === "/admin/properties", { timeout: 20_000 })

  const dialog = propertiesPage.getByTestId("admin-entity-crud-dialog--properties")
  await expect(dialog).toBeVisible({ timeout: 30_000 })
  return { propertiesPage, dialog }
}

async function openSalesTabPanel(
  propertiesPage: Page,
  dialog: Locator,
): Promise<{ offerId: string; panel: Locator }> {
  await propertiesPage.getByTestId("panda-properties-form-tab-trigger--sales").click()
  const panel = dialog.locator('[data-testid^="offer-conditions-panel--"]')
  await expect(panel).toBeVisible({ timeout: 15_000 })
  const offerId = (await panel.getAttribute("data-testid"))!.replace("offer-conditions-panel--", "")
  return { offerId, panel }
}

async function saveAndWaitForConfirm(dialog: Locator, offerId: string): Promise<void> {
  const saveBtn = dialog.getByRole("button", { name: /^save conditions$/i })
  await saveBtn.click()
  await expect(saveBtn).toBeEnabled({ timeout: 20_000 })
  await expect(dialog.locator("text=Failed to save")).toHaveCount(0)
  await expect(dialog.getByTestId(`offer-conditions-saved-ok--${offerId}`)).toBeVisible({
    timeout: 10_000,
  })
}

async function reopenFirstRow(propertiesPage: Page): Promise<Locator> {
  const tableBody = propertiesPage.getByTestId("admin-entity-table-body--properties")
  await expect(tableBody).toBeVisible({ timeout: 15_000 })
  await propertiesPage.locator('[data-testid^="admin-entity-row--properties--"]').first().click()
  const dialog2 = propertiesPage.getByTestId("admin-entity-crud-dialog--properties")
  await expect(dialog2).toBeVisible({ timeout: 20_000 })
  return dialog2
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe("Offer conditions save regression", () => {
  test.describe.configure({ timeout: 240_000 })

  test.beforeEach(async ({ page }) => {
    requirePandaLiveE2eEnv()
    requirePandaE2eAdminCredentials()
    await signInAsAdmin(page)
    await gotoSellersPipeline(page)
  })

  test("all four day-count fields persist after close/reopen", async ({ page }) => {
    const { propertiesPage, dialog } = await openPropertiesPopup(page)
    const { offerId } = await openSalesTabPanel(propertiesPage, dialog)

    const coolingOffInput = dialog.getByTestId(`offer-conditions-days-input--cooling-off--${offerId}`)
    const financeInput = dialog.getByTestId(`offer-conditions-days-input--finance--${offerId}`)
    const buildingPestInput = dialog.getByTestId(`offer-conditions-days-input--building-pest--${offerId}`)
    const settlementInput = dialog.getByTestId(`offer-conditions-days-input--subject-to-sale--${offerId}`)

    await expect(coolingOffInput).toBeVisible({ timeout: 10_000 })
    await expect(financeInput).toBeVisible()
    await expect(buildingPestInput).toBeVisible()
    await expect(settlementInput).toBeVisible()

    const origCooling = await coolingOffInput.inputValue()
    const origFinance = await financeInput.inputValue()
    const origBuilding = await buildingPestInput.inputValue()
    const origSettlement = await settlementInput.inputValue()

    const newCooling = origCooling === "21" ? "22" : "21"
    const newFinance = origFinance === "0" ? "1" : "0"
    const newBuilding = origBuilding === "7" ? "8" : "7"
    const newSettlement = origSettlement === "30" ? "31" : "30"

    await coolingOffInput.fill(newCooling)
    await financeInput.fill(newFinance)
    await buildingPestInput.fill(newBuilding)
    await settlementInput.fill(newSettlement)

    await saveAndWaitForConfirm(dialog, offerId)

    // Close dialog
    const closeBtn = dialog.getByRole("button", { name: /close/i }).first()
    await closeBtn.click().catch(() => propertiesPage.keyboard.press("Escape"))
    await expect(dialog).not.toBeVisible({ timeout: 10_000 })

    // Reopen same property row
    const dialog2 = await reopenFirstRow(propertiesPage)
    const { offerId: offerId2 } = await openSalesTabPanel(propertiesPage, dialog2)

    await expect(dialog2.getByTestId(`offer-conditions-days-input--cooling-off--${offerId2}`)).toHaveValue(
      newCooling,
      { timeout: 10_000 },
    )
    await expect(dialog2.getByTestId(`offer-conditions-days-input--finance--${offerId2}`)).toHaveValue(
      newFinance,
      { timeout: 10_000 },
    )
    await expect(dialog2.getByTestId(`offer-conditions-days-input--building-pest--${offerId2}`)).toHaveValue(
      newBuilding,
      { timeout: 10_000 },
    )
    await expect(dialog2.getByTestId(`offer-conditions-days-input--subject-to-sale--${offerId2}`)).toHaveValue(
      newSettlement,
      { timeout: 10_000 },
    )

    // Restore
    await dialog2.getByTestId(`offer-conditions-days-input--cooling-off--${offerId2}`).fill(origCooling)
    await dialog2.getByTestId(`offer-conditions-days-input--finance--${offerId2}`).fill(origFinance)
    await dialog2.getByTestId(`offer-conditions-days-input--building-pest--${offerId2}`).fill(origBuilding)
    await dialog2.getByTestId(`offer-conditions-days-input--subject-to-sale--${offerId2}`).fill(origSettlement)
    await saveAndWaitForConfirm(dialog2, offerId2)
  })

  test("finance days value of 0 persists (falsy-zero regression)", async ({ page }) => {
    const { propertiesPage, dialog } = await openPropertiesPopup(page)
    const { offerId } = await openSalesTabPanel(propertiesPage, dialog)

    const financeInput = dialog.getByTestId(`offer-conditions-days-input--finance--${offerId}`)
    await expect(financeInput).toBeVisible({ timeout: 10_000 })

    const origFinance = await financeInput.inputValue()

    // Set to 0 — this is the regression case: "0" is falsy so naïve truthiness
    // checks in the save handler would silently drop it to null.
    await financeInput.fill("0")
    await saveAndWaitForConfirm(dialog, offerId)

    const closeBtn = dialog.getByRole("button", { name: /close/i }).first()
    await closeBtn.click().catch(() => propertiesPage.keyboard.press("Escape"))
    await expect(dialog).not.toBeVisible({ timeout: 10_000 })

    const dialog2 = await reopenFirstRow(propertiesPage)
    const { offerId: offerId2 } = await openSalesTabPanel(propertiesPage, dialog2)

    // Must show "0", not empty string (which would mean null was stored)
    await expect(dialog2.getByTestId(`offer-conditions-days-input--finance--${offerId2}`)).toHaveValue("0", {
      timeout: 10_000,
    })

    // Restore
    await dialog2.getByTestId(`offer-conditions-days-input--finance--${offerId2}`).fill(origFinance)
    await saveAndWaitForConfirm(dialog2, offerId2)
  })

  test("cooling off days value of 0 persists (falsy-zero regression)", async ({ page }) => {
    const { propertiesPage, dialog } = await openPropertiesPopup(page)
    const { offerId } = await openSalesTabPanel(propertiesPage, dialog)

    const coolingOffInput = dialog.getByTestId(`offer-conditions-days-input--cooling-off--${offerId}`)
    await expect(coolingOffInput).toBeVisible({ timeout: 10_000 })

    const origValue = await coolingOffInput.inputValue()

    // 0 cooling off is a valid business value (cash/no-conditions deals).
    // Without a fix, naïve `coolingOffDays ? parseInt(…) : COOLING_OFF_DEFAULT`
    // would save the default (5) instead of 0.
    await coolingOffInput.fill("0")
    await saveAndWaitForConfirm(dialog, offerId)

    const closeBtn = dialog.getByRole("button", { name: /close/i }).first()
    await closeBtn.click().catch(() => propertiesPage.keyboard.press("Escape"))
    await expect(dialog).not.toBeVisible({ timeout: 10_000 })

    const dialog2 = await reopenFirstRow(propertiesPage)
    const { offerId: offerId2 } = await openSalesTabPanel(propertiesPage, dialog2)

    await expect(
      dialog2.getByTestId(`offer-conditions-days-input--cooling-off--${offerId2}`),
    ).toHaveValue("0", { timeout: 10_000 })

    // Restore
    await dialog2.getByTestId(`offer-conditions-days-input--cooling-off--${offerId2}`).fill(origValue)
    await saveAndWaitForConfirm(dialog2, offerId2)
  })
})
