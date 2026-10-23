/**
 * E2E: contract_date column DB persistence — both save paths.
 *
 * Success factors:
 * 1. "Save conditions" button writes contract_date to panda_realty.panda_properties.
 * 2. "Save changes" (main property form) writes contract_date WITHOUT clicking "Save conditions".
 * 3. "Clear + Save conditions" sets contract_date = NULL in the DB.
 *
 * State is restored after every test so the shared seed row stays stable.
 *
 * Requires: E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD, DATABASE_URL.
 * Seed: "99 E2E Seed Street" must have an accepted buyer offer.
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
import {
  getPropertyContractDate,
  getPropertyListIdByAddressSnippet,
  setPropertyContractDate,
} from "./helpers/contract-date-db"

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Navigate from the pipeline card to the properties popup via the address link,
 * switch to the Sales tab, and return the popup page, dialog, offerId, and panel.
 */
async function openSalesTabConditionsPanel(page: Page): Promise<{
  propertiesPage: Page
  dialog: Locator
  offerId: string
}> {
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
  await propertiesPage.getByTestId("panda-properties-form-tab-trigger--sales").click()

  const panel = dialog.locator('[data-testid^="offer-conditions-panel--"]')
  await expect(panel).toBeVisible({ timeout: 15_000 })
  const offerId = (await panel.getAttribute("data-testid"))!.replace("offer-conditions-panel--", "")

  return { propertiesPage, dialog, offerId }
}

/**
 * Open the contract date calendar on the conditions panel and click the given day number.
 * Returns the expected UTC-midnight Date for that day.
 *
 * The calendar opens on the month of `baseDate` (the currently selected date).
 * Callers must pass a baseDate whose UTC year/month matches what the DB currently holds
 * so the expected Date is computed from the correct month.
 *
 * Day buttons in react-day-picker v9 are <tbody> <button> elements.
 * The calendar portal is attached to document.body of the popup page (not the dialog).
 */
async function pickContractDay(
  propertiesPage: Page,
  offerId: string,
  baseDate: Date,
  targetDay: number,
): Promise<Date> {
  const contractDateBtn = propertiesPage.locator(
    `[data-testid="offer-conditions-contract-date-btn--${offerId}"]`,
  )
  await contractDateBtn.click()

  const cal = propertiesPage.locator('[data-slot="calendar"]')
  await expect(cal).toBeVisible({ timeout: 8_000 })

  const dayBtn = cal
    .locator("tbody button")
    .filter({ hasText: new RegExp(`^${targetDay}$`) })
    .first()
  await expect(dayBtn).toBeVisible({ timeout: 5_000 })
  await dayBtn.click()

  // Popover closes after selection.
  await expect(cal).toHaveCount(0, { timeout: 5_000 })

  // Expected stored value: midnight UTC on baseDate's year/month + targetDay.
  return new Date(Date.UTC(baseDate.getUTCFullYear(), baseDate.getUTCMonth(), targetDay))
}

/**
 * Assert the DB stores the expected UTC-midnight date.
 * Compares UTC year/month/day to avoid local-timezone off-by-one.
 */
async function assertDbDate(propertyListId: number, expected: Date): Promise<void> {
  const stored = await getPropertyContractDate(propertyListId)
  expect(stored, `expected contract_date ${expected.toISOString()} but got null`).not.toBeNull()
  expect(stored!.getUTCFullYear()).toBe(expected.getUTCFullYear())
  expect(stored!.getUTCMonth()).toBe(expected.getUTCMonth())
  expect(stored!.getUTCDate()).toBe(expected.getUTCDate())
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe("Contract date DB persistence", () => {
  test.describe.configure({ timeout: 180_000 })

  test.beforeEach(async ({ page }) => {
    requirePandaLiveE2eEnv()
    requirePandaE2eAdminCredentials()
    await signInAsAdmin(page)
    await gotoSellersPipeline(page)
  })

  test('"Save conditions" writes contract_date to panda_properties', async ({ page }) => {
    const propertyListId = await getPropertyListIdByAddressSnippet(
      PANDA_PIPELINE_SEED_CARD_ADDRESS_SNIPPET,
    )
    const originalDate = await getPropertyContractDate(propertyListId)

    // Set a known base date so the calendar opens on the current month.
    const now = new Date()
    const baseDateUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    await setPropertyContractDate(propertyListId, baseDateUtc)

    const { propertiesPage, dialog, offerId } = await openSalesTabConditionsPanel(page)

    // Pick a day that differs from the base day (day 1) to confirm the write is fresh.
    const targetDay = 8
    const expectedDate = await pickContractDay(propertiesPage, offerId, baseDateUtc, targetDay)

    const saveBtn = dialog.locator(`[data-testid="offer-conditions-save-btn--${offerId}"]`)
    await saveBtn.click()
    await expect(
      dialog.locator(`[data-testid="offer-conditions-saved-ok--${offerId}"]`),
    ).toBeVisible({ timeout: 15_000 })
    await expect(dialog.locator("text=Failed to save")).toHaveCount(0)

    // Assert the DB column directly — no close/reopen needed.
    await assertDbDate(propertyListId, expectedDate)

    // Restore original so other specs see a stable fixture.
    await setPropertyContractDate(propertyListId, originalDate)
  })

  test('"Save changes" writes contract_date without clicking "Save conditions"', async ({
    page,
  }) => {
    const propertyListId = await getPropertyListIdByAddressSnippet(
      PANDA_PIPELINE_SEED_CARD_ADDRESS_SNIPPET,
    )
    const originalDate = await getPropertyContractDate(propertyListId)

    // Set a known base date so the calendar opens on the current month.
    const now = new Date()
    const baseDateUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    await setPropertyContractDate(propertyListId, baseDateUtc)

    const { propertiesPage, dialog, offerId } = await openSalesTabConditionsPanel(page)

    const targetDay = 20
    const expectedDate = await pickContractDay(propertiesPage, offerId, baseDateUtc, targetDay)

    // Dirty indicator must be visible — conditions have NOT been saved yet.
    await expect(
      dialog.locator(`[data-testid="offer-conditions-dirty-indicator--${offerId}"]`),
    ).toBeVisible({ timeout: 5_000 })

    // Click the main form "Save changes" button — NOT "Save conditions".
    const mainSaveBtn = dialog.locator(
      '[data-testid="admin-entity-edit-save-and-close--properties"]',
    )
    await expect(mainSaveBtn).toBeVisible()
    await mainSaveBtn.click()

    // Dialog closes after the main save.
    await expect(dialog).toBeHidden({ timeout: 30_000 })

    // Assert DB after dialog closes — main form save writes contract_date.
    await assertDbDate(propertyListId, expectedDate)

    // Restore.
    await setPropertyContractDate(propertyListId, originalDate)
  })

  test('"Save conditions" with Clear sets contract_date = NULL in DB', async ({ page }) => {
    const propertyListId = await getPropertyListIdByAddressSnippet(
      PANDA_PIPELINE_SEED_CARD_ADDRESS_SNIPPET,
    )
    const originalDate = await getPropertyContractDate(propertyListId)

    // Set a known base date so the calendar opens on the current month (used in guard below).
    const now = new Date()
    const baseDateUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    await setPropertyContractDate(propertyListId, baseDateUtc)

    const { propertiesPage, dialog, offerId } = await openSalesTabConditionsPanel(page)

    // Clear the contract date.
    await dialog
      .locator(`[data-testid="offer-conditions-contract-date-clear--${offerId}"]`)
      .click()

    const saveBtn = dialog.locator(`[data-testid="offer-conditions-save-btn--${offerId}"]`)
    await saveBtn.click()
    await expect(
      dialog.locator(`[data-testid="offer-conditions-saved-ok--${offerId}"]`),
    ).toBeVisible({ timeout: 15_000 })
    await expect(dialog.locator("text=Failed to save")).toHaveCount(0)

    const stored = await getPropertyContractDate(propertyListId)
    expect(stored, "expected contract_date to be NULL after Clear + Save conditions").toBeNull()

    // Restore.
    await setPropertyContractDate(propertyListId, originalDate)
  })
})
