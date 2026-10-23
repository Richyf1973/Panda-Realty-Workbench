/**
 * E2E: Offer conditions fields persist after save — buildingPestDays and other fields.
 *
 * Verifies:
 * 1. Dialog Sales tab: change buildingPestDays, save, close/reopen → value persists.
 * 2. "Saved ✓" label appears after successful save.
 * 3. Pipeline Offers tab: panel stays mounted (not collapsed) after save.
 *
 * Requires: E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD, DATABASE_URL.
 * Seed: "99 E2E Seed Street" must have an accepted buyer offer.
 */

import { expect, test, type Page, type Locator } from "@playwright/test"

import { requirePandaE2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import {
  gotoSellersPipeline,
  openPropertyPanel,
  PANDA_PIPELINE_SEED_CARD_ADDRESS_SNIPPET,
  sellersCardByAddressSnippet,
} from "./helpers/panda-pipeline-panels"
import { requirePandaLiveE2eEnv } from "./helpers/require-panda-live-e2e-env"

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Open the properties page in a popup via the pipeline address link. */
async function openPropertiesPageViaAddressLink(
  page: Page,
): Promise<{ propertiesPage: Page; dialog: Locator }> {
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

/** Open the Sales tab and wait for the conditions panel. Returns { dialog, offerId, panel }. */
async function openSalesTabConditionsPanel(
  propertiesPage: Page,
  dialog: Locator,
): Promise<{ offerId: string; panel: Locator }> {
  await propertiesPage.getByTestId("panda-properties-form-tab-trigger--sales").click()
  const conditionsRoot = dialog.locator('[data-testid^="offer-conditions-panel--"]')
  await expect(conditionsRoot).toBeVisible({ timeout: 15_000 })
  const offerId = (await conditionsRoot.getAttribute("data-testid"))!.replace("offer-conditions-panel--", "")
  return { offerId, panel: conditionsRoot }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe("Offer conditions fields persistence", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaLiveE2eEnv()
    requirePandaE2eAdminCredentials()
    await signInAsAdmin(page)
    await gotoSellersPipeline(page)
  })

  test("dialog Sales tab: buildingPestDays persists after close/reopen", async ({ page }) => {
    test.setTimeout(180_000)

    const { propertiesPage, dialog } = await openPropertiesPageViaAddressLink(page)
    const { offerId } = await openSalesTabConditionsPanel(propertiesPage, dialog)

    const buildingPestInput = dialog.locator(
      `[data-testid="offer-conditions-days-input--building-pest--${offerId}"]`,
    )
    await expect(buildingPestInput).toBeVisible({ timeout: 10_000 })

    const originalValue = await buildingPestInput.inputValue()
    const newValue = originalValue === "13" ? "14" : "13"

    await buildingPestInput.fill(newValue)

    const saveBtn = dialog.getByRole("button", { name: /^save conditions$/i })
    await saveBtn.click()
    await expect(saveBtn).toBeEnabled({ timeout: 20_000 })
    await expect(dialog.locator("text=Failed to save")).toHaveCount(0)

    // Saved ✓ feedback must appear
    await expect(dialog.locator(`[data-testid="offer-conditions-saved-ok--${offerId}"]`)).toBeVisible({
      timeout: 5_000,
    })

    // Close the dialog
    const closeBtn = dialog.getByRole("button", { name: /close/i }).first()
    await closeBtn.click().catch(() => propertiesPage.keyboard.press("Escape"))
    await expect(dialog).not.toBeVisible({ timeout: 10_000 })

    // Reopen the same property row
    const tableBody = propertiesPage.getByTestId("admin-entity-table-body--properties")
    await expect(tableBody).toBeVisible({ timeout: 15_000 })
    await propertiesPage.locator('[data-testid^="admin-entity-row--properties--"]').first().click()
    const dialog2 = propertiesPage.getByTestId("admin-entity-crud-dialog--properties")
    await expect(dialog2).toBeVisible({ timeout: 20_000 })
    const { offerId: offerId2 } = await openSalesTabConditionsPanel(propertiesPage, dialog2)

    const buildingPestInput2 = dialog2.locator(
      `[data-testid="offer-conditions-days-input--building-pest--${offerId2}"]`,
    )
    await expect(buildingPestInput2).toHaveValue(newValue, { timeout: 10_000 })

    // Restore original value
    await buildingPestInput2.fill(originalValue)
    await dialog2.getByRole("button", { name: /^save conditions$/i }).click()
    await expect(dialog2.getByRole("button", { name: /^save conditions$/i })).toBeEnabled({
      timeout: 20_000,
    })
  })

  test("dialog Sales tab: 'Saved ✓' appears after saving financeDays", async ({ page }) => {
    test.setTimeout(120_000)

    const { propertiesPage, dialog } = await openPropertiesPageViaAddressLink(page)
    const { offerId } = await openSalesTabConditionsPanel(propertiesPage, dialog)

    const financeInput = dialog.locator(
      `[data-testid="offer-conditions-days-input--finance--${offerId}"]`,
    )
    await expect(financeInput).toBeVisible({ timeout: 10_000 })

    const originalValue = await financeInput.inputValue()
    const newValue = originalValue === "3" ? "4" : "3"
    await financeInput.fill(newValue)

    const saveBtn = dialog.getByRole("button", { name: /^save conditions$/i })
    await saveBtn.click()
    await expect(saveBtn).toBeEnabled({ timeout: 20_000 })
    await expect(dialog.locator(`[data-testid="offer-conditions-saved-ok--${offerId}"]`)).toBeVisible({
      timeout: 5_000,
    })
    await expect(dialog.locator("text=Failed to save")).toHaveCount(0)

    // Restore
    await financeInput.fill(originalValue)
    await saveBtn.click()
    await expect(saveBtn).toBeEnabled({ timeout: 20_000 })
  })

  test("pipeline Summary tab: conditions panel stays visible and shows Saved ✓ after save", async ({
    page,
  }) => {
    test.setTimeout(120_000)

    const card = sellersCardByAddressSnippet(page, PANDA_PIPELINE_SEED_CARD_ADDRESS_SNIPPET).first()
    await expect(card).toBeVisible({ timeout: 20_000 })

    const sidePanel = await openPropertyPanel(page, card)

    // Summary tab is the default; ensure conditions panel is present
    const conditionsPanel = sidePanel.locator('[data-testid^="offer-conditions-panel--"]')
    await expect(conditionsPanel).toBeVisible({ timeout: 10_000 })
    const offerId = (await conditionsPanel.getAttribute("data-testid"))!.replace(
      "offer-conditions-panel--",
      "",
    )

    // Change Building & Pest and save
    const buildingPestInput = conditionsPanel.locator(
      `[data-testid="offer-conditions-days-input--building-pest--${offerId}"]`,
    )
    await expect(buildingPestInput).toBeVisible()
    const originalValue = await buildingPestInput.inputValue()
    const newValue = originalValue === "8" ? "9" : "8"
    await buildingPestInput.fill(newValue)

    const saveBtn = conditionsPanel.getByRole("button", { name: /^save conditions$/i })
    await saveBtn.click()
    await expect(saveBtn).toBeEnabled({ timeout: 20_000 })

    // Panel must still be visible after save
    await expect(conditionsPanel).toBeVisible()

    // Saved ✓ feedback must appear
    await expect(
      conditionsPanel.locator(`[data-testid="offer-conditions-saved-ok--${offerId}"]`),
    ).toBeVisible({ timeout: 5_000 })

    // Restore
    await buildingPestInput.fill(originalValue)
    await saveBtn.click()
    await expect(saveBtn).toBeEnabled({ timeout: 20_000 })
  })
})
