/**
 * E2E: Panda Realty — Gmail forward from message blocks (mocked APIs)
 *
 * Run (from repo root):
 *   $env:PLAYWRIGHT_SKIP_WEBSERVER=1; npx playwright test apps/panda-realty/e2e/admin-properties-gmail-forward.spec.ts --config=apps/panda-realty/playwright.config.ts
 *
 * Manual verification coverage:
 *   Happy path (steps 1–15):   tests 1–10
 *   Entity scope (steps 16–24): tests 11–13
 *   Edge cases (steps 25–34):   tests 14–18
 *   Errors (steps 35–38):       tests 19–20
 *   Regression (steps 39–42):   tests 21–22
 *   Persistence (steps 43–44):  test  23
 */

import { expect, test } from "@playwright/test"

import { requirePandaE2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import { openPropertyEditDialog, PROPERTY_TWO_OWNERS } from "./helpers/panda-properties-owners-helpers"
import { routePandaPropertiesListDetailAndBuyerOffers } from "./helpers/panda-properties-dialog-mocks"
import { parseFormDataBody } from "./helpers/panda-properties-gmail-helpers"

// ── Fixtures ─────────────────────────────────────────────────────────────────

const CONTACT_EMAIL = "caboolture@vantage.com.au"
const BUYER_EMAIL = "dhungelashok33@gmail.com"
const TENANT_EMAIL = "bob@tenant.com"
const ORIGINAL_SUBJECT = "Welcome Pack Request For 12/176 Torrens Rd"
const FWD_SUBJECT = `Fwd: ${ORIGINAL_SUBJECT}`
const ORIGINAL_FROM = `Vantage Caboolture <${CONTACT_EMAIL}>`
const ORIGINAL_BODY = "Hi Richard,\nThank you for your email."

const ATT_1 = {
  messageId: "msg-contact-1",
  attachmentId: "att-gmail-001",
  filename: "report.pdf",
  mimeType: "application/pdf",
  size: 43008,
}

const CONTACT_WITH_EMAIL = {
  items: [
    {
      propertyEntityId: 601,
      entityId: 301,
      entityName: "Vantage Caboolture Riverfront",
      phoneNumber: "0458550540",
      emailAddress: CONTACT_EMAIL,
      address: "176 Torrens Road",
      contactCategoryName: "Property Manager",
      association: "Seller",
    },
  ],
}

const BUYER_WITH_EMAIL = {
  items: [
    {
      propertyEntityId: 501,
      entityId: 201,
      entityName: "Ash D",
      phoneNumber: "0475770513",
      emailAddress: BUYER_EMAIL,
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
      emailAddress: TENANT_EMAIL,
      address: null,
      esuburb: null,
      estate: null,
      epostcode: null,
      notes: null,
    },
  ],
}

const EMPTY_PANEL = { items: [] }

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

const THREAD_LIST = {
  threads: [
    {
      threadId: "thread-fwd-1",
      subject: ORIGINAL_SUBJECT,
      from: ORIGINAL_FROM,
      date: "2026-04-26T00:00:00.000Z",
      snippet: "Hi Richard, Thank you for your email...",
      attachmentCount: 1,
    },
  ],
}

const THREAD_BODY_WITH_ATTACHMENT = {
  messages: [
    {
      messageId: "msg-contact-1",
      from: ORIGINAL_FROM,
      date: "2026-04-27T00:00:00.000Z",
      subject: ORIGINAL_SUBJECT,
      body: ORIGINAL_BODY,
      attachments: [ATT_1],
    },
  ],
}

const THREAD_BODY_NO_ATTACHMENT = {
  messages: [
    {
      messageId: "msg-contact-2",
      from: ORIGINAL_FROM,
      date: "2026-04-27T00:00:00.000Z",
      subject: ORIGINAL_SUBJECT,
      body: ORIGINAL_BODY,
      attachments: [],
    },
  ],
}

const THREAD_BODY_FWD_SUBJECT = {
  messages: [
    {
      messageId: "msg-fwd-existing",
      from: ORIGINAL_FROM,
      date: "2026-04-28T00:00:00.000Z",
      subject: `Fwd: ${ORIGINAL_SUBJECT}`,
      body: ORIGINAL_BODY,
      attachments: [],
    },
  ],
}

const THREAD_BODY_EMPTY_SUBJECT = {
  messages: [
    {
      messageId: "msg-empty-subject",
      from: ORIGINAL_FROM,
      date: "2026-04-29T00:00:00.000Z",
      subject: "",
      body: ORIGINAL_BODY,
      attachments: [],
    },
  ],
}

// ── Helpers ───────────────────────────────────────────────────────────────────

type SetupOptions = {
  buyers?: object
  contacts?: object
  tenants?: object
  openContactsTab?: boolean
  threadList?: object
  threadBody?: object
  forwardStatus?: number
  forwardBody?: object
  composeStatus?: number
  composeBody?: object
  replyStatus?: number
  onForwardPost?: (body: Record<string, string | undefined>) => void
}

async function setup(
  page: Parameters<typeof routePandaPropertiesListDetailAndBuyerOffers>[0],
  options: SetupOptions = {},
) {
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

  await routePandaPropertiesListDetailAndBuyerOffers(page)
  await page.route("**/api/admin/properties/1001/contacts**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(options.contacts ?? CONTACT_WITH_EMAIL),
    })
  })
  await page.route("**/api/admin/properties/1001/buyers**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(options.buyers ?? EMPTY_PANEL),
    })
  })
  await page.route("**/api/admin/properties/1001/tenants**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(options.tenants ?? EMPTY_PANEL),
    })
  })
  await page.route("**/api/admin/gmail/threads?email=**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(options.threadList ?? THREAD_LIST),
    })
  })
  await page.route("**/api/admin/gmail/threads/body?threadId=**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(options.threadBody ?? THREAD_BODY_WITH_ATTACHMENT),
    })
  })
  await page.route("**/api/admin/gmail/forward", async (route) => {
    if (options.onForwardPost) {
      const body = await parseFormDataBody(route)
      options.onForwardPost(body)
    }
    await route.fulfill({
      status: options.forwardStatus ?? 200,
      contentType: "application/json",
      body: JSON.stringify(options.forwardBody ?? { ok: true }),
    })
  })
  await page.route("**/api/admin/gmail/send", async (route) => {
    await route.fulfill({
      status: options.composeStatus ?? 200,
      contentType: "application/json",
      body: JSON.stringify(options.composeBody ?? { ok: true }),
    })
  })
  await page.route("**/api/admin/gmail/reply", async (route) => {
    await route.fulfill({
      status: options.replyStatus ?? 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    })
  })
  await page.route("**/api/admin/properties/*/entity-emails**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items: [] }),
    })
  })

  await signInAsAdmin(page)
  await page.goto("/admin/properties")
  await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible()
  await page.getByTestId("admin-entity-row--properties--1001").click()
  await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible()

  if (options.openContactsTab !== false) {
    await page.getByTestId("panda-properties-form-tab-trigger--contacts").click()
    await expect(page.getByTestId("property-contact-row--601")).toBeVisible()
  }
}

async function openForwardDialogOnMessage(
  page: Parameters<typeof routePandaPropertiesListDetailAndBuyerOffers>[0],
  messageId = "msg-contact-1",
) {
  await page.getByTestId("property-contact-inbox--601").click()
  await expect(page.getByTestId("entity-threads-panel")).toBeVisible()
  await page.getByTestId("gmail-thread-row").click()
  await expect(page.getByTestId(`gmail-thread-message--${messageId}`)).toBeVisible()
  await page.getByTestId(`gmail-thread-forward--${messageId}`).click()
  await expect(page.getByTestId("property-gmail-compose-dialog")).toBeVisible()
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe("Panda Realty — gmail forward from message blocks (mocked APIs)", () => {
  test.beforeEach(({ page: _page }) => {
    requirePandaE2eAdminCredentials()
  })

  // ── Happy path ──────────────────────────────────────────────────────────────

  test("1. forward button is visible alongside reply button in each expanded message block", async ({ page }) => {
    await setup(page)

    await page.getByTestId("property-contact-inbox--601").click()
    await page.getByTestId("gmail-thread-row").click()

    await expect(page.getByTestId("gmail-thread-message--msg-contact-1")).toBeVisible()
    await expect(page.getByTestId("gmail-thread-forward--msg-contact-1")).toBeVisible()
    await expect(page.getByTestId("gmail-thread-reply--msg-contact-1")).toBeVisible()
  })

  test("2. clicking forward opens the compose dialog with title 'Forward'", async ({ page }) => {
    await setup(page)

    await openForwardDialogOnMessage(page)

    await expect(
      page.getByTestId("property-gmail-compose-dialog").getByRole("heading", { name: "Forward" }),
    ).toBeVisible()
  })

  test("3. forward compose To field is empty and editable", async ({ page }) => {
    await setup(page)

    await openForwardDialogOnMessage(page)

    const toInput = page.getByTestId("property-gmail-compose-to")
    await expect(toInput).toHaveValue("")
    await toInput.fill("recipient@example.com")
    await expect(toInput).toHaveValue("recipient@example.com")
  })

  test("4. forward subject is prefilled with single Fwd: prefix", async ({ page }) => {
    await setup(page)

    await openForwardDialogOnMessage(page)

    await expect(page.getByTestId("property-gmail-compose-subject")).toHaveValue(FWD_SUBJECT)
  })

  test("5. editor body contains styled forwarded-message blockquote with original metadata and body", async ({ page }) => {
    await setup(page)

    await openForwardDialogOnMessage(page)

    const editor = page.getByTestId("property-gmail-compose-editor")
    await expect(editor).toContainText("Forwarded message")
    await expect(editor).toContainText(ORIGINAL_FROM)
    await expect(editor).toContainText(ORIGINAL_SUBJECT)
    await expect(editor).toContainText(ORIGINAL_BODY)
  })

  test("6. original attachments are pre-populated as removable chips", async ({ page }) => {
    await setup(page)

    await openForwardDialogOnMessage(page)

    await expect(page.getByTestId("property-gmail-compose-attachment-chip")).toHaveCount(1)
    await expect(page.getByTestId("property-gmail-compose-attachment-chip")).toContainText("report.pdf")
  })

  test("7. removing a pre-populated attachment chip removes it from the list", async ({ page }) => {
    await setup(page)

    await openForwardDialogOnMessage(page)

    await expect(page.getByTestId("property-gmail-compose-attachment-chip")).toHaveCount(1)
    await page.getByTestId("property-gmail-compose-attachment-remove").click()
    await expect(page.getByTestId("property-gmail-compose-attachment-chip")).toHaveCount(0)
  })

  test("8. forward send posts to /api/admin/gmail/forward and closes on success", async ({ page }) => {
    let forwardPayload: Record<string, string | undefined> = {}
    await setup(page, {
      onForwardPost: (body) => {
        forwardPayload = body
      },
    })

    await openForwardDialogOnMessage(page)
    await page.getByTestId("property-gmail-compose-to").fill("recipient@example.com")
    await page.getByTestId("property-gmail-compose-send").click()

    await expect(page.getByTestId("property-gmail-compose-dialog")).not.toBeVisible()
    expect(forwardPayload).toMatchObject({
      to: "recipient@example.com",
      subject: FWD_SUBJECT,
      messageId: "msg-contact-1",
    })
  })

  test("9. forward send includes remaining original attachment refs in the request", async ({ page }) => {
    let forwardPayload: Record<string, string | undefined> = {}
    await setup(page, {
      onForwardPost: (body) => {
        forwardPayload = body
      },
    })

    await openForwardDialogOnMessage(page)
    await page.getByTestId("property-gmail-compose-to").fill("recipient@example.com")
    await page.getByTestId("property-gmail-compose-send").click()

    await expect(page.getByTestId("property-gmail-compose-dialog")).not.toBeVisible()
    expect(forwardPayload).toMatchObject({ attachmentId: ATT_1.attachmentId })
  })

  test("10. cancelling forward closes the dialog and keeps the thread panel open", async ({ page }) => {
    await setup(page)

    await openForwardDialogOnMessage(page)
    await page.getByTestId("property-gmail-compose-cancel").click()

    await expect(page.getByTestId("property-gmail-compose-dialog")).not.toBeVisible()
    await expect(page.getByTestId("entity-threads-panel")).toBeVisible()
    await expect(page.getByTestId("gmail-thread-message--msg-contact-1")).toBeVisible()
  })

  // ── Entity scope ────────────────────────────────────────────────────────────

  test("11. forward button is present in Buyers tab thread messages", async ({ page }) => {
    await setup(page, { buyers: BUYER_WITH_EMAIL, openContactsTab: false })

    await page.getByTestId("panda-properties-form-tab-trigger--buyers").click()
    await expect(page.getByTestId("property-buyer-panel-row--501")).toBeVisible()
    await page.getByTestId("property-buyer-panel-inbox--501").click()
    await expect(page.getByTestId("entity-threads-panel")).toBeVisible()
    await page.getByTestId("gmail-thread-row").click()
    await expect(page.getByTestId("gmail-thread-forward--msg-contact-1")).toBeVisible()
  })

  test("12. forward button is present in Tenants tab thread messages", async ({ page }) => {
    await setup(page, { tenants: TENANT_WITH_EMAIL, openContactsTab: false })

    await page.getByTestId("panda-properties-form-tab-trigger--tenants").click()
    await expect(page.getByTestId("property-tenant-row--701")).toBeVisible()
    await page.getByTestId("property-tenant-inbox--701").click()
    await expect(page.getByTestId("entity-threads-panel")).toBeVisible()
    await page.getByTestId("gmail-thread-row").click()
    await expect(page.getByTestId("gmail-thread-forward--msg-contact-1")).toBeVisible()
  })

  test("13. forward button is present in property-list owner inbox dialog", async ({ page }) => {
    await setup(page, { openContactsTab: false })

    // Close property edit dialog and use list inbox
    await page.getByRole("button", { name: "Cancel" }).click()
    await expect(page.getByTestId("admin-entity-crud-dialog--properties")).not.toBeVisible()
    await page.getByTestId(`property-list-inbox-button--1001`).first().click()
    await expect(page.getByTestId(`property-list-inbox-dialog--1001`)).toBeVisible()
    await page.getByTestId("gmail-thread-row").click()
    await expect(page.getByTestId("gmail-thread-forward--msg-contact-1")).toBeVisible()
  })

  // ── Edge cases ──────────────────────────────────────────────────────────────

  test("14. message with no attachments shows no pre-populated chips", async ({ page }) => {
    await setup(page, { threadBody: THREAD_BODY_NO_ATTACHMENT })

    await page.getByTestId("property-contact-inbox--601").click()
    await page.getByTestId("gmail-thread-row").click()
    await page.getByTestId("gmail-thread-forward--msg-contact-2").click()

    await expect(page.getByTestId("property-gmail-compose-dialog")).toBeVisible()
    await expect(page.getByTestId("property-gmail-compose-attachment-chip")).toHaveCount(0)
  })

  test("15. forwarding a message already starting with Fwd: does not produce Fwd: Fwd:", async ({ page }) => {
    await setup(page, { threadBody: THREAD_BODY_FWD_SUBJECT })

    await page.getByTestId("property-contact-inbox--601").click()
    await page.getByTestId("gmail-thread-row").click()
    await page.getByTestId("gmail-thread-forward--msg-fwd-existing").click()

    await expect(page.getByTestId("property-gmail-compose-subject")).toHaveValue(FWD_SUBJECT)
    await expect(page.getByTestId("property-gmail-compose-subject")).not.toHaveValue(`Fwd: Fwd:${ORIGINAL_SUBJECT}`)
  })

  test("16. forwarding a message with empty subject keeps subject field empty", async ({ page }) => {
    await setup(page, { threadBody: THREAD_BODY_EMPTY_SUBJECT })

    await page.getByTestId("property-contact-inbox--601").click()
    await page.getByTestId("gmail-thread-row").click()
    await page.getByTestId("gmail-thread-forward--msg-empty-subject").click()

    await expect(page.getByTestId("property-gmail-compose-subject")).toHaveValue("")
  })

  test("17. removing all pre-populated chips and sending still succeeds", async ({ page }) => {
    let forwardPayload: Record<string, string | undefined> = {}
    await setup(page, {
      onForwardPost: (body) => {
        forwardPayload = body
      },
    })

    await openForwardDialogOnMessage(page)
    await page.getByTestId("property-gmail-compose-attachment-remove").click()
    await expect(page.getByTestId("property-gmail-compose-attachment-chip")).toHaveCount(0)
    await page.getByTestId("property-gmail-compose-to").fill("recipient@example.com")
    await page.getByTestId("property-gmail-compose-send").click()

    await expect(page.getByTestId("property-gmail-compose-dialog")).not.toBeVisible()
    // No attachmentId in payload when all chips removed
    expect(forwardPayload.attachmentId).toBeUndefined()
  })

  test("18. thread body cache still works after forward actions are added (collapse + re-expand does not refetch)", async ({ page }) => {
    let bodyHitCount = 0
    await setup(page, {
      threadBody: THREAD_BODY_WITH_ATTACHMENT,
    })
    await page.route("**/api/admin/gmail/threads/body?threadId=**", async (route) => {
      bodyHitCount++
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(THREAD_BODY_WITH_ATTACHMENT),
      })
    })

    await page.getByTestId("property-contact-inbox--601").click()
    await page.getByTestId("gmail-thread-row").click()
    await expect(page.getByTestId("gmail-thread-message--msg-contact-1")).toBeVisible()
    // Collapse
    await page.getByTestId("gmail-thread-row").click()
    // Re-expand
    await page.getByTestId("gmail-thread-row").click()
    await expect(page.getByTestId("gmail-thread-message--msg-contact-1")).toBeVisible()

    expect(bodyHitCount).toBeLessThanOrEqual(1)
  })

  // ── Error / rejection states ────────────────────────────────────────────────

  test("19. empty To field — forward send shows inline error and keeps dialog open", async ({ page }) => {
    await setup(page, {
      forwardStatus: 400,
      forwardBody: { error: "Missing required field: to" },
    })

    await openForwardDialogOnMessage(page)
    // Leave To empty, attempt send
    await page.getByTestId("property-gmail-compose-send").click()

    await expect(page.getByTestId("property-gmail-compose-error")).toBeVisible()
    await expect(page.getByTestId("property-gmail-compose-dialog")).toBeVisible()
  })

  test("20. forward send failure shows inline error and keeps dialog open", async ({ page }) => {
    await setup(page, {
      forwardStatus: 502,
      forwardBody: { error: "Gmail send failed" },
    })

    await openForwardDialogOnMessage(page)
    await page.getByTestId("property-gmail-compose-to").fill("recipient@example.com")
    await page.getByTestId("property-gmail-compose-send").click()

    await expect(page.getByTestId("property-gmail-compose-error")).toBeVisible()
    await expect(page.getByTestId("property-gmail-compose-dialog")).toBeVisible()
  })

  // ── Regression ──────────────────────────────────────────────────────────────

  test("21. existing in-thread Reply action still works after Forward is added", async ({ page }) => {
    await setup(page)

    await page.getByTestId("property-contact-inbox--601").click()
    await page.getByTestId("gmail-thread-row").click()
    await expect(page.getByTestId("gmail-thread-reply--msg-contact-1")).toBeEnabled()
    await page.getByTestId("gmail-thread-reply--msg-contact-1").click()

    await expect(page.getByTestId("property-gmail-compose-dialog")).toBeVisible()
    await expect(
      page.getByTestId("property-gmail-compose-dialog").getByRole("heading", { name: "Reply" }),
    ).toBeVisible()
    await expect(page.getByTestId("property-gmail-compose-to")).toHaveValue(CONTACT_EMAIL)
  })

  test("22. existing row-level compose action still opens a new-email draft unaffected by Forward", async ({ page }) => {
    await setup(page)

    await page.getByTestId("property-contact-quick-email--601").click()

    await expect(page.getByTestId("property-gmail-compose-dialog")).toBeVisible()
    await expect(
      page.getByTestId("property-gmail-compose-dialog").getByRole("heading", { name: "New Message" }),
    ).toBeVisible()
    await expect(page.getByTestId("property-gmail-compose-to")).toHaveValue(CONTACT_EMAIL)
  })

  // ── Persistence ─────────────────────────────────────────────────────────────

  test("23. after reload Forward button is still present and Reply + compose are unaffected", async ({ page }) => {
    await setup(page)

    // Verify once
    await page.getByTestId("property-contact-inbox--601").click()
    await page.getByTestId("gmail-thread-row").click()
    await expect(page.getByTestId("gmail-thread-forward--msg-contact-1")).toBeVisible()

    // Reload and verify again (route mocks persist on page object; no re-auth needed)
    await page.reload()
    await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible()
    await page.getByTestId("admin-entity-row--properties--1001").click()
    await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible()
    await page.getByTestId("panda-properties-form-tab-trigger--contacts").click()
    await expect(page.getByTestId("property-contact-row--601")).toBeVisible()
    await page.getByTestId("property-contact-inbox--601").click()
    await page.getByTestId("gmail-thread-row").click()
    await expect(page.getByTestId("gmail-thread-forward--msg-contact-1")).toBeVisible()
    await expect(page.getByTestId("gmail-thread-reply--msg-contact-1")).toBeVisible()
  })
})
