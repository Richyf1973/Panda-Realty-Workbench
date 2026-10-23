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

const PROPERTY_ID = 1001 // matches BASE_PROPERTY.propertyListId

const OWNER_1_NOTE = {
  propertyListNoteId: 101,
  note: "Owner prefers contact by phone",
  createdBy: "agent@example.com",
  createdAt: "2026-05-01T10:00:00Z",
  agentName: null,
}

const OWNER_2_NOTE = {
  propertyListNoteId: 102,
  note: "Owner 2 specific note",
  createdBy: "agent@example.com",
  createdAt: "2026-05-01T11:00:00Z",
  agentName: null,
}

// ---------------------------------------------------------------------------
// Route helpers — must be called AFTER openPropertyEditDialog so that Playwright
// matches these more-specific routes before the catch-all registered there.
// ---------------------------------------------------------------------------

async function stubEmptyNotes(page: import("@playwright/test").Page) {
  await page.route(`**/api/admin/properties/${PROPERTY_ID}/notes**`, async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) })
  })
}

async function stubOwner1Notes(page: import("@playwright/test").Page) {
  await page.route(`**/api/admin/properties/${PROPERTY_ID}/notes**`, async (route) => {
    const url = route.request().url()
    const ownerNum = new URL(url).searchParams.get("ownerNum")
    const notes = ownerNum === "1" ? [OWNER_1_NOTE] : []
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(notes) })
  })
}

async function stubBothOwnerNotes(page: import("@playwright/test").Page) {
  await page.route(`**/api/admin/properties/${PROPERTY_ID}/notes**`, async (route) => {
    const url = route.request().url()
    const ownerNum = new URL(url).searchParams.get("ownerNum")
    const notes =
      ownerNum === "1" ? [OWNER_1_NOTE]
      : ownerNum === "2" ? [OWNER_2_NOTE]
      : []
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(notes) })
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe("Panda Realty — owner notes dialog (form section)", () => {
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

  test("NotebookText notes button is visible for a saved owner with a name", async ({ page }) => {
    await openPropertyEditDialog(page, PROPERTY_ONE_OWNER)
    await stubEmptyNotes(page)

    await expect(page.getByTestId("property-owner-notes--1")).toBeVisible()
  })

  test("StickyNote add-note button is replaced — old testid is gone", async ({ page }) => {
    await openPropertyEditDialog(page, PROPERTY_ONE_OWNER)

    await expect(page.getByTestId("property-owner-add-note--1")).toHaveCount(0)
  })

  // ── Dialog opens + structure ─────────────────────────────────────────────

  test("Clicking notes button opens the owner notes dialog", async ({ page }) => {
    await openPropertyEditDialog(page, PROPERTY_ONE_OWNER)
    await stubEmptyNotes(page)

    await page.getByTestId("property-owner-notes--1").click()
    await expect(page.getByTestId("property-owner-notes-dialog")).toBeVisible()
  })

  test("Dialog title includes owner number and property label", async ({ page }) => {
    await openPropertyEditDialog(page, PROPERTY_ONE_OWNER)
    await stubEmptyNotes(page)

    await page.getByTestId("property-owner-notes--1").click()
    await expect(page.getByTestId("property-owner-notes-dialog-title")).toContainText("Owner 1")
    await expect(page.getByTestId("property-owner-notes-dialog-title")).toContainText("12 Test Street")
  })

  test("Empty state is shown when no notes exist for this owner", async ({ page }) => {
    await openPropertyEditDialog(page, PROPERTY_ONE_OWNER)
    await stubEmptyNotes(page)

    await page.getByTestId("property-owner-notes--1").click()
    await expect(page.getByTestId("property-owner-notes-empty")).toBeVisible()
    await expect(page.getByTestId("property-owner-notes-empty")).toContainText("No notes")
  })

  test("Dialog shows textarea and Add Note submit button", async ({ page }) => {
    await openPropertyEditDialog(page, PROPERTY_ONE_OWNER)
    await stubEmptyNotes(page)

    await page.getByTestId("property-owner-notes--1").click()
    await expect(page.getByTestId("property-owner-notes-textarea")).toBeVisible()
    await expect(page.getByTestId("property-owner-notes-submit")).toBeVisible()
  })

  test("Add Note button is disabled when textarea is empty", async ({ page }) => {
    await openPropertyEditDialog(page, PROPERTY_ONE_OWNER)
    await stubEmptyNotes(page)

    await page.getByTestId("property-owner-notes--1").click()
    await expect(page.getByTestId("property-owner-notes-submit")).toBeDisabled()
  })

  // ── Existing notes render ────────────────────────────────────────────────

  test("Existing owner-1 notes are listed in the dialog", async ({ page }) => {
    await openPropertyEditDialog(page, PROPERTY_ONE_OWNER)
    await stubOwner1Notes(page)

    await page.getByTestId("property-owner-notes--1").click()
    await expect(page.getByTestId("property-owner-notes-empty")).toHaveCount(0)
    await expect(page.getByTestId("property-owner-notes-list")).toContainText(
      "Owner prefers contact by phone",
    )
  })

  // ── Owner isolation ──────────────────────────────────────────────────────

  test("Owner 1 notes do not appear in Owner 2 dialog", async ({ page }) => {
    await openPropertyEditDialog(page, PROPERTY_TWO_OWNERS)
    await stubBothOwnerNotes(page)

    await page.getByTestId("property-owner-notes--2").click()
    await expect(page.getByTestId("property-owner-notes-dialog")).toBeVisible()
    await expect(page.getByTestId("property-owner-notes-list")).not.toContainText(
      "Owner prefers contact by phone",
    )
    await expect(page.getByTestId("property-owner-notes-list")).toContainText("Owner 2 specific note")
  })

  test("Owner 2 dialog shows empty state when Owner 2 has no notes but Owner 1 does", async ({
    page,
  }) => {
    await openPropertyEditDialog(page, PROPERTY_TWO_OWNERS)
    await stubOwner1Notes(page) // owner 2 returns []

    await page.getByTestId("property-owner-notes--2").click()
    await expect(page.getByTestId("property-owner-notes-empty")).toBeVisible()
  })

  // ── Add note flow ────────────────────────────────────────────────────────

  test("Typing a note enables the Add Note button", async ({ page }) => {
    await openPropertyEditDialog(page, PROPERTY_ONE_OWNER)
    await stubEmptyNotes(page)

    await page.getByTestId("property-owner-notes--1").click()
    await page.getByTestId("property-owner-notes-textarea").fill("Call before 10am")
    await expect(page.getByTestId("property-owner-notes-submit")).toBeEnabled()
  })
})
