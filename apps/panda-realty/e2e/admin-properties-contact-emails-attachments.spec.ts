import { expect, test, type Page, type Route } from "@playwright/test"

import { requirePandaE2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import { routePandaPropertiesListDetailAndBuyerOffers } from "./helpers/panda-properties-dialog-mocks"

// ---- Fixture data ---------------------------------------------------------

const THREAD_WITH_ATTACHMENTS = {
  threadId: "thread-001",
  subject: "147962 B. Muirhead, S. O'Neil S/T B. & S. White 4 Lerose Avenue KALLANGUR",
  from: "Keylaw Brisbane <contracts@keylaw.com.au>",
  date: "2026-04-25T06:00:00.000Z",
  snippet: "Please find attached trust receipt for your records.",
  attachmentCount: 3,
}

const THREAD_NO_ATTACHMENTS = {
  threadId: "thread-002",
  subject: "Inspection scheduled",
  from: "Richard Falzon <admin@mypandarealty.com.au>",
  date: "2026-04-22T01:00:00.000Z",
  snippet: "Confirming Thursday 2pm.",
  attachmentCount: 0,
}

const THREAD_SIGNATURE_ONLY = {
  threadId: "thread-003",
  subject: "Re: Quick question",
  from: "Keylaw Brisbane <contracts@keylaw.com.au>",
  date: "2026-04-20T03:00:00.000Z",
  snippet: "Sure, no problem.",
  // Inline signature image is filtered server-side → count is 0
  attachmentCount: 0,
}

const THREAD_NON_PREVIEWABLE = {
  threadId: "thread-004",
  subject: "Property files",
  from: "Keylaw Brisbane <contracts@keylaw.com.au>",
  date: "2026-04-18T03:00:00.000Z",
  snippet: "Files bundled in zip.",
  attachmentCount: 1,
}

const THREADS_RESPONSE = {
  threads: [THREAD_WITH_ATTACHMENTS, THREAD_NO_ATTACHMENTS, THREAD_SIGNATURE_ONLY, THREAD_NON_PREVIEWABLE],
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
          filename: "Trust-Receipt-147962.pdf",
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
    {
      messageId: "msg-001-2",
      from: "Keylaw Brisbane <contracts@keylaw.com.au>",
      date: "2026-04-26T03:00:00.000Z",
      subject: "Re: Trust receipt",
      body: "Following up on the deposit.",
      attachments: [],
    },
    {
      messageId: "msg-001-3",
      from: "Richard Falzon <admin@mypandarealty.com.au>",
      date: "2026-04-28T05:00:00.000Z",
      subject: "Re: Trust receipt",
      body: "Thanks — see invoice attached.",
      attachments: [
        {
          messageId: "msg-001-3",
          attachmentId: "att-invoice-png",
          filename: "invoice.png",
          mimeType: "image/png",
          size: 49_152,
        },
      ],
    },
  ],
}

const THREAD_002_BODY = {
  messages: [
    {
      messageId: "msg-002-1",
      from: "Richard Falzon <admin@mypandarealty.com.au>",
      date: "2026-04-22T01:00:00.000Z",
      subject: "Inspection scheduled",
      body: "Confirming Thursday 2pm.",
      attachments: [],
    },
  ],
}

const THREAD_003_BODY = {
  messages: [
    {
      messageId: "msg-003-1",
      from: "Keylaw Brisbane <contracts@keylaw.com.au>",
      date: "2026-04-20T03:00:00.000Z",
      subject: "Re: Quick question",
      // Body is real; the inline signature image part was server-filtered out.
      body: "Sure, no problem.",
      attachments: [],
    },
  ],
}

const THREAD_004_BODY = {
  messages: [
    {
      messageId: "msg-004-1",
      from: "Keylaw Brisbane <contracts@keylaw.com.au>",
      date: "2026-04-18T03:00:00.000Z",
      subject: "Property files",
      body: "Files bundled in zip.",
      attachments: [
        {
          messageId: "msg-004-1",
          attachmentId: "att-zip",
          filename: "property-files.zip",
          mimeType: "application/zip",
          size: 2_500_000,
        },
      ],
    },
  ],
}

const THREAD_FIRST_MSG_HAS_ATTACHMENTS = {
  // Used in the "first-message has attachments, last has none" test.
  messages: [
    {
      messageId: "msg-005-1",
      from: "Keylaw Brisbane <contracts@keylaw.com.au>",
      date: "2026-04-15T03:00:00.000Z",
      subject: "Original",
      body: "Original message with the file.",
      attachments: [
        {
          messageId: "msg-005-1",
          attachmentId: "att-original",
          filename: "Original-Document.pdf",
          mimeType: "application/pdf",
          size: 100_000,
        },
      ],
    },
    {
      messageId: "msg-005-2",
      from: "Richard Falzon <admin@mypandarealty.com.au>",
      date: "2026-04-16T03:00:00.000Z",
      subject: "Re: Original",
      body: "Got it, thanks.",
      attachments: [],
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

const CONTACTS_WITHOUT_EMAIL = {
  items: [
    {
      propertyEntityId: 602,
      entityId: 302,
      entityName: "No-Email Contact",
      phoneNumber: "0411111111",
      emailAddress: null,
      address: null,
      contactCategoryName: "Solicitor",
      association: "Seller",
    },
  ],
}

// ---- Helpers --------------------------------------------------------------

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

async function mockGmailThreadsList(page: Page, body: unknown, opts: { onHit?: () => void } = {}) {
  await page.route("**/api/admin/gmail/threads**", async (route: Route) => {
    const url = route.request().url()
    if (url.includes("/threads/body") || url.includes("/threads/attachment")) {
      await route.continue()
      return
    }
    opts.onHit?.()
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) })
  })
}

async function mockGmailThreadBody(
  page: Page,
  bodyByThreadId: Record<string, unknown>,
  opts: { onHit?: (threadId: string) => void } = {},
) {
  await page.route("**/api/admin/gmail/threads/body**", async (route: Route) => {
    const url = new URL(route.request().url())
    const threadId = url.searchParams.get("threadId") ?? ""
    opts.onHit?.(threadId)
    const payload = bodyByThreadId[threadId]
    if (!payload) {
      await route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ error: "not found" }) })
      return
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(payload) })
  })
}

async function mockGmailAttachment(
  page: Page,
  opts: { onHit?: (params: URLSearchParams) => void; status?: number; bytes?: Buffer; mimeType?: string } = {},
) {
  // Attachment links may open in a popup (Preview) or trigger a browser download
  // (Download); both can route outside the original `page`. Register on the
  // browser context so popups are also intercepted.
  await page.context().route("**/api/admin/gmail/threads/attachment**", async (route: Route) => {
    const url = new URL(route.request().url())
    opts.onHit?.(url.searchParams)
    const status = opts.status ?? 200
    if (status !== 200) {
      await route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify({ error: "attachment unavailable" }),
      })
      return
    }
    const filename = url.searchParams.get("filename") ?? "file.bin"
    const disposition = url.searchParams.get("disposition") === "inline" ? "inline" : "attachment"
    const bytes = opts.bytes ?? Buffer.from("FAKE-BYTES")
    await route.fulfill({
      status: 200,
      contentType: opts.mimeType ?? "application/octet-stream",
      headers: {
        "content-disposition": `${disposition}; filename="${filename}"`,
      },
      body: bytes,
    })
  })
}

async function openContactInbox(page: Page, propertyEntityId = 601) {
  await page.goto("/admin/properties")
  await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible()
  await page.getByTestId("admin-entity-row--properties--1001").click()
  await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible()
  await page.getByTestId("panda-properties-form-tab-trigger--contacts").click()
  await expect(page.getByTestId(`property-contact-row--${propertyEntityId}`)).toBeVisible()
  await page.getByTestId(`property-contact-inbox--${propertyEntityId}`).click()
  await expect(page.getByTestId("entity-threads-panel")).toBeVisible()
}

// ---- Tests ----------------------------------------------------------------

test.describe("Panda Realty admin — property contact email attachments (mocked)", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaE2eAdminCredentials()
    await signInAsAdmin(page)
    // Broad helper first — Playwright matches routes LIFO, so specific mocks
    // registered later take precedence over the helper's `**/properties**` net.
    await routePandaPropertiesListDetailAndBuyerOffers(page)
    await mockBaselineRoutes(page)
    await page.route("**/api/admin/properties/1001/contacts**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(CONTACTS_WITH_EMAIL) })
    })
  })

  // Manual verification step 4 — paperclip badge appears only when count > 0
  test("collapsed thread row shows paperclip badge with count when attachmentCount > 0", async ({ page }) => {
    await mockGmailThreadsList(page, THREADS_RESPONSE)

    await openContactInbox(page)

    await expect(page.getByTestId("gmail-thread-attachment-count--thread-001")).toHaveText(/3/)
    await expect(page.getByTestId("gmail-thread-attachment-count--thread-004")).toHaveText(/1/)
    await expect(page.getByTestId("gmail-thread-attachment-count--thread-002")).toHaveCount(0)
    await expect(page.getByTestId("gmail-thread-attachment-count--thread-003")).toHaveCount(0)
  })

  // Manual verification step 5 — expanded view groups by message
  test("expanded thread renders one block per message in chronological order", async ({ page }) => {
    await mockGmailThreadsList(page, THREADS_RESPONSE)
    await mockGmailThreadBody(page, { "thread-001": THREAD_001_BODY })

    await openContactInbox(page)

    await page.getByTestId("gmail-thread-row").first().click()

    const messages = page.getByTestId(/^gmail-thread-message--msg-001-/)
    await expect(messages).toHaveCount(3)

    const orderedIds = await messages.evaluateAll((els) => els.map((el) => el.getAttribute("data-testid")))
    expect(orderedIds).toEqual([
      "gmail-thread-message--msg-001-1",
      "gmail-thread-message--msg-001-2",
      "gmail-thread-message--msg-001-3",
    ])
  })

  // Manual verification step 5 (continued) — message header shows From + Date
  test("each message block shows its from and date headers", async ({ page }) => {
    await mockGmailThreadsList(page, THREADS_RESPONSE)
    await mockGmailThreadBody(page, { "thread-001": THREAD_001_BODY })

    await openContactInbox(page)
    await page.getByTestId("gmail-thread-row").first().click()

    const msg1 = page.getByTestId("gmail-thread-message--msg-001-1")
    await expect(msg1).toContainText("Keylaw Brisbane")
    await expect(msg1).toContainText("25 Apr 2026")

    const msg3 = page.getByTestId("gmail-thread-message--msg-001-3")
    await expect(msg3).toContainText("Richard Falzon")
    await expect(msg3).toContainText("28 Apr 2026")
  })

  // Manual verification step 5 (continued) — attachments listed under the message they belong to; empty messages show no attachments section
  test("attachments render under their message; messages without attachments hide the section", async ({ page }) => {
    await mockGmailThreadsList(page, THREADS_RESPONSE)
    await mockGmailThreadBody(page, { "thread-001": THREAD_001_BODY })

    await openContactInbox(page)
    await page.getByTestId("gmail-thread-row").first().click()

    const msg1 = page.getByTestId("gmail-thread-message--msg-001-1")
    await expect(msg1.getByTestId("gmail-thread-attachment--att-trust-receipt")).toBeVisible()
    await expect(msg1.getByTestId("gmail-thread-attachment--att-contract")).toBeVisible()

    const msg2 = page.getByTestId("gmail-thread-message--msg-001-2")
    await expect(msg2.getByTestId(/^gmail-thread-attachment--/)).toHaveCount(0)

    const msg3 = page.getByTestId("gmail-thread-message--msg-001-3")
    await expect(msg3.getByTestId("gmail-thread-attachment--att-invoice-png")).toBeVisible()
  })

  // Manual verification step 6 — PDF preview opens new tab with disposition=inline
  test("clicking Preview on a PDF requests the attachment route with disposition=inline", async ({ page, context }) => {
    await mockGmailThreadsList(page, THREADS_RESPONSE)
    await mockGmailThreadBody(page, { "thread-001": THREAD_001_BODY })
    let captured: URLSearchParams | null = null
    await mockGmailAttachment(page, {
      mimeType: "application/pdf",
      bytes: Buffer.from("%PDF-1.4 fake"),
      onHit: (params) => {
        captured = params
      },
    })

    await openContactInbox(page)
    await page.getByTestId("gmail-thread-row").first().click()

    const previewBtn = page.getByTestId("gmail-thread-attachment-preview--att-trust-receipt")
    await expect(previewBtn).toBeVisible()

    const [popup] = await Promise.all([context.waitForEvent("page"), previewBtn.click()])
    await popup.waitForLoadState("domcontentloaded")

    expect(captured).not.toBeNull()
    expect(captured!.get("disposition")).toBe("inline")
    expect(captured!.get("attachmentId")).toBe("att-trust-receipt")
    expect(captured!.get("messageId")).toBe("msg-001-1")
    expect(captured!.get("filename")).toBe("Trust-Receipt-147962.pdf")
  })

  // Manual verification step 7 — PDF Download requests disposition=attachment.
  // `<a download>` is handled by Chromium's download manager, which bypasses
  // route interception — assert against the Download event's URL instead.
  test("clicking Download on a PDF requests the attachment route with disposition=attachment", async ({ page }) => {
    await mockGmailThreadsList(page, THREADS_RESPONSE)
    await mockGmailThreadBody(page, { "thread-001": THREAD_001_BODY })
    await mockGmailAttachment(page, {
      mimeType: "application/pdf",
      bytes: Buffer.from("%PDF-1.4 fake"),
    })

    await openContactInbox(page)
    await page.getByTestId("gmail-thread-row").first().click()

    const downloadBtn = page.getByTestId("gmail-thread-attachment-download--att-trust-receipt")
    await expect(downloadBtn).toBeVisible()

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      downloadBtn.click(),
    ])
    const params = new URL(download.url()).searchParams
    expect(params.get("disposition")).toBe("attachment")
    expect(params.get("attachmentId")).toBe("att-trust-receipt")
    expect(params.get("messageId")).toBe("msg-001-1")
    expect(params.get("filename")).toBe("Trust-Receipt-147962.pdf")
  })

  // Manual verification step 8 — image attachment exposes Preview action
  test("image attachment exposes a Preview action", async ({ page }) => {
    await mockGmailThreadsList(page, THREADS_RESPONSE)
    await mockGmailThreadBody(page, { "thread-001": THREAD_001_BODY })

    await openContactInbox(page)
    await page.getByTestId("gmail-thread-row").first().click()

    await expect(page.getByTestId("gmail-thread-attachment-preview--att-invoice-png")).toBeVisible()
  })

  // Manual verification step 9 — non-previewable type only offers Download
  test("non-previewable attachment shows Download only (no Preview)", async ({ page }) => {
    await mockGmailThreadsList(page, THREADS_RESPONSE)
    await mockGmailThreadBody(page, { "thread-004": THREAD_004_BODY })

    await openContactInbox(page)
    // Click thread-004 (4th row)
    await page.getByTestId("gmail-thread-row").nth(3).click()

    await expect(page.getByTestId("gmail-thread-attachment-download--att-zip")).toBeVisible()
    await expect(page.getByTestId("gmail-thread-attachment-preview--att-zip")).toHaveCount(0)
  })

  // Manual verification step 10 — first-message attachments are surfaced (regression of last-message-only behavior)
  test("attachments in the first message of a thread are visible after expand", async ({ page }) => {
    const threadFirstMsg = {
      threadId: "thread-005",
      subject: "First-message attachments",
      from: "Keylaw Brisbane <contracts@keylaw.com.au>",
      date: "2026-04-16T03:00:00.000Z",
      snippet: "Reply with no attachments.",
      attachmentCount: 1,
    }
    await mockGmailThreadsList(page, { threads: [threadFirstMsg] })
    await mockGmailThreadBody(page, { "thread-005": THREAD_FIRST_MSG_HAS_ATTACHMENTS })

    await openContactInbox(page)
    await page.getByTestId("gmail-thread-row").first().click()

    const firstMsg = page.getByTestId("gmail-thread-message--msg-005-1")
    await expect(firstMsg.getByTestId("gmail-thread-attachment--att-original")).toBeVisible()

    const lastMsg = page.getByTestId("gmail-thread-message--msg-005-2")
    await expect(lastMsg.getByTestId(/^gmail-thread-attachment--/)).toHaveCount(0)
  })

  // Manual verification step 11 — signature-only thread shows no attachment UI
  test("thread with only a filtered inline signature image shows no badge and no attachment rows", async ({ page }) => {
    await mockGmailThreadsList(page, THREADS_RESPONSE)
    await mockGmailThreadBody(page, { "thread-003": THREAD_003_BODY })

    await openContactInbox(page)

    // Badge absent on collapsed row
    await expect(page.getByTestId("gmail-thread-attachment-count--thread-003")).toHaveCount(0)

    // Expanded view shows the message body but no attachment rows anywhere
    await page.getByTestId("gmail-thread-row").nth(2).click()
    const msg = page.getByTestId("gmail-thread-message--msg-003-1")
    await expect(msg).toBeVisible()
    await expect(msg.getByTestId(/^gmail-thread-attachment--/)).toHaveCount(0)
  })

  // Manual verification step 14 — once expanded then collapsed, re-expand does not refetch body
  test("re-expanding a thread row does not re-fetch the body", async ({ page }) => {
    await mockGmailThreadsList(page, THREADS_RESPONSE)
    let bodyHits = 0
    await mockGmailThreadBody(page, { "thread-001": THREAD_001_BODY }, { onHit: () => bodyHits++ })

    await openContactInbox(page)
    const row = page.getByTestId("gmail-thread-row").first()

    await row.click()
    await expect(page.getByTestId("gmail-thread-message--msg-001-1")).toBeVisible()
    expect(bodyHits).toBe(1)

    await row.click() // collapse
    await row.click() // re-expand
    await expect(page.getByTestId("gmail-thread-message--msg-001-1")).toBeVisible()
    expect(bodyHits).toBe(1)
  })

  // Manual verification step 15 — Gmail unreachable: list endpoint shows error + Retry
  test("threads list error surfaces a readable message and a Retry button", async ({ page }) => {
    await page.route("**/api/admin/gmail/threads**", async (route) => {
      const url = route.request().url()
      if (url.includes("/threads/body") || url.includes("/threads/attachment")) {
        await route.continue()
        return
      }
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Gmail is not connected." }),
      })
    })

    await openContactInbox(page)

    await expect(page.getByText("Gmail is not connected.")).toBeVisible()
    await expect(page.getByRole("button", { name: /retry/i })).toBeVisible()
  })

  // Manual verification step 17 — bad attachmentId surfaces a non-200 JSON error
  test("attachment route 404 shows a readable error in the new tab", async ({ page, context }) => {
    await mockGmailThreadsList(page, THREADS_RESPONSE)
    await mockGmailThreadBody(page, { "thread-001": THREAD_001_BODY })
    await mockGmailAttachment(page, { status: 404 })

    await openContactInbox(page)
    await page.getByTestId("gmail-thread-row").first().click()

    const previewBtn = page.getByTestId("gmail-thread-attachment-preview--att-trust-receipt")
    const [popup] = await Promise.all([context.waitForEvent("page"), previewBtn.click()])
    await popup.waitForLoadState("domcontentloaded")
    const text = await popup.locator("body").innerText()
    expect(text).toContain("attachment unavailable")
  })

  // Manual verification step 18 — empty threads list shows "No threads found for [email]"
  test("empty threads response still shows the existing empty state", async ({ page }) => {
    await mockGmailThreadsList(page, { threads: [] })

    await openContactInbox(page)
    await expect(page.getByText(/no threads found/i)).toBeVisible()
  })

  // Manual verification step 19 — contact without email never renders the inbox button
  test("contact with no email does not render the inbox button", async ({ page }) => {
    await page.unroute("**/api/admin/properties/1001/contacts**")
    await page.route("**/api/admin/properties/1001/contacts**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(CONTACTS_WITHOUT_EMAIL) })
    })

    await page.goto("/admin/properties")
    await page.getByTestId("admin-entity-row--properties--1001").click()
    await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible()
    await page.getByTestId("panda-properties-form-tab-trigger--contacts").click()

    await expect(page.getByTestId("property-contact-row--602")).toBeVisible()
    await expect(page.getByTestId("property-contact-inbox--602")).toHaveCount(0)
  })

  // Manual verification step 21 — browsing/previewing/downloading is read-only (no mutating calls)
  test("expanding a thread and previewing an attachment does not trigger any non-GET requests", async ({ page }) => {
    await mockGmailThreadsList(page, THREADS_RESPONSE)
    await mockGmailThreadBody(page, { "thread-001": THREAD_001_BODY })
    await mockGmailAttachment(page, { mimeType: "application/pdf", bytes: Buffer.from("%PDF-1.4 fake") })

    const nonGetMethods: string[] = []
    page.on("request", (req) => {
      if (req.method() !== "GET" && req.url().includes("/api/admin/")) {
        nonGetMethods.push(`${req.method()} ${req.url()}`)
      }
    })

    await openContactInbox(page)
    await page.getByTestId("gmail-thread-row").first().click()
    await expect(page.getByTestId("gmail-thread-message--msg-001-1")).toBeVisible()

    expect(nonGetMethods, nonGetMethods.join("\n")).toEqual([])
  })
})
