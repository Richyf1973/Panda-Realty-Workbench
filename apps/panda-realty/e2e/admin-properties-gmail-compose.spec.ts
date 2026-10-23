import { expect, test } from "@playwright/test"

import { requirePandaE2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import { routePandaPropertiesListDetailAndBuyerOffers } from "./helpers/panda-properties-dialog-mocks"
import { parseFormDataBody } from "./helpers/panda-properties-gmail-helpers"

// Property mock address → "12 Test Street, Testville" (from PROPERTY_EDIT_FAVORITE fixture)
const EXPECTED_SUBJECT = "12 Test Street, Testville"

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

const BUYER_WITHOUT_EMAIL = {
  items: [
    {
      propertyEntityId: 502,
      entityId: 202,
      entityName: "No Email Buyer",
      phoneNumber: "0400000001",
      emailAddress: null,
      address: null,
      esuburb: null,
      estate: null,
      epostcode: null,
      notes: null,
      buyerPipelineStatusId: null,
      pipelineStatusLabel: null,
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

const EMPTY_PANEL_RESPONSE = { items: [] }

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

test.describe("Panda Realty — gmail compose dialog (mocked APIs)", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaE2eAdminCredentials()
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
    await signInAsAdmin(page)
  })

  // Register general property mock first, then panel-specific routes (LIFO: last registered = first matched)
  async function setupAndOpenDialog(
    page: Parameters<typeof routePandaPropertiesListDetailAndBuyerOffers>[0],
    opts: {
      buyers?: object
      contacts?: object
      tenants?: object
    } = {},
  ) {
    await routePandaPropertiesListDetailAndBuyerOffers(page)
    // Panel routes registered after the general handler so they are matched first (LIFO)
    await page.route("**/api/admin/properties/1001/buyers**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(opts.buyers ?? EMPTY_PANEL_RESPONSE) })
    })
    await page.route("**/api/admin/properties/1001/contacts**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(opts.contacts ?? EMPTY_PANEL_RESPONSE) })
    })
    await page.route("**/api/admin/properties/1001/tenants**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(opts.tenants ?? EMPTY_PANEL_RESPONSE) })
    })
    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible()
    await page.getByTestId("admin-entity-row--properties--1001").click()
    await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible()
  }

  // ── Happy path — Buyer row ────────────────────────────────────────────────

  test("Buyers tab: mail icon opens compose dialog pre-filled with buyer email, property subject, and greeting", async ({ page }) => {
    await setupAndOpenDialog(page, { buyers: BUYER_WITH_EMAIL })
    await page.getByTestId("panda-properties-form-tab-trigger--buyers").click()

    await page.getByTestId("property-buyer-panel-quick-email--501").click()

    const dialog = page.getByTestId("property-gmail-compose-dialog")
    await expect(dialog).toBeVisible()

    await expect(page.getByTestId("property-gmail-compose-to")).toHaveValue("dhungelashok33@gmail.com")
    await expect(page.getByTestId("property-gmail-compose-subject")).toHaveValue(EXPECTED_SUBJECT)
    await expect(page.getByTestId("property-gmail-compose-editor")).toContainText("Dear Ash D,")
  })

  test("Buyers tab: cancel closes compose dialog without calling send API", async ({ page }) => {
    let sendHitCount = 0
    await page.route("**/api/admin/gmail/send**", async (route) => {
      sendHitCount++
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) })
    })

    await setupAndOpenDialog(page, { buyers: BUYER_WITH_EMAIL })
    await page.getByTestId("panda-properties-form-tab-trigger--buyers").click()
    await page.getByTestId("property-buyer-panel-quick-email--501").click()

    await expect(page.getByTestId("property-gmail-compose-dialog")).toBeVisible()
    await page.getByTestId("property-gmail-compose-cancel").click()

    await expect(page.getByTestId("property-gmail-compose-dialog")).not.toBeVisible()
    expect(sendHitCount).toBe(0)
  })

  test("Buyers tab: Send button posts to /api/admin/gmail/send and closes dialog on success", async ({ page }) => {
    let sentBody: unknown = null
    await page.route("**/api/admin/gmail/send**", async (route) => {
      sentBody = await parseFormDataBody(route)
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) })
    })

    await setupAndOpenDialog(page, { buyers: BUYER_WITH_EMAIL })
    await page.getByTestId("panda-properties-form-tab-trigger--buyers").click()
    await page.getByTestId("property-buyer-panel-quick-email--501").click()

    await expect(page.getByTestId("property-gmail-compose-dialog")).toBeVisible()
    await page.getByTestId("property-gmail-compose-send").click()

    await expect(page.getByTestId("property-gmail-compose-status-success")).toBeVisible()
    expect((sentBody as Record<string, unknown>)?.to).toBe("dhungelashok33@gmail.com")
  })

  // ── Edge cases ────────────────────────────────────────────────────────────

  test("Buyers tab: mail icon is disabled (not clickable) for buyer with no email address", async ({ page }) => {
    await setupAndOpenDialog(page, { buyers: BUYER_WITHOUT_EMAIL })
    await page.getByTestId("panda-properties-form-tab-trigger--buyers").click()

    await expect(page.getByTestId("property-buyer-panel-row--502")).toBeVisible()
    await expect(page.getByTestId("property-buyer-panel-quick-email--502")).toBeDisabled()
  })

  // ── Error / rejection states ──────────────────────────────────────────────

  test("Buyers tab: send failure shows inline error and keeps dialog open", async ({ page }) => {
    await page.route("**/api/admin/gmail/send**", async (route) => {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: "Gmail is not connected. Please connect your Google account." }),
      })
    })

    await setupAndOpenDialog(page, { buyers: BUYER_WITH_EMAIL })
    await page.getByTestId("panda-properties-form-tab-trigger--buyers").click()
    await page.getByTestId("property-buyer-panel-quick-email--501").click()

    await expect(page.getByTestId("property-gmail-compose-dialog")).toBeVisible()
    await page.getByTestId("property-gmail-compose-send").click()

    await expect(page.getByTestId("property-gmail-compose-error")).toBeVisible()
    await expect(page.getByTestId("property-gmail-compose-error")).toContainText(/unavailable|try again/i)
    await expect(page.getByTestId("property-gmail-compose-dialog")).toBeVisible()
  })

  // ── Contact row ───────────────────────────────────────────────────────────

  test("Contacts tab: mail icon opens compose dialog pre-filled with contact email, property subject, and greeting", async ({ page }) => {
    await setupAndOpenDialog(page, { contacts: CONTACT_WITH_EMAIL })
    await page.getByTestId("panda-properties-form-tab-trigger--contacts").click()

    await expect(page.getByTestId("property-contact-row--601")).toBeVisible()
    await page.getByTestId("property-contact-quick-email--601").click()

    const dialog = page.getByTestId("property-gmail-compose-dialog")
    await expect(dialog).toBeVisible()

    await expect(page.getByTestId("property-gmail-compose-to")).toHaveValue("jane@example.com")
    await expect(page.getByTestId("property-gmail-compose-subject")).toHaveValue(EXPECTED_SUBJECT)
    await expect(page.getByTestId("property-gmail-compose-editor")).toContainText("Dear Jane Smith,")
  })

  // ── Tenant row ────────────────────────────────────────────────────────────

  test("Tenants tab: mail icon opens compose dialog pre-filled with tenant email, property subject, and greeting", async ({ page }) => {
    await setupAndOpenDialog(page, { tenants: TENANT_WITH_EMAIL })
    await page.getByTestId("panda-properties-form-tab-trigger--tenants").click()

    await page.getByTestId("property-tenant-quick-email--701").click()

    const dialog = page.getByTestId("property-gmail-compose-dialog")
    await expect(dialog).toBeVisible()

    await expect(page.getByTestId("property-gmail-compose-to")).toHaveValue("bob@tenant.com")
    await expect(page.getByTestId("property-gmail-compose-subject")).toHaveValue(EXPECTED_SUBJECT)
    await expect(page.getByTestId("property-gmail-compose-editor")).toContainText("Dear Bob Tenant,")
  })
})
