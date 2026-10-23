/**
 * E2E: Compose Email — file attachment support (TDD, written before implementation)
 *
 * Run:
 *   npm run test:e2e -w panda-realty -- apps/panda-realty/e2e/admin-properties-gmail-compose-attachments.spec.ts
 *
 * Success factors (all mocked, no live DB or Gmail credentials needed):
 *  1. Compose dialog from property list row covers full viewport (fixed positioning fix).
 *  2. "Insert image" toolbar button is absent from the compose dialog.
 *  3. Attaching a file shows a chip with filename, size, and remove button.
 *  4. Attaching multiple files shows a chip per file.
 *  5. Removing a chip removes that file; others remain.
 *  6. Sending with attachments POSTs multipart/form-data to the send endpoint.
 *  7. Sending a reply with attachments POSTs multipart/form-data to the reply endpoint.
 *  8. Total size > 14.5 MB shows a warning and disables Send.
 *  9. Removing a file to drop below 14.5 MB clears the warning and re-enables Send.
 * 10. Removing all attachments leaves the "Attach file" button and no chips.
 * 11. Sending without attachments (regression) still works as JSON / form correctly.
 * 12. Send failure with attachment shows inline error; dialog stays open with chips intact.
 * 13. Cancelling with attachments clears state; reopening shows empty attachment list.
 */

import { expect, test } from "@playwright/test"

import { requirePandaE2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import { routePandaPropertiesListDetailAndBuyerOffers } from "./helpers/panda-properties-dialog-mocks"
import { STATUS_LIST_RESPONSE, EMPTY_PROPERTY_ENTITIES_RESPONSE } from "./helpers/admin-properties-mocks"
import { BASE_PROPERTY } from "./helpers/panda-properties-owners-helpers"

// ── Fixtures ──────────────────────────────────────────────────────────────────

const PROPERTY_WITH_OWNER_EMAIL = {
  ...BASE_PROPERTY,
  propertyListId: 1001,
  owner1name: "Smith, John",
  owner1phone: "0412345678",
  owner1email: "john@example.com",
  owner2name: null,
  owner2phone: null,
  owner2email: null,
  owner3name: null,
  owner3phone: null,
  owner3email: null,
  combinedOwner: "Smith, John",
}

const LIST_WITH_OWNER_EMAIL = {
  items: [PROPERTY_WITH_OWNER_EMAIL],
  totalCount: 1,
  limit: 25,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false,
  startCursor: null,
  endCursor: null,
}

const BUYER_WITH_EMAIL = {
  items: [
    {
      propertyEntityId: 501,
      entityId: 201,
      entityName: "Ash D",
      phoneNumber: "0475770513",
      emailAddress: "ash@example.com",
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

const EMPTY_PANEL = { items: [] }

// Small in-memory files (no disk I/O needed)
const SMALL_PDF = { name: "document.pdf", mimeType: "application/pdf", buffer: Buffer.alloc(50_000, "a") }
const SMALL_JPG = { name: "photo.jpg", mimeType: "image/jpeg", buffer: Buffer.alloc(100_000, "b") }
// 15 MB file — exceeds the 14.5 MB raw guard (≈ 20 MB after base64 encoding)
const LARGE_FILE_A = { name: "large-a.pdf", mimeType: "application/pdf", buffer: Buffer.alloc(15 * 1024 * 1024, "x") }

// ── Helpers ───────────────────────────────────────────────────────────────────

type SetupPage = Parameters<typeof routePandaPropertiesListDetailAndBuyerOffers>[0]

async function mockCommonRoutes(page: SetupPage) {
  await page.route("**/api/admin/property-status**", async (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(STATUS_LIST_RESPONSE) }),
  )
  await page.route("**/api/admin/property-entities**", async (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_PROPERTY_ENTITIES_RESPONSE) }),
  )
  await page.route("**/api/admin/email-signatures**", async (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [] }) }),
  )
  // Mock Drive two-phase upload so file chips transition to "ready" without real credentials
  await page.route("**/api/admin/gmail/attachments/initiate-upload**", async (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ uploadUri: "https://fake-drive-upload.test/upload" }),
    }),
  )
  await page.route("https://fake-drive-upload.test/**", async (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ id: "drive-file-id-test" }),
    }),
  )
}

/** Wait for all attachment chips to reach "ready" state (upload finished). */
async function waitForChipsReady(page: SetupPage, count: number) {
  for (let i = 0; i < count; i++) {
    await expect(page.getByTestId("property-gmail-compose-attachment-ready").nth(i)).toBeVisible()
  }
}

/** Open compose from the property list row email button. */
async function openComposeFromListRow(page: SetupPage) {
  await page.route("**/api/admin/properties**", async (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(LIST_WITH_OWNER_EMAIL) }),
  )
  await page.goto("/admin/properties")
  await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible()
  await page.getByTestId("property-list-email-button--1001").first().click()
  await expect(page.getByTestId("property-gmail-compose-dialog")).toBeVisible()
}

/** Open compose from the buyers tab inside the property detail dialog. */
async function openComposeFromBuyerRow(page: SetupPage) {
  await routePandaPropertiesListDetailAndBuyerOffers(page)
  await page.route("**/api/admin/properties/1001/buyers**", async (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(BUYER_WITH_EMAIL) }),
  )
  await page.route("**/api/admin/properties/1001/contacts**", async (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_PANEL) }),
  )
  await page.route("**/api/admin/properties/1001/tenants**", async (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_PANEL) }),
  )
  await page.goto("/admin/properties")
  await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible()
  await page.getByTestId("admin-entity-row--properties--1001").click()
  await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible()
  await page.getByTestId("panda-properties-form-tab-trigger--buyers").click()
  await page.getByTestId("property-buyer-panel-quick-email--501").click()
  await expect(page.getByTestId("property-gmail-compose-dialog")).toBeVisible()
}

/** Click the "Attach file" button and set the given files via the file chooser. */
async function attachFiles(page: SetupPage, files: { name: string; mimeType: string; buffer: Buffer }[]) {
  const fileChooserPromise = page.waitForEvent("filechooser")
  await page.getByTestId("property-gmail-compose-attach-button").click()
  const fileChooser = await fileChooserPromise
  await fileChooser.setFiles(files)
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe("Panda Realty — compose email: file attachments (mocked APIs)", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaE2eAdminCredentials()
    await mockCommonRoutes(page)
    await signInAsAdmin(page)
  })

  // ── 1. Positioning fix ────────────────────────────────────────────────────

  test("1. compose dialog from property list row covers the full viewport (fixed positioning)", async ({ page }) => {
    await openComposeFromListRow(page)

    // The backdrop (fixed inset-0) covers the full viewport; the inner card is property-gmail-compose-dialog
    const backdrop = page.getByTestId("property-gmail-compose-backdrop")
    const box = await backdrop.boundingBox()
    const viewport = page.viewportSize()

    expect(box).not.toBeNull()
    expect(box!.x).toBeLessThanOrEqual(0)
    expect(box!.y).toBeLessThanOrEqual(0)
    expect(box!.width).toBeGreaterThanOrEqual(viewport!.width)
    expect(box!.height).toBeGreaterThanOrEqual(viewport!.height)
  })

  // ── 2. Insert image button removed ────────────────────────────────────────

  test("2. compose dialog toolbar does not contain the Insert image button", async ({ page }) => {
    await openComposeFromListRow(page)

    await expect(page.getByTestId("property-gmail-compose-image-upload")).not.toBeVisible()
  })

  // ── 3. Attach single file — chip appears ──────────────────────────────────

  test("3. attaching a file shows a chip with filename, size, and remove button", async ({ page }) => {
    await openComposeFromListRow(page)
    await attachFiles(page, [SMALL_PDF])
    await waitForChipsReady(page, 1)

    const chips = page.getByTestId("property-gmail-compose-attachment-chip")
    await expect(chips).toHaveCount(1)
    await expect(chips.first()).toContainText("document.pdf")
    await expect(chips.first()).toContainText(/\d+/) // size label
    await expect(page.getByTestId("property-gmail-compose-attachment-remove").first()).toBeVisible()
  })

  // ── 4. Attach multiple files — one chip per file ──────────────────────────

  test("4. attaching multiple files shows a chip per file", async ({ page }) => {
    await openComposeFromListRow(page)

    await attachFiles(page, [SMALL_PDF])
    await attachFiles(page, [SMALL_JPG])

    const chips = page.getByTestId("property-gmail-compose-attachment-chip")
    await expect(chips).toHaveCount(2)
    await expect(chips.nth(0)).toContainText("document.pdf")
    await expect(chips.nth(1)).toContainText("photo.jpg")
  })

  // ── 5. Remove a chip — that file is gone, others remain ──────────────────

  test("5. clicking remove on a chip removes that file and keeps others", async ({ page }) => {
    await openComposeFromListRow(page)

    await attachFiles(page, [SMALL_PDF])
    await attachFiles(page, [SMALL_JPG])
    await expect(page.getByTestId("property-gmail-compose-attachment-chip")).toHaveCount(2)

    // Remove the first chip (document.pdf)
    await page.getByTestId("property-gmail-compose-attachment-remove").first().click()

    const chips = page.getByTestId("property-gmail-compose-attachment-chip")
    await expect(chips).toHaveCount(1)
    await expect(chips.first()).toContainText("photo.jpg")
  })

  // ── 6. Send with attachments → multipart/form-data to send endpoint ───────

  test("6. sending with an attachment POSTs multipart/form-data to the send endpoint", async ({ page }) => {
    let capturedContentType: string | null = null
    await page.route("**/api/admin/gmail/send**", async (route) => {
      capturedContentType = route.request().headers()["content-type"] ?? null
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) })
    })

    await openComposeFromListRow(page)
    await attachFiles(page, [SMALL_PDF])
    await waitForChipsReady(page, 1)
    await page.getByTestId("property-gmail-compose-send").click()

    await expect(page.getByTestId("property-gmail-compose-status-success")).toBeVisible()
    expect(capturedContentType).toMatch(/multipart\/form-data/)
  })

  // ── 7. Send from buyer panel uses multipart/form-data ────────────────────

  test("7. sending from the buyer panel with an attachment also uses multipart/form-data", async ({ page }) => {
    let capturedContentType: string | null = null
    await page.route("**/api/admin/gmail/send**", async (route) => {
      capturedContentType = route.request().headers()["content-type"] ?? null
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) })
    })

    await openComposeFromBuyerRow(page)
    await attachFiles(page, [SMALL_PDF])
    await waitForChipsReady(page, 1)
    await page.getByTestId("property-gmail-compose-send").click()

    await expect(page.getByTestId("property-gmail-compose-status-success")).toBeVisible()
    expect(capturedContentType).toMatch(/multipart\/form-data/)
  })

  // ── 8. Size > 14.5 MB — warning shown, Send disabled ────────────────────

  test("8. total attachment size over 14.5 MB shows a warning and disables the Send button", async ({ page }) => {
    await openComposeFromListRow(page)

    await attachFiles(page, [LARGE_FILE_A])

    await expect(page.getByTestId("property-gmail-compose-size-warning")).toBeVisible()
    await expect(page.getByTestId("property-gmail-compose-send")).toBeDisabled()
  })

  // ── 9. Drop below 14.5 MB — warning gone, Send re-enabled ────────────────

  test("9. removing the large file to drop below 14.5 MB clears the warning and re-enables Send", async ({ page }) => {
    await openComposeFromListRow(page)

    await attachFiles(page, [LARGE_FILE_A])
    await expect(page.getByTestId("property-gmail-compose-size-warning")).toBeVisible()

    // Remove the large file to bring total back to 0 bytes
    await page.getByTestId("property-gmail-compose-attachment-remove").first().click()

    await expect(page.getByTestId("property-gmail-compose-size-warning")).not.toBeVisible()
    await expect(page.getByTestId("property-gmail-compose-send")).toBeEnabled()
  })

  // ── 10. Remove all files — empty state ───────────────────────────────────

  test("10. removing all attached files leaves only the Attach file button with no chips", async ({ page }) => {
    await openComposeFromListRow(page)

    await attachFiles(page, [SMALL_PDF])
    await expect(page.getByTestId("property-gmail-compose-attachment-chip")).toHaveCount(1)

    await page.getByTestId("property-gmail-compose-attachment-remove").first().click()

    await expect(page.getByTestId("property-gmail-compose-attachment-chip")).toHaveCount(0)
    await expect(page.getByTestId("property-gmail-compose-attach-button")).toBeVisible()
    await expect(page.getByTestId("property-gmail-compose-size-warning")).not.toBeVisible()
    await expect(page.getByTestId("property-gmail-compose-send")).toBeEnabled()
  })

  // ── 11. Send without attachments (regression) ────────────────────────────

  test("11. sending without attachments still works and does not break existing behavior", async ({ page }) => {
    let sendHitCount = 0
    await page.route("**/api/admin/gmail/send**", async (route) => {
      sendHitCount++
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) })
    })

    await openComposeFromListRow(page)
    // No files attached
    await page.getByTestId("property-gmail-compose-send").click()

    await expect(page.getByTestId("property-gmail-compose-status-success")).toBeVisible()
    expect(sendHitCount).toBe(1)
  })

  // ── 12. Send failure with attachment — error shown, dialog stays open ─────

  test("12. send failure with an attachment shows inline error and keeps dialog open with chips", async ({ page }) => {
    await page.route("**/api/admin/gmail/send**", async (route) => {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: "Gmail is not connected. Please connect your Google account." }),
      })
    })

    await openComposeFromListRow(page)
    await attachFiles(page, [SMALL_PDF])
    await waitForChipsReady(page, 1)
    await page.getByTestId("property-gmail-compose-send").click()

    await expect(page.getByTestId("property-gmail-compose-error")).toBeVisible()
    await expect(page.getByTestId("property-gmail-compose-error")).toContainText(/unavailable|try again/i)
    await expect(page.getByTestId("property-gmail-compose-dialog")).toBeVisible()
    // Chips must still be present so the user can retry
    await expect(page.getByTestId("property-gmail-compose-attachment-chip")).toHaveCount(1)
  })

  // ── 13. Cancel clears attachment state ───────────────────────────────────

  test("13. cancelling with attachments clears state so reopening shows an empty attachment list", async ({ page }) => {
    await openComposeFromListRow(page)
    await attachFiles(page, [SMALL_PDF])
    await expect(page.getByTestId("property-gmail-compose-attachment-chip")).toHaveCount(1)

    await page.getByTestId("property-gmail-compose-cancel").click()
    await expect(page.getByTestId("property-gmail-compose-dialog")).not.toBeVisible()

    // Reopen the compose dialog
    await page.getByTestId("property-list-email-button--1001").first().click()
    await expect(page.getByTestId("property-gmail-compose-dialog")).toBeVisible()

    await expect(page.getByTestId("property-gmail-compose-attachment-chip")).toHaveCount(0)
  })
})
