import { expect, test } from "@playwright/test"

import { requirePandaE2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import { routePandaPropertiesListDetailAndBuyerOffers } from "./helpers/panda-properties-dialog-mocks"

const THREAD_MEMBER: object = {
  threadId: "thread-member-001",
  subject: "RE: Inspection Report",
  from: "Nathan Rose <nathan@njroselawyers.com.au>",
  date: "2026-05-10T06:00:00.000Z",
  snippet: "Please find the inspection report attached.",
}

const ENTITY_THREADS_RESPONSE = { threads: [THREAD_MEMBER] }
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

const CONTACT_WITH_ENTITY_ID = {
  items: [
    {
      propertyEntityId: 601,
      entityId: 301,
      entityName: "NJ Rose Lawyers",
      phoneNumber: "07 3495 0299",
      emailAddress: "info@njroselawyers.com.au",
      address: null,
      contactCategoryName: "Solicitor",
      association: "Buyer",
    },
  ],
}

const BUYER_WITH_ENTITY_ID = {
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

test.describe("Panda Realty admin — entity inbox calls threads-by-entity endpoint", () => {
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

  test("Contacts tab: inbox calls /threads-by-entity?entityId and shows threads", async ({ page }) => {
    await routePandaPropertiesListDetailAndBuyerOffers(page)

    await page.route("**/api/admin/properties/1001/buyers**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_PANEL_RESPONSE) })
    })
    await page.route("**/api/admin/properties/1001/contacts**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(CONTACT_WITH_ENTITY_ID) })
    })
    await page.route("**/api/admin/properties/1001/tenants**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_PANEL_RESPONSE) })
    })

    let threadsByEntityUrl: string | null = null
    let oldThreadsEmailHit = false

    await page.route("**/api/admin/gmail/threads-by-entity**", async (route) => {
      threadsByEntityUrl = route.request().url()
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(ENTITY_THREADS_RESPONSE) })
    })
    await page.route("**/api/admin/gmail/threads?email=**", async (route) => {
      oldThreadsEmailHit = true
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ threads: [] }) })
    })

    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible()
    await page.getByTestId("admin-entity-row--properties--1001").click()
    await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible()

    await page.getByTestId("panda-properties-form-tab-trigger--contacts").click()
    await expect(page.getByTestId("property-contact-row--601")).toBeVisible()

    const inboxBtn = page.getByTestId("property-contact-inbox--601")
    await expect(inboxBtn).toBeVisible()

    await inboxBtn.click()
    const panel = page.getByTestId("entity-threads-panel")
    await expect(panel).toBeVisible()
    await expect(panel.getByTestId("gmail-thread-row").first()).toBeVisible()

    // Must have called threads-by-entity with the entityId, not the old email endpoint
    expect(threadsByEntityUrl).toMatch(/threads-by-entity\?entityId=301/)
    expect(oldThreadsEmailHit).toBe(false)
  })

  test("Buyers tab: inbox calls /threads-by-entity?entityId and shows threads", async ({ page }) => {
    await routePandaPropertiesListDetailAndBuyerOffers(page)

    await page.route("**/api/admin/properties/1001/buyers**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(BUYER_WITH_ENTITY_ID) })
    })
    await page.route("**/api/admin/properties/1001/contacts**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_PANEL_RESPONSE) })
    })
    await page.route("**/api/admin/properties/1001/tenants**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_PANEL_RESPONSE) })
    })

    let threadsByEntityUrl: string | null = null
    let oldThreadsEmailHit = false

    await page.route("**/api/admin/gmail/threads-by-entity**", async (route) => {
      threadsByEntityUrl = route.request().url()
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(ENTITY_THREADS_RESPONSE) })
    })
    await page.route("**/api/admin/gmail/threads?email=**", async (route) => {
      oldThreadsEmailHit = true
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ threads: [] }) })
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

    expect(threadsByEntityUrl).toMatch(/threads-by-entity\?entityId=201/)
    expect(oldThreadsEmailHit).toBe(false)
  })
})
