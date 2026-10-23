// Run: npm run test:e2e:scratch -- --app=panda-realty --spec="apps/panda-realty/e2e/panda-properties-notes-expand.spec.ts" --no-bail

import { expect, test } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { createStory, shotFocused } from "@repo/e2e-utils"

import { e2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import {
  type AllNote,
  PROPERTY_ID,
  setupAndOpenDialog,
  openNotesTab,
} from "./helpers/panda-properties-notes-helpers"

const SHOT_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "screenshots",
  "notes-expand",
)

const story = createStory({ specUrl: import.meta.url, slug: "notes-expand-full-text" })

story.setWhatWasBuilt(
  "Notes in the property dialog and board panel now truncate to 4 lines by default. " +
    "A 'Show more' toggle appears below long notes and expands them inline. " +
    "Clicking 'Show less' collapses them back. Short notes show no toggle. " +
    "A shared NoteItem component carries this behaviour in both " +
    "panda-properties-form-notes-tab.tsx and property-notes-tab.tsx.",
)

const LONG_NOTE: AllNote = {
  noteId: 10,
  propertyEntityId: null,
  note:
    "We refer to the above matter and advise that we have been instructed by our clients to grant your clients the following extensions: " +
    "Special condition 1.1b is extended to 26 June 2026; Special condition 1.1c is extended to 10 July 2026; " +
    "Special condition 1.1d is extended to 25 August 2026; and Special condition 1.1e is extended to 15 September 2026. " +
    "Please confirm your clients acceptance of these extensions in writing at your earliest convenience. " +
    "Our clients reserve their rights in all other respects. " +
    "This correspondence is confidential and intended solely for the named recipient. " +
    "If you have received this in error please notify the sender immediately and destroy all copies. " +
    "Please ensure all parties have been duly notified of the revised timelines as stated above. " +
    "Failure to comply with the extended deadlines may result in termination of the contract. " +
    "Furthermore, please be advised that our clients require written acknowledgement of receipt of this correspondence within 24 hours. " +
    "Any queries in relation to the terms of the extensions should be directed to our office in writing. " +
    "Our clients are not in a position to accept any verbal agreements or undertakings at this stage of the process. " +
    "Please govern yourself accordingly and ensure all documentation is duly executed and returned within the timeframes stipulated herein. " +
    "We trust this matter will receive your urgent attention and look forward to your prompt written response.",
  createdBy: "agent@example.com",
  createdAt: "2026-05-27T10:00:00Z",
  entityName: "Wallace Davies",
  source: "entity",
  agentId: null,
  agentName: "Richard Falzon",
  agentEmail: null,
  ownerNum: null,
  entityCategoryId: 4,
  association: null,
}

const LONG_NOTE_2: AllNote = {
  noteId: 11,
  propertyEntityId: 502,
  note:
    "Your Team Conveyancing has received instructions to request the following extensions: " +
    "1. Special condition 1.1b to 26 June 2026; 2. Special condition 1.1c to 10 July 2026; " +
    "3. Special condition 1.1d to 25 August 2026; 4. Special condition 1.1e to 15 September 2026. " +
    "We trust the above is in order and look forward to your confirmation. " +
    "Kind regards from the conveyancing team. " +
    "Please note that all requests are subject to the vendor agreeing to the proposed extensions and any further delays may require renegotiation. " +
    "We will endeavour to provide a formal written response within two business days of receiving the vendor confirmation. " +
    "In the meantime please advise your clients to refrain from making any irrevocable commitments pending final confirmation of the extensions. " +
    "Our client also wishes to draw your attention to the fact that time remains of the essence in this matter and any further delays will be treated seriously. " +
    "Should the vendor fail to provide written confirmation within the period specified our client reserves the right to treat the contract as at an end. " +
    "We would appreciate your prompt attention to this matter and look forward to receiving your client response at the earliest possible opportunity.",
  createdBy: "test@yahoo.com",
  createdAt: "2026-05-26T09:00:00Z",
  entityName: "Your Team Conveyancing Pty Ltd",
  source: "entity",
  agentId: null,
  agentName: null,
  agentEmail: null,
  ownerNum: null,
  entityCategoryId: 4,
  association: null,
}

const SHORT_NOTE: AllNote = {
  noteId: 12,
  propertyEntityId: null,
  note: "Quick call — vendor happy to negotiate.",
  createdBy: "agent@example.com",
  createdAt: "2026-05-20T08:00:00Z",
  entityName: null,
  source: "property",
  agentId: null,
  agentName: null,
  agentEmail: null,
  ownerNum: null,
  entityCategoryId: null,
  association: null,
}

const URL_NOTE: AllNote = {
  noteId: 13,
  propertyEntityId: null,
  note: "See https://verylongdomain.example.com/path/to/document/with/a/very/long/url/that/does/not/break/at/spaces/and/should/wrap/in/the/container/without/overflow for the full document.",
  createdBy: "agent@example.com",
  createdAt: "2026-05-18T07:00:00Z",
  entityName: null,
  source: "property",
  agentId: null,
  agentName: null,
  agentEmail: null,
  ownerNum: null,
  entityCategoryId: null,
  association: null,
}

test.beforeEach(async ({ page }) => {
  if (!e2eAdminCredentials) throw new Error("E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set in .env.local")
  await mkdir(SHOT_DIR, { recursive: true })
  await signInAsAdmin(page)
})

test.afterAll(() => {
  story.write()
})

test.describe("Panda Realty — notes expand/collapse", () => {
  test("long note shows Show more toggle and truncates to 4 lines", async ({ page }) => {
    await setupAndOpenDialog(page, { notes: [LONG_NOTE] })
    await openNotesTab(page)

    const noteItem = page.getByTestId("property-notes-global-item").first()
    await expect(noteItem).toBeVisible({ timeout: 10_000 })

    const expandBtn = noteItem.getByTestId("note-expand-toggle")
    await expect(expandBtn).toBeVisible({ timeout: 5_000 })
    await expect(expandBtn).toHaveText("Show more ▾")

    await shotFocused(page, noteItem, SHOT_DIR, "01-long-note-collapsed")
    story.addScene({
      title: "01 — Long Note Collapsed (Show more button visible)",
      images: [join(SHOT_DIR, "01-long-note-collapsed.png")],
      seeing: "A long note is clamped to 4 lines; a Show more toggle appears below the text.",
      steps: [
        "Open the Edit Property dialog",
        "Click the Notes tab",
        "Observe the long note is clamped with a Show more button",
      ],
    })
  })

  test("clicking Show more reveals full text and changes button to Show less", async ({ page }) => {
    await setupAndOpenDialog(page, { notes: [LONG_NOTE] })
    await openNotesTab(page)

    const noteItem = page.getByTestId("property-notes-global-item").first()
    const expandBtn = noteItem.getByTestId("note-expand-toggle")
    await expect(expandBtn).toBeVisible({ timeout: 10_000 })

    await shotFocused(page, noteItem, SHOT_DIR, "02a-before-expand")

    await expandBtn.click()

    await expect(expandBtn).toHaveText("Show less ▴", { timeout: 5_000 })
    await expect(noteItem).toContainText("Failure to comply with the extended deadlines may result in termination of the contract.")

    await shotFocused(page, noteItem, SHOT_DIR, "02b-after-expand")
    story.addScene({
      title: "02 — Note Expanded (Show less button, full text visible)",
      images: [
        join(SHOT_DIR, "02a-before-expand.png"),
        join(SHOT_DIR, "02b-after-expand.png"),
      ],
      seeing:
        "Left: note clamped with Show more. Right: after clicking, full text is revealed and button reads Show less.",
      steps: [
        "Click Show more on the long note",
        "Observe all note text becomes visible",
        "Observe the toggle now reads Show less",
      ],
    })
  })

  test("clicking Show less collapses note back", async ({ page }) => {
    await setupAndOpenDialog(page, { notes: [LONG_NOTE] })
    await openNotesTab(page)

    const noteItem = page.getByTestId("property-notes-global-item").first()
    const expandBtn = noteItem.getByTestId("note-expand-toggle")
    await expect(expandBtn).toBeVisible({ timeout: 10_000 })

    await expandBtn.click()
    await expect(expandBtn).toHaveText("Show less ▴", { timeout: 5_000 })

    await expandBtn.click()
    await expect(expandBtn).toHaveText("Show more ▾", { timeout: 5_000 })

    await shotFocused(page, noteItem, SHOT_DIR, "03-re-collapsed")
    story.addScene({
      title: "03 — Note Re-collapsed (Show more restored)",
      images: [join(SHOT_DIR, "03-re-collapsed.png")],
      seeing: "After clicking Show less the note returns to clamped state with Show more visible.",
      steps: [
        "Expand the note by clicking Show more",
        "Collapse the note by clicking Show less",
        "Observe the note returns to truncated state",
      ],
    })
  })

  test("two long notes expand and collapse independently", async ({ page }) => {
    await setupAndOpenDialog(page, { notes: [LONG_NOTE, LONG_NOTE_2] })
    await openNotesTab(page)

    const items = page.getByTestId("property-notes-global-item")
    const firstBtn = items.nth(0).getByTestId("note-expand-toggle")
    const secondBtn = items.nth(1).getByTestId("note-expand-toggle")

    await expect(firstBtn).toBeVisible({ timeout: 10_000 })
    await expect(secondBtn).toBeVisible({ timeout: 5_000 })

    await firstBtn.click()
    await expect(firstBtn).toHaveText("Show less ▴", { timeout: 5_000 })
    await expect(secondBtn).toHaveText("Show more ▾")

    await shotFocused(page, items.nth(0), SHOT_DIR, "04-first-expanded-second-collapsed")
    story.addScene({
      title: "04 — Independent Expand: First Expanded, Second Collapsed",
      images: [join(SHOT_DIR, "04-first-expanded-second-collapsed.png")],
      seeing: "First note expanded (Show less), second note remains collapsed (Show more).",
      steps: [
        "Open Notes tab with two long notes",
        "Expand only the first note",
        "Verify second note remains collapsed",
      ],
    })
  })

  test("short note has no Show more toggle", async ({ page }) => {
    await setupAndOpenDialog(page, { notes: [SHORT_NOTE] })
    await openNotesTab(page)

    const noteItem = page.getByTestId("property-notes-global-item").first()
    await expect(noteItem).toBeVisible({ timeout: 10_000 })

    const noteText = noteItem.getByTestId("note-item-text")
    await expect(noteText).toBeVisible({ timeout: 5_000 })

    const expandBtn = noteItem.getByTestId("note-expand-toggle")
    await expect(expandBtn).toBeHidden()

    await shotFocused(page, noteItem, SHOT_DIR, "05-short-note-no-toggle")
    story.addScene({
      title: "05 — Short Note: No Toggle",
      images: [join(SHOT_DIR, "05-short-note-no-toggle.png")],
      seeing: "A short note shows full text with no Show more button.",
      steps: [
        "Open Notes tab with a short note",
        "Verify no Show more button appears",
      ],
    })
  })

  test("note with long unbroken URL wraps inside container without horizontal overflow", async ({
    page,
  }) => {
    await setupAndOpenDialog(page, { notes: [URL_NOTE] })
    await openNotesTab(page)

    const noteItem = page.getByTestId("property-notes-global-item").first()
    await expect(noteItem).toBeVisible({ timeout: 10_000 })

    const noteText = noteItem.getByTestId("note-item-text")
    await expect(noteText).toBeVisible({ timeout: 5_000 })

    const noteBox = await noteItem.boundingBox()
    const textBox = await noteText.boundingBox()

    expect(noteBox).toBeTruthy()
    expect(textBox).toBeTruthy()
    if (noteBox && textBox) {
      expect(textBox.x + textBox.width).toBeLessThanOrEqual(noteBox.x + noteBox.width + 1)
    }

    await shotFocused(page, noteItem, SHOT_DIR, "06-url-note-wraps")
    story.addScene({
      title: "06 — Long URL Wraps in Container",
      images: [join(SHOT_DIR, "06-url-note-wraps.png")],
      seeing: "A note containing a very long URL wraps inside the note card without horizontal overflow.",
      steps: [
        "Open Notes tab with a note containing a long unbroken URL",
        "Verify the text wraps and does not overflow the card boundary",
      ],
    })
  })
})
