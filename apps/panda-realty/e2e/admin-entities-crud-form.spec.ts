import { expect, test } from "@playwright/test"

import {
  e2eAdminCredentials,
  e2ePandaAdminListApiConfigured,
  signInAsAdmin,
} from "./helpers/admin-auth"

test.describe("Panda Realty admin — entities CRUD form", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")
    test.skip(
      !e2ePandaAdminListApiConfigured,
      "DATABASE_URL not set — admin list uses live APIs (see apps/panda-realty/.env.example)",
    )
    await signInAsAdmin(page)
  })

  test("create dialog: only Name and Entity category show required markers", async ({ page }) => {
    await page.goto("/admin/entities")
    await page.waitForLoadState("networkidle")

    await page.getByTestId("admin-entity-list-add-new--entities").click()
    const dialog = page.getByTestId("admin-entity-crud-dialog--entities")
    await expect(dialog).toBeVisible()

    await expect(
      dialog.getByTestId("admin-entity-create-field--entities--entityName").locator("span.text-destructive"),
    ).toHaveCount(1)
    await expect(
      dialog.getByTestId("admin-entity-create-field--entities--entityCategoryId").locator("span.text-destructive"),
    ).toHaveCount(1)

    await expect(
      dialog.getByTestId("admin-entity-create-field--entities--leadSourceId").locator("span.text-destructive"),
    ).toHaveCount(0)
    await expect(
      dialog.getByTestId("admin-entity-create-field--entities--emailAddress").locator("span.text-destructive"),
    ).toHaveCount(0)
  })

  test("create dialog: Contact / Address / Details are section headings, not tabs", async ({ page }) => {
    await page.goto("/admin/entities")
    await page.waitForLoadState("networkidle")

    await page.getByTestId("admin-entity-list-add-new--entities").click()
    const dialog = page.getByTestId("admin-entity-crud-dialog--entities")
    await expect(dialog).toBeVisible()

    await expect(dialog.getByRole("heading", { name: "Contact" })).toBeVisible()
    await expect(dialog.getByRole("heading", { name: "Address" })).toBeVisible()
    await expect(dialog.getByRole("heading", { name: "Details" })).toBeVisible()

    await expect(dialog.getByRole("tab", { name: "Contact" })).toHaveCount(0)
    await expect(dialog.getByRole("tab", { name: "Address" })).toHaveCount(0)
    await expect(dialog.getByRole("tab", { name: "Details" })).toHaveCount(0)
  })
})
