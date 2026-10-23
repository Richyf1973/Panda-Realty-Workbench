/**
 * E2E: Files button on buyer, tenant, and contact panel rows
 *
 * Success factors (all mocked, no live DB needed):
 * 1. Buyer row has a Paperclip (files) button at property-buyer-panel-files--{id}.
 * 2. Clicking it opens a dialog titled "Files — {buyer entity name}".
 * 3. Dialog shows PropertyEntityFilesPanel: file list fetched from /api/admin/property-entity-files.
 * 4. Tenant row has a Paperclip button at property-tenant-files--{id}; opens correct titled dialog.
 * 5. Contact row has a Paperclip button at property-contact-files--{id}; opens correct titled dialog.
 * 6. Each dialog fetches files scoped to its own propertyEntityId (no cross-contamination).
 * 7. Files appear listed in the dialog when the API returns them.
 * 8. Dialog with no files shows "No files uploaded yet."
 * 9. Dialog closes when the × button is pressed.
 */

import { expect, test } from "@playwright/test"

import { e2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import {
  BUYER_PANEL_ITEMS_RESPONSE_1001,
  EMPTY_PROPERTY_ENTITIES_RESPONSE,
  PROPERTY_EDIT_WITH_BUYER,
  PROPERTY_EDIT_WITH_TENANT,
  SINGLE_PROPERTY_RESPONSE,
  STATUS_LIST_RESPONSE,
  TENANT_PANEL_ITEMS_RESPONSE_1001,
} from "./helpers/admin-properties-mocks"

// ── Fixtures ──────────────────────────────────────────────────────────────────

const BUYER_ID = 501
const BUYER_NAME = "Test Buyer LLC"

const TENANT_ID = 502
const TENANT_NAME = "Test Tenant Pty"

const CONTACT_ID = 701
const CONTACT_NAME = "Test Contact Co"

const CONTACT_PANEL_ITEMS_RESPONSE_1001 = {
  items: [
    {
      propertyEntityId: CONTACT_ID,
      entityId: 401,
      entityName: CONTACT_NAME,
      phoneNumber: "0400 555 666",
      emailAddress: "contact@test.com",
      address: null,
      esuburb: null,
      estate: null,
      epostcode: null,
      notes: null,
      contactCategoryId: null,
      contactCategoryName: null,
      association: null,
    },
  ],
}

const PROPERTY_EDIT_WITH_CONTACT = {
  ...SINGLE_PROPERTY_RESPONSE.items[0],
  isFavorite: true,
  propertyContacts: [
    {
      propertyEntityId: CONTACT_ID,
      entityId: 401,
      isOriginalOwner: false,
      propertyEntity: {
        entityId: 401,
        entityName: CONTACT_NAME,
        entityCategoryId: 2,
        address: null,
        emailAddress: "contact@test.com",
        phoneNumber: "0400 555 666",
      },
    },
  ],
}

const FILE_ROW = {
  propertyEntityFileId: 9001,
  propertyEntityId: BUYER_ID,
  fileType: "application/pdf",
  fileLink: "https://drive.google.com/file/d/abc123/view",
  fileName: "contract.pdf",
  fileSize: 43008,
  googleDriveFileId: "abc123",
  createdAt: "2026-05-01T00:00:00Z",
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function setupBaseMocks(page: import("@playwright/test").Page) {
  await page.route("**/api/admin/property-status**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(STATUS_LIST_RESPONSE) })
  })
  await page.route("**/api/admin/property-entities**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_PROPERTY_ENTITIES_RESPONSE) })
  })
  await page.route("**/api/admin/gmail/**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({}) })
  })
}

async function openBuyersTab(page: import("@playwright/test").Page) {
  await page.goto("/admin/properties")
  await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible()
  await page.getByTestId("admin-entity-row--properties--1001").click()
  await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible()
  await page.getByTestId("panda-properties-form-tab-trigger--buyers").click()
  await expect(page.getByTestId("panda-properties-form-tab--buyers")).toBeVisible()
  await expect(page.getByTestId("property-buyers-panel-add-new")).toBeEnabled({ timeout: 10_000 })
}

async function openTenantsTab(page: import("@playwright/test").Page) {
  await page.goto("/admin/properties")
  await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible()
  await page.getByTestId("admin-entity-row--properties--1001").click()
  await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible()
  await page.getByTestId("panda-properties-form-tab-trigger--tenants").click()
  await expect(page.getByTestId("panda-properties-form-tab--tenants")).toBeVisible()
  await expect(page.getByTestId("property-tenants-add-new")).toBeEnabled({ timeout: 10_000 })
}

async function openContactsTab(page: import("@playwright/test").Page) {
  await page.goto("/admin/properties")
  await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible()
  await page.getByTestId("admin-entity-row--properties--1001").click()
  await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible()
  await page.getByTestId("panda-properties-form-tab-trigger--contacts").click()
  await expect(page.getByTestId("panda-properties-form-tab--contacts")).toBeVisible()
  await expect(page.getByTestId("property-contacts-add-new")).toBeEnabled({ timeout: 10_000 })
}

// ── Buyer tests ───────────────────────────────────────────────────────────────

test.describe("Buyer panel row — Files button (mocked)", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")
    await setupBaseMocks(page)
    await page.route("**/api/admin/properties**", async (route) => {
      const url = route.request().url()
      if (url.match(/\/api\/admin\/properties\/1001\/buyers(\?|$)/)) {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(BUYER_PANEL_ITEMS_RESPONSE_1001) })
        return
      }
      if (url.match(/\/api\/admin\/properties\/1001(\?|$)/)) {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(PROPERTY_EDIT_WITH_BUYER) })
        return
      }
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ...SINGLE_PROPERTY_RESPONSE, items: [PROPERTY_EDIT_WITH_BUYER] }) })
    })
    await signInAsAdmin(page)
  })

  test("Paperclip (files) button is visible on buyer row", async ({ page }) => {
    await page.route("**/api/admin/property-entity-files**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) })
    })
    await openBuyersTab(page)

    const filesBtn = page.getByTestId(`property-buyer-panel-files--${BUYER_ID}`)
    await expect(filesBtn).toBeVisible()
    await expect(filesBtn).toBeEnabled()
  })

  test("Clicking Files button opens dialog titled 'Files — {buyer name}'", async ({ page }) => {
    await page.route("**/api/admin/property-entity-files**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) })
    })
    await openBuyersTab(page)

    await page.getByTestId(`property-buyer-panel-files--${BUYER_ID}`).click()

    await expect(page.getByRole("dialog")).toBeVisible()
    await expect(page.getByRole("dialog")).toContainText(`Files — ${BUYER_NAME}`)
  })

  test("Files dialog shows 'No files uploaded yet.' when entity has no files", async ({ page }) => {
    await page.route("**/api/admin/property-entity-files**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) })
    })
    await openBuyersTab(page)

    await page.getByTestId(`property-buyer-panel-files--${BUYER_ID}`).click()
    await expect(page.getByRole("dialog")).toBeVisible()
    await expect(page.getByRole("dialog")).toContainText("No files uploaded yet.")
  })

  test("Files dialog lists files when API returns them", async ({ page }) => {
    await page.route(`**/api/admin/property-entity-files**`, async (route) => {
      const url = route.request().url()
      if (url.includes(`propertyEntityId=${BUYER_ID}`)) {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([FILE_ROW]) })
        return
      }
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) })
    })
    await openBuyersTab(page)

    await page.getByTestId(`property-buyer-panel-files--${BUYER_ID}`).click()
    await expect(page.getByRole("dialog")).toBeVisible()
    await expect(page.getByRole("dialog")).toContainText("contract.pdf")
    await expect(page.getByRole("dialog")).toContainText("application/pdf")
  })

  test("Files dialog fetches files scoped to the clicked buyer's propertyEntityId", async ({ page }) => {
    const requestedIds: string[] = []
    await page.route("**/api/admin/property-entity-files**", async (route) => {
      const url = new URL(route.request().url())
      const id = url.searchParams.get("propertyEntityId")
      if (id) requestedIds.push(id)
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) })
    })
    await openBuyersTab(page)

    await page.getByTestId(`property-buyer-panel-files--${BUYER_ID}`).click()
    await expect(page.getByRole("dialog")).toBeVisible()
    await expect(page.getByRole("dialog")).toContainText("No files uploaded yet.")

    expect(requestedIds).toContain(String(BUYER_ID))
    expect(requestedIds.every((id) => id === String(BUYER_ID))).toBe(true)
  })

  test("Closing the Files dialog returns to the buyer panel", async ({ page }) => {
    await page.route("**/api/admin/property-entity-files**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) })
    })
    await openBuyersTab(page)

    await page.getByTestId(`property-buyer-panel-files--${BUYER_ID}`).click()
    await expect(page.getByRole("dialog")).toBeVisible()

    // Close via the × button (DialogClose)
    await page.getByRole("dialog").getByRole("button", { name: /close/i }).click()
    await expect(page.getByRole("dialog", { name: /^Files —/ })).not.toBeVisible()
    // The property edit dialog should still be open
    await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible()
  })
})

// ── Tenant tests ──────────────────────────────────────────────────────────────

test.describe("Tenant panel row — Files button (mocked)", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")
    await setupBaseMocks(page)
    await page.route("**/api/admin/properties**", async (route) => {
      const url = route.request().url()
      if (url.match(/\/api\/admin\/properties\/1001\/tenants(\?|$)/)) {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(TENANT_PANEL_ITEMS_RESPONSE_1001) })
        return
      }
      if (url.match(/\/api\/admin\/properties\/1001(\?|$)/)) {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(PROPERTY_EDIT_WITH_TENANT) })
        return
      }
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ...SINGLE_PROPERTY_RESPONSE, items: [PROPERTY_EDIT_WITH_TENANT] }) })
    })
    await page.route("**/api/admin/property-entity-files**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) })
    })
    await signInAsAdmin(page)
  })

  test("Paperclip (files) button is visible on tenant row", async ({ page }) => {
    await openTenantsTab(page)

    const filesBtn = page.getByTestId(`property-tenant-files--${TENANT_ID}`)
    await expect(filesBtn).toBeVisible()
    await expect(filesBtn).toBeEnabled()
  })

  test("Clicking Files button opens dialog titled 'Files — {tenant name}'", async ({ page }) => {
    await openTenantsTab(page)

    await page.getByTestId(`property-tenant-files--${TENANT_ID}`).click()
    await expect(page.getByRole("dialog")).toBeVisible()
    await expect(page.getByRole("dialog")).toContainText(`Files — ${TENANT_NAME}`)
  })

  test("Tenant Files dialog shows 'No files uploaded yet.' when entity has no files", async ({ page }) => {
    await openTenantsTab(page)

    await page.getByTestId(`property-tenant-files--${TENANT_ID}`).click()
    await expect(page.getByRole("dialog")).toBeVisible()
    await expect(page.getByRole("dialog")).toContainText("No files uploaded yet.")
  })

  test("Tenant files dialog fetches files scoped to the tenant's propertyEntityId", async ({ page }) => {
    const requestedIds: string[] = []
    await page.route("**/api/admin/property-entity-files**", async (route) => {
      const url = new URL(route.request().url())
      const id = url.searchParams.get("propertyEntityId")
      if (id) requestedIds.push(id)
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) })
    })
    await openTenantsTab(page)

    await page.getByTestId(`property-tenant-files--${TENANT_ID}`).click()
    await expect(page.getByRole("dialog")).toBeVisible()

    expect(requestedIds).toContain(String(TENANT_ID))
    expect(requestedIds.every((id) => id === String(TENANT_ID))).toBe(true)
  })
})

// ── Contact tests ─────────────────────────────────────────────────────────────

test.describe("Contact panel row — Files button (mocked)", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")
    await setupBaseMocks(page)
    await page.route("**/api/admin/properties**", async (route) => {
      const url = route.request().url()
      if (url.match(/\/api\/admin\/properties\/1001\/contacts(\?|$)/)) {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(CONTACT_PANEL_ITEMS_RESPONSE_1001) })
        return
      }
      if (url.match(/\/api\/admin\/properties\/1001(\?|$)/)) {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(PROPERTY_EDIT_WITH_CONTACT) })
        return
      }
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ...SINGLE_PROPERTY_RESPONSE, items: [PROPERTY_EDIT_WITH_CONTACT] }) })
    })
    await page.route("**/api/admin/property-entity-files**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) })
    })
    await signInAsAdmin(page)
  })

  test("Paperclip (files) button is visible on contact row", async ({ page }) => {
    await openContactsTab(page)

    const filesBtn = page.getByTestId(`property-contact-files--${CONTACT_ID}`)
    await expect(filesBtn).toBeVisible()
    await expect(filesBtn).toBeEnabled()
  })

  test("Clicking Files button opens dialog titled 'Files — {contact name}'", async ({ page }) => {
    await openContactsTab(page)

    await page.getByTestId(`property-contact-files--${CONTACT_ID}`).click()
    await expect(page.getByRole("dialog")).toBeVisible()
    await expect(page.getByRole("dialog")).toContainText(`Files — ${CONTACT_NAME}`)
  })

  test("Contact Files dialog shows 'No files uploaded yet.' when entity has no files", async ({ page }) => {
    await openContactsTab(page)

    await page.getByTestId(`property-contact-files--${CONTACT_ID}`).click()
    await expect(page.getByRole("dialog")).toBeVisible()
    await expect(page.getByRole("dialog")).toContainText("No files uploaded yet.")
  })

  test("Contact files dialog fetches files scoped to the contact's propertyEntityId", async ({ page }) => {
    const requestedIds: string[] = []
    await page.route("**/api/admin/property-entity-files**", async (route) => {
      const url = new URL(route.request().url())
      const id = url.searchParams.get("propertyEntityId")
      if (id) requestedIds.push(id)
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) })
    })
    await openContactsTab(page)

    await page.getByTestId(`property-contact-files--${CONTACT_ID}`).click()
    await expect(page.getByRole("dialog")).toBeVisible()

    expect(requestedIds).toContain(String(CONTACT_ID))
    expect(requestedIds.every((id) => id === String(CONTACT_ID))).toBe(true)
  })
})
