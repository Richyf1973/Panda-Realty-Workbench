import { expect, test } from "@playwright/test"

import { requirePandaE2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import { routePandaPropertiesListDetailAndBuyerOffers } from "./helpers/panda-properties-dialog-mocks"
import {
  EMPTY_PROPERTY_ENTITIES_RESPONSE,
  STATUS_LIST_RESPONSE,
} from "./helpers/admin-properties-mocks"

// ─── Fixtures ────────────────────────────────────────────────────────────────

const AGGREGATE_FILES_EMPTY = { items: [] }

/** Files list after sync that returned a JPG at property level. */
const AGGREGATE_FILES_WITH_JPG = {
  items: [
    {
      kind: "property" as const,
      id: 30,
      propertyListFileId: 30,
      fileName: "proforma with stamp_page-0001.jpg",
      fileType: "image/jpeg",
      fileSize: 20480,
      fileLink: "https://drive.google.com/file/d/drive-jpg/view",
      googleDriveFileId: "drive-jpg",
      source: "google_drive",
      createdAt: "2026-05-07T09:00:00.000Z",
      sourceLabel: "Property",
    },
  ],
}

/** Files list after sync that returned a PNG at property level. */
const AGGREGATE_FILES_WITH_PNG = {
  items: [
    {
      kind: "property" as const,
      id: 31,
      propertyListFileId: 31,
      fileName: "floor-plan.png",
      fileType: "image/png",
      fileSize: 51200,
      fileLink: "https://drive.google.com/file/d/drive-png/view",
      googleDriveFileId: "drive-png",
      source: "google_drive",
      createdAt: "2026-05-07T09:01:00.000Z",
      sourceLabel: "Property",
    },
  ],
}

/** Mixed: manually uploaded PDF + Drive-synced JPG. */
const AGGREGATE_FILES_MIXED = {
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
    {
      kind: "property" as const,
      id: 30,
      propertyListFileId: 30,
      fileName: "proforma with stamp_page-0001.jpg",
      fileType: "image/jpeg",
      fileSize: 20480,
      fileLink: "https://drive.google.com/file/d/drive-jpg/view",
      googleDriveFileId: "drive-jpg",
      source: "google_drive",
      createdAt: "2026-05-07T09:00:00.000Z",
      sourceLabel: "Property",
    },
  ],
}

/** JPG file linked to an entity subfolder. */
const AGGREGATE_FILES_JPG_ENTITY = {
  items: [
    {
      kind: "entity" as const,
      id: 40,
      propertyEntityFileId: 40,
      propertyEntityId: 501,
      fileName: "buyer-id-scan.jpg",
      fileType: "image/jpeg",
      fileSize: 30720,
      fileLink: "https://drive.google.com/file/d/drive-entity-jpg/view",
      googleDriveFileId: "drive-entity-jpg",
      source: "google_drive",
      createdAt: "2026-05-07T10:00:00.000Z",
      sourceLabel: "Buyer — Test Buyer LLC",
    },
  ],
}

const SYNC_1_ADDED = { added: 1, syncedAt: "2026-05-08T03:36:00.000Z" }
const SYNC_0_ADDED = { added: 0, syncedAt: "2026-05-08T03:37:00.000Z" }

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

test.describe("Panda Realty — Drive sync: image files (MV checklist coverage)", () => {
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

  // ── MV step 3-5: JPG at property level synced and shown with Drive badge ───
  test("synced image/jpeg at property level appears in Files list with Drive badge", async ({ page }) => {
    await routePandaPropertiesListDetailAndBuyerOffers(page)

    let callCount = 0
    await page.route("**/api/admin/property-list-files?**", async (route) => {
      if (route.request().method() !== "GET") { await route.continue(); return }
      callCount++
      const body = callCount === 1 ? AGGREGATE_FILES_EMPTY : AGGREGATE_FILES_WITH_JPG
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) })
    })
    await page.route("**/api/admin/property-list-files/drive-sync**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SYNC_1_ADDED) })
    })

    await openFilesTab(page)
    await page.getByTestId("panda-properties-form-files-btn--sync").click()

    // Result message confirms 1 file added
    await expect(page.getByTestId("panda-properties-form-files-sync-result")).toContainText("1")

    // JPG row is present
    await expect(page.getByText("proforma with stamp_page-0001.jpg")).toBeVisible()

    // Drive badge visible on the JPG row
    const jpgRow = page.getByTestId("panda-properties-form-files-row").filter({ hasText: "proforma with stamp_page-0001.jpg" })
    await expect(jpgRow.getByTestId("panda-properties-form-files-drive-badge")).toBeVisible()

    // Source label is "Property"
    await expect(jpgRow.getByTestId("panda-properties-form-files-source")).toContainText("Property")
  })

  // ── MV step 8: PNG also synced ────────────────────────────────────────────
  test("synced image/png at property level appears in Files list with Drive badge", async ({ page }) => {
    await routePandaPropertiesListDetailAndBuyerOffers(page)

    let callCount = 0
    await page.route("**/api/admin/property-list-files?**", async (route) => {
      if (route.request().method() !== "GET") { await route.continue(); return }
      callCount++
      const body = callCount === 1 ? AGGREGATE_FILES_EMPTY : AGGREGATE_FILES_WITH_PNG
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) })
    })
    await page.route("**/api/admin/property-list-files/drive-sync**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SYNC_1_ADDED) })
    })

    await openFilesTab(page)
    await page.getByTestId("panda-properties-form-files-btn--sync").click()

    await expect(page.getByText("floor-plan.png")).toBeVisible()
    const pngRow = page.getByTestId("panda-properties-form-files-row").filter({ hasText: "floor-plan.png" })
    await expect(pngRow.getByTestId("panda-properties-form-files-drive-badge")).toBeVisible()
  })

  // ── MV step 7: deduplication still works for image files ─────────────────
  test("second sync with same image file adds 0 new files (deduplication)", async ({ page }) => {
    await routePandaPropertiesListDetailAndBuyerOffers(page)

    let syncCount = 0
    await page.route("**/api/admin/property-list-files?**", async (route) => {
      if (route.request().method() !== "GET") { await route.continue(); return }
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(AGGREGATE_FILES_WITH_JPG) })
    })
    await page.route("**/api/admin/property-list-files/drive-sync**", async (route) => {
      syncCount++
      const body = syncCount === 1 ? SYNC_1_ADDED : SYNC_0_ADDED
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) })
    })

    await openFilesTab(page)

    // First sync
    await page.getByTestId("panda-properties-form-files-btn--sync").click()
    await expect(page.getByTestId("panda-properties-form-files-sync-result")).toContainText("1")

    // Second sync
    await page.getByTestId("panda-properties-form-files-btn--sync").click()
    await expect(page.getByTestId("panda-properties-form-files-sync-result")).toContainText("0")

    // Still only 1 row, no duplicate
    await expect(page.getByTestId("panda-properties-form-files-row")).toHaveCount(1)
  })

  // ── MV step 9: mixed manual + Drive-synced files — no badge on manual file
  test("manually uploaded file has no Drive badge; synced image does", async ({ page }) => {
    await routePandaPropertiesListDetailAndBuyerOffers(page)

    await page.route("**/api/admin/property-list-files?**", async (route) => {
      if (route.request().method() !== "GET") { await route.continue(); return }
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(AGGREGATE_FILES_MIXED) })
    })

    await openFilesTab(page)

    const rows = page.getByTestId("panda-properties-form-files-row")
    await expect(rows).toHaveCount(2)

    // Synced JPG has Drive badge
    const jpgRow = rows.filter({ hasText: "proforma with stamp_page-0001.jpg" })
    await expect(jpgRow.getByTestId("panda-properties-form-files-drive-badge")).toBeVisible()

    // Manually uploaded PDF has no Drive badge
    const pdfRow = rows.filter({ hasText: "manual-upload.pdf" })
    await expect(pdfRow.getByTestId("panda-properties-form-files-drive-badge")).toHaveCount(0)
  })

  // ── MV step 10: image in entity subfolder shows entity source label ────────
  test("image from entity subfolder shows entity source label and Drive badge", async ({ page }) => {
    await routePandaPropertiesListDetailAndBuyerOffers(page)

    await page.route("**/api/admin/property-list-files?**", async (route) => {
      if (route.request().method() !== "GET") { await route.continue(); return }
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(AGGREGATE_FILES_JPG_ENTITY) })
    })

    await openFilesTab(page)

    const entityJpgRow = page.getByTestId("panda-properties-form-files-row").filter({ hasText: "buyer-id-scan.jpg" })
    await expect(entityJpgRow.getByTestId("panda-properties-form-files-source")).toContainText("Test Buyer LLC")
    await expect(entityJpgRow.getByTestId("panda-properties-form-files-drive-badge")).toBeVisible()
  })

  // ── Regression: PDFs still appear after fix (listFilesInFolder client-side filter)
  test("regression — PDF files still appear in Files list after fix", async ({ page }) => {
    await routePandaPropertiesListDetailAndBuyerOffers(page)

    const filesWithPdf = {
      items: [
        {
          kind: "property" as const,
          id: 11,
          propertyListFileId: 11,
          fileName: "CONTRACT 2026.pdf",
          fileType: "application/pdf",
          fileSize: 204800,
          fileLink: "https://drive.google.com/file/d/drive-pdf/view",
          googleDriveFileId: "drive-pdf",
          source: "google_drive",
          createdAt: "2026-05-04T07:14:00.000Z",
          sourceLabel: "Property",
        },
      ],
    }

    let callCount = 0
    await page.route("**/api/admin/property-list-files?**", async (route) => {
      if (route.request().method() !== "GET") { await route.continue(); return }
      callCount++
      const body = callCount === 1 ? AGGREGATE_FILES_EMPTY : filesWithPdf
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) })
    })
    await page.route("**/api/admin/property-list-files/drive-sync**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SYNC_1_ADDED) })
    })

    await openFilesTab(page)
    await page.getByTestId("panda-properties-form-files-btn--sync").click()

    await expect(page.getByText("CONTRACT 2026.pdf")).toBeVisible()
    const pdfRow = page.getByTestId("panda-properties-form-files-row").filter({ hasText: "CONTRACT 2026.pdf" })
    await expect(pdfRow.getByTestId("panda-properties-form-files-drive-badge")).toBeVisible()
  })

  // ── MV step 5: image file has Download button (googleDriveFileId set) ─────
  test("synced image file has a Download button", async ({ page }) => {
    await routePandaPropertiesListDetailAndBuyerOffers(page)

    await page.route("**/api/admin/property-list-files?**", async (route) => {
      if (route.request().method() !== "GET") { await route.continue(); return }
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(AGGREGATE_FILES_WITH_JPG) })
    })

    await openFilesTab(page)

    const jpgRow = page.getByTestId("panda-properties-form-files-row").filter({ hasText: "proforma with stamp_page-0001.jpg" })
    const downloadBtn = jpgRow.getByTestId("panda-properties-form-files-btn--download")
    await expect(downloadBtn).toBeVisible()
    await expect(downloadBtn).toHaveAttribute("href", "https://drive.google.com/uc?export=download&id=drive-jpg")
  })
})
