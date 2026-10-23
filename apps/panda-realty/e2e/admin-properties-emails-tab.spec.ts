import { expect, test } from "@playwright/test"

import { requirePandaE2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import { routePandaPropertiesListDetailAndBuyerOffers } from "./helpers/panda-properties-dialog-mocks"

const THREAD_BUYER: object = {
  threadId: "thread-buyer-001",
  subject: "Re: Property Inspection",
  from: "Ash D <dhungelashok33@gmail.com>",
  date: "2026-04-12T06:00:00.000Z",
  snippet: "We can confirm Thursday at 2pm works for us.",
}

const THREAD_BUYER_2: object = {
  threadId: "thread-buyer-002",
  subject: "Offer Submission",
  from: "Ash D <dhungelashok33@gmail.com>",
  date: "2026-04-08T04:00:00.000Z",
  snippet: "Please find our formal offer attached.",
}

const ENTITY_THREADS_RESPONSE = {
  threads: [THREAD_BUYER, THREAD_BUYER_2],
  hiddenCount: 0,
}

const THREAD_BODY_RESPONSE = {
  messages: [
    {
      messageId: "msg-001",
      from: "Ash D <dhungelashok33@gmail.com>",
      date: "2026-04-12T06:00:00.000Z",
      subject: "Re: Property Inspection",
      body: "We can confirm Thursday at 2pm works for us.",
      attachments: [],
    },
  ],
}

const ENTITY_THREADS_RESPONSE_FILTERED = {
  threads: [THREAD_BUYER],
  hiddenCount: 1,
}

const ENTITY_THREADS_RESPONSE_ALL = {
  threads: [THREAD_BUYER, THREAD_BUYER_2],
  hiddenCount: 0,
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

const BUYERS_WITH_EMAIL = {
  items: [
    {
      propertyEntityId: 501,
      entityId: 201,
      entityName: "Ash D",
      phoneNumber: "0475770513",
      emailAddress: "dhungelashok33@gmail.com",
      address: null,
      buyerPipelineStatusId: null,
      pipelineStatusLabel: "Active Buyers",
    },
  ],
}

const CONTACTS_WITH_EMAIL = {
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

test.describe("Panda Realty admin — property dialog per-entity inbox (mocked APIs)", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaE2eAdminCredentials()
    await page.route("**/api/admin/property-status**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(STATUS_MIN) })
    })
    await page.route("**/api/admin/property-entities**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [], totalCount: 0, limit: 20, totalPages: 0, hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null }) })
    })
    await signInAsAdmin(page)
  })

  test("Emails tab is absent from the property dialog tab strip", async ({ page }) => {
    await routePandaPropertiesListDetailAndBuyerOffers(page)

    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible()
    await page.getByTestId("admin-entity-row--properties--1001").click()

    const dialog = page.getByTestId("admin-entity-crud-dialog--properties")
    await expect(dialog).toBeVisible()

    await expect(page.getByTestId("panda-properties-form-tab-trigger--emails")).not.toBeVisible()
    await expect(page.getByTestId("panda-properties-form-tab-trigger--sales")).toBeVisible()
    await expect(page.getByTestId("panda-properties-form-tab-trigger--buyers")).toBeVisible()
    await expect(page.getByTestId("panda-properties-form-tab-trigger--contacts")).toBeVisible()
    await expect(page.getByTestId("panda-properties-form-tab-trigger--tenants")).toBeVisible()
    await expect(page.getByTestId("panda-properties-form-tab-trigger--files")).toBeVisible()
    await expect(page.getByTestId("panda-properties-form-tab-trigger--forms")).toBeVisible()
  })

  test("Buyers tab: inbox button shown for entities with email, absent for entities without", async ({
    page,
  }) => {
    await routePandaPropertiesListDetailAndBuyerOffers(page)

    await page.route("**/api/admin/properties/1001/buyers**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(BUYERS_WITH_EMAIL),
      })
    })
    await page.route("**/api/admin/properties/1001/contacts**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_PANEL_RESPONSE) })
    })
    await page.route("**/api/admin/properties/1001/tenants**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_PANEL_RESPONSE) })
    })

    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible()
    await page.getByTestId("admin-entity-row--properties--1001").click()
    await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible()

    await page.getByTestId("panda-properties-form-tab-trigger--buyers").click()

    const inboxBtn = page.getByTestId("property-buyer-panel-inbox--501")
    await expect(inboxBtn).toBeVisible()
  })

  test("Buyers tab: inbox button toggles per-entity thread panel lazily", async ({ page }) => {
    await routePandaPropertiesListDetailAndBuyerOffers(page)

    await page.route("**/api/admin/properties/1001/buyers**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(BUYERS_WITH_EMAIL),
      })
    })
    await page.route("**/api/admin/properties/1001/contacts**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_PANEL_RESPONSE) })
    })
    await page.route("**/api/admin/properties/1001/tenants**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_PANEL_RESPONSE) })
    })

    let entityThreadsHitCount = 0
    await page.route("**/api/admin/gmail/property-contact-threads**", async (route) => {
      entityThreadsHitCount++
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(ENTITY_THREADS_RESPONSE),
      })
    })

    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible()
    await page.getByTestId("admin-entity-row--properties--1001").click()
    await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible()

    await page.getByTestId("panda-properties-form-tab-trigger--buyers").click()

    const inboxBtn = page.getByTestId("property-buyer-panel-inbox--501")
    await expect(inboxBtn).toBeVisible()

    // No fetch yet
    expect(entityThreadsHitCount).toBe(0)

    // First click — panel opens; React StrictMode double-invokes effects so 2 hits are expected
    await inboxBtn.click()
    const panel = page.getByTestId("entity-threads-panel")
    await expect(panel).toBeVisible()
    await expect(panel.getByTestId("gmail-thread-row").first()).toBeVisible()
    expect(entityThreadsHitCount).toBe(2)

    // Second click — panel collapses
    await inboxBtn.click()
    await expect(panel).not.toBeVisible()

    // Third click — panel reopens, no additional fetch
    await inboxBtn.click()
    await expect(panel).toBeVisible()
    expect(entityThreadsHitCount).toBe(2)
  })

  test("Contacts tab: inbox button shown for contacts with email, toggles thread panel lazily", async ({ page }) => {
    await routePandaPropertiesListDetailAndBuyerOffers(page)

    await page.route("**/api/admin/properties/1001/buyers**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_PANEL_RESPONSE) })
    })
    await page.route("**/api/admin/properties/1001/contacts**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(CONTACTS_WITH_EMAIL),
      })
    })
    await page.route("**/api/admin/properties/1001/tenants**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_PANEL_RESPONSE) })
    })

    let entityThreadsHitCount = 0
    await page.route("**/api/admin/gmail/property-contact-threads**", async (route) => {
      entityThreadsHitCount++
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(ENTITY_THREADS_RESPONSE),
      })
    })

    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible()
    await page.getByTestId("admin-entity-row--properties--1001").click()
    await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible()

    await page.getByTestId("panda-properties-form-tab-trigger--contacts").click()

    // Contact row visible
    await expect(page.getByTestId("property-contact-row--601")).toBeVisible()

    // Inbox button present
    const inboxBtn = page.getByTestId("property-contact-inbox--601")
    await expect(inboxBtn).toBeVisible()

    // No fetch yet
    expect(entityThreadsHitCount).toBe(0)

    // First click — panel opens; React StrictMode double-invokes effects so 2 hits are expected
    await inboxBtn.click()
    const panel = page.getByTestId("entity-threads-panel")
    await expect(panel).toBeVisible()
    await expect(panel.getByTestId("gmail-thread-row").first()).toBeVisible()
    expect(entityThreadsHitCount).toBe(2)

    // Second click — panel collapses
    await inboxBtn.click()
    await expect(panel).not.toBeVisible()

    // Third click — panel reopens, no additional fetch
    await inboxBtn.click()
    await expect(panel).toBeVisible()
    expect(entityThreadsHitCount).toBe(2)
  })

  test("Contacts tab: filtered threads show hidden count footer with Show all / Filter toggle", async ({ page }) => {
    await routePandaPropertiesListDetailAndBuyerOffers(page)

    await page.route("**/api/admin/properties/1001/buyers**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_PANEL_RESPONSE) })
    })
    await page.route("**/api/admin/properties/1001/contacts**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(CONTACTS_WITH_EMAIL),
      })
    })
    await page.route("**/api/admin/properties/1001/tenants**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_PANEL_RESPONSE) })
    })

    // First call returns filtered result (1 hidden), second call (showAll=true) returns all
    let callCount = 0
    await page.route("**/api/admin/gmail/property-contact-threads**", async (route) => {
      callCount++
      const url = route.request().url()
      const isShowAll = url.includes("showAll=true")
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(isShowAll ? ENTITY_THREADS_RESPONSE_ALL : ENTITY_THREADS_RESPONSE_FILTERED),
      })
    })

    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible()
    await page.getByTestId("admin-entity-row--properties--1001").click()
    await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible()
    await page.getByTestId("panda-properties-form-tab-trigger--contacts").click()

    const inboxBtn = page.getByTestId("property-contact-inbox--601")
    await expect(inboxBtn).toBeVisible()
    await inboxBtn.click()

    const panel = page.getByTestId("entity-threads-panel")
    await expect(panel).toBeVisible()
    await expect(panel.getByTestId("gmail-thread-row").first()).toBeVisible()

    // Footer: "1 older thread hidden" and "Show all" button
    await expect(panel.getByText(/1 older thread hidden/)).toBeVisible()
    const showAllBtn = panel.getByRole("button", { name: "Show all" })
    await expect(showAllBtn).toBeVisible()

    // Click "Show all" → re-fetches with showAll=true, both threads appear
    await showAllBtn.click()
    await expect(panel.getByTestId("gmail-thread-row")).toHaveCount(2)

    // Footer switches to "Showing all threads" + "Filter to this property" button
    await expect(panel.getByText(/Showing all threads/)).toBeVisible()
    const filterBtn = panel.getByRole("button", { name: "Filter to this property" })
    await expect(filterBtn).toBeVisible()

    // Click "Filter to this property" → re-fetches with showAll=false
    await filterBtn.click()
    await expect(panel.getByTestId("gmail-thread-row")).toHaveCount(1)
    await expect(panel.getByText(/1 older thread hidden/)).toBeVisible()

    expect(callCount).toBe(4) // StrictMode double initial (2) + showAll (1) + filter back (1)
  })

  test("Buyers tab: reply from within property context passes propertyListId to Gmail reply endpoint", async ({ page }) => {
    await routePandaPropertiesListDetailAndBuyerOffers(page)

    await page.route("**/api/admin/properties/1001/buyers**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(BUYERS_WITH_EMAIL) })
    })
    await page.route("**/api/admin/properties/1001/contacts**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_PANEL_RESPONSE) })
    })
    await page.route("**/api/admin/properties/1001/tenants**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_PANEL_RESPONSE) })
    })
    await page.route("**/api/admin/gmail/property-contact-threads**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ threads: [THREAD_BUYER], hiddenCount: 0 }),
      })
    })
    await page.route("**/api/admin/gmail/threads/body**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(THREAD_BODY_RESPONSE),
      })
    })
    await page.route("**/api/admin/properties/1001/entity-emails**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [] }) })
    })
    await page.route("**/api/admin/email-signatures**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [] }) })
    })

    let replyBody = ""
    await page.route("**/api/admin/gmail/reply**", async (route) => {
      replyBody = route.request().postData() ?? ""
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) })
    })

    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible()
    await page.getByTestId("admin-entity-row--properties--1001").click()
    await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible()
    await page.getByTestId("panda-properties-form-tab-trigger--buyers").click()

    const inboxBtn = page.getByTestId("property-buyer-panel-inbox--501")
    await expect(inboxBtn).toBeVisible()
    await inboxBtn.click()

    const panel = page.getByTestId("entity-threads-panel")
    await expect(panel).toBeVisible()
    await expect(panel.getByTestId("gmail-thread-row").first()).toBeVisible()

    // Expand the thread to reveal message blocks
    await panel.getByTestId("gmail-thread-row").first().click()
    const messageBlock = panel.getByTestId("gmail-thread-message--msg-001")
    await expect(messageBlock).toBeVisible()

    // Click Reply — compose dialog opens in inline mode
    await panel.getByTestId("gmail-thread-reply--msg-001").click()
    const backdrop = page.getByTestId("property-gmail-compose-backdrop")
    await expect(backdrop).toBeVisible()

    // Send button should be enabled (to is pre-filled from reply context)
    const sendBtn = page.getByTestId("property-gmail-compose-send")
    await expect(sendBtn).toBeEnabled()
    await sendBtn.click()

    // Compose closes on success
    await expect(backdrop).not.toBeVisible()

    // propertyListId must be in the FormData sent to the reply endpoint
    expect(replyBody).toContain('name="propertyListId"')
    expect(replyBody).toContain("1001")
  })
})
