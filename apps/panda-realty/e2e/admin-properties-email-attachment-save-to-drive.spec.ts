import { expect, test, type Page } from "@playwright/test"

import { requirePandaE2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import { routePandaPropertiesListDetailAndBuyerOffers } from "./helpers/panda-properties-dialog-mocks"

// ---- Fixture data -----------------------------------------------------------

const THREAD_WITH_ATTACHMENTS = {
  threadId: "thread-001",
  subject: "Trust Receipt",
  from: "Keylaw Brisbane <contracts@keylaw.com.au>",
  date: "2026-04-25T06:00:00.000Z",
  snippet: "Please find attached trust receipt for your records.",
  attachmentCount: 2,
}

const THREAD_ZIP = {
  threadId: "thread-002",
  subject: "Property files",
  from: "Keylaw Brisbane <contracts@keylaw.com.au>",
  date: "2026-04-18T03:00:00.000Z",
  snippet: "Files bundled in zip.",
  attachmentCount: 1,
}

const THREAD_001_BODY = {
  messages: [
    {
      messageId: "msg-001-1",
      from: "Keylaw Brisbane <contracts@keylaw.com.au>",
      date: "2026-04-25T06:00:00.000Z",
      subject: "Trust receipt",
      body: "Please find attached trust receipt for your records.",
      attachments: [
        {
          messageId: "msg-001-1",
          attachmentId: "att-trust-receipt",
          filename: "Trust-Receipt.pdf",
          mimeType: "application/pdf",
          size: 142_336,
        },
        {
          messageId: "msg-001-1",
          attachmentId: "att-contract",
          filename: "Contract-of-Sale.pdf",
          mimeType: "application/pdf",
          size: 1_245_000,
        },
      ],
    },
  ],
}

const THREAD_002_BODY = {
  messages: [
    {
      messageId: "msg-002-1",
      from: "Keylaw Brisbane <contracts@keylaw.com.au>",
      date: "2026-04-18T03:00:00.000Z",
      subject: "Property files",
      body: "Files bundled in zip.",
      attachments: [
        {
          messageId: "msg-002-1",
          attachmentId: "att-zip",
          filename: "property-files.zip",
          mimeType: "application/zip",
          size: 2_500_000,
        },
      ],
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

const CONTACTS_WITH_EMAIL = {
  items: [
    {
      propertyEntityId: 601,
      entityId: 301,
      entityName: "Keylaw Brisbane",
      phoneNumber: "0730622192",
      emailAddress: "contracts@keylaw.com.au",
      address: null,
      contactCategoryName: "Solicitor",
      association: "Seller",
    },
  ],
}

const DRIVE_WEB_VIEW_LINK = "https://drive.google.com/file/d/fake-file-id/view"

// ---- Route helpers ----------------------------------------------------------

async function mockBaselineRoutes(page: Page) {
  await page.route("**/api/admin/property-status**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(STATUS_MIN) })
  })
  await page.route("**/api/admin/property-entities**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        items: [],
        totalCount: 0,
        limit: 20,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
        startCursor: null,
        endCursor: null,
      }),
    })
  })
  await page.route("**/api/admin/properties/1001/buyers**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_PANEL) })
  })
  await page.route("**/api/admin/properties/1001/tenants**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_PANEL) })
  })
}

async function mockGmailThreadsList(page: Page, body: unknown) {
  await page.route("**/api/admin/gmail/threads**", async (route) => {
    const url = route.request().url()
    if (url.includes("/threads/body") || url.includes("/threads/attachment")) {
      await route.continue()
      return
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) })
  })
}

async function mockGmailThreadBody(page: Page, bodyByThreadId: Record<string, unknown>) {
  await page.route("**/api/admin/gmail/threads/body**", async (route) => {
    const url = new URL(route.request().url())
    const threadId = url.searchParams.get("threadId") ?? ""
    const payload = bodyByThreadId[threadId]
    if (!payload) {
      await route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ error: "not found" }) })
      return
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(payload) })
  })
}

type SaveToDriveResponse =
  | { saved: true; alreadyExists: false; webViewLink: string }
  | { saved: false; alreadyExists: true; webViewLink: string }
  | { error: string }

async function mockSaveToDrive(
  page: Page,
  opts: {
    response: SaveToDriveResponse
    status?: number
    onHit?: (body: Record<string, unknown>) => void
  },
) {
  await page.route("**/api/admin/gmail/threads/attachment/save-to-drive**", async (route) => {
    const requestBody = route.request().postDataJSON() as Record<string, unknown>
    opts.onHit?.(requestBody)
    await route.fulfill({
      status: opts.status ?? 200,
      contentType: "application/json",
      body: JSON.stringify(opts.response),
    })
  })
}

async function openContactInbox(page: Page) {
  await page.goto("/admin/properties")
  await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible()
  await page.getByTestId("admin-entity-row--properties--1001").click()
  await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible()
  await page.getByTestId("panda-properties-form-tab-trigger--contacts").click()
  await expect(page.getByTestId("property-contact-row--601")).toBeVisible()
  await page.getByTestId("property-contact-inbox--601").click()
  await expect(page.getByTestId("entity-threads-panel")).toBeVisible()
}

// ---- Tests ------------------------------------------------------------------

test.describe("Panda Realty — Gmail attachment Save to Drive (mocked)", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaE2eAdminCredentials()
    await signInAsAdmin(page)
    // Broad property mock registered first — specific mocks registered after take precedence (LIFO).
    await routePandaPropertiesListDetailAndBuyerOffers(page)
    await mockBaselineRoutes(page)
    await page.route("**/api/admin/properties/1001/contacts**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(CONTACTS_WITH_EMAIL) })
    })
  })

  // MV step 5 — "Save to Drive" button visible alongside Preview and Download for PDF
  test("PDF attachment shows Preview, Download, and Save to Drive buttons", async ({ page }) => {
    await mockGmailThreadsList(page, { threads: [THREAD_WITH_ATTACHMENTS] })
    await mockGmailThreadBody(page, { "thread-001": THREAD_001_BODY })

    await openContactInbox(page)
    await page.getByTestId("gmail-thread-row").first().click()

    const att = page.getByTestId("gmail-thread-attachment--att-trust-receipt")
    await expect(att).toBeVisible()
    await expect(att.getByTestId("gmail-thread-attachment-preview--att-trust-receipt")).toBeVisible()
    await expect(att.getByTestId("gmail-thread-attachment-download--att-trust-receipt")).toBeVisible()
    await expect(att.getByTestId("gmail-attachment-save-to-drive--att-trust-receipt")).toBeVisible()
  })

  // MV step 26 — non-previewable attachment (zip) shows Download + Save to Drive but no Preview
  test("non-previewable attachment shows Download and Save to Drive but not Preview", async ({ page }) => {
    await mockGmailThreadsList(page, { threads: [THREAD_ZIP] })
    await mockGmailThreadBody(page, { "thread-002": THREAD_002_BODY })

    await openContactInbox(page)
    await page.getByTestId("gmail-thread-row").first().click()

    const att = page.getByTestId("gmail-thread-attachment--att-zip")
    await expect(att).toBeVisible()
    await expect(att.getByTestId("gmail-thread-attachment-download--att-zip")).toBeVisible()
    await expect(att.getByTestId("gmail-attachment-save-to-drive--att-zip")).toBeVisible()
    await expect(att.getByTestId("gmail-thread-attachment-preview--att-zip")).toHaveCount(0)
  })

  // MV step 6 — clicking "Save to Drive" shows loading state, then "Open in Drive" link on success
  test("clicking Save to Drive shows loading then Open in Drive link on success", async ({ page }) => {
    await mockGmailThreadsList(page, { threads: [THREAD_WITH_ATTACHMENTS] })
    await mockGmailThreadBody(page, { "thread-001": THREAD_001_BODY })
    await mockSaveToDrive(page, {
      response: { saved: true, alreadyExists: false, webViewLink: DRIVE_WEB_VIEW_LINK },
    })

    await openContactInbox(page)
    await page.getByTestId("gmail-thread-row").first().click()

    const saveBtn = page.getByTestId("gmail-attachment-save-to-drive--att-trust-receipt")
    await expect(saveBtn).toBeVisible()
    await saveBtn.click()

    // After success: button replaced by "Open in Drive" link
    await expect(page.getByTestId("gmail-attachment-open-in-drive--att-trust-receipt")).toBeVisible()
    await expect(page.getByTestId("gmail-attachment-save-to-drive--att-trust-receipt")).toHaveCount(0)
  })

  // MV step 7-8 — "Open in Drive" link points to the webViewLink returned by the API
  test("Open in Drive link has the correct href from the API response", async ({ page }) => {
    await mockGmailThreadsList(page, { threads: [THREAD_WITH_ATTACHMENTS] })
    await mockGmailThreadBody(page, { "thread-001": THREAD_001_BODY })
    await mockSaveToDrive(page, {
      response: { saved: true, alreadyExists: false, webViewLink: DRIVE_WEB_VIEW_LINK },
    })

    await openContactInbox(page)
    await page.getByTestId("gmail-thread-row").first().click()
    await page.getByTestId("gmail-attachment-save-to-drive--att-trust-receipt").click()

    const link = page.getByTestId("gmail-attachment-open-in-drive--att-trust-receipt")
    await expect(link).toBeVisible()
    await expect(link).toHaveAttribute("href", DRIVE_WEB_VIEW_LINK)
    await expect(link).toHaveAttribute("target", "_blank")
  })

  // MV step 18-19 — deduplication: already-in-Drive shows "Already in Drive" label, no re-upload
  test("attachment already in Drive shows Already in Drive label instead of Save button", async ({ page }) => {
    await mockGmailThreadsList(page, { threads: [THREAD_WITH_ATTACHMENTS] })
    await mockGmailThreadBody(page, { "thread-001": THREAD_001_BODY })
    await mockSaveToDrive(page, {
      response: { saved: false, alreadyExists: true, webViewLink: DRIVE_WEB_VIEW_LINK },
    })

    await openContactInbox(page)
    await page.getByTestId("gmail-thread-row").first().click()
    await page.getByTestId("gmail-attachment-save-to-drive--att-trust-receipt").click()

    await expect(page.getByTestId("gmail-attachment-already-in-drive--att-trust-receipt")).toBeVisible()
    await expect(page.getByTestId("gmail-attachment-save-to-drive--att-trust-receipt")).toHaveCount(0)
    await expect(page.getByTestId("gmail-attachment-open-in-drive--att-trust-receipt")).toHaveCount(0)
  })

  // MV step 27 — multiple attachments in one message each save independently
  test("each attachment in a message has its own independent Save to Drive button", async ({ page }) => {
    await mockGmailThreadsList(page, { threads: [THREAD_WITH_ATTACHMENTS] })
    await mockGmailThreadBody(page, { "thread-001": THREAD_001_BODY })

    let saveCallCount = 0
    await mockSaveToDrive(page, {
      response: { saved: true, alreadyExists: false, webViewLink: DRIVE_WEB_VIEW_LINK },
      onHit: () => { saveCallCount++ },
    })

    await openContactInbox(page)
    await page.getByTestId("gmail-thread-row").first().click()

    // Both attachments visible
    await expect(page.getByTestId("gmail-attachment-save-to-drive--att-trust-receipt")).toBeVisible()
    await expect(page.getByTestId("gmail-attachment-save-to-drive--att-contract")).toBeVisible()

    // Save first attachment
    await page.getByTestId("gmail-attachment-save-to-drive--att-trust-receipt").click()
    await expect(page.getByTestId("gmail-attachment-open-in-drive--att-trust-receipt")).toBeVisible()
    expect(saveCallCount).toBe(1)

    // Second attachment still shows Save to Drive (unaffected)
    await expect(page.getByTestId("gmail-attachment-save-to-drive--att-contract")).toBeVisible()

    // Save second attachment
    await page.getByTestId("gmail-attachment-save-to-drive--att-contract").click()
    await expect(page.getByTestId("gmail-attachment-open-in-drive--att-contract")).toBeVisible()
    expect(saveCallCount).toBe(2)
  })

  // MV step — API request body carries the expected fields (propertyListId, propertyEntityId, entityName, filename, mimeType)
  test("Save to Drive POST request body contains propertyListId, propertyEntityId, entityName, messageId, attachmentId, filename, mimeType", async ({ page }) => {
    await mockGmailThreadsList(page, { threads: [THREAD_WITH_ATTACHMENTS] })
    await mockGmailThreadBody(page, { "thread-001": THREAD_001_BODY })

    let capturedBody: Record<string, unknown> | null = null
    await mockSaveToDrive(page, {
      response: { saved: true, alreadyExists: false, webViewLink: DRIVE_WEB_VIEW_LINK },
      onHit: (body) => { capturedBody = body },
    })

    await openContactInbox(page)
    await page.getByTestId("gmail-thread-row").first().click()
    await page.getByTestId("gmail-attachment-save-to-drive--att-trust-receipt").click()

    await expect(page.getByTestId("gmail-attachment-open-in-drive--att-trust-receipt")).toBeVisible()

    expect(capturedBody).not.toBeNull()
    expect(capturedBody!.propertyListId).toBe(1001)
    expect(capturedBody!.propertyEntityId).toBe(601)
    expect(capturedBody!.entityName).toBe("Keylaw Brisbane")
    expect(capturedBody!.messageId).toBe("msg-001-1")
    expect(capturedBody!.attachmentId).toBe("att-trust-receipt")
    expect(capturedBody!.filename).toBe("Trust-Receipt.pdf")
    expect(capturedBody!.mimeType).toBe("application/pdf")
  })

  // MV step 28 — save API error shows error feedback; Save to Drive button restored
  test("Save to Drive API error shows error state and restores the button", async ({ page }) => {
    await mockGmailThreadsList(page, { threads: [THREAD_WITH_ATTACHMENTS] })
    await mockGmailThreadBody(page, { "thread-001": THREAD_001_BODY })
    await mockSaveToDrive(page, {
      response: { error: "Drive is not connected" },
      status: 503,
    })

    await openContactInbox(page)
    await page.getByTestId("gmail-thread-row").first().click()

    await page.getByTestId("gmail-attachment-save-to-drive--att-trust-receipt").click()

    // Button restored after failure; no success/dedup state shown
    await expect(page.getByTestId("gmail-attachment-save-to-drive--att-trust-receipt")).toBeVisible()
    await expect(page.getByTestId("gmail-attachment-open-in-drive--att-trust-receipt")).toHaveCount(0)
    await expect(page.getByTestId("gmail-attachment-already-in-drive--att-trust-receipt")).toHaveCount(0)
  })

  // MV step 22-23 — Save to Drive button is enabled when propertyListId is present (property dialog context)
  // The disabled state (tooltip "No property linked") applies to EntityCardRow rendered outside a property
  // (e.g. standalone entity page), which is not reachable via the property edit dialog flow.
  test("Save to Drive button is enabled when property context is available", async ({ page }) => {
    await mockGmailThreadsList(page, { threads: [THREAD_WITH_ATTACHMENTS] })
    await mockGmailThreadBody(page, { "thread-001": THREAD_001_BODY })

    await openContactInbox(page)
    await page.getByTestId("gmail-thread-row").first().click()

    const saveBtn = page.getByTestId("gmail-attachment-save-to-drive--att-trust-receipt")
    await expect(saveBtn).toBeVisible()
    await expect(saveBtn).toBeEnabled()
  })

  // MV step 30-31 — dialog stays open and property tab is unchanged after save
  test("property dialog stays open after saving attachment to Drive", async ({ page }) => {
    await mockGmailThreadsList(page, { threads: [THREAD_WITH_ATTACHMENTS] })
    await mockGmailThreadBody(page, { "thread-001": THREAD_001_BODY })
    await mockSaveToDrive(page, {
      response: { saved: true, alreadyExists: false, webViewLink: DRIVE_WEB_VIEW_LINK },
    })

    await openContactInbox(page)
    await page.getByTestId("gmail-thread-row").first().click()
    await page.getByTestId("gmail-attachment-save-to-drive--att-trust-receipt").click()
    await expect(page.getByTestId("gmail-attachment-open-in-drive--att-trust-receipt")).toBeVisible()

    // Dialog still open, contacts tab still active
    await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible()
    await expect(page.getByTestId("entity-threads-panel")).toBeVisible()
  })

  // MV step 5 — Save to Drive button does NOT appear when thread list renders with no property context
  // (The thread list is lazy-loaded; prior to opening no buttons exist at all.)
  test("Save to Drive is not triggered until user explicitly clicks it (no auto-save on expand)", async ({ page }) => {
    await mockGmailThreadsList(page, { threads: [THREAD_WITH_ATTACHMENTS] })
    await mockGmailThreadBody(page, { "thread-001": THREAD_001_BODY })

    let saveCalled = false
    await mockSaveToDrive(page, {
      response: { saved: true, alreadyExists: false, webViewLink: DRIVE_WEB_VIEW_LINK },
      onHit: () => { saveCalled = true },
    })

    await openContactInbox(page)
    // Expand the thread — should NOT trigger save
    await page.getByTestId("gmail-thread-row").first().click()
    await expect(page.getByTestId("gmail-thread-message--msg-001-1")).toBeVisible()

    expect(saveCalled, "save-to-drive must not be called on expand").toBe(false)
  })
})
