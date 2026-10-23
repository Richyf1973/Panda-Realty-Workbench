/**
 * E2E: Condition Calendar page — /admin/calendar
 *
 * Success factors:
 * 1. Sidebar nav link "Calendar" is visible on any admin page.
 * 2. Clicking the sidebar nav link navigates to /admin/calendar.
 * 3. The page heading "Condition Calendar" is visible.
 * 4. The react-big-calendar month-view widget renders (toolbar + day headers).
 * 5. The toolbar shows prev / next / today buttons and a month-year label.
 * 6. The calendar renders without error when there are no events (empty state is
 *    the empty grid, not a crash).
 * 7. When favourite properties with accepted offers + contract dates exist in the
 *    DB, event pills appear inside the calendar grid; labels never include Building &
 *    Pest or Due Diligence, and every visible pill shares the same background colour.
 *
 * Day / Week / Month view switcher, `from`/`to` API spans, and persistence: see
 * `e2e/condition-calendar-views.spec.ts`.
 *
 * Requires: E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD + DATABASE_URL (live DB, SSR).
 * Enforced via `requirePandaLiveE2eEnv()` (fails fast if unset).
 */

import { expect, test, type Page } from "@playwright/test"

import { signInAsAdmin } from "./helpers/admin-auth"
import { requirePandaLiveE2eEnv } from "./helpers/require-panda-live-e2e-env"

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function gotoCalendarPage(page: Page) {
  await page.goto("/admin/calendar")
  await page.waitForLoadState("networkidle")
  await expect(page.getByTestId("condition-calendar-page")).toBeVisible({
    timeout: 15_000,
  })
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe("Admin — Condition Calendar page", () => {
  test.beforeAll(() => {
    requirePandaLiveE2eEnv()
  })

  test.beforeEach(async ({ page }) => {
    await signInAsAdmin(page)
  })

  test("sidebar nav link is visible and navigates to /admin/calendar", async ({
    page,
  }) => {
    await page.goto("/admin/pipeline")
    await page.waitForLoadState("networkidle")

    const calendarLink = page.getByTestId("admin-layout-nav-link--calendar")
    await expect(calendarLink).toBeVisible({ timeout: 10_000 })
    await calendarLink.click()

    await page.waitForURL(/\/admin\/calendar/, { timeout: 15_000 })
    await expect(page.getByTestId("condition-calendar-page")).toBeVisible({
      timeout: 15_000,
    })
  })

  test("page heading is visible", async ({ page }) => {
    await gotoCalendarPage(page)
    await expect(
      page.getByRole("heading", { name: "Condition Calendar" }),
    ).toBeVisible()
  })

  test("calendar widget renders with month-view grid", async ({ page }) => {
    await gotoCalendarPage(page)

    const view = page.getByTestId("condition-calendar-view")
    await expect(view).toBeVisible()

    // react-big-calendar renders .rbc-calendar → .rbc-month-view
    const monthView = view.locator(".rbc-month-view")
    await expect(monthView).toBeVisible({ timeout: 10_000 })
  })

  test("toolbar renders with navigation buttons and month-year label", async ({
    page,
  }) => {
    await gotoCalendarPage(page)

    const view = page.getByTestId("condition-calendar-view")

    // Toolbar label (e.g. "April 2026")
    await expect(view.locator(".rbc-toolbar-label")).toBeVisible()
    await expect(view.locator(".rbc-toolbar-label")).not.toBeEmpty()

    // Navigation buttons: Today / Back / Next
    await expect(
      view.getByRole("button", { name: /today/i }),
    ).toBeVisible()
    await expect(
      view.getByRole("button", { name: /back/i }),
    ).toBeVisible()
    await expect(
      view.getByRole("button", { name: /next/i }),
    ).toBeVisible()
  })

  test("day-of-week column headers are rendered", async ({ page }) => {
    await gotoCalendarPage(page)

    const view = page.getByTestId("condition-calendar-view")
    // react-big-calendar renders 7 .rbc-header cells
    const headers = view.locator(".rbc-header")
    await expect(headers).toHaveCount(7)
  })

  test("calendar grid renders date cells without error", async ({ page }) => {
    await gotoCalendarPage(page)

    const view = page.getByTestId("condition-calendar-view")
    // At least one .rbc-date-cell means the month grid rendered rows
    const dateCells = view.locator(".rbc-date-cell")
    await expect(dateCells.first()).toBeVisible({ timeout: 10_000 })
    const count = await dateCells.count()
    // A month view always has at least 28 date cells
    expect(count).toBeGreaterThanOrEqual(28)
  })

  test("prev/next navigation changes the displayed month", async ({ page }) => {
    await gotoCalendarPage(page)

    const view = page.getByTestId("condition-calendar-view")
    const label = view.locator(".rbc-toolbar-label")

    const initialMonth = await label.textContent()

    await view.getByRole("button", { name: /next/i }).click()
    await expect(label).not.toHaveText(initialMonth ?? "", { timeout: 5_000 })

    const nextMonth = await label.textContent()
    await view.getByRole("button", { name: /back/i }).click()
    await expect(label).not.toHaveText(nextMonth ?? "", { timeout: 5_000 })
    await expect(label).toHaveText(initialMonth ?? "")
  })

  test("calendar renders correctly in dark mode (smoke)", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" })
    await gotoCalendarPage(page)

    const view = page.getByTestId("condition-calendar-view")
    await expect(view.locator(".rbc-month-view")).toBeVisible({ timeout: 10_000 })
    // Calendar must still have date cells — a dark-mode CSS regression would often cause
    // the container to collapse or cells to disappear
    const dateCells = view.locator(".rbc-date-cell")
    await expect(dateCells.first()).toBeVisible({ timeout: 10_000 })
    const count = await dateCells.count()
    expect(count).toBeGreaterThanOrEqual(28)
  })

  test("event pills appear when favourite properties have accepted offers with contract dates", async ({
    page,
  }) => {
    await gotoCalendarPage(page)

    const view = page.getByTestId("condition-calendar-view")

    // Count events currently visible in the month grid
    const events = view.locator(".rbc-event")
    const count = await events.count()

    if (count === 0) {
      // No events at all — acceptable, just assert the calendar rendered cleanly
      await expect(view.locator(".rbc-month-view")).toBeVisible()
      return
    }

    // Condition events use "label — address" format; Google Calendar events do not.
    // Filter to condition events only so Google events mixed in don't break assertions.
    const conditionEvents = view.locator(".rbc-event").filter({ hasText: /—/ })
    const conditionCount = await conditionEvents.count()

    if (conditionCount === 0) {
      // Only Google Calendar events visible this month (no favourite properties with
      // accepted offers + contract dates in the current month) — still clean.
      await expect(view.locator(".rbc-month-view")).toBeVisible()
      return
    }

    // Condition events render label text inside .rbc-event-content
    const firstEventContent = conditionEvents.first().locator(".rbc-event-content")
    await expect(firstEventContent).toBeVisible()
    const text = await firstEventContent.textContent()
    expect(text).toMatch(/—/)

    await expect(view.getByText(/Building\s*&\s*Pest/)).toHaveCount(0)
    await expect(view.getByText(/Due Diligence/)).toHaveCount(0)
    if (conditionCount >= 2) {
      const bg0 = await conditionEvents
        .nth(0)
        .evaluate((el) => getComputedStyle(el).backgroundColor)
      const bg1 = await conditionEvents
        .nth(1)
        .evaluate((el) => getComputedStyle(el).backgroundColor)
      expect(bg0).toBe(bg1)
    }
  })
})
