/**
 * E2E: Property edit dialog contact and tenant rows expose meeting and note actions
 *
 * Run (from repo root):
 *   npx playwright test apps/panda-realty/e2e/admin-properties-contact-tenant-row-actions.spec.ts --config=apps/panda-realty/playwright.config.ts
 * Or via workspace script:
 *   npm run test:e2e -w panda-realty -- apps/panda-realty/e2e/admin-properties-contact-tenant-row-actions.spec.ts
 */

import { expect, test } from "@playwright/test"

import { requirePandaE2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import {
  openPropertyAndContactsTab,
  openPropertyAndTenantsTab,
  setupBaseRoutes,
} from "./helpers/admin-properties-add-entity-helpers"

const CONTACT_PROPERTY_ENTITY_ID = 6001
const TENANT_PROPERTY_ENTITY_ID = 7001

const MOCK_CONTACT = {
  propertyEntityId: CONTACT_PROPERTY_ENTITY_ID,
  entityId: 801,
  entityName: "Thyme Morayfield",
  entityCategoryId: 4,
  address: "70 Amy Street",
  emailAddress: "annette.holland@serenitas.com.au",
  phoneNumber: "0423200292",
  esuburb: null,
  estate: null,
  epostcode: null,
  notes: null,
  contactCategoryId: null,
  contactCategoryName: "Managing Agent",
  association: "Seller",
}

const MOCK_TENANT = {
  propertyEntityId: TENANT_PROPERTY_ENTITY_ID,
  entityId: 802,
  entityName: "Pat Tenant",
  entityCategoryId: 3,
  address: "12 Test Street",
  emailAddress: "tenant@example.com",
  phoneNumber: "0400111222",
  esuburb: null,
  estate: null,
  epostcode: null,
  notes: null,
}

async function setupContactsAndTenants(page: import("@playwright/test").Page) {
  await setupBaseRoutes(page, { entityId: 999, entityName: "Placeholder" })

  await page.route("**/api/admin/properties/1001/contacts**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items: [MOCK_CONTACT] }),
    })
  })

  await page.route("**/api/admin/properties/1001/tenants**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items: [MOCK_TENANT] }),
    })
  })

  await page.route("**/api/admin/agents**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([{ agentId: 42, agentName: "Jane Agent", email: "jane@example.com" }]),
    })
  })
}

test.describe("Property edit dialog contact and tenant row actions", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaE2eAdminCredentials()
    await setupContactsAndTenants(page)
    await signInAsAdmin(page)
  })

  test("contact row exposes Add Meeting and Add Note actions", async ({ page }) => {
    await openPropertyAndContactsTab(page)

    await expect(page.getByTestId(`property-contact-add-event--${CONTACT_PROPERTY_ENTITY_ID}`)).toBeVisible()
    await expect(page.getByTestId(`property-contact-add-note--${CONTACT_PROPERTY_ENTITY_ID}`)).toBeVisible()

    await page.getByTestId(`property-contact-add-event--${CONTACT_PROPERTY_ENTITY_ID}`).click()
    await expect(page.getByTestId("add-meeting-dialog")).toBeVisible()
    await expect(page.getByTestId("add-calendar-event-dialog")).toHaveCount(0)
    await page.getByRole("button", { name: "Cancel" }).click()

    await page.getByTestId(`property-contact-add-note--${CONTACT_PROPERTY_ENTITY_ID}`).click()
    await expect(page.getByTestId("buyer-row-add-note-dialog")).toBeVisible()
  })

  test("tenant row exposes Add Meeting and Add Note actions", async ({ page }) => {
    await openPropertyAndTenantsTab(page)

    await expect(page.getByTestId(`property-tenant-add-event--${TENANT_PROPERTY_ENTITY_ID}`)).toBeVisible()
    await expect(page.getByTestId(`property-tenant-add-note--${TENANT_PROPERTY_ENTITY_ID}`)).toBeVisible()

    await page.getByTestId(`property-tenant-add-event--${TENANT_PROPERTY_ENTITY_ID}`).click()
    await expect(page.getByTestId("add-meeting-dialog")).toBeVisible()
    await expect(page.getByTestId("add-calendar-event-dialog")).toHaveCount(0)
    await page.getByRole("button", { name: "Cancel" }).click()

    await page.getByTestId(`property-tenant-add-note--${TENANT_PROPERTY_ENTITY_ID}`).click()
    await expect(page.getByTestId("buyer-row-add-note-dialog")).toBeVisible()
  })
})
