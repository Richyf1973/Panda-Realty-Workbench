/**
 * Regression: Edit Buyer → Property Connections must load without GET 500.
 *
 * Root cause fixed in @repo/admin: `json_build_object` exceeded PostgreSQL’s 100-argument
 * limit when embedding wide `properties` rows on `property-entities` list queries.
 *
 * Requires: E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD + DATABASE_URL (live `GET /api/admin/*`).
 */

import { expect, test } from "@playwright/test"

import {
  requirePandaE2eAdminListLiveEnv,
  signInAsAdmin,
} from "./helpers/admin-auth"

test.describe("Edit Buyer — property-entities list (live GET)", () => {
  test.describe.configure({ timeout: 120_000 })

  test.beforeEach(async ({ page }) => {
    requirePandaE2eAdminListLiveEnv()
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

  test("GET /api/admin/property-entities?entityId=… returns 200 with items array", async ({
    page,
  }) => {
    const responsePromise = page.waitForResponse(
      (r) =>
        r.request().method() === "GET" &&
        r.url().includes("/api/admin/property-entities") &&
        r.url().includes("entityId="),
      { timeout: 60_000 },
    )

    await openFirstBuyerEditDialog(page)

    const res = await responsePromise
    expect(res.status(), `unexpected status for ${res.url()}`).toBe(200)
    const json = (await res.json()) as { items?: unknown[] }
    expect(Array.isArray(json.items)).toBe(true)

    await expect(page.getByTestId("panda-entities-property-connections")).toBeVisible({
      timeout: 15_000,
    })
  })
})
