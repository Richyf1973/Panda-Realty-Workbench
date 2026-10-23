import { expect, test } from "@playwright/test"

import { requirePandaE2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import { routePandaPropertiesListDetailAndBuyerOffers } from "./helpers/panda-properties-dialog-mocks"

const STATUS_MIN = {
  items: [
    {
      propertyStatusId: 1,
      propertyStatusCode: "ACTIVE",
      propertyStatus: "Active",
    },
  ],
  totalCount: 1,
  limit: 100,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false,
  startCursor: null,
  endCursor: null,
}

const AGGREGATE_FILES = {
  items: [
    {
      kind: "property" as const,
      id: 10,
      propertyListFileId: 10,
      fileName: "floorplan-e2e.pdf",
      fileType: "application/pdf",
      fileSize: 2048,
      fileLink: "https://example.com/view-floorplan",
      googleDriveFileId: "drive-floor",
      createdAt: "2026-01-10T00:00:00.000Z",
      sourceLabel: "Property",
      sharedWithPortal: false,
      sharedWithSeller: false,
    },
    {
      kind: "entity" as const,
      id: 20,
      propertyEntityFileId: 20,
      propertyEntityId: 501,
      fileName: "offer-scan.png",
      fileType: "image/png",
      fileSize: 4096,
      fileLink: "https://example.com/view-offer",
      googleDriveFileId: "drive-offer",
      createdAt: "2026-01-09T00:00:00.000Z",
      sourceLabel: "Buyer — Test Buyer LLC",
      sharedWithPortal: false,
      sharedWithSeller: false,
    },
  ],
}

const EMPTY_PROPERTY_ENTITIES_LIST = {
  items: [],
  totalCount: 0,
  limit: 20,
  totalPages: 0,
  hasNextPage: false,
  hasPreviousPage: false,
  startCursor: null,
  endCursor: null,
}

const FAKE_UPLOAD_URI =
  "https://upload.googleapis.com/upload/drive/v3/files?uploadType=resumable&upload_id=e2e-test"
const DRIVE_RESULT = {
  id: "drive-e2e",
  webViewLink: "https://drive.google.com/file/d/drive-e2e/view",
}
const RECORD_UPLOAD_RESULT = {
  propertyListFileId: 99,
  propertyListId: 1001,
  fileName: "e2e-assert-upload.txt",
  fileType: "text/plain",
  fileSize: 14,
  fileLink: DRIVE_RESULT.webViewLink,
  googleDriveFileId: DRIVE_RESULT.id,
  createdAt: "2026-01-20T00:00:00.000Z",
}

test.describe("Panda Realty admin — property dialog Files tab (mocked APIs)", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaE2eAdminCredentials()
    await page.route("**/api/admin/property-status**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(STATUS_MIN),
      })
    })
    await page.route("**/api/admin/property-entities**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(EMPTY_PROPERTY_ENTITIES_LIST),
      })
    })
    await signInAsAdmin(page)
  })

  test("edit: Files tab lists aggregate rows and enables Add files", async ({ page }) => {
    await routePandaPropertiesListDetailAndBuyerOffers(page)

    await page.route("**/api/admin/property-list-files?**", async (route) => {
      if (route.request().method() !== "GET") {
        await route.continue()
        return
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(AGGREGATE_FILES),
      })
    })

    await page.goto("/admin/properties")

    await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible()
    await page.getByTestId("admin-entity-row--properties--1001").click()

    const dialog = page.getByTestId("admin-entity-crud-dialog--properties")
    await expect(dialog).toBeVisible()

    await page.getByTestId("panda-properties-form-tab-trigger--files").click()
    await expect(page.getByTestId("panda-properties-form-tab--files")).toBeVisible()
    await expect(page.getByTestId("panda-properties-form-tab--files-content")).toBeVisible()

    await expect(page.getByText("floorplan-e2e.pdf")).toBeVisible()
    await expect(page.getByText("offer-scan.png")).toBeVisible()
    await expect(
      page.getByTestId("panda-properties-form-files-source").filter({ hasText: /Property/ }),
    ).toBeVisible()
    await expect(
      page.getByTestId("panda-properties-form-files-source").filter({ hasText: /Test Buyer LLC/ }),
    ).toBeVisible()

    const addBtn = page.getByTestId("panda-properties-form-files-btn--add")
    await expect(addBtn).toBeEnabled()
    await expect(page.getByTestId("panda-properties-form-files-count")).toContainText("2 files")
  })

  test("edit: selecting a file completes two-phase Drive upload and refreshes list", async ({
    page,
  }) => {
    let initiateBody: string | null = null
    let recordBody: string | null = null

    await routePandaPropertiesListDetailAndBuyerOffers(page)

    await page.route("**/api/admin/property-list-files?**", async (route) => {
      if (route.request().method() !== "GET") {
        await route.continue()
        return
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(AGGREGATE_FILES),
      })
    })

    // Step 1: initiate-upload — server issues Drive upload URI
    await page.route("**/api/admin/property-list-files/initiate-upload**", async (route) => {
      initiateBody = route.request().postData()
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ uploadUri: FAKE_UPLOAD_URI }),
      })
    })

    // Step 2: XHR PUT directly to Drive upload URI
    await page.route("**/upload.googleapis.com/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(DRIVE_RESULT),
      })
    })

    // Step 3: record-upload — server persists to DB
    await page.route("**/api/admin/property-list-files/record-upload**", async (route) => {
      recordBody = route.request().postData()
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify(RECORD_UPLOAD_RESULT),
      })
    })

    await page.goto("/admin/properties")

    await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible()
    await page.getByTestId("admin-entity-row--properties--1001").click()

    const dialog = page.getByTestId("admin-entity-crud-dialog--properties")
    await expect(dialog).toBeVisible()

    await page.getByTestId("panda-properties-form-tab-trigger--files").click()
    await expect(page.getByTestId("panda-properties-form-tab--files-content")).toBeVisible()
    await expect(page.getByText("floorplan-e2e.pdf")).toBeVisible()

    const fileInput = dialog.getByTestId("panda-properties-form-files-file-input")
    await expect(fileInput).toBeAttached()
    await expect(fileInput).toBeEnabled()

    // waitForResponse resolves after the route handler runs (guaranteeing recordBody is set)
    const recordResponsePromise = page.waitForResponse(
      (res) =>
        res.url().includes("/api/admin/property-list-files/record-upload") &&
        res.request().method() === "POST",
    )

    await fileInput.setInputFiles({
      name: "e2e-assert-upload.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("e2e-upload-bytes"),
    })

    await recordResponsePromise

    // Initiate body must include fileName, mimeType, fileSize, propertyListId
    expect(initiateBody).toBeTruthy()
    const initiate = JSON.parse(initiateBody!) as Record<string, unknown>
    expect(initiate.fileName).toBe("e2e-assert-upload.txt")
    expect(initiate.propertyListId).toBe(1001)

    // Record body must include Drive result + propertyListId
    expect(recordBody).toBeTruthy()
    const record = JSON.parse(recordBody!) as Record<string, unknown>
    expect(record.googleDriveFileId).toBe(DRIVE_RESULT.id)
    expect(record.fileLink).toBe(DRIVE_RESULT.webViewLink)
    expect(record.propertyListId).toBe(1001)
  })

  test("create: Files tab shows save-first until property exists", async ({ page }) => {
    await page.route("**/api/admin/properties**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: [],
          totalCount: 0,
          limit: 25,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: null,
          endCursor: null,
        }),
      })
    })

    await page.goto("/admin/properties")

    await page.getByTestId("admin-entity-list-add-new--properties").click()
    await expect(page.getByTestId("panda-properties-dialog-form")).toBeVisible()

    await page.getByTestId("panda-properties-form-switch--isFavorite").click()
    await page.getByTestId("panda-properties-form-tab-trigger--files").click()

    await expect(page.getByTestId("panda-properties-form-files-tab--save-first")).toBeVisible()
    await expect(page.getByTestId("panda-properties-form-files-btn--add")).toHaveCount(0)
  })
})
