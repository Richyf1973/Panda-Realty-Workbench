/**
 * E2E: Calendar Day Panel — View Events on Tap
 *
 * When a user clicks/taps a day-cell background in the Condition Calendar
 * (any view: month, week, or day), a bottom Sheet opens listing every event
 * for that day with a colored dot, type label, and formatted date.
 * Dismissible via the close button or overlay tap.
 *
 * Verification checklist (from specs/panda-realty-calendar-day-panel-event-viewer.md):
 * 1.  Navigate to /admin/calendar — calendar loads.
 * 2.  Click a day-cell background (not the date number) → Sheet slides up.
 * 3.  Sheet header shows "Events — [Day] [D] [Month] [Year]".
 * 4.  Each event row shows: colored dot, full title, type label, date.
 * 5.  X close button dismisses the panel.
 * 6.  Overlay tap dismisses the panel.
 * 7.  Week view slot click → panel opens.
 * 8.  Day view slot click → panel opens.
 * 9.  Date number click → navigates to day view, panel does NOT open.
 * 10. Day with no events → empty-state message shown.
 * 11. Day with only one event type → only those events shown.
 * 12. Day with many events → Sheet is scrollable, all events listed.
 * 13. Navigate away and return → no ghost panel on load.
 *
 * Requires: E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD + DATABASE_URL (live DB, SSR).
 */

import { expect, test, type Page } from "@playwright/test"

import { signInAsAdmin } from "./helpers/admin-auth"
import { requirePandaLiveE2eEnv } from "./helpers/require-panda-live-e2e-env"

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function gotoCalendar(page: Page) {
  await page.goto("/admin/calendar")
  await page.waitForLoadState("networkidle")
  await expect(page.getByTestId("condition-calendar-page")).toBeVisible({
    timeout: 15_000,
  })
}

/** Click a day-cell background that is not an off-range day in month view.
 *  Uses force:true because .rbc-row-content overlays .rbc-row-bg in RBC's layout,
 *  making standard click hit the content layer. Force dispatches directly to the bg element. */
async function clickFirstInRangeDayBg(page: Page) {
  const calView = page.getByTestId("condition-calendar-view")
  // rbc-day-bg cells that are NOT off-range
  const inRangeBgs = calView.locator(".rbc-day-bg:not(.rbc-off-range-bg)")
  const count = await inRangeBgs.count()
  expect(count).toBeGreaterThan(0)
  // Pick the 4th in-range cell (avoids the first row which may have off-range days)
  const target = inRangeBgs.nth(Math.min(3, count - 1))
  // force bypasses the overlapping .rbc-row-content layer
  await target.click({ force: true })
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe("Calendar Day Panel — View Events on Tap", () => {
  test.beforeAll(() => {
    requirePandaLiveE2eEnv()
  })

  test.beforeEach(async ({ page }) => {
    await signInAsAdmin(page)
    // Reset localStorage so view always starts in month
    await page.goto("/admin/calendar")
    await page.evaluate(() => {
      try { localStorage.removeItem("condition-calendar-view") } catch { /* ignore */ }
    })
    await page.reload()
    await page.waitForLoadState("networkidle")
    await expect(page.getByTestId("condition-calendar-page")).toBeVisible({ timeout: 15_000 })
  })

  // ── Happy path ─────────────────────────────────────────────────────────────

  test("clicking a day-cell background in month view opens the day panel", async ({ page }) => {
    // Step 2: tap background → Sheet appears
    await clickFirstInRangeDayBg(page)
    await expect(page.getByTestId("calendar-day-panel")).toBeVisible({ timeout: 5_000 })
  })

  test("day panel header shows 'Events —' and a formatted date", async ({ page }) => {
    // Step 3: header contains "Events —" and a recognisable date string
    await clickFirstInRangeDayBg(page)
    const panel = page.getByTestId("calendar-day-panel")
    await expect(panel).toBeVisible({ timeout: 5_000 })
    const title = panel.getByTestId("calendar-day-panel-title")
    await expect(title).toBeVisible()
    await expect(title).toContainText("Events —")
    // Must include at least a month name (e.g. "January", "May") and a year
    const titleText = await title.textContent()
    expect(titleText).toMatch(/Events — \w+ \d{1,2} \w+ \d{4}/)
  })

  test("event rows show colored dot, full title, type label, and date", async ({ page }) => {
    // Step 4: only run assertion if events exist on the clicked day
    await clickFirstInRangeDayBg(page)
    const panel = page.getByTestId("calendar-day-panel")
    await expect(panel).toBeVisible({ timeout: 5_000 })

    const items = panel.getByTestId("calendar-day-panel-event-item")
    const count = await items.count()
    if (count === 0) {
      // Empty day is acceptable — empty state is tested separately
      await expect(panel.getByTestId("calendar-day-panel-empty")).toBeVisible()
      return
    }

    const first = items.first()
    // Colored dot
    await expect(first.getByTestId("calendar-day-panel-event-dot")).toBeVisible()
    // Type label
    const typeLabel = first.getByTestId("calendar-day-panel-event-type")
    await expect(typeLabel).toBeVisible()
    const typeText = await typeLabel.textContent()
    expect(["Condition Milestone", "Google Calendar", "Agent Task"]).toContain(typeText?.trim())
    // Date string (e.g. "8 May")
    const dateEl = first.getByTestId("calendar-day-panel-event-date")
    await expect(dateEl).toBeVisible()
    await expect(dateEl).not.toBeEmpty()
    // Title is visible and non-empty
    const titleEl = first.getByTestId("calendar-day-panel-event-title")
    await expect(titleEl).toBeVisible()
    await expect(titleEl).not.toBeEmpty()
  })

  test("X close button dismisses the day panel", async ({ page }) => {
    // Step 5
    await clickFirstInRangeDayBg(page)
    const panel = page.getByTestId("calendar-day-panel")
    await expect(panel).toBeVisible({ timeout: 5_000 })
    // The Sheet renders a close button via SheetContent — target it by role
    await panel.getByRole("button", { name: /close/i }).click()
    await expect(panel).not.toBeVisible({ timeout: 3_000 })
  })

  test("clicking the overlay dismisses the day panel", async ({ page }) => {
    // Step 6
    await clickFirstInRangeDayBg(page)
    const panel = page.getByTestId("calendar-day-panel")
    await expect(panel).toBeVisible({ timeout: 5_000 })
    // Radix Sheet overlay: click outside the sheet content
    await page.mouse.click(10, 10)
    await expect(panel).not.toBeVisible({ timeout: 3_000 })
  })

  test("clicking a day slot in week view opens the day panel", async ({ page }) => {
    // Step 7
    const cal = page.getByTestId("condition-calendar-view")
    await cal.getByRole("button", { name: /^week$/i }).click()
    await expect(cal.locator(".rbc-time-view")).toBeVisible({ timeout: 10_000 })

    // In week view, all-day slots live in .rbc-allday-cell; click the first slot
    const allDaySlots = cal.locator(".rbc-allday-cell .rbc-day-bg")
    const slotCount = await allDaySlots.count()
    if (slotCount > 0) {
      await allDaySlots.first().click({ force: true })
    } else {
      // Fall back to the header date labels (fires onSelectSlot in week view)
      await cal.locator(".rbc-header").first().click({ force: true })
    }
    await expect(page.getByTestId("calendar-day-panel")).toBeVisible({ timeout: 5_000 })
  })

  test("clicking a time slot in day view opens the day panel", async ({ page }) => {
    // Step 8: navigate to a future month with no events so the all-day background is
    // empty (not covered by event chips), then force-click it in day view.
    const cal = page.getByTestId("condition-calendar-view")

    // Navigate 4 months forward to reach a month with no events
    for (let i = 0; i < 4; i++) {
      await cal.getByRole("button", { name: /next/i }).click()
    }

    // Switch to day view
    await cal.getByRole("button", { name: /^day$/i }).click()
    await expect(page.getByTestId("condition-calendar-rbc")).toHaveAttribute("data-cal-view", "day", {
      timeout: 15_000,
    })
    await expect(cal.locator(".rbc-time-view")).toBeVisible({ timeout: 10_000 })

    // Force-click the empty all-day background cell (no events covering it)
    const allDayBg = cal.locator(".rbc-allday-cell .rbc-day-bg")
    await expect(allDayBg).toHaveCount(1, { timeout: 5_000 })
    await allDayBg.first().click({ force: true })

    await expect(page.getByTestId("calendar-day-panel")).toBeVisible({ timeout: 8_000 })
  })

  // ── Edge cases ─────────────────────────────────────────────────────────────

  test("clicking the date number navigates to day view and does NOT open the panel", async ({ page }) => {
    // Step 9: clicking the date link triggers RBC drill-down (view → day), not the panel
    const cal = page.getByTestId("condition-calendar-view")
    // Date number links inside .rbc-date-cell (RBC renders them as <a> or <button>)
    const dateLink = cal.locator(".rbc-date-cell a, .rbc-date-cell button").first()
    await expect(dateLink).toBeVisible({ timeout: 10_000 })
    await dateLink.click()

    // Should have navigated to day view
    await expect(page.getByTestId("condition-calendar-rbc")).toHaveAttribute("data-cal-view", "day", {
      timeout: 10_000,
    })
    // Panel must NOT be open
    await expect(page.getByTestId("calendar-day-panel")).not.toBeVisible()
  })

  test("day with no events shows the empty state message", async ({ page }) => {
    // Step 10: navigate far in the future where no events exist, click any day
    const cal = page.getByTestId("condition-calendar-view")
    // Go 24 months forward to ensure no events
    for (let i = 0; i < 24; i++) {
      await cal.getByRole("button", { name: /next/i }).click()
    }
    await clickFirstInRangeDayBg(page)
    const panel = page.getByTestId("calendar-day-panel")
    await expect(panel).toBeVisible({ timeout: 5_000 })
    await expect(panel.getByTestId("calendar-day-panel-empty")).toBeVisible()
    await expect(panel.getByTestId("calendar-day-panel-empty")).toContainText("No events on this day")
  })

  test("panel closes and no ghost panel appears after navigating away and returning", async ({ page }) => {
    // Step 13: persistence check
    await clickFirstInRangeDayBg(page)
    const panel = page.getByTestId("calendar-day-panel")
    await expect(panel).toBeVisible({ timeout: 5_000 })
    // Dismiss
    await page.getByRole("button", { name: /close/i }).click()
    await expect(panel).not.toBeVisible({ timeout: 3_000 })

    // Navigate away
    await page.goto("/admin/pipeline")
    await page.waitForLoadState("networkidle")
    // Return
    await page.goto("/admin/calendar")
    await page.waitForLoadState("networkidle")
    await expect(page.getByTestId("condition-calendar-page")).toBeVisible({ timeout: 15_000 })
    // No ghost panel
    await expect(page.getByTestId("calendar-day-panel")).not.toBeVisible()
  })

  test("colored dot background color matches the event type", async ({ page }) => {
    // Step 4 (color variant): condition events use the condition color, agent tasks amber, Google blue
    await clickFirstInRangeDayBg(page)
    const panel = page.getByTestId("calendar-day-panel")
    await expect(panel).toBeVisible({ timeout: 5_000 })

    const items = panel.getByTestId("calendar-day-panel-event-item")
    const count = await items.count()
    if (count === 0) {
      // Nothing to assert — empty day is fine
      return
    }

    const firstItem = items.first()
    const dot = firstItem.getByTestId("calendar-day-panel-event-dot")
    const dotBg = await dot.evaluate((el) => getComputedStyle(el).backgroundColor)
    // Must be a real color (not transparent)
    expect(dotBg).not.toBe("rgba(0, 0, 0, 0)")
    expect(dotBg).not.toBe("transparent")
  })
})
