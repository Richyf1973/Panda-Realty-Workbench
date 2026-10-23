import type { Page } from "@playwright/test"

import {
  MOCK_ACTIVE_TOKEN,
  MOCK_DRIVE_FILE_ID,
  MOCK_DRIVE_FILE_ID_2,
  MOCK_PENDING_REQUEST_ID,
  MOCK_PORTAL_TOKEN_ID,
  MOCK_REVOKED_TOKEN,
  navigateToBuyerPortalTab,
  setupMocked,
  type SetupOptions,
} from "./adobe-sign-phase-3d-mocks"

export {
  MOCK_ACTIVE_TOKEN,
  MOCK_DRIVE_FILE_ID,
  MOCK_DRIVE_FILE_ID_2,
  MOCK_PENDING_REQUEST_ID,
  MOCK_PORTAL_TOKEN_ID,
  MOCK_REVOKED_TOKEN,
  navigateToBuyerPortalTab,
}

export const MOCK_DRIVE_FILE_ID_3 = "drive-file-form6-ghi789"
export const MOCK_DRIVE_FILE_ID_4 = "drive-file-transfer-jkl012"
export const MOCK_SIGNED_AT = "2026-05-30T09:00:00.000Z"

export const MOCK_SHARED_FILES_3F = [
  {
    driveFileId: MOCK_DRIVE_FILE_ID,
    fileName: "Contract of Sale.pdf",
    signatureStatus: null,
    signedAt: null,
    signRequestId: null,
  },
  {
    driveFileId: MOCK_DRIVE_FILE_ID_2,
    fileName: "Disclosure Statement.pdf",
    signatureStatus: "pending",
    signedAt: null,
    signRequestId: MOCK_PENDING_REQUEST_ID,
  },
  {
    driveFileId: MOCK_DRIVE_FILE_ID_3,
    fileName: "Form 6.pdf",
    signatureStatus: "signed",
    signedAt: MOCK_SIGNED_AT,
    signRequestId: 43,
  },
  {
    driveFileId: MOCK_DRIVE_FILE_ID_4,
    fileName: "Transfer Form.pdf",
    signatureStatus: "cancelled",
    signedAt: null,
    signRequestId: 44,
  },
]

export type Setup3fOptions = Omit<SetupOptions, "sharedFiles"> & {
  sharedFiles: Array<Record<string, unknown>>
  signStatusStatus?: number
  remindStatus?: number
  cancelStatus?: number
}

export async function setupMocked3f(page: Page, options: Setup3fOptions) {
  const { signStatusStatus = 200, remindStatus = 200, cancelStatus = 200 } = options

  // Register base 3d mocks first (lower LIFO priority) — includes sign-in
  await setupMocked(page, options as unknown as SetupOptions)

  // sign-status fallback route — registered after broad portal-tokens handler (higher LIFO priority)
  await page.route("**/api/admin/portal-tokens/*/sign-status**", async (route) => {
    await route.fulfill({
      status: signStatusStatus,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    })
  })

  // remind route — POST /api/admin/sign-requests/[id]/remind
  await page.route("**/api/admin/sign-requests/*/remind**", async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: remindStatus,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      })
      return
    }
    await route.fallback()
  })

  // cancel route — DELETE /api/admin/sign-requests/[id]
  await page.route("**/api/admin/sign-requests/**", async (route) => {
    if (route.request().method() === "DELETE") {
      await route.fulfill({
        status: cancelStatus,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      })
      return
    }
    await route.fallback()
  })
}
