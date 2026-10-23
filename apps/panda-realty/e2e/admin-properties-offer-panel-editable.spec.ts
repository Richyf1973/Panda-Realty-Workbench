/**
 * E2E: Offer Form Submission Panel — Editable toggle (admin Sales tab)
 *
 * The accepted offer section in the Sales Information tab shows a compact read-only
 * OFFER FORM SUBMISSION panel. An Edit button beside the heading replaces the panel with
 * the editable BuyerOfferNativeView. Save/Cancel returns to the read-only panel.
 * Pending edits are auto-saved when the main dialog Save changes is clicked.
 *
 * Run: npm run test:e2e:scratch -- --app=panda-realty --spec=apps/panda-realty/e2e/admin-properties-offer-panel-editable.spec.ts --no-bail
 * Spec: specs/panda-realty-offer-form-panel-editable.md
 */

import { expect, test, type Page, type Route } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { createStory, shotFocused } from "@repo/e2e-utils"

import {
  requirePandaE2eAdminCredentials,
  signInAsAdmin,
} from "./helpers/admin-auth"
import { PREFILL_BASE } from "./helpers/buyer-offer-native-view-mocks"
import {
  ACCEPTED_OFFER,
  MOCK_SUBMISSION,
  OFFER_TOKEN,
} from "./helpers/offers-rework-fixtures"
import { MOCK_PROPERTY_ID } from "./helpers/panda-properties-dialog-mocks"
import { setupSalesTabMockRoutes } from "./helpers/sales-tab-mock-routes"

const SHOT_DIR = join(dirname(fileURLToPath(import.meta.url)), "screenshots", "offer-panel-editable")

const story = createStory({ specUrl: import.meta.url, slug: "offer-panel-editable" })

story.setWhatWasBuilt(
  "Adds an Edit button to the read-only OFFER FORM SUBMISSION panel in the Sales Information tab. " +
  "Clicking Edit replaces the compact panel with BuyerOfferNativeView (full editable form). " +
  "Save/Cancel inside the native view returns to the read-only panel. " +
  "Pending edits are auto-saved when the main property dialog Save changes is clicked. " +
  "Files: accepted-offer-submission-panel.tsx, panda-properties-form-favorite-tabs.tsx.",
)

// ─── Route helpers ──────────────────────────────────────────────────────────

// propertyType is an async-search relation field; without these options "House"
// fails the "Must select from list" validation and blocks the main dialog Save changes.
const PROPERTY_TYPES_OPTIONS = {
  options: [
    { value: "House", label: "House" },
    { value: "Unit", label: "Unit" },
    { value: "Vacant Land", label: "Vacant Land" },
  ],
}

async function setupRoutes(
  page: Page,
  offerFormStatusBody: unknown = { submission: MOCK_SUBMISSION },
): Promise<void> {
  await setupSalesTabMockRoutes(page, [ACCEPTED_OFFER], OFFER_TOKEN, PREFILL_BASE)
  await page.route("**/api/admin/property-types/options**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(PROPERTY_TYPES_OPTIONS),
    })
  })
  await page.route("**/api/admin/property-entities/**/offer-form-status**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(offerFormStatusBody),
    })
  })
}

async function openSalesTab(page: Page) {
  await page.goto("/admin/properties")
  await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible({ timeout: 30_000 })
  await page.getByTestId(`admin-entity-row--properties--${MOCK_PROPERTY_ID}`).click()
  const dialog = page.getByTestId("admin-entity-crud-dialog--properties")
  await expect(dialog).toBeVisible({ timeout: 15_000 })
  await page.getByTestId("panda-properties-form-tab-trigger--sales").click()
  await expect(page.getByTestId("panda-properties-form-tab--sales")).toBeVisible()
  return dialog
}

// ─── Tests ───────────────────────────────────────────────────────────────────

test.describe("Offer Form Submission panel — Edit toggle (mocked)", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaE2eAdminCredentials()
    await signInAsAdmin(page)
    await mkdir(SHOT_DIR, { recursive: true })
  })

  test.afterAll(() => {
    story.write()
  })

  // ── Happy path ──────────────────────────────────────────────────────────────

  test("Edit button renders beside Print in read-only mode", async ({ page }) => {
    await setupRoutes(page)
    const dialog = await openSalesTab(page)

    const acceptedSection = dialog.getByTestId("panda-properties-sales-accepted-offer-section")
    await expect(acceptedSection.getByText("Rework Test Buyer")).toBeVisible({ timeout: 15_000 })

    const editBtn = acceptedSection.getByTestId("offer-submission-edit-button")
    await expect(editBtn).toBeVisible()

    const nativeView = acceptedSection.getByTestId(`buyer-offer-native-view--${ACCEPTED_OFFER.buyerOfferId}`)
    await expect(nativeView).not.toBeVisible()

    await shotFocused(page, acceptedSection, SHOT_DIR, "01-readonly-with-edit-btn")
    story.addScene({
      title: "01 — Read-only panel with Edit button",
      images: [join(SHOT_DIR, "01-readonly-with-edit-btn.png")],
      seeing: "The OFFER FORM SUBMISSION panel shows Edit and Print buttons beside the heading. No input fields are visible.",
      steps: [
        "Open a property with an accepted offer",
        "Open the Sales Information tab",
        "Observe the Edit button beside the Print button",
      ],
    })
  })

  test("clicking Edit replaces read-only panel with BuyerOfferNativeView", async ({ page }) => {
    await setupRoutes(page)
    const dialog = await openSalesTab(page)

    const acceptedSection = dialog.getByTestId("panda-properties-sales-accepted-offer-section")
    await expect(acceptedSection.getByText("Rework Test Buyer")).toBeVisible({ timeout: 15_000 })

    await shotFocused(page, acceptedSection, SHOT_DIR, "02a-before-edit")

    await acceptedSection.getByTestId("offer-submission-edit-button").click()

    const nativeView = acceptedSection.getByTestId(`buyer-offer-native-view--${ACCEPTED_OFFER.buyerOfferId}`)
    await expect(nativeView).toBeVisible({ timeout: 10_000 })

    // Read-only panel gone, Edit button gone
    await expect(acceptedSection.getByTestId(`buyer-offer-form-submission-panel--${ACCEPTED_OFFER.propertyEntityId}`)).not.toBeVisible()
    await expect(acceptedSection.getByTestId("offer-submission-edit-button")).not.toBeVisible()

    await shotFocused(page, acceptedSection, SHOT_DIR, "02b-after-edit")
    story.addScene({
      title: "02 — Edit toggles to native view",
      images: [join(SHOT_DIR, "02a-before-edit.png"), join(SHOT_DIR, "02b-after-edit.png")],
      seeing: "Left: compact read-only panel. Right: BuyerOfferNativeView with editable fields and Save/Cancel buttons.",
      steps: [
        "Open the Sales Information tab",
        "Click the Edit button",
        "Observe the form replaces the read-only panel",
      ],
    })
  })

  test("Print button stays visible in edit mode", async ({ page }) => {
    await setupRoutes(page)
    const dialog = await openSalesTab(page)

    const acceptedSection = dialog.getByTestId("panda-properties-sales-accepted-offer-section")
    await expect(acceptedSection.getByText("Rework Test Buyer")).toBeVisible({ timeout: 15_000 })

    await acceptedSection.getByTestId("offer-submission-edit-button").click()
    await expect(acceptedSection.getByTestId(`buyer-offer-native-view--${ACCEPTED_OFFER.buyerOfferId}`)).toBeVisible({ timeout: 10_000 })

    await expect(acceptedSection.getByTestId("offer-submission-print-button")).toBeVisible()
  })

  test("Save from native view fires PATCH and returns to read-only panel", async ({ page }) => {
    await setupRoutes(page)

    let patchCalled = false
    await page.route(`**/api/admin/buyer-offers/${ACCEPTED_OFFER.buyerOfferId}/form-data`, async (route) => {
      if (route.request().method() === "PATCH") {
        patchCalled = true
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) })
        return
      }
      await route.fallback()
    })

    const dialog = await openSalesTab(page)
    const acceptedSection = dialog.getByTestId("panda-properties-sales-accepted-offer-section")
    await expect(acceptedSection.getByText("Rework Test Buyer")).toBeVisible({ timeout: 15_000 })

    await acceptedSection.getByTestId("offer-submission-edit-button").click()
    const nativeView = acceptedSection.getByTestId(`buyer-offer-native-view--${ACCEPTED_OFFER.buyerOfferId}`)
    await expect(nativeView).toBeVisible({ timeout: 10_000 })

    await nativeView.getByTestId("buyer-offer-native--buyer-1-name").fill("Updated Buyer Name")
    await nativeView.getByTestId(`buyer-offer-native-view-save--${ACCEPTED_OFFER.buyerOfferId}`).click()

    await expect(async () => { expect(patchCalled).toBe(true) }).toPass({ timeout: 5_000 })

    // Native view gone, read-only panel visible again
    await expect(nativeView).not.toBeVisible()
    await expect(acceptedSection.getByTestId(`buyer-offer-form-submission-panel--${ACCEPTED_OFFER.propertyEntityId}`)).toBeVisible()
    await expect(acceptedSection.getByTestId("offer-submission-edit-button")).toBeVisible()
  })

  test("Cancel from native view returns to read-only panel without saving", async ({ page }) => {
    await setupRoutes(page)

    let patchCalled = false
    await page.route(`**/api/admin/buyer-offers/${ACCEPTED_OFFER.buyerOfferId}/form-data`, async (route) => {
      if (route.request().method() === "PATCH") {
        patchCalled = true
        await route.fallback()
        return
      }
      await route.fallback()
    })

    const dialog = await openSalesTab(page)
    const acceptedSection = dialog.getByTestId("panda-properties-sales-accepted-offer-section")
    await expect(acceptedSection.getByText("Rework Test Buyer")).toBeVisible({ timeout: 15_000 })

    await acceptedSection.getByTestId("offer-submission-edit-button").click()
    const nativeView = acceptedSection.getByTestId(`buyer-offer-native-view--${ACCEPTED_OFFER.buyerOfferId}`)
    await expect(nativeView).toBeVisible({ timeout: 10_000 })

    await nativeView.getByTestId("buyer-offer-native--buyer-1-name").fill("Temp Change")
    await nativeView.getByTestId(`buyer-offer-native-view-cancel--${ACCEPTED_OFFER.buyerOfferId}`).click()

    expect(patchCalled).toBe(false)

    // Native view gone, read-only panel back
    await expect(nativeView).not.toBeVisible()
    await expect(acceptedSection.getByTestId(`buyer-offer-form-submission-panel--${ACCEPTED_OFFER.propertyEntityId}`)).toBeVisible()
  })

  test("main dialog Save changes auto-saves pending offer edits", async ({ page }) => {
    await setupRoutes(page)

    let offerPatchCalled = false
    await page.route(`**/api/admin/buyer-offers/${ACCEPTED_OFFER.buyerOfferId}/form-data`, async (route) => {
      if (route.request().method() === "PATCH") {
        offerPatchCalled = true
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) })
        return
      }
      await route.fallback()
    })
    await page.route(`**/api/admin/properties/${MOCK_PROPERTY_ID}**`, async (route) => {
      if (route.request().method() === "PATCH") {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({}) })
        return
      }
      await route.fallback()
    })

    const dialog = await openSalesTab(page)
    const acceptedSection = dialog.getByTestId("panda-properties-sales-accepted-offer-section")
    await expect(acceptedSection.getByText("Rework Test Buyer")).toBeVisible({ timeout: 15_000 })

    await acceptedSection.getByTestId("offer-submission-edit-button").click()
    const nativeView = acceptedSection.getByTestId(`buyer-offer-native-view--${ACCEPTED_OFFER.buyerOfferId}`)
    await expect(nativeView).toBeVisible({ timeout: 10_000 })

    await nativeView.getByTestId("buyer-offer-native--buyer-1-name").fill("Auto-save Test Name")
    // Wait for isDirty to register (Save button enabled) so the before-patch hook captures handleSave
    await expect(nativeView.getByTestId(`buyer-offer-native-view-save--${ACCEPTED_OFFER.buyerOfferId}`)).toBeEnabled({ timeout: 5_000 })

    await page.getByRole("button", { name: /save changes/i }).click()

    // Save changes → property form onSubmit awaits adminEntityCrudBeforePatchRef → offer PATCH fires
    await expect(async () => { expect(offerPatchCalled).toBe(true) }).toPass({ timeout: 8_000 })
  })

  // ── Edge cases ──────────────────────────────────────────────────────────────

  test("Save button is disabled when no fields have been changed", async ({ page }) => {
    await setupRoutes(page)
    const dialog = await openSalesTab(page)

    const acceptedSection = dialog.getByTestId("panda-properties-sales-accepted-offer-section")
    await expect(acceptedSection.getByText("Rework Test Buyer")).toBeVisible({ timeout: 15_000 })

    await acceptedSection.getByTestId("offer-submission-edit-button").click()
    const nativeView = acceptedSection.getByTestId(`buyer-offer-native-view--${ACCEPTED_OFFER.buyerOfferId}`)
    await expect(nativeView).toBeVisible({ timeout: 10_000 })

    const saveBtn = nativeView.getByTestId(`buyer-offer-native-view-save--${ACCEPTED_OFFER.buyerOfferId}`)
    await expect(saveBtn).toBeDisabled()
  })

  test("saved values appear in read-only panel when dialog is closed and re-opened", async ({ page }) => {
    let patchDone = false
    const updatedSubmission = { ...MOCK_SUBMISSION, buyer1Name: "Saved Buyer Name" }

    await setupSalesTabMockRoutes(page, [ACCEPTED_OFFER], OFFER_TOKEN, PREFILL_BASE)
    await page.route("**/api/admin/property-entities/**/offer-form-status**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ submission: patchDone ? updatedSubmission : MOCK_SUBMISSION }),
      })
    })
    await page.route(`**/api/admin/buyer-offers/${ACCEPTED_OFFER.buyerOfferId}/form-data`, async (route) => {
      if (route.request().method() === "PATCH") {
        patchDone = true
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) })
        return
      }
      await route.fallback()
    })

    const dialog = await openSalesTab(page)
    const acceptedSection = dialog.getByTestId("panda-properties-sales-accepted-offer-section")
    await expect(acceptedSection.getByText("Rework Test Buyer")).toBeVisible({ timeout: 15_000 })

    await acceptedSection.getByTestId("offer-submission-edit-button").click()
    const nativeView = acceptedSection.getByTestId(`buyer-offer-native-view--${ACCEPTED_OFFER.buyerOfferId}`)
    await expect(nativeView).toBeVisible({ timeout: 10_000 })

    await nativeView.getByTestId("buyer-offer-native--buyer-1-name").fill("Saved Buyer Name")
    await expect(nativeView.getByTestId(`buyer-offer-native-view-save--${ACCEPTED_OFFER.buyerOfferId}`)).toBeEnabled()
    await nativeView.getByTestId(`buyer-offer-native-view-save--${ACCEPTED_OFFER.buyerOfferId}`).click()
    await expect(async () => { expect(patchDone).toBe(true) }).toPass({ timeout: 5_000 })

    // Save returns to read-only panel — native view unmounts
    await expect(nativeView).not.toBeVisible({ timeout: 5_000 })

    // Close dialog (use dialog-specific cancel; native-view Cancel shares the label)
    await dialog.getByTestId("admin-entity-crud-dialog-cancel--properties").click()
    await expect(dialog).not.toBeVisible()

    // Re-open same property
    await page.getByTestId(`admin-entity-row--properties--${MOCK_PROPERTY_ID}`).click()
    await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible({ timeout: 15_000 })
    await page.getByTestId("panda-properties-form-tab-trigger--sales").click()

    const acceptedSection2 = page.getByTestId("panda-properties-sales-accepted-offer-section")
    await expect(acceptedSection2.getByText("Saved Buyer Name")).toBeVisible({ timeout: 15_000 })
  })

  test("PATCH error shows inline message with edits preserved", async ({ page }) => {
    await setupRoutes(page)
    await page.route(`**/api/admin/buyer-offers/${ACCEPTED_OFFER.buyerOfferId}/form-data`, async (route) => {
      if (route.request().method() === "PATCH") {
        await route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "Server error" }) })
        return
      }
      await route.fallback()
    })

    const dialog = await openSalesTab(page)
    const acceptedSection = dialog.getByTestId("panda-properties-sales-accepted-offer-section")
    await expect(acceptedSection.getByText("Rework Test Buyer")).toBeVisible({ timeout: 15_000 })

    await acceptedSection.getByTestId("offer-submission-edit-button").click()
    const nativeView = acceptedSection.getByTestId(`buyer-offer-native-view--${ACCEPTED_OFFER.buyerOfferId}`)
    await expect(nativeView).toBeVisible({ timeout: 10_000 })

    await nativeView.getByTestId("buyer-offer-native--buyer-1-name").fill("Error Test Name")
    await nativeView.getByTestId(`buyer-offer-native-view-save--${ACCEPTED_OFFER.buyerOfferId}`).click()

    await expect(nativeView.getByTestId(`buyer-offer-native-view-save-error--${ACCEPTED_OFFER.buyerOfferId}`)).toBeVisible({ timeout: 5_000 })
    await expect(nativeView.getByTestId("buyer-offer-native--buyer-1-name")).toHaveValue("Error Test Name")
  })
})
