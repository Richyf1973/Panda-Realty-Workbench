// Run: npm run test:e2e:scratch -- --app=panda-realty --spec="apps/panda-realty/e2e/adobe-sign-phase-3f.spec.ts" --no-bail

import { expect, test } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { createStory, shotFocused } from "@repo/e2e-utils"

import { requirePandaE2eAdminCredentials } from "./helpers/admin-auth"
import {
  MOCK_ACTIVE_TOKEN,
  MOCK_DRIVE_FILE_ID,
  MOCK_DRIVE_FILE_ID_2,
  MOCK_DRIVE_FILE_ID_3,
  MOCK_DRIVE_FILE_ID_4,
  MOCK_SHARED_FILES_3F,
  navigateToBuyerPortalTab,
  setupMocked3f,
} from "./helpers/adobe-sign-phase-3f-mocks"

const SHOT_DIR = join(dirname(fileURLToPath(import.meta.url)), "screenshots", "adobe-sign-phase-3f")

const story = createStory({ specUrl: import.meta.url, slug: "adobe-sign-phase-3f" })
story.setWhatWasBuilt(
  "Adobe Sign Phase 3f: status tracking UI in portal-shared-documents-section — " +
  "signed (green badge + signedAt date) and cancelled (grey badge) states, " +
  "Resend Reminder and Cancel Agreement action buttons on pending rows with confirm dialog, " +
  "getAgreementStatus / sendReminder / cancelAgreement implemented in adobe-sign-client, " +
  "GET /api/admin/portal-tokens/[id]/sign-status (webhook-miss fallback), " +
  "POST /api/admin/sign-requests/[id]/remind, DELETE /api/admin/sign-requests/[id].",
)

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

// ── Status badges ─────────────────────────────────────────────────────────────

test.describe("Adobe Sign 3f — Status badges", () => {
  test("signed file shows Signed badge", async ({ page }) => {
    await setupMocked3f(page, {
      portalTokenResponse: MOCK_ACTIVE_TOKEN,
      sharedFiles: MOCK_SHARED_FILES_3F,
    })
    const { buyerWorkspace } = await navigateToBuyerPortalTab(page)
    const sharedSection = buyerWorkspace.getByTestId("portal-shared-documents-section")
    await expect(sharedSection).toBeVisible({ timeout: 10_000 })

    const signedBadge = sharedSection.getByTestId(`portal-signed-badge--${MOCK_DRIVE_FILE_ID_3}`)
    await expect(signedBadge).toBeVisible({ timeout: 5_000 })
    await expect(signedBadge).toContainText("Signed")

    await shotFocused(page, sharedSection, SHOT_DIR, "01-signed-badge")
    story.addScene({
      title: "01 — Signed file shows Signed badge",
      images: [join(SHOT_DIR, "01-signed-badge.png")],
      seeing: "File row with signatureStatus=signed shows a green Signed badge.",
      steps: ["Navigate to buyer Portal tab", "Observe signed file row shows Signed badge"],
    })
  })

  test("signed file shows signedAt date formatted en-AU", async ({ page }) => {
    await setupMocked3f(page, {
      portalTokenResponse: MOCK_ACTIVE_TOKEN,
      sharedFiles: MOCK_SHARED_FILES_3F,
    })
    const { buyerWorkspace } = await navigateToBuyerPortalTab(page)
    const sharedSection = buyerWorkspace.getByTestId("portal-shared-documents-section")
    await expect(sharedSection).toBeVisible({ timeout: 10_000 })

    const signedAt = sharedSection.getByTestId(`portal-signed-at--${MOCK_DRIVE_FILE_ID_3}`)
    await expect(signedAt).toBeVisible({ timeout: 5_000 })
    await expect(signedAt).toContainText("30 May 2026")
  })

  test("cancelled file shows Cancelled badge", async ({ page }) => {
    await setupMocked3f(page, {
      portalTokenResponse: MOCK_ACTIVE_TOKEN,
      sharedFiles: MOCK_SHARED_FILES_3F,
    })
    const { buyerWorkspace } = await navigateToBuyerPortalTab(page)
    const sharedSection = buyerWorkspace.getByTestId("portal-shared-documents-section")
    await expect(sharedSection).toBeVisible({ timeout: 10_000 })

    const cancelledBadge = sharedSection.getByTestId(`portal-cancelled-badge--${MOCK_DRIVE_FILE_ID_4}`)
    await expect(cancelledBadge).toBeVisible({ timeout: 5_000 })
    await expect(cancelledBadge).toContainText("Cancelled")

    await shotFocused(page, sharedSection, SHOT_DIR, "02-cancelled-badge")
    story.addScene({
      title: "02 — Cancelled file shows Cancelled badge",
      images: [join(SHOT_DIR, "02-cancelled-badge.png")],
      seeing: "File row with signatureStatus=cancelled shows Cancelled badge with no action buttons.",
      steps: ["Navigate to buyer Portal tab", "Observe cancelled file row shows Cancelled badge"],
    })
  })

  test("cancelled file shows no Resend or Cancel buttons", async ({ page }) => {
    await setupMocked3f(page, {
      portalTokenResponse: MOCK_ACTIVE_TOKEN,
      sharedFiles: MOCK_SHARED_FILES_3F,
    })
    const { buyerWorkspace } = await navigateToBuyerPortalTab(page)
    const sharedSection = buyerWorkspace.getByTestId("portal-shared-documents-section")
    await expect(sharedSection).toBeVisible({ timeout: 10_000 })
    // Ensure section is fully rendered before absence checks
    await expect(sharedSection.getByTestId(`portal-shared-file-row--${MOCK_DRIVE_FILE_ID_4}`)).toBeVisible({ timeout: 5_000 })

    await expect(sharedSection.getByTestId(`portal-resend-btn--${MOCK_DRIVE_FILE_ID_4}`)).not.toBeVisible()
    await expect(sharedSection.getByTestId(`portal-cancel-btn--${MOCK_DRIVE_FILE_ID_4}`)).not.toBeVisible()
  })

  test("signed file shows no Resend or Cancel buttons", async ({ page }) => {
    await setupMocked3f(page, {
      portalTokenResponse: MOCK_ACTIVE_TOKEN,
      sharedFiles: MOCK_SHARED_FILES_3F,
    })
    const { buyerWorkspace } = await navigateToBuyerPortalTab(page)
    const sharedSection = buyerWorkspace.getByTestId("portal-shared-documents-section")
    await expect(sharedSection).toBeVisible({ timeout: 10_000 })
    await expect(sharedSection.getByTestId(`portal-shared-file-row--${MOCK_DRIVE_FILE_ID_3}`)).toBeVisible({ timeout: 5_000 })

    await expect(sharedSection.getByTestId(`portal-resend-btn--${MOCK_DRIVE_FILE_ID_3}`)).not.toBeVisible()
    await expect(sharedSection.getByTestId(`portal-cancel-btn--${MOCK_DRIVE_FILE_ID_3}`)).not.toBeVisible()
  })

  test("file with no sign request shows Send for signature button (existing behaviour preserved)", async ({ page }) => {
    await setupMocked3f(page, {
      portalTokenResponse: MOCK_ACTIVE_TOKEN,
      sharedFiles: MOCK_SHARED_FILES_3F,
    })
    const { buyerWorkspace } = await navigateToBuyerPortalTab(page)
    const sharedSection = buyerWorkspace.getByTestId("portal-shared-documents-section")
    await expect(sharedSection).toBeVisible({ timeout: 10_000 })

    const sendBtn = sharedSection.getByTestId(`portal-send-for-signature-btn--${MOCK_DRIVE_FILE_ID}`)
    await expect(sendBtn).toBeVisible({ timeout: 5_000 })
  })
})

// ── Pending row action buttons ────────────────────────────────────────────────

test.describe("Adobe Sign 3f — Pending row action buttons", () => {
  test("pending file shows Resend button alongside Awaiting badge", async ({ page }) => {
    await setupMocked3f(page, {
      portalTokenResponse: MOCK_ACTIVE_TOKEN,
      sharedFiles: MOCK_SHARED_FILES_3F,
    })
    const { buyerWorkspace } = await navigateToBuyerPortalTab(page)
    const sharedSection = buyerWorkspace.getByTestId("portal-shared-documents-section")
    await expect(sharedSection).toBeVisible({ timeout: 10_000 })

    const row = sharedSection.getByTestId(`portal-shared-file-row--${MOCK_DRIVE_FILE_ID_2}`)
    await expect(row).toBeVisible({ timeout: 5_000 })
    await expect(row.getByTestId(`portal-awaiting-signature-badge--${MOCK_DRIVE_FILE_ID_2}`)).toBeVisible()
    await expect(row.getByTestId(`portal-resend-btn--${MOCK_DRIVE_FILE_ID_2}`)).toBeVisible()

    await shotFocused(page, sharedSection, SHOT_DIR, "03-pending-row-buttons")
    story.addScene({
      title: "03 — Pending row shows Awaiting badge + Resend + Cancel",
      images: [join(SHOT_DIR, "03-pending-row-buttons.png")],
      seeing: "Pending file row shows Awaiting signature badge and Resend and Cancel buttons inline.",
      steps: ["Navigate to buyer Portal tab", "Observe pending file row has badge and action buttons"],
    })
  })

  test("pending file shows Cancel button alongside Awaiting badge", async ({ page }) => {
    await setupMocked3f(page, {
      portalTokenResponse: MOCK_ACTIVE_TOKEN,
      sharedFiles: MOCK_SHARED_FILES_3F,
    })
    const { buyerWorkspace } = await navigateToBuyerPortalTab(page)
    const sharedSection = buyerWorkspace.getByTestId("portal-shared-documents-section")
    await expect(sharedSection).toBeVisible({ timeout: 10_000 })

    const row = sharedSection.getByTestId(`portal-shared-file-row--${MOCK_DRIVE_FILE_ID_2}`)
    await expect(row).toBeVisible({ timeout: 5_000 })
    await expect(row.getByTestId(`portal-cancel-btn--${MOCK_DRIVE_FILE_ID_2}`)).toBeVisible()
  })

  test("Resend button calls remind API and shows success toast", async ({ page }) => {
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

    await shotFocused(page, sharedSection, SHOT_DIR, "04-resend-success")
    story.addScene({
      title: "04 — Resend shows success toast",
      images: [join(SHOT_DIR, "04-resend-success.png")],
      seeing: "After clicking Resend, Reminder sent toast appears and row stays in pending state.",
      steps: [
        "Navigate to buyer Portal tab",
        "Click Resend on pending file row",
        "Observe Reminder sent toast",
      ],
    })
  })
})

// ── Cancel agreement flow ─────────────────────────────────────────────────────

test.describe("Adobe Sign 3f — Cancel agreement flow", () => {
  test("Cancel button opens confirmation dialog", async ({ page }) => {
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

    await shotFocused(page, dialog, SHOT_DIR, "05-cancel-dialog")
    story.addScene({
      title: "05 — Cancel opens confirm dialog",
      images: [join(SHOT_DIR, "05-cancel-dialog.png")],
      seeing: "Clicking Cancel on a pending row opens a confirmation dialog with a destructive confirm button.",
      steps: [
        "Navigate to buyer Portal tab",
        "Click Cancel on pending file row",
        "Observe confirmation dialog appears",
      ],
    })
  })

  test("dismissing cancel dialog leaves row unchanged", async ({ page }) => {
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

    // Dismiss via Cancel button inside dialog (not the destructive confirm)
    await dialog.getByRole("button", { name: /^cancel$/i }).click()
    await expect(dialog).not.toBeVisible({ timeout: 3_000 })

    // Row still shows Awaiting signature — not updated
    await expect(
      sharedSection.getByTestId(`portal-awaiting-signature-badge--${MOCK_DRIVE_FILE_ID_2}`)
    ).toBeVisible({ timeout: 3_000 })
  })

  test("confirming cancel calls DELETE route and row updates to Cancelled badge", async ({ page }) => {
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

    const confirmBtn = dialog.getByTestId("portal-cancel-confirm-btn")
    await confirmBtn.click()

    await expect(dialog).not.toBeVisible({ timeout: 5_000 })
    await expect(page.getByText("Agreement cancelled")).toBeVisible({ timeout: 8_000 })
    await expect(
      sharedSection.getByTestId(`portal-cancelled-badge--${MOCK_DRIVE_FILE_ID_2}`)
    ).toBeVisible({ timeout: 5_000 })

    await shotFocused(page, sharedSection, SHOT_DIR, "06-after-cancel")
    story.addScene({
      title: "06 — After confirming cancel: row shows Cancelled badge",
      images: [join(SHOT_DIR, "06-after-cancel.png")],
      seeing: "After confirming, dialog closes, Agreement cancelled toast appears, row updates to Cancelled badge.",
      steps: [
        "Navigate to buyer Portal tab",
        "Click Cancel on pending file row",
        "Confirm in dialog",
        "Observe row updates to Cancelled and toast appears",
      ],
    })
  })
})

// ── Sign-status auto-poll on mount ───────────────────────────────────────────

test.describe("Adobe Sign 3f — Sign-status auto-poll on mount", () => {
  test("component calls sign-status endpoint on mount", async ({ page }) => {
    await setupMocked3f(page, {
      portalTokenResponse: MOCK_ACTIVE_TOKEN,
      sharedFiles: MOCK_SHARED_FILES_3F,
    })

    // Listen for the sign-status request that the component should fire on mount
    const signStatusRequest = page.waitForRequest(
      (req) => req.url().includes("sign-status") && req.method() === "GET",
      { timeout: 15_000 },
    )

    await navigateToBuyerPortalTab(page)
    await signStatusRequest
  })
})

