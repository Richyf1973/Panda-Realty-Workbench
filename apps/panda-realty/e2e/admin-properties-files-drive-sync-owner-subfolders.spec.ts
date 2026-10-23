import { expect, test } from "@playwright/test"

import { requirePandaE2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import {
  MOCK_PROPERTY_ID,
  routePandaPropertiesListDetailAndBuyerOffers,
} from "./helpers/panda-properties-dialog-mocks"
import {
  EMPTY_PROPERTY_ENTITIES_RESPONSE,
  STATUS_LIST_RESPONSE,
} from "./helpers/admin-properties-mocks"

// ─── Fixtures ────────────────────────────────────────────────────────────────

/** File from AARON ROSS UREN (owner1) subfolder — correctly labelled after fix. */
const AGGREGATE_FILES_OWNER1_SYNCED = {
  items: [
    {
      kind: "property" as const,
      id: 56,
      propertyListFileId: 56,
      fileName: "Sale Contract.pdf",
      fileType: "application/pdf",
      fileSize: 870506,
      fileLink: "https://drive.google.com/file/d/drive-sale/view",
      googleDriveFileId: "drive-sale",
      source: "google_drive",
      createdAt: "2026-05-06T01:30:00.000Z",
      sourceLabel: "Owner 1",
    },
  ],
}

/** Same Drive file but ownerNum was null at insert — pre-upsert state. */
const AGGREGATE_FILES_OWNER1_PRE_UPSERT = {
  items: [
    {
      kind: "property" as const,
      id: 56,
      propertyListFileId: 56,
      fileName: "Sale Contract.pdf",
      fileType: "application/pdf",
      fileSize: 870506,
      fileLink: "https://drive.google.com/file/d/drive-sale/view",
      googleDriveFileId: "drive-sale",
      source: "google_drive",
      createdAt: "2026-05-06T01:30:00.000Z",
      sourceLabel: "Property", // ownerNum was null
    },
  ],
}

/** Same Drive file after upsert has set ownerNum=1. */
const AGGREGATE_FILES_OWNER1_POST_UPSERT = {
  items: [
    {
      kind: "property" as const,
      id: 56,
      propertyListFileId: 56,
      fileName: "Sale Contract.pdf",
      fileType: "application/pdf",
      fileSize: 870506,
      fileLink: "https://drive.google.com/file/d/drive-sale/view",
      googleDriveFileId: "drive-sale",
      source: "google_drive",
      createdAt: "2026-05-06T01:30:00.000Z",
      sourceLabel: "Owner 1", // ownerNum upserted to 1
    },
  ],
}

/** File from owner2 subfolder. */
const AGGREGATE_FILES_OWNER2_SYNCED = {
  items: [
    {
      kind: "property" as const,
      id: 57,
      propertyListFileId: 57,
      fileName: "Owner2-Doc.pdf",
      fileType: "application/pdf",
      fileSize: 55000,
      fileLink: "https://drive.google.com/file/d/drive-owner2/view",
      googleDriveFileId: "drive-owner2",
      source: "google_drive",
      createdAt: "2026-05-07T00:00:00.000Z",
      sourceLabel: "Owner 2",
    },
  ],
}

/** Subfolder name matches an entity (buyer) — entity label wins over owner. */
const AGGREGATE_FILES_ENTITY_WINS = {
  items: [
    {
      kind: "entity" as const,
      id: 21,
      propertyEntityFileId: 21,
      propertyEntityId: 501,
      fileName: "BuyerDoc.pdf",
      fileType: "application/pdf",
      fileSize: 30000,
      fileLink: "https://drive.google.com/file/d/drive-buyer/view",
      googleDriveFileId: "drive-buyer",
      source: "google_drive",
      createdAt: "2026-05-07T00:00:00.000Z",
      sourceLabel: "Buyer — Aaron Ross Uren",
    },
  ],
}

/** File from unknown subfolder (no entity, no owner match) — source: Property. */
const AGGREGATE_FILES_UNKNOWN_SUBFOLDER = {
  items: [
    {
      kind: "property" as const,
      id: 58,
      propertyListFileId: 58,
      fileName: "Misc-Doc.pdf",
      fileType: "application/pdf",
      fileSize: 20000,
      fileLink: "https://drive.google.com/file/d/drive-misc/view",
      googleDriveFileId: "drive-misc",
      source: "google_drive",
      createdAt: "2026-05-07T00:00:00.000Z",
      sourceLabel: "Property",
    },
  ],
}

const SYNC_1_ADDED = { added: 1, syncedAt: "2026-05-08T02:43:00.000Z" }
const SYNC_0_ADDED = { added: 0, syncedAt: "2026-05-08T02:44:00.000Z" }

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function openFilesTab(page: Parameters<typeof signInAsAdmin>[0]) {
  await page.goto("/admin/properties")
  await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible()
  await page.getByTestId(`admin-entity-row--properties--${MOCK_PROPERTY_ID}`).click()
  await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible()
  await page.getByTestId("panda-properties-form-tab-trigger--files").click()
  await expect(page.getByTestId("panda-properties-form-tab--files-content")).toBeVisible()
}

// ─── Tests ───────────────────────────────────────────────────────────────────

test.describe("Panda Realty — Drive sync: owner subfolder → ownerNum (mocked APIs)", () => {
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

  // MV step 5 — happy path ──────────────────────────────────────────────────
  test("File from owner1 subfolder shows Source: Owner 1 with Drive badge", async ({ page }) => {
    await routePandaPropertiesListDetailAndBuyerOffers(page)
    await page.route("**/api/admin/property-list-files?**", async (route) => {
      if (route.request().method() !== "GET") { await route.continue(); return }
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(AGGREGATE_FILES_OWNER1_SYNCED) })
    })

    await openFilesTab(page)

    const row = page.getByTestId("panda-properties-form-files-row").filter({ hasText: "Sale Contract.pdf" })
    await expect(row.getByTestId("panda-properties-form-files-source")).toContainText("Owner 1")
    await expect(row.getByTestId("panda-properties-form-files-drive-badge")).toBeVisible()
  })

  // MV step 9 — owner 2 ─────────────────────────────────────────────────────
  test("File from owner2 subfolder shows Source: Owner 2 with Drive badge", async ({ page }) => {
    await routePandaPropertiesListDetailAndBuyerOffers(page)
    await page.route("**/api/admin/property-list-files?**", async (route) => {
      if (route.request().method() !== "GET") { await route.continue(); return }
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(AGGREGATE_FILES_OWNER2_SYNCED) })
    })

    await openFilesTab(page)

    const row = page.getByTestId("panda-properties-form-files-row").filter({ hasText: "Owner2-Doc.pdf" })
    await expect(row.getByTestId("panda-properties-form-files-source")).toContainText("Owner 2")
    await expect(row.getByTestId("panda-properties-form-files-drive-badge")).toBeVisible()
  })

  // MV step 8 — upsert retroactive fix ─────────────────────────────────────
  test("Re-sync upserts ownerNum on existing google_drive rows that had ownerNum null", async ({ page }) => {
    await routePandaPropertiesListDetailAndBuyerOffers(page)

    // Gate on whether the sync POST has been called, not on GET call count —
    // multiple GETs can fire during dialog open/tab switch before sync runs.
    let syncPosted = false
    await page.route("**/api/admin/property-list-files/drive-sync**", async (route) => {
      syncPosted = true
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SYNC_0_ADDED) })
    })
    await page.route("**/api/admin/property-list-files?**", async (route) => {
      if (route.request().method() !== "GET") { await route.continue(); return }
      const body = syncPosted ? AGGREGATE_FILES_OWNER1_POST_UPSERT : AGGREGATE_FILES_OWNER1_PRE_UPSERT
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) })
    })

    await openFilesTab(page)

    // Before sync: file shows Source: Property (ownerNum was null)
    const row = page.getByTestId("panda-properties-form-files-row").filter({ hasText: "Sale Contract.pdf" })
    await expect(row.getByTestId("panda-properties-form-files-source")).toContainText("Property")

    // Run sync
    await page.getByTestId("panda-properties-form-files-btn--sync").click()
    await expect(page.getByTestId("panda-properties-form-files-sync-result")).toBeVisible()

    // After sync: same file now shows Source: Owner 1 (upserted)
    await expect(row.getByTestId("panda-properties-form-files-source")).toContainText("Owner 1")
    // No duplicate row created
    await expect(page.getByTestId("panda-properties-form-files-row")).toHaveCount(1)
  })

  // MV step 10 — entity takes priority over owner ───────────────────────────
  test("Entity name wins over owner name when both match the same subfolder", async ({ page }) => {
    await routePandaPropertiesListDetailAndBuyerOffers(page)
    await page.route("**/api/admin/property-list-files?**", async (route) => {
      if (route.request().method() !== "GET") { await route.continue(); return }
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(AGGREGATE_FILES_ENTITY_WINS) })
    })

    await openFilesTab(page)

    const row = page.getByTestId("panda-properties-form-files-row").filter({ hasText: "BuyerDoc.pdf" })
    // Must show entity label, not "Owner 1"
    await expect(row.getByTestId("panda-properties-form-files-source")).toContainText("Buyer — Aaron Ross Uren")
    await expect(row.getByTestId("panda-properties-form-files-source")).not.toContainText("Owner 1")
    await expect(row.getByTestId("panda-properties-form-files-drive-badge")).toBeVisible()
  })

  // MV step 11 — unknown subfolder still syncs as Property ──────────────────
  test("File from unknown subfolder (no entity, no owner match) shows Source: Property", async ({ page }) => {
    await routePandaPropertiesListDetailAndBuyerOffers(page)
    await page.route("**/api/admin/property-list-files?**", async (route) => {
      if (route.request().method() !== "GET") { await route.continue(); return }
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(AGGREGATE_FILES_UNKNOWN_SUBFOLDER) })
    })

    await openFilesTab(page)

    const row = page.getByTestId("panda-properties-form-files-row").filter({ hasText: "Misc-Doc.pdf" })
    await expect(row.getByTestId("panda-properties-form-files-source")).toContainText("Property")
    await expect(row.getByTestId("panda-properties-form-files-source")).not.toContainText("Owner")
  })

  // MV step 13 — property with no owner names: no crash ────────────────────
  test("Sync runs without crash when property has no owner names", async ({ page }) => {
    await routePandaPropertiesListDetailAndBuyerOffers(page)
    await page.route("**/api/admin/property-list-files?**", async (route) => {
      if (route.request().method() !== "GET") { await route.continue(); return }
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [] }) })
    })
    await page.route("**/api/admin/property-list-files/drive-sync**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SYNC_0_ADDED) })
    })

    await openFilesTab(page)
    await page.getByTestId("panda-properties-form-files-btn--sync").click()

    // Must complete without error
    await expect(page.getByTestId("panda-properties-form-files-sync-error")).toHaveCount(0)
    await expect(page.getByTestId("panda-properties-form-files-last-synced")).toBeVisible()
  })

  // MV step 8 — no duplicates after upsert re-sync ──────────────────────────
  test("Re-sync after upsert does not create duplicate rows", async ({ page }) => {
    await routePandaPropertiesListDetailAndBuyerOffers(page)
    await page.route("**/api/admin/property-list-files?**", async (route) => {
      if (route.request().method() !== "GET") { await route.continue(); return }
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(AGGREGATE_FILES_OWNER1_SYNCED) })
    })
    await page.route("**/api/admin/property-list-files/drive-sync**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SYNC_1_ADDED) })
    })

    await openFilesTab(page)
    await page.getByTestId("panda-properties-form-files-btn--sync").click()
    await expect(page.getByTestId("panda-properties-form-files-sync-result")).toBeVisible()

    // Still exactly one row — no duplicate inserted
    await expect(page.getByTestId("panda-properties-form-files-row")).toHaveCount(1)
  })
})
