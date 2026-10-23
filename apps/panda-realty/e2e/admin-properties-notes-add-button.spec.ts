// Run: npm run test:e2e:scratch -- --app=panda-realty --spec="apps/panda-realty/e2e/admin-properties-notes-add-button.spec.ts" --no-bail

import { expect, test } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { createStory, shotFocused } from "@repo/e2e-utils"

import { e2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import {
  ALL_NOTES,
  BUYER_NOTE,
  PROPERTY_ID,
  openNotesTab,
  setupAndOpenDialog,
  type AllNote,
} from "./helpers/panda-properties-notes-helpers"

// ─── Story wiring ─────────────────────────────────────────────────────────────

const SHOT_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "screenshots",
  "property-notes-add-button",
)

const story = createStory({
  specUrl: import.meta.url,
  slug: "property-notes-add-button",
})

story.setWhatWasBuilt(
  "An '+ Add Note' button was added inline right of the search bar in the Notes tab of the " +
    "Edit Property dialog. Clicking it opens a single dialog with an entity picker (Property " +
    "(general) + all linked buyers/sellers/tenants/contacts grouped by category), a note " +
    "textarea, an optional agent picker, and Cancel / Add Note buttons. Submitting an entity " +
    "note POSTs to /api/admin/property-entity-notes; a property-level note POSTs to " +
    "/api/admin/properties/[id]/notes. On success the dialog auto-closes and the notes list " +
    "refreshes. New endpoints: GET /api/admin/properties/[id]/entities and POST " +
    "/api/admin/properties/[id]/notes.",
)

// ─── Fixtures ────────────────────────────────────────────────────────────────

const ENTITIES_WITH_BUYER = {
  items: [
    { propertyEntityId: 501, entityName: "Test Buyer LLC", entityCategoryId: 1 },
    { propertyEntityId: 502, entityName: "Jane Seller", entityCategoryId: 2 },
    { propertyEntityId: 503, entityName: "Sam Tenant", entityCategoryId: 3 },
    { propertyEntityId: 504, entityName: "Dan Contact", entityCategoryId: 4 },
  ],
}

const ENTITIES_EMPTY = { items: [] }

const NEW_ENTITY_NOTE: AllNote = {
  noteId: 99,
  propertyEntityId: 501,
  note: "New buyer note from dialog",
  createdBy: "jet_pradas@yahoo.com",
  createdAt: "2026-05-26T12:00:00Z",
  entityName: "Test Buyer LLC",
  source: "entity",
  agentId: null,
  agentName: null,
  agentEmail: null,
  ownerNum: null,
  entityCategoryId: 1,
  association: null,
}

const NEW_PROPERTY_NOTE: AllNote = {
  noteId: 100,
  propertyEntityId: null,
  note: "General property note from dialog",
  createdBy: "jet_pradas@yahoo.com",
  createdAt: "2026-05-26T12:01:00Z",
  entityName: null,
  source: "property",
  agentId: null,
  agentName: null,
  agentEmail: null,
  ownerNum: null,
  entityCategoryId: null,
  association: null,
}

// ─── Setup helpers ────────────────────────────────────────────────────────────

async function setupWithEntities(
  page: import("@playwright/test").Page,
  opts: {
    entities?: typeof ENTITIES_WITH_BUYER
    notes?: AllNote[]
  } = {},
) {
  const entities = opts.entities ?? ENTITIES_WITH_BUYER
  const notes = opts.notes ?? ALL_NOTES

  await setupAndOpenDialog(page, { notes })

  await page.route(`**/api/admin/properties/${PROPERTY_ID}/entities**`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(entities),
    })
  })
}

// ─── beforeEach / afterAll ────────────────────────────────────────────────────

test.beforeEach(async ({ page }) => {
  test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")
  await mkdir(SHOT_DIR, { recursive: true })
  await signInAsAdmin(page)
})

test.afterAll(() => {
  story.write()
})

// ─── Happy Path ───────────────────────────────────────────────────────────────

test.describe("Panda Realty — property notes add button", () => {
  test("Add Note button appears inline right of search bar in Notes tab", async ({ page }) => {
    await setupWithEntities(page)
    await openNotesTab(page)

    const searchInput = page.getByTestId("property-notes-global-search")
    await expect(searchInput).toBeVisible({ timeout: 10_000 })

    const addBtn = page.getByTestId("property-notes-global-add-btn")
    await expect(addBtn).toBeVisible({ timeout: 10_000 })

    await shotFocused(page, addBtn, SHOT_DIR, "01-add-note-button")
    story.addScene({
      title: "01 — Add Note Button Visible Inline with Search Bar",
      images: [join(SHOT_DIR, "01-add-note-button.png")],
      seeing:
        "The Notes tab shows the search bar and '+ Add Note' button on the same row, button to the right.",
      steps: [
        "Open Edit Property dialog for a favourite property",
        "Click the Notes tab",
        "Observe '+ Add Note' button on the right of the search bar row",
      ],
    })
  })

  test("Clicking Add Note opens dialog with entity picker, textarea, agent picker and action buttons", async ({
    page,
  }) => {
    await setupWithEntities(page)
    await openNotesTab(page)

    await page.getByTestId("property-notes-global-add-btn").click()

    const dialog = page.getByTestId("property-notes-add-dialog")
    await expect(dialog).toBeVisible({ timeout: 10_000 })

    await expect(page.getByTestId("property-notes-add-entity-trigger")).toBeVisible()
    await expect(page.getByTestId("property-notes-add-textarea")).toBeVisible()
    await expect(page.getByTestId("property-notes-add-submit")).toBeVisible()
    await expect(dialog.getByRole("button", { name: /cancel/i })).toBeVisible()

    await shotFocused(page, dialog, SHOT_DIR, "02-add-note-dialog")
    story.addScene({
      title: "02 — Add Note Dialog Opens",
      images: [join(SHOT_DIR, "02-add-note-dialog.png")],
      seeing:
        "Clicking '+ Add Note' opens a dialog with entity combobox, note textarea, agent picker, Cancel and Add Note buttons.",
      steps: [
        "Open Notes tab",
        "Click '+ Add Note'",
        "Observe dialog with entity picker, textarea, and action buttons",
      ],
    })
  })

  test("Entity picker lists Property (general) first then all 4-category entities grouped", async ({
    page,
  }) => {
    await setupWithEntities(page)
    await openNotesTab(page)
    await page.getByTestId("property-notes-global-add-btn").click()
    await expect(page.getByTestId("property-notes-add-dialog")).toBeVisible({ timeout: 10_000 })

    // Open the entity dropdown
    await page.getByTestId("property-notes-add-entity-trigger").click()

    const dropdown = page.getByTestId("property-notes-add-entity-dropdown")
    await expect(dropdown).toBeVisible({ timeout: 5_000 })

    // "Property (general)" must be first option
    await expect(dropdown.getByTestId("property-notes-add-entity-option--property")).toBeVisible()

    // All 4 entity categories must appear
    await expect(dropdown.getByTestId("property-notes-add-entity-option--501")).toBeVisible()
    await expect(dropdown.getByTestId("property-notes-add-entity-option--502")).toBeVisible()
    await expect(dropdown.getByTestId("property-notes-add-entity-option--503")).toBeVisible()
    await expect(dropdown.getByTestId("property-notes-add-entity-option--504")).toBeVisible()

    await shotFocused(page, dropdown, SHOT_DIR, "03-entity-picker-open")
    story.addScene({
      title: "03 — Entity Picker Lists All Options",
      images: [join(SHOT_DIR, "03-entity-picker-open.png")],
      seeing:
        "Entity picker shows 'Property (general)' at top, followed by all 4 linked entities across buyer/seller/tenant/contact categories.",
      steps: [
        "Open Add Note dialog",
        "Click the entity picker trigger",
        "Observe all options listed with correct grouping",
      ],
    })
  })

  test("Adding an entity note: select buyer, type note, submit → dialog closes, note appears with Buyer chip", async ({
    page,
  }) => {
    const updatedNotes = [NEW_ENTITY_NOTE, ...ALL_NOTES]

    await setupWithEntities(page, { notes: ALL_NOTES })
    await openNotesTab(page)

    // Override all-notes to return updated list after POST
    let postCalled = false
    await page.route(`**/api/admin/property-entity-notes**`, async (route) => {
      if (route.request().method() === "POST") {
        postCalled = true
        await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ success: true }) })
      } else {
        await route.continue()
      }
    })
    await page.route(`**/api/admin/properties/${PROPERTY_ID}/all-notes**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(postCalled ? updatedNotes : ALL_NOTES),
      })
    })

    await page.getByTestId("property-notes-global-add-btn").click()
    await expect(page.getByTestId("property-notes-add-dialog")).toBeVisible({ timeout: 10_000 })

    // Select buyer entity
    await page.getByTestId("property-notes-add-entity-trigger").click()
    await page.getByTestId("property-notes-add-entity-option--501").click()

    // Type the note
    await page.getByTestId("property-notes-add-textarea").fill("New buyer note from dialog")

    const submitBtn = page.getByTestId("property-notes-add-submit")
    await expect(submitBtn).toBeEnabled()

    await shotFocused(page, page.getByTestId("property-notes-add-dialog"), SHOT_DIR, "04a-before-submit")

    await submitBtn.click()

    // Dialog should close
    await expect(page.getByTestId("property-notes-add-dialog")).not.toBeVisible({ timeout: 10_000 })

    // New note should appear in list
    const notesList = page.getByTestId("property-notes-global-list")
    await expect(notesList).toBeVisible({ timeout: 10_000 })
    await expect(page.getByTestId("property-notes-global-chip--buyer").first()).toBeVisible()
    await expect(notesList).toContainText("New buyer note from dialog")

    await shotFocused(page, notesList, SHOT_DIR, "04b-after-submit-entity-note")
    story.addScene({
      title: "04 — Adding Entity Note: Before and After",
      images: [join(SHOT_DIR, "04a-before-submit.png"), join(SHOT_DIR, "04b-after-submit-entity-note.png")],
      seeing:
        "Left: dialog with buyer selected, note typed, Add Note enabled. Right: dialog closed, new note with Buyer chip at top of list.",
      steps: [
        "Click '+ Add Note'",
        "Select 'Test Buyer LLC' from picker",
        "Type 'New buyer note from dialog'",
        "Click Add Note",
        "Observe dialog closes and new note appears with Buyer chip",
      ],
    })
  })

  test("Adding a property-level note: select Property (general), submit → note appears with Property chip", async ({
    page,
  }) => {
    const updatedNotes = [NEW_PROPERTY_NOTE, ...ALL_NOTES]

    await setupWithEntities(page, { notes: ALL_NOTES })
    await openNotesTab(page)

    let postCalled = false
    await page.route(`**/api/admin/properties/${PROPERTY_ID}/notes**`, async (route) => {
      if (route.request().method() === "POST") {
        postCalled = true
        await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ success: true }) })
      } else {
        await route.continue()
      }
    })
    await page.route(`**/api/admin/properties/${PROPERTY_ID}/all-notes**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(postCalled ? updatedNotes : ALL_NOTES),
      })
    })

    await page.getByTestId("property-notes-global-add-btn").click()
    await expect(page.getByTestId("property-notes-add-dialog")).toBeVisible({ timeout: 10_000 })

    await page.getByTestId("property-notes-add-entity-trigger").click()
    await page.getByTestId("property-notes-add-entity-option--property").click()
    await page.getByTestId("property-notes-add-textarea").fill("General property note from dialog")
    await page.getByTestId("property-notes-add-submit").click()

    await expect(page.getByTestId("property-notes-add-dialog")).not.toBeVisible({ timeout: 10_000 })

    const notesList = page.getByTestId("property-notes-global-list")
    await expect(notesList).toContainText("General property note from dialog")
    await expect(page.getByTestId("property-notes-global-chip--property").first()).toBeVisible()

    await shotFocused(page, notesList, SHOT_DIR, "05-property-level-note")
    story.addScene({
      title: "05 — Property-Level Note Added",
      images: [join(SHOT_DIR, "05-property-level-note.png")],
      seeing:
        "After selecting 'Property (general)' and submitting, a new note appears with the 'Property' chip at the top.",
      steps: [
        "Open Add Note dialog",
        "Select 'Property (general)'",
        "Type note text",
        "Submit and observe Property chip on new note",
      ],
    })
  })
})

// ─── Edge Cases ───────────────────────────────────────────────────────────────

test.describe("Panda Realty — add note button edge cases", () => {
  test("Add Note button is disabled while no entity is selected", async ({ page }) => {
    await setupWithEntities(page)
    await openNotesTab(page)
    await page.getByTestId("property-notes-global-add-btn").click()
    await expect(page.getByTestId("property-notes-add-dialog")).toBeVisible({ timeout: 10_000 })

    await page.getByTestId("property-notes-add-textarea").fill("Some note text")
    // No entity selected yet
    await expect(page.getByTestId("property-notes-add-submit")).toBeDisabled()
  })

  test("Add Note button is disabled when note textarea is empty", async ({ page }) => {
    await setupWithEntities(page)
    await openNotesTab(page)
    await page.getByTestId("property-notes-global-add-btn").click()
    await expect(page.getByTestId("property-notes-add-dialog")).toBeVisible({ timeout: 10_000 })

    // Select entity but leave textarea empty
    await page.getByTestId("property-notes-add-entity-trigger").click()
    await page.getByTestId("property-notes-add-entity-option--property").click()
    await expect(page.getByTestId("property-notes-add-submit")).toBeDisabled()
  })

  test("Property with no linked entities shows only Property (general) in picker", async ({ page }) => {
    await setupWithEntities(page, { entities: ENTITIES_EMPTY })
    await openNotesTab(page)
    await page.getByTestId("property-notes-global-add-btn").click()
    await expect(page.getByTestId("property-notes-add-dialog")).toBeVisible({ timeout: 10_000 })

    await page.getByTestId("property-notes-add-entity-trigger").click()

    const dropdown = page.getByTestId("property-notes-add-entity-dropdown")
    await expect(dropdown).toBeVisible({ timeout: 5_000 })
    await expect(dropdown.getByTestId("property-notes-add-entity-option--property")).toBeVisible()
    // No entity options should be present
    await expect(dropdown.getByTestId("property-notes-add-entity-option--501")).not.toBeVisible()

    await shotFocused(page, dropdown, SHOT_DIR, "06-empty-entities-picker")
    story.addScene({
      title: "06 — Entity Picker with No Linked Entities",
      images: [join(SHOT_DIR, "06-empty-entities-picker.png")],
      seeing: "When the property has no linked entities, the picker shows only 'Property (general)'.",
      steps: [
        "Open Add Note on a property with no entities",
        "Click entity picker",
        "Observe only 'Property (general)' is shown",
      ],
    })
  })

  test("Ctrl+Enter in textarea submits the note", async ({ page }) => {
    await setupWithEntities(page)
    await openNotesTab(page)

    await page.route(`**/api/admin/property-entity-notes**`, async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ success: true }) })
      } else {
        await route.continue()
      }
    })

    await page.getByTestId("property-notes-global-add-btn").click()
    await expect(page.getByTestId("property-notes-add-dialog")).toBeVisible({ timeout: 10_000 })

    await page.getByTestId("property-notes-add-entity-trigger").click()
    await page.getByTestId("property-notes-add-entity-option--501").click()

    const textarea = page.getByTestId("property-notes-add-textarea")
    await textarea.fill("Keyboard shortcut note")
    await textarea.press("Control+Enter")

    await expect(page.getByTestId("property-notes-add-dialog")).not.toBeVisible({ timeout: 10_000 })
  })
})

// ─── Error States ─────────────────────────────────────────────────────────────

test.describe("Panda Realty — add note button error states", () => {
  test("Network error on POST shows inline error, dialog stays open", async ({ page }) => {
    await setupWithEntities(page)
    await openNotesTab(page)

    await page.route(`**/api/admin/property-entity-notes**`, async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "Internal Server Error" }) })
      } else {
        await route.continue()
      }
    })

    await page.getByTestId("property-notes-global-add-btn").click()
    await expect(page.getByTestId("property-notes-add-dialog")).toBeVisible({ timeout: 10_000 })

    await page.getByTestId("property-notes-add-entity-trigger").click()
    await page.getByTestId("property-notes-add-entity-option--501").click()
    await page.getByTestId("property-notes-add-textarea").fill("Note that will fail")
    await page.getByTestId("property-notes-add-submit").click()

    // Dialog stays open
    await expect(page.getByTestId("property-notes-add-dialog")).toBeVisible({ timeout: 10_000 })

    // Error message shown
    const errorMsg = page.getByTestId("property-notes-add-error")
    await expect(errorMsg).toBeVisible({ timeout: 5_000 })

    await shotFocused(page, errorMsg, SHOT_DIR, "07-submit-error")
    story.addScene({
      title: "07 — Submit Error State",
      images: [join(SHOT_DIR, "07-submit-error.png")],
      seeing: "When POST fails with 500, the dialog stays open and an inline error message appears.",
      steps: [
        "Open Add Note dialog, fill in entity and note",
        "Click Add Note (mocked to return 500)",
        "Observe error message appears and dialog remains open",
      ],
    })
  })
})
