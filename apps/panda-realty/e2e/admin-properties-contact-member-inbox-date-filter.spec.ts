import { expect, test } from "@playwright/test"

import { requirePandaE2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import {
  MOCK_PROPERTY_ID,
  routePandaPropertiesListDetailAndBuyerOffers,
} from "./helpers/panda-properties-dialog-mocks"

// ─── Fixtures ────────────────────────────────────────────────────────────────

const ENTITY_ID = 301
const PROPERTY_ENTITY_ID = 601

const THREAD_RECENT = {
  threadId: "thread-recent-001",
  subject: "RE: SALE : 12/176 TORRENS ROAD Caboolture South Qld 4510",
  from: "Megumi Hara - GKS Law <meg@gkslaw.com.au>",
  date: "2026-05-18T10:00:00.000Z",
  snippet: "Please find attached the signed contract.",
}

const THREAD_OLD = {
  threadId: "thread-old-001",
  subject: "Villa 12, 176 Torrens Road, Caboolture South Q (Manufactured Home)",
  from: "Megumi Hara - GKS Law <meg@gkslaw.com.au>",
  date: "2025-01-01T10:00:00.000Z",
  snippet: "Earlier inquiry before property was linked.",
}

const THREADS_WITH_HIDDEN = { threads: [THREAD_RECENT], hiddenCount: 1 }
const THREADS_SHOW_ALL = { threads: [THREAD_RECENT, THREAD_OLD], hiddenCount: 0 }
const THREADS_EMPTY = { threads: [], hiddenCount: 0 }

const STATUS_MIN = {
  items: [{ propertyStatusId: 1, propertyStatusCode: "ACTIVE", propertyStatus: "Active" }],
  totalCount: 1, limit: 100, totalPages: 1,
  hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null,
}

const CONTACT_ROW = {
  propertyEntityId: PROPERTY_ENTITY_ID,
  entityId: ENTITY_ID,
  entityName: "GKS Law",
  phoneNumber: "1800457529",
  emailAddress: "mail@gkslaw.com.au",
  address: null,
  contactCategoryName: "Solicitor",
  association: "Buyer",
}

const CONTACTS_RESPONSE = { items: [CONTACT_ROW] }
const EMPTY_PANEL = { items: [] }

const MEMBERS_RESPONSE = {
  items: [
    {
      entityMemberId: 1001,
      entityId: ENTITY_ID,
      memberName: "Megumi Hara",
      memberPhoneNumber: null,
      memberEmailAddress: "meg@gkslaw.com.au",
    },
  ],
}

const CONNECTIONS_WITH_PRIMARY = {
  items: [
    {
      propertyEntityId: PROPERTY_ENTITY_ID,
      entityId: ENTITY_ID,
      propertyListId: MOCK_PROPERTY_ID,
      propertyEntityNote: null,
      buyerPipelineStatusId: null,
      isOriginalOwner: false,
    },
  ],
  totalCount: 1, limit: 200, totalPages: 1,
  hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null,
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function openContactDialog(page: import("@playwright/test").Page) {
  await page.goto("/admin/properties")
  await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible()
  await page.getByTestId(`admin-entity-row--properties--${MOCK_PROPERTY_ID}`).click()
  await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible()
  await page.getByTestId("panda-properties-form-tab-trigger--contacts").click()
  await expect(page.getByTestId(`property-contact-row--${PROPERTY_ENTITY_ID}`)).toBeVisible()
  await page.getByTestId(`property-contact-edit--${PROPERTY_ENTITY_ID}`).click()
  await expect(page.getByTestId("property-contact-dialog")).toBeVisible()
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe("Panda Realty — contact member inbox: date-based filtering", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaE2eAdminCredentials()
    await page.route("**/api/admin/property-status**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(STATUS_MIN) })
    })
    await page.route("**/api/admin/property-entities**", async (route) => {
      const url = route.request().url()
      if (url.includes(`entityId=${ENTITY_ID}`)) {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(CONNECTIONS_WITH_PRIMARY) })
        return
      }
      await route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify({ items: [], totalCount: 0, limit: 20, totalPages: 0, hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null }),
      })
    })
    await page.route("**/api/admin/entity-members**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MEMBERS_RESPONSE) })
    })
    await page.route("**/api/admin/properties/1001/buyers**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_PANEL) })
    })
    await page.route("**/api/admin/properties/1001/tenants**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_PANEL) })
    })
    await signInAsAdmin(page)
  })

  // ── propertyEntityId forwarded in URL ────────────────────────────────────

  test("member inbox request includes propertyEntityId param", async ({ page }) => {
    await routePandaPropertiesListDetailAndBuyerOffers(page)

    await page.route("**/api/admin/properties/1001/contacts**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(CONTACTS_RESPONSE) })
    })

    let capturedUrl: string | null = null
    await page.route("**/api/admin/gmail/property-contact-threads**", async (route) => {
      capturedUrl = route.request().url()
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(THREADS_EMPTY) })
    })

    await openContactDialog(page)

    const dialog = page.getByTestId("property-contact-dialog")
    const memberInboxBtn = dialog.locator('[data-testid^="contact-member-inbox--"]').first()
    await expect(memberInboxBtn).toBeVisible()
    await expect(memberInboxBtn).toBeEnabled()
    await memberInboxBtn.click()

    await expect(dialog.getByTestId("entity-threads-panel")).toBeVisible()
    expect(capturedUrl).toMatch(new RegExp(`propertyEntityId=${PROPERTY_ENTITY_ID}`))
  })

  // ── hidden threads banner ─────────────────────────────────────────────────

  test("member inbox shows 'older thread hidden' banner when hiddenCount > 0", async ({ page }) => {
    await routePandaPropertiesListDetailAndBuyerOffers(page)

    await page.route("**/api/admin/properties/1001/contacts**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(CONTACTS_RESPONSE) })
    })

    await page.route("**/api/admin/gmail/property-contact-threads**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(THREADS_WITH_HIDDEN) })
    })

    await openContactDialog(page)

    const dialog = page.getByTestId("property-contact-dialog")
    await dialog.locator('[data-testid^="contact-member-inbox--"]').first().click()

    const panel = dialog.getByTestId("entity-threads-panel")
    await expect(panel).toBeVisible()
    await expect(panel.getByTestId("gmail-thread-row").first()).toBeVisible()
    await expect(panel.getByText(/older thread.*hidden/i)).toBeVisible()
  })

  // ── show all ──────────────────────────────────────────────────────────────

  test("clicking 'Show all' re-requests with showAll=true and shows all threads", async ({ page }) => {
    await routePandaPropertiesListDetailAndBuyerOffers(page)

    await page.route("**/api/admin/properties/1001/contacts**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(CONTACTS_RESPONSE) })
    })

    let showAllRequested = false
    await page.route("**/api/admin/gmail/property-contact-threads**", async (route) => {
      const url = route.request().url()
      showAllRequested = showAllRequested || url.includes("showAll=true")
      await route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify(url.includes("showAll=true") ? THREADS_SHOW_ALL : THREADS_WITH_HIDDEN),
      })
    })

    await openContactDialog(page)

    const dialog = page.getByTestId("property-contact-dialog")
    await dialog.locator('[data-testid^="contact-member-inbox--"]').first().click()

    const panel = dialog.getByTestId("entity-threads-panel")
    await expect(panel.getByText(/older thread.*hidden/i)).toBeVisible()

    await panel.getByRole("button", { name: /show all/i }).click()

    expect(showAllRequested).toBe(true)
    await expect(panel.getByText(/showing all threads/i)).toBeVisible()
  })

  // ── no hidden threads when all are recent ────────────────────────────────

  test("no hidden-threads banner when all threads are within the cutoff", async ({ page }) => {
    await routePandaPropertiesListDetailAndBuyerOffers(page)

    await page.route("**/api/admin/properties/1001/contacts**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(CONTACTS_RESPONSE) })
    })

    await page.route("**/api/admin/gmail/property-contact-threads**", async (route) => {
      await route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify({ threads: [THREAD_RECENT], hiddenCount: 0 }),
      })
    })

    await openContactDialog(page)

    const dialog = page.getByTestId("property-contact-dialog")
    await dialog.locator('[data-testid^="contact-member-inbox--"]').first().click()

    const panel = dialog.getByTestId("entity-threads-panel")
    await expect(panel).toBeVisible()
    await expect(panel.getByTestId("gmail-thread-row").first()).toBeVisible()
    await expect(panel.getByText(/older thread.*hidden/i)).not.toBeVisible()
  })
})
