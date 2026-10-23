/**
 * E2E: Meeting form bug fix + auto-calendar-sync
 *
 * Covers:
 *  1. Enter key in date/duration inputs does NOT submit the form prematurely
 *  2. Meeting is saved successfully via the submit button
 *  3. Meeting save succeeds (calendar sync runs server-side; browser may POST calendar-sync only if still unsynced)
 *  4. Same Enter-key protection applies to the reminder form (date + quarter-hour time selects)
 *
 * Requires: E2E_ADMIN_EMAIL + E2E_ADMIN_PASSWORD + DATABASE_URL
 */

import { expect, test } from "@playwright/test"

import { signInAsAdmin } from "./helpers/admin-auth"
import {
  gotoSellersPipeline,
  openPropertyPanel,
  PANDA_PIPELINE_SEED_CARD_ADDRESS_SNIPPET,
  sellersCardByAddressSnippet,
  waitForPanelLoad,
} from "./helpers/panda-pipeline-panels"
import { pickQuarterHourTime } from "./helpers/quarter-hour-time"
import { requirePandaLiveE2eEnv } from "./helpers/require-panda-live-e2e-env"

async function openSeedPropertyPanel(page: Parameters<typeof signInAsAdmin>[0]) {
  await signInAsAdmin(page)
  await gotoSellersPipeline(page)
  const card = sellersCardByAddressSnippet(page, PANDA_PIPELINE_SEED_CARD_ADDRESS_SNIPPET).first()
  await expect(card).toBeVisible({ timeout: 20_000 })
  return openPropertyPanel(page, card)
}

test.describe("Meeting form — Enter key + auto calendar sync", () => {
  test.beforeEach(() => {
    requirePandaLiveE2eEnv()
  })

  // ── 1. Enter in date input does not close dialog ──────────────────────────

  test("pressing Enter in the date input does not submit the Add Meeting form", async ({ page }) => {
    const panel = await openSeedPropertyPanel(page)
    await panel.getByLabel("Add meeting").click()

    const dialog = page.getByTestId("add-meeting-dialog")
    await expect(dialog).toBeVisible()

    // Fill title so form would be valid, but we will press Enter in date
    await dialog.getByTestId("meeting-title-input").fill("E2E Enter-in-date test")
    await dialog.getByTestId("meeting-date-input").fill("2026-08-01")

    // Press Enter while date input is focused — should NOT submit the form
    await dialog.getByTestId("meeting-date-input").press("Enter")

    // Dialog must still be open (not closed/hidden)
    await expect(dialog).toBeVisible()

    // Cancel to clean up
    await dialog.getByRole("button", { name: "Cancel" }).click()
    await expect(dialog).toBeHidden({ timeout: 5_000 })
  })

  // ── 2. Enter in time input does not close dialog ──────────────────────────

  test("pressing Enter in the duration input does not submit the Add Meeting form", async ({ page }) => {
    const panel = await openSeedPropertyPanel(page)
    await panel.getByLabel("Add meeting").click()

    const dialog = page.getByTestId("add-meeting-dialog")
    await expect(dialog).toBeVisible()

    await dialog.getByTestId("meeting-title-input").fill("E2E Enter-in-duration test")
    await dialog.getByTestId("meeting-date-input").fill("2026-08-02")
    await pickQuarterHourTime(page, dialog, "meeting-time-hour-select", "meeting-time-minute-select", "09:00")
    await dialog.getByTestId("meeting-duration-input").fill("60")

    // Press Enter while duration input is focused — should NOT submit the form
    await dialog.getByTestId("meeting-duration-input").press("Enter")

    // Dialog must still be open
    await expect(dialog).toBeVisible()

    await dialog.getByRole("button", { name: "Cancel" }).click()
    await expect(dialog).toBeHidden({ timeout: 5_000 })
  })

  // ── 3. Meeting saves + calendar sync API fires automatically ──────────────

  test("saving a meeting persists the card (calendar sync is server-side first)", async ({ page }) => {
    const panel = await openSeedPropertyPanel(page)
    await panel.getByLabel("Add meeting").click()

    const dialog = page.getByTestId("add-meeting-dialog")
    await expect(dialog).toBeVisible()

    const meetingTitle = `E2E Auto-Sync ${Date.now()}`
    await dialog.getByTestId("meeting-title-input").fill(meetingTitle)
    await dialog.getByTestId("meeting-date-input").fill("2026-09-01")
    await pickQuarterHourTime(page, dialog, "meeting-time-hour-select", "meeting-time-minute-select", "10:00")
    await dialog.getByTestId("meeting-submit-btn").click()

    // Dialog closes — meeting saved
    await expect(dialog).toBeHidden({ timeout: 15_000 })
    await waitForPanelLoad(panel)

    // Clean up — find and delete the card
    const meetingsSection = panel.getByTestId("meetings-section")
    const card = meetingsSection.locator(`[data-testid^="meeting-card--"]`).filter({ hasText: meetingTitle })
    await expect(card).toBeVisible({ timeout: 10_000 })
    await card.locator(`[data-testid^="meeting-card-delete--"]`).click()
    await expect(card).toBeHidden({ timeout: 15_000 })
  })

  // ── 4. Enter in reminder date/time inputs does not submit ─────────────────

  test("pressing Enter in reminder date input does not submit; quarter-hour time can be set without submitting", async ({
    page,
  }) => {
    const panel = await openSeedPropertyPanel(page)
    await panel.getByLabel("Add reminder").click()

    const dialog = page.getByTestId("add-reminder-dialog")
    await expect(dialog).toBeVisible()

    await dialog.getByTestId("reminder-title-input").fill("E2E Reminder Enter test")
    await dialog.getByTestId("reminder-date-input").fill("2026-08-10")

    // Enter on date — must not submit
    await dialog.getByTestId("reminder-date-input").press("Enter")
    await expect(dialog).toBeVisible()

    await pickQuarterHourTime(page, dialog, "reminder-time-hour-select", "reminder-time-minute-select", "08:30")
    await expect(dialog).toBeVisible()

    await dialog.getByRole("button", { name: "Cancel" }).click()
    await expect(dialog).toBeHidden({ timeout: 5_000 })
  })

  // ── 5. Correct submit button still works after fix ────────────────────────

  test("the Add Meeting submit button still saves the meeting correctly", async ({ page }) => {
    const panel = await openSeedPropertyPanel(page)
    await panel.getByLabel("Add meeting").click()

    const dialog = page.getByTestId("add-meeting-dialog")
    await expect(dialog).toBeVisible()

    const meetingTitle = `E2E Submit Button ${Date.now()}`
    await dialog.getByTestId("meeting-title-input").fill(meetingTitle)
    await dialog.getByTestId("meeting-date-input").fill("2026-10-15")
    await pickQuarterHourTime(page, dialog, "meeting-time-hour-select", "meeting-time-minute-select", "14:30")
    await dialog.getByTestId("meeting-submit-btn").click()

    await expect(dialog).toBeHidden({ timeout: 15_000 })
    await waitForPanelLoad(panel)

    const meetingsSection = panel.getByTestId("meetings-section")
    const card = meetingsSection.locator(`[data-testid^="meeting-card--"]`).filter({ hasText: meetingTitle })
    await expect(card).toBeVisible({ timeout: 15_000 })

    // Legacy per-meeting "Add to Calendar" control removed; optional status/retry only if sync pending
    await expect(card.locator(`[data-testid^="meeting-calendar-sync--"]`)).toHaveCount(0)

    // Clean up
    await card.locator(`[data-testid^="meeting-card-delete--"]`).click()
    await expect(card).toBeHidden({ timeout: 15_000 })
  })
})
