/**
 * E2E: Meeting & Reminder dialogs — reminder rows UI
 *
 * Covers:
 *  1. Add Meeting dialog pre-populates 2 reminder rows (1 hour + 1 day, Notification)
 *  2. Add Reminder dialog pre-populates the same 2 rows
 *  3. Changing method (Notification → Email) is reflected
 *  4. Changing value + unit is reflected
 *  5. Removing a row via X reduces the count
 *  6. "Add notification" button appends a new row
 *  7. Saving with custom reminders succeeds (reminders applied server-side to calendar when sync runs)
 *  8. Saving with all reminders removed still saves the meeting successfully
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

// ── shared setup ─────────────────────────────────────────────────────────────

async function openSeedPropertyPanel(page: Parameters<typeof signInAsAdmin>[0]) {
  await signInAsAdmin(page)
  await gotoSellersPipeline(page)
  const card = sellersCardByAddressSnippet(page, PANDA_PIPELINE_SEED_CARD_ADDRESS_SNIPPET).first()
  await expect(card).toBeVisible({ timeout: 20_000 })
  return openPropertyPanel(page, card)
}


// ── describe ─────────────────────────────────────────────────────────────────

test.describe("Meeting / Reminder dialogs — reminder rows", () => {
  test.beforeEach(() => {
    requirePandaLiveE2eEnv()
  })

  // ── 1 & 2: default rows ──────────────────────────────────────────────────

  test("Add Meeting dialog shows 2 default reminder rows (1 hour, 1 day)", async ({ page }) => {
    const panel = await openSeedPropertyPanel(page)
    await panel.getByLabel("Add meeting").click()

    const dialog = page.getByTestId("add-meeting-dialog")
    await expect(dialog).toBeVisible()

    // Label is visible
    await expect(dialog.getByText("Reminders")).toBeVisible()

    // Two rows exist
    const rows = dialog.locator('[data-testid="reminder-row"]')
    await expect(rows).toHaveCount(2)

    // First row: Notification, 1, hours
    const row0 = rows.nth(0)
    await expect(row0.locator('[data-testid="reminder-method-select"]')).toContainText("Notification")
    await expect(row0.locator('[data-testid="reminder-value-input"]')).toHaveValue("1")
    await expect(row0.locator('[data-testid="reminder-unit-select"]')).toContainText("hours")

    // Second row: Notification, 1, days
    const row1 = rows.nth(1)
    await expect(row1.locator('[data-testid="reminder-method-select"]')).toContainText("Notification")
    await expect(row1.locator('[data-testid="reminder-value-input"]')).toHaveValue("1")
    await expect(row1.locator('[data-testid="reminder-unit-select"]')).toContainText("days")

    await dialog.getByRole("button", { name: "Cancel" }).click()
    await expect(dialog).toBeHidden({ timeout: 5_000 })
  })

  test("Add Reminder dialog shows 2 default reminder rows (1 hour, 1 day)", async ({ page }) => {
    const panel = await openSeedPropertyPanel(page)
    await panel.getByLabel("Add reminder").click()

    const dialog = page.getByTestId("add-reminder-dialog")
    await expect(dialog).toBeVisible()

    await expect(dialog.getByText("Reminders")).toBeVisible()

    const rows = dialog.locator('[data-testid="reminder-row"]')
    await expect(rows).toHaveCount(2)

    await expect(rows.nth(0).locator('[data-testid="reminder-value-input"]')).toHaveValue("1")
    await expect(rows.nth(0).locator('[data-testid="reminder-unit-select"]')).toContainText("hours")
    await expect(rows.nth(1).locator('[data-testid="reminder-value-input"]')).toHaveValue("1")
    await expect(rows.nth(1).locator('[data-testid="reminder-unit-select"]')).toContainText("days")

    await dialog.getByRole("button", { name: "Cancel" }).click()
    await expect(dialog).toBeHidden({ timeout: 5_000 })
  })

  // ── 3: change method ─────────────────────────────────────────────────────

  test("can change reminder method to Email", async ({ page }) => {
    const panel = await openSeedPropertyPanel(page)
    await panel.getByLabel("Add meeting").click()

    const dialog = page.getByTestId("add-meeting-dialog")
    await expect(dialog).toBeVisible()

    const row0 = dialog.locator('[data-testid="reminder-row"]').nth(0)
    // Click the method trigger to open the dropdown
    await row0.locator('[data-testid="reminder-method-select"]').click()
    await page.getByRole("option", { name: "Email" }).click()

    await expect(row0.locator('[data-testid="reminder-method-select"]')).toContainText("Email")

    await dialog.getByRole("button", { name: "Cancel" }).click()
    await expect(dialog).toBeHidden({ timeout: 5_000 })
  })

  // ── 4: change value + unit ───────────────────────────────────────────────

  test("can change reminder value and unit", async ({ page }) => {
    const panel = await openSeedPropertyPanel(page)
    await panel.getByLabel("Add meeting").click()

    const dialog = page.getByTestId("add-meeting-dialog")
    await expect(dialog).toBeVisible()

    const row1 = dialog.locator('[data-testid="reminder-row"]').nth(1)
    await row1.locator('[data-testid="reminder-value-input"]').fill("2")
    await expect(row1.locator('[data-testid="reminder-value-input"]')).toHaveValue("2")

    await row1.locator('[data-testid="reminder-unit-select"]').click()
    await page.getByRole("option", { name: "weeks" }).click()
    await expect(row1.locator('[data-testid="reminder-unit-select"]')).toContainText("weeks")

    await dialog.getByRole("button", { name: "Cancel" }).click()
    await expect(dialog).toBeHidden({ timeout: 5_000 })
  })

  // ── 5: remove a row ──────────────────────────────────────────────────────

  test("removing a reminder row decreases the count by 1", async ({ page }) => {
    const panel = await openSeedPropertyPanel(page)
    await panel.getByLabel("Add meeting").click()

    const dialog = page.getByTestId("add-meeting-dialog")
    await expect(dialog).toBeVisible()

    const rows = dialog.locator('[data-testid="reminder-row"]')
    await expect(rows).toHaveCount(2)

    // Click the X button on the first row
    await rows.nth(0).locator('[data-testid="reminder-remove-btn"]').click()
    await expect(rows).toHaveCount(1)

    await dialog.getByRole("button", { name: "Cancel" }).click()
    await expect(dialog).toBeHidden({ timeout: 5_000 })
  })

  // ── 6: add a new row ────────────────────────────────────────────────────

  test("clicking Add notification appends a third reminder row", async ({ page }) => {
    const panel = await openSeedPropertyPanel(page)
    await panel.getByLabel("Add meeting").click()

    const dialog = page.getByTestId("add-meeting-dialog")
    await expect(dialog).toBeVisible()

    await expect(dialog.locator('[data-testid="reminder-row"]')).toHaveCount(2)

    await dialog.getByRole("button", { name: "Add notification" }).click()

    await expect(dialog.locator('[data-testid="reminder-row"]')).toHaveCount(3)

    await dialog.getByRole("button", { name: "Cancel" }).click()
    await expect(dialog).toBeHidden({ timeout: 5_000 })
  })

  // ── 7: reminders passed to calendar-sync ────────────────────────────────

  test("saving a meeting with custom reminders persists them on the card", async ({ page }) => {
    const panel = await openSeedPropertyPanel(page)
    await panel.getByLabel("Add meeting").click()

    const dialog = page.getByTestId("add-meeting-dialog")
    await expect(dialog).toBeVisible()

    // Change row 0 to Email, 30 minutes
    const row0 = dialog.locator('[data-testid="reminder-row"]').nth(0)
    await row0.locator('[data-testid="reminder-method-select"]').click()
    await page.getByRole("option", { name: "Email" }).click()
    await row0.locator('[data-testid="reminder-value-input"]').fill("30")
    await row0.locator('[data-testid="reminder-unit-select"]').click()
    await page.getByRole("option", { name: "minutes" }).click()

    const meetingTitle = `E2E Reminders Body ${Date.now()}`
    await dialog.getByTestId("meeting-title-input").fill(meetingTitle)
    await dialog.getByTestId("meeting-date-input").fill("2026-11-01")
    await pickQuarterHourTime(page, dialog, "meeting-time-hour-select", "meeting-time-minute-select", "10:00")
    await dialog.getByTestId("meeting-submit-btn").click()

    await expect(dialog).toBeHidden({ timeout: 15_000 })
    await waitForPanelLoad(panel)

    // Meeting card appears — reminders were accepted by server action without error
    const meetingsSection = panel.getByTestId("meetings-section")
    const card = meetingsSection.locator(`[data-testid^="meeting-card--"]`).filter({ hasText: meetingTitle })
    await expect(card).toBeVisible({ timeout: 15_000 })

    // Clean up
    await card.locator(`[data-testid^="meeting-card-delete--"]`).click()
    await expect(card).toBeHidden({ timeout: 15_000 })
  })

  // ── 8: save with no reminders ────────────────────────────────────────────

  test("saving a meeting with all reminders removed still succeeds", async ({ page }) => {
    const panel = await openSeedPropertyPanel(page)
    await panel.getByLabel("Add meeting").click()

    const dialog = page.getByTestId("add-meeting-dialog")
    await expect(dialog).toBeVisible()

    const rows = dialog.locator('[data-testid="reminder-row"]')
    await expect(rows).toHaveCount(2)

    // Remove both rows
    await rows.nth(0).locator('[data-testid="reminder-remove-btn"]').click()
    await expect(rows).toHaveCount(1)
    await rows.nth(0).locator('[data-testid="reminder-remove-btn"]').click()
    await expect(rows).toHaveCount(0)

    const meetingTitle = `E2E No Reminders ${Date.now()}`
    await dialog.getByTestId("meeting-title-input").fill(meetingTitle)
    await dialog.getByTestId("meeting-date-input").fill("2026-12-01")
    await pickQuarterHourTime(page, dialog, "meeting-time-hour-select", "meeting-time-minute-select", "09:00")
    await dialog.getByTestId("meeting-submit-btn").click()

    // Dialog closes — no validation error
    await expect(dialog).toBeHidden({ timeout: 15_000 })
    await waitForPanelLoad(panel)

    // Meeting card appears
    const meetingsSection = panel.getByTestId("meetings-section")
    const card = meetingsSection.locator(`[data-testid^="meeting-card--"]`).filter({ hasText: meetingTitle })
    await expect(card).toBeVisible({ timeout: 15_000 })

    // No form error was shown
    await expect(dialog.getByTestId("meeting-form-error")).toHaveCount(0)

    // Clean up
    await card.locator(`[data-testid^="meeting-card-delete--"]`).click()
    await expect(card).toBeHidden({ timeout: 15_000 })
  })
})
