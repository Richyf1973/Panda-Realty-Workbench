/**
 * E2E: Buyer Overview — "Add Meeting" button
 *
 * Success factors:
 * 1. The "Meetings" tab is present in the BuyerDetailPanel tab bar.
 * 2. The Buyer Overview tab renders an "Add Meeting" button.
 * 3. Clicking "Add Meeting" switches to the Meetings tab and opens the
 *    Add Meeting dialog.
 * 4. The Buyer select inside the dialog is pre-populated with the current buyer.
 * 5. Submitting the form creates a meeting that appears in the Meetings section.
 * 6. The created meeting can be deleted (cleanup).
 *
 * Requires: E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD + DATABASE_URL.
 */

import { expect, test } from "@playwright/test"

import { signInAsAdmin } from "./helpers/admin-auth"
import {
  buyersCardByAddressSnippet,
  gotoBuyersPipeline,
  openBuyerPanel,
  PANDA_E2E_BUYERS_SEED_SNIPPET,
  waitForPanelLoad,
} from "./helpers/panda-pipeline-panels"
import { pickQuarterHourTime } from "./helpers/quarter-hour-time"
import { requirePandaLiveE2eEnv } from "./helpers/require-panda-live-e2e-env"

// ── helpers ───────────────────────────────────────────────────────────────────

async function openSeedBuyerPanel(page: Parameters<typeof signInAsAdmin>[0]) {
  await signInAsAdmin(page)
  await gotoBuyersPipeline(page)
  const card = buyersCardByAddressSnippet(page, PANDA_E2E_BUYERS_SEED_SNIPPET).first()
  await expect(card).toBeVisible({ timeout: 20_000 })
  return openBuyerPanel(page, card)
}

// ── describe ──────────────────────────────────────────────────────────────────

test.describe("Buyer Overview — Add Meeting button", () => {
  test.beforeEach(() => {
    requirePandaLiveE2eEnv()
  })

  // ── 1. Meetings tab is present ───────────────────────────────────────────

  test("Meetings tab is present in the BuyerDetailPanel tab bar", async ({ page }) => {
    const panel = await openSeedBuyerPanel(page)
    await expect(panel.getByTestId("buyer-panel-tab--meetings")).toBeVisible()
  })

  // ── 2. Add Meeting button is visible on Overview tab ─────────────────────

  test("Buyer Overview renders an Add Meeting button", async ({ page }) => {
    const panel = await openSeedBuyerPanel(page)
    // Overview is the default tab
    await expect(panel.getByTestId("buyer-overview-add-meeting-btn")).toBeVisible()
  })

  // ── 3. Clicking opens the dialog and switches to Meetings tab ────────────

  test("clicking Add Meeting switches to Meetings tab and opens the dialog", async ({ page }) => {
    const panel = await openSeedBuyerPanel(page)

    await panel.getByTestId("buyer-overview-add-meeting-btn").click()

    // Tab must switch to Meetings
    await expect(panel.getByTestId("meetings-tab-content")).toBeVisible({ timeout: 10_000 })

    // Add Meeting dialog must open
    const dialog = page.getByTestId("add-meeting-dialog")
    await expect(dialog).toBeVisible()
    await expect(page.getByRole("heading", { name: "Add Meeting" })).toBeVisible()
  })

  // ── 4. Buyer select is pre-populated ────────────────────────────────────

  test("Add Meeting dialog is pre-populated with the current buyer", async ({ page }) => {
    const panel = await openSeedBuyerPanel(page)

    // Capture the buyer name shown in the panel header before clicking
    const panelTitle = panel.locator("h2, [data-testid='panel-content-ready']").first()
    // The SheetTitle renders the buyer name — grab it
    const buyerName = await panel.locator("[data-testid='panel-content-ready']")
      .evaluate(() => {
        // Walk up to the SheetContent and find the SheetTitle
        const titleEl = document.querySelector('[aria-label="Buyer details"] .text-base')
        return titleEl?.textContent?.trim() ?? null
      })

    await panel.getByTestId("buyer-overview-add-meeting-btn").click()

    const dialog = page.getByTestId("add-meeting-dialog")
    await expect(dialog).toBeVisible()

    // The buyer select trigger should NOT show "None" — it should show the buyer
    const selectTrigger = dialog.getByTestId("meeting-buyer-select")
    await expect(selectTrigger).toBeVisible()
    // The selected value must not be "None"
    await expect(selectTrigger).not.toHaveText("None")

    if (buyerName) {
      await expect(selectTrigger).toContainText(buyerName)
    }
  })

  // ── 5. Creating a meeting via the dialog saves and shows in Meetings section

  test("can create a meeting via the Overview Add Meeting button", async ({ page }) => {
    const panel = await openSeedBuyerPanel(page)

    await panel.getByTestId("buyer-overview-add-meeting-btn").click()

    const dialog = page.getByTestId("add-meeting-dialog")
    await expect(dialog).toBeVisible()

    const meetingTitle = `E2E Buyer Overview Meeting ${Date.now()}`
    await dialog.getByTestId("meeting-title-input").fill(meetingTitle)
    await dialog.getByTestId("meeting-date-input").fill("2026-08-15")
    await pickQuarterHourTime(page, dialog, "meeting-time-hour-select", "meeting-time-minute-select", "11:00")
    await dialog.getByTestId("meeting-submit-btn").click()

    // Dialog closes
    await expect(dialog).toBeHidden({ timeout: 15_000 })

    // Panel refetches — wait for content to reappear
    await panel.locator('[data-testid="panel-content-ready"]')
      .waitFor({ state: "hidden", timeout: 10_000 })
      .catch(() => undefined)
    await waitForPanelLoad(panel)

    // Meetings tab should now be active (navigated there on submit)
    await expect(panel.getByTestId("meetings-tab-content")).toBeVisible({ timeout: 10_000 })

    // Meeting card appears in the Meetings section
    const meetingsSection = panel.getByTestId("meetings-section")
    const card = meetingsSection
      .locator('[data-testid^="meeting-card--"]')
      .filter({ hasText: meetingTitle })
    await expect(card).toBeVisible({ timeout: 15_000 })
    await expect(card.locator('[data-testid^="meeting-card-title--"]')).toHaveText(meetingTitle)

    // Clean up
    await card.locator('[data-testid^="meeting-card-delete--"]').click()
    await expect(card).toBeHidden({ timeout: 15_000 })
  })

  // ── 6. Meetings tab shows existing meetings for the property ─────────────

  test("Meetings tab in BuyerDetailPanel shows meetings and reminders sections", async ({ page }) => {
    const panel = await openSeedBuyerPanel(page)

    await panel.getByTestId("buyer-panel-tab--meetings").click()
    await expect(panel.getByTestId("meetings-tab-content")).toBeVisible({ timeout: 10_000 })

    await expect(panel.getByTestId("meetings-section")).toBeVisible()
    await expect(panel.getByTestId("reminders-section")).toBeVisible()
  })
})
