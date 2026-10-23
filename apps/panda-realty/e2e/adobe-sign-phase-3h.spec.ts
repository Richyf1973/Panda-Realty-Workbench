// Run: npm run test:e2e:scratch -- --app=panda-realty --spec="apps/panda-realty/e2e/adobe-sign-phase-3h.spec.ts" --no-bail

import { expect, test } from "@playwright/test"
import { execFileSync } from "node:child_process"
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { createStory, shotFocused } from "@repo/e2e-utils"

import { requirePandaE2eAdminCredentials } from "./helpers/admin-auth"
import {
  MOCK_ACTIVE_TOKEN,
  MOCK_DRIVE_FILE_ID,
  MOCK_DRIVE_FILE_ID_2,
  MOCK_SHARED_FILES_3F,
  navigateToBuyerPortalTab,
  setupMocked3f,
} from "./helpers/adobe-sign-phase-3f-mocks"

const SHOT_DIR = join(dirname(fileURLToPath(import.meta.url)), "screenshots", "adobe-sign-phase-3h")
const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../..")

const story = createStory({ specUrl: import.meta.url, slug: "adobe-sign-phase-3h" })
story.setWhatWasBuilt(
  "Adobe Sign Phase 3h: admin mock-mode E2E tests for Sign flows — " +
  "Send for signature button and optimistic badge update, pending-only visibility, " +
  "webhook SIGNED/DECLINED events updating the admin UI via Refresh status, " +
  "Resend reminder and Cancel agreement smoke tests.",
)

// ── DB seed helpers (webhook tests only) ─────────────────────────────────────

const E2E_3H_TOKEN = "e2e-3h-webhook-v1"
const E2E_3H_AGR_SIGNED = "TEST-AGR-3h-signed"
const E2E_3H_AGR_DECLINED = "TEST-AGR-3h-declined"
const E2E_3H_DRIVE_SIGNED = "e2e-3h-drive-signed"
const E2E_3H_DRIVE_DECLINED = "e2e-3h-drive-declined"
// property_list_id 223319 confirmed to exist in the real DB (same as Phase 3g)
const E2E_PROPERTY_LIST_ID = 223319

function runSql(sql: string, { destructive = false } = {}): { rows: Record<string, unknown>[] } {
  const args = ["tools/run-sql.mjs", "--app=panda-realty"]
  if (destructive) args.push("--confirm-destructive")
  args.push(sql)
  const output = execFileSync("node", args, { cwd: REPO_ROOT, stdio: "pipe" }).toString()
  const jsonLine = output.split("\n").find((l) => l.startsWith("{"))
  if (!jsonLine) throw new Error(`run-sql produced no JSON. Output:\n${output}`)
  return JSON.parse(jsonLine) as { rows: Record<string, unknown>[] }
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

test.beforeAll(() => {
  requirePandaE2eAdminCredentials()
})

test.beforeEach(async () => {
  await mkdir(SHOT_DIR, { recursive: true })
  test.setTimeout(120_000)
})

test.afterAll(() => {
  story.write()
})

// ── Send for signature ────────────────────────────────────────────────────────

test.describe("Adobe Sign 3h — Send for signature", () => {
  test("Send for signature button visible for file with no sign request", async ({ page }) => {
    await setupMocked3f(page, {
      portalTokenResponse: MOCK_ACTIVE_TOKEN,
      sharedFiles: MOCK_SHARED_FILES_3F,
    })
    const { buyerWorkspace } = await navigateToBuyerPortalTab(page)
    const sharedSection = buyerWorkspace.getByTestId("portal-shared-documents-section")
    await expect(sharedSection).toBeVisible({ timeout: 10_000 })

    const sendBtn = sharedSection.getByTestId(`portal-send-for-signature-btn--${MOCK_DRIVE_FILE_ID}`)
    await expect(sendBtn).toBeVisible({ timeout: 5_000 })
    await expect(sendBtn).toBeEnabled()

    await shotFocused(page, sharedSection, SHOT_DIR, "01-send-btn-visible")
    story.addScene({
      title: "01 — Send for signature button visible",
      images: [join(SHOT_DIR, "01-send-btn-visible.png")],
      seeing: "File row with no active sign request shows the Send for signature button enabled.",
      steps: ["Navigate to buyer Portal tab", "Observe file row shows Send for signature button"],
    })
  })

  test("clicking Send for signature shows Awaiting signature badge", async ({ page }) => {
    await setupMocked3f(page, {
      portalTokenResponse: MOCK_ACTIVE_TOKEN,
      sharedFiles: MOCK_SHARED_FILES_3F,
    })
    const { buyerWorkspace } = await navigateToBuyerPortalTab(page)
    const sharedSection = buyerWorkspace.getByTestId("portal-shared-documents-section")
    await expect(sharedSection).toBeVisible({ timeout: 10_000 })

    const sendBtn = sharedSection.getByTestId(`portal-send-for-signature-btn--${MOCK_DRIVE_FILE_ID}`)
    await expect(sendBtn).toBeVisible({ timeout: 5_000 })

    await shotFocused(page, sharedSection, SHOT_DIR, "02a-before-send")
    await sendBtn.click()

    const awaitingBadge = sharedSection.getByTestId(`portal-awaiting-signature-badge--${MOCK_DRIVE_FILE_ID}`)
    await expect(awaitingBadge).toBeVisible({ timeout: 8_000 })
    await expect(sendBtn).not.toBeVisible()

    await shotFocused(page, sharedSection, SHOT_DIR, "02b-after-send")
    story.addScene({
      title: "02 — Send for signature: button transitions to Awaiting badge",
      images: [join(SHOT_DIR, "02a-before-send.png"), join(SHOT_DIR, "02b-after-send.png")],
      seeing:
        "Left: Send for signature button on file row. " +
        "Right: after clicking, row shows Awaiting signature badge with Resend and Cancel buttons; Send button gone.",
      steps: [
        "Navigate to buyer Portal tab",
        "Observe Send for signature button (screenshot 1)",
        "Click Send for signature",
        "Observe Awaiting signature badge appears (screenshot 2)",
      ],
    })
  })

  test("Send for signature button hidden when pending request exists", async ({ page }) => {
    await setupMocked3f(page, {
      portalTokenResponse: MOCK_ACTIVE_TOKEN,
      sharedFiles: MOCK_SHARED_FILES_3F,
    })
    const { buyerWorkspace } = await navigateToBuyerPortalTab(page)
    const sharedSection = buyerWorkspace.getByTestId("portal-shared-documents-section")
    await expect(sharedSection).toBeVisible({ timeout: 10_000 })
    // Wait for the pending row to fully render before checking absence
    await expect(
      sharedSection.getByTestId(`portal-awaiting-signature-badge--${MOCK_DRIVE_FILE_ID_2}`)
    ).toBeVisible({ timeout: 5_000 })

    await expect(
      sharedSection.getByTestId(`portal-send-for-signature-btn--${MOCK_DRIVE_FILE_ID_2}`)
    ).not.toBeVisible()
  })
})

// ── Webhook events ────────────────────────────────────────────────────────────

test.describe("Adobe Sign 3h — Webhook events", () => {
  let realPortalTokenId: number

  test.beforeAll(() => {
    // Idempotent cleanup — cascade deletes sign requests via FK
    runSql(
      `DELETE FROM panda_realty.portal_tokens WHERE token = '${E2E_3H_TOKEN}'`,
      { destructive: true },
    )

    const result = runSql(
      `INSERT INTO panda_realty.portal_tokens (token, role, property_list_id)
       VALUES ('${E2E_3H_TOKEN}', 'buyer', ${E2E_PROPERTY_LIST_ID})
       RETURNING portal_token_id`,
    )
    realPortalTokenId = Number(result.rows[0].portal_token_id)

    runSql(
      `INSERT INTO panda_realty.portal_file_sign_requests
         (portal_token_id, file_id, adobe_sign_agreement_id, signature_status, signer_email)
       VALUES
         (${realPortalTokenId}, '${E2E_3H_DRIVE_SIGNED}',   '${E2E_3H_AGR_SIGNED}',   'pending', 'buyer@example.com'),
         (${realPortalTokenId}, '${E2E_3H_DRIVE_DECLINED}', '${E2E_3H_AGR_DECLINED}', 'pending', 'buyer@example.com')`,
    )
  })

  test.afterAll(() => {
    try {
      runSql(
        `DELETE FROM panda_realty.portal_tokens WHERE token = '${E2E_3H_TOKEN}'`,
        { destructive: true },
      )
    } catch {
      // Ignore cleanup errors — row may already be gone
    }
  })

  test("webhook SIGNED event: Refresh status updates row to Signed badge", async ({ page }) => {
    // Reset to pending in case a prior run left it signed
    runSql(
      `UPDATE panda_realty.portal_file_sign_requests
       SET signature_status = 'pending', signed_at = NULL, cancelled_at = NULL
       WHERE adobe_sign_agreement_id = '${E2E_3H_AGR_SIGNED}'`,
    )

    const pendingFiles: Array<Record<string, unknown>> = [
      {
        driveFileId: E2E_3H_DRIVE_SIGNED,
        fileName: "E2E Pending Contract.pdf",
        signatureStatus: "pending",
        signedAt: null,
        signRequestId: 999,
      },
    ]
    const signedFiles: Array<Record<string, unknown>> = [
      {
        driveFileId: E2E_3H_DRIVE_SIGNED,
        fileName: "E2E Pending Contract.pdf",
        signatureStatus: "signed",
        signedAt: new Date().toISOString(),
        signRequestId: 999,
      },
    ]
    let serveSharedFiles: Array<Record<string, unknown>> = pendingFiles

    // Register admin navigation mocks (lower LIFO priority)
    await setupMocked3f(page, { portalTokenResponse: MOCK_ACTIVE_TOKEN, sharedFiles: [] })
    // Override shared-files with dynamic handler (higher LIFO priority — registered after)
    await page.route("**/api/admin/portal-tokens/*/shared-files**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(serveSharedFiles),
      })
    })

    const { buyerWorkspace } = await navigateToBuyerPortalTab(page)
    const sharedSection = buyerWorkspace.getByTestId("portal-shared-documents-section")
    await expect(sharedSection).toBeVisible({ timeout: 10_000 })
    await expect(
      sharedSection.getByTestId(`portal-awaiting-signature-badge--${E2E_3H_DRIVE_SIGNED}`)
    ).toBeVisible({ timeout: 5_000 })

    await shotFocused(page, sharedSection, SHOT_DIR, "03a-before-signed-webhook")

    // POST to real test webhook — updates the seeded DB row
    const webhookRes = await page.request.post("/api/test/adobe-sign-webhook", {
      data: { agreementId: E2E_3H_AGR_SIGNED, event: "SIGNED" },
    })
    expect(webhookRes.status()).toBe(200)

    // Update dynamic mock so next shared-files fetch returns signed state
    serveSharedFiles = signedFiles

    // Click Refresh status — calls sign-status (mocked 200) then fetchFiles()
    const refreshBtn = sharedSection.getByTestId("portal-sync-sign-status-btn")
    await expect(refreshBtn).toBeVisible({ timeout: 5_000 })
    await refreshBtn.click()

    await expect(
      sharedSection.getByTestId(`portal-signed-badge--${E2E_3H_DRIVE_SIGNED}`)
    ).toBeVisible({ timeout: 8_000 })
    await expect(
      sharedSection.getByTestId(`portal-awaiting-signature-badge--${E2E_3H_DRIVE_SIGNED}`)
    ).not.toBeVisible()

    await shotFocused(page, sharedSection, SHOT_DIR, "03b-after-signed-webhook")
    story.addScene({
      title: "03 — Webhook SIGNED: Awaiting badge transitions to Signed",
      images: [join(SHOT_DIR, "03a-before-signed-webhook.png"), join(SHOT_DIR, "03b-after-signed-webhook.png")],
      seeing:
        "Left: Awaiting signature badge before webhook. " +
        "Right: after SIGNED webhook POST and Refresh status click, row shows green Signed badge.",
      steps: [
        "Navigate to buyer Portal tab with pending file",
        "Observe Awaiting signature badge (screenshot 1)",
        "POST SIGNED event to /api/test/adobe-sign-webhook",
        "Click Refresh status",
        "Observe row updates to Signed badge (screenshot 2)",
      ],
    })
  })

  test("webhook DECLINED event: Refresh status updates row to Cancelled badge", async ({ page }) => {
    // Ensure row is pending before this test
    runSql(
      `UPDATE panda_realty.portal_file_sign_requests
       SET signature_status = 'pending', signed_at = NULL, cancelled_at = NULL
       WHERE adobe_sign_agreement_id = '${E2E_3H_AGR_DECLINED}'`,
    )

    const pendingFiles: Array<Record<string, unknown>> = [
      {
        driveFileId: E2E_3H_DRIVE_DECLINED,
        fileName: "E2E Declined Transfer.pdf",
        signatureStatus: "pending",
        signedAt: null,
        signRequestId: 998,
      },
    ]
    const cancelledFiles: Array<Record<string, unknown>> = [
      {
        driveFileId: E2E_3H_DRIVE_DECLINED,
        fileName: "E2E Declined Transfer.pdf",
        signatureStatus: "cancelled",
        signedAt: null,
        signRequestId: 998,
      },
    ]
    let serveSharedFiles: Array<Record<string, unknown>> = pendingFiles

    await setupMocked3f(page, { portalTokenResponse: MOCK_ACTIVE_TOKEN, sharedFiles: [] })
    await page.route("**/api/admin/portal-tokens/*/shared-files**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(serveSharedFiles),
      })
    })

    const { buyerWorkspace } = await navigateToBuyerPortalTab(page)
    const sharedSection = buyerWorkspace.getByTestId("portal-shared-documents-section")
    await expect(sharedSection).toBeVisible({ timeout: 10_000 })
    await expect(
      sharedSection.getByTestId(`portal-awaiting-signature-badge--${E2E_3H_DRIVE_DECLINED}`)
    ).toBeVisible({ timeout: 5_000 })

    await shotFocused(page, sharedSection, SHOT_DIR, "04a-before-declined-webhook")

    const webhookRes = await page.request.post("/api/test/adobe-sign-webhook", {
      data: { agreementId: E2E_3H_AGR_DECLINED, event: "DECLINED" },
    })
    expect(webhookRes.status()).toBe(200)

    serveSharedFiles = cancelledFiles

    const refreshBtn = sharedSection.getByTestId("portal-sync-sign-status-btn")
    await expect(refreshBtn).toBeVisible({ timeout: 5_000 })
    await refreshBtn.click()

    await expect(
      sharedSection.getByTestId(`portal-cancelled-badge--${E2E_3H_DRIVE_DECLINED}`)
    ).toBeVisible({ timeout: 8_000 })
    await expect(
      sharedSection.getByTestId(`portal-awaiting-signature-badge--${E2E_3H_DRIVE_DECLINED}`)
    ).not.toBeVisible()

    await shotFocused(page, sharedSection, SHOT_DIR, "04b-after-declined-webhook")
    story.addScene({
      title: "04 — Webhook DECLINED: Awaiting badge transitions to Cancelled",
      images: [join(SHOT_DIR, "04a-before-declined-webhook.png"), join(SHOT_DIR, "04b-after-declined-webhook.png")],
      seeing:
        "Left: Awaiting signature badge. Right: after DECLINED webhook and Refresh status, row shows Cancelled badge. " +
        "DECLINED maps to signatureStatus=cancelled — no separate Declined badge exists.",
      steps: [
        "Navigate to buyer Portal tab with pending file",
        "Observe Awaiting signature badge (screenshot 1)",
        "POST DECLINED event to /api/test/adobe-sign-webhook",
        "Click Refresh status",
        "Observe row updates to Cancelled badge (screenshot 2)",
      ],
    })
  })

  test("Refresh status button visible for pending rows and triggers re-fetch", async ({ page }) => {
    // Reset signed row to pending so we have a pending file to show the Refresh button
    runSql(
      `UPDATE panda_realty.portal_file_sign_requests
       SET signature_status = 'pending', signed_at = NULL, cancelled_at = NULL
       WHERE adobe_sign_agreement_id = '${E2E_3H_AGR_SIGNED}'`,
    )

    const pendingFiles: Array<Record<string, unknown>> = [
      {
        driveFileId: E2E_3H_DRIVE_SIGNED,
        fileName: "E2E Pending Contract.pdf",
        signatureStatus: "pending",
        signedAt: null,
        signRequestId: 999,
      },
    ]
    let fetchCount = 0

    await setupMocked3f(page, { portalTokenResponse: MOCK_ACTIVE_TOKEN, sharedFiles: [] })
    await page.route("**/api/admin/portal-tokens/*/shared-files**", async (route) => {
      fetchCount++
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(pendingFiles),
      })
    })

    const { buyerWorkspace } = await navigateToBuyerPortalTab(page)
    const sharedSection = buyerWorkspace.getByTestId("portal-shared-documents-section")
    await expect(sharedSection).toBeVisible({ timeout: 10_000 })
    await expect(
      sharedSection.getByTestId(`portal-awaiting-signature-badge--${E2E_3H_DRIVE_SIGNED}`)
    ).toBeVisible({ timeout: 5_000 })

    const refreshBtn = sharedSection.getByTestId("portal-sync-sign-status-btn")
    await expect(refreshBtn).toBeVisible({ timeout: 5_000 })
    await expect(refreshBtn).toContainText("Refresh status")

    const countBefore = fetchCount
    await refreshBtn.click()
    // Wait for the re-fetch to complete — spinner appears briefly then resolves
    await expect(refreshBtn).not.toContainText("Refreshing", { timeout: 5_000 })
    expect(fetchCount).toBeGreaterThan(countBefore)

    await shotFocused(page, sharedSection, SHOT_DIR, "05-refresh-status-btn")
    story.addScene({
      title: "05 — Refresh status button triggers shared-files re-fetch",
      images: [join(SHOT_DIR, "05-refresh-status-btn.png")],
      seeing: "Refresh status button visible in the section header while files are pending; clicking it re-fetches.",
      steps: [
        "Navigate to buyer Portal tab with pending file",
        "Observe Refresh status button in section header",
        "Click Refresh status",
        "Observe fetch count incremented and spinner resolves",
      ],
    })
  })
})

// ── Action buttons (smoke) ────────────────────────────────────────────────────

test.describe("Adobe Sign 3h — Action buttons (smoke)", () => {
  test("Resend reminder button visible and shows success toast on click", async ({ page }) => {
    await setupMocked3f(page, {
      portalTokenResponse: MOCK_ACTIVE_TOKEN,
      sharedFiles: MOCK_SHARED_FILES_3F,
    })
    const { buyerWorkspace } = await navigateToBuyerPortalTab(page)
    const sharedSection = buyerWorkspace.getByTestId("portal-shared-documents-section")
    await expect(sharedSection).toBeVisible({ timeout: 10_000 })

    const resendBtn = sharedSection.getByTestId(`portal-resend-btn--${MOCK_DRIVE_FILE_ID_2}`)
    await expect(resendBtn).toBeVisible({ timeout: 5_000 })

    await resendBtn.click()
    await expect(page.getByText("Reminder sent")).toBeVisible({ timeout: 8_000 })

    await shotFocused(page, sharedSection, SHOT_DIR, "06-resend-success")
    story.addScene({
      title: "06 — Resend reminder: success toast appears",
      images: [join(SHOT_DIR, "06-resend-success.png")],
      seeing: "Clicking Resend on a pending file row shows the Reminder sent success toast.",
      steps: [
        "Navigate to buyer Portal tab with pending file",
        "Click Resend on pending file row",
        "Observe Reminder sent toast",
      ],
    })
  })

  test("Cancel request button opens dialog and updates row to Cancelled on confirm", async ({ page }) => {
    await setupMocked3f(page, {
      portalTokenResponse: MOCK_ACTIVE_TOKEN,
      sharedFiles: MOCK_SHARED_FILES_3F,
    })
    const { buyerWorkspace } = await navigateToBuyerPortalTab(page)
    const sharedSection = buyerWorkspace.getByTestId("portal-shared-documents-section")
    await expect(sharedSection).toBeVisible({ timeout: 10_000 })

    const cancelBtn = sharedSection.getByTestId(`portal-cancel-btn--${MOCK_DRIVE_FILE_ID_2}`)
    await expect(cancelBtn).toBeVisible({ timeout: 5_000 })
    await cancelBtn.click()

    const dialog = page.getByTestId("portal-cancel-confirm-dialog")
    await expect(dialog).toBeVisible({ timeout: 5_000 })

    await shotFocused(page, dialog, SHOT_DIR, "07a-cancel-dialog")
    await dialog.getByTestId("portal-cancel-confirm-btn").click()

    await expect(dialog).not.toBeVisible({ timeout: 5_000 })
    await expect(page.getByText("Agreement cancelled")).toBeVisible({ timeout: 8_000 })
    await expect(
      sharedSection.getByTestId(`portal-cancelled-badge--${MOCK_DRIVE_FILE_ID_2}`)
    ).toBeVisible({ timeout: 5_000 })

    await shotFocused(page, sharedSection, SHOT_DIR, "07b-after-cancel")
    story.addScene({
      title: "07 — Cancel request: dialog confirm updates row to Cancelled",
      images: [join(SHOT_DIR, "07a-cancel-dialog.png"), join(SHOT_DIR, "07b-after-cancel.png")],
      seeing:
        "Left: cancel confirmation dialog open. " +
        "Right: after confirming, Agreement cancelled toast and Cancelled badge on the row.",
      steps: [
        "Navigate to buyer Portal tab with pending file",
        "Click Cancel on pending file row",
        "Observe confirmation dialog (screenshot 1)",
        "Confirm cancel",
        "Observe Cancelled badge and toast (screenshot 2)",
      ],
    })
  })
})
