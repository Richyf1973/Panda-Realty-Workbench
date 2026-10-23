/**
 * E2E: Property meetings & reminders — toolbar buttons, add dialogs,
 * card display, delete, and calendar footer (reminders never show it).
 *
 * Requires live E2E env (DATABASE_URL + admin credentials).
 * Uses the standard seed card: "99 E2E Seed Street".
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

// ── helpers ──────────────────────────────────────────────────────────────────

async function openSeedPropertyPanel(page: Parameters<typeof signInAsAdmin>[0]) {
  await signInAsAdmin(page)
  await gotoSellersPipeline(page)
  const card = sellersCardByAddressSnippet(page, PANDA_PIPELINE_SEED_CARD_ADDRESS_SNIPPET).first()
  await expect(card).toBeVisible({ timeout: 20_000 })
  return openPropertyPanel(page, card)
}

async function goToMeetingsTab(panel: Awaited<ReturnType<typeof openPropertyPanel>>) {
  await panel.getByTestId("property-panel-tab--meetings").click()
  await expect(panel.getByTestId("meetings-tab-content")).toBeVisible({ timeout: 10_000 })
}

// ── describe ─────────────────────────────────────────────────────────────────

test.describe("Property meetings & reminders", () => {
  test.beforeEach(() => {
    requirePandaLiveE2eEnv()
  })

  // ── tab presence ────────────────────────────────────────────────────────

  test("Meetings tab is present in the tab bar", async ({ page }) => {
    const panel = await openSeedPropertyPanel(page)
    await expect(panel.getByTestId("property-panel-tab--meetings")).toBeVisible()
  })

  // ── toolbar buttons ──────────────────────────────────────────────────────

  test("Meeting toolbar button opens Add Meeting dialog and switches to Meetings tab", async ({ page }) => {
    const panel = await openSeedPropertyPanel(page)

    await panel.getByLabel("Add meeting").click()

    // Tab switches to Meetings
    await expect(panel.getByTestId("meetings-tab-content")).toBeVisible({ timeout: 10_000 })
    // Dialog opens
    await expect(page.getByTestId("add-meeting-dialog")).toBeVisible()
    await expect(page.getByRole("heading", { name: "Add Meeting" })).toBeVisible()
  })

  test("Reminder toolbar button opens Add Reminder dialog and switches to Meetings tab", async ({ page }) => {
    const panel = await openSeedPropertyPanel(page)

    await panel.getByLabel("Add reminder").click()

    await expect(panel.getByTestId("meetings-tab-content")).toBeVisible({ timeout: 10_000 })
    await expect(page.getByTestId("add-reminder-dialog")).toBeVisible()
    await expect(page.getByRole("heading", { name: "Add Reminder" })).toBeVisible()
  })

  // ── add meeting ──────────────────────────────────────────────────────────

  test("can add a meeting and see it in the Meetings section", async ({ page }) => {
    const panel = await openSeedPropertyPanel(page)
    await panel.getByLabel("Add meeting").click()

    const dialog = page.getByTestId("add-meeting-dialog")
    await expect(dialog).toBeVisible()

    const meetingTitle = `E2E Meeting ${Date.now()}`
    await dialog.getByTestId("meeting-title-input").fill(meetingTitle)
    await dialog.getByTestId("meeting-date-input").fill("2026-05-01")
    await pickQuarterHourTime(page, dialog, "meeting-time-hour-select", "meeting-time-minute-select", "10:00")
    await dialog.getByTestId("meeting-duration-input").fill("45")
    await dialog.getByTestId("meeting-notes-input").fill("E2E test notes")
    await dialog.getByTestId("meeting-submit-btn").click()

    // Dialog closes
    await expect(dialog).toBeHidden({ timeout: 15_000 })

    // Panel triggers a refetch after save — wait for loading to start then finish
    await panel.locator('[data-testid="panel-content-ready"]').waitFor({ state: "hidden", timeout: 10_000 }).catch(() => undefined)
    await waitForPanelLoad(panel)

    // Ensure Meetings tab is active
    await panel.getByTestId("property-panel-tab--meetings").click()
    await expect(panel.getByTestId("meetings-tab-content")).toBeVisible({ timeout: 10_000 })

    // Meeting card appears in the Meetings section
    const meetingsSection = panel.getByTestId("meetings-section")
    const card = meetingsSection.locator(`[data-testid^="meeting-card--"]`).filter({ hasText: meetingTitle })
    await expect(card).toBeVisible({ timeout: 15_000 })
    await expect(card.locator(`[data-testid^="meeting-card-title--"]`)).toHaveText(meetingTitle)
    await expect(card.locator(`[data-testid^="meeting-card-notes--"]`)).toHaveText("E2E test notes")

    // Clean up — delete the card
    await card.locator(`[data-testid^="meeting-card-delete--"]`).click()
    await expect(card).toBeHidden({ timeout: 15_000 })
  })

  // ── add reminder ─────────────────────────────────────────────────────────

  test("can add a reminder and see it in the Reminders section", async ({ page }) => {
    const panel = await openSeedPropertyPanel(page)
    await panel.getByLabel("Add reminder").click()

    const dialog = page.getByTestId("add-reminder-dialog")
    await expect(dialog).toBeVisible()

    const reminderTitle = `E2E Reminder ${Date.now()}`
    await dialog.getByTestId("reminder-title-input").fill(reminderTitle)
    await dialog.getByTestId("reminder-date-input").fill("2026-05-10")
    await dialog.getByTestId("reminder-submit-btn").click()

    // Dialog closes
    await expect(dialog).toBeHidden({ timeout: 15_000 })

    await waitForPanelLoad(panel)

    // Reminder appears in the Reminders section (not Meetings)
    const remindersSection = panel.getByTestId("reminders-section")
    const card = remindersSection.locator(`[data-testid^="meeting-card--"]`).filter({ hasText: reminderTitle })
    await expect(card).toBeVisible({ timeout: 15_000 })

    // Calendar status / retry footer is NOT present on reminders
    await expect(card.locator(`[data-testid^="meeting-calendar-sync-status--"]`)).toHaveCount(0)

    // Clean up
    await card.locator(`[data-testid^="meeting-card-delete--"]`).click()
    await expect(card).toBeHidden({ timeout: 15_000 })
  })

  // ── delete ───────────────────────────────────────────────────────────────

  test("deleting a meeting removes its card from the panel", async ({ page }) => {
    const panel = await openSeedPropertyPanel(page)

    // Add a meeting first
    await panel.getByLabel("Add meeting").click()
    const dialog = page.getByTestId("add-meeting-dialog")
    await expect(dialog).toBeVisible()

    const title = `E2E Delete ${Date.now()}`
    await dialog.getByTestId("meeting-title-input").fill(title)
    await dialog.getByTestId("meeting-date-input").fill("2026-06-01")
    await pickQuarterHourTime(page, dialog, "meeting-time-hour-select", "meeting-time-minute-select", "09:00")
    await dialog.getByTestId("meeting-submit-btn").click()
    await expect(dialog).toBeHidden({ timeout: 15_000 })
    await waitForPanelLoad(panel)

    const meetingsSection = panel.getByTestId("meetings-section")
    const card = meetingsSection.locator(`[data-testid^="meeting-card--"]`).filter({ hasText: title })
    await expect(card).toBeVisible({ timeout: 15_000 })

    // Delete
    await card.locator(`[data-testid^="meeting-card-delete--"]`).click()
    await expect(card).toBeHidden({ timeout: 15_000 })
  })

  // ── section structure ────────────────────────────────────────────────────

  test("Meetings tab shows both Meetings and Reminders sections", async ({ page }) => {
    const panel = await openSeedPropertyPanel(page)
    await goToMeetingsTab(panel)

    await expect(panel.getByTestId("meetings-section")).toBeVisible()
    await expect(panel.getByTestId("reminders-section")).toBeVisible()
  })

  // ── Calendar footer (meetings only; reminders never) ──────────────────────

  test("reminder cards never show calendar sync status; meeting cards list without legacy Add to Calendar control", async ({
    page,
  }) => {
    const panel = await openSeedPropertyPanel(page)

    // Create a meeting
    await panel.getByLabel("Add meeting").click()
    let dialog = page.getByTestId("add-meeting-dialog")
    const meetingTitle = `E2E Cal Meeting ${Date.now()}`
    await dialog.getByTestId("meeting-title-input").fill(meetingTitle)
    await dialog.getByTestId("meeting-date-input").fill("2026-07-01")
    await pickQuarterHourTime(page, dialog, "meeting-time-hour-select", "meeting-time-minute-select", "14:00")
    await dialog.getByTestId("meeting-submit-btn").click()
    await expect(dialog).toBeHidden({ timeout: 15_000 })
    await waitForPanelLoad(panel)

    // Create a reminder
    await panel.getByLabel("Add reminder").click()
    dialog = page.getByTestId("add-reminder-dialog")
    const reminderTitle = `E2E Cal Reminder ${Date.now()}`
    await dialog.getByTestId("reminder-title-input").fill(reminderTitle)
    await dialog.getByTestId("reminder-date-input").fill("2026-07-05")
    await dialog.getByTestId("reminder-submit-btn").click()
    await expect(dialog).toBeHidden({ timeout: 15_000 })
    await waitForPanelLoad(panel)

    const meetingCard = panel.getByTestId("meetings-section")
      .locator(`[data-testid^="meeting-card--"]`).filter({ hasText: meetingTitle })
    await expect(meetingCard).toBeVisible()
    await expect(meetingCard.locator(`[data-testid^="meeting-calendar-sync--"]`)).toHaveCount(0)

    const reminderCard = panel.getByTestId("reminders-section")
      .locator(`[data-testid^="meeting-card--"]`).filter({ hasText: reminderTitle })
    await expect(reminderCard.locator(`[data-testid^="meeting-calendar-sync-status--"]`)).toHaveCount(0)

    // Clean up both
    await meetingCard.locator(`[data-testid^="meeting-card-delete--"]`).click()
    await expect(meetingCard).toBeHidden({ timeout: 10_000 })
    await reminderCard.locator(`[data-testid^="meeting-card-delete--"]`).click()
    await expect(reminderCard).toBeHidden({ timeout: 10_000 })
  })

  // ── Cancel closes without saving ─────────────────────────────────────────

  test("cancelling the Add Meeting dialog does not create a meeting", async ({ page }) => {
    const panel = await openSeedPropertyPanel(page)
    await goToMeetingsTab(panel)

    // Count current meetings
    const meetingsSection = panel.getByTestId("meetings-section")
    const countBefore = await meetingsSection.locator(`[data-testid^="meeting-card--"]`).count()

    // Open and cancel
    await panel.getByLabel("Add meeting").click()
    const dialog = page.getByTestId("add-meeting-dialog")
    await expect(dialog).toBeVisible()
    await dialog.getByTestId("meeting-title-input").fill("Should not be saved")
    await dialog.getByRole("button", { name: "Cancel" }).click()
    await expect(dialog).toBeHidden({ timeout: 5_000 })

    // Count unchanged
    await expect(meetingsSection.locator(`[data-testid^="meeting-card--"]`)).toHaveCount(countBefore)
  })
})
