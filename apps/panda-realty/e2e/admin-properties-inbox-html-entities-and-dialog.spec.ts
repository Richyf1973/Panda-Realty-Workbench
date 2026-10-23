/**
 * E2E: Properties list — inbox dialog HTML entity decoding + dialog sizing
 *
 * Success factors:
 * 1. Snippet text with HTML entities (&gt; &#39; &amp; &lt;) renders as
 *    plain decoded characters — not the raw entity strings.
 * 2. Snippet text with no special characters renders unchanged (no regression).
 * 3. The inbox dialog does not exceed the viewport height when open.
 * 4. The inbox dialog is at least 800px wide (sm:max-w-4xl).
 * 5. The thread list area is scrollable when content overflows.
 */

import { expect, test } from "@playwright/test"

import { e2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import { STATUS_LIST_RESPONSE } from "./helpers/admin-properties-mocks"
import {
  makeListResponse,
  PROPERTY_ONE_OWNER,
} from "./helpers/panda-properties-owners-helpers"
import { mockGmailThreadsList } from "./helpers/panda-properties-gmail-helpers"

// ── Fixtures ───────────────────────────────────────────────────────────────────

const PROPERTY_WITH_EMAIL = {
  ...PROPERTY_ONE_OWNER,
  propertyListId: 4001,
  streetAddress: "1 Entity St",
  suburb: "Decodeville",
  owner1name: "Maria Sender",
  owner1phone: "0411000001",
  owner1email: "maria@example.com",
}

/** Thread whose snippet contains common HTML entities from Gmail API */
const THREAD_HTML_ENTITIES = {
  threadId: "entity-thread-001",
  subject: "Re: Vendor disclosure query",
  from: "Solicitor <sol@keylaw.com.au>",
  date: "2026-04-28T06:00:00.000Z",
  // Gmail API returns HTML-encoded snippets; e.g. > becomes &gt;, ' becomes &#39;
  snippet: "Don&#39;t forward &gt; this: &lt;contracts@keylaw.com.au&gt; &amp; keep private.",
  attachmentCount: 0,
}

/** Thread with a plain-text snippet — no entities — regression guard */
const THREAD_PLAIN = {
  threadId: "entity-thread-002",
  subject: "Open home confirmed",
  from: "admin@mypandarealty.com.au",
  date: "2026-04-22T01:00:00.000Z",
  snippet: "Saturday 10am at the property.",
  attachmentCount: 0,
}

/** Many threads to exercise height capping / scrollability */
const MANY_THREADS = Array.from({ length: 15 }, (_, i) => ({
  threadId: `bulk-thread-${i}`,
  subject: `Thread ${i + 1}: Contract update`,
  from: `agent${i}@example.com`,
  date: "2026-04-20T00:00:00.000Z",
  snippet: `Message body for thread ${i + 1}.`,
  attachmentCount: 0,
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

async function setupBaseMocks(page: import("@playwright/test").Page, listBody: unknown) {
  await page.route("**/api/admin/properties**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(listBody) })
  })
  await page.route("**/api/admin/property-status**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(STATUS_LIST_RESPONSE) })
  })
  await page.route("**/api/admin/agents**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) })
  })
}

async function openInboxDialog(page: import("@playwright/test").Page) {
  await page.goto("/admin/properties")
  await expect(page.getByTestId("admin-entity-row--properties--4001")).toBeVisible({ timeout: 15_000 })
  await page.getByTestId("property-list-inbox-button--4001").first().click()
  await expect(page.getByTestId("property-list-inbox-dialog--4001")).toBeVisible()
}

// ── Tests: HTML entity decoding ────────────────────────────────────────────────

test.describe("Properties inbox dialog — HTML entity decoding in snippets", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")
    await setupBaseMocks(page, makeListResponse(PROPERTY_WITH_EMAIL))
    await signInAsAdmin(page)
  })

  test("snippet with HTML entities renders decoded plain text", async ({ page }) => {
    await mockGmailThreadsList(page, { threads: [THREAD_HTML_ENTITIES] })
    await openInboxDialog(page)

    const dialog = page.getByTestId("property-list-inbox-dialog--4001")

    // Decoded characters should be visible
    await expect(dialog).toContainText("Don't forward >")
    await expect(dialog).toContainText("<contracts@keylaw.com.au>")
    await expect(dialog).toContainText("& keep private")

    // Raw entity strings must NOT appear
    await expect(dialog).not.toContainText("&#39;")
    await expect(dialog).not.toContainText("&gt;")
    await expect(dialog).not.toContainText("&lt;")
    await expect(dialog).not.toContainText("&amp;")
  })

  test("plain-text snippet renders unchanged (no regression)", async ({ page }) => {
    await mockGmailThreadsList(page, { threads: [THREAD_PLAIN] })
    await openInboxDialog(page)

    const dialog = page.getByTestId("property-list-inbox-dialog--4001")
    await expect(dialog).toContainText("Saturday 10am at the property.")
  })

  test("both decoded and plain snippets render correctly when multiple threads present", async ({
    page,
  }) => {
    await mockGmailThreadsList(page, { threads: [THREAD_HTML_ENTITIES, THREAD_PLAIN] })
    await openInboxDialog(page)

    const dialog = page.getByTestId("property-list-inbox-dialog--4001")

    // First thread: decoded
    await expect(dialog).toContainText("Don't forward >")
    await expect(dialog).not.toContainText("&gt;")

    // Second thread: plain
    await expect(dialog).toContainText("Saturday 10am at the property.")
  })
})

// ── Tests: dialog sizing ───────────────────────────────────────────────────────

test.describe("Properties inbox dialog — width and height constraints", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")
    await setupBaseMocks(page, makeListResponse(PROPERTY_WITH_EMAIL))
    await signInAsAdmin(page)
  })

  test("dialog is at least 800px wide (sm:max-w-4xl applied)", async ({ page }) => {
    await mockGmailThreadsList(page, { threads: [THREAD_PLAIN] })
    await openInboxDialog(page)

    const dialogBox = await page.getByTestId("property-list-inbox-dialog--4001").boundingBox()
    expect(dialogBox).not.toBeNull()
    expect(dialogBox!.width).toBeGreaterThanOrEqual(800)
  })

  test("dialog does not exceed viewport height with many threads", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await mockGmailThreadsList(page, { threads: MANY_THREADS })
    await openInboxDialog(page)

    const viewportHeight = page.viewportSize()!.height
    const dialogBox = await page.getByTestId("property-list-inbox-dialog--4001").boundingBox()
    expect(dialogBox).not.toBeNull()
    // Dialog must fit within the viewport
    expect(dialogBox!.height).toBeLessThanOrEqual(viewportHeight)
  })

  test("thread list area is scrollable when many threads are present", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await mockGmailThreadsList(page, { threads: MANY_THREADS })
    await openInboxDialog(page)

    // The scroll container inside the dialog should have overflow-y scroll/auto
    const dialogContent = page.getByTestId("property-list-inbox-dialog--4001")
    const scrollable = dialogContent.locator("[data-testid='entity-threads-panel']").or(
      dialogContent.locator(".overflow-y-auto")
    ).first()

    const overflowY = await scrollable.evaluate((el) => getComputedStyle(el).overflowY)
    expect(["auto", "scroll"]).toContain(overflowY)
  })
})
