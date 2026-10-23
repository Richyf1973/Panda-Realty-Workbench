import { expect, test } from "@playwright/test"

import {
  e2eAdminCredentials,
  e2ePandaAdminListApiConfigured,
  signInAsAdmin,
} from "./helpers/admin-auth"

test.describe("Panda Realty admin — entities", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")
    test.skip(
      !e2ePandaAdminListApiConfigured,
      "DATABASE_URL not set — admin list uses live APIs (see apps/panda-realty/.env.example)",
    )
    await signInAsAdmin(page)
  })

  test("entities admin page loads", async ({ page }) => {
    await page.goto("/admin/entities")
    await expect(page.getByTestId("admin-entity-page")).toBeVisible()
    await expect(page.getByTestId("admin-entity-list-card--entities")).toBeVisible()
  })

  test("entities list can switch between grid and table layout", async ({ page }) => {
    await page.goto("/admin/entities")
    await expect(page.getByTestId("admin-entity-list-layout-grid--entities")).toBeVisible()
    await expect(page.getByTestId("admin-entity-grid--entities")).toBeVisible()

    await page.getByTestId("admin-entity-list-layout-table--entities").click()
    await expect(page.getByTestId("admin-entity-table-scroll--entities")).toBeVisible()

    await page.getByTestId("admin-entity-list-layout-grid--entities").click()
    await expect(page.getByTestId("admin-entity-grid--entities")).toBeVisible()
  })

  test("buyer entity form shows Enquiry Name and meeting toolbar row", async ({ page }) => {
    await page.goto(
      "/admin/entities?limit=25&page=1&sortKey=entityName&sortDir=asc&entityCategoryId=1&listLayout=grid",
    )
    await page.waitForLoadState("networkidle")

    await page.getByTestId(/^admin-entity-row-edit--entities--/).first().click()
    await expect(page.getByTestId("admin-entity-crud-dialog--entities")).toBeVisible()

    await expect(
      page.getByRole("textbox", { name: /enquiry name/i }),
    ).toBeVisible()
    await expect(page.getByTestId("panda-entities-buyer-meeting-reminder-toolbar")).toBeVisible()
  })
})
