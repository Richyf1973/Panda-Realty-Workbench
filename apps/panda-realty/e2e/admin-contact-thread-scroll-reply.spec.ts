import { expect, test } from "@playwright/test"

import {
  e2eAdminCredentials,
  e2ePandaAdminListApiConfigured,
  signInAsAdmin,
} from "./helpers/admin-auth"

const SEED_PROPERTY_STREET = "99 E2E Seed Street"

const FAKE_PROPERTY_CONTACT: Record<string, unknown> = {
  propertyEntityId: 300,
  entityId: 2,
  entityName: "E2E Thread Scroll Test Contact",
  phoneNumber: null,
  emailAddress: null,
  address: null,
  esuburb: null,
  estate: null,
  epostcode: null,
  notes: null,
  contactCategoryId: null,
  contactCategoryName: null,
  association: null,
}

const CONTACT_MEMBER_WITH_EMAIL: Record<string, unknown> = {
  entityMemberId: 501,
  entityId: 2,
  memberName: "Shannon Bland",
  memberPhoneNumber: "0734059399",
  memberEmailAddress: "shannon@njroselawyers.com.au",
}

const FAKE_THREAD = {
  threadId: "thread-nj-rose-1",
  subject: "Taylor to Matthews, 184/46 AMY STREET",
  from: "Shannon Bland <shannon@njroselawyers.com.au>",
  date: "2026-05-18T01:00:00Z",
  snippet: "I confirm that we have received the Sales Contract for the sale.",
  attachmentCount: 0,
}

const LONG_BODY = [
  "Dear Colleagues,",
  "",
  "I confirm that we have received the Sales Contract for the sale.",
  "",
  "Last week Merilyn Matthews forwarded our office a copy of all the disclosure information from the Park. However the form 2 site agreement was blank.",
  "",
  "Could you confirm if your office has since received a digital copy of the form 2 with all the information filled in?",
  "",
  "If not I will request a copy from the Park.",
  "",
  "Thank you.",
  "",
  "Kind regards,",
  "",
  "Shannon Bland",
  "Solicitor",
  "NJ ROSE LAWYERS",
  "Phone: (07) 3495 0399 M: 0437 261 960",
  "Email: shannon@njroselawyers.com.au",
  ...Array.from({ length: 80 }, (_, i) => `Line ${i + 1} of additional email content to make the body long enough to trigger scroll.`),
].join("\n")

const FAKE_MESSAGES = [
  {
    messageId: "msg-nj-rose-1",
    from: "Shannon Bland <shannon@njroselawyers.com.au>",
    date: "2026-05-18T01:00:00Z",
    subject: "Taylor to Matthews, 184/46 AMY STREET",
    body: LONG_BODY,
    attachments: [],
  },
]

test.describe("Contact thread — message body scroll and reply visibility", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")
    test.skip(
      !e2ePandaAdminListApiConfigured,
      "DATABASE_URL not set — admin list uses live APIs",
    )
    await signInAsAdmin(page)
  })

  async function openContactDialogWithMember(page: Parameters<typeof signInAsAdmin>[0]) {
    await page.route("**/api/admin/properties/*/contacts", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ items: [FAKE_PROPERTY_CONTACT] }),
        })
      } else {
        await route.continue()
      }
    })

    await page.route("**/api/admin/entity-members**", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ items: [CONTACT_MEMBER_WITH_EMAIL] }),
        })
      } else {
        await route.continue()
      }
    })

    await page.route("**/api/admin/property-entities**", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ items: [] }),
        })
      } else {
        await route.continue()
      }
    })

    await page.route("**/api/admin/gmail/threads**", async (route) => {
      const url = new URL(route.request().url())
      if (url.pathname === "/api/admin/gmail/threads") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ threads: [FAKE_THREAD] }),
        })
      } else if (url.pathname === "/api/admin/gmail/threads/body") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ messages: FAKE_MESSAGES }),
        })
      } else {
        await route.continue()
      }
    })

    await page.goto(
      `/admin/properties?limit=25&page=1&search=${encodeURIComponent(SEED_PROPERTY_STREET)}&sortKey=updatedAt&sortDir=desc`,
    )
    const editButton = page.getByTestId(/^admin-entity-row-edit--properties--/).first()
    await expect(editButton).toBeVisible({ timeout: 15_000 })
    await editButton.click()
    await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible()
    await page.getByTestId("panda-properties-form-tab-trigger--contacts").click()
    await expect(page.getByTestId("panda-properties-form-tab--contacts")).toBeVisible()

    const contactEditBtn = page.getByTestId(
      `property-contact-edit--${FAKE_PROPERTY_CONTACT.propertyEntityId as number}`,
    )
    await expect(contactEditBtn).toBeVisible({ timeout: 10_000 })
    await contactEditBtn.click()

    const dialog = page.getByTestId("property-contact-dialog")
    await expect(dialog).toBeVisible({ timeout: 10_000 })
    return dialog
  }

  test("reply button is visible after expanding a long thread message", async ({ page }) => {
    await openContactDialogWithMember(page)
    const id = CONTACT_MEMBER_WITH_EMAIL.entityMemberId as number

    // Open thread panel
    await page.getByTestId(`contact-member-inbox--${id}`).click()
    await expect(page.getByTestId("entity-threads-panel")).toBeVisible({ timeout: 10_000 })

    // Expand the thread row
    await page.getByTestId("gmail-thread-row").click()
    const messageBlock = page.getByTestId(`gmail-thread-message--${FAKE_MESSAGES[0].messageId}`)
    await expect(messageBlock).toBeVisible({ timeout: 10_000 })

    // Reply button must be visible without needing to scroll the page
    const replyBtn = page.getByTestId(`gmail-thread-reply--${FAKE_MESSAGES[0].messageId}`)
    await expect(replyBtn).toBeVisible()
  })

  test("message body pre element has scrollable max-height constraint", async ({ page }) => {
    await openContactDialogWithMember(page)
    const id = CONTACT_MEMBER_WITH_EMAIL.entityMemberId as number

    await page.getByTestId(`contact-member-inbox--${id}`).click()
    await expect(page.getByTestId("entity-threads-panel")).toBeVisible({ timeout: 10_000 })
    await page.getByTestId("gmail-thread-row").click()

    const messageBlock = page.getByTestId(`gmail-thread-message--${FAKE_MESSAGES[0].messageId}`)
    await expect(messageBlock).toBeVisible({ timeout: 10_000 })

    // The pre element inside the message block must have overflow-y: auto
    const pre = messageBlock.locator("pre")
    await expect(pre).toBeVisible()
    const overflowY = await pre.evaluate((el) => getComputedStyle(el).overflowY)
    expect(overflowY).toBe("auto")
  })
})
