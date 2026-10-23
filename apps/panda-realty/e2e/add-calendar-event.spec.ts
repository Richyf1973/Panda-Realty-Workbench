/**
 * E2E: Condition Calendar — Add Calendar Event dialog (unified meeting-style form)
 *
 * Success factors:
 * 1. "Add Calendar Event" button is visible when Google Calendar is connected; enabled.
 * 2. Button is disabled when Google Calendar is not connected.
 * 3. Dialog has: Title, Date, quarter-hour Time selects (Hour + Min), Duration, Notes, Reminders.
 *    No "All-day / Timed" radio toggle.
 * 4. Time selects: Min is disabled until Hour is chosen; only 00/15/30/45 in Min.
 * 5. Default 2 reminder rows pre-populated: 1 hour + 1 day (Notification).
 * 6. "Add notification" appends a row; "×" removes one.
 * 7. Submitting without choosing a Time shows an inline error ("Time is required").
 * 8. Submitting a valid timed form POSTs to /api/admin/calendar/events (with reminders),
 *    shows success message, and triggers a google-events refetch.
 * 9. Failed POST shows inline error; dialog stays open.
 * 10. Cancelling resets all fields and reminders to defaults on reopen.
 *
 * Google Calendar API calls are mocked — no live Google token required.
 * Requires: E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD + DATABASE_URL (for SSR page render).
 */

import { expect, test, type Page } from "@playwright/test"

import { signInAsAdmin } from "./helpers/admin-auth"
import { pickQuarterHourTime } from "./helpers/quarter-hour-time"
import { requirePandaLiveE2eEnv } from "./helpers/require-panda-live-e2e-env"

async function gotoCalendarPage(page: Page) {
  await page.goto("/admin/calendar")
  await page.waitForLoadState("networkidle")
  await expect(page.getByTestId("condition-calendar-view")).toBeVisible({ timeout: 15_000 })
}

function mockGoogleEventsConnected(page: Page, counter?: { count: number }) {
  return page.route("**/api/admin/calendar/google-events**", async (route) => {
    if (counter) counter.count++
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ connected: true, events: [] }),
    })
  })
}

test.describe("Add Calendar Event — unified meeting-style form", () => {
  test.beforeAll(() => {
    requirePandaLiveE2eEnv()
  })

  test.beforeEach(async ({ page }) => {
    await signInAsAdmin(page)
  })

  // ── 1. Button visible when connected ─────────────────────────────────────

  test("Add Calendar Event button is visible and enabled when connected", async ({ page }) => {
    await mockGoogleEventsConnected(page)
    await gotoCalendarPage(page)

    const button = page.getByTestId("add-calendar-event-button")
    await expect(button).toBeVisible()
    await expect(button).toBeEnabled()
  })

  // ── 2. Button disabled when not connected ─────────────────────────────────

  test("Add Calendar Event button is disabled when Google Calendar is not connected", async ({
    page,
  }) => {
    await page.route("**/api/admin/calendar/google-events**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ connected: false, events: [] }),
      })
    })

    await gotoCalendarPage(page)

    const button = page.getByTestId("add-calendar-event-button")
    await expect(button).toBeVisible()
    await expect(button).toBeDisabled()
  })

  // ── 3. Dialog fields — no toggle, has time selects + reminders ────────────

  test("dialog has Title, Date, quarter-hour Time selects, Duration, Notes, Reminders — no event-type toggle", async ({
    page,
  }) => {
    await mockGoogleEventsConnected(page)
    await gotoCalendarPage(page)
    await page.getByTestId("add-calendar-event-button").click()

    const dialog = page.getByTestId("add-calendar-event-dialog")
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole("heading", { name: "Add Calendar Event" })).toBeVisible()

    // Required fields
    await expect(dialog.getByTestId("add-calendar-event-title")).toBeVisible()
    await expect(dialog.getByTestId("add-calendar-event-date")).toBeVisible()

    // Quarter-hour time selects (no native time input)
    await expect(dialog.getByTestId("add-calendar-event-time-hour-select")).toBeVisible()
    await expect(dialog.getByTestId("add-calendar-event-time-minute-select")).toBeVisible()

    // Duration and notes
    await expect(dialog.getByTestId("add-calendar-event-duration")).toBeVisible()
    await expect(dialog.getByTestId("add-calendar-event-notes")).toBeVisible()

    // Reminders section
    await expect(dialog.getByText("Reminders")).toBeVisible()

    // Submit
    await expect(dialog.getByTestId("add-calendar-event-submit")).toBeVisible()

    // No all-day / timed toggle
    await expect(dialog.getByTestId("add-calendar-event-type-all-day")).toHaveCount(0)
    await expect(dialog.getByTestId("add-calendar-event-type-timed")).toHaveCount(0)
  })

  // ── 4. Time selects behaviour ─────────────────────────────────────────────

  test("Minute select is disabled until an Hour is chosen; only 00/15/30/45 available", async ({
    page,
  }) => {
    await mockGoogleEventsConnected(page)
    await gotoCalendarPage(page)
    await page.getByTestId("add-calendar-event-button").click()

    const dialog = page.getByTestId("add-calendar-event-dialog")
    await expect(dialog).toBeVisible()

    // Minute is disabled before hour is selected
    await expect(dialog.getByTestId("add-calendar-event-time-minute-select")).toBeDisabled()

    // Pick an hour
    await dialog.getByTestId("add-calendar-event-time-hour-select").click()
    await page.getByRole("option", { name: "10", exact: true }).click()

    // Minute becomes enabled; open it and check only quarter values exist
    await expect(dialog.getByTestId("add-calendar-event-time-minute-select")).toBeEnabled()
    await dialog.getByTestId("add-calendar-event-time-minute-select").click()
    await expect(page.getByRole("option", { name: "00", exact: true })).toBeVisible()
    await expect(page.getByRole("option", { name: "15", exact: true })).toBeVisible()
    await expect(page.getByRole("option", { name: "30", exact: true })).toBeVisible()
    await expect(page.getByRole("option", { name: "45", exact: true })).toBeVisible()
    // Close the dropdown
    await page.keyboard.press("Escape")
  })

  // ── 5. Default reminder rows ──────────────────────────────────────────────

  test("dialog pre-populates 2 reminder rows: 1 hour + 1 day (Notification)", async ({
    page,
  }) => {
    await mockGoogleEventsConnected(page)
    await gotoCalendarPage(page)
    await page.getByTestId("add-calendar-event-button").click()

    const dialog = page.getByTestId("add-calendar-event-dialog")
    await expect(dialog).toBeVisible()

    const rows = dialog.locator('[data-testid="reminder-row"]')
    await expect(rows).toHaveCount(2)

    const row0 = rows.nth(0)
    await expect(row0.locator('[data-testid="reminder-method-select"]')).toContainText("Notification")
    await expect(row0.locator('[data-testid="reminder-value-input"]')).toHaveValue("1")
    await expect(row0.locator('[data-testid="reminder-unit-select"]')).toContainText("hours")

    const row1 = rows.nth(1)
    await expect(row1.locator('[data-testid="reminder-method-select"]')).toContainText("Notification")
    await expect(row1.locator('[data-testid="reminder-value-input"]')).toHaveValue("1")
    await expect(row1.locator('[data-testid="reminder-unit-select"]')).toContainText("days")

    await dialog.getByRole("button", { name: "Cancel" }).click()
    await expect(dialog).toBeHidden({ timeout: 5_000 })
  })

  // ── 6. Add / remove reminder rows ─────────────────────────────────────────

  test("Add notification appends a row; × removes one", async ({ page }) => {
    await mockGoogleEventsConnected(page)
    await gotoCalendarPage(page)
    await page.getByTestId("add-calendar-event-button").click()

    const dialog = page.getByTestId("add-calendar-event-dialog")
    await expect(dialog).toBeVisible()

    const rows = dialog.locator('[data-testid="reminder-row"]')
    await expect(rows).toHaveCount(2)

    await dialog.getByRole("button", { name: "Add notification" }).click()
    await expect(rows).toHaveCount(3)

    await rows.nth(0).locator('[data-testid="reminder-remove-btn"]').click()
    await expect(rows).toHaveCount(2)

    await dialog.getByRole("button", { name: "Cancel" }).click()
    await expect(dialog).toBeHidden({ timeout: 5_000 })
  })

  // ── 7. Missing time shows error ───────────────────────────────────────────

  test("submitting without setting Time shows an inline error", async ({ page }) => {
    await mockGoogleEventsConnected(page)
    await page.route("**/api/admin/calendar/events", async (route) => {
      await route.continue()
    })

    await gotoCalendarPage(page)
    await page.getByTestId("add-calendar-event-button").click()

    const dialog = page.getByTestId("add-calendar-event-dialog")
    await expect(dialog).toBeVisible()

    await dialog.getByTestId("add-calendar-event-title").fill("No Time Event")
    await dialog.getByTestId("add-calendar-event-date").fill("2026-06-15")
    // Deliberately skip time selection
    await dialog.getByTestId("add-calendar-event-submit").click()

    await expect(dialog.getByTestId("add-calendar-event-error")).toBeVisible({ timeout: 5_000 })
    await expect(dialog.getByTestId("add-calendar-event-error")).toContainText("Time is required")
    await expect(dialog).toBeVisible()
  })

  // ── 8. Successful timed submission ────────────────────────────────────────

  test("valid timed form with reminders shows success and refetches google events", async ({
    page,
  }) => {
    const counter = { count: 0 }
    await mockGoogleEventsConnected(page, counter)

    let postedBody: unknown
    await page.route("**/api/admin/calendar/events", async (route) => {
      if (route.request().method() === "POST") {
        postedBody = await route.request().postDataJSON()
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ id: "mock-event-id-1" }),
        })
      } else {
        await route.continue()
      }
    })

    await gotoCalendarPage(page)
    const initialCount = counter.count

    await page.getByTestId("add-calendar-event-button").click()
    const dialog = page.getByTestId("add-calendar-event-dialog")
    await expect(dialog).toBeVisible()

    await dialog.getByTestId("add-calendar-event-title").fill("E2E Timed Event")
    await dialog.getByTestId("add-calendar-event-date").fill("2026-06-15")
    await pickQuarterHourTime(
      page,
      dialog,
      "add-calendar-event-time-hour-select",
      "add-calendar-event-time-minute-select",
      "10:30",
    )
    await dialog.getByTestId("add-calendar-event-submit").click()

    await expect(dialog.getByTestId("add-calendar-event-success")).toBeVisible({ timeout: 5_000 })
    await expect(dialog.getByTestId("add-calendar-event-success")).toContainText("Event created")

    // Calendar should have refetched google events
    await expect
      .poll(() => counter.count, { timeout: 5_000 })
      .toBeGreaterThan(initialCount)

    // POST body should include reminders
    expect((postedBody as Record<string, unknown>).reminders).toBeDefined()
  })

  // ── 9. Failed POST shows inline error ─────────────────────────────────────

  test("failed POST shows inline error in dialog; dialog stays open", async ({ page }) => {
    await mockGoogleEventsConnected(page)
    await page.route("**/api/admin/calendar/events", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "Google Calendar API error" }),
        })
      } else {
        await route.continue()
      }
    })

    await gotoCalendarPage(page)
    await page.getByTestId("add-calendar-event-button").click()

    const dialog = page.getByTestId("add-calendar-event-dialog")
    await expect(dialog).toBeVisible()

    await dialog.getByTestId("add-calendar-event-title").fill("Error Test Event")
    await dialog.getByTestId("add-calendar-event-date").fill("2026-06-15")
    await pickQuarterHourTime(
      page,
      dialog,
      "add-calendar-event-time-hour-select",
      "add-calendar-event-time-minute-select",
      "09:00",
    )
    await dialog.getByTestId("add-calendar-event-submit").click()

    await expect(dialog.getByTestId("add-calendar-event-error")).toBeVisible({ timeout: 5_000 })
    await expect(dialog.getByTestId("add-calendar-event-error")).toContainText(
      "Google Calendar API error",
    )
    await expect(dialog).toBeVisible()
  })

  // ── 10. Cancel resets state ───────────────────────────────────────────────

  test("cancelling resets fields and reminders to defaults on reopen", async ({ page }) => {
    await mockGoogleEventsConnected(page)
    await gotoCalendarPage(page)
    await page.getByTestId("add-calendar-event-button").click()

    const dialog = page.getByTestId("add-calendar-event-dialog")
    await expect(dialog).toBeVisible()

    // Modify state
    await dialog.getByTestId("add-calendar-event-title").fill("Should be cleared")
    await dialog.getByRole("button", { name: "Add notification" }).click()
    await expect(dialog.locator('[data-testid="reminder-row"]')).toHaveCount(3)

    // Cancel
    await dialog.getByRole("button", { name: "Cancel" }).click()
    await expect(dialog).toBeHidden({ timeout: 5_000 })

    // Reopen
    await page.getByTestId("add-calendar-event-button").click()
    await expect(dialog).toBeVisible()

    // Title cleared
    await expect(dialog.getByTestId("add-calendar-event-title")).toHaveValue("")
    // Reminders back to 2 defaults
    await expect(dialog.locator('[data-testid="reminder-row"]')).toHaveCount(2)
  })
})
