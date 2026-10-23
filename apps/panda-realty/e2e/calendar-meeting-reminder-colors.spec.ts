/**
 * E2E: Calendar event color-coding — meetings vs reminders
 *
 * Success factors:
 * 1. A Google Calendar event with colorId "7" (Peacock) renders as teal-blue (#039be5) in the in-app calendar.
 * 2. A Google Calendar event with colorId "4" (Banana) renders as golden-yellow (#f6bf26) in the in-app calendar.
 * 3. A Google Calendar event with no colorId renders as the default blue (#2563eb) — unchanged fallback.
 * 4. When both a meeting (colorId "7") and a reminder (colorId "4") are visible at once, their colors are distinct.
 *
 * All tests intercept /api/admin/calendar/google-events — no live Google OAuth needed.
 */

import { expect, test, type Page } from "@playwright/test"

import { signInAsAdmin } from "./helpers/admin-auth"
import { requirePandaLiveE2eEnv } from "./helpers/require-panda-live-e2e-env"

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function gotoCalendarPage(page: Page) {
  await page.goto("/admin/calendar")
  await page.waitForLoadState("networkidle")
  await expect(page.getByTestId("condition-calendar-view")).toBeVisible({ timeout: 15_000 })
}

function eventDateForCurrentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-15`
}

/** Returns computed background-color of the first .rbc-event chip matching the given text. */
async function getEventChipBgColor(page: Page, title: string): Promise<string> {
  const view = page.getByTestId("condition-calendar-view")
  const chip = view.locator(".rbc-event").filter({ hasText: title })
  await expect(chip.first()).toBeVisible({ timeout: 10_000 })
  return chip.first().evaluate((el) => getComputedStyle(el).backgroundColor)
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe("Calendar event color-coding — meetings vs reminders", () => {
  test.beforeAll(() => {
    requirePandaLiveE2eEnv()
  })

  test.beforeEach(async ({ page }) => {
    await signInAsAdmin(page)
  })

  // ── 1. Meeting event (colorId "7") → Peacock blue #039be5 ─────────────────

  test("meeting event (colorId 7) renders as Peacock blue #039be5", async ({ page }) => {
    const eventDate = eventDateForCurrentMonth()

    await page.route("**/api/admin/calendar/google-events**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          connected: true,
          events: [
            {
              id: "e2e-meeting-1",
              summary: "E2E Meeting Event",
              start: eventDate,
              end: eventDate,
              allDay: true,
              colorId: "7",
            },
          ],
        }),
      })
    })

    await gotoCalendarPage(page)

    const bg = await getEventChipBgColor(page, "E2E Meeting Event")
    // #039be5 = rgb(3, 155, 229)
    expect(bg).toMatch(/rgb\(\s*3,\s*155,\s*229\s*\)/)
  })

  // ── 2. Reminder event (colorId "4") → Banana yellow #f6bf26 ──────────────

  test("reminder event (colorId 4) renders as Banana yellow #f6bf26", async ({ page }) => {
    const eventDate = eventDateForCurrentMonth()

    await page.route("**/api/admin/calendar/google-events**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          connected: true,
          events: [
            {
              id: "e2e-reminder-1",
              summary: "E2E Reminder Event",
              start: eventDate,
              end: eventDate,
              allDay: true,
              colorId: "4",
            },
          ],
        }),
      })
    })

    await gotoCalendarPage(page)

    const bg = await getEventChipBgColor(page, "E2E Reminder Event")
    // #f6bf26 = rgb(246, 191, 38)
    expect(bg).toMatch(/rgb\(\s*246,\s*191,\s*38\s*\)/)
  })

  // ── 3. Event without colorId falls back to default blue #2563eb ───────────

  test("event without colorId falls back to default blue #2563eb", async ({ page }) => {
    const eventDate = eventDateForCurrentMonth()

    await page.route("**/api/admin/calendar/google-events**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          connected: true,
          events: [
            {
              id: "e2e-no-color-1",
              summary: "E2E No Color Event",
              start: eventDate,
              end: eventDate,
              allDay: true,
              // no colorId
            },
          ],
        }),
      })
    })

    await gotoCalendarPage(page)

    const bg = await getEventChipBgColor(page, "E2E No Color Event")
    // #2563eb = rgb(37, 99, 235)
    expect(bg).toMatch(/rgb\(\s*37,\s*99,\s*235\s*\)/)
  })

  // ── 4. Meeting and reminder are visually distinct when both are visible ────

  test("meeting and reminder chips show distinct colors when both visible", async ({ page }) => {
    const eventDate = eventDateForCurrentMonth()

    await page.route("**/api/admin/calendar/google-events**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          connected: true,
          events: [
            {
              id: "e2e-meeting-2",
              summary: "E2E Meeting Chip",
              start: eventDate,
              end: eventDate,
              allDay: true,
              colorId: "7",
            },
            {
              id: "e2e-reminder-2",
              summary: "E2E Reminder Chip",
              start: eventDate,
              end: eventDate,
              allDay: true,
              colorId: "4",
            },
          ],
        }),
      })
    })

    await gotoCalendarPage(page)

    const meetingBg = await getEventChipBgColor(page, "E2E Meeting Chip")
    const reminderBg = await getEventChipBgColor(page, "E2E Reminder Chip")

    // The two types must use different colors
    expect(meetingBg).not.toBe(reminderBg)
    // Meeting = Peacock blue
    expect(meetingBg).toMatch(/rgb\(\s*3,\s*155,\s*229\s*\)/)
    // Reminder = Banana yellow
    expect(reminderBg).toMatch(/rgb\(\s*246,\s*191,\s*38\s*\)/)
  })
})
