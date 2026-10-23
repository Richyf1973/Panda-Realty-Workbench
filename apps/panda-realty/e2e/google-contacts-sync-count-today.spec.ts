import { expect, test } from "@playwright/test"

import {
  e2eAdminCredentials,
  e2ePandaAdminListApiConfigured,
  signInAsAdmin,
} from "./helpers/admin-auth"

test.describe("Google Contacts sync count — today date range", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")
    test.skip(
      !e2ePandaAdminListApiConfigured,
      "DATABASE_URL not set — admin list uses live APIs",
    )
    await signInAsAdmin(page)
  })

  test("count endpoint returns valid shape for all date ranges", async ({ page }) => {
    test.setTimeout(90_000)
    for (const dateRange of ["today", "yesterday", "this-week", "last-30", "all"] as const) {
      const res = await page.request.get(
        `/api/admin/google-contacts/patch-all/count?dateRange=${dateRange}`,
      )
      expect(res.status(), `dateRange=${dateRange} should return 200`).toBe(200)
      const body = await res.json() as { count?: unknown }
      expect(typeof body.count, `dateRange=${dateRange} count must be a number`).toBe("number")
      expect(body.count as number, `dateRange=${dateRange} count must be >= 0`).toBeGreaterThanOrEqual(0)
    }
  })

  test("today count is >= 0 and all count is >= today count", async ({ page }) => {
    const todayRes = await page.request.get(
      "/api/admin/google-contacts/patch-all/count?dateRange=today",
    )
    expect(todayRes.status()).toBe(200)
    const todayBody = await todayRes.json() as { count: number }

    const allRes = await page.request.get(
      "/api/admin/google-contacts/patch-all/count?dateRange=all",
    )
    expect(allRes.status()).toBe(200)
    const allBody = await allRes.json() as { count: number }

    expect(todayBody.count).toBeGreaterThanOrEqual(0)
    expect(allBody.count).toBeGreaterThanOrEqual(todayBody.count)
  })

  test("properties page shows sync toolbar with date range select", async ({ page }) => {
    await page.goto("/admin/properties")
    // toolbar renders null until gmail status resolves — allow extra time
    await expect(page.getByTestId("lead-import-toolbar")).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId("lead-import-sync-date-range-select")).toBeVisible()
    await expect(page.getByTestId("lead-import-sync-contacts-button")).toBeVisible()
  })

  test("switching to 'All time' shows a non-zero contact preview count", async ({ page }) => {
    await page.goto("/admin/properties")
    await expect(page.getByTestId("lead-import-toolbar")).toBeVisible()

    // Switch to 'All time' so we're not filtering by recent activity
    const syncSelect = page.getByTestId("lead-import-sync-date-range-select")
    await syncSelect.click()
    await page.getByRole("option", { name: "All time" }).click()

    // Preview count label should appear and show > 0 contacts
    const previewLabel = page.locator('[data-testid="lead-import-toolbar"]').getByText(/contact.*will sync/i)
    await expect(previewLabel).toBeVisible({ timeout: 10_000 })
    const text = await previewLabel.textContent()
    const match = text?.match(/(\d+)\s+contact/)
    expect(match, "Preview count label should contain a number").toBeTruthy()
    const count = Number(match![1])
    expect(count, "All time should show at least 1 contact to sync").toBeGreaterThan(0)
  })
})
