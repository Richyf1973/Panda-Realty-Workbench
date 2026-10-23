import { expect, test } from "@playwright/test"

import { requirePandaE2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import {
  EMPTY_PROPERTY_ENTITIES_RESPONSE,
  PROPERTY_ONE_OWNER,
  PROPERTY_TWO_OWNERS,
  STATUS_LIST_RESPONSE,
  openPropertyEditDialog,
} from "./helpers/panda-properties-owners-helpers"

const OWNER_EMAIL = "john@example.com"

const THREADS_RESPONSE = {
  threads: [
    {
      threadId: "thread-001",
      subject: "Re: Property Inspection",
      from: "buyer@example.com",
      date: "2026-04-12T06:00:00.000Z",
      snippet: "Can we confirm Thursday at 2pm?",
      attachmentCount: 0,
    },
  ],
}

const EMPTY_THREADS_RESPONSE = { threads: [] }

test.describe("Panda Realty — owner inbox thread panel (mocked APIs)", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaE2eAdminCredentials()
    await page.route("**/api/admin/property-status**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(STATUS_LIST_RESPONSE) })
    })
    await page.route("**/api/admin/property-entities**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_PROPERTY_ENTITIES_RESPONSE) })
    })
    await page.route("**/api/admin/properties/1001/buyers**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [] }) })
    })
    await page.route("**/api/admin/properties/1001/contacts**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [] }) })
    })
    await page.route("**/api/admin/properties/1001/tenants**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [] }) })
    })
    await signInAsAdmin(page)
  })

  // ── Inbox button visibility ───────────────────────────────────────────────

  test("inbox button is visible for owner 1 when email is present", async ({ page }) => {
    await openPropertyEditDialog(page, PROPERTY_ONE_OWNER)

    await expect(page.getByTestId("property-owner-inbox--1")).toBeVisible()
  })

  test("inbox button is absent for owner 2 when email is blank", async ({ page }) => {
    await openPropertyEditDialog(page, PROPERTY_TWO_OWNERS)

    // Owner 1 has email — inbox present
    await expect(page.getByTestId("property-owner-inbox--1")).toBeVisible()
    // Owner 2 has no email — inbox absent
    await expect(page.getByTestId("property-owner-inbox--2")).not.toBeVisible()
  })

  // ── Thread panel opens and shows threads ─────────────────────────────────

  test("clicking inbox button opens thread panel and shows threads", async ({ page }) => {
    await page.route("**/api/admin/gmail/threads**", async (route) => {
      if (route.request().url().includes("/body")) { await route.continue(); return }
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(THREADS_RESPONSE) })
    })

    await openPropertyEditDialog(page, PROPERTY_ONE_OWNER)

    await page.getByTestId("property-owner-inbox--1").click()

    const panel = page.getByTestId("entity-threads-panel")
    await expect(panel).toBeVisible()
    await expect(panel.getByTestId("gmail-thread-row").first()).toBeVisible()
  })

  test("clicking inbox button again collapses the thread panel", async ({ page }) => {
    await page.route("**/api/admin/gmail/threads**", async (route) => {
      if (route.request().url().includes("/body")) { await route.continue(); return }
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(THREADS_RESPONSE) })
    })

    await openPropertyEditDialog(page, PROPERTY_ONE_OWNER)

    const inboxBtn = page.getByTestId("property-owner-inbox--1")
    await inboxBtn.click()
    await expect(page.getByTestId("entity-threads-panel")).toBeVisible()

    await inboxBtn.click()
    await expect(page.getByTestId("entity-threads-panel")).not.toBeVisible()
  })

  // ── Empty state message includes the searched email ───────────────────────

  test("empty state shows 'No threads found for [email]' when no threads exist", async ({ page }) => {
    await page.route("**/api/admin/gmail/threads**", async (route) => {
      if (route.request().url().includes("/body")) { await route.continue(); return }
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_THREADS_RESPONSE) })
    })

    await openPropertyEditDialog(page, PROPERTY_ONE_OWNER)

    await page.getByTestId("property-owner-inbox--1").click()

    const panel = page.getByTestId("entity-threads-panel")
    await expect(panel).toBeVisible()
    await expect(panel).toContainText(OWNER_EMAIL)
    await expect(panel).not.toContainText("No threads found.")
    // Must say "No threads found for john@example.com" (not the generic message)
    await expect(panel).toContainText(/No threads found for/i)
  })

  // ── Lazy load guard ───────────────────────────────────────────────────────

  test("no threads request fires until inbox button is first clicked", async ({ page }) => {
    let hitCount = 0
    await page.route("**/api/admin/gmail/threads**", async (route) => {
      if (route.request().url().includes("/body")) { await route.continue(); return }
      hitCount++
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(THREADS_RESPONSE) })
    })

    await openPropertyEditDialog(page, PROPERTY_ONE_OWNER)

    // No fetch before first click
    expect(hitCount).toBe(0)

    await page.getByTestId("property-owner-inbox--1").click()
    await expect(page.getByTestId("entity-threads-panel")).toBeVisible()

    // Exactly one fetch after first click
    expect(hitCount).toBe(1)
  })

  test("collapse and re-expand does not trigger a second threads fetch", async ({ page }) => {
    let hitCount = 0
    await page.route("**/api/admin/gmail/threads**", async (route) => {
      if (route.request().url().includes("/body")) { await route.continue(); return }
      hitCount++
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(THREADS_RESPONSE) })
    })

    await openPropertyEditDialog(page, PROPERTY_ONE_OWNER)

    const inboxBtn = page.getByTestId("property-owner-inbox--1")

    // Open
    await inboxBtn.click()
    await expect(page.getByTestId("entity-threads-panel")).toBeVisible()
    expect(hitCount).toBe(1)

    // Collapse
    await inboxBtn.click()
    await expect(page.getByTestId("entity-threads-panel")).not.toBeVisible()

    // Re-expand — still one fetch
    await inboxBtn.click()
    await expect(page.getByTestId("entity-threads-panel")).toBeVisible()
    expect(hitCount).toBe(1)
  })

  // ── Error states ──────────────────────────────────────────────────────────

  test("shows inline error when Gmail is not connected, form remains usable", async ({ page }) => {
    await page.route("**/api/admin/gmail/threads**", async (route) => {
      if (route.request().url().includes("/body")) { await route.continue(); return }
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Gmail is not connected. Please connect your Gmail account first." }),
      })
    })

    await openPropertyEditDialog(page, PROPERTY_ONE_OWNER)

    await page.getByTestId("property-owner-inbox--1").click()

    const panel = page.getByTestId("entity-threads-panel")
    await expect(panel).toBeVisible()
    await expect(panel).toContainText(/not connected|Gmail/i)

    // Form is still usable — dialog still open, owner section visible
    await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible()
    await expect(page.getByTestId("panda-properties-form-section--owners")).toBeVisible()
  })

  test("shows inline error with Retry button when threads API fails", async ({ page }) => {
    let callCount = 0
    await page.route("**/api/admin/gmail/threads**", async (route) => {
      if (route.request().url().includes("/body")) { await route.continue(); return }
      callCount++
      if (callCount === 1) {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "Failed to load threads (500)" }),
        })
      } else {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(THREADS_RESPONSE) })
      }
    })

    await openPropertyEditDialog(page, PROPERTY_ONE_OWNER)

    await page.getByTestId("property-owner-inbox--1").click()

    const panel = page.getByTestId("entity-threads-panel")
    await expect(panel).toBeVisible()
    await expect(panel).toContainText(/Failed to load/i)

    // Retry button exists and triggers a new fetch
    await panel.getByRole("button", { name: /retry/i }).click()
    await expect(panel.getByTestId("gmail-thread-row").first()).toBeVisible()
  })

  // ── API request passes correct email ─────────────────────────────────────

  test("threads request includes the owner email as query parameter", async ({ page }) => {
    let capturedUrl: string | null = null
    await page.route("**/api/admin/gmail/threads**", async (route) => {
      if (route.request().url().includes("/body")) { await route.continue(); return }
      capturedUrl = route.request().url()
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(THREADS_RESPONSE) })
    })

    await openPropertyEditDialog(page, PROPERTY_ONE_OWNER)

    await page.getByTestId("property-owner-inbox--1").click()
    await expect(page.getByTestId("entity-threads-panel")).toBeVisible()

    expect(capturedUrl).not.toBeNull()
    expect(capturedUrl).toContain(`email=${encodeURIComponent(OWNER_EMAIL)}`)
  })
})
