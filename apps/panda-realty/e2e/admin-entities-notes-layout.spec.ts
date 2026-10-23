import { expect, test } from "@playwright/test"

import {
  e2eAdminCredentials,
  e2ePandaAdminListApiConfigured,
  signInAsAdmin,
} from "./helpers/admin-auth"

test.describe("Edit Buyer dialog — notes removed from main form", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")
    test.skip(
      !e2ePandaAdminListApiConfigured,
      "DATABASE_URL not set — admin list uses live APIs (see apps/panda-realty/.env.example)",
    )

    await page.route("**/api/admin/entity-members**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: [] }),
      })
    })

    await signInAsAdmin(page)
  })

  async function openFirstBuyerEditDialog(page: Parameters<typeof signInAsAdmin>[0]) {
    await page.goto(
      "/admin/entities?limit=25&page=1&sortKey=entityName&sortDir=asc&entityCategoryId=1&listLayout=grid",
    )
    await page.waitForLoadState("networkidle")

    await page.getByTestId(/^admin-entity-row-edit--entities--/).first().click()
    await expect(page.getByTestId("admin-entity-crud-dialog--entities")).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.getByTestId("panda-entities-dialog-form")).toBeVisible()
  }

  test("buyer edit dialog does not render the Notes field in the main form", async ({ page }) => {
    await openFirstBuyerEditDialog(page)

    await expect(page.getByTestId("panda-entities-form-field--notes")).toHaveCount(0)
  })

  test("Property Connections remains visible for buyer edit", async ({ page }) => {
    await openFirstBuyerEditDialog(page)

    const dialogForm = page.getByTestId("panda-entities-dialog-form")
    await dialogForm.evaluate((el) => el.scrollTo(0, el.scrollHeight))

    await expect(page.getByTestId("panda-entities-property-connections")).toBeVisible({
      timeout: 10_000,
    })
  })
})
