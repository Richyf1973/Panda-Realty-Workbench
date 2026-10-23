/**
 * E2E: Property dialog Sales tab — reworked offer form layout
 *
 * Per-row View Form toggle opens the editable BuyerOfferNativeView.
 * The accepted offer bottom section shows the read-only AcceptedOfferSubmissionPanel.
 *
 * Run: npm run test:e2e:scratch -- --app=panda-realty --spec=apps/panda-realty/e2e/admin-properties-sales-tab-offers-rework.spec.ts
 * Spec: specs/panda-realty-buyer-offers-view-form-rework.md
 */

import { expect, test, type Page } from "@playwright/test"
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
  ACCEPTED_OFFER_NO_TOKEN,
  MOCK_SUBMISSION,
  NON_ACCEPTED_OFFER,
  NON_ACCEPTED_OFFER_NO_TOKEN,
  OFFER_ID,
  OFFER_ID_NO_TOKEN,
  OFFER_TOKEN,
} from "./helpers/offers-rework-fixtures"
import { MOCK_PROPERTY_ID } from "./helpers/panda-properties-dialog-mocks"
import { setupSalesTabMockRoutes } from "./helpers/sales-tab-mock-routes"

const SHOT_DIR = join(dirname(fileURLToPath(import.meta.url)), "screenshots", "offers-rework")

const story = createStory({ specUrl: import.meta.url, slug: "offers-rework" })

story.setWhatWasBuilt(
  "Reworks the offer form layout in the Sales Information tab: " +
  "per-row View Form toggle now opens the editable BuyerOfferNativeView (with Save/Cancel buttons) instead of the read-only BuyerOfferSubmissionPanel; " +
  "the accepted offer bottom section now shows the read-only AcceptedOfferSubmissionPanel instead of the editable form. " +
  "Files changed: panda-properties-buyer-offers-section.tsx, panda-properties-form-favorite-tabs.tsx, " +
  "panda-properties-dialog-form.tsx, accepted-offer-submission-panel.tsx (restored).",
)

// ─── Route helpers ─────────────────────────────────────────────────────────────

async function setupRoutes(
  page: Page,
  offers: unknown[],
  offerFormStatusBody: unknown = { submission: MOCK_SUBMISSION },
): Promise<void> {
  await setupSalesTabMockRoutes(page, offers, OFFER_TOKEN, PREFILL_BASE)
  // Registered after setupSalesTabMockRoutes so it takes priority (LIFO) over the blanket
  // **/api/admin/property-entities/** mock — routes the offer-form-status endpoint specifically.
  await page.route("**/api/admin/property-entities/**/offer-form-status**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(offerFormStatusBody),
    })
  })
}

async function openDialog(page: Page) {
  await page.goto("/admin/properties")
  await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible({ timeout: 30_000 })
  await page.getByTestId(`admin-entity-row--properties--${MOCK_PROPERTY_ID}`).click()
  const dialog = page.getByTestId("admin-entity-crud-dialog--properties")
  await expect(dialog).toBeVisible({ timeout: 15_000 })
  return dialog
}

async function openSalesTab(page: Page) {
  const dialog = await openDialog(page)
  await page.getByTestId("panda-properties-form-tab-trigger--sales").click()
  await expect(page.getByTestId("panda-properties-form-tab--sales")).toBeVisible()
  return dialog
}

async function openBuyersTab(page: Page) {
  const dialog = await openDialog(page)
  await page.getByTestId("panda-properties-form-tab-trigger--buyers").click()
  await expect(page.getByTestId("panda-properties-form-tab--buyers")).toBeVisible()
  return dialog
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe("Sales tab — reworked offer form layout (mocked)", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaE2eAdminCredentials()
    await signInAsAdmin(page)
    await mkdir(SHOT_DIR, { recursive: true })
  })

  test.afterAll(() => {
    story.write()
  })

  // ── Happy path: per-row editable form ────────────────────────────────────

  test("per-row View Form renders editable BuyerOfferNativeView", async ({ page }) => {
    await setupRoutes(page, [NON_ACCEPTED_OFFER])
    const dialog = await openBuyersTab(page)

    const offersSection = dialog.getByTestId("panda-properties-form-section--buyer-offers")
    const viewFormBtn = dialog.getByTestId(`buyer-offer-section-view-form-btn--${OFFER_ID}`)
    await expect(viewFormBtn).toBeVisible()

    await shotFocused(page, offersSection, SHOT_DIR, "01a-before-view-form")
    story.addScene({
      title: "01a — Per-row: View Form button visible",
      images: [join(SHOT_DIR, "01a-before-view-form.png")],
      seeing: "Latest Buyer Offers table with accepted offer row (green highlight) and View Form button.",
      steps: ["Open Sales tab with an accepted offer", "Observe View Form button on the offer row"],
    })

    await viewFormBtn.click()
    const inlineArea = dialog.getByTestId(`buyer-offer-submission-inline--${OFFER_ID}`)
    const nativeView = inlineArea.getByTestId(`buyer-offer-native-view--${OFFER_ID}`)
    await expect(nativeView).toBeVisible({ timeout: 10_000 })

    await shotFocused(page, offersSection, SHOT_DIR, "01b-after-view-form")
    story.addScene({
      title: "01b — Per-row: editable form expanded",
      images: [join(SHOT_DIR, "01b-after-view-form.png")],
      seeing: "After clicking View Form, the editable BuyerOfferNativeView expands inline below the row with input fields and Save/Cancel buttons.",
      steps: [
        "Click View Form on the offer row",
        "Observe BuyerOfferNativeView expands with editable fields",
      ],
    })
  })

  test("per-row expanded editable form has Save and Cancel buttons and Save is disabled when clean", async ({ page }) => {
    await setupRoutes(page, [NON_ACCEPTED_OFFER])
    const dialog = await openBuyersTab(page)

    await dialog.getByTestId(`buyer-offer-section-view-form-btn--${OFFER_ID}`).click()
    const inlineArea = dialog.getByTestId(`buyer-offer-submission-inline--${OFFER_ID}`)
    await expect(inlineArea.getByTestId(`buyer-offer-native-view--${OFFER_ID}`)).toBeVisible({ timeout: 10_000 })

    const saveBtn = inlineArea.getByTestId(`buyer-offer-native-view-save--${OFFER_ID}`)
    const cancelBtn = inlineArea.getByTestId(`buyer-offer-native-view-cancel--${OFFER_ID}`)
    await expect(saveBtn).toBeVisible()
    await expect(cancelBtn).toBeVisible()
    await expect(saveBtn).toBeDisabled()
  })

  // ── Happy path: accepted offer read-only panel ───────────────────────────

  test("accepted offer section has no editable inputs", async ({ page }) => {
    await setupRoutes(page, [ACCEPTED_OFFER])
    const dialog = await openSalesTab(page)

    const acceptedSection = dialog.getByTestId("panda-properties-sales-accepted-offer-section")
    await expect(acceptedSection).toBeVisible()

    // Wait for AcceptedOfferSubmissionPanel to finish loading by asserting the buyer name text is
    // visible. This avoids a fixed waitForTimeout that can exhaust the test timeout under load.
    const buyerNameEl = acceptedSection.getByText("Rework Test Buyer")
    await expect(buyerNameEl).toBeVisible({ timeout: 15_000 })

    // After rework AcceptedOfferSubmissionPanel renders here with zero inputs.
    await expect(acceptedSection.locator("input")).toHaveCount(0)
    await expect(acceptedSection.locator('[data-testid^="buyer-offer-native-view--"]')).toHaveCount(0)

    await shotFocused(page, buyerNameEl, SHOT_DIR, "02-accepted-offer-readonly")
    story.addScene({
      title: "02 — Accepted Offer: Read-Only Panel",
      images: [join(SHOT_DIR, "02-accepted-offer-readonly.png")],
      seeing: "The accepted offer section at the bottom of the Sales tab shows a read-only AcceptedOfferSubmissionPanel — no input fields, no Save/Cancel buttons.",
      steps: [
        "Open Sales tab for a property with an accepted offer",
        "Scroll to the accepted offer section",
        "Observe read-only panel with no editable inputs",
      ],
    })
  })

  test("accepted offer panel shows buyer name from submission data", async ({ page }) => {
    await setupRoutes(page, [ACCEPTED_OFFER])
    const dialog = await openSalesTab(page)

    const acceptedSection = dialog.getByTestId("panda-properties-sales-accepted-offer-section")
    // BuyerOfferSubmissionPanel renders submission.buyer1Name as text.
    // BuyerOfferNativeView (current code) does not render this as text content — only as input values.
    await expect(acceptedSection.getByText("Rework Test Buyer")).toBeVisible({ timeout: 10_000 })
  })

  // ── Edge cases ───────────────────────────────────────────────────────────

  test("per-row View Form with no token loads editable form via fallback endpoint", async ({ page }) => {
    await setupRoutes(page, [NON_ACCEPTED_OFFER_NO_TOKEN])
    const dialog = await openBuyersTab(page)

    await dialog.getByTestId(`buyer-offer-section-view-form-btn--${OFFER_ID_NO_TOKEN}`).click()
    const inlineArea = dialog.getByTestId(`buyer-offer-submission-inline--${OFFER_ID_NO_TOKEN}`)
    const nativeView = inlineArea.getByTestId(`buyer-offer-native-view--${OFFER_ID_NO_TOKEN}`)
    await expect(nativeView).toBeVisible({ timeout: 10_000 })

    await shotFocused(page, dialog.getByTestId("panda-properties-form-section--buyer-offers"), SHOT_DIR, "03-no-token-fallback")
    story.addScene({
      title: "03 — Per-row: No Token, Fallback Endpoint",
      images: [join(SHOT_DIR, "03-no-token-fallback.png")],
      seeing: "When an offer row has no offerFormToken, clicking View Form still opens the editable form via the admin fallback endpoint.",
      steps: [
        "Offer has no offerFormToken",
        "Click View Form",
        "Observe editable form loads via /api/admin/buyer-offers/[id]/form-view",
      ],
    })
  })

  test("accepted offer with no submission shows not-yet-submitted state", async ({ page }) => {
    await setupRoutes(page, [ACCEPTED_OFFER], { submission: null })
    const dialog = await openSalesTab(page)

    const noSubmission = dialog.getByTestId("panda-properties-sales-accepted-offer-no-submission")
    await expect(noSubmission).toBeVisible({ timeout: 10_000 })

    const acceptedSection = dialog.getByTestId("panda-properties-sales-accepted-offer-section")
    await shotFocused(page, acceptedSection, SHOT_DIR, "04-no-submission")
    story.addScene({
      title: "04 — Accepted Offer: Not Yet Submitted",
      images: [join(SHOT_DIR, "04-no-submission.png")],
      seeing: "When the accepted offer buyer has not submitted the form, the accepted offer section shows a not-yet-submitted placeholder.",
      steps: [
        "Accepted offer exists but buyer has not submitted",
        "Observe not-yet-submitted state in accepted offer section",
      ],
    })
  })

  test("no accepted offer shows empty buyer offers table in Buyers tab", async ({ page }) => {
    await setupRoutes(page, [])
    const dialog = await openBuyersTab(page)

    const offersSection = dialog.getByTestId("panda-properties-form-section--buyer-offers")
    await expect(offersSection).toBeVisible()
    await expect(offersSection).toContainText("No results")

    await shotFocused(page, offersSection, SHOT_DIR, "05-no-offer-empty-buyers-tab")
    story.addScene({
      title: "05 — No Accepted Offer: Buyers Tab with Empty Offers Table",
      images: [join(SHOT_DIR, "05-no-offer-empty-buyers-tab.png")],
      seeing: "When no accepted offer exists the Buyers tab is the default. The Latest Buyer Offers table shows No results.",
      steps: ["Open property with no accepted offer", "Buyers tab is active by default", "Observe empty offers table with No results"],
    })
  })

  // ── Regression ───────────────────────────────────────────────────────────

  test("per-row Hide Form collapses the expanded editable form", async ({ page }) => {
    await setupRoutes(page, [NON_ACCEPTED_OFFER])
    const dialog = await openBuyersTab(page)

    const viewFormBtn = dialog.getByTestId(`buyer-offer-section-view-form-btn--${OFFER_ID}`)
    await viewFormBtn.click()
    const inlineArea = dialog.getByTestId(`buyer-offer-submission-inline--${OFFER_ID}`)
    await expect(inlineArea.getByTestId(`buyer-offer-native-view--${OFFER_ID}`)).toBeVisible({ timeout: 10_000 })

    await expect(viewFormBtn).toContainText(/hide form/i)
    await viewFormBtn.click()
    await expect(inlineArea).toHaveCount(0)
  })
})
