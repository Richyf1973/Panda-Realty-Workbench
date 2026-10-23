// Run: npm run test:e2e:scratch -- --app=panda-realty --spec="apps/panda-realty/e2e/admin-properties-forms-send-history-edit.spec.ts" --no-bail

import { expect, test } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { createStory, shotFocused } from "@repo/e2e-utils"

import { requirePandaE2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import {
  FORMS_LIST_FORM6,
  FORMS_LIST_NO_PREFILL,
  PREFILL_DATA_FULL,
  SEND_HISTORY_EMPTY,
  setupCommonRoutes,
  openFormsTab,
  openForm6SendDialog,
  routeTemplateGet,
  TEMPLATE_RESPONSE_EMPTY,
} from "./helpers/panda-form6-send-mocks"

const SHOT_DIR = join(dirname(fileURLToPath(import.meta.url)), "screenshots", "forms-send-history-edit")

const story = createStory({ specUrl: import.meta.url, slug: "forms-send-history-edit" })

story.setWhatWasBuilt(
  "Forms Send History: (1) fixes the Save-to-Drive history refresh bug so the history list updates " +
  "immediately without closing the dialog; (2) persists prefill_values in property_form_sends so history " +
  "entries can be re-edited; (3) adds Edit + Send buttons to each history row; (4) adds a View-in-Drive " +
  "link; (5) hides Edit on rows with no saved values with a subtle UX note.",
)

test.beforeEach(async () => {
  await mkdir(SHOT_DIR, { recursive: true })
})

test.afterAll(() => {
  story.write()
})

// ─── History mock fixtures ────────────────────────────────────────────────────

const HISTORY_ROW_WITH_VALUES = {
  items: [{
    propertyFormSendId: 101,
    propertyFormId: 3,
    formName: "Form 6",
    recipientEmail: "john@example.com",
    recipientName: "John Smith",
    driveFileLink: "https://drive.google.com/view?id=filled_form6_v1",
    sentAt: "2026-05-21T01:32:12.000Z",
    prefillValues: { seller1Name: "John Smith", commission: "3.3%" },
    prefillStrategy: "form-6",
  }],
}

const HISTORY_ROW_NO_SAVED_VALUES = {
  items: [{
    propertyFormSendId: 102,
    propertyFormId: 3,
    formName: "Form 6",
    recipientEmail: null,
    recipientName: null,
    driveFileLink: "https://drive.google.com/view?id=old_form6",
    sentAt: "2026-05-20T08:50:00.000Z",
    prefillValues: null,
    prefillStrategy: "form-6",
  }],
}

const HISTORY_ROW_NO_PREFILL_STRATEGY = {
  items: [{
    propertyFormSendId: 103,
    propertyFormId: 2,
    formName: "Generic Form",
    recipientEmail: "client@example.com",
    recipientName: "Some Client",
    driveFileLink: "https://drive.google.com/view?id=generic456",
    sentAt: "2026-05-19T10:00:00.000Z",
    prefillValues: null,
    prefillStrategy: null,
  }],
}

// ─── Setup helpers ────────────────────────────────────────────────────────────

async function setupWithHistory(page: Parameters<typeof setupCommonRoutes>[0], historyData: unknown, formsData: unknown = FORMS_LIST_FORM6) {
  // setupCommonRoutes first — then history override registered last wins (Playwright LIFO routing)
  await setupCommonRoutes(page, formsData)

  await page.route("**/api/admin/property-forms/prefill-data**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(PREFILL_DATA_FULL) })
  })
  await page.route("**/api/admin/properties/1001/buyers**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [] }) })
  })
  await page.route("**/api/admin/properties/1001/contacts**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [] }) })
  })
  await page.route("**/api/admin/properties/1001/tenants**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [] }) })
  })

  // Override the property-form-sends route — registered last so it takes priority
  await page.route("**/api/admin/property-form-sends**", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(historyData) })
      return
    }
    await route.continue()
  })
}

// ─── Happy path tests ─────────────────────────────────────────────────────────

test.describe("Forms Send History — Save-to-Drive refresh", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaE2eAdminCredentials()
    await routeTemplateGet(page, TEMPLATE_RESPONSE_EMPTY)
    await setupWithHistory(page, SEND_HISTORY_EMPTY)
    await signInAsAdmin(page)
  })

  test("history list refreshes after Save to Drive without closing the dialog", async ({ page }) => {
    // Flag flips to true once the save-to-drive POST completes.
    // History GETs before the POST return empty; GETs after return the new row.
    let saveDone = false
    await page.route("**/api/admin/property-form-sends**", async (route) => {
      if (route.request().method() !== "GET") { await route.continue(); return }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(saveDone ? HISTORY_ROW_WITH_VALUES : SEND_HISTORY_EMPTY),
      })
    })

    await page.route("**/api/admin/property-forms/send**", async (route) => {
      if (route.request().method() !== "POST") { await route.fallback(); return }
      saveDone = true
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ driveFileLink: "https://drive.google.com/view?id=filled_form6_v1", driveFileName: "Form 6 [prefilled 2026-05-27].pdf" }),
      })
    })

    await openForm6SendDialog(page)
    await page.getByTestId("property-form-prefill-next").click()
    // "Save to Drive" button visible confirms we're on the send step
    await expect(page.getByTestId("property-form-send-save-to-drive")).toBeVisible({ timeout: 10_000 })

    await page.getByTestId("property-form-send-save-to-drive").click()
    // Wait for drive link to appear (upload complete)
    await expect(page.getByTestId("property-form-send-drive-link")).toBeVisible({ timeout: 15_000 })

    // Dialog must remain open (no auto-close on save-to-drive)
    await expect(page.getByTestId("property-form-send-dialog")).toBeVisible()

    // Key assertion: history row appears while dialog is still open.
    // Currently fails because handleSaveToDrive() never calls onSent().
    const historyRow = page.getByTestId("property-forms-history-row--101")
    await expect(historyRow).toBeVisible({ timeout: 10_000 })

    await shotFocused(page, historyRow, SHOT_DIR, "01-history-refreshed-after-save-to-drive")
    story.addScene({
      title: "01 — Save to Drive: History Refreshes Without Closing Dialog",
      images: [join(SHOT_DIR, "01-history-refreshed-after-save-to-drive.png")],
      seeing: "The Send History section shows a new row for Form 6 immediately after Save to Drive, while the send dialog is still open.",
      steps: [
        "Open Form 6 fill dialog",
        "Proceed to Step 2",
        "Click Save to Drive",
        "Observe the history list updates without closing the dialog",
      ],
    })
  })
})

test.describe("Forms Send History — row UI (Edit / Send / View in Drive)", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaE2eAdminCredentials()
    await routeTemplateGet(page, TEMPLATE_RESPONSE_EMPTY)
    await signInAsAdmin(page)
  })

  test("history row with prefillValues shows Edit button, Send button, and View in Drive link", async ({ page }) => {
    await setupWithHistory(page, HISTORY_ROW_WITH_VALUES)
    await openFormsTab(page)

    const row = page.getByTestId("property-forms-history-row--101")
    await expect(row).toBeVisible({ timeout: 10_000 })

    const editBtn = page.getByTestId("property-forms-history-edit--101")
    const sendBtn = page.getByTestId("property-forms-history-send--101")
    const viewLink = page.getByTestId("property-forms-history-view-link--101")

    await expect(editBtn).toBeVisible()
    await expect(sendBtn).toBeVisible()
    await expect(viewLink).toBeVisible()
    await expect(viewLink).toHaveAttribute("href", "https://drive.google.com/view?id=filled_form6_v1")

    await shotFocused(page, row, SHOT_DIR, "02-history-row-with-all-buttons")
    story.addScene({
      title: "02 — History Row: Edit, Send, and View in Drive Buttons",
      images: [join(SHOT_DIR, "02-history-row-with-all-buttons.png")],
      seeing: "History row for Form 6 shows Edit (pencil), Send (arrow), and View in Drive link.",
      steps: ["Open property Forms tab", "Observe the history row for Form 6 with saved prefill values"],
    })
  })

  test("history row with prefillValues=null hides Edit button and shows no-values note", async ({ page }) => {
    await setupWithHistory(page, HISTORY_ROW_NO_SAVED_VALUES)
    await openFormsTab(page)

    const row = page.getByTestId("property-forms-history-row--102")
    await expect(row).toBeVisible({ timeout: 10_000 })

    await expect(page.getByTestId("property-forms-history-edit--102")).not.toBeVisible()
    const note = page.getByTestId("property-forms-history-no-values-note--102")
    await expect(note).toBeVisible()

    await shotFocused(page, row, SHOT_DIR, "03-history-row-no-values-note")
    story.addScene({
      title: "03 — History Row: No Saved Values Note",
      images: [join(SHOT_DIR, "03-history-row-no-values-note.png")],
      seeing: "History row has no Edit button; a subtle note explains no values were saved for this entry.",
      steps: ["Open property Forms tab", "Observe the history row for an old entry with no prefill_values saved"],
    })
  })

  test("history row for no-prefill-strategy form hides Edit button and shows no note", async ({ page }) => {
    await setupWithHistory(page, HISTORY_ROW_NO_PREFILL_STRATEGY, FORMS_LIST_NO_PREFILL)
    await openFormsTab(page)

    const row = page.getByTestId("property-forms-history-row--103")
    await expect(row).toBeVisible({ timeout: 10_000 })

    await expect(page.getByTestId("property-forms-history-edit--103")).not.toBeVisible()
    await expect(page.getByTestId("property-forms-history-no-values-note--103")).not.toBeVisible()
    // Send button is still present since there's a driveFileLink
    await expect(page.getByTestId("property-forms-history-send--103")).toBeVisible()
  })
})

test.describe("Forms Send History — Edit flow", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaE2eAdminCredentials()
    await routeTemplateGet(page, TEMPLATE_RESPONSE_EMPTY)
    await setupWithHistory(page, HISTORY_ROW_WITH_VALUES)
    await signInAsAdmin(page)
  })

  test("clicking Edit opens the Form 6 fill dialog pre-populated with saved values", async ({ page }) => {
    await openFormsTab(page)

    const editBtn = page.getByTestId("property-forms-history-edit--101")
    await expect(editBtn).toBeVisible({ timeout: 10_000 })
    await editBtn.click()

    const editDialog = page.getByTestId("property-forms-history-edit-dialog")
    await expect(editDialog).toBeVisible({ timeout: 10_000 })

    // Form 6 fill step should be pre-populated with saved seller1Name
    const fillStep = page.getByTestId("form6-fill-step")
    await expect(fillStep).toBeVisible()
    const seller1Name = page.getByTestId("form6-part1-client1-name")
    await expect(seller1Name).toHaveValue("John Smith")

    await shotFocused(page, fillStep, SHOT_DIR, "04-edit-dialog-prepopulated")
    story.addScene({
      title: "04 — Edit Dialog: Pre-populated with Saved Values",
      images: [join(SHOT_DIR, "04-edit-dialog-prepopulated.png")],
      seeing: "The Form 6 fill dialog opens with the seller name (John Smith) already filled in from the stored prefill_values.",
      steps: ["Click Edit on a history row", "Observe the fill dialog is pre-populated with prior values"],
    })
  })

  test("submitting edit updates the history row in place with a new Drive link", async ({ page }) => {
    const UPDATED_LINK = "https://drive.google.com/view?id=filled_form6_v2"

    await page.route("**/api/admin/property-form-sends/101**", async (route) => {
      if (route.request().method() !== "PATCH") { await route.fallback(); return }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          propertyFormSendId: 101,
          driveFileLink: UPDATED_LINK,
          prefillValues: { seller1Name: "John Smith Updated", commission: "3.3%" },
        }),
      })
    })

    // After edit, history GET returns the updated row
    await page.route("**/api/admin/property-form-sends**", async (route) => {
      if (route.request().method() !== "GET") { await route.fallback(); return }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: [{
            ...HISTORY_ROW_WITH_VALUES.items[0],
            driveFileLink: UPDATED_LINK,
            prefillValues: { seller1Name: "John Smith Updated", commission: "3.3%" },
          }],
        }),
      })
    })

    await openFormsTab(page)
    await expect(page.getByTestId("property-forms-history-row--101")).toBeVisible({ timeout: 10_000 })

    await page.getByTestId("property-forms-history-edit--101").click()
    await expect(page.getByTestId("property-forms-history-edit-dialog")).toBeVisible({ timeout: 10_000 })

    // Modify a field and save
    await page.getByTestId("form6-part1-client1-name").fill("John Smith Updated")
    await page.getByTestId("property-forms-history-edit-submit").click()
    await expect(page.getByTestId("property-forms-history-edit-dialog")).not.toBeVisible({ timeout: 10_000 })

    // Same row still present, row count still 1
    const historyList = page.getByTestId("property-forms-history-list")
    await expect(historyList).toBeVisible()
    await expect(historyList.getByTestId("property-forms-history-row--101")).toBeVisible()
    const rows = historyList.locator("[data-testid^='property-forms-history-row--']")
    await expect(rows).toHaveCount(1)

    // Drive link on the row has changed to the new URL
    const viewLink = page.getByTestId("property-forms-history-view-link--101")
    await expect(viewLink).toHaveAttribute("href", UPDATED_LINK)

    await shotFocused(page, historyList, SHOT_DIR, "05-edit-updated-row-in-place")
    story.addScene({
      title: "05 — Edit: Row Updated In Place",
      images: [join(SHOT_DIR, "05-edit-updated-row-in-place.png")],
      seeing: "After editing, the same history row is present with the new Drive link. No duplicate row was added.",
      steps: ["Click Edit, change a field, submit", "Observe the row updates in place with the new Drive link"],
    })
  })

  test("edit fails gracefully — 503 shows inline error, row unchanged", async ({ page }) => {
    await page.route("**/api/admin/property-form-sends/101**", async (route) => {
      if (route.request().method() !== "PATCH") { await route.fallback(); return }
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: "Failed to save PDF to Drive — check Google Drive connection." }),
      })
    })

    await openFormsTab(page)
    await expect(page.getByTestId("property-forms-history-edit--101")).toBeVisible({ timeout: 10_000 })
    await page.getByTestId("property-forms-history-edit--101").click()
    await expect(page.getByTestId("property-forms-history-edit-dialog")).toBeVisible({ timeout: 10_000 })
    await page.getByTestId("property-forms-history-edit-submit").click()

    const errorEl = page.getByTestId("property-forms-history-edit-error")
    await expect(errorEl).toBeVisible({ timeout: 10_000 })
    await expect(page.getByTestId("property-forms-history-edit-dialog")).toBeVisible()

    // Original drive link still on the row (dialog open so row is in background)
    const viewLink = page.getByTestId("property-forms-history-view-link--101")
    await expect(viewLink).toHaveAttribute("href", "https://drive.google.com/view?id=filled_form6_v1")
  })
})

test.describe("Forms Send History — Send from history", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaE2eAdminCredentials()
    await routeTemplateGet(page, TEMPLATE_RESPONSE_EMPTY)
    await setupWithHistory(page, HISTORY_ROW_WITH_VALUES)
    await signInAsAdmin(page)
  })

  test("clicking Send opens dialog with drive link preview and email input", async ({ page }) => {
    await openFormsTab(page)

    const sendBtn = page.getByTestId("property-forms-history-send--101")
    await expect(sendBtn).toBeVisible({ timeout: 10_000 })
    await sendBtn.click()

    const sendDialog = page.getByTestId("property-forms-history-send-dialog")
    await expect(sendDialog).toBeVisible({ timeout: 10_000 })

    // Shows drive link
    const driveLink = sendDialog.getByTestId("property-forms-history-send-drive-link")
    await expect(driveLink).toBeVisible()
    await expect(driveLink).toHaveAttribute("href", "https://drive.google.com/view?id=filled_form6_v1")

    // Shows email input
    const emailInput = sendDialog.getByTestId("property-forms-history-send-email-0")
    await expect(emailInput).toBeVisible()

    await shotFocused(page, sendDialog, SHOT_DIR, "06-send-from-history-dialog")
    story.addScene({
      title: "06 — Send from History: Dialog with Drive Link and Email Input",
      images: [join(SHOT_DIR, "06-send-from-history-dialog.png")],
      seeing: "The Send dialog shows the Drive link and an email input field allowing any email address.",
      steps: ["Click Send on a history row", "Observe the dialog with Drive link preview and email input"],
    })
  })

  test("can send to arbitrary email not in original recipients", async ({ page }) => {
    let capturedBody: Record<string, unknown> | null = null

    await page.route("**/api/admin/property-form-sends/101/resend**", async (route) => {
      if (route.request().method() !== "POST") { await route.fallback(); return }
      capturedBody = JSON.parse(route.request().postData() ?? "{}") as Record<string, unknown>
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) })
    })

    await openFormsTab(page)
    await page.getByTestId("property-forms-history-send--101").click()
    await expect(page.getByTestId("property-forms-history-send-dialog")).toBeVisible({ timeout: 10_000 })

    const emailInput = page.getByTestId("property-forms-history-send-email-0")
    await emailInput.fill("newemail@example.com")
    await page.getByTestId("property-forms-history-send-submit").click()

    await expect(page.getByTestId("property-forms-history-send-dialog")).not.toBeVisible({ timeout: 10_000 })

    expect(capturedBody).not.toBeNull()
    const emails = (capturedBody as unknown as { emails: string[] }).emails
    expect(emails).toContain("newemail@example.com")
  })

  test("can add a second email and send to multiple addresses", async ({ page }) => {
    let capturedBody: Record<string, unknown> | null = null

    await page.route("**/api/admin/property-form-sends/101/resend**", async (route) => {
      if (route.request().method() !== "POST") { await route.fallback(); return }
      capturedBody = JSON.parse(route.request().postData() ?? "{}") as Record<string, unknown>
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) })
    })

    await openFormsTab(page)
    await page.getByTestId("property-forms-history-send--101").click()
    await expect(page.getByTestId("property-forms-history-send-dialog")).toBeVisible({ timeout: 10_000 })

    await page.getByTestId("property-forms-history-send-email-0").fill("first@example.com")
    await page.getByTestId("property-forms-history-send-add-email").click()

    const secondInput = page.getByTestId("property-forms-history-send-email-1")
    await expect(secondInput).toBeVisible()
    await secondInput.fill("second@example.com")

    await page.getByTestId("property-forms-history-send-submit").click()
    await expect(page.getByTestId("property-forms-history-send-dialog")).not.toBeVisible({ timeout: 10_000 })

    expect(capturedBody).not.toBeNull()
    const emails = (capturedBody as unknown as { emails: string[] }).emails
    expect(emails).toContain("first@example.com")
    expect(emails).toContain("second@example.com")
  })

  test("Send button is disabled when email field is empty", async ({ page }) => {
    await openFormsTab(page)
    await page.getByTestId("property-forms-history-send--101").click()
    await expect(page.getByTestId("property-forms-history-send-dialog")).toBeVisible({ timeout: 10_000 })

    const submitBtn = page.getByTestId("property-forms-history-send-submit")
    await expect(submitBtn).toBeDisabled()
  })
})
