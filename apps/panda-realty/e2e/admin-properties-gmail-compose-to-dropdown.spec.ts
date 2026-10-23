import { expect, test } from "@playwright/test"

import { requirePandaE2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import { routePandaPropertiesListDetailAndBuyerOffers } from "./helpers/panda-properties-dialog-mocks"
import { parseFormDataBody } from "./helpers/panda-properties-gmail-helpers"

// Fixtures ─────────────────────────────────────────────────────────────────────

const ENTITY_EMAILS_ALL = {
  items: [
    { type: "owner", entityName: "Smith, John", emailAddress: "john@example.com" },
    { type: "buyer", entityName: "Ash D", entityId: 201, emailAddress: "dhungelashok33@gmail.com" },
    { type: "contact", entityName: "Jane Smith", entityId: 301, emailAddress: "jane@example.com" },
    { type: "tenant", entityName: "Bob Tenant", entityId: 401, emailAddress: "bob@tenant.com" },
  ],
}

const ENTITY_EMAILS_OWNER_ONLY = {
  items: [{ type: "owner", entityName: "Smith, John", emailAddress: "john@example.com" }],
}

const ENTITY_EMAILS_WITH_NULL = {
  items: [
    { type: "owner", entityName: "Smith, John", emailAddress: "john@example.com" },
    { type: "buyer", entityName: "No Email Buyer", entityId: 202, emailAddress: null },
    { type: "contact", entityName: "Jane Smith", entityId: 301, emailAddress: "jane@example.com" },
  ],
}

const BUYER_WITH_EMAIL = {
  items: [
    {
      propertyEntityId: 501,
      entityId: 201,
      entityName: "Ash D",
      phoneNumber: "0475770513",
      emailAddress: "dhungelashok33@gmail.com",
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

const STATUS_MIN = {
  items: [{ propertyStatusId: 1, propertyStatusCode: "ACTIVE", propertyStatus: "Active" }],
  totalCount: 1,
  limit: 100,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false,
  startCursor: null,
  endCursor: null,
}

const EMPTY_PANEL = { items: [] }

// Helpers ──────────────────────────────────────────────────────────────────────

async function setupAndOpenDialog(
  page: Parameters<typeof routePandaPropertiesListDetailAndBuyerOffers>[0],
  opts: {
    entityEmails?: object
    buyers?: object
    contacts?: object
    tenants?: object
    entityEmailsStatus?: number
  } = {},
) {
  await page.route("**/api/admin/property-status**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(STATUS_MIN) })
  })
  await page.route("**/api/admin/property-entities**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items: [], totalCount: 0, limit: 20, totalPages: 0, hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null }),
    })
  })
  await routePandaPropertiesListDetailAndBuyerOffers(page)

  // Panel routes registered after the general handler so they match first (LIFO)
  await page.route("**/api/admin/properties/1001/entity-emails**", async (route) => {
    const status = opts.entityEmailsStatus ?? 200
    await route.fulfill({
      status,
      contentType: "application/json",
      body: status === 200 ? JSON.stringify(opts.entityEmails ?? ENTITY_EMAILS_ALL) : JSON.stringify({ error: "Internal error" }),
    })
  })
  await page.route("**/api/admin/properties/1001/buyers**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(opts.buyers ?? EMPTY_PANEL) })
  })
  await page.route("**/api/admin/properties/1001/contacts**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(opts.contacts ?? EMPTY_PANEL) })
  })
  await page.route("**/api/admin/properties/1001/tenants**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(opts.tenants ?? EMPTY_PANEL) })
  })

  await page.goto("/admin/properties")
  await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible()
  await page.getByTestId("admin-entity-row--properties--1001").click()
  await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible()
}

test.describe("Panda Realty — New Message 'To' field combobox dropdown", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaE2eAdminCredentials()
    await signInAsAdmin(page)
  })

  // ── Happy path: dropdown opens with all grouped entity types ────────────────

  test("Contacts tab: clicking To text input shows dropdown with all entity type groups", async ({ page }) => {
    await setupAndOpenDialog(page, { contacts: CONTACT_WITH_EMAIL })
    await page.getByTestId("panda-properties-form-tab-trigger--contacts").click()
    await expect(page.getByTestId("property-contact-row--601")).toBeVisible()
    await page.getByTestId("property-contact-quick-email--601").click()

    await expect(page.getByTestId("property-gmail-compose-dialog")).toBeVisible()
    await page.getByTestId("property-gmail-compose-to-text-input").click()

    await expect(page.getByTestId("property-gmail-compose-to-dropdown")).toBeVisible()
    await expect(page.getByTestId("property-gmail-compose-to-group--owner")).toBeVisible()
    await expect(page.getByTestId("property-gmail-compose-to-group--buyer")).toBeVisible()
    await expect(page.getByTestId("property-gmail-compose-to-group--contact")).toBeVisible()
    await expect(page.getByTestId("property-gmail-compose-to-group--tenant")).toBeVisible()
  })

  test("Contacts tab: dropdown lists all four entity emails with names", async ({ page }) => {
    await setupAndOpenDialog(page, { contacts: CONTACT_WITH_EMAIL })
    await page.getByTestId("panda-properties-form-tab-trigger--contacts").click()
    await expect(page.getByTestId("property-contact-row--601")).toBeVisible()
    await page.getByTestId("property-contact-quick-email--601").click()

    await expect(page.getByTestId("property-gmail-compose-dialog")).toBeVisible()
    await page.getByTestId("property-gmail-compose-to-text-input").click()

    await expect(page.getByTestId("property-gmail-compose-to-option--john@example.com")).toBeVisible()
    await expect(page.getByTestId("property-gmail-compose-to-option--dhungelashok33@gmail.com")).toBeVisible()
    await expect(page.getByTestId("property-gmail-compose-to-option--jane@example.com")).toBeVisible()
    await expect(page.getByTestId("property-gmail-compose-to-option--bob@tenant.com")).toBeVisible()
  })

  // ── Happy path: pre-selection of the triggering entity ─────────────────────

  test("Contacts tab: compose opens with triggering contact's email as a chip", async ({ page }) => {
    await setupAndOpenDialog(page, { contacts: CONTACT_WITH_EMAIL })
    await page.getByTestId("panda-properties-form-tab-trigger--contacts").click()
    await expect(page.getByTestId("property-contact-row--601")).toBeVisible()
    await page.getByTestId("property-contact-quick-email--601").click()

    await expect(page.getByTestId("property-gmail-compose-dialog")).toBeVisible()
    await expect(page.getByTestId("property-gmail-compose-to-chip").first()).toContainText("jane@example.com")
  })

  test("Buyers tab: compose opens with triggering buyer's email as a chip", async ({ page }) => {
    await setupAndOpenDialog(page, { buyers: BUYER_WITH_EMAIL })
    await page.getByTestId("panda-properties-form-tab-trigger--buyers").click()
    await page.getByTestId("property-buyer-panel-quick-email--501").click()

    await expect(page.getByTestId("property-gmail-compose-dialog")).toBeVisible()
    await expect(page.getByTestId("property-gmail-compose-to-chip").first()).toContainText("dhungelashok33@gmail.com")
  })

  // ── Happy path: picking from dropdown adds chip ────────────────────────────

  test("Selecting a different entity from dropdown adds chip to To", async ({ page }) => {
    await setupAndOpenDialog(page, { contacts: CONTACT_WITH_EMAIL })
    await page.getByTestId("panda-properties-form-tab-trigger--contacts").click()
    await expect(page.getByTestId("property-contact-row--601")).toBeVisible()
    await page.getByTestId("property-contact-quick-email--601").click()

    await expect(page.getByTestId("property-gmail-compose-dialog")).toBeVisible()
    await expect(page.getByTestId("property-gmail-compose-to-chip").first()).toContainText("jane@example.com")

    // Open dropdown and pick the owner
    await page.getByTestId("property-gmail-compose-to-text-input").click()
    await expect(page.getByTestId("property-gmail-compose-to-dropdown")).toBeVisible()
    await page.getByTestId("property-gmail-compose-to-option--john@example.com").click()

    await expect(page.getByTestId("property-gmail-compose-to-chip")).toHaveCount(2)
    await expect(page.getByTestId("property-gmail-compose-to-chip").nth(1)).toContainText("john@example.com")
    await expect(page.getByTestId("property-gmail-compose-to-dropdown")).not.toBeVisible()
  })

  test("Selecting a buyer from dropdown adds chip to To", async ({ page }) => {
    await setupAndOpenDialog(page, { contacts: CONTACT_WITH_EMAIL })
    await page.getByTestId("panda-properties-form-tab-trigger--contacts").click()
    await expect(page.getByTestId("property-contact-row--601")).toBeVisible()
    await page.getByTestId("property-contact-quick-email--601").click()

    await page.getByTestId("property-gmail-compose-to-text-input").click()
    await page.getByTestId("property-gmail-compose-to-option--dhungelashok33@gmail.com").click()

    await expect(page.getByTestId("property-gmail-compose-to-chip")).toHaveCount(2)
    await expect(page.getByTestId("property-gmail-compose-to-chip").nth(1)).toContainText("dhungelashok33@gmail.com")
  })

  // ── Happy path: free-text entry accepted ────────────────────────────────────

  test("Typing a custom email address not in the list is accepted as a chip", async ({ page }) => {
    await setupAndOpenDialog(page, { buyers: BUYER_WITH_EMAIL })
    await page.getByTestId("panda-properties-form-tab-trigger--buyers").click()
    await page.getByTestId("property-buyer-panel-quick-email--501").click()

    await expect(page.getByTestId("property-gmail-compose-dialog")).toBeVisible()
    await page.getByTestId("property-gmail-compose-to-text-input").fill("external@example.com")
    await page.getByTestId("property-gmail-compose-to-text-input").press("Enter")

    await expect(page.getByTestId("property-gmail-compose-to-chip")).toHaveCount(2)
    await expect(page.getByTestId("property-gmail-compose-to-chip").nth(1)).toContainText("external@example.com")
  })

  // ── Happy path: type-to-filter narrows the dropdown ─────────────────────────

  test("Typing in the To field narrows dropdown to matching entities", async ({ page }) => {
    await setupAndOpenDialog(page, { contacts: CONTACT_WITH_EMAIL })
    await page.getByTestId("panda-properties-form-tab-trigger--contacts").click()
    await expect(page.getByTestId("property-contact-row--601")).toBeVisible()
    await page.getByTestId("property-contact-quick-email--601").click()

    await expect(page.getByTestId("property-gmail-compose-dialog")).toBeVisible()
    await page.getByTestId("property-gmail-compose-to-text-input").fill("Jane")

    await expect(page.getByTestId("property-gmail-compose-to-dropdown")).toBeVisible()
    await expect(page.getByTestId("property-gmail-compose-to-option--jane@example.com")).toBeVisible()
    await expect(page.getByTestId("property-gmail-compose-to-option--john@example.com")).not.toBeVisible()
    await expect(page.getByTestId("property-gmail-compose-to-option--dhungelashok33@gmail.com")).not.toBeVisible()
    await expect(page.getByTestId("property-gmail-compose-to-option--bob@tenant.com")).not.toBeVisible()
  })

  test("Typing in the To field filters by email substring too", async ({ page }) => {
    await setupAndOpenDialog(page, { contacts: CONTACT_WITH_EMAIL })
    await page.getByTestId("panda-properties-form-tab-trigger--contacts").click()
    await expect(page.getByTestId("property-contact-row--601")).toBeVisible()
    await page.getByTestId("property-contact-quick-email--601").click()

    await expect(page.getByTestId("property-gmail-compose-dialog")).toBeVisible()
    await page.getByTestId("property-gmail-compose-to-text-input").fill("bob@")

    await expect(page.getByTestId("property-gmail-compose-to-option--bob@tenant.com")).toBeVisible()
    await expect(page.getByTestId("property-gmail-compose-to-option--jane@example.com")).not.toBeVisible()
  })

  // ── Edge case: entities without email excluded ──────────────────────────────

  test("Entities with null email address do not appear in the dropdown", async ({ page }) => {
    await setupAndOpenDialog(page, {
      contacts: CONTACT_WITH_EMAIL,
      entityEmails: ENTITY_EMAILS_WITH_NULL,
    })
    await page.getByTestId("panda-properties-form-tab-trigger--contacts").click()
    await expect(page.getByTestId("property-contact-row--601")).toBeVisible()
    await page.getByTestId("property-contact-quick-email--601").click()

    await page.getByTestId("property-gmail-compose-to-text-input").click()
    await expect(page.getByTestId("property-gmail-compose-to-dropdown")).toBeVisible()

    // Only entities with emails appear
    await expect(page.getByTestId("property-gmail-compose-to-option--john@example.com")).toBeVisible()
    await expect(page.getByTestId("property-gmail-compose-to-option--jane@example.com")).toBeVisible()
    // Buyer group header should be absent (no members with email)
    await expect(page.getByTestId("property-gmail-compose-to-group--buyer")).not.toBeVisible()
  })

  // ── Edge case: property with only one entity type ───────────────────────────

  test("Only entity type groups with at least one email-bearing member are shown", async ({ page }) => {
    await setupAndOpenDialog(page, {
      buyers: BUYER_WITH_EMAIL,
      entityEmails: ENTITY_EMAILS_OWNER_ONLY,
    })
    await page.getByTestId("panda-properties-form-tab-trigger--buyers").click()
    await page.getByTestId("property-buyer-panel-quick-email--501").click()

    await page.getByTestId("property-gmail-compose-to-text-input").click()
    await expect(page.getByTestId("property-gmail-compose-to-dropdown")).toBeVisible()

    await expect(page.getByTestId("property-gmail-compose-to-group--owner")).toBeVisible()
    await expect(page.getByTestId("property-gmail-compose-to-group--buyer")).not.toBeVisible()
    await expect(page.getByTestId("property-gmail-compose-to-group--contact")).not.toBeVisible()
    await expect(page.getByTestId("property-gmail-compose-to-group--tenant")).not.toBeVisible()
  })

  // ── Edge case: Tenants tab entry point ─────────────────────────────────────

  test("Tenants tab: compose opens with chip and dropdown works with all entity types", async ({ page }) => {
    await setupAndOpenDialog(page, { tenants: TENANT_WITH_EMAIL })
    await page.getByTestId("panda-properties-form-tab-trigger--tenants").click()
    await page.getByTestId("property-tenant-quick-email--701").click()

    await expect(page.getByTestId("property-gmail-compose-dialog")).toBeVisible()
    await expect(page.getByTestId("property-gmail-compose-to-chip").first()).toContainText("bob@tenant.com")

    await page.getByTestId("property-gmail-compose-to-text-input").click()
    await expect(page.getByTestId("property-gmail-compose-to-dropdown")).toBeVisible()
    await page.getByTestId("property-gmail-compose-to-option--john@example.com").click()
    await expect(page.getByTestId("property-gmail-compose-to-chip")).toHaveCount(2)
    await expect(page.getByTestId("property-gmail-compose-to-chip").nth(1)).toContainText("john@example.com")
  })

  // ── Error / fallback: entity-emails endpoint fails ─────────────────────────

  test("Compose remains functional when entity-emails endpoint returns 500", async ({ page }) => {
    await setupAndOpenDialog(page, {
      buyers: BUYER_WITH_EMAIL,
      entityEmailsStatus: 500,
    })
    await page.getByTestId("panda-properties-form-tab-trigger--buyers").click()
    await page.getByTestId("property-buyer-panel-quick-email--501").click()

    // Dialog must still open
    await expect(page.getByTestId("property-gmail-compose-dialog")).toBeVisible()
    // Pre-filled chip from the panel row must still be present
    await expect(page.getByTestId("property-gmail-compose-to-chip").first()).toContainText("dhungelashok33@gmail.com")
    // Clicking the text input must not crash the dialog
    await page.getByTestId("property-gmail-compose-to-text-input").click()
    await expect(page.getByTestId("property-gmail-compose-dialog")).toBeVisible()
    // Send button must still be enabled (chip is valid)
    await expect(page.getByTestId("property-gmail-compose-send")).toBeEnabled()
  })

  // ── Send uses the selected entity email ────────────────────────────────────

  test("Send uses comma-joined To chips in FormData", async ({ page }) => {
    let sentTo = ""

    await page.route("**/api/admin/gmail/send**", async (route) => {
      const body = await parseFormDataBody(route)
      sentTo = body.to ?? ""
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) })
    })

    await setupAndOpenDialog(page, { contacts: CONTACT_WITH_EMAIL })
    await page.getByTestId("panda-properties-form-tab-trigger--contacts").click()
    await expect(page.getByTestId("property-contact-row--601")).toBeVisible()
    await page.getByTestId("property-contact-quick-email--601").click()

    // Add owner as second To recipient
    await page.getByTestId("property-gmail-compose-to-text-input").click()
    await page.getByTestId("property-gmail-compose-to-option--john@example.com").click()
    await expect(page.getByTestId("property-gmail-compose-to-chip")).toHaveCount(2)

    await page.getByTestId("property-gmail-compose-send").click()
    await expect(page.getByTestId("property-gmail-compose-dialog")).not.toBeVisible()
    expect(sentTo).toBe("jane@example.com,john@example.com")
  })
})
