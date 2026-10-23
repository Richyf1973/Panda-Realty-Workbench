import { expect, test } from "@playwright/test"

import {
  e2eAdminCredentials,
  e2ePandaAdminListApiConfigured,
  signInAsAdmin,
} from "./helpers/admin-auth"
import {
  createPandaPropertyTenant,
  deletePandaPropertyTenantByName,
  getPandaPropertyTenantByName,
} from "./helpers/panda-property-tenants-db"

// Uses the seeded property created by globalSetup (seed-sellers-pipeline-accepted-offer.mjs)
const SEED_PROPERTY_STREET = "99 E2E Seed Street"

const TEST_TENANT_INITIAL = {
  name: "E2E Tenant Edit Spec (Playwright)",
  email: "e2e-tenant-edit@example.com",
  phone: "0422333444",
  address: "20 Tenant Edit Street",
  suburb: "Edittenantville",
  state: "QLD",
  postcode: "4444",
  notes: "Initial tenant edit spec notes",
} as const

const TEST_TENANT_UPDATED = {
  name: "E2E Tenant Edit Spec Updated (Playwright)",
  email: "e2e-tenant-edit-updated@example.com",
  phone: "0422555666",
  address: "21 Updated Tenant Street",
  suburb: "Updatedtenantville",
  state: "NSW",
  postcode: "2111",
  notes: "Updated tenant edit spec notes",
} as const

test.describe("Panda Realty admin — property Tenants tab: Edit existing", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")
    test.skip(!e2ePandaAdminListApiConfigured, "DATABASE_URL not set")

    // Clean slate — remove both names in case a prior run was interrupted mid-edit
    await deletePandaPropertyTenantByName(TEST_TENANT_INITIAL.name)
    await deletePandaPropertyTenantByName(TEST_TENANT_UPDATED.name)

    await createPandaPropertyTenant(SEED_PROPERTY_STREET, TEST_TENANT_INITIAL)
    await signInAsAdmin(page)
  })

  test.afterEach(async () => {
    await deletePandaPropertyTenantByName(TEST_TENANT_INITIAL.name)
    await deletePandaPropertyTenantByName(TEST_TENANT_UPDATED.name)
  })

  async function openTenantsTab(page: import("@playwright/test").Page) {
    await page.goto(
      `/admin/properties?limit=25&page=1&search=${encodeURIComponent(SEED_PROPERTY_STREET)}&sortKey=updatedAt&sortDir=desc`,
    )
    const editButton = page.getByTestId(/^admin-entity-row-edit--properties--/).first()
    await expect(editButton).toBeVisible({ timeout: 15_000 })
    await editButton.click()
    await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible()
    await page.getByTestId("panda-properties-form-tab-trigger--tenants").click()
    await expect(page.getByTestId("panda-properties-form-tab--tenants")).toBeVisible()
    await expect(page.getByTestId("property-tenants-add-new")).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId("property-tenants-add-new")).toBeEnabled({ timeout: 10_000 })
  }

  test("Edit saves updated fields to DB and reflects changes in UI", async ({ page }) => {
    await openTenantsTab(page)

    // Locate the tenant row by name and click its edit button
    const tenantRow = page
      .locator('[data-testid^="property-tenant-row--"]')
      .filter({ hasText: TEST_TENANT_INITIAL.name })
    await expect(tenantRow).toBeVisible({ timeout: 15_000 })

    const tenantEditBtn = tenantRow.locator('[data-testid^="property-tenant-edit--"]')
    await expect(tenantEditBtn).toBeVisible()
    await tenantEditBtn.click()

    const dialog = page.getByTestId("property-tenant-dialog")
    await expect(dialog).toBeVisible({ timeout: 10_000 })

    // Dialog should be pre-filled with initial values
    await expect(dialog.getByTestId("property-tenant-dialog-name")).toHaveValue(
      TEST_TENANT_INITIAL.name,
    )

    // Clear and fill every field with updated values
    await dialog.getByTestId("property-tenant-dialog-name").fill(TEST_TENANT_UPDATED.name)
    await dialog.getByPlaceholder("Email address").fill(TEST_TENANT_UPDATED.email)
    await dialog.getByPlaceholder("Phone number").fill(TEST_TENANT_UPDATED.phone)
    await dialog.getByPlaceholder("Address", { exact: true }).fill(TEST_TENANT_UPDATED.address)
    await dialog.getByPlaceholder("Suburb").fill(TEST_TENANT_UPDATED.suburb)
    await dialog.getByPlaceholder("State").fill(TEST_TENANT_UPDATED.state)
    await dialog.getByPlaceholder("Postcode").fill(TEST_TENANT_UPDATED.postcode)
    await dialog.getByPlaceholder("Notes").fill(TEST_TENANT_UPDATED.notes)

    await dialog.getByTestId("property-tenant-dialog-save").click()

    // Dialog must close after save
    await expect(dialog).toBeHidden({ timeout: 15_000 })

    // UI: updated name must appear in the tenants list
    await expect(page.getByText(TEST_TENANT_UPDATED.name)).toBeVisible({ timeout: 10_000 })

    // UI: re-open edit dialog and verify fields are pre-filled with updated values
    const updatedRow = page
      .locator('[data-testid^="property-tenant-row--"]')
      .filter({ hasText: TEST_TENANT_UPDATED.name })
    await expect(updatedRow).toBeVisible()
    await updatedRow.locator('[data-testid^="property-tenant-edit--"]').click()
    await expect(dialog).toBeVisible({ timeout: 10_000 })
    await expect(dialog.getByTestId("property-tenant-dialog-name")).toHaveValue(
      TEST_TENANT_UPDATED.name,
    )
    await expect(dialog.getByPlaceholder("Email address")).toHaveValue(TEST_TENANT_UPDATED.email)
    await expect(dialog.getByPlaceholder("Phone number")).toHaveValue(TEST_TENANT_UPDATED.phone)
    await dialog.getByTestId("property-tenant-dialog-save").click()
    await expect(dialog).toBeHidden({ timeout: 10_000 })

    // DB: verify every updated field was committed
    const saved = await getPandaPropertyTenantByName(SEED_PROPERTY_STREET, TEST_TENANT_UPDATED.name)
    expect(saved).not.toBeNull()
    expect(saved!.propertyEntityId).toBeGreaterThan(0)
    expect(saved!.entityId).toBeGreaterThan(0)
    expect(saved!.entityName).toBe(TEST_TENANT_UPDATED.name)
    expect(saved!.emailAddress).toBe(TEST_TENANT_UPDATED.email)
    expect(saved!.phoneNumber).toBe(TEST_TENANT_UPDATED.phone)
    expect(saved!.address).toBe(TEST_TENANT_UPDATED.address)
    expect(saved!.esuburb).toBe(TEST_TENANT_UPDATED.suburb)
    expect(saved!.estate).toBe(TEST_TENANT_UPDATED.state)
    expect(saved!.epostcode).toBe(TEST_TENANT_UPDATED.postcode)
    expect(saved!.notes).toBe(TEST_TENANT_UPDATED.notes)
  })
})
