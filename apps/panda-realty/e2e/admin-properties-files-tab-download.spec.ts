import { expect, test } from "@playwright/test"

import { requirePandaE2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import { routePandaPropertiesListDetailAndBuyerOffers } from "./helpers/panda-properties-dialog-mocks"

const STATUS_MIN = {
  items: [{ propertyStatusId: 1, propertyStatusCode: "ACTIVE", propertyStatus: "Active" }],
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
      fileLink: "https://drive.google.com/file/d/drive-floor/view",
      googleDriveFileId: "drive-floor",
      source: null,
      createdAt: "2026-01-10T00:00:00.000Z",
      sourceLabel: "Property",
    },
    {
      kind: "entity" as const,
      id: 20,
      propertyEntityFileId: 20,
      propertyEntityId: 501,
      fileName: "offer-scan.png",
      fileType: "image/png",
      fileSize: 4096,
      fileLink: "https://drive.google.com/file/d/drive-offer/view",
      googleDriveFileId: "drive-offer",
      source: "google_drive",
      createdAt: "2026-01-09T00:00:00.000Z",
      sourceLabel: "Buyer — Test Buyer LLC",
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

test.describe("Panda Realty admin — property dialog Files tab download button", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaE2eAdminCredentials()
    await page.route("**/api/admin/property-status**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(STATUS_MIN) })
    })
    await page.route("**/api/admin/property-entities**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_PROPERTY_ENTITIES_LIST) })
    })
    await signInAsAdmin(page)
  })

  async function openFilesTab(page: import("@playwright/test").Page) {
    await routePandaPropertiesListDetailAndBuyerOffers(page)
    await page.route("**/api/admin/property-list-files?**", async (route) => {
      if (route.request().method() !== "GET") { await route.continue(); return }
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(AGGREGATE_FILES) })
    })
    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible()
    await page.getByTestId("admin-entity-row--properties--1001").click()
    await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible()
    await page.getByTestId("panda-properties-form-tab-trigger--files").click()
    await expect(page.getByTestId("panda-properties-form-tab--files-content")).toBeVisible()
  }

  test("each file row has download, open, and delete buttons", async ({ page }) => {
    await openFilesTab(page)

    const rows = page.getByTestId("panda-properties-form-files-row")
    await expect(rows).toHaveCount(2)

    for (let i = 0; i < 2; i++) {
      const row = rows.nth(i)
      await expect(row.getByTestId("panda-properties-form-files-btn--download")).toBeVisible()
      await expect(row.getByTestId("panda-properties-form-files-btn--open")).toBeVisible()
      await expect(row.getByTestId("panda-properties-form-files-btn--delete")).toBeVisible()
    }
  })

  test("download button href uses Google Drive export=download URL for property file", async ({ page }) => {
    await openFilesTab(page)

    const propertyRow = page
      .getByTestId("panda-properties-form-files-row")
      .filter({ hasText: "floorplan-e2e.pdf" })

    const downloadLink = propertyRow.getByTestId("panda-properties-form-files-btn--download")
    await expect(downloadLink).toBeVisible()
    await expect(downloadLink).toHaveAttribute("href", "https://drive.google.com/uc?export=download&id=drive-floor")
  })

  test("download button href uses Google Drive export=download URL for entity (Drive-synced) file", async ({ page }) => {
    await openFilesTab(page)

    const entityRow = page
      .getByTestId("panda-properties-form-files-row")
      .filter({ hasText: "offer-scan.png" })

    const downloadLink = entityRow.getByTestId("panda-properties-form-files-btn--download")
    await expect(downloadLink).toBeVisible()
    await expect(downloadLink).toHaveAttribute("href", "https://drive.google.com/uc?export=download&id=drive-offer")
  })

  test("open button is preserved alongside download button with fileLink as href", async ({ page }) => {
    await openFilesTab(page)

    const propertyRow = page
      .getByTestId("panda-properties-form-files-row")
      .filter({ hasText: "floorplan-e2e.pdf" })

    const openLink = propertyRow.getByTestId("panda-properties-form-files-btn--open")
    await expect(openLink).toBeVisible()
    await expect(openLink).toHaveAttribute("href", "https://drive.google.com/file/d/drive-floor/view")
    await expect(openLink).toHaveAttribute("target", "_blank")
  })

  test("delete button is preserved alongside download button", async ({ page }) => {
    await openFilesTab(page)

    const rows = page.getByTestId("panda-properties-form-files-row")
    const firstRow = rows.first()

    const deleteBtn = firstRow.getByTestId("panda-properties-form-files-btn--delete")
    await expect(deleteBtn).toBeVisible()
    await expect(deleteBtn).toBeEnabled()
  })

  test("unsaved (new) property shows save-first placeholder with no download buttons", async ({ page }) => {
    await page.route("**/api/admin/properties**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: [], totalCount: 0, limit: 25, totalPages: 0,
          hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null,
        }),
      })
    })

    await page.goto("/admin/properties")
    await page.getByTestId("admin-entity-list-add-new--properties").click()
    await expect(page.getByTestId("panda-properties-dialog-form")).toBeVisible()
    await page.getByTestId("panda-properties-form-switch--isFavorite").click()
    await page.getByTestId("panda-properties-form-tab-trigger--files").click()

    await expect(page.getByTestId("panda-properties-form-files-tab--save-first")).toBeVisible()
    await expect(page.getByTestId("panda-properties-form-files-btn--download")).toHaveCount(0)
  })
})
