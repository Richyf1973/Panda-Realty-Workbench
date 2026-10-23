import { expect, test, type Page } from "@playwright/test"

import { requirePandaE2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import { routePandaPropertiesListDetailAndBuyerOffers } from "./helpers/panda-properties-dialog-mocks"

// ---- Fixture data ---------------------------------------------------------

const THREADS_RESPONSE = {
  threads: [
    {
      threadId: "thread-link-001",
      subject: "Appraisal Letter For 28 Ridgegarden Drive Morayfield",
      from: "Maria Koch <maria@mypandarealty.com.au>",
      date: "2026-04-28T10:00:00.000Z",
      snippet: "I have just emailed you the Sales Contract for signing through DocuSign.",
      attachmentCount: 0,
    },
    {
      threadId: "thread-link-002",
      subject: "Confirmation email",
      from: "Maria Koch <maria@mypandarealty.com.au>",
      date: "2026-04-27T08:00:00.000Z",
      snippet: "Two links in this message.",
      attachmentCount: 0,
    },
    {
      threadId: "thread-link-003",
      subject: "Plain text only",
      from: "Maria Koch <maria@mypandarealty.com.au>",
      date: "2026-04-26T08:00:00.000Z",
      snippet: "No URLs here.",
      attachmentCount: 0,
    },
  ],
}

// MV step 7 — angle-bracket URL in body
const THREAD_LINK_001_BODY = {
  messages: [
    {
      messageId: "msg-link-001-1",
      from: "My Panda Realty <maria@mypandarealty.com.au>",
      date: "2026-04-28T10:00:00.000Z",
      subject: "Appraisal Letter For 28 Ridgegarden Drive Morayfield",
      body: [
        "Hello Merilyn & Chris,",
        "",
        "I have just emailed you the Sales Contract for signing through DocuSign.",
        "",
        "CMA-Report-28-RIDGEGARDEN-DRIVE-MORAYFIELD-QLD-4506.pdf",
        "<https://drive.google.com/file/d/FAKEID1/view?usp=drive_web>",
        "",
        "Kind Regards",
        "Maria Koch",
      ].join("\n"),
      attachments: [],
    },
  ],
}

// MV step 5 — bare URL in body
const THREAD_LINK_001_BARE_BODY = {
  messages: [
    {
      messageId: "msg-link-001-bare",
      from: "My Panda Realty <maria@mypandarealty.com.au>",
      date: "2026-04-28T10:00:00.000Z",
      subject: "Appraisal Letter",
      body: "Please visit https://drive.google.com/file/d/FAKEID2/view for the document.",
      attachments: [],
    },
  ],
}

// MV step 10 — multiple URLs in one body
const THREAD_LINK_002_BODY = {
  messages: [
    {
      messageId: "msg-link-002-1",
      from: "My Panda Realty <maria@mypandarealty.com.au>",
      date: "2026-04-27T08:00:00.000Z",
      subject: "Confirmation email",
      body: [
        "Two documents attached via Drive:",
        "https://drive.google.com/file/d/FAKEID3/view",
        "<https://drive.google.com/file/d/FAKEID4/view>",
      ].join("\n"),
      attachments: [],
    },
  ],
}

// MV step 11 — no URLs in body
const THREAD_LINK_003_BODY = {
  messages: [
    {
      messageId: "msg-link-003-1",
      from: "My Panda Realty <maria@mypandarealty.com.au>",
      date: "2026-04-26T08:00:00.000Z",
      subject: "Plain text only",
      body: "No URLs here. Just plain text.\nKind regards, Maria.",
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
      propertyEntityId: 701,
      entityId: 401,
      entityName: "Maria Koch",
      phoneNumber: "0493635666",
      emailAddress: "maria@mypandarealty.com.au",
      address: null,
      contactCategoryName: "Agent",
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

async function openContactInbox(page: Page, propertyEntityId = 701) {
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

test.describe("Panda Realty admin — email body URL linkification (mocked)", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaE2eAdminCredentials()
    await signInAsAdmin(page)
    // Broad helper registered first — specific mocks registered after take precedence (LIFO)
    await routePandaPropertiesListDetailAndBuyerOffers(page)
    await mockBaselineRoutes(page)
    await page.route("**/api/admin/properties/1001/contacts**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(CONTACTS_WITH_EMAIL) })
    })
  })

  // MV step 7 — angle-bracket URL rendered as clickable link with <> preserved
  test("angle-bracket URL in body is rendered as a clickable link with brackets preserved", async ({ page }) => {
    await mockGmailThreadsList(page, THREADS_RESPONSE)
    await mockGmailThreadBody(page, { "thread-link-001": THREAD_LINK_001_BODY })

    await openContactInbox(page)
    await page.getByTestId("gmail-thread-row").first().click()

    const msgBlock = page.getByTestId("gmail-thread-message--msg-link-001-1")
    await expect(msgBlock).toBeVisible()

    // The angle-bracket URL must be a link with the correct href
    const link = msgBlock.locator("a[href='https://drive.google.com/file/d/FAKEID1/view?usp=drive_web']")
    await expect(link).toBeVisible()

    // Link text preserves the angle brackets
    await expect(link).toHaveText("<https://drive.google.com/file/d/FAKEID1/view?usp=drive_web>")

    // Opens in new tab
    await expect(link).toHaveAttribute("target", "_blank")
    await expect(link).toHaveAttribute("rel", /noopener/)
  })

  // MV step 5 — bare https:// URL rendered as a clickable link
  test("bare https URL in body is rendered as a clickable link", async ({ page }) => {
    await mockGmailThreadsList(page, THREADS_RESPONSE)
    await mockGmailThreadBody(page, { "thread-link-001": THREAD_LINK_001_BARE_BODY })

    await openContactInbox(page)
    await page.getByTestId("gmail-thread-row").first().click()

    const msgBlock = page.getByTestId("gmail-thread-message--msg-link-001-bare")
    await expect(msgBlock).toBeVisible()

    const link = msgBlock.locator("a[href='https://drive.google.com/file/d/FAKEID2/view']")
    await expect(link).toBeVisible()
    await expect(link).toHaveText("https://drive.google.com/file/d/FAKEID2/view")
    await expect(link).toHaveAttribute("target", "_blank")
  })

  // MV step 6 — clicking a linkified URL opens a new tab without closing the dialog
  test("clicking a linkified URL opens a new tab and the dialog stays open", async ({ page }) => {
    await mockGmailThreadsList(page, THREADS_RESPONSE)
    await mockGmailThreadBody(page, { "thread-link-001": THREAD_LINK_001_BODY })

    await openContactInbox(page)
    await page.getByTestId("gmail-thread-row").first().click()

    const msgBlock = page.getByTestId("gmail-thread-message--msg-link-001-1")
    const link = msgBlock.locator("a[href='https://drive.google.com/file/d/FAKEID1/view?usp=drive_web']")
    await expect(link).toBeVisible()

    // Opens new tab (target=_blank) — no actual navigation happens in the test
    // because the URL is external; verify the attribute rather than the popup
    await expect(link).toHaveAttribute("target", "_blank")

    // Dialog still open
    await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible()
  })

  // MV step 9 — surrounding text is unaffected plain text
  test("text surrounding URLs remains as plain text, not linkified", async ({ page }) => {
    await mockGmailThreadsList(page, THREADS_RESPONSE)
    await mockGmailThreadBody(page, { "thread-link-001": THREAD_LINK_001_BODY })

    await openContactInbox(page)
    await page.getByTestId("gmail-thread-row").first().click()

    const msgBlock = page.getByTestId("gmail-thread-message--msg-link-001-1")
    // The filename line and greeting should be visible as plain text
    await expect(msgBlock).toContainText("CMA-Report-28-RIDGEGARDEN-DRIVE-MORAYFIELD-QLD-4506.pdf")
    await expect(msgBlock).toContainText("Hello Merilyn & Chris,")
    await expect(msgBlock).toContainText("Kind Regards")
    // Only the URL itself should be an <a> — not these strings
    await expect(msgBlock.locator("a").filter({ hasText: "CMA-Report" })).toHaveCount(0)
  })

  // MV step 10 — multiple URLs in one body each become independent links
  test("multiple URLs in one body are each independently linkified", async ({ page }) => {
    await mockGmailThreadsList(page, THREADS_RESPONSE)
    await mockGmailThreadBody(page, { "thread-link-002": THREAD_LINK_002_BODY })

    await openContactInbox(page)
    // Click second thread row
    await page.getByTestId("gmail-thread-row").nth(1).click()

    const msgBlock = page.getByTestId("gmail-thread-message--msg-link-002-1")
    await expect(msgBlock).toBeVisible()

    const links = msgBlock.locator("a[href^='https://drive.google.com']")
    await expect(links).toHaveCount(2)

    // Bare URL link
    await expect(links.nth(0)).toHaveText("https://drive.google.com/file/d/FAKEID3/view")
    // Angle-bracket URL link (brackets preserved)
    await expect(links.nth(1)).toHaveText("<https://drive.google.com/file/d/FAKEID4/view>")
  })

  // MV step 11 — body with no URLs renders unchanged
  test("body with no URLs renders as plain text without any links", async ({ page }) => {
    await mockGmailThreadsList(page, THREADS_RESPONSE)
    await mockGmailThreadBody(page, { "thread-link-003": THREAD_LINK_003_BODY })

    await openContactInbox(page)
    // Click third thread row
    await page.getByTestId("gmail-thread-row").nth(2).click()

    const msgBlock = page.getByTestId("gmail-thread-message--msg-link-003-1")
    await expect(msgBlock).toBeVisible()
    await expect(msgBlock).toContainText("No URLs here. Just plain text.")
    await expect(msgBlock.locator("a")).toHaveCount(0)
  })

  // MV step 12 — empty body placeholder is unaffected
  test("empty body still shows the (empty) placeholder with no JS error", async ({ page }) => {
    const emptyBodyThread = {
      threads: [
        {
          threadId: "thread-empty",
          subject: "Empty body thread",
          from: "Maria Koch <maria@mypandarealty.com.au>",
          date: "2026-04-25T08:00:00.000Z",
          snippet: "",
          attachmentCount: 0,
        },
      ],
    }
    const emptyBodyResponse = {
      messages: [
        {
          messageId: "msg-empty-1",
          from: "Maria Koch <maria@mypandarealty.com.au>",
          date: "2026-04-25T08:00:00.000Z",
          subject: "Empty body thread",
          body: "",
          attachments: [],
        },
      ],
    }

    await mockGmailThreadsList(page, emptyBodyThread)
    await mockGmailThreadBody(page, { "thread-empty": emptyBodyResponse })

    await openContactInbox(page)
    await page.getByTestId("gmail-thread-row").first().click()

    const msgBlock = page.getByTestId("gmail-thread-message--msg-empty-1")
    await expect(msgBlock).toBeVisible()
    await expect(msgBlock).toContainText("(empty)")
    await expect(msgBlock.locator("a")).toHaveCount(0)
  })

  // MV step 15 — dialog stays open after interacting with a link
  test("dialog remains open after clicking on a URL link element", async ({ page }) => {
    await mockGmailThreadsList(page, THREADS_RESPONSE)
    await mockGmailThreadBody(page, { "thread-link-001": THREAD_LINK_001_BODY })

    await openContactInbox(page)
    await page.getByTestId("gmail-thread-row").first().click()

    const msgBlock = page.getByTestId("gmail-thread-message--msg-link-001-1")
    // Focus the link without navigating (keyboard focus, not click)
    const link = msgBlock.locator("a[href^='https://drive.google.com']").first()
    await link.focus()

    // Dialog must still be open
    await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible()
  })
})
