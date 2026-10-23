// Run: npm run test:e2e:scratch -- --app=panda-realty --spec="apps/panda-realty/e2e/portal-seller-send-link.spec.ts" --no-bail

import { expect, test } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { createStory, shotFocused } from "@repo/e2e-utils"

import { signInAsAdmin } from "./helpers/admin-auth"
import {
  MOCK_PROPERTY_ID,
  PROPERTY_EDIT_FAVORITE,
  routePandaPropertiesListDetailAndBuyerOffers,
} from "./helpers/panda-properties-dialog-mocks"
import {
  MOCK_SELLER_TOKEN_ACTIVE,
  MOCK_SELLER_TOKEN_REVOKED,
  setupMockedPropertyWithSellerPortal,
  navigateToPropertyDialog,
} from "./helpers/panda-seller-portal-mocks"

const SHOT_DIR = join(dirname(fileURLToPath(import.meta.url)), "screenshots", "portal-seller-send-link")

const story = createStory({ specUrl: import.meta.url, slug: "portal-seller-send-link" })
story.setWhatWasBuilt(
  "Adds a Send via email button next to Copy link in the Edit Property dialog compact portal header. " +
  "Clicking it POSTs to /api/admin/portal-tokens/seller/send-link which emails the seller portal link " +
  "to the property owner primary email via Gmail. A Sonner toast confirms the recipient email. " +
  "The button is disabled when no owner email exists. A new portal_link_sends table logs each send.",
)

const SELLER_EMAIL = "john@example.com"

// Property with no owner email
const PROPERTY_NO_EMAIL = {
  ...PROPERTY_EDIT_FAVORITE,
  owner1email: null as string | null,
  owner2email: null as string | null,
  owner3email: null as string | null,
}

test.beforeEach(async () => {
  await mkdir(SHOT_DIR, { recursive: true })
})

test.afterAll(() => {
  story.write()
})

// ── Helper: setup with custom property detail ─────────────────────────────────

async function setupWithPropertyDetail(
  page: Parameters<typeof signInAsAdmin>[0],
  tokenResponse: unknown,
  propertyDetail: Record<string, unknown>,
) {
  await page.route("**/api/admin/property-status**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        items: [{ propertyStatusId: 1, propertyStatusCode: "ACTIVE", propertyStatus: "Active" }],
        totalCount: 1, limit: 100, totalPages: 1,
        hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null,
      }),
    })
  })
  await page.route("**/api/admin/portal-tokens/seller**", async (route) => {
    const method = route.request().method()
    if (method === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(tokenResponse) })
      return
    }
    if (method === "POST") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_SELLER_TOKEN_ACTIVE) })
      return
    }
    await route.fallback()
  })
  await page.route("**/api/admin/portal-tokens/*", async (route) => {
    const method = route.request().method()
    if (method === "PATCH") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_SELLER_TOKEN_REVOKED) })
      return
    }
    await route.fallback()
  })
  // Handle all properties routes — both list and detail return the custom property
  await page.route("**/api/admin/properties**", async (route) => {
    const url = route.request().url()
    // Pass sub-entity routes through
    if (/\/properties\/\d+\/(buyers|contacts|tenants|files|buyer-offers)/.test(url)) {
      await route.fallback()
      return
    }
    // Detail endpoint
    if (url.includes(`/api/admin/properties/${MOCK_PROPERTY_ID}`)) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(propertyDetail),
      })
      return
    }
    // List endpoint — include custom property so the form initializes with correct values
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        items: [propertyDetail],
        totalCount: 1, limit: 25, totalPages: 1,
        hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null,
      }),
    })
  })
  await signInAsAdmin(page)
}

// ── Happy path ────────────────────────────────────────────────────────────────

test("Active token + owner email — Send via email button is visible and enabled", async ({ page }) => {
  await setupMockedPropertyWithSellerPortal(page, MOCK_SELLER_TOKEN_ACTIVE)
  const dialog = await navigateToPropertyDialog(page)

  const compactHeader = dialog.locator("[data-testid='portal-seller-compact-header']")
  const sendBtn = compactHeader.getByTestId("portal-seller-send-email-btn")
  await expect(sendBtn).toBeVisible({ timeout: 10_000 })
  await expect(sendBtn).toBeEnabled()

  await shotFocused(page, compactHeader, SHOT_DIR, "01-send-btn-enabled")
  story.addScene({
    title: "01 — Compact header: Send via email button enabled",
    images: [join(SHOT_DIR, "01-send-btn-enabled.png")],
    seeing: "The compact portal header shows Copy link and Send via email buttons side by side — both enabled.",
    steps: [
      "Open Edit Property dialog for a property with active portal token and owner email",
      "Observe both Copy link and Send via email buttons in the portal header",
    ],
  })
})

test("Click Send via email — fires POST to /api/admin/portal-tokens/seller/send-link", async ({ page }) => {
  let sendLinkCalled = false
  let sentBody: unknown = null

  await setupMockedPropertyWithSellerPortal(page, MOCK_SELLER_TOKEN_ACTIVE)

  await page.route("**/api/admin/portal-tokens/seller/send-link**", async (route) => {
    sendLinkCalled = true
    sentBody = await route.request().postDataJSON()
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ recipientEmail: SELLER_EMAIL }),
    })
  })

  const dialog = await navigateToPropertyDialog(page)
  const sendBtn = dialog.getByTestId("portal-seller-send-email-btn")
  await expect(sendBtn).toBeVisible({ timeout: 10_000 })
  await sendBtn.click()

  await expect.poll(() => sendLinkCalled, { timeout: 5_000 }).toBe(true)
  expect((sentBody as { propertyListId?: number })?.propertyListId).toBe(MOCK_PROPERTY_ID)
})

test("Successful send — Sonner toast shows Portal link sent with seller email", async ({ page }) => {
  await setupMockedPropertyWithSellerPortal(page, MOCK_SELLER_TOKEN_ACTIVE)

  await page.route("**/api/admin/portal-tokens/seller/send-link**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ recipientEmail: SELLER_EMAIL }),
    })
  })

  const dialog = await navigateToPropertyDialog(page)
  const sendBtn = dialog.getByTestId("portal-seller-send-email-btn")
  await expect(sendBtn).toBeVisible({ timeout: 10_000 })

  await shotFocused(page, dialog.locator("[data-testid='portal-seller-compact-header']"), SHOT_DIR, "02a-before-send")

  await sendBtn.click()

  const toast = page.locator("[data-sonner-toast]")
  await expect(toast).toBeVisible({ timeout: 8_000 })
  await expect(toast).toContainText("Portal link sent")
  await expect(toast).toContainText(SELLER_EMAIL)

  await shotFocused(page, toast, SHOT_DIR, "02b-success-toast")
  story.addScene({
    title: "02 — Send via email: success toast with recipient email",
    images: [join(SHOT_DIR, "02a-before-send.png"), join(SHOT_DIR, "02b-success-toast.png")],
    seeing: "Left: header before clicking. Right: Sonner toast showing 'Portal link sent' and the seller's email address.",
    steps: [
      "Click Send via email",
      "Observe the success toast with title 'Portal link sent' and the email address",
    ],
  })
})

// ── Edge cases ────────────────────────────────────────────────────────────────

test("No owner email — Send via email button is disabled", async ({ page }) => {
  await setupWithPropertyDetail(page, MOCK_SELLER_TOKEN_ACTIVE, PROPERTY_NO_EMAIL)
  const dialog = await navigateToPropertyDialog(page)

  const sendBtn = dialog.getByTestId("portal-seller-send-email-btn")
  await expect(sendBtn).toBeVisible({ timeout: 10_000 })
  await expect(sendBtn).toBeDisabled()

  await shotFocused(page, dialog.locator("[data-testid='portal-seller-compact-header']"), SHOT_DIR, "03-send-btn-disabled")
  story.addScene({
    title: "03 — No owner email: Send via email button disabled",
    images: [join(SHOT_DIR, "03-send-btn-disabled.png")],
    seeing: "The Send via email button appears but is disabled because no owner email is set on the property.",
    steps: [
      "Open Edit Property dialog for a property with no owner email",
      "Observe Send via email button is disabled",
    ],
  })
})

test("No owner email — disabled button shows tooltip", async ({ page }) => {
  await setupWithPropertyDetail(page, MOCK_SELLER_TOKEN_ACTIVE, PROPERTY_NO_EMAIL)
  const dialog = await navigateToPropertyDialog(page)

  const sendBtn = dialog.getByTestId("portal-seller-send-email-btn")
  await expect(sendBtn).toBeVisible({ timeout: 10_000 })
  // Hover the trigger span (button has pointer-events-none when disabled)
  await dialog.getByTestId("portal-seller-send-email-trigger").hover()

  // Tooltip: "No seller email on record"
  await expect(page.getByRole("tooltip", { name: /no seller email on record/i })).toBeVisible({ timeout: 5_000 })

  await shotFocused(page, dialog.locator("[data-testid='portal-seller-compact-header']"), SHOT_DIR, "04-tooltip")
  story.addScene({
    title: "04 — No owner email: tooltip on hover",
    images: [join(SHOT_DIR, "04-tooltip.png")],
    seeing: "Hovering the disabled Send via email button shows a tooltip: 'No seller email on record'.",
    steps: ["Hover the disabled Send via email button", "Observe the tooltip text"],
  })
})

test("No-token state — Send via email button is not rendered", async ({ page }) => {
  await setupMockedPropertyWithSellerPortal(page, null)
  const dialog = await navigateToPropertyDialog(page)

  await expect(dialog.getByTestId("portal-seller-send-email-btn")).not.toBeVisible({ timeout: 8_000 })
})

test("Revoked token state — Send via email button is not rendered", async ({ page }) => {
  await setupMockedPropertyWithSellerPortal(page, MOCK_SELLER_TOKEN_REVOKED)
  const dialog = await navigateToPropertyDialog(page)

  await expect(dialog.getByTestId("portal-seller-send-email-btn")).not.toBeVisible({ timeout: 8_000 })
})

// ── Error states ──────────────────────────────────────────────────────────────

test("Gmail not connected (503) — error toast with reconnect message", async ({ page }) => {
  await setupMockedPropertyWithSellerPortal(page, MOCK_SELLER_TOKEN_ACTIVE)

  await page.route("**/api/admin/portal-tokens/seller/send-link**", async (route) => {
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "Gmail is not connected. Please reconnect your Google account to enable email sending." }),
    })
  })

  const dialog = await navigateToPropertyDialog(page)
  const sendBtn = dialog.getByTestId("portal-seller-send-email-btn")
  await expect(sendBtn).toBeVisible({ timeout: 10_000 })
  await sendBtn.click()

  const toast = page.locator("[data-sonner-toast]")
  await expect(toast).toBeVisible({ timeout: 8_000 })
  await expect(toast).toContainText(/gmail.*not connected|reconnect/i)

  await shotFocused(page, toast, SHOT_DIR, "05-gmail-error-toast")
  story.addScene({
    title: "05 — Gmail not connected: error toast",
    images: [join(SHOT_DIR, "05-gmail-error-toast.png")],
    seeing: "When Gmail is not connected, clicking Send via email shows an error toast telling the user to reconnect.",
    steps: ["Click Send via email when Gmail is not connected", "Observe the error toast"],
  })
})

test("Server error (500) — generic error toast shown", async ({ page }) => {
  await setupMockedPropertyWithSellerPortal(page, MOCK_SELLER_TOKEN_ACTIVE)

  await page.route("**/api/admin/portal-tokens/seller/send-link**", async (route) => {
    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ error: "Internal server error" }),
    })
  })

  const dialog = await navigateToPropertyDialog(page)
  const sendBtn = dialog.getByTestId("portal-seller-send-email-btn")
  await expect(sendBtn).toBeVisible({ timeout: 10_000 })
  await sendBtn.click()

  const toast = page.locator("[data-sonner-toast]")
  await expect(toast).toBeVisible({ timeout: 8_000 })
  await expect(toast).not.toContainText("Portal link sent")
})
