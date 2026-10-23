import { expect, test } from "@playwright/test"

import { requirePandaE2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"

const FORMS_LIST_EMPTY = {
  items: [],
  totalCount: 0,
  limit: 25,
  totalPages: 0,
  hasNextPage: false,
  hasPreviousPage: false,
  startCursor: null,
  endCursor: null,
}

const FAKE_UPLOAD_URI =
  "https://upload.googleapis.com/upload/drive/v3/files?uploadType=resumable&upload_id=e2e-test"

const DRIVE_RESULT = {
  id: "drive_abc123",
  webViewLink: "https://drive.google.com/file/d/drive_abc123/view",
}

const FINALIZE_RESPONSE = {
  googleDriveFileId: "drive_abc123",
  fileLink: "https://drive.google.com/file/d/drive_abc123/view",
  fileName: "test-form.pdf",
  fileSize: 10240,
  fileType: "application/pdf",
}

const CREATED_FORM_RESPONSE = {
  propertyFormId: 42,
  formName: "Test Form",
  category: "Contract",
  isActive: true,
  fileLink: "https://drive.google.com/file/d/drive_abc123/view",
  fileName: "test-form.pdf",
  fileSize: 10240,
  googleDriveFileId: "drive_abc123",
  createdAt: "2026-04-25T12:00:00.000Z",
  updatedAt: null,
}

/** Wire up the three-step Drive upload flow for the "Add form" dialog. */
async function routeFormUpload(page: import("@playwright/test").Page) {
  await page.route("**/api/admin/property-forms/initiate-upload**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ uploadUri: FAKE_UPLOAD_URI }),
    })
  })
  await page.route("**/upload.googleapis.com/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(DRIVE_RESULT),
    })
  })
  await page.route("**/api/admin/property-forms/finalize-upload**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(FINALIZE_RESPONSE),
    })
  })
}

test.describe("Panda Realty admin — Add form dialog Google Drive upload (mocked APIs)", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaE2eAdminCredentials()

    await page.route("**/api/admin/property-forms**", async (route) => {
      const url = route.request().url()
      const method = route.request().method()
      // pass through upload-flow endpoints so tests can mock them individually
      if (
        url.includes("/initiate-upload") ||
        url.includes("/finalize-upload") ||
        url.includes("/record-form-upload") ||
        url.includes("/send")
      ) {
        await route.continue()
        return
      }
      if (method === "POST") {
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify(CREATED_FORM_RESPONSE),
        })
        return
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(FORMS_LIST_EMPTY),
      })
    })

    await signInAsAdmin(page)
  })

  test("Add form dialog shows upload widget below description", async ({ page }) => {
    await page.goto("/admin/property-forms")
    await expect(page.getByTestId("admin-entity-list-add-new--property-forms")).toBeVisible()
    await page.getByTestId("admin-entity-list-add-new--property-forms").click()

    await expect(page.getByTestId("admin-entity-create-form--property-forms")).toBeVisible()
    await expect(page.getByTestId("property-forms-create-dialog-body")).toBeVisible()
    await expect(page.getByTestId("property-forms-create-upload-btn")).toBeVisible()
  })

  test("Create button is disabled when no file has been uploaded", async ({ page }) => {
    await page.goto("/admin/property-forms")
    await page.getByTestId("admin-entity-list-add-new--property-forms").click()
    await expect(page.getByTestId("admin-entity-create-form--property-forms")).toBeVisible()

    const createBtn = page.getByTestId("admin-entity-create-submit--property-forms")
    await page.getByTestId("admin-entity-create-field--property-forms--formName").fill("Test Form")

    await createBtn.click()
    await expect(
      page.getByTestId("admin-entity-crud-client-validation-error--property-forms"),
    ).toContainText("Please upload a file to Google Drive before creating the form.")
  })

  test("Upload widget shows spinner while uploading and success state after", async ({ page }) => {
    // Delay initiate-upload so the spinner is observable
    await page.route("**/api/admin/property-forms/initiate-upload**", async (route) => {
      await new Promise((r) => setTimeout(r, 300))
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ uploadUri: FAKE_UPLOAD_URI }),
      })
    })
    await page.route("**/upload.googleapis.com/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(DRIVE_RESULT),
      })
    })
    await page.route("**/api/admin/property-forms/finalize-upload**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(FINALIZE_RESPONSE),
      })
    })

    await page.goto("/admin/property-forms")
    await page.getByTestId("admin-entity-list-add-new--property-forms").click()
    await expect(page.getByTestId("admin-entity-create-form--property-forms")).toBeVisible()

    const fileInput = page.locator('input[type="file"]').first()
    await fileInput.setInputFiles({
      name: "test-form.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("fake pdf content"),
    })

    // Spinner appears while initiate-upload is delayed
    await expect(page.getByTestId("property-forms-create-upload-btn")).toContainText("Uploading")

    // After upload completes, success state shown
    await expect(page.getByTestId("property-forms-create-upload-success")).toBeVisible({ timeout: 5000 })
    await expect(page.getByTestId("property-forms-create-upload-success")).toContainText("test-form.pdf")
  })

  test("Create succeeds after upload and dialog closes", async ({ page }) => {
    let createCallCount = 0
    await page.route("**/api/admin/property-forms**", async (route) => {
      const url = route.request().url()
      const method = route.request().method()
      if (
        url.includes("/initiate-upload") ||
        url.includes("/finalize-upload") ||
        url.includes("/record-form-upload") ||
        url.includes("/send")
      ) {
        await route.continue()
        return
      }
      if (method === "POST") {
        createCallCount++
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify(CREATED_FORM_RESPONSE),
        })
        return
      }
      const listBody =
        createCallCount > 0
          ? { ...FORMS_LIST_EMPTY, items: [CREATED_FORM_RESPONSE], totalCount: 1 }
          : FORMS_LIST_EMPTY
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(listBody),
      })
    })
    await routeFormUpload(page)

    await page.goto("/admin/property-forms")
    await page.getByTestId("admin-entity-list-add-new--property-forms").click()
    await expect(page.getByTestId("admin-entity-create-form--property-forms")).toBeVisible()

    await page.getByTestId("admin-entity-create-field--property-forms--formName").fill("Test Form")

    const fileInput = page.locator('input[type="file"]').first()
    await fileInput.setInputFiles({
      name: "test-form.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("fake pdf content"),
    })
    await expect(page.getByTestId("property-forms-create-upload-success")).toBeVisible({ timeout: 5000 })

    await page.getByTestId("admin-entity-create-submit--property-forms").click()
    await expect(page.getByTestId("admin-entity-create-form--property-forms")).not.toBeVisible({ timeout: 5000 })
  })

  test("Upload error is shown inline when initiate-upload fails", async ({ page }) => {
    await page.route("**/api/admin/property-forms/initiate-upload**", async (route) => {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          error: "Google Drive is not connected. Please reconnect your Google account to enable file uploads.",
        }),
      })
    })

    await page.goto("/admin/property-forms")
    await page.getByTestId("admin-entity-list-add-new--property-forms").click()
    await expect(page.getByTestId("admin-entity-create-form--property-forms")).toBeVisible()

    const fileInput = page.locator('input[type="file"]').first()
    await fileInput.setInputFiles({
      name: "test-form.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("fake pdf content"),
    })

    await expect(page.getByTestId("property-forms-create-upload-error")).toBeVisible({ timeout: 5000 })
    await expect(page.getByTestId("property-forms-create-upload-error")).toContainText(
      "Google Drive is not connected",
    )
  })

  test("Retry button appears after upload error and re-attempts with same file", async ({ page }) => {
    let callCount = 0
    await page.route("**/api/admin/property-forms/initiate-upload**", async (route) => {
      callCount++
      if (callCount === 1) {
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ error: "Google Drive is not connected. Please reconnect your Google account." }),
        })
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ uploadUri: FAKE_UPLOAD_URI }),
        })
      }
    })
    await page.route("**/upload.googleapis.com/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(DRIVE_RESULT),
      })
    })
    await page.route("**/api/admin/property-forms/finalize-upload**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(FINALIZE_RESPONSE),
      })
    })

    await page.goto("/admin/property-forms")
    await page.getByTestId("admin-entity-list-add-new--property-forms").click()
    await expect(page.getByTestId("admin-entity-create-form--property-forms")).toBeVisible()

    const fileInput = page.locator('input[type="file"]').first()
    await fileInput.setInputFiles({
      name: "test-form.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("fake pdf content"),
    })

    // First attempt fails — error + retry button visible
    await expect(page.getByTestId("property-forms-create-upload-error")).toBeVisible({ timeout: 5000 })
    const retryBtn = page.getByTestId("property-forms-create-upload-retry")
    await expect(retryBtn).toBeVisible()

    // Click Retry — second attempt succeeds
    await retryBtn.click()
    await expect(page.getByTestId("property-forms-create-upload-success")).toBeVisible({ timeout: 5000 })
    await expect(page.getByTestId("property-forms-create-upload-success")).toContainText("test-form.pdf")
    expect(callCount).toBe(2)
  })
})
