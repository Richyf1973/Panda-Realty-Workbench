// Run: npm run test:e2e:scratch -- --app=panda-realty --spec="apps/panda-realty/e2e/admin-properties-files-create-folder.spec.ts"

import { expect, test } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { createStory, shotFocused } from "@repo/e2e-utils"

import { requirePandaE2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import { routePandaPropertiesListDetailAndBuyerOffers } from "./helpers/panda-properties-dialog-mocks"
import {
  EMPTY_PROPERTY_ENTITIES_RESPONSE,
  STATUS_LIST_RESPONSE,
} from "./helpers/admin-properties-mocks"

const SHOT_DIR = join(dirname(fileURLToPath(import.meta.url)), "screenshots", "create-drive-folder")

const story = createStory({
  specUrl: import.meta.url,
  slug: "property-files-create-drive-folder",
})

story.setWhatWasBuilt(
  "Added a 'Create Drive Folder' button to the Panda Realty property Files tab. " +
  "A new API route POST /api/admin/property-list-files/create-folder accepts { propertyListId }, " +
  "creates the Google Drive folder for the property, and returns { folderId, folderName }. " +
  "The button shows a loading spinner while the request is in-flight, then displays a persistent " +
  "inline success message with a clickable 'Open in Drive' link. Idempotent: pressing again when " +
  "the folder already exists returns the same folder. " +
  "Key files: apps/panda-realty/app/api/admin/property-list-files/create-folder/route.ts, " +
  "apps/panda-realty/components/admin/panda-properties-form-files-tab.tsx.",
)

// ─── Fixtures ────────────────────────────────────────────────────────────────

const AGGREGATE_FILES_EMPTY = { items: [] }

const AGGREGATE_FILES_WITH_ONE = {
  items: [
    {
      kind: "property" as const,
      id: 10,
      propertyListFileId: 10,
      fileName: "existing-file.pdf",
      fileType: "application/pdf",
      fileSize: 1024,
      fileLink: "https://drive.google.com/file/d/some-id/view",
      googleDriveFileId: "some-id",
      source: null,
      createdAt: "2026-01-10T00:00:00.000Z",
      sourceLabel: "Property",
    },
  ],
}

const CREATE_FOLDER_SUCCESS = {
  folderId: "drive-folder-e2e-id",
  folderName: "1 Test St Suburb VIC 3000",
  alreadyExists: false,
}

const CREATE_FOLDER_ALREADY_EXISTS = {
  folderId: "drive-folder-e2e-id",
  folderName: "1 Test St Suburb VIC 3000",
  alreadyExists: true,
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function openFilesTab(page: Parameters<typeof signInAsAdmin>[0]) {
  await page.goto("/admin/properties")
  await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible()
  await page.getByTestId("admin-entity-row--properties--1001").click()
  await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible()
  await page.getByTestId("panda-properties-form-tab-trigger--files").click()
  await expect(page.getByTestId("panda-properties-form-tab--files-content")).toBeVisible()
}

// ─── Tests ───────────────────────────────────────────────────────────────────

test.describe("Panda Realty — property files: Create Drive Folder (mocked APIs)", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaE2eAdminCredentials()
    await mkdir(SHOT_DIR, { recursive: true })
    await page.route("**/api/admin/property-status**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(STATUS_LIST_RESPONSE) })
    })
    await page.route("**/api/admin/property-entities**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_PROPERTY_ENTITIES_RESPONSE) })
    })
    await signInAsAdmin(page)
  })

  test.afterAll(() => {
    story.write()
  })

  test("Create Drive Folder button is visible as leftmost button in toolbar", async ({ page }) => {
    await routePandaPropertiesListDetailAndBuyerOffers(page)
    await page.route("**/api/admin/property-list-files?**", async (route) => {
      if (route.request().method() !== "GET") { await route.continue(); return }
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(AGGREGATE_FILES_EMPTY) })
    })

    await openFilesTab(page)

    const createBtn = page.getByTestId("panda-properties-form-files-btn--create-folder")
    await expect(createBtn).toBeVisible({ timeout: 10_000 })
    await expect(createBtn).toBeEnabled()

    await shotFocused(page, createBtn, SHOT_DIR, "01-button-visible")
    story.addScene({
      title: "01 — Create Drive Folder button visible in toolbar",
      images: [join(SHOT_DIR, "01-button-visible.png")],
      seeing: "The 'Create Drive Folder' button is the leftmost button in the toolbar, before 'Sync from Drive' and 'Add files'.",
      steps: ["Open any saved property", "Click the Files tab", "Observe 'Create Drive Folder' is the first button in the toolbar"],
    })
  })

  test("Button shows spinner and is disabled while request is in-flight", async ({ page }) => {
    await routePandaPropertiesListDetailAndBuyerOffers(page)

    let resolveCreate!: () => void
    const createHeld = new Promise<void>((res) => { resolveCreate = res })

    await page.route("**/api/admin/property-list-files?**", async (route) => {
      if (route.request().method() !== "GET") { await route.continue(); return }
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(AGGREGATE_FILES_EMPTY) })
    })
    await page.route("**/api/admin/property-list-files/create-folder**", async (route) => {
      await createHeld
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(CREATE_FOLDER_SUCCESS) })
    })

    await openFilesTab(page)
    await page.getByTestId("panda-properties-form-files-btn--create-folder").click()

    // While in-flight: button disabled
    await expect(page.getByTestId("panda-properties-form-files-btn--create-folder")).toBeDisabled({ timeout: 5_000 })

    await shotFocused(page, page.getByTestId("panda-properties-form-files-btn--create-folder"), SHOT_DIR, "02-loading-state")
    story.addScene({
      title: "02 — Loading state: button disabled with spinner",
      images: [join(SHOT_DIR, "02-loading-state.png")],
      seeing: "The 'Create Drive Folder' button is disabled and shows a spinner while the API request is in-flight.",
      steps: ["Click 'Create Drive Folder'", "Observe button is immediately disabled with a spinner"],
    })

    resolveCreate()
  })

  test("On success: inline message shows folder name and Open in Drive link", async ({ page }) => {
    await routePandaPropertiesListDetailAndBuyerOffers(page)
    await page.route("**/api/admin/property-list-files?**", async (route) => {
      if (route.request().method() !== "GET") { await route.continue(); return }
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(AGGREGATE_FILES_EMPTY) })
    })
    await page.route("**/api/admin/property-list-files/create-folder**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(CREATE_FOLDER_SUCCESS) })
    })

    await openFilesTab(page)
    await page.getByTestId("panda-properties-form-files-btn--create-folder").click()

    const folderMsg = page.getByTestId("panda-properties-form-files-folder-message")
    await expect(folderMsg).toBeVisible({ timeout: 10_000 })
    await expect(folderMsg).toContainText("1 Test St Suburb VIC 3000")

    const folderLink = page.getByTestId("panda-properties-form-files-folder-link")
    await expect(folderLink).toBeVisible()
    await expect(folderLink).toHaveAttribute("href", "https://drive.google.com/drive/folders/drive-folder-e2e-id")

    await shotFocused(page, folderMsg, SHOT_DIR, "03-success-message")
    story.addScene({
      title: "03 — Success: folder name + Open in Drive link",
      images: [join(SHOT_DIR, "03-success-message.png")],
      seeing: "Persistent inline message shows the folder name '1 Test St Suburb VIC 3000' and a clickable 'Open in Drive' link.",
      steps: [
        "Click 'Create Drive Folder'",
        "Wait for the response",
        "Observe the inline message with folder name and Drive link",
      ],
    })
  })

  test("Create folder POST body includes correct propertyListId", async ({ page }) => {
    await routePandaPropertiesListDetailAndBuyerOffers(page)

    let requestBody: string | null = null

    await page.route("**/api/admin/property-list-files?**", async (route) => {
      if (route.request().method() !== "GET") { await route.continue(); return }
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(AGGREGATE_FILES_EMPTY) })
    })
    await page.route("**/api/admin/property-list-files/create-folder**", async (route) => {
      requestBody = route.request().postData()
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(CREATE_FOLDER_SUCCESS) })
    })

    await openFilesTab(page)
    await page.getByTestId("panda-properties-form-files-btn--create-folder").click()

    await expect(page.getByTestId("panda-properties-form-files-folder-message")).toBeVisible({ timeout: 10_000 })

    expect(requestBody).toBeTruthy()
    const body = JSON.parse(requestBody!) as Record<string, unknown>
    expect(body.propertyListId).toBe(1001)
  })

  test("Second click (idempotent): same success state, no error", async ({ page }) => {
    await routePandaPropertiesListDetailAndBuyerOffers(page)
    await page.route("**/api/admin/property-list-files?**", async (route) => {
      if (route.request().method() !== "GET") { await route.continue(); return }
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(AGGREGATE_FILES_EMPTY) })
    })

    let callCount = 0
    await page.route("**/api/admin/property-list-files/create-folder**", async (route) => {
      callCount++
      const body = callCount === 1 ? CREATE_FOLDER_SUCCESS : CREATE_FOLDER_ALREADY_EXISTS
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) })
    })

    await openFilesTab(page)

    // First click
    await page.getByTestId("panda-properties-form-files-btn--create-folder").click()
    await expect(page.getByTestId("panda-properties-form-files-folder-message")).toBeVisible({ timeout: 10_000 })

    // Second click
    await page.getByTestId("panda-properties-form-files-btn--create-folder").click()
    await expect(page.getByTestId("panda-properties-form-files-folder-message")).toBeVisible()
    await expect(page.getByTestId("panda-properties-form-files-folder-error")).toHaveCount(0)
  })

  test("Button is visible even when files already exist", async ({ page }) => {
    await routePandaPropertiesListDetailAndBuyerOffers(page)
    await page.route("**/api/admin/property-list-files?**", async (route) => {
      if (route.request().method() !== "GET") { await route.continue(); return }
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(AGGREGATE_FILES_WITH_ONE) })
    })

    await openFilesTab(page)

    // Files are present
    await expect(page.getByText("existing-file.pdf")).toBeVisible()

    // Button still visible
    await expect(page.getByTestId("panda-properties-form-files-btn--create-folder")).toBeVisible()
    await expect(page.getByTestId("panda-properties-form-files-btn--create-folder")).toBeEnabled()

    await shotFocused(page, page.getByTestId("panda-properties-form-files-btn--create-folder"), SHOT_DIR, "04-button-with-files")
    story.addScene({
      title: "04 — Button visible even when files exist",
      images: [join(SHOT_DIR, "04-button-with-files.png")],
      seeing: "The 'Create Drive Folder' button remains visible and enabled when the property already has files.",
      steps: ["Open a property with existing files", "Click the Files tab", "Observe 'Create Drive Folder' is still shown"],
    })
  })

  test("Unsaved property: save-first message shown, Create Drive Folder button absent", async ({ page }) => {
    await page.route("**/api/admin/properties**", async (route) => {
      await route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify({ items: [], totalCount: 0, limit: 25, totalPages: 0, hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null }),
      })
    })

    await page.goto("/admin/properties")
    await page.getByTestId("admin-entity-list-add-new--properties").click()
    await expect(page.getByTestId("panda-properties-dialog-form")).toBeVisible()
    await page.getByTestId("panda-properties-form-switch--isFavorite").click()
    await page.getByTestId("panda-properties-form-tab-trigger--files").click()

    await expect(page.getByTestId("panda-properties-form-files-tab--save-first")).toBeVisible()
    await expect(page.getByTestId("panda-properties-form-files-btn--create-folder")).toHaveCount(0)
  })

  test("Drive disconnected: inline error shown and button re-enabled", async ({ page }) => {
    await routePandaPropertiesListDetailAndBuyerOffers(page)
    await page.route("**/api/admin/property-list-files?**", async (route) => {
      if (route.request().method() !== "GET") { await route.continue(); return }
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(AGGREGATE_FILES_EMPTY) })
    })
    await page.route("**/api/admin/property-list-files/create-folder**", async (route) => {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: "Google Drive is not connected. Please reconnect your Google account to enable file uploads." }),
      })
    })

    await openFilesTab(page)
    await page.getByTestId("panda-properties-form-files-btn--create-folder").click()

    const errorMsg = page.getByTestId("panda-properties-form-files-folder-error")
    await expect(errorMsg).toBeVisible({ timeout: 10_000 })
    await expect(errorMsg).toContainText(/Google Drive/i)

    // Button re-enabled after error
    await expect(page.getByTestId("panda-properties-form-files-btn--create-folder")).toBeEnabled()

    await shotFocused(page, errorMsg, SHOT_DIR, "05-error-state")
    story.addScene({
      title: "05 — Error state: Drive disconnected",
      images: [join(SHOT_DIR, "05-error-state.png")],
      seeing: "Inline error message shown when Drive is not connected; button is re-enabled so user can retry.",
      steps: [
        "Click 'Create Drive Folder'",
        "API returns 503 (Drive disconnected)",
        "Observe inline error with 'Google Drive' mention",
        "Observe button is re-enabled",
      ],
    })
  })
})
