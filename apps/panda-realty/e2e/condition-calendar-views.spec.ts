/**
 * E2E: Condition Calendar — Day / Week / Month views + `from`/`to` Google fetch
 *
 * Success factors:
 * 1. Day view activates (`data-cal-view="day"` on `condition-calendar-rbc`) and shows the time-view shell (`.rbc-time-view` — same wrapper class as Week in react-big-calendar).
 * 2. Week view requests `GET /api/admin/calendar/google-events` with `from`/`to`
 *    spanning seven calendar days (exclusive end).
 * 3. Day view requests use `from`/`to` spanning one calendar day.
 * 4. After Week → Month, month grid (`.rbc-month-view`) is visible again.
 * 5. Day view choice persists across reload (same localStorage contract as Week).
 *
 * Requires: `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` + `DATABASE_URL` (live DB).
 */

import { differenceInCalendarDays } from "date-fns"
import { expect, test, type Page } from "@playwright/test"

import { signInAsAdmin } from "./helpers/admin-auth"
import { requirePandaLiveE2eEnv } from "./helpers/require-panda-live-e2e-env"

async function gotoCalendar(page: Page) {
  await page.goto("/admin/calendar")
  await page.waitForLoadState("networkidle")
  await expect(page.getByTestId("condition-calendar-page")).toBeVisible({
    timeout: 15_000,
  })
}

function parseFromTo(url: string): { from: Date; to: Date } | null {
  try {
    const u = new URL(url)
    const fromStr = u.searchParams.get("from")
    const toStr = u.searchParams.get("to")
    if (!fromStr || !toStr) return null
    const from = new Date(fromStr)
    const to = new Date(toStr)
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return null
    return { from, to }
  } catch {
    return null
  }
}

test.describe("Condition Calendar — views & Google range API", () => {
  test.beforeAll(() => {
    requirePandaLiveE2eEnv()
  })

  test.beforeEach(async ({ page }) => {
    await signInAsAdmin(page)
  })

  test("Day view shows day layout", async ({ page }) => {
    await gotoCalendar(page)
    const cal = page.getByTestId("condition-calendar-view")
    await cal.getByRole("button", { name: /^day$/i }).click()
    const wrap = page.getByTestId("condition-calendar-rbc")
    await expect(wrap).toHaveAttribute("data-cal-view", "day", { timeout: 15_000 })
    await expect(cal.locator(".rbc-time-view")).toBeVisible({ timeout: 10_000 })
  })

  test("Week view requests google-events with a 7-day from/to calendar span", async ({
    page,
  }) => {
    const urls: string[] = []
    page.on("request", (req) => {
      const u = req.url()
      if (u.includes("/api/admin/calendar/google-events")) urls.push(u)
    })

    await gotoCalendar(page)
    const cal = page.getByTestId("condition-calendar-view")
    await cal.getByRole("button", { name: /^week$/i }).click()
    await expect(cal.locator(".rbc-time-view")).toBeVisible({ timeout: 10_000 })

    await expect
      .poll(() =>
        urls.some((u) => {
          const r = parseFromTo(u)
          return r != null && differenceInCalendarDays(r.to, r.from) === 7
        }),
      { timeout: 10_000 })
      .toBe(true)
  })

  test("Day view requests google-events with a 1-day from/to calendar span", async ({
    page,
  }) => {
    const urls: string[] = []
    page.on("request", (req) => {
      const u = req.url()
      if (u.includes("/api/admin/calendar/google-events")) urls.push(u)
    })

    await gotoCalendar(page)
    const cal = page.getByTestId("condition-calendar-view")
    await cal.getByRole("button", { name: /^day$/i }).click()
    await expect(page.getByTestId("condition-calendar-rbc")).toHaveAttribute("data-cal-view", "day", {
      timeout: 15_000,
    })

    await expect
      .poll(() =>
        urls.some((u) => {
          const r = parseFromTo(u)
          return r != null && differenceInCalendarDays(r.to, r.from) === 1
        }),
      { timeout: 10_000 })
      .toBe(true)
  })

  test("switching Week → Month restores month grid", async ({ page }) => {
    await gotoCalendar(page)
    const cal = page.getByTestId("condition-calendar-view")
    await cal.getByRole("button", { name: /^week$/i }).click()
    await expect(cal.locator(".rbc-time-view")).toBeVisible({ timeout: 10_000 })
    await cal.getByRole("button", { name: /^month$/i }).click()
    await expect(cal.locator(".rbc-month-view")).toBeVisible({ timeout: 10_000 })
  })

  test("persists Day view across full page reload", async ({ page }) => {
    await gotoCalendar(page)
    const cal = page.getByTestId("condition-calendar-view")
    await cal.getByRole("button", { name: /^day$/i }).click()
    await expect(page.getByTestId("condition-calendar-rbc")).toHaveAttribute("data-cal-view", "day", {
      timeout: 15_000,
    })

    await page.reload()
    await page.waitForLoadState("networkidle")
    await expect(page.getByTestId("condition-calendar-view")).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId("condition-calendar-rbc")).toHaveAttribute("data-cal-view", "day", {
      timeout: 15_000,
    })
  })

  test("condition-calendar-rbc exposes data-cal-view for theming hooks", async ({ page }) => {
    await gotoCalendar(page)
    const wrap = page.getByTestId("condition-calendar-rbc")
    await expect(wrap).toBeVisible()
    await expect(wrap).toHaveAttribute("data-cal-view", "month")
    await wrap.getByRole("button", { name: /^week$/i }).click()
    await expect(wrap).toHaveAttribute("data-cal-view", "week")
  })
})
