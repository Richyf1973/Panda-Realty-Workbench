import { expect, test } from "@playwright/test"

import { requirePandaE2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import { routePandaPropertiesListDetailAndBuyerOffers } from "./helpers/panda-properties-dialog-mocks"
import {
  EMPTY_PROPERTY_ENTITIES_RESPONSE,
  STATUS_LIST_RESPONSE,
} from "./helpers/admin-properties-mocks"

// ─── Fixtures ────────────────────────────────────────────────────────────────

const AGGREGATE_FILES_EMPTY = { items: [] }

/** Two files already in the app — one property-level, one entity-level. No source flag (manually uploaded). */
const AGGREGATE_FILES_MANUAL = {
  items: [
    {
      kind: "property" as const,
      id: 10,
      propertyListFileId: 10,
      fileName: "manual-upload.pdf",
      fileType: "application/pdf",
      fileSize: 1024,
      fileLink: "https://drive.google.com/file/d/manual/view",
      googleDriveFileId: "manual-drive-id",
      source: null,
      createdAt: "2026-01-10T00:00:00.000Z",
      sourceLabel: "Property",
    },
  ],
}

/** Files after sync — includes Drive-sourced property-level and entity-level files. */
const AGGREGATE_FILES_AFTER_SYNC = {
  items: [
    {
      kind: "property" as const,
      id: 11,
      propertyListFileId: 11,
      fileName: "CONTRACT 2026.pdf",
      fileType: "application/pdf",
      fileSize: 204800,
      fileLink: "https://drive.google.com/file/d/drive-abc/view",
      googleDriveFileId: "drive-abc",
      source: "google_drive",
      createdAt: "2026-05-04T07:14:00.000Z",
      sourceLabel: "Property",
    },
    {
      kind: "entity" as const,
      id: 21,
      propertyEntityFileId: 21,
      propertyEntityId: 501,
      fileName: "ID_Copy.jpg",
      fileType: "image/jpeg",
      fileSize: 81920,
      fileLink: "https://drive.google.com/file/d/drive-def/view",
      googleDriveFileId: "drive-def",
      source: "google_drive",
      createdAt: "2026-05-04T07:14:00.000Z",
      sourceLabel: "Buyer — Test Buyer LLC",
    },
    {
      kind: "property" as const,
      id: 10,
      propertyListFileId: 10,
      fileName: "manual-upload.pdf",
      fileType: "application/pdf",
      fileSize: 1024,
      fileLink: "https://drive.google.com/file/d/manual/view",
      googleDriveFileId: "manual-drive-id",
      source: null,
      createdAt: "2026-01-10T00:00:00.000Z",
      sourceLabel: "Property",
    },
  ],
}

const SYNC_SUCCESS_2_ADDED = {
  added: 2,
  syncedAt: "2026-05-04T07:14:00.000Z",
}

const SYNC_SUCCESS_0_ADDED = {
  added: 0,
  syncedAt: "2026-05-04T07:15:00.000Z",
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

test.describe("Panda Realty — property Files tab: Drive sync (mocked APIs)", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaE2eAdminCredentials()
    await page.route("**/api/admin/property-status**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(STATUS_LIST_RESPONSE) })
    })
    await page.route("**/api/admin/property-entities**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_PROPERTY_ENTITIES_RESPONSE) })
    })
    await signInAsAdmin(page)
  })

  // ── Step 1-2: Sync button visible; no "Last synced" before first sync ──────
  test("Files tab shows Sync button and no last-synced line before first sync", async ({ page }) => {
    await routePandaPropertiesListDetailAndBuyerOffers(page)
    await page.route("**/api/admin/property-list-files?**", async (route) => {
      if (route.request().method() !== "GET") { await route.continue(); return }
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(AGGREGATE_FILES_EMPTY) })
    })

    await openFilesTab(page)

    await expect(page.getByTestId("panda-properties-form-files-btn--sync")).toBeVisible()
    await expect(page.getByTestId("panda-properties-form-files-btn--sync")).toBeEnabled()
    await expect(page.getByTestId("panda-properties-form-files-last-synced")).toHaveCount(0)
  })

  // ── Step 2: Sync button goes to spinner state while syncing ───────────────
  test("Sync button shows spinner while sync is in progress", async ({ page }) => {
    await routePandaPropertiesListDetailAndBuyerOffers(page)

    let resolveSyncResponse!: () => void
    const syncResponseHeld = new Promise<void>((res) => { resolveSyncResponse = res })

    await page.route("**/api/admin/property-list-files?**", async (route) => {
      if (route.request().method() !== "GET") { await route.continue(); return }
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(AGGREGATE_FILES_EMPTY) })
    })
    await page.route("**/api/admin/property-list-files/drive-sync**", async (route) => {
      // Hold the response until we've checked the spinner
      await syncResponseHeld
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SYNC_SUCCESS_2_ADDED) })
    })

    await openFilesTab(page)
    await page.getByTestId("panda-properties-form-files-btn--sync").click()

    // Button must be disabled / in syncing state immediately
    await expect(page.getByTestId("panda-properties-form-files-btn--sync")).toBeDisabled()

    resolveSyncResponse()
  })

  // ── Step 3-4: Sync completes → result message, list refresh, timestamp ────
  test("Sync completes: shows result message, refreshes file list, shows last-synced", async ({ page }) => {
    await routePandaPropertiesListDetailAndBuyerOffers(page)

    let callCount = 0
    await page.route("**/api/admin/property-list-files?**", async (route) => {
      if (route.request().method() !== "GET") { await route.continue(); return }
      // First load: manual file only. After sync: full list.
      callCount++
      const body = callCount === 1 ? AGGREGATE_FILES_MANUAL : AGGREGATE_FILES_AFTER_SYNC
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) })
    })
    await page.route("**/api/admin/property-list-files/drive-sync**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SYNC_SUCCESS_2_ADDED) })
    })

    await openFilesTab(page)
    await page.getByTestId("panda-properties-form-files-btn--sync").click()

    // Result message: "2 new files added" (or similar)
    await expect(page.getByTestId("panda-properties-form-files-sync-result")).toContainText("2")

    // File list refreshed: Drive files now visible
    await expect(page.getByText("CONTRACT 2026.pdf")).toBeVisible()
    await expect(page.getByText("ID_Copy.jpg")).toBeVisible()

    // Last synced timestamp appears
    await expect(page.getByTestId("panda-properties-form-files-last-synced")).toBeVisible()
  })

  // ── Step 4-5: Drive badge on synced files; no badge on manual file ────────
  test("Drive-synced files show Drive badge; manually uploaded files do not", async ({ page }) => {
    await routePandaPropertiesListDetailAndBuyerOffers(page)

    await page.route("**/api/admin/property-list-files?**", async (route) => {
      if (route.request().method() !== "GET") { await route.continue(); return }
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(AGGREGATE_FILES_AFTER_SYNC) })
    })

    await openFilesTab(page)

    const rows = page.getByTestId("panda-properties-form-files-row")
    await expect(rows).toHaveCount(3)

    // Drive-sourced rows show the badge
    const driveBadges = page.getByTestId("panda-properties-form-files-drive-badge")
    await expect(driveBadges).toHaveCount(2)

    // Manual row (source: null) must NOT have a Drive badge
    const manualRow = page.getByTestId("panda-properties-form-files-row").filter({ hasText: "manual-upload.pdf" })
    await expect(manualRow.getByTestId("panda-properties-form-files-drive-badge")).toHaveCount(0)
  })

  // ── Step 4: Entity-matched file shows entity source label + Drive badge ────
  test("Entity-subfolder file shows entity source label and Drive badge", async ({ page }) => {
    await routePandaPropertiesListDetailAndBuyerOffers(page)

    await page.route("**/api/admin/property-list-files?**", async (route) => {
      if (route.request().method() !== "GET") { await route.continue(); return }
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(AGGREGATE_FILES_AFTER_SYNC) })
    })

    await openFilesTab(page)

    const entityRow = page.getByTestId("panda-properties-form-files-row").filter({ hasText: "ID_Copy.jpg" })
    await expect(entityRow.getByTestId("panda-properties-form-files-source")).toContainText("Test Buyer LLC")
    await expect(entityRow.getByTestId("panda-properties-form-files-drive-badge")).toBeVisible()
  })

  // ── Step 7: Deduplication — second sync adds 0 files ─────────────────────
  test("Second sync with same Drive files adds 0 new files (deduplication)", async ({ page }) => {
    await routePandaPropertiesListDetailAndBuyerOffers(page)

    let syncCount = 0
    await page.route("**/api/admin/property-list-files?**", async (route) => {
      if (route.request().method() !== "GET") { await route.continue(); return }
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(AGGREGATE_FILES_AFTER_SYNC) })
    })
    await page.route("**/api/admin/property-list-files/drive-sync**", async (route) => {
      syncCount++
      // First sync adds 2, second adds 0
      const body = syncCount === 1 ? SYNC_SUCCESS_2_ADDED : SYNC_SUCCESS_0_ADDED
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) })
    })

    await openFilesTab(page)

    // First sync
    await page.getByTestId("panda-properties-form-files-btn--sync").click()
    await expect(page.getByTestId("panda-properties-form-files-sync-result")).toContainText("2")

    // Second sync
    await page.getByTestId("panda-properties-form-files-btn--sync").click()
    await expect(page.getByTestId("panda-properties-form-files-sync-result")).toContainText("0")

    // File count unchanged
    await expect(page.getByTestId("panda-properties-form-files-row")).toHaveCount(3)
  })

  // ── Step 6: No matching Drive folder → 0 new files, timestamp still updates
  test("Sync with no matching Drive folder returns 0 new files without error", async ({ page }) => {
    await routePandaPropertiesListDetailAndBuyerOffers(page)

    await page.route("**/api/admin/property-list-files?**", async (route) => {
      if (route.request().method() !== "GET") { await route.continue(); return }
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(AGGREGATE_FILES_EMPTY) })
    })
    await page.route("**/api/admin/property-list-files/drive-sync**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SYNC_SUCCESS_0_ADDED) })
    })

    await openFilesTab(page)
    await page.getByTestId("panda-properties-form-files-btn--sync").click()

    await expect(page.getByTestId("panda-properties-form-files-sync-result")).toContainText("0")
    await expect(page.getByTestId("panda-properties-form-files-last-synced")).toBeVisible()
  })

  // ── Step 12: Sync button not shown for new (unsaved) property ─────────────
  test("Sync button is absent in create dialog (save-first state)", async ({ page }) => {
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
    await expect(page.getByTestId("panda-properties-form-files-btn--sync")).toHaveCount(0)
  })

  // ── Step 13: Drive disconnected → inline error, button recovers ───────────
  test("Drive disconnected shows inline error and sync button recovers", async ({ page }) => {
    await routePandaPropertiesListDetailAndBuyerOffers(page)

    await page.route("**/api/admin/property-list-files?**", async (route) => {
      if (route.request().method() !== "GET") { await route.continue(); return }
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(AGGREGATE_FILES_EMPTY) })
    })
    await page.route("**/api/admin/property-list-files/drive-sync**", async (route) => {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: "Google Drive is not connected. Please reconnect your Google account." }),
      })
    })

    await openFilesTab(page)
    await page.getByTestId("panda-properties-form-files-btn--sync").click()

    // Error shown inline
    await expect(page.getByTestId("panda-properties-form-files-sync-error")).toBeVisible()
    await expect(page.getByTestId("panda-properties-form-files-sync-error")).toContainText(/Google Drive/i)

    // Sync button is no longer disabled (recovered)
    await expect(page.getByTestId("panda-properties-form-files-btn--sync")).toBeEnabled()
  })

  // ── POST body: drive-sync sends propertyListId ────────────────────────────
  test("Drive sync POST body includes propertyListId", async ({ page }) => {
    await routePandaPropertiesListDetailAndBuyerOffers(page)

    let syncRequestBody: string | null = null

    await page.route("**/api/admin/property-list-files?**", async (route) => {
      if (route.request().method() !== "GET") { await route.continue(); return }
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(AGGREGATE_FILES_EMPTY) })
    })
    await page.route("**/api/admin/property-list-files/drive-sync**", async (route) => {
      syncRequestBody = route.request().postData()
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SYNC_SUCCESS_0_ADDED) })
    })

    await openFilesTab(page)
    await page.getByTestId("panda-properties-form-files-btn--sync").click()

    await expect(page.getByTestId("panda-properties-form-files-last-synced")).toBeVisible()

    expect(syncRequestBody).toBeTruthy()
    const body = JSON.parse(syncRequestBody!) as Record<string, unknown>
    expect(body.propertyListId).toBe(1001)
  })
})
