import { expect, test } from "@playwright/test"

import { requirePandaE2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import {
  MOCK_PROPERTY_ID,
  routePandaPropertiesListDetailAndBuyerOffers,
} from "./helpers/panda-properties-dialog-mocks"

// ─── Fixtures ───────────────────────────────────────────────────────────────

const ENTITY_ID = 301
const PROPERTY_ENTITY_ID = 601

const MEMBER_THREAD = {
  threadId: "thread-member-001",
  subject: "RE: Sale - Taylor to Matthews",
  from: "Shannon Bland <shannon@njroselawyers.com.au>",
  date: "2026-05-18T10:00:00.000Z",
  snippet: "Please find attached the signed contract.",
}

const THREADS_WITH_HIDDEN = { threads: [MEMBER_THREAD], hiddenCount: 1 }
const THREADS_SHOW_ALL = {
  threads: [
    MEMBER_THREAD,
    {
      threadId: "thread-002",
      subject: "Earlier inquiry",
      from: "shannon@njroselawyers.com.au",
      date: "2026-04-01T10:00:00.000Z",
      snippet: "Just following up.",
    },
  ],
  hiddenCount: 0,
}
const THREADS_EMPTY = { threads: [], hiddenCount: 0 }

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

const CONTACT_ROW = {
  propertyEntityId: PROPERTY_ENTITY_ID,
  entityId: ENTITY_ID,
  entityName: "NJ Rose Lawyers",
  phoneNumber: "07 3495 0299",
  emailAddress: "info@njroselawyers.com.au",
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
      memberName: "Shannon Bland",
      memberPhoneNumber: "0437 261 860",
      memberEmailAddress: "shannon@njroselawyers.com.au",
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
  totalCount: 1,
  limit: 200,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false,
  startCursor: null,
  endCursor: null,
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function openEditContactDialog(page: import("@playwright/test").Page) {
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

test.describe("Panda Realty — contact dialog: general correspondence inbox", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaE2eAdminCredentials()
    await page.route("**/api/admin/property-status**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(STATUS_MIN) })
    })
    await page.route("**/api/admin/property-entities**", async (route) => {
      const url = route.request().url()
      if (url.includes(`entityId=${ENTITY_ID}`)) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(CONNECTIONS_WITH_PRIMARY),
        })
        return
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: [], totalCount: 0, limit: 20, totalPages: 0, hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null }),
      })
    })
    await page.route(`**/api/admin/entity-members**`, async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MEMBERS_RESPONSE) })
    })
    await signInAsAdmin(page)
  })

  // ── Happy path ──────────────────────────────────────────────────────────────

  test("general inbox toggle calls threads-by-entity and shows threads", async ({ page }) => {
    await routePandaPropertiesListDetailAndBuyerOffers(page)

    await page.route("**/api/admin/properties/1001/contacts**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(CONTACTS_RESPONSE) })
    })
    await page.route("**/api/admin/properties/1001/buyers**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_PANEL) })
    })
    await page.route("**/api/admin/properties/1001/tenants**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_PANEL) })
    })

    let threadsByEntityUrl: string | null = null
    let oldEmailEndpointHit = false

    await page.route("**/api/admin/gmail/threads-by-entity**", async (route) => {
      threadsByEntityUrl = route.request().url()
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(THREADS_WITH_HIDDEN) })
    })
    await page.route("**/api/admin/gmail/threads?email=**", async (route) => {
      oldEmailEndpointHit = true
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(THREADS_EMPTY) })
    })

    await openEditContactDialog(page)

    const dialog = page.getByTestId("property-contact-dialog")
    const generalInboxBtn = dialog.getByTestId("contact-members-panel-general-inbox")
    await expect(generalInboxBtn).toBeVisible()
    await expect(generalInboxBtn).toBeEnabled()

    await generalInboxBtn.click()

    const panel = dialog.getByTestId("entity-threads-panel")
    await expect(panel).toBeVisible()
    await expect(panel.getByTestId("gmail-thread-row").first()).toBeVisible()

    // Must call threads-by-entity with the contact's entityId
    expect(threadsByEntityUrl).toMatch(new RegExp(`threads-by-entity.*entityId=${ENTITY_ID}`))
    expect(oldEmailEndpointHit).toBe(false)
  })

  test("general inbox shows hidden-threads control when hiddenCount > 0 and show all expands", async ({ page }) => {
    await routePandaPropertiesListDetailAndBuyerOffers(page)

    await page.route("**/api/admin/properties/1001/contacts**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(CONTACTS_RESPONSE) })
    })
    await page.route("**/api/admin/properties/1001/buyers**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_PANEL) })
    })
    await page.route("**/api/admin/properties/1001/tenants**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_PANEL) })
    })

    let showAllRequested = false

    await page.route("**/api/admin/gmail/threads-by-entity**", async (route) => {
      const url = route.request().url()
      const isShowAll = url.includes("showAll=true")
      showAllRequested = showAllRequested || isShowAll
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(isShowAll ? THREADS_SHOW_ALL : THREADS_WITH_HIDDEN),
      })
    })

    await openEditContactDialog(page)

    const dialog = page.getByTestId("property-contact-dialog")
    await dialog.getByTestId("contact-members-panel-general-inbox").click()

    const panel = dialog.getByTestId("entity-threads-panel")
    await expect(panel).toBeVisible()

    // "1 older thread hidden · Show all" control
    await expect(panel.getByText(/older thread.*hidden/i)).toBeVisible()
    const showAllLink = panel.getByRole("button", { name: /show all/i })
    await expect(showAllLink).toBeVisible()

    await showAllLink.click()
    expect(showAllRequested).toBe(true)
    await expect(panel.getByText(/showing all threads/i)).toBeVisible()
  })

  test("general inbox toggle collapses when clicked again", async ({ page }) => {
    await routePandaPropertiesListDetailAndBuyerOffers(page)

    await page.route("**/api/admin/properties/1001/contacts**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(CONTACTS_RESPONSE) })
    })
    await page.route("**/api/admin/properties/1001/buyers**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_PANEL) })
    })
    await page.route("**/api/admin/properties/1001/tenants**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_PANEL) })
    })
    await page.route("**/api/admin/gmail/threads-by-entity**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(THREADS_EMPTY) })
    })

    await openEditContactDialog(page)

    const dialog = page.getByTestId("property-contact-dialog")
    const generalInboxBtn = dialog.getByTestId("contact-members-panel-general-inbox")
    const panel = dialog.getByTestId("entity-threads-panel")

    await generalInboxBtn.click()
    await expect(panel).toBeVisible()

    await generalInboxBtn.click()
    await expect(panel).toBeHidden()
  })

  // ── Edge cases ──────────────────────────────────────────────────────────────

  test("general inbox toggle is visible but disabled in create mode", async ({ page }) => {
    await routePandaPropertiesListDetailAndBuyerOffers(page)

    await page.route("**/api/admin/properties/1001/contacts**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_PANEL) })
    })
    await page.route("**/api/admin/properties/1001/buyers**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_PANEL) })
    })
    await page.route("**/api/admin/properties/1001/tenants**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_PANEL) })
    })

    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible()
    await page.getByTestId(`admin-entity-row--properties--${MOCK_PROPERTY_ID}`).click()
    await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible()
    await page.getByTestId("panda-properties-form-tab-trigger--contacts").click()
    await page.getByTestId("property-contacts-add-new").click()

    const dialog = page.getByTestId("property-contact-dialog")
    await expect(dialog).toBeVisible()

    const generalInboxBtn = dialog.getByTestId("contact-members-panel-general-inbox")
    await expect(generalInboxBtn).toBeVisible()
    await expect(generalInboxBtn).toBeDisabled()
  })

  test("per-member inbox toggles are unaffected — still use member email", async ({ page }) => {
    await routePandaPropertiesListDetailAndBuyerOffers(page)

    await page.route("**/api/admin/properties/1001/contacts**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(CONTACTS_RESPONSE) })
    })
    await page.route("**/api/admin/properties/1001/buyers**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_PANEL) })
    })
    await page.route("**/api/admin/properties/1001/tenants**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_PANEL) })
    })

    let memberPropertyContactThreadsHit = false
    let threadsByEntityHitCount = 0

    await page.route("**/api/admin/gmail/threads-by-entity**", async (route) => {
      threadsByEntityHitCount++
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(THREADS_EMPTY) })
    })
    // Member rows have propertyListId → they route to property-contact-threads, not threads-by-entity
    await page.route("**/api/admin/gmail/property-contact-threads**", async (route) => {
      memberPropertyContactThreadsHit = true
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(THREADS_EMPTY) })
    })

    await openEditContactDialog(page)

    const dialog = page.getByTestId("property-contact-dialog")
    await expect(dialog.locator('[data-testid^="contact-member-row--"]').first()).toBeVisible()

    const memberInboxBtn = dialog.locator('[data-testid^="contact-member-inbox--"]').first()
    await expect(memberInboxBtn).toBeVisible()
    await expect(memberInboxBtn).toBeEnabled()

    await memberInboxBtn.click()

    // Member toggle must use property-contact-threads (email + propertyListId), not threads-by-entity
    expect(memberPropertyContactThreadsHit).toBe(true)
    expect(threadsByEntityHitCount).toBe(0)
  })

  // ── Error state ─────────────────────────────────────────────────────────────

  test("general inbox shows error message when threads-by-entity fails", async ({ page }) => {
    await routePandaPropertiesListDetailAndBuyerOffers(page)

    await page.route("**/api/admin/properties/1001/contacts**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(CONTACTS_RESPONSE) })
    })
    await page.route("**/api/admin/properties/1001/buyers**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_PANEL) })
    })
    await page.route("**/api/admin/properties/1001/tenants**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_PANEL) })
    })
    await page.route("**/api/admin/gmail/threads-by-entity**", async (route) => {
      await route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "Failed to load email threads — please try again" }) })
    })

    await openEditContactDialog(page)

    const dialog = page.getByTestId("property-contact-dialog")
    await dialog.getByTestId("contact-members-panel-general-inbox").click()

    const panel = dialog.getByTestId("entity-threads-panel")
    await expect(panel).toBeVisible()
    await expect(panel.getByText(/failed to load|error/i)).toBeVisible()
  })
})
