/**
 * Verifies that the tenant phone edit PATCH sends `contact` key (not `phoneNumber`).
 *
 * Bug: use-property-tenants.ts was sending `phoneNumber` in the PATCH body.
 * The entity admin API only recognises `contact`, so tenant phone edits were silently lost.
 */

import { expect, test } from "@playwright/test"

import {
  e2eAdminCredentials,
  e2ePandaAdminListApiConfigured,
  signInAsAdmin,
} from "./helpers/admin-auth"
import {
  createPandaPropertyTenant,
  deletePandaPropertyTenantByName,
} from "./helpers/panda-property-tenants-db"

const SEED_PROPERTY_STREET = "99 E2E Seed Street"

const TEST_TENANT = {
  name: "E2E Tenant Contact Key Spec (Playwright)",
  email: "e2e-tenant-contact-key@example.com",
  phone: "0400111222",
  address: "42 Contact Key Street",
} as const

test.describe("Panda Realty — Tenant phone PATCH uses `contact` key", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")
    test.skip(!e2ePandaAdminListApiConfigured, "DATABASE_URL not set")
    await deletePandaPropertyTenantByName(TEST_TENANT.name)
    await createPandaPropertyTenant(SEED_PROPERTY_STREET, TEST_TENANT)
    await signInAsAdmin(page)
  })

  test.afterEach(async () => {
    await deletePandaPropertyTenantByName(TEST_TENANT.name)
  })

  test("tenant phone edit sends `contact` key in PATCH (not `phoneNumber`)", async ({ page }) => {
    let patchBody: Record<string, unknown> | null = null

    // Intercept entity PATCH to capture the body, then let it through
    await page.route("**/api/admin/entities/**", async (route) => {
      if (route.request().method() === "PATCH") {
        patchBody = JSON.parse(route.request().postData() ?? "{}")
      }
      await route.continue()
    })

    // Navigate to the property via search
    await page.goto(
      `/admin/properties?limit=25&page=1&search=${encodeURIComponent(SEED_PROPERTY_STREET)}&sortKey=updatedAt&sortDir=desc`,
    )
    const editButton = page.getByTestId(/^admin-entity-row-edit--properties--/).first()
    await expect(editButton).toBeVisible({ timeout: 15_000 })
    await editButton.click()
    await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible()
    await page.getByTestId("panda-properties-form-tab-trigger--tenants").click()
    await expect(page.getByTestId("panda-properties-form-tab--tenants")).toBeVisible()

    // Find the tenant row and click edit
    const tenantRow = page
      .locator('[data-testid^="property-tenant-row--"]')
      .filter({ hasText: TEST_TENANT.name })
    await expect(tenantRow).toBeVisible({ timeout: 15_000 })
    await tenantRow.locator('[data-testid^="property-tenant-edit--"]').click()

    const dialog = page.getByTestId("property-tenant-dialog")
    await expect(dialog).toBeVisible({ timeout: 10_000 })

    // Change the phone number and save
    await dialog.getByPlaceholder("Phone number").fill("0499888777")
    await dialog.getByTestId("property-tenant-dialog-save").click()
    await expect(dialog).toBeHidden({ timeout: 15_000 })

    // The PATCH body must use `contact`, not `phoneNumber`
    expect(patchBody, "PATCH body must not be null — save must have fired").not.toBeNull()
    expect(
      patchBody!["contact"],
      "PATCH body must contain `contact` key with the new phone value",
    ).toBe("0499888777")
    expect(
      patchBody,
      "PATCH body must NOT contain legacy `phoneNumber` key",
    ).not.toHaveProperty("phoneNumber")
  })
})
