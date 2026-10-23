/**
 * E2E: Compose Email — large attachment regression (serverBodySizeLimit fix)
 *
 * Repro: files between ~4 MB and 20 MB triggered "Invalid request body" because
 * Next.js App Router's default body limit (~4 MB) caused request.formData() to throw.
 * Fix: serverBodySizeLimit: '25mb' in next.config.mjs.
 *
 * These tests verify the client-side behaviour (send button state, request made)
 * for files in the previously-failing size range. The server-side config fix is
 * confirmed by build/typecheck + the next.config.mjs diff.
 *
 * Run:
 *   npm run test:e2e -w panda-realty -- apps/panda-realty/e2e/admin-properties-gmail-compose-large-attachment.spec.ts
 */

import { expect, test } from "@playwright/test"

import { requirePandaE2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import { LIST_WITH_OWNER_EMAIL } from "./helpers/panda-gmail-compose-attachment-fixtures"
import {
  attachFiles,
  mockCommonRoutes,
  openComposeFromListRow,
} from "./helpers/panda-gmail-compose-attachment-helpers"

// Files in the previously-failing range (> old ~4 MB limit, < 20 MB client guard)
const FILE_5MB = { name: "report-5mb.pdf", mimeType: "application/pdf", buffer: Buffer.alloc(5 * 1024 * 1024, "a") }
const FILE_13MB = { name: "archive.zip", mimeType: "application/zip", buffer: Buffer.alloc(13 * 1024 * 1024 + 800_000, "b") }
const FILE_10MB_A = { name: "part-a.zip", mimeType: "application/zip", buffer: Buffer.alloc(10 * 1024 * 1024, "c") }
const FILE_10MB_B = { name: "part-b.zip", mimeType: "application/zip", buffer: Buffer.alloc(10 * 1024 * 1024, "d") }

test.describe("Panda Realty — compose email: large attachment regression", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaE2eAdminCredentials()
    await mockCommonRoutes(page)
    await signInAsAdmin(page)
    await page.route("**/api/admin/properties**", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(LIST_WITH_OWNER_EMAIL) }),
    )
  })

  test("1. a 5 MB file does not trigger the size warning and Send is enabled", async ({ page }) => {
    await openComposeFromListRow(page)
    await attachFiles(page, [FILE_5MB])

    await expect(page.getByTestId("property-gmail-compose-size-warning")).not.toBeVisible()
    await expect(page.getByTestId("property-gmail-compose-send")).toBeEnabled()
    await expect(page.getByTestId("property-gmail-compose-attachment-chip").first()).toContainText("report-5mb.pdf")
  })

  test("2. a 13.8 MB file (the repro case) does not trigger the size warning and Send is enabled", async ({ page }) => {
    await openComposeFromListRow(page)
    await attachFiles(page, [FILE_13MB])

    await expect(page.getByTestId("property-gmail-compose-size-warning")).not.toBeVisible()
    await expect(page.getByTestId("property-gmail-compose-send")).toBeEnabled()
    await expect(page.getByTestId("property-gmail-compose-attachment-chip").first()).toContainText("archive.zip")
  })

  test("3. sending a 5 MB attachment completes successfully (mocked send route)", async ({ page }) => {
    let sendCalled = false
    await page.route("**/api/admin/gmail/send**", (route) => {
      sendCalled = true
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) })
    })

    await openComposeFromListRow(page)
    await attachFiles(page, [FILE_5MB])
    await page.getByTestId("property-gmail-compose-send").click()

    await expect(page.getByTestId("property-gmail-compose-dialog")).not.toBeVisible()
    expect(sendCalled).toBe(true)
  })

  test("4. sending a 13.8 MB attachment completes successfully (mocked send route)", async ({ page }) => {
    let sendCalled = false
    await page.route("**/api/admin/gmail/send**", (route) => {
      sendCalled = true
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) })
    })

    await openComposeFromListRow(page)
    await attachFiles(page, [FILE_13MB])
    await page.getByTestId("property-gmail-compose-send").click()

    await expect(page.getByTestId("property-gmail-compose-dialog")).not.toBeVisible()
    expect(sendCalled).toBe(true)
  })

  test("5. two 10 MB files (20 MB combined) are exactly at the limit — no warning, Send enabled", async ({ page }) => {
    await openComposeFromListRow(page)
    await attachFiles(page, [FILE_10MB_A])
    await attachFiles(page, [FILE_10MB_B])

    await expect(page.getByTestId("property-gmail-compose-size-warning")).not.toBeVisible()
    await expect(page.getByTestId("property-gmail-compose-send")).toBeEnabled()
    await expect(page.getByTestId("property-gmail-compose-attachment-chip")).toHaveCount(2)
  })

  test("6. send with no attachment still works after the config change (regression)", async ({ page }) => {
    let sendCalled = false
    await page.route("**/api/admin/gmail/send**", (route) => {
      sendCalled = true
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) })
    })

    await openComposeFromListRow(page)
    await page.getByTestId("property-gmail-compose-send").click()

    await expect(page.getByTestId("property-gmail-compose-dialog")).not.toBeVisible()
    expect(sendCalled).toBe(true)
  })
})
