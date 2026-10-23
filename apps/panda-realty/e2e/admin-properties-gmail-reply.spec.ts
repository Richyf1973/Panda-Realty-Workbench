/**
 * Run (from repo root):
 *   npx playwright test apps/panda-realty/e2e/admin-properties-gmail-reply.spec.ts --config=apps/panda-realty/playwright.config.ts
 * Or via workspace script:
 *   npm run test:e2e -w panda-realty -- apps/panda-realty/e2e/admin-properties-gmail-reply.spec.ts
 */

import { expect, test } from "@playwright/test"

import { requirePandaE2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import { openPropertyEditDialog, PROPERTY_TWO_OWNERS } from "./helpers/panda-properties-owners-helpers"
import { routePandaPropertiesListDetailAndBuyerOffers } from "./helpers/panda-properties-dialog-mocks"
import { parseFormDataBody } from "./helpers/panda-properties-gmail-helpers"

const PROPERTY_SUBJECT = "12 Test Street, Testville"
const CONTACT_EMAIL = "caboolture@vantage.com.au"
const ALT_SENDER_EMAIL = "assistant@vantage.com.au"
const BUYER_EMAIL = "dhungelashok33@gmail.com"
const TENANT_EMAIL = "bob@tenant.com"

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

const THREAD_LIST_RESPONSE = {
  threads: [
    {
      threadId: "thread-1",
      subject: "Re: Welcome Pack Request For 12/176 Torrens Rd",
      from: `Vantage Caboolture <${CONTACT_EMAIL}>`,
      date: "2026-04-27T00:00:00.000Z",
      snippet: "Hi Richard, Thank you for your email...",
      attachmentCount: 0,
    },
  ],
}

const THREAD_BODY_RESPONSE = {
  messages: [
    {
      messageId: "msg-contact-1",
      from: `Vantage Caboolture <${CONTACT_EMAIL}>`,
      date: "2026-04-27T00:00:00.000Z",
      subject: "Re: Welcome Pack Request For 12/176 Torrens Rd",
      body: "Hi Richard,\nThank you for your email.",
      attachments: [],
    },
    {
      messageId: "msg-admin-1",
      from: "My Panda Realty <admin@mypandarealty.com.au>",
      date: "2026-04-26T00:00:00.000Z",
      subject: "Welcome Pack Request For 12/176 Torrens Rd",
      body: "Dear team,\n\nCould I have a Welcome Pack, please?",
      attachments: [],
    },
  ],
}

const THREAD_BODY_MULTI_SENDER_RESPONSE = {
  messages: [
    {
      messageId: "msg-contact-1",
      from: `Vantage Caboolture <${CONTACT_EMAIL}>`,
      date: "2026-04-27T00:00:00.000Z",
      subject: "Re: Welcome Pack Request For 12/176 Torrens Rd",
      body: "Hi Richard,\nThank you for your email.",
      attachments: [],
    },
    {
      messageId: "msg-assistant-1",
      from: `Assistant Agent <${ALT_SENDER_EMAIL}>`,
      date: "2026-04-27T01:00:00.000Z",
      subject: "Re: Welcome Pack Request For 12/176 Torrens Rd",
      body: "Following up on behalf of the team.",
      attachments: [],
    },
  ],
}

const THREAD_BODY_INVALID_SENDER_RESPONSE = {
  messages: [
    {
      messageId: "msg-invalid-sender-1",
      from: "Unknown Sender",
      date: "2026-04-27T00:00:00.000Z",
      subject: "Re: Welcome Pack Request For 12/176 Torrens Rd",
      body: "This message has no replyable sender email.",
      attachments: [],
    },
  ],
}

test.describe("Panda Realty - gmail in-thread reply from property contacts (mocked APIs)", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaE2eAdminCredentials()

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

    await signInAsAdmin(page)
  })

  async function setupAndOpenContactsDialog(
    page: Parameters<typeof routePandaPropertiesListDetailAndBuyerOffers>[0],
    options?: {
      propertyDetail?: object
      buyers?: object
      contacts?: object
      tenants?: object
      openContactsTab?: boolean
      threadList?: object
      threadBody?: object
      replyStatus?: number
      replyBody?: object
      composeStatus?: number
      composeBody?: object
      onReplyPost?: (body: unknown) => void
      onThreadsHit?: () => void
      onThreadBodyHit?: () => void
    },
  ) {
    await routePandaPropertiesListDetailAndBuyerOffers(page)
    if (options?.propertyDetail) {
      await page.route("**/api/admin/properties/1001*", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(options.propertyDetail),
        })
      })
    }
    await page.route("**/api/admin/properties/1001/contacts**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(options?.contacts ?? CONTACT_WITH_EMAIL),
      })
    })
    await page.route("**/api/admin/properties/1001/buyers**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(options?.buyers ?? EMPTY_PANEL_RESPONSE),
      })
    })
    await page.route("**/api/admin/properties/1001/tenants**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(options?.tenants ?? EMPTY_PANEL_RESPONSE),
      })
    })
    await page.route("**/api/admin/gmail/threads?email=**", async (route) => {
      options?.onThreadsHit?.()
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(options?.threadList ?? THREAD_LIST_RESPONSE),
      })
    })
    await page.route("**/api/admin/gmail/threads/body?threadId=**", async (route) => {
      options?.onThreadBodyHit?.()
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(options?.threadBody ?? THREAD_BODY_RESPONSE),
      })
    })
    await page.route("**/api/admin/gmail/send", async (route) => {
      await route.fulfill({
        status: options?.composeStatus ?? 200,
        contentType: "application/json",
        body: JSON.stringify(options?.composeBody ?? { ok: true }),
      })
    })
    await page.route("**/api/admin/gmail/reply", async (route) => {
      options?.onReplyPost?.(await parseFormDataBody(route))
      await route.fulfill({
        status: options?.replyStatus ?? 200,
        contentType: "application/json",
        body: JSON.stringify(options?.replyBody ?? { ok: true }),
      })
    })

    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible()
    await page.getByTestId("admin-entity-row--properties--1001").click()
    await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible()
    if (options?.openContactsTab !== false) {
      await page.getByTestId("panda-properties-form-tab-trigger--contacts").click()
      await expect(page.getByTestId("property-contact-row--601")).toBeVisible()
    }
  }

  async function openReplyDialogOnMessage(page: Parameters<typeof routePandaPropertiesListDetailAndBuyerOffers>[0], messageId = "msg-contact-1") {
    await page.getByTestId("property-contact-inbox--601").click()
    await expect(page.getByTestId("entity-threads-panel")).toBeVisible()
    await page.getByTestId("gmail-thread-row").click()
    await expect(page.getByTestId(`gmail-thread-message--${messageId}`)).toBeVisible()
    await page.getByTestId(`gmail-thread-reply--${messageId}`).click()
    await expect(page.getByTestId("property-gmail-compose-dialog")).toBeVisible()
  }

  test("1. existing row mail icon still opens the brand-new compose flow", async ({ page }) => {
    await setupAndOpenContactsDialog(page)

    await page.getByTestId("property-contact-quick-email--601").click()

    await expect(page.getByTestId("property-gmail-compose-dialog")).toBeVisible()
    await expect(page.getByTestId("property-gmail-compose-to")).toHaveValue(CONTACT_EMAIL)
    await expect(page.getByTestId("property-gmail-compose-subject")).toHaveValue(PROPERTY_SUBJECT)
    await expect(page.getByTestId("property-gmail-compose-editor")).toContainText(
      "Dear Vantage Caboolture Riverfront,",
    )
  })

  test("2. inbox still loads the contact thread inline under the contact row", async ({ page }) => {
    await setupAndOpenContactsDialog(page)

    await page.getByTestId("property-contact-inbox--601").click()

    await expect(page.getByTestId("entity-threads-panel")).toBeVisible()
    await expect(page.getByText("Re: Welcome Pack Request For 12/176 Torrens Rd")).toBeVisible()
  })

  test("3. expanded thread messages show a reply action", async ({ page }) => {
    await setupAndOpenContactsDialog(page)

    await page.getByTestId("property-contact-inbox--601").click()
    await page.getByTestId("gmail-thread-row").click()

    await expect(page.getByTestId("gmail-thread-message--msg-contact-1")).toBeVisible()
    await expect(page.getByTestId("gmail-thread-reply--msg-contact-1")).toBeVisible()
  })

  test("4. clicking thread reply opens the in-app compose dialog from the property dialog", async ({ page }) => {
    await setupAndOpenContactsDialog(page)

    await openReplyDialogOnMessage(page)

    await expect(page.getByTestId("property-gmail-compose-dialog")).toBeVisible()
    await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible()
  })

  test("5. thread reply targets only the sender of the clicked message", async ({ page }) => {
    await setupAndOpenContactsDialog(page)

    await openReplyDialogOnMessage(page)

    await expect(page.getByTestId("property-gmail-compose-to")).toHaveValue(CONTACT_EMAIL)
  })

  test("6. thread reply subject is prefilled as a single Re: subject without duplicating the prefix", async ({ page }) => {
    await setupAndOpenContactsDialog(page)

    await openReplyDialogOnMessage(page)

    await expect(page.getByTestId("property-gmail-compose-subject")).toHaveValue(
      "Re: Welcome Pack Request For 12/176 Torrens Rd",
    )
  })

  test("7. thread reply body starts with the standard greeting and does not inject quoted thread text", async ({ page }) => {
    await setupAndOpenContactsDialog(page)

    await openReplyDialogOnMessage(page)

    await expect(page.getByTestId("property-gmail-compose-editor")).toContainText(
      "Dear Vantage Caboolture Riverfront,",
    )
    await expect(page.getByTestId("property-gmail-compose-editor")).not.toContainText("Hi Richard")
  })

  test("8. sending a thread reply posts reply metadata and closes on success", async ({ page }) => {
    let replyPayload: unknown = null
    await setupAndOpenContactsDialog(page, {
      onReplyPost: (body) => {
        replyPayload = body
      },
    })

    await openReplyDialogOnMessage(page)
    await page.getByTestId("property-gmail-compose-editor").click()
    await page.keyboard.press("End")
    await page.keyboard.type("\nThanks for the update.")
    await page.getByTestId("property-gmail-compose-send").evaluate((button) => {
      ;(button as HTMLButtonElement).click()
    })

    await expect(page.getByTestId("property-gmail-compose-dialog")).not.toBeVisible()
    expect(replyPayload).toMatchObject({
      threadId: "thread-1",
      messageId: "msg-contact-1",
      to: CONTACT_EMAIL,
      subject: "Re: Welcome Pack Request For 12/176 Torrens Rd",
    })
  })

  test("9. replying on a different message retargets the draft to that clicked sender", async ({ page }) => {
    await setupAndOpenContactsDialog(page, { threadBody: THREAD_BODY_MULTI_SENDER_RESPONSE })

    await openReplyDialogOnMessage(page, "msg-assistant-1")

    await expect(page.getByTestId("property-gmail-compose-to")).toHaveValue(ALT_SENDER_EMAIL)
  })

  test("10. cancelling a thread reply closes the draft and keeps the thread panel open", async ({ page }) => {
    await setupAndOpenContactsDialog(page)

    await openReplyDialogOnMessage(page)
    await page.getByTestId("property-gmail-compose-cancel").click()

    await expect(page.getByTestId("property-gmail-compose-dialog")).not.toBeVisible()
    await expect(page.getByTestId("entity-threads-panel")).toBeVisible()
    await expect(page.getByTestId("gmail-thread-message--msg-contact-1")).toBeVisible()
  })

  test("11. clearing the reply subject still allows send, matching the existing compose behavior", async ({ page }) => {
    let replyPayload: unknown = null
    await setupAndOpenContactsDialog(page, {
      onReplyPost: (body) => {
        replyPayload = body
      },
    })

    await openReplyDialogOnMessage(page)
    await page.getByTestId("property-gmail-compose-subject").fill("")
    await page.getByTestId("property-gmail-compose-send").evaluate((button) => {
      ;(button as HTMLButtonElement).click()
    })

    expect(replyPayload).toMatchObject({
      subject: "",
    })
    await expect(page.getByTestId("property-gmail-compose-dialog")).not.toBeVisible()
  })

  test("12. the existing row-level compose flow still shows the current Gmail-not-connected inline error", async ({ page }) => {
    await setupAndOpenContactsDialog(page, {
      composeStatus: 503,
      composeBody: { error: "Gmail is not connected. Please connect your Google account." },
    })

    await page.getByTestId("property-contact-quick-email--601").click()
    await page.getByTestId("property-gmail-compose-send").evaluate((button) => {
      ;(button as HTMLButtonElement).click()
    })

    await expect(page.getByTestId("property-gmail-compose-error")).toContainText(
      "Gmail is not connected. Please connect your Google account.",
    )
    await expect(page.getByTestId("property-gmail-compose-dialog")).toBeVisible()
  })

  test("13. reply send failure shows an inline error and keeps the reply dialog open", async ({ page }) => {
    await setupAndOpenContactsDialog(page, {
      replyStatus: 502,
      replyBody: { error: "Gmail reply failed" },
    })

    await openReplyDialogOnMessage(page)
    await page.getByTestId("property-gmail-compose-send").evaluate((button) => {
      ;(button as HTMLButtonElement).click()
    })

    await expect(page.getByTestId("property-gmail-compose-error")).toContainText("Gmail reply failed")
    await expect(page.getByTestId("property-gmail-compose-dialog")).toBeVisible()
  })

  test("14. messages without a replyable sender email do not allow opening a broken reply draft", async ({ page }) => {
    await setupAndOpenContactsDialog(page, { threadBody: THREAD_BODY_INVALID_SENDER_RESPONSE })

    await page.getByTestId("property-contact-inbox--601").click()
    await page.getByTestId("gmail-thread-row").click()

    await expect(page.getByTestId("gmail-thread-message--msg-invalid-sender-1")).toBeVisible()
    await expect(page.getByTestId("gmail-thread-reply--msg-invalid-sender-1")).toBeDisabled()
    await expect(page.getByTestId("property-gmail-compose-dialog")).toHaveCount(0)
  })

  test("15. thread body data still stays cached across collapse and re-expand after reply actions are added", async ({ page }) => {
    let bodyHits = 0
    await setupAndOpenContactsDialog(page, {
      onThreadBodyHit: () => {
        bodyHits += 1
      },
    })

    await page.getByTestId("property-contact-inbox--601").click()
    await page.getByTestId("gmail-thread-row").click()
    await expect(page.getByTestId("gmail-thread-message--msg-contact-1")).toBeVisible()
    await page.getByTestId("gmail-thread-row").click()
    await page.getByTestId("gmail-thread-row").click()
    await expect(page.getByTestId("gmail-thread-message--msg-contact-1")).toBeVisible()

    expect(bodyHits).toBe(1)
  })

  test("16. after reload, the row-level compose action and the in-thread reply action are both still available", async ({ page }) => {
    await setupAndOpenContactsDialog(page)

    await page.reload()
    await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible()
    await page.getByTestId("admin-entity-row--properties--1001").click()
    await page.getByTestId("panda-properties-form-tab-trigger--contacts").click()

    await expect(page.getByTestId("property-contact-quick-email--601")).toBeVisible()
    await page.getByTestId("property-contact-inbox--601").click()
    await page.getByTestId("gmail-thread-row").click()
    await expect(page.getByTestId("gmail-thread-reply--msg-contact-1")).toBeVisible()
  })

  test("17. buyers tab now wires the in-thread reply action instead of leaving it disabled", async ({ page }) => {
    await setupAndOpenContactsDialog(page, {
      buyers: BUYER_WITH_EMAIL,
      contacts: EMPTY_PANEL_RESPONSE,
      openContactsTab: false,
    })

    await page.getByTestId("panda-properties-form-tab-trigger--buyers").click()
    await expect(page.getByTestId("property-buyer-panel-row--501")).toBeVisible()
    await page.getByTestId("property-buyer-panel-inbox--501").click()
    await page.getByTestId("gmail-thread-row").click()
    await expect(page.getByTestId("gmail-thread-reply--msg-contact-1")).toBeEnabled()
    await page.getByTestId("gmail-thread-reply--msg-contact-1").click()
    await expect(page.getByTestId("property-gmail-compose-to")).toHaveValue(CONTACT_EMAIL)
    await expect(page.getByTestId("property-gmail-compose-editor")).toContainText("Dear Ash D,")
  })

  test("18. tenants tab now wires the in-thread reply action instead of leaving it disabled", async ({ page }) => {
    await setupAndOpenContactsDialog(page, {
      tenants: TENANT_WITH_EMAIL,
      contacts: EMPTY_PANEL_RESPONSE,
      openContactsTab: false,
    })

    await page.getByTestId("panda-properties-form-tab-trigger--tenants").click()
    await expect(page.getByTestId("property-tenant-row--701")).toBeVisible()
    await page.getByTestId("property-tenant-inbox--701").click()
    await page.getByTestId("gmail-thread-row").click()
    await expect(page.getByTestId("gmail-thread-reply--msg-contact-1")).toBeEnabled()
    await page.getByTestId("gmail-thread-reply--msg-contact-1").click()
    await expect(page.getByTestId("property-gmail-compose-to")).toHaveValue(CONTACT_EMAIL)
    await expect(page.getByTestId("property-gmail-compose-editor")).toContainText("Dear Bob Tenant,")
  })

  test("19. owners section now wires the in-thread reply action instead of leaving it disabled", async ({ page }) => {
    await page.route("**/api/admin/gmail/threads?email=**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(THREAD_LIST_RESPONSE),
      })
    })
    await page.route("**/api/admin/gmail/threads/body?threadId=**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(THREAD_BODY_RESPONSE),
      })
    })
    await page.route("**/api/admin/gmail/send", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      })
    })
    await page.route("**/api/admin/gmail/reply", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      })
    })

    await openPropertyEditDialog(page, PROPERTY_TWO_OWNERS)

    await expect(page.getByTestId("property-owner-inbox--1")).toBeVisible()
    await page.getByTestId("property-owner-inbox--1").click()
    await page.getByTestId("gmail-thread-row").click()
    await expect(page.getByTestId("gmail-thread-reply--msg-contact-1")).toBeEnabled()
    await page.getByTestId("gmail-thread-reply--msg-contact-1").click()
    await expect(page.getByTestId("property-gmail-compose-to")).toHaveValue(CONTACT_EMAIL)
    await expect(page.getByTestId("property-gmail-compose-editor")).toContainText("Dear Smith, John,")
  })
})
