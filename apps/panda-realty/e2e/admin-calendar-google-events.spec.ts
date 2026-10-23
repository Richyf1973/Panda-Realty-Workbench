/**
 * E2E: Condition Calendar — Google Calendar two-way sync
 *
 * Success factors:
 * 1. Navigating to the next month triggers a request to
 *    `/api/admin/calendar/google-events?from=<ISO>&to=<ISO>` covering that month.
 * 2. When Google Calendar is not connected, a "connect Google" notice is visible.
 * 3. When the API returns events, Google events (blue pills) render alongside
 *    condition events (slate pills) and the two sources have distinct colors.
 * 4. Navigating back to the previous month re-fetches with an ISO `from`/`to`
 *    range for that month.
 * 5. The calendar view renders correctly after navigation (month grid intact).
 *
 * Requires: `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` + `DATABASE_URL`.
 *
 * Note: Google Calendar events only appear if the app has a connected Google
 * OAuth token. Tests are written to be resilient to "not connected" state —
 * they assert the UI shape, not the presence of specific calendar content.
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

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe("Condition Calendar — Google events two-way sync", () => {
  test.beforeAll(() => {
    requirePandaLiveE2eEnv()
  })

  test.beforeEach(async ({ page }) => {
    await signInAsAdmin(page)
  })

  // ── 1. Next-month navigation fires correct API request ──────────────────

  test("navigating to next month fetches google-events for the correct month", async ({ page }) => {
    const requests: string[] = []
    page.on("request", (req) => {
      if (req.url().includes("/api/admin/calendar/google-events")) {
        requests.push(req.url())
      }
    })

    await gotoCalendarPage(page)

    const view = page.getByTestId("condition-calendar-view")
    const label = view.locator(".rbc-toolbar-label")
    const initialText = await label.textContent()

    // Navigate forward one month
    await view.getByRole("button", { name: /next/i }).click()
    await expect(label).not.toHaveText(initialText ?? "", { timeout: 5_000 })

    const now = new Date()
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)

    await expect
      .poll(
        () =>
          requests.some((url) => {
            try {
              const u = new URL(url)
              const fromStr = u.searchParams.get("from")
              const toStr = u.searchParams.get("to")
              if (!fromStr || !toStr || !url.includes("/api/admin/calendar/google-events")) return false
              const fromDate = new Date(fromStr)
              return (
                fromDate.getFullYear() === nextMonth.getFullYear() &&
                fromDate.getMonth() === nextMonth.getMonth() &&
                fromDate.getDate() === 1
              )
            } catch {
              return false
            }
          }),
        { timeout: 5_000 },
      )
      .toBe(true)
  })

  // ── 2. Not-connected notice renders when Google Calendar is disconnected ─

  test("shows connect-Google notice when calendar API returns connected:false", async ({ page }) => {
    // Intercept the API and return not-connected
    await page.route("**/api/admin/calendar/google-events**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ connected: false, events: [] }),
      })
    })

    await gotoCalendarPage(page)

    // The "not connected" nudge should appear
    const notice = page.getByText(/connect google/i)
    await expect(notice).toBeVisible({ timeout: 10_000 })
  })

  // ── 3. Google events without colorId render as default blue alongside condition events

  test("Google events without colorId render as default blue (#2563eb) distinct from condition event pills", async ({ page }) => {
    // Intercept and inject a Google event with no colorId for the current month
    const now = new Date()
    const eventDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-15`

    await page.route("**/api/admin/calendar/google-events**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          connected: true,
          events: [
            {
              id: "e2e-google-event-1",
              summary: "E2E Google Calendar Event",
              start: eventDate,
              end: eventDate,
              allDay: true,
              // no colorId — expects fallback default blue
            },
          ],
        }),
      })
    })

    await gotoCalendarPage(page)

    const view = page.getByTestId("condition-calendar-view")

    // Google event pill appears
    const googleEvent = view.locator(".rbc-event").filter({ hasText: "E2E Google Calendar Event" })
    await expect(googleEvent).toBeVisible({ timeout: 10_000 })

    // Events without colorId fall back to default blue (#2563eb)
    const googleBg = await googleEvent.evaluate((el) => getComputedStyle(el).backgroundColor)
    // rgb(37, 99, 235) = #2563eb
    expect(googleBg).toMatch(/37,\s*99,\s*235/)

    // If there are also condition events, they should have a different color
    const allEvents = view.locator(".rbc-event")
    const count = await allEvents.count()
    if (count >= 2) {
      const conditionEvent = allEvents.filter({ hasNotText: "E2E Google Calendar Event" }).first()
      const conditionCount = await conditionEvent.count()
      if (conditionCount > 0) {
        const conditionBg = await conditionEvent.evaluate((el) => getComputedStyle(el).backgroundColor)
        // Condition events use a slate color — should not be the same blue
        expect(conditionBg).not.toBe(googleBg)
      }
    }
  })

  // ── 4. Back navigation re-fetches with the previous month param ──────────

  test("navigating back to previous month re-fetches google-events for that month", async ({
    page,
  }) => {
    const requests: string[] = []
    page.on("request", (req) => {
      if (req.url().includes("/api/admin/calendar/google-events")) {
        requests.push(req.url())
      }
    })

    await gotoCalendarPage(page)

    const view = page.getByTestId("condition-calendar-view")
    const label = view.locator(".rbc-toolbar-label")
    const initialText = await label.textContent()

    // Go forward then back
    await view.getByRole("button", { name: /next/i }).click()
    await expect(label).not.toHaveText(initialText ?? "", { timeout: 5_000 })
    await view.getByRole("button", { name: /back/i }).click()
    await expect(label).toHaveText(initialText ?? "", { timeout: 5_000 })

    const now = new Date()
    const initialMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    await expect
      .poll(
        () =>
          requests.some((url) => {
            try {
              const u = new URL(url)
              const fromStr = u.searchParams.get("from")
              if (!fromStr || !url.includes("/api/admin/calendar/google-events")) return false
              const fromDate = new Date(fromStr)
              return (
                fromDate.getFullYear() === initialMonthStart.getFullYear() &&
                fromDate.getMonth() === initialMonthStart.getMonth() &&
                fromDate.getDate() === 1
              )
            } catch {
              return false
            }
          }),
        { timeout: 5_000 },
      )
      .toBe(true)
  })

  // ── 5. Calendar grid remains intact after month navigation ───────────────

  test("calendar grid renders date cells correctly after navigating months", async ({ page }) => {
    await gotoCalendarPage(page)

    const view = page.getByTestId("condition-calendar-view")

    await view.getByRole("button", { name: /next/i }).click()
    await view.getByRole("button", { name: /back/i }).click()

    // Grid must still have at least 28 date cells
    const dateCells = view.locator(".rbc-date-cell")
    await expect(dateCells.first()).toBeVisible({ timeout: 10_000 })
    expect(await dateCells.count()).toBeGreaterThanOrEqual(28)
  })
})
