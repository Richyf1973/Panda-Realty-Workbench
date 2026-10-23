import { expect, test } from "@playwright/test"

import { e2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"

test.describe("Panda Realty home", () => {
  test("shows Sign in when anonymous", async ({ page }) => {
    await page.goto("/")
    await expect(page.getByTestId("admin-app-sidebar")).toBeVisible()
    await expect(page.getByTestId("admin-sidebar-top-bar")).toBeVisible()
    await expect(page.getByTestId("panda-realty-home")).toBeVisible()
    await expect(page.getByTestId("site-navbar-theme-toggle")).toBeVisible()
    if (await page.getByTestId("site-navbar-auth-unavailable").isVisible()) {
      test.skip(
        true,
        "Configure NEXT_PUBLIC_SUPABASE_URL and publishable/anon key in .env.local",
      )
    }
    await expect(
      page.getByRole("link", { name: "Sign in", exact: true }).first(),
    ).toBeVisible()
    await expect(
      page.getByTestId("panda-realty-home").getByRole("link", { name: "Admin", exact: true }),
    ).toBeVisible()
  })

  test("redirects to /admin/properties when signed in", async ({ page }) => {
    test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")
    await signInAsAdmin(page)
    await page.goto("/")
    await expect(page).toHaveURL(/\/admin\/properties/)
    await expect(page.getByTestId("panda-realty-home")).toHaveCount(0)
    await expect(page.getByTestId("admin-entity-list-card--properties")).toBeVisible()
  })
})
