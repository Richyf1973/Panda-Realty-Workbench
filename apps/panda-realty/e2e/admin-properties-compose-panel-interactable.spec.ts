/**
 * E2E: Compose dialog body is interactable when opened from within property/entity dialog panels.
 *
 * Bug: GmailComposeDialog used createPortal(jsx, document.body). When a Radix Dialog
 * (property edit modal) is open, Radix sets document.body as `inert`, making portaled
 * content unclickable and non-typeable. Fix: render compose without portal (inline) when
 * called from panel components inside Radix dialogs.
 *
 * Success factors:
 * 1. Contacts panel → compose editor body is clickable and accepts typed text
 * 2. Buyers panel → compose editor body is clickable and accepts typed text
 * 3. Tenants panel → compose editor body is clickable and accepts typed text
 * 4. Owners section → compose editor body is clickable and accepts typed text
 * 5. Compose backdrop is NOT a direct child of <body> when opened from a panel dialog
 * 6. List-row compose (regression) → editor body still works; portal not broken
 * 7. Property dialog remains open and functional after compose is dismissed
 */

import { expect, test } from "@playwright/test"

import { requirePandaE2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import { routePandaPropertiesListDetailAndBuyerOffers } from "./helpers/panda-properties-dialog-mocks"
import {
  makeListResponse,
  PROPERTY_ONE_OWNER,
  openPropertyEditDialog,
  registerPropertyRoutes,
  STATUS_LIST_RESPONSE,
  EMPTY_PROPERTY_ENTITIES_RESPONSE,
} from "./helpers/panda-properties-owners-helpers"

// ── Fixtures ──────────────────────────────────────────────────────────────────

const CONTACT_WITH_EMAIL = {
  items: [
    {
      propertyEntityId: 601,
      entityId: 301,
      entityName: "Jane Smith",
      phoneNumber: "0411000111",
      emailAddress: "jane@example.com",
      address: null,
      contactCategoryName: "Solicitor",
      association: null,
    },
  ],
}

const BUYER_WITH_EMAIL = {
  items: [
    {
      propertyEntityId: 501,
      entityId: 201,
      entityName: "Aaron Ross",
      phoneNumber: "0400000001",
      emailAddress: "aaron@example.com",
      address: null,
      esuburb: null,
      estate: null,
      epostcode: null,
      notes: null,
      buyerPipelineStatusId: null,
      pipelineStatusLabel: "Active Buyers",
    },
  ],
}

const TENANT_WITH_EMAIL = {
  items: [
    {
      propertyEntityId: 701,
      entityId: 401,
      entityName: "Bob Tenant",
      phoneNumber: "0422333444",
      emailAddress: "bob@tenant.com",
      address: null,
      esuburb: null,
      estate: null,
      epostcode: null,
      notes: null,
    },
  ],
}

const EMPTY_PANEL = { items: [] }

// Property with isFavorite=true (exposes Buyers/Contacts/Tenants tabs) and owner email
const PROPERTY_FAVORITE_WITH_OWNER = {
  propertyListId: 1001,
  streetAddress: "12 Test Street",
  suburb: "Testville",
  state: "QLD",
  postcode: "4000",
  propertyType: "House",
  bed: 3,
  bath: 2,
  car: 1,
  salePrice: 500000,
  propertyStatusId: 1,
  buyerName: null,
  buyerId: null,
  isFavorite: true,
  priceUndisclosed: false,
  excludeFromReport: false,
  saleDate: null,
  updatedAt: "2026-01-01T00:00:00Z",
  combinedOwner: "Smith, John",
  owner1name: "Smith, John",
  owner1address: "182 AMY STREET MORAYFIELD",
  owner1phone: "0412345678",
  owner1email: "john@example.com",
  owner2name: null,
  owner2address: null,
  owner2phone: null,
  owner2email: null,
  owner3name: null,
  owner3address: null,
  owner3phone: null,
  owner3email: null,
  primaryPhoneOwnerNum: 1,
  primaryEmailOwnerNum: 1,
  propertyEntities: [],
  propertyBuyers: [],
  propertyContacts: [],
  propertyTenants: [],
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function setupDialogWithPanels(
  page: import("@playwright/test").Page,
  opts: { contacts?: object; buyers?: object; tenants?: object } = {},
) {
  // General property route first (lower LIFO priority)
  await page.route("**/api/admin/properties**", async (route) => {
    const url = route.request().url()
    if (url.match(/\/api\/admin\/properties\/1001(\?|$)/)) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(PROPERTY_FAVORITE_WITH_OWNER),
      })
      return
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(makeListResponse(PROPERTY_FAVORITE_WITH_OWNER)),
    })
  })

  // Panel routes (higher LIFO priority — registered after catch-all)
  await page.route("**/api/admin/properties/1001/buyers**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(opts.buyers ?? EMPTY_PANEL) })
  })
  await page.route("**/api/admin/properties/1001/contacts**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(opts.contacts ?? EMPTY_PANEL) })
  })
  await page.route("**/api/admin/properties/1001/tenants**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(opts.tenants ?? EMPTY_PANEL) })
  })

  // Common mocks
  await page.route("**/api/admin/property-status**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(STATUS_LIST_RESPONSE) })
  })
  await page.route("**/api/admin/property-entities**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_PROPERTY_ENTITIES_RESPONSE) })
  })
  await page.route("**/api/admin/email-signatures**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [] }) })
  })
  await page.route("**/api/admin/agents**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) })
  })

  await page.goto("/admin/properties")
  await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible()
  await page.getByTestId("admin-entity-row--properties--1001").click()
  await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible()
}

async function typeInEditor(page: import("@playwright/test").Page, text: string) {
  const editor = page.getByTestId("property-gmail-compose-editor")
  await expect(editor).toBeVisible()
  // Click on the editor to focus it, then type — if inert the text won't appear
  await editor.click()
  await page.keyboard.type(text)
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe("Compose dialog — interactable from panel dialogs (mocked)", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaE2eAdminCredentials()
    await signInAsAdmin(page)
  })

  // ── 1. Contacts panel ──────────────────────────────────────────────────────

  test("contacts panel: compose editor body is clickable and accepts typed text", async ({ page }) => {
    await setupDialogWithPanels(page, { contacts: CONTACT_WITH_EMAIL })

    await page.getByTestId("panda-properties-form-tab-trigger--contacts").click()
    await expect(page.getByTestId("panda-properties-form-tab--contacts")).toBeVisible()

    await page.getByTestId("property-contact-quick-email--601").click()
    await expect(page.getByTestId("property-gmail-compose-dialog")).toBeVisible()

    const typedText = "Hello from contacts panel"
    await typeInEditor(page, typedText)

    await expect(page.getByTestId("property-gmail-compose-editor")).toContainText(typedText)
  })

  // ── 2. Buyers panel ────────────────────────────────────────────────────────

  test("buyers panel: compose editor body is clickable and accepts typed text", async ({ page }) => {
    await setupDialogWithPanels(page, { buyers: BUYER_WITH_EMAIL })

    await page.getByTestId("panda-properties-form-tab-trigger--buyers").click()

    await page.getByTestId("property-buyer-panel-quick-email--501").click()
    await expect(page.getByTestId("property-gmail-compose-dialog")).toBeVisible()

    const typedText = "Hello from buyers panel"
    await typeInEditor(page, typedText)

    await expect(page.getByTestId("property-gmail-compose-editor")).toContainText(typedText)
  })

  // ── 3. Tenants panel ───────────────────────────────────────────────────────

  test("tenants panel: compose editor body is clickable and accepts typed text", async ({ page }) => {
    await setupDialogWithPanels(page, { tenants: TENANT_WITH_EMAIL })

    await page.getByTestId("panda-properties-form-tab-trigger--tenants").click()
    await expect(page.getByTestId("panda-properties-form-tab--tenants")).toBeVisible()

    await page.getByTestId("property-tenant-quick-email--701").click()
    await expect(page.getByTestId("property-gmail-compose-dialog")).toBeVisible()

    const typedText = "Hello from tenants panel"
    await typeInEditor(page, typedText)

    await expect(page.getByTestId("property-gmail-compose-editor")).toContainText(typedText)
  })

  // ── 4. Owners section ─────────────────────────────────────────────────────

  test("owners section: compose editor body is clickable and accepts typed text", async ({ page }) => {
    await setupDialogWithPanels(page)

    await page.getByTestId("property-owner-compose--1").click()
    await expect(page.getByTestId("property-gmail-compose-dialog")).toBeVisible()

    const typedText = "Hello from owners section"
    await typeInEditor(page, typedText)

    await expect(page.getByTestId("property-gmail-compose-editor")).toContainText(typedText)
  })

  // ── 5. DOM — backdrop not portaled to body ─────────────────────────────────

  test("compose opened from panel: backdrop is NOT a direct child of <body>", async ({ page }) => {
    await setupDialogWithPanels(page, { contacts: CONTACT_WITH_EMAIL })

    await page.getByTestId("panda-properties-form-tab-trigger--contacts").click()
    await page.getByTestId("property-contact-quick-email--601").click()
    await expect(page.getByTestId("property-gmail-compose-dialog")).toBeVisible()

    const backdrop = page.getByTestId("property-gmail-compose-backdrop")
    const parentTag = await backdrop.evaluate(
      (el) => el.parentElement?.tagName.toLowerCase() ?? "null",
    )
    // After fix: dialog renders inline inside Radix content, not portaled to body
    expect(parentTag).not.toBe("body")
  })

  // ── 6. Regression — list-row compose still works ──────────────────────────

  test("list-row compose (regression): editor body is still clickable and accepts typed text", async ({ page }) => {
    // List-row compose is NOT inside a Radix dialog — portal should remain intact
    await page.route("**/api/admin/properties**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(makeListResponse(PROPERTY_FAVORITE_WITH_OWNER)),
      })
    })
    await page.route("**/api/admin/property-status**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(STATUS_LIST_RESPONSE) })
    })
    await page.route("**/api/admin/property-entities**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_PROPERTY_ENTITIES_RESPONSE) })
    })
    await page.route("**/api/admin/email-signatures**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [] }) })
    })
    await page.route("**/api/admin/agents**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) })
    })

    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-row--properties--1001")).toBeVisible({ timeout: 15_000 })
    await page.getByTestId("property-list-email-button--1001").first().click()
    await expect(page.getByTestId("property-gmail-compose-dialog")).toBeVisible()

    const typedText = "Hello from list row"
    await typeInEditor(page, typedText)
    await expect(page.getByTestId("property-gmail-compose-editor")).toContainText(typedText)
  })

  // ── 7. Property dialog still functional after compose dismissed ────────────

  test("dismissing compose from panel leaves property dialog open and functional", async ({ page }) => {
    await setupDialogWithPanels(page, { contacts: CONTACT_WITH_EMAIL })

    await page.getByTestId("panda-properties-form-tab-trigger--contacts").click()
    await page.getByTestId("property-contact-quick-email--601").click()
    await expect(page.getByTestId("property-gmail-compose-dialog")).toBeVisible()

    await page.getByTestId("property-gmail-compose-cancel").click()
    await expect(page.getByTestId("property-gmail-compose-dialog")).not.toBeVisible()

    // Property dialog must still be visible and the contacts tab still accessible
    await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible()
    await expect(page.getByTestId("panda-properties-form-tab--contacts")).toBeVisible()
  })
})
