import { expect, test } from "@playwright/test"

import {
  e2eAdminCredentials,
  e2ePandaAdminListApiConfigured,
  signInAsAdmin,
} from "./helpers/admin-auth"

test.describe("Buyer members — GET list (live API)", () => {
  test("entity-members list loads without 5xx in Edit Buyer dialog", async ({
    page,
  }) => {
    test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")
    test.skip(!e2ePandaAdminListApiConfigured, "DATABASE_URL not set")

    await signInAsAdmin(page)

    const listResponse = page.waitForResponse(
      (res) =>
        res.url().includes("/api/admin/entity-members") &&
        res.request().method() === "GET" &&
        res.url().includes("entityId="),
      { timeout: 45_000 },
    )

    await page.goto(
      "/admin/entities?limit=25&page=1&sortKey=entityName&sortDir=asc&entityCategoryId=1&listLayout=grid",
    )
    await page.waitForLoadState("networkidle")

    await page.getByTestId(/^admin-entity-row-edit--entities--/).first().click()
    await expect(page.getByTestId("panda-entities-dialog-form")).toBeVisible({
      timeout: 20_000,
    })

    const res = await listResponse
    expect(res.status()).toBe(200)

    const section = page.getByTestId("panda-entities-buyer-tabs")
    await expect(section).toBeVisible({ timeout: 20_000 })
    await expect(section.getByText(/Failed to load members/)).toHaveCount(0)
  })
})
