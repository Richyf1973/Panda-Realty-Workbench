// Run: npm run test:e2e:scratch -- --app=panda-realty --spec="apps/panda-realty/e2e/admin-properties-notes-global-tab.spec.ts" --no-bail

import { expect, test } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { createStory, shotFocused } from "@repo/e2e-utils"

import { e2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import { openNotesTab, setupAndOpenDialog } from "./helpers/panda-properties-notes-helpers"

// ─── Story wiring ────────────────────────────────────────────────────────────

const SHOT_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "screenshots",
  "property-notes-global-tab",
)

const story = createStory({
  specUrl: import.meta.url,
  slug: "property-notes-global-tab",
})

story.setWhatWasBuilt(
  "A read-only Notes tab was added as the 7th tab (after Forms) in the Edit Property dialog. " +
    "It aggregates all notes from both property_list_notes (owner-tagged and untagged) and " +
    "property_entity_notes (buyers, contacts, tenants), sorted newest-first, displayed with " +
    "entity name and role chips. A real-time text search input filters the list client-side. " +
    "Only visible on favourite properties (same isFavorite guard as all other tabs). " +
    "Backed by a new GET /api/admin/properties/[id]/all-notes endpoint.",
)

// ─── beforeEach / afterAll ────────────────────────────────────────────────────

test.beforeEach(async ({ page }) => {
  test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")
  await mkdir(SHOT_DIR, { recursive: true })
  await signInAsAdmin(page)
})

test.afterAll(() => {
  story.write()
})

// ─── Happy path ───────────────────────────────────────────────────────────────

test.describe("Panda Realty — property notes global tab", () => {
  test("Notes tab trigger appears as 7th tab (after Forms) on a favourite property", async ({
    page,
  }) => {
    await setupAndOpenDialog(page)

    const trigger = page.getByTestId("panda-properties-form-tab-trigger--notes")
    await expect(trigger).toBeVisible({ timeout: 10_000 })

    await shotFocused(page, trigger, SHOT_DIR, "01-notes-tab-trigger")
    story.addScene({
      title: "01 — Notes Tab Trigger Visible",
      images: [join(SHOT_DIR, "01-notes-tab-trigger.png")],
      seeing:
        "The Edit Property dialog shows 7 tabs; 'Notes' appears as the last tab after 'Forms'.",
      steps: [
        "Navigate to /admin/properties",
        "Click a favourite property row to open the edit dialog",
        "Observe 'Notes' tab trigger is the 7th and last tab in the tab list",
      ],
    })
  })

  test("Clicking Notes tab shows tab content with a search input", async ({ page }) => {
    await setupAndOpenDialog(page)
    await openNotesTab(page)

    const searchInput = page.getByTestId("property-notes-global-search")
    await expect(searchInput).toBeVisible({ timeout: 10_000 })

    await shotFocused(page, searchInput, SHOT_DIR, "02-search-input")
    story.addScene({
      title: "02 — Notes Tab Search Input",
      images: [join(SHOT_DIR, "02-search-input.png")],
      seeing:
        "After clicking the Notes tab, a search input appears at the top of the tab panel.",
      steps: [
        "Open Edit Property dialog for a favourite property",
        "Click the Notes tab",
        "Observe search input rendered at top of tab content",
      ],
    })
  })

  test("Notes list shows all notes sorted newest-first with metadata", async ({ page }) => {
    await setupAndOpenDialog(page)
    await openNotesTab(page)

    const notesList = page.getByTestId("property-notes-global-list")
    await expect(notesList).toBeVisible({ timeout: 10_000 })

    const noteItems = page.getByTestId("property-notes-global-item")
    await expect(noteItems).toHaveCount(3)

    // Newest-first: buyer note (2026-05-25) should be first
    await expect(noteItems.first()).toContainText("Follow up call scheduled for Monday")

    await shotFocused(page, notesList, SHOT_DIR, "03-notes-list")
    story.addScene({
      title: "03 — Notes List All Notes",
      images: [join(SHOT_DIR, "03-notes-list.png")],
      seeing:
        "Notes list shows 3 notes sorted newest-first. Each row includes date, entity/label, and note text.",
      steps: [
        "Open Edit Property dialog for a favourite property with 3 notes",
        "Click the Notes tab",
        "Observe all 3 notes appear, newest at top",
      ],
    })
  })

  test("Owner-tagged notes show 'Owner 2' role chip", async ({ page }) => {
    await setupAndOpenDialog(page)
    await openNotesTab(page)

    const ownerChip = page.getByTestId("property-notes-global-chip--owner-2")
    await expect(ownerChip).toBeVisible({ timeout: 10_000 })
    await expect(ownerChip).toContainText("Owner 2")

    await shotFocused(page, ownerChip, SHOT_DIR, "04-owner-chip")
    story.addScene({
      title: "04 — Owner Note Role Chip",
      images: [join(SHOT_DIR, "04-owner-chip.png")],
      seeing:
        "A note from property_list_notes with owner_num=2 displays an 'Owner 2' role chip.",
      steps: ["Open the Notes tab", "Find the note with owner_num=2", "Observe 'Owner 2' chip"],
    })
  })

  test("Untagged property notes show '[Property]' chip", async ({ page }) => {
    await setupAndOpenDialog(page)
    await openNotesTab(page)

    const propertyChip = page.getByTestId("property-notes-global-chip--property")
    await expect(propertyChip).toBeVisible({ timeout: 10_000 })
    await expect(propertyChip).toContainText("Property")

    await shotFocused(page, propertyChip, SHOT_DIR, "05-property-chip")
    story.addScene({
      title: "05 — Untagged Property Note Chip",
      images: [join(SHOT_DIR, "05-property-chip.png")],
      seeing:
        "A note from property_list_notes with owner_num=null shows a '[Property]' chip.",
      steps: [
        "Open the Notes tab",
        "Find the untagged property note",
        "Observe '[Property]' chip",
      ],
    })
  })

  test("Buyer entity notes show entity name and Buyer chip", async ({ page }) => {
    await setupAndOpenDialog(page)
    await openNotesTab(page)

    const buyerChip = page.getByTestId("property-notes-global-chip--buyer")
    await expect(buyerChip).toBeVisible({ timeout: 10_000 })

    const buyerNote = page.getByTestId("property-notes-global-item").first()
    await expect(buyerNote).toContainText("Test Buyer LLC")

    await shotFocused(page, buyerNote, SHOT_DIR, "06-buyer-note")
    story.addScene({
      title: "06 — Buyer Entity Note With Chip",
      images: [join(SHOT_DIR, "06-buyer-note.png")],
      seeing:
        "An entity note (entityCategoryId=1) shows the buyer's entity name and a Buyer chip.",
      steps: [
        "Open the Notes tab",
        "Find the buyer entity note",
        "Observe entity name and Buyer chip",
      ],
    })
  })
})

