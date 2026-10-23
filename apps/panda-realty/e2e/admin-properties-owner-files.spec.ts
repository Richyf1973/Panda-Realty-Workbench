import { expect, test } from "@playwright/test"

import { e2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import {
  openPropertyEditDialog,
  PROPERTY_ONE_OWNER,
  PROPERTY_TWO_OWNERS,
  STATUS_LIST_RESPONSE,
  EMPTY_PROPERTY_ENTITIES_RESPONSE,
} from "./helpers/panda-properties-owners-helpers"

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const PROPERTY_ID = 1001

const OWNER_1_FILE = {
  kind: "property",
  id: 501,
  propertyListFileId: 501,
  fileName: "owner1-contract.pdf",
  fileType: "application/pdf",
  fileSize: 245760,
  fileLink: "https://drive.google.com/file/d/abc123/view",
  googleDriveFileId: "abc123",
  createdAt: "2026-05-01T10:00:00Z",
  sourceLabel: "Owner 1",
}

const OWNER_2_FILE = {
  kind: "property",
  id: 502,
  propertyListFileId: 502,
  fileName: "owner2-id.jpg",
  fileType: "image/jpeg",
  fileSize: 1258291,
  fileLink: "https://drive.google.com/file/d/def456/view",
  googleDriveFileId: "def456",
  createdAt: "2026-05-02T10:00:00Z",
  sourceLabel: "Owner 2",
}

// ---------------------------------------------------------------------------
// Route helpers — register AFTER openPropertyEditDialog so Playwright matches
// these more-specific routes before the catch-all registered there.
// ---------------------------------------------------------------------------

async function stubEmptyFiles(page: import("@playwright/test").Page) {
  await page.route(`**/api/admin/properties/${PROPERTY_ID}/owner-files**`, async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [] }) })
  })
}

async function stubOwner1Files(page: import("@playwright/test").Page) {
  await page.route(`**/api/admin/properties/${PROPERTY_ID}/owner-files**`, async (route) => {
    const url = route.request().url()
    const ownerNum = new URL(url).searchParams.get("ownerNum")
    const items = ownerNum === "1" ? [OWNER_1_FILE] : []
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items }) })
  })
}

async function stubBothOwnerFiles(page: import("@playwright/test").Page) {
  await page.route(`**/api/admin/properties/${PROPERTY_ID}/owner-files**`, async (route) => {
    const url = route.request().url()
    const ownerNum = new URL(url).searchParams.get("ownerNum")
    const items =
      ownerNum === "1" ? [OWNER_1_FILE]
      : ownerNum === "2" ? [OWNER_2_FILE]
      : []
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items }) })
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe("Panda Realty — owner files dialog (form section)", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")

    await page.route("**/api/admin/property-status**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(STATUS_LIST_RESPONSE),
      })
    })
    await page.route("**/api/admin/property-entities**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(EMPTY_PROPERTY_ENTITIES_RESPONSE),
      })
    })
    await page.route("**/api/admin/calendar/status**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ connected: false }),
      })
    })

    await signInAsAdmin(page)
  })

  // ── Button visibility ────────────────────────────────────────────────────

  test("Paperclip files button is visible for a saved owner with a name", async ({ page }) => {
    await openPropertyEditDialog(page, PROPERTY_ONE_OWNER)
    await stubEmptyFiles(page)

    await expect(page.getByTestId("property-owner-files--1")).toBeVisible()
  })

  test("Paperclip files button is absent when owner has no name", async ({ page }) => {
    await openPropertyEditDialog(page, PROPERTY_ONE_OWNER)

    // owner2name is null → showOwnerActions is false → no files button for owner 2
    await expect(page.getByTestId("property-owner-files--2")).toHaveCount(0)
  })

  // ── Dialog opens + structure ─────────────────────────────────────────────

  test("Clicking files button opens the owner files dialog", async ({ page }) => {
    await openPropertyEditDialog(page, PROPERTY_ONE_OWNER)
    await stubEmptyFiles(page)

    await page.getByTestId("property-owner-files--1").click()
    await expect(page.getByTestId("property-owner-files-dialog")).toBeVisible()
  })

  test("Dialog title includes owner number and property label", async ({ page }) => {
    await openPropertyEditDialog(page, PROPERTY_ONE_OWNER)
    await stubEmptyFiles(page)

    await page.getByTestId("property-owner-files--1").click()
    await expect(page.getByTestId("property-owner-files-dialog-title")).toContainText("Owner 1")
    await expect(page.getByTestId("property-owner-files-dialog-title")).toContainText("12 Test Street")
  })

  test("Empty state shown when no files exist for this owner", async ({ page }) => {
    await openPropertyEditDialog(page, PROPERTY_ONE_OWNER)
    await stubEmptyFiles(page)

    await page.getByTestId("property-owner-files--1").click()
    await expect(page.getByTestId("property-owner-files-empty")).toBeVisible()
    await expect(page.getByTestId("property-owner-files-empty")).toContainText("No files")
  })

  test("Add files button and Close button are visible in the dialog", async ({ page }) => {
    await openPropertyEditDialog(page, PROPERTY_ONE_OWNER)
    await stubEmptyFiles(page)

    await page.getByTestId("property-owner-files--1").click()
    await expect(page.getByTestId("property-owner-files-btn--add")).toBeVisible()
    await expect(page.getByTestId("property-owner-files-btn--close")).toBeVisible()
  })

  // ── File list renders ────────────────────────────────────────────────────

  test("File count shows number of files", async ({ page }) => {
    await openPropertyEditDialog(page, PROPERTY_ONE_OWNER)
    await stubOwner1Files(page)

    await page.getByTestId("property-owner-files--1").click()
    await expect(page.getByTestId("property-owner-files-count")).toContainText("1 file")
  })

  test("Existing owner-1 files are listed with name and type/size", async ({ page }) => {
    await openPropertyEditDialog(page, PROPERTY_ONE_OWNER)
    await stubOwner1Files(page)

    await page.getByTestId("property-owner-files--1").click()
    await expect(page.getByTestId("property-owner-files-empty")).toHaveCount(0)
    const row = page.getByTestId("property-owner-files-row").first()
    await expect(row).toContainText("owner1-contract.pdf")
    await expect(row).toContainText("application/pdf")
  })

  test("File row shows Source: Owner 1 label", async ({ page }) => {
    await openPropertyEditDialog(page, PROPERTY_ONE_OWNER)
    await stubOwner1Files(page)

    await page.getByTestId("property-owner-files--1").click()
    await expect(page.getByTestId("property-owner-files-source").first()).toContainText("Source: Owner 1")
  })

  test("File row shows open-link button when file has a link", async ({ page }) => {
    await openPropertyEditDialog(page, PROPERTY_ONE_OWNER)
    await stubOwner1Files(page)

    await page.getByTestId("property-owner-files--1").click()
    await expect(page.getByTestId("property-owner-files-row").first().getByRole("link")).toBeVisible()
  })

  // ── Owner isolation ──────────────────────────────────────────────────────

  test("Owner 1 files do not appear in Owner 2 dialog", async ({ page }) => {
    await openPropertyEditDialog(page, PROPERTY_TWO_OWNERS)
    await stubBothOwnerFiles(page)

    await page.getByTestId("property-owner-files--2").click()
    await expect(page.getByTestId("property-owner-files-dialog")).toBeVisible()
    await expect(page.getByTestId("property-owner-files-empty")).toHaveCount(0)
    await expect(page.getByTestId("property-owner-files-row").first()).toContainText("owner2-id.jpg")
    await expect(page.getByTestId("property-owner-files-dialog")).not.toContainText("owner1-contract.pdf")
  })

  test("Owner 2 dialog shows empty state when only Owner 1 has files", async ({ page }) => {
    await openPropertyEditDialog(page, PROPERTY_TWO_OWNERS)
    await stubOwner1Files(page) // owner 2 returns []

    await page.getByTestId("property-owner-files--2").click()
    await expect(page.getByTestId("property-owner-files-empty")).toBeVisible()
  })

  // ── Delete flow ──────────────────────────────────────────────────────────

  test("Delete button opens the confirm dialog", async ({ page }) => {
    await openPropertyEditDialog(page, PROPERTY_ONE_OWNER)
    await stubOwner1Files(page)

    await page.getByTestId("property-owner-files--1").click()
    await page.getByTestId("property-owner-files-btn--delete").first().click()
    await expect(page.getByRole("heading", { name: "Delete file?" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Delete" })).toBeVisible()
  })

  test("Cancelling delete keeps the file row", async ({ page }) => {
    await openPropertyEditDialog(page, PROPERTY_ONE_OWNER)
    await stubOwner1Files(page)

    await page.getByTestId("property-owner-files--1").click()
    await page.getByTestId("property-owner-files-btn--delete").first().click()
    await page.getByRole("button", { name: "Cancel" }).click()
    await expect(page.getByTestId("property-owner-files-row")).toHaveCount(1)
  })

  test("Confirming delete removes the file row", async ({ page }) => {
    await openPropertyEditDialog(page, PROPERTY_ONE_OWNER)
    await stubOwner1Files(page)

    await page.route(`**/api/admin/property-list-files/501**`, async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) })
    })

    await page.getByTestId("property-owner-files--1").click()
    await page.getByTestId("property-owner-files-btn--delete").first().click()
    await page.getByRole("button", { name: "Delete" }).click()
    await expect(page.getByTestId("property-owner-files-row")).toHaveCount(0)
    await expect(page.getByTestId("property-owner-files-empty")).toBeVisible()
  })

  // ── Close ────────────────────────────────────────────────────────────────

  test("Close button dismisses the dialog", async ({ page }) => {
    await openPropertyEditDialog(page, PROPERTY_ONE_OWNER)
    await stubEmptyFiles(page)

    await page.getByTestId("property-owner-files--1").click()
    await expect(page.getByTestId("property-owner-files-dialog")).toBeVisible()
    await page.getByTestId("property-owner-files-btn--close").click()
    await expect(page.getByTestId("property-owner-files-dialog")).not.toBeVisible()
  })
})
