/**
 * E2E: Properties admin — owner Inbox dialog (email thread viewer)
 *
 * Success factors (all mocked, no live DB needed):
 * 1. Inbox button visible in the table row action column between Email and Bell buttons.
 * 2. Inbox button disabled with tooltip "No email address" when owner 1 has no email.
 * 3. Inbox button disabled with tooltip "No owner" when property has no owner 1.
 * 4. Clicking inbox opens a dialog titled "Email threads — <owner name>".
 * 5. Dialog body renders EntityThreadsPanel showing thread subjects.
 * 6. Dialog shows empty state "No threads found for..." when API returns no threads.
 * 7. Closing dialog via × restores the property list cleanly.
 * 8. No /api/admin/gmail/threads request fires before inbox is first clicked (lazy load).
 * 9. Expanding a thread shows messages with a Reply button.
 * 10. Clicking Reply closes inbox dialog and opens GmailComposeDialog in reply mode.
 * 11. Gmail API error shows inline error in the threads panel.
 * 12. Regression: Call and Email buttons still present and unaffected.
 */

import { expect, test } from "@playwright/test"

import { e2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import { STATUS_LIST_RESPONSE } from "./helpers/admin-properties-mocks"
import {
  BASE_PROPERTY,
  makeListResponse,
  PROPERTY_ONE_OWNER,
} from "./helpers/panda-properties-owners-helpers"
import {
  EMPTY_THREADS_RESPONSE,
  mockGmailThreadsList,
  THREAD_1,
  THREADS_RESPONSE,
} from "./helpers/panda-properties-gmail-helpers"

// ── Fixtures ──────────────────────────────────────────────────────────────────

const PROPERTY_WITH_EMAIL = {
  ...PROPERTY_ONE_OWNER,
  propertyListId: 3001,
  streetAddress: "10 Inbox Lane",
  suburb: "Threadville",
  owner1name: "Alice Threadsworth",
  owner1phone: "0411111111",
  owner1email: "alice@example.com",
}

const PROPERTY_NO_EMAIL = {
  ...PROPERTY_ONE_OWNER,
  propertyListId: 3002,
  streetAddress: "11 Inbox Lane",
  suburb: "Threadville",
  owner1name: "Bob Noemail",
  owner1phone: "0422222222",
  owner1email: null,
}

const PROPERTY_NO_OWNER = {
  ...BASE_PROPERTY,
  propertyListId: 3003,
  streetAddress: "12 Inbox Lane",
  suburb: "Threadville",
  owner1name: null,
  owner1phone: null,
  owner1email: null,
  combinedOwner: "",
}

const THREAD_BODY_RESPONSE = {
  messages: [
    {
      messageId: "msg-thread-001",
      from: "contracts@keylaw.com.au",
      date: "2026-04-25T06:00:00.000Z",
      subject: THREAD_1.subject,
      body: "Please find attached trust receipt.",
      attachments: [],
    },
  ],
}

// ── Shared setup helpers ───────────────────────────────────────────────────────

async function setupBaseMocks(page: import("@playwright/test").Page, listBody: unknown) {
  await page.route("**/api/admin/properties**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(listBody),
    })
  })
  await page.route("**/api/admin/property-status**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(STATUS_LIST_RESPONSE),
    })
  })
  await page.route("**/api/admin/agents**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) })
  })
}

// Register body mock AFTER threads list mock so it wins LIFO
async function setupBodyMock(page: import("@playwright/test").Page) {
  await page.route("**/api/admin/gmail/threads/body**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(THREAD_BODY_RESPONSE),
    })
  })
}

async function gotoAndWaitForRow(page: import("@playwright/test").Page, propertyListId: number) {
  await page.goto("/admin/properties")
  await expect(
    page.getByTestId(`admin-entity-row--properties--${propertyListId}`),
  ).toBeVisible({ timeout: 15_000 })
}

// ── Tests: happy path ─────────────────────────────────────────────────────────

test.describe("Properties admin — owner Inbox button (mocked)", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")
    await setupBaseMocks(page, makeListResponse(PROPERTY_WITH_EMAIL))
    await mockGmailThreadsList(page, THREADS_RESPONSE)
    await signInAsAdmin(page)
  })

  test("Inbox button is visible in the table row action column", async ({ page }) => {
    await gotoAndWaitForRow(page, 3001)
    await expect(page.getByTestId("property-list-inbox-button--3001").first()).toBeVisible()
  })

  test("Inbox button is positioned between Email and Bell buttons", async ({ page }) => {
    await gotoAndWaitForRow(page, 3001)

    const emailBtn = page.getByTestId("property-list-email-button--3001").first()
    const inboxBtn = page.getByTestId("property-list-inbox-button--3001").first()
    const bellBtn = page.getByTestId("property-list-add-reminder-button--3001").first()

    const emailBox = await emailBtn.boundingBox()
    const inboxBox = await inboxBtn.boundingBox()
    const bellBox = await bellBtn.boundingBox()

    expect(emailBox!.x).toBeLessThan(inboxBox!.x)
    expect(inboxBox!.x).toBeLessThan(bellBox!.x)
  })

  test("clicking Inbox button opens a dialog with owner name in title", async ({ page }) => {
    await gotoAndWaitForRow(page, 3001)

    await page.getByTestId("property-list-inbox-button--3001").first().click()

    const dialog = page.getByTestId("property-list-inbox-dialog--3001")
    await expect(dialog).toBeVisible()
    await expect(dialog).toContainText("Alice Threadsworth")
  })

  test("dialog body shows Gmail thread subjects", async ({ page }) => {
    await gotoAndWaitForRow(page, 3001)
    await page.getByTestId("property-list-inbox-button--3001").first().click()

    await expect(page.getByTestId("property-list-inbox-dialog--3001")).toBeVisible()
    await expect(page.getByText(THREAD_1.subject)).toBeVisible()
  })

  test("closing dialog via × restores the property list cleanly", async ({ page }) => {
    await gotoAndWaitForRow(page, 3001)
    await page.getByTestId("property-list-inbox-button--3001").first().click()

    await expect(page.getByTestId("property-list-inbox-dialog--3001")).toBeVisible()

    await page.getByTestId("property-list-inbox-dialog--3001").getByRole("button", { name: "Close" }).click()

    await expect(page.getByTestId("property-list-inbox-dialog--3001")).not.toBeVisible()
    await expect(page.getByTestId("admin-entity-row--properties--3001")).toBeVisible()
  })

  test("no gmail/threads request fires before inbox is first clicked (lazy load)", async ({
    page,
  }) => {
    let requestFired = false
    await page.route("**/api/admin/gmail/threads**", async (route) => {
      const url = route.request().url()
      if (!url.includes("/threads/body") && !url.includes("/threads/attachment")) {
        requestFired = true
      }
      await route.continue()
    })

    await gotoAndWaitForRow(page, 3001)
    // Wait a beat to confirm no early fire
    await page.waitForTimeout(500)
    expect(requestFired).toBe(false)
  })

  test("regression: Call and Email buttons still present in action column", async ({ page }) => {
    await gotoAndWaitForRow(page, 3001)
    await expect(page.getByTestId("property-list-call-button--3001").first()).toBeVisible()
    await expect(page.getByTestId("property-list-email-button--3001").first()).toBeVisible()
  })
})

// ── Tests: empty state ────────────────────────────────────────────────────────

test.describe("Properties admin — inbox dialog empty state (mocked)", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")
    await setupBaseMocks(page, makeListResponse(PROPERTY_WITH_EMAIL))
    await mockGmailThreadsList(page, EMPTY_THREADS_RESPONSE)
    await signInAsAdmin(page)
  })

  test("dialog shows empty-state message when API returns no threads", async ({ page }) => {
    await gotoAndWaitForRow(page, 3001)
    await page.getByTestId("property-list-inbox-button--3001").first().click()

    await expect(page.getByTestId("property-list-inbox-dialog--3001")).toBeVisible()
    await expect(
      page.getByText(/No threads found for/i),
    ).toBeVisible()
  })
})

// ── Tests: reply ──────────────────────────────────────────────────────────────

test.describe("Properties admin — inbox dialog reply (mocked)", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")
    await setupBaseMocks(page, makeListResponse(PROPERTY_WITH_EMAIL))
    await mockGmailThreadsList(page, THREADS_RESPONSE)
    await setupBodyMock(page) // must be after threads list mock (LIFO priority)
    await signInAsAdmin(page)
  })

  test("expanding a thread shows messages with a Reply button", async ({ page }) => {
    await gotoAndWaitForRow(page, 3001)
    await page.getByTestId("property-list-inbox-button--3001").first().click()

    await expect(page.getByTestId("property-list-inbox-dialog--3001")).toBeVisible()

    // Expand the first thread row via its button
    await page.getByTestId("gmail-thread-row").first().click()

    // Reply button visible on the expanded message
    await expect(
      page.getByTestId(`gmail-thread-reply--msg-thread-001`),
    ).toBeVisible({ timeout: 8_000 })
  })

  test("clicking Reply closes inbox dialog and opens GmailComposeDialog in reply mode", async ({
    page,
  }) => {
    await gotoAndWaitForRow(page, 3001)
    await page.getByTestId("property-list-inbox-button--3001").first().click()
    await expect(page.getByTestId("property-list-inbox-dialog--3001")).toBeVisible()

    await page.getByTestId("gmail-thread-row").first().click()
    await expect(
      page.getByTestId(`gmail-thread-reply--msg-thread-001`),
    ).toBeVisible({ timeout: 8_000 })

    await page.getByTestId("gmail-thread-reply--msg-thread-001").click()

    // Inbox dialog closed
    await expect(page.getByTestId("property-list-inbox-dialog--3001")).not.toBeVisible()

    // Compose dialog opened in reply mode (header says "Reply")
    const composeDialog = page.getByTestId("property-gmail-compose-dialog")
    await expect(composeDialog).toBeVisible()
    await expect(composeDialog).toContainText("Reply")
  })
})

// ── Tests: disabled states ────────────────────────────────────────────────────

test.describe("Properties admin — Inbox button disabled states (mocked)", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")
    await signInAsAdmin(page)
  })

  test("Inbox button disabled with tooltip 'No email address' when owner 1 has no email", async ({
    page,
  }) => {
    await setupBaseMocks(page, makeListResponse(PROPERTY_NO_EMAIL))
    await mockGmailThreadsList(page, EMPTY_THREADS_RESPONSE)
    await gotoAndWaitForRow(page, 3002)

    const inboxBtn = page.getByTestId("property-list-inbox-button--3002").first()
    await expect(inboxBtn).toBeDisabled()

    const trigger = page.getByTestId("property-list-inbox-trigger--3002").first()
    await trigger.hover()
    await expect(page.getByRole("tooltip", { name: "No email address" })).toBeVisible()
  })

  test("Inbox button disabled with tooltip 'No owner' when property has no owner 1", async ({
    page,
  }) => {
    await setupBaseMocks(page, makeListResponse(PROPERTY_NO_OWNER))
    await mockGmailThreadsList(page, EMPTY_THREADS_RESPONSE)
    await gotoAndWaitForRow(page, 3003)

    const inboxBtn = page.getByTestId("property-list-inbox-button--3003").first()
    await expect(inboxBtn).toBeDisabled()

    const trigger = page.getByTestId("property-list-inbox-trigger--3003").first()
    await trigger.hover()
    await expect(page.getByRole("tooltip", { name: "No owner" })).toBeVisible()
  })
})

// ── Tests: error state ────────────────────────────────────────────────────────

test.describe("Properties admin — inbox dialog Gmail API error (mocked)", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")
    await setupBaseMocks(page, makeListResponse(PROPERTY_WITH_EMAIL))
    await mockGmailThreadsList(page, { error: "Gmail unavailable" }, { status: 500 })
    await signInAsAdmin(page)
  })

  test("Gmail API error shows inline error in the threads panel", async ({ page }) => {
    await gotoAndWaitForRow(page, 3001)
    await page.getByTestId("property-list-inbox-button--3001").first().click()

    await expect(page.getByTestId("property-list-inbox-dialog--3001")).toBeVisible()
    await expect(page.getByText(/Failed to load threads|Gmail unavailable/i)).toBeVisible()

    // Dialog is still closeable
    await page.getByTestId("property-list-inbox-dialog--3001").getByRole("button", { name: "Close" }).click()
    await expect(page.getByTestId("property-list-inbox-dialog--3001")).not.toBeVisible()
  })
})
