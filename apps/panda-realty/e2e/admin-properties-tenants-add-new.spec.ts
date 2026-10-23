import { expect, test } from "@playwright/test"
import {
  e2eAdminCredentials,
  e2ePandaAdminListApiConfigured,
  signInAsAdmin,
} from "./helpers/admin-auth"
import {
  deletePandaPropertyTenantByName,
  getPandaPropertyTenantByName,
} from "./helpers/panda-property-tenants-db"

// Uses the seeded property created by globalSetup (seed-sellers-pipeline-accepted-offer.mjs)
const SEED_PROPERTY_STREET = "99 E2E Seed Street"

// Isolated test tenant — won't interfere with any other seeded entity
const TEST_TENANT = {
  name: "E2E Tenant Add Spec (Playwright)",
  email: "e2e-tenant-add@example.com",
  phone: "0422111222",
  address: "10 Tenant Add Street",
  suburb: "Tenantville",
  state: "QLD",
  postcode: "4333",
  notes: "E2E tenant add spec notes",
} as const

test.describe("Panda Realty admin — property Tenants tab: Add new", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")
    test.skip(!e2ePandaAdminListApiConfigured, "DATABASE_URL not set")
    await signInAsAdmin(page)
  })

  test.afterEach(async () => {
    await deletePandaPropertyTenantByName(TEST_TENANT.name)
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

  test("Tenants tab shows Add new button for the seeded property", async ({ page }) => {
    await openTenantsTab(page)
    await expect(page.getByTestId("property-tenants-add-new")).toBeVisible()
  })

  test("Add new creates tenant in DB and shows row in UI", async ({ page }) => {
    await deletePandaPropertyTenantByName(TEST_TENANT.name)

    await openTenantsTab(page)

    await page.getByTestId("property-tenants-add-new").click()

    const dialog = page.getByTestId("property-tenant-dialog")
    await expect(dialog).toBeVisible({ timeout: 10_000 })

    // Fill every form field
    await dialog.getByTestId("property-tenant-dialog-name").fill(TEST_TENANT.name)
    await dialog.getByPlaceholder("Email address").fill(TEST_TENANT.email)
    await dialog.getByPlaceholder("Phone number").fill(TEST_TENANT.phone)
    await dialog.getByPlaceholder("Address", { exact: true }).fill(TEST_TENANT.address)
    await dialog.getByPlaceholder("Suburb").fill(TEST_TENANT.suburb)
    await dialog.getByPlaceholder("State").fill(TEST_TENANT.state)
    await dialog.getByPlaceholder("Postcode").fill(TEST_TENANT.postcode)
    await dialog.getByPlaceholder("Notes").fill(TEST_TENANT.notes)

    await dialog.getByTestId("property-tenant-dialog-save").click()

    // Dialog must close after save
    await expect(dialog).toBeHidden({ timeout: 15_000 })

    // UI: tenant row must appear with the correct name
    await expect(page.getByText(TEST_TENANT.name)).toBeVisible({ timeout: 10_000 })

    // DB: verify every field was committed
    const saved = await getPandaPropertyTenantByName(SEED_PROPERTY_STREET, TEST_TENANT.name)
    expect(saved).not.toBeNull()
    expect(saved!.propertyEntityId).toBeGreaterThan(0)
    expect(saved!.entityId).toBeGreaterThan(0)
    expect(saved!.entityName).toBe(TEST_TENANT.name)
    expect(saved!.emailAddress).toBe(TEST_TENANT.email)
    expect(saved!.phoneNumber).toBe(TEST_TENANT.phone)
    expect(saved!.address).toBe(TEST_TENANT.address)
    expect(saved!.esuburb).toBe(TEST_TENANT.suburb)
    expect(saved!.estate).toBe(TEST_TENANT.state)
    expect(saved!.epostcode).toBe(TEST_TENANT.postcode)
    expect(saved!.notes).toBe(TEST_TENANT.notes)
  })
})
