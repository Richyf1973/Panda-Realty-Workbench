// Run: npm run test:e2e:scratch -- --app=panda-realty --spec="apps/panda-realty/e2e/adobe-sign-phase-3d.spec.ts" --no-bail

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
  MOCK_ENTITY_DETAIL_NO_EMAIL,
  MOCK_REVOKED_TOKEN,
  MOCK_SHARED_FILES_EMPTY,
  MOCK_SHARED_FILES_ONE,
  MOCK_SHARED_FILES_TWO,
  navigateToBuyerPortalTab,
  setupMocked,
} from "./helpers/adobe-sign-phase-3d-mocks"

const SHOT_DIR = join(dirname(fileURLToPath(import.meta.url)), "screenshots", "adobe-sign-phase-3d")

const story = createStory({ specUrl: import.meta.url, slug: "adobe-sign-phase-3d" })
story.setWhatWasBuilt(
  "Adobe Sign Phase 3d: real createAgreement() implementation (Drive download → transient upload → agreement creation), " +
  "Send for signature button on shared file rows in the admin portal panel (buyer workspace → Portal tab → Shared documents section), " +
  "POST /api/admin/portal-tokens/[id]/sign-request API route, and Awaiting signature badge when signature_status is pending.",
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

// ── Happy path ────────────────────────────────────────────────────────────────

test.describe("Adobe Sign 3d — Shared documents section", () => {
  test("Portal tab shows Shared documents section with file rows when token is active", async ({ page }) => {
    await setupMocked(page, { portalTokenResponse: MOCK_ACTIVE_TOKEN, sharedFiles: MOCK_SHARED_FILES_TWO })
    const { buyerWorkspace } = await navigateToBuyerPortalTab(page)

    const sharedSection = buyerWorkspace.getByTestId("portal-shared-documents-section")
    await expect(sharedSection).toBeVisible({ timeout: 10_000 })

    await expect(sharedSection.getByTestId(`portal-shared-file-row--${MOCK_DRIVE_FILE_ID}`)).toBeVisible()
    await expect(sharedSection.getByTestId(`portal-shared-file-row--${MOCK_DRIVE_FILE_ID_2}`)).toBeVisible()

    await expect(sharedSection.getByTestId(`portal-shared-file-row--${MOCK_DRIVE_FILE_ID}`)).toContainText("Contract of Sale.pdf")
    await expect(sharedSection.getByTestId(`portal-shared-file-row--${MOCK_DRIVE_FILE_ID_2}`)).toContainText("Disclosure Statement.pdf")

    await shotFocused(page, sharedSection, SHOT_DIR, "01-shared-documents-section")
    story.addScene({
      title: "01 — Shared Documents Section Visible",
      images: [join(SHOT_DIR, "01-shared-documents-section.png")],
      seeing: "Shared documents section shows two file rows — one with Send for signature button, one with Awaiting signature badge.",
      steps: [
        "Sign in as admin",
        "Open buyer entity Portal tab with active token",
        "Shared documents section appears below portal URL controls",
      ],
    })
  })

  test("Send for signature button visible for file with no pending sign request", async ({ page }) => {
    await setupMocked(page, { portalTokenResponse: MOCK_ACTIVE_TOKEN, sharedFiles: MOCK_SHARED_FILES_ONE })
    const { buyerWorkspace } = await navigateToBuyerPortalTab(page)

    const fileRow = buyerWorkspace.getByTestId(`portal-shared-file-row--${MOCK_DRIVE_FILE_ID}`)
    await expect(fileRow).toBeVisible({ timeout: 10_000 })

    const sendBtn = fileRow.getByTestId(`portal-send-for-signature-btn--${MOCK_DRIVE_FILE_ID}`)
    await expect(sendBtn).toBeVisible()
    await expect(sendBtn).toBeEnabled()

    await shotFocused(page, fileRow, SHOT_DIR, "02-send-button-visible")
    story.addScene({
      title: "02 — Send for Signature Button",
      images: [join(SHOT_DIR, "02-send-button-visible.png")],
      seeing: "File row shows Send for signature button when no active sign request exists.",
      steps: ["Open Portal tab", "File with no pending request shows Send for signature button"],
    })
  })

  test("Awaiting signature badge visible for file with pending sign request", async ({ page }) => {
    await setupMocked(page, { portalTokenResponse: MOCK_ACTIVE_TOKEN, sharedFiles: MOCK_SHARED_FILES_TWO })
    const { buyerWorkspace } = await navigateToBuyerPortalTab(page)

    const fileRow2 = buyerWorkspace.getByTestId(`portal-shared-file-row--${MOCK_DRIVE_FILE_ID_2}`)
    await expect(fileRow2).toBeVisible({ timeout: 10_000 })

    const badge = fileRow2.getByTestId(`portal-awaiting-signature-badge--${MOCK_DRIVE_FILE_ID_2}`)
    await expect(badge).toBeVisible()

    const sendBtn = fileRow2.getByTestId(`portal-send-for-signature-btn--${MOCK_DRIVE_FILE_ID_2}`)
    await expect(sendBtn).not.toBeVisible()

    await shotFocused(page, fileRow2, SHOT_DIR, "03-awaiting-badge")
    story.addScene({
      title: "03 — Awaiting Signature Badge",
      images: [join(SHOT_DIR, "03-awaiting-badge.png")],
      seeing: "File row shows Awaiting signature badge when signature_status is pending; Send for signature button is hidden.",
      steps: ["Open Portal tab", "File with pending request shows badge, not button"],
    })
  })

  test("Clicking Send for signature replaces button with Awaiting signature badge", async ({ page }) => {
    await setupMocked(page, {
      portalTokenResponse: MOCK_ACTIVE_TOKEN,
      sharedFiles: MOCK_SHARED_FILES_ONE,
    })
    const { buyerWorkspace } = await navigateToBuyerPortalTab(page)

    const fileRow = buyerWorkspace.getByTestId(`portal-shared-file-row--${MOCK_DRIVE_FILE_ID}`)
    await expect(fileRow).toBeVisible({ timeout: 10_000 })

    const sendBtn = fileRow.getByTestId(`portal-send-for-signature-btn--${MOCK_DRIVE_FILE_ID}`)
    await expect(sendBtn).toBeVisible()

    await shotFocused(page, fileRow, SHOT_DIR, "04a-before-send")

    await sendBtn.click()

    const badge = fileRow.getByTestId(`portal-awaiting-signature-badge--${MOCK_DRIVE_FILE_ID}`)
    await expect(badge).toBeVisible({ timeout: 10_000 })
    await expect(sendBtn).not.toBeVisible()

    await shotFocused(page, fileRow, SHOT_DIR, "04b-after-send")
    story.addScene({
      title: "04 — Send for Signature Transition",
      images: [join(SHOT_DIR, "04a-before-send.png"), join(SHOT_DIR, "04b-after-send.png")],
      seeing: "Left: Send for signature button shown. Right: after clicking — button replaced by Awaiting signature badge.",
      steps: [
        "Click Send for signature button",
        "Button replaced by Awaiting signature badge inline (no page reload)",
      ],
    })
  })

  test("After signed/cancelled status — Send for signature button reappears", async ({ page }) => {
    const filesWithSignedStatus = [
      { driveFileId: MOCK_DRIVE_FILE_ID, fileName: "Contract of Sale.pdf", signatureStatus: "signed" },
    ]
    await setupMocked(page, { portalTokenResponse: MOCK_ACTIVE_TOKEN, sharedFiles: filesWithSignedStatus })
    const { buyerWorkspace } = await navigateToBuyerPortalTab(page)

    const fileRow = buyerWorkspace.getByTestId(`portal-shared-file-row--${MOCK_DRIVE_FILE_ID}`)
    await expect(fileRow).toBeVisible({ timeout: 10_000 })

    const sendBtn = fileRow.getByTestId(`portal-send-for-signature-btn--${MOCK_DRIVE_FILE_ID}`)
    await expect(sendBtn).toBeVisible()

    await shotFocused(page, fileRow, SHOT_DIR, "05-button-after-signed")
    story.addScene({
      title: "05 — Re-send After Signed",
      images: [join(SHOT_DIR, "05-button-after-signed.png")],
      seeing: "When prior request status is signed (or cancelled), Send for signature button reappears.",
      steps: ["File has prior signed request", "Button is visible and enabled — admin can re-send"],
    })
  })
})

// ── Edge cases ────────────────────────────────────────────────────────────────

test.describe("Adobe Sign 3d — Edge cases", () => {
  test("No shared files — shared documents section absent or shows empty state", async ({ page }) => {
    await setupMocked(page, { portalTokenResponse: MOCK_ACTIVE_TOKEN, sharedFiles: MOCK_SHARED_FILES_EMPTY })
    const { buyerWorkspace, panel } = await navigateToBuyerPortalTab(page)

    const fileRowLocator = buyerWorkspace.locator("[data-testid^='portal-shared-file-row--']")
    const count = await fileRowLocator.count()
    expect(count).toBe(0)

    await shotFocused(page, panel, SHOT_DIR, "06-empty-shared-docs")
    story.addScene({
      title: "06 — No Shared Files: Empty State",
      images: [join(SHOT_DIR, "06-empty-shared-docs.png")],
      seeing: "Portal panel with no shared files — shared documents section is absent or shows empty message, no file rows.",
      steps: ["Portal token active", "No files shared with portal", "No file rows visible"],
    })
  })

  test("Portal in no-token state — shared documents section not shown", async ({ page }) => {
    await setupMocked(page, { portalTokenResponse: null, sharedFiles: MOCK_SHARED_FILES_TWO })
    const { buyerWorkspace } = await navigateToBuyerPortalTab(page)

    await expect(buyerWorkspace.getByTestId("portal-shared-documents-section")).not.toBeVisible()

    await shotFocused(page, buyerWorkspace, SHOT_DIR, "07-no-token-no-section")
    story.addScene({
      title: "07 — No Token: Documents Section Absent",
      images: [join(SHOT_DIR, "07-no-token-no-section.png")],
      seeing: "Portal in no-token state — shared documents section is not shown.",
      steps: ["No portal token generated", "Shared documents section absent"],
    })
  })

  test("Portal in revoked state — shared documents section not shown", async ({ page }) => {
    await setupMocked(page, { portalTokenResponse: MOCK_REVOKED_TOKEN, sharedFiles: MOCK_SHARED_FILES_TWO })
    const { buyerWorkspace } = await navigateToBuyerPortalTab(page)

    await expect(buyerWorkspace.getByTestId("portal-shared-documents-section")).not.toBeVisible()

    await shotFocused(page, buyerWorkspace, SHOT_DIR, "08-revoked-no-section")
    story.addScene({
      title: "08 — Revoked Token: Documents Section Absent",
      images: [join(SHOT_DIR, "08-revoked-no-section.png")],
      seeing: "Portal in revoked state — shared documents section is not shown.",
      steps: ["Portal token revoked", "Shared documents section absent"],
    })
  })
})

// ── Error states ──────────────────────────────────────────────────────────────

test.describe("Adobe Sign 3d — Error states", () => {
  test("No signer email on buyer — error toast shown after clicking Send for signature", async ({ page }) => {
    await setupMocked(page, {
      portalTokenResponse: MOCK_ACTIVE_TOKEN,
      sharedFiles: MOCK_SHARED_FILES_ONE,
      signRequestResponse: {
        status: 422,
        body: { error: "No signer email on record — please add an email in the buyer profile" },
      },
      entityDetail: MOCK_ENTITY_DETAIL_NO_EMAIL,
    })
    const { buyerWorkspace } = await navigateToBuyerPortalTab(page)

    const fileRow = buyerWorkspace.getByTestId(`portal-shared-file-row--${MOCK_DRIVE_FILE_ID}`)
    await expect(fileRow).toBeVisible({ timeout: 10_000 })

    await fileRow.getByTestId(`portal-send-for-signature-btn--${MOCK_DRIVE_FILE_ID}`).click()

    const toast = page.locator("[data-sonner-toast]").filter({ hasText: /email/i })
    await expect(toast).toBeVisible({ timeout: 10_000 })

    await expect(fileRow.getByTestId(`portal-send-for-signature-btn--${MOCK_DRIVE_FILE_ID}`)).toBeVisible()

    await shotFocused(page, page.locator("[data-sonner-toaster]"), SHOT_DIR, "09-error-no-email")
    story.addScene({
      title: "09 — Error: No Signer Email",
      images: [join(SHOT_DIR, "09-error-no-email.png")],
      seeing: "Error toast appears when buyer has no email; Send for signature button remains visible.",
      steps: ["Buyer has no email", "Click Send for signature", "Error toast appears, button not replaced by badge"],
    })
  })
})
