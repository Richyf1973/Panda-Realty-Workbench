import { expect, test } from "@playwright/test"

import {
  e2eAdminCredentials,
  e2ePandaAdminListApiConfigured,
  signInAsAdmin,
} from "./helpers/admin-auth"

test.describe("Panda Realty admin — lead sources", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")
    test.skip(
      !e2ePandaAdminListApiConfigured,
      "DATABASE_URL not set — admin list uses live APIs (see apps/panda-realty/.env.example)",
    )
    await signInAsAdmin(page)
  })

  test("lead sources admin page loads", async ({ page }) => {
    await page.goto("/admin/lead-sources")
    await expect(page.getByTestId("admin-entity-page")).toBeVisible()
    await expect(
      page.getByTestId("admin-entity-list-card--lead-sources"),
    ).toBeVisible()
  })
})
