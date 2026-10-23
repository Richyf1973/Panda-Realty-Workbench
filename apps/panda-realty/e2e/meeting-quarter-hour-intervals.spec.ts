/**
 * E2E: Add Meeting / Add Reminder — quarter-hour time selects, snap on save, duration increments
 *
 * Requires: E2E_ADMIN_EMAIL + E2E_ADMIN_PASSWORD + DATABASE_URL
 */

import { expect, test, type Locator, type Page } from "@playwright/test"

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

async function openSeedPropertyPanel(page: Page) {
  await signInAsAdmin(page)
  await gotoSellersPipeline(page)
  const card = sellersCardByAddressSnippet(page, PANDA_PIPELINE_SEED_CARD_ADDRESS_SNIPPET).first()
  await expect(card).toBeVisible({ timeout: 20_000 })
  return openPropertyPanel(page, card)
}

/** Minutes from midnight in Australia/Brisbane for the card's `data-scheduled-at` ISO. */
async function brisbaneMinutesFromMidnightFromCard(card: Locator): Promise<number> {
  const mins = await card.evaluate((el) => {
    const iso = el.getAttribute("data-scheduled-at")
    if (!iso) return null
    const d = new Date(iso)
    const parts = new Intl.DateTimeFormat("en-AU", {
      timeZone: "Australia/Brisbane",
      hour: "numeric",
      minute: "numeric",
      hour12: false,
    }).formatToParts(d)
    const hour = Number(parts.find((p) => p.type === "hour")?.value)
    const minute = Number(parts.find((p) => p.type === "minute")?.value)
    if (Number.isNaN(hour) || Number.isNaN(minute)) return null
    return hour * 60 + minute
  })
  if (mins == null) throw new Error("Expected meeting card to have data-scheduled-at")
  return mins
}

test.describe("Meeting dialogs — quarter-hour time selects and duration", () => {
  test.beforeEach(() => {
    requirePandaLiveE2eEnv()
  })

  test("Add Meeting time and duration inputs use 15-minute steps", async ({ page }) => {
    const panel = await openSeedPropertyPanel(page)
    await panel.getByLabel("Add meeting").click()

    const dialog = page.getByTestId("add-meeting-dialog")
    await expect(dialog).toBeVisible()

    await expect(dialog.getByTestId("meeting-time-hour-select")).toBeVisible()
    await expect(dialog.getByTestId("meeting-time-minute-select")).toBeVisible()
    await expect(dialog.getByText(/15-minute steps/i)).toBeVisible()

    const durationInput = dialog.getByTestId("meeting-duration-input")
    await expect(durationInput).toHaveAttribute("min", "15")
    await expect(durationInput).toHaveAttribute("step", "15")

    await dialog.getByRole("button", { name: "Cancel" }).click()
    await expect(dialog).toBeHidden({ timeout: 5_000 })
  })

  test("Add Reminder optional time uses quarter-hour selects", async ({ page }) => {
    const panel = await openSeedPropertyPanel(page)
    await panel.getByLabel("Add reminder").click()

    const dialog = page.getByTestId("add-reminder-dialog")
    await expect(dialog).toBeVisible()

    await expect(dialog.getByTestId("reminder-time-hour-select")).toBeVisible()
    await expect(dialog.getByTestId("reminder-time-minute-select")).toBeVisible()

    await dialog.getByRole("button", { name: "Cancel" }).click()
    await expect(dialog).toBeHidden({ timeout: 5_000 })
  })

  test("Add Meeting snaps off-grid duration to 15 minutes on save", async ({ page }) => {
    const panel = await openSeedPropertyPanel(page)
    await panel.getByLabel("Add meeting").click()

    const dialog = page.getByTestId("add-meeting-dialog")
    await expect(dialog).toBeVisible()

    const meetingTitle = `E2E Duration Snap ${Date.now()}`
    await dialog.getByTestId("meeting-title-input").fill(meetingTitle)
    await dialog.getByTestId("meeting-date-input").fill("2026-11-01")
    await pickQuarterHourTime(page, dialog, "meeting-time-hour-select", "meeting-time-minute-select", "10:00")
    await dialog.getByTestId("meeting-duration-input").fill("47")

    await dialog.getByTestId("meeting-submit-btn").click()
    await expect(dialog).toBeHidden({ timeout: 15_000 })
    await waitForPanelLoad(panel)

    const meetingsSection = panel.getByTestId("meetings-section")
    const card = meetingsSection.locator(`[data-testid^="meeting-card--"]`).filter({ hasText: meetingTitle })
    await expect(card).toBeVisible({ timeout: 15_000 })
    await expect(card).toContainText("45 min")

    await card.locator(`[data-testid^="meeting-card-delete--"]`).click()
    await expect(card).toBeHidden({ timeout: 15_000 })
  })

  test("Add Meeting persists a quarter-hour time chosen from selects", async ({ page }) => {
    const panel = await openSeedPropertyPanel(page)
    await panel.getByLabel("Add meeting").click()

    const dialog = page.getByTestId("add-meeting-dialog")
    await expect(dialog).toBeVisible()

    const meetingTitle = `E2E Quarter Hour Time ${Date.now()}`
    await dialog.getByTestId("meeting-title-input").fill(meetingTitle)
    await dialog.getByTestId("meeting-date-input").fill("2026-11-02")
    await pickQuarterHourTime(page, dialog, "meeting-time-hour-select", "meeting-time-minute-select", "09:15")
    await dialog.getByTestId("meeting-duration-input").fill("60")

    await dialog.getByTestId("meeting-submit-btn").click()
    await expect(dialog).toBeHidden({ timeout: 15_000 })
    await waitForPanelLoad(panel)

    const meetingsSection = panel.getByTestId("meetings-section")
    const card = meetingsSection.locator(`[data-testid^="meeting-card--"]`).filter({ hasText: meetingTitle })
    await expect(card).toBeVisible({ timeout: 15_000 })

    const mins = await brisbaneMinutesFromMidnightFromCard(card)
    expect(mins).toBe(9 * 60 + 15)

    await card.locator(`[data-testid^="meeting-card-delete--"]`).click()
    await expect(card).toBeHidden({ timeout: 15_000 })
  })

  test("Add Reminder persists optional quarter-hour time from selects", async ({ page }) => {
    const panel = await openSeedPropertyPanel(page)
    await panel.getByLabel("Add reminder").click()

    const dialog = page.getByTestId("add-reminder-dialog")
    await expect(dialog).toBeVisible()

    const title = `E2E Reminder Time Snap ${Date.now()}`
    await dialog.getByTestId("reminder-title-input").fill(title)
    await dialog.getByTestId("reminder-date-input").fill("2026-11-03")
    await pickQuarterHourTime(page, dialog, "reminder-time-hour-select", "reminder-time-minute-select", "14:30")

    await dialog.getByTestId("reminder-submit-btn").click()
    await expect(dialog).toBeHidden({ timeout: 15_000 })
    await waitForPanelLoad(panel)

    const remindersSection = panel.getByTestId("reminders-section")
    const card = remindersSection.locator(`[data-testid^="meeting-card--"]`).filter({ hasText: title })
    await expect(card).toBeVisible({ timeout: 15_000 })

    const mins = await brisbaneMinutesFromMidnightFromCard(card)
    expect(mins).toBe(14 * 60 + 30)

    await card.locator(`[data-testid^="meeting-card-delete--"]`).click()
    await expect(card).toBeHidden({ timeout: 15_000 })
  })
})
