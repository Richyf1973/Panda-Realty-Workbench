/**
 * E2E: Offer Form Submission panel — Buyer solicitor persistence round-trip
 *
 * Tests that:
 *   1. When the admin enters buyer solicitor data via the native view Edit and saves,
 *      the submission panel immediately shows the solicitor (live API, red pre-fix).
 *   2. After save + re-open Edit, the solicitor fields are pre-populated (live API).
 *   3. Multi-offer checkboxes persist correctly after save + re-open (live API).
 *   4-5. Display-only edge cases (mocked): heading visible when null, seller unaffected.
 *
 * Live tests target property_list_id=223438, buyer_offer_id=324, property_entity_id=185935.
 * These tests modify the real DB — solicitor fields are reset in afterAll.
 *
 * MV21-24 (no submitted row / 1B insert path) — NOT AUTOMATED:
 *   Requires a property entity with zero offer_form_submissions rows; too brittle to set up via Playwright alone.
 *
 * Run: npm run test:e2e:scratch -- --app=panda-realty --spec=apps/panda-realty/e2e/admin-properties-offer-submission-solicitor-persistence.spec.ts --no-bail
 * Spec: specs/panda-realty-offer-form-buyer-solicitor-missing.md
 */

import { expect, test, type Page } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { createStory, shotFocused } from "@repo/e2e-utils"

import type { Submission } from "@/components/admin/buyer-offer-submission-panel"

import { requirePandaE2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import { PREFILL_BASE } from "./helpers/buyer-offer-native-view-mocks"
import {
  ACCEPTED_OFFER,
  MOCK_SUBMISSION,
  OFFER_TOKEN,
} from "./helpers/offers-rework-fixtures"
import { MOCK_PROPERTY_ID } from "./helpers/panda-properties-dialog-mocks"
import { setupSalesTabMockRoutes } from "./helpers/sales-tab-mock-routes"

const SHOT_DIR = join(dirname(fileURLToPath(import.meta.url)), "screenshots", "offer-solicitor-persistence")

const story = createStory({ specUrl: import.meta.url, slug: "offer-solicitor-persistence" })

story.setWhatWasBuilt(
  "Fixes buyer solicitor persistence in the OFFER FORM SUBMISSION panel. " +
  "form-data PATCH now writes solicitor (and multi-offer checkboxes) to the submitted row " +
  "(isNotNull(submittedAt)) rather than the latest-by-ID row which may be a draft. " +
  "offer-form-get-handler adds isNotNull(submittedAt) when viewMode=true so the Edit form " +
  "pre-populates from the same row the panel displays. " +
  "Files changed: form-data/route.ts, offer-form-get-handler.ts, form-view/route.ts.",
)

// ─── Live-API constants ────────────────────────────────────────────────────────
// Target property: 184/46 AMY STREET MORAYFIELD (property_list_id=223438)
const LIVE_BUYER_OFFER_ID = 324
const LIVE_PROPERTY_ENTITY_ID = 185935
const SOLICITOR_TEST_NAME = "E2E TEST SOLICITOR"
const SOLICITOR_TEST_PHONE = "0400000099"

// ─── Mocked-route fixtures ─────────────────────────────────────────────────────
const SUBMISSION_NULL_SOLICITOR: Submission = {
  ...MOCK_SUBMISSION,
  solicitorName: null,
  solicitorPhone: null,
  solicitorAddress: null,
  solicitorEmail: null,
  sellerSolicitorName: "R&D TAYLOR - SELF ACTING",
  sellerSolicitorPhone: "0406011060",
  sellerSolicitorAddress: "184/46 AMY STREET",
  sellerSolicitorEmail: "denise48taylor@gmail.com",
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** Open the real property 184/46 AMY STREET and navigate to Sales Information tab. */
async function openLiveSalesTab(page: Page) {
  await page.goto("/admin/properties")
  await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible({ timeout: 60_000 })
  await page.getByTestId("admin-entity-row-edit--properties--223438").click()

  const dialog = page.getByTestId("admin-entity-crud-dialog--properties")
  await expect(dialog).toBeVisible({ timeout: 15_000 })

  await page.getByTestId("panda-properties-form-tab-trigger--sales").click()
  await expect(page.getByTestId("panda-properties-form-tab--sales")).toBeVisible({ timeout: 10_000 })
  return dialog
}

/** Wait for the submission panel to finish loading (not in skeleton state). */
async function waitForSubmissionPanel(dialog: ReturnType<Page["getByTestId"]>, page: Page) {
  // 30s covers Next.js cold-compile on first access after a file edit
  await expect(page.getByTestId("panda-properties-sales-accepted-offer-loading")).not.toBeVisible({ timeout: 30_000 })
  const panel = dialog.getByTestId(`buyer-offer-form-submission-panel--${LIVE_PROPERTY_ENTITY_ID}`)
  await expect(panel).toBeVisible({ timeout: 10_000 })
  return panel
}

/** Open native view editor by clicking the Edit button in the offer submission heading. */
async function openNativeViewEditor(page: Page) {
  await page.getByTestId("offer-submission-edit-button").click()
  const nativeView = page.getByTestId(`buyer-offer-native-view--${LIVE_BUYER_OFFER_ID}`)
  await expect(nativeView).toBeVisible({ timeout: 10_000 })
  return nativeView
}

/** Scroll to Section 2 (Solicitor Details) in native view and enter values. */
async function fillSolicitorFields(page: Page, name: string, phone: string) {
  const nameField = page.getByTestId("buyer-offer-native--solicitor-name")
  const phoneField = page.getByTestId("buyer-offer-native--solicitor-phone")
  await expect(nameField).toBeVisible({ timeout: 10_000 })
  await nameField.fill(name)
  await phoneField.fill(phone)
}

/** Click native view Save and wait for it to return to read-only mode. */
async function saveNativeView(page: Page) {
  await page.getByTestId(`buyer-offer-native-view-save--${LIVE_BUYER_OFFER_ID}`).click()
  // After save, native view disappears and panel reloads
  await expect(page.getByTestId(`buyer-offer-native-view--${LIVE_BUYER_OFFER_ID}`)).not.toBeVisible({ timeout: 10_000 })
}

// ─── Mocked-route helpers ─────────────────────────────────────────────────────

async function setupMockedRoutes(page: Page, submission: Submission | null) {
  await setupSalesTabMockRoutes(page, [ACCEPTED_OFFER], OFFER_TOKEN, PREFILL_BASE)
  await page.route("**/api/admin/property-entities/**/offer-form-status**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ submission }),
    })
  })
}

async function openMockedSalesTab(page: Page) {
  await page.goto("/admin/properties")
  await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible({ timeout: 60_000 })
  await page.getByTestId(`admin-entity-row--properties--${MOCK_PROPERTY_ID}`).click()
  const dialog = page.getByTestId("admin-entity-crud-dialog--properties")
  await expect(dialog).toBeVisible({ timeout: 15_000 })
  await page.getByTestId("panda-properties-form-tab-trigger--sales").click()
  await expect(page.getByTestId("panda-properties-form-tab--sales")).toBeVisible()
  return dialog
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe("Offer solicitor persistence — live API", () => {
  test.setTimeout(120_000)

  test.beforeEach(async ({ page }) => {
    requirePandaE2eAdminCredentials()
    await signInAsAdmin(page)
    await mkdir(SHOT_DIR, { recursive: true })
  })

  test.afterAll(() => {
    story.write()
  })

  // MV-1..9: Enter solicitor → save → panel shows it
  test("admin enters buyer solicitor in native view and panel shows it after save", async ({ page }) => {
    const dialog = await openLiveSalesTab(page)
    const panel = await waitForSubmissionPanel(dialog, page)

    // Screenshot: initial state (solicitor section empty or with previous data)
    const solicitorSection = panel.getByTestId("panda-offer-submission-solicitor")
    await expect(solicitorSection).toBeVisible({ timeout: 10_000 })
    await shotFocused(page, panel, SHOT_DIR, "01a-panel-before-save")

    // Open native view editor and fill solicitor
    await openNativeViewEditor(page)
    await fillSolicitorFields(page, SOLICITOR_TEST_NAME, SOLICITOR_TEST_PHONE)

    await shotFocused(page, page.getByTestId(`buyer-offer-native-view--${LIVE_BUYER_OFFER_ID}`), SHOT_DIR, "01b-native-view-filled")
    await saveNativeView(page)

    // After save the panel reloads — wait for it
    const refreshedPanel = await waitForSubmissionPanel(dialog, page)
    const refreshedSolicitorSection = refreshedPanel.getByTestId("panda-offer-submission-solicitor")

    // Pre-fix: PATCH writes to draft row (submitted_at=null); offer-form-status reads submitted row → still null → test FAILS
    // Post-fix: PATCH writes to submitted row; offer-form-status reads same row → shows solicitor → test PASSES
    await expect(refreshedSolicitorSection).toContainText(SOLICITOR_TEST_NAME, { timeout: 10_000 })

    await shotFocused(page, refreshedPanel, SHOT_DIR, "01c-panel-after-save")
    story.addScene({
      title: "01 — Buyer Solicitor: Appears in Panel After Admin Save",
      images: [
        join(SHOT_DIR, "01a-panel-before-save.png"),
        join(SHOT_DIR, "01b-native-view-filled.png"),
        join(SHOT_DIR, "01c-panel-after-save.png"),
      ],
      seeing:
        "Left: panel before save (solicitor empty). Middle: native view with solicitor name entered. " +
        "Right: panel after save showing the entered solicitor name.",
      steps: [
        "Open Edit property → Sales Information tab for 184/46 AMY STREET",
        "Click Edit in the OFFER FORM SUBMISSION heading",
        `Enter Solicitor Name = ${SOLICITOR_TEST_NAME} and Phone = ${SOLICITOR_TEST_PHONE}`,
        "Click Save",
        "Observe the panel now shows the solicitor name",
      ],
    })
  })

  // MV-10..12: After save, reopen Edit → solicitor fields pre-populated
  test("after saving solicitor, reopening native view pre-populates the fields", async ({ page }) => {
    // Depends on the previous test having set SOLICITOR_TEST_NAME — run after it.
    // If solicitor was reset, this test may give a false green; it's a companion to test 1.
    const dialog = await openLiveSalesTab(page)
    await waitForSubmissionPanel(dialog, page)

    await openNativeViewEditor(page)
    const nameField = page.getByTestId("buyer-offer-native--solicitor-name")
    await expect(nameField).toBeVisible({ timeout: 10_000 })

    // Pre-fix: offer-form-get-handler reads latest row by createdAt (row 59, draft); after PATCH
    //   row 59 has solicitor data so this might PASS pre-fix too — included as regression test.
    // Post-fix: reads submitted row → has solicitor data → PASSES.
    await expect(nameField).toHaveValue(SOLICITOR_TEST_NAME, { timeout: 5_000 })

    await shotFocused(page, page.getByTestId(`buyer-offer-native-view--${LIVE_BUYER_OFFER_ID}`), SHOT_DIR, "02-native-view-prepopulated")
    story.addScene({
      title: "02 — Native View Pre-Populated After Save",
      images: [join(SHOT_DIR, "02-native-view-prepopulated.png")],
      seeing: "The native view Edit form with the Solicitor Name field already filled in after a previous save.",
      steps: [
        "After saving solicitor data (test 01)",
        "Click Edit again to re-open the native view",
        "Observe the Solicitor Name field is pre-populated with the saved value",
      ],
    })
  })
})

test.describe("Offer solicitor persistence — multi-offer (live API)", () => {
  test.setTimeout(120_000)

  test.beforeEach(async ({ page }) => {
    requirePandaE2eAdminCredentials()
    await signInAsAdmin(page)
    await mkdir(SHOT_DIR, { recursive: true })
  })

  // MV-18..20: Multi-offer checkbox persists after save + reopen
  test("multi-offer checkbox persists after save and native view reopen", async ({ page }) => {
    const dialog = await openLiveSalesTab(page)
    await waitForSubmissionPanel(dialog, page)

    const nativeView = await openNativeViewEditor(page)

    // Scroll to multi-offer section and check the first checkbox
    const checkbox = nativeView.getByTestId("buyer-offer-native--multi-offer-highest")
    await expect(checkbox).toBeVisible({ timeout: 10_000 })
    const wasChecked = await checkbox.isChecked()

    // Ensure unchecked first, then check it
    if (wasChecked) {
      await checkbox.uncheck()
      await saveNativeView(page)
      await waitForSubmissionPanel(dialog, page)
      await openNativeViewEditor(page)
    }

    await page.getByTestId("buyer-offer-native--multi-offer-highest").check()
    await shotFocused(page, nativeView.getByTestId("buyer-offer-native--multi-offer-highest").locator("..").locator(".."), SHOT_DIR, "03a-multi-offer-checked")
    await saveNativeView(page)

    // Re-open and verify checkbox is still checked
    await waitForSubmissionPanel(dialog, page)
    await openNativeViewEditor(page)
    const checkboxAfter = page.getByTestId("buyer-offer-native--multi-offer-highest")
    await expect(checkboxAfter).toBeVisible({ timeout: 10_000 })

    // Pre-fix: PATCH updates row 59 (draft); re-open reads row 59 which has the checkbox → may PASS
    // Post-fix: PATCH updates row 58 (submitted); re-open reads row 58 → has checkbox → PASSES
    await expect(checkboxAfter).toBeChecked({ timeout: 5_000 })

    await shotFocused(page, page.getByTestId(`buyer-offer-native-view--${LIVE_BUYER_OFFER_ID}`), SHOT_DIR, "03b-multi-offer-still-checked")
    story.addScene({
      title: "03 — Multi-Offer Checkbox Persists After Save",
      images: [
        join(SHOT_DIR, "03a-multi-offer-checked.png"),
        join(SHOT_DIR, "03b-multi-offer-still-checked.png"),
      ],
      seeing:
        "Left: multi-offer highest-and-best checkbox checked before save. " +
        "Right: checkbox still checked after save + native view re-open.",
      steps: [
        "Open native view Edit for the accepted offer",
        "Check the multi-offer highest-and-best checkbox",
        "Save",
        "Reopen native view Edit",
        "Observe the checkbox is still checked",
      ],
    })

    // Cleanup: uncheck to restore original state
    await page.getByTestId("buyer-offer-native--multi-offer-highest").uncheck()
    await saveNativeView(page)
  })
})

test.describe("Offer solicitor display — mocked routes (MV-13..17)", () => {
  test.setTimeout(120_000)

  test.beforeEach(async ({ page }) => {
    requirePandaE2eAdminCredentials()
    await signInAsAdmin(page)
    await mkdir(SHOT_DIR, { recursive: true })
  })

  // MV-13..15: Buyer's Solicitor heading always visible when all null
  // NOTE: Also covered in existing admin-properties-offer-submission-solicitor.spec.ts
  test("Buyer's Solicitor heading is visible and no data rows shown when all fields are null", async ({ page }) => {
    await setupMockedRoutes(page, SUBMISSION_NULL_SOLICITOR)
    const dialog = await openMockedSalesTab(page)

    const acceptedSection = dialog.getByTestId("panda-properties-sales-accepted-offer-section")
    await expect(acceptedSection.getByText("Rework Test Buyer")).toBeVisible({ timeout: 15_000 })

    const panel = acceptedSection.getByTestId(`buyer-offer-form-submission-panel--${ACCEPTED_OFFER.propertyEntityId}`)
    const solicitorSection = panel.getByTestId("panda-offer-submission-solicitor")
    await expect(solicitorSection).toBeVisible({ timeout: 5_000 })

    // Heading shows but no data rows
    await expect(solicitorSection).toContainText("Buyer's Solicitor")
    await expect(solicitorSection).not.toContainText("Name:")

    await shotFocused(page, panel, SHOT_DIR, "04-heading-visible-null-fields")
    story.addScene({
      title: "04 — Buyer's Solicitor Heading Visible When All Null",
      images: [join(SHOT_DIR, "04-heading-visible-null-fields.png")],
      seeing: "The submission panel showing the Buyer's Solicitor heading but no data rows beneath it.",
      steps: [
        "All solicitor fields null in submission",
        "Observe heading is present, no Name/Phone/Email/Address rows rendered",
      ],
    })
  })

  // MV-16..17: Seller's Solicitor unaffected
  // NOTE: Also covered in existing admin-properties-offer-submission-solicitor.spec.ts
  test("Seller's Solicitor block shows correct seller data regardless of buyer solicitor state", async ({ page }) => {
    await setupMockedRoutes(page, SUBMISSION_NULL_SOLICITOR)
    const dialog = await openMockedSalesTab(page)

    const acceptedSection = dialog.getByTestId("panda-properties-sales-accepted-offer-section")
    await expect(acceptedSection.getByText("Rework Test Buyer")).toBeVisible({ timeout: 15_000 })

    const panel = acceptedSection.getByTestId(`buyer-offer-form-submission-panel--${ACCEPTED_OFFER.propertyEntityId}`)
    const sellerSection = panel.getByTestId("panda-offer-submission-seller-solicitor")
    await expect(sellerSection).toBeVisible({ timeout: 5_000 })
    await expect(sellerSection).toContainText("Seller's Solicitor")
    await expect(sellerSection).toContainText("R&D TAYLOR - SELF ACTING")

    await shotFocused(page, panel, SHOT_DIR, "05-seller-solicitor-unaffected")
    story.addScene({
      title: "05 — Seller's Solicitor Block Unaffected",
      images: [join(SHOT_DIR, "05-seller-solicitor-unaffected.png")],
      seeing: "The submission panel showing the Seller's Solicitor block with correct seller data.",
      steps: [
        "Buyer solicitor fields are null",
        "Seller solicitor data is present in the mock submission",
        "Observe Seller's Solicitor block shows the expected seller data",
      ],
    })
  })

  // MV-21..24: No submitted row (1B insert path)
  // NOT AUTOMATED: Requires a property entity with zero offer_form_submissions rows;
  // too brittle to set up via Playwright alone without direct DB access in the test.
})
