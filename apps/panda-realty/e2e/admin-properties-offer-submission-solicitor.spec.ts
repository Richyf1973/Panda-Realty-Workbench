/**
 * E2E: Offer Form Submission panel — Solicitor section always visible
 *
 * Verifies that the Solicitor section heading in BuyerOfferSubmissionPanel:
 *   1. Is always visible (even when all solicitor fields are null) — 2B decision
 *   2. Shows name, phone, address, email rows when submission has solicitor data
 *
 * Run: npm run test:e2e:scratch -- --app=panda-realty --spec=apps/panda-realty/e2e/admin-properties-offer-submission-solicitor.spec.ts --no-bail
 * Spec: specs/panda-realty-offer-form-solicitors-missing.md
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

const SHOT_DIR = join(dirname(fileURLToPath(import.meta.url)), "screenshots", "offer-submission-solicitor")

const story = createStory({ specUrl: import.meta.url, slug: "offer-submission-solicitor" })

story.setWhatWasBuilt(
  "Fixes the Solicitor section in the BuyerOfferSubmissionPanel (shown in the Sales Information tab): " +
  "(1) The Solicitor heading is now always visible regardless of whether solicitor fields are null (2B decision). " +
  "(2) The form-data PATCH endpoint now also persists solicitor fields to offerFormSubmissions so admin-entered solicitor data appears in the panel. " +
  "(3) When no submission record exists, a minimal offerFormSubmissions row is created (1B decision). " +
  "(4) The panel now shows a separate 'Seller's Solicitor' block (sourced from the seller-tagged Solicitor " +
  "contact via entities.association='Seller'); the existing block is relabelled 'Buyer's Solicitor'. " +
  "Files changed: buyer-offer-submission-panel.tsx, offer-form-status/route.ts, lib/admin/seller-solicitor.server.ts.",
)

// ─── Submission fixtures ───────────────────────────────────────────────────────

const SUBMISSION_NULL_SOLICITOR: Submission = {
  ...MOCK_SUBMISSION,
  solicitorName: null,
  solicitorPhone: null,
  solicitorAddress: null,
  solicitorEmail: null,
}

const SUBMISSION_WITH_SOLICITOR: Submission = {
  ...MOCK_SUBMISSION,
  solicitorName: "Jane Solicitor",
  solicitorPhone: "0412000001",
  solicitorAddress: "5 Law St, Brisbane QLD 4000",
  solicitorEmail: "jane@lawfirm.com.au",
}

const SUBMISSION_NAME_PHONE_ONLY: Submission = {
  ...MOCK_SUBMISSION,
  solicitorName: "Bob Conveyancer",
  solicitorPhone: "0422000002",
  solicitorAddress: null,
  solicitorEmail: null,
}

// Buyer's solicitor (from the submission) and the seller's solicitor (from the seller-tagged
// Solicitor contact) are distinct people shown in separate, clearly-labelled blocks.
const SUBMISSION_WITH_BOTH_SOLICITORS: Submission = {
  ...MOCK_SUBMISSION,
  solicitorName: "Jane Buyer-Solicitor",
  solicitorPhone: "0412000001",
  solicitorAddress: "5 Law St, Brisbane QLD 4000",
  solicitorEmail: "jane@buyerlaw.com.au",
  sellerSolicitorName: "Everingham Wallace",
  sellerSolicitorPhone: "0754958888",
  sellerSolicitorAddress: "1 Church Street",
  sellerSolicitorEmail: "julia@everinghamwallace.com.au",
}

// ─── Route helpers ─────────────────────────────────────────────────────────────

async function setupRoutes(
  page: Page,
  submission: Submission | null,
): Promise<void> {
  await setupSalesTabMockRoutes(page, [ACCEPTED_OFFER], OFFER_TOKEN, PREFILL_BASE)
  await page.route("**/api/admin/property-entities/**/offer-form-status**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ submission }),
    })
  })
}

async function openSalesTab(page: Page) {
  await page.goto("/admin/properties")
  // Allow up to 60s on cold-start: Next.js compiles /admin/properties on first access.
  await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible({ timeout: 60_000 })
  await page.getByTestId(`admin-entity-row--properties--${MOCK_PROPERTY_ID}`).click()
  const dialog = page.getByTestId("admin-entity-crud-dialog--properties")
  await expect(dialog).toBeVisible({ timeout: 15_000 })
  await page.getByTestId("panda-properties-form-tab-trigger--sales").click()
  await expect(page.getByTestId("panda-properties-form-tab--sales")).toBeVisible()
  return dialog
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe("Offer submission panel — Solicitor section (mocked)", () => {
  test.setTimeout(120_000)

  test.beforeEach(async ({ page }) => {
    requirePandaE2eAdminCredentials()
    await signInAsAdmin(page)
    await mkdir(SHOT_DIR, { recursive: true })
  })

  test.afterAll(() => {
    story.write()
  })

  // ── Happy path: solicitor heading always visible ──────────────────────────

  test("Solicitor heading visible when all solicitor fields are null", async ({ page }) => {
    await setupRoutes(page, SUBMISSION_NULL_SOLICITOR)
    const dialog = await openSalesTab(page)

    const acceptedSection = dialog.getByTestId("panda-properties-sales-accepted-offer-section")
    // Wait for the panel to finish loading (other fields render first)
    await expect(acceptedSection.getByText("Rework Test Buyer")).toBeVisible({ timeout: 15_000 })

    const submissionPanel = acceptedSection.getByTestId(`buyer-offer-form-submission-panel--${ACCEPTED_OFFER.propertyEntityId}`)
    await expect(submissionPanel).toBeVisible({ timeout: 10_000 })

    // 2B: Solicitor heading must always be visible even when all fields are null.
    // Pre-fix: the outer conditional hides the section when all three null → fails.
    // Post-fix: conditional removed, heading always rendered.
    const solicitorSection = submissionPanel.getByTestId("panda-offer-submission-solicitor")
    await expect(solicitorSection).toBeVisible({ timeout: 5_000 })

    await shotFocused(page, submissionPanel, SHOT_DIR, "01a-solicitor-null-fields")
    story.addScene({
      title: "01a — Solicitor Heading: Null Fields",
      images: [join(SHOT_DIR, "01a-solicitor-null-fields.png")],
      seeing: "The Offer Form Submission panel showing the Solicitor section heading even when all solicitor fields are null. Individual rows (name, phone, etc.) are not shown since there is no data.",
      steps: [
        "Open Edit property dialog for a property with an accepted offer",
        "Switch to Sales Information tab",
        "Submission has null solicitorName, solicitorPhone, solicitorEmail, solicitorAddress",
        "Observe Solicitor heading is always visible",
      ],
    })
  })

  // ── Happy path: solicitor data populates rows ─────────────────────────────

  test("Solicitor section shows name, phone, address and email rows when all fields are populated", async ({ page }) => {
    await setupRoutes(page, SUBMISSION_WITH_SOLICITOR)
    const dialog = await openSalesTab(page)

    const acceptedSection = dialog.getByTestId("panda-properties-sales-accepted-offer-section")
    await expect(acceptedSection.getByText("Rework Test Buyer")).toBeVisible({ timeout: 15_000 })

    const submissionPanel = acceptedSection.getByTestId(`buyer-offer-form-submission-panel--${ACCEPTED_OFFER.propertyEntityId}`)

    // Solicitor section must exist with a stable testid
    const solicitorSection = submissionPanel.getByTestId("panda-offer-submission-solicitor")
    await expect(solicitorSection).toBeVisible({ timeout: 5_000 })

    // All four data rows should be visible
    await expect(solicitorSection).toContainText("Jane Solicitor")
    await expect(solicitorSection).toContainText("0412000001")
    await expect(solicitorSection).toContainText("5 Law St, Brisbane QLD 4000")
    await expect(solicitorSection).toContainText("jane@lawfirm.com.au")

    await shotFocused(page, submissionPanel, SHOT_DIR, "02-solicitor-with-data")
    story.addScene({
      title: "02 — Solicitor Section: Fully Populated",
      images: [join(SHOT_DIR, "02-solicitor-with-data.png")],
      seeing: "The Solicitor section in the submission panel showing all four rows: Name, Phone, Address, and Email.",
      steps: [
        "Submission has all solicitor fields populated",
        "Observe Solicitor heading and all four data rows visible",
      ],
    })
  })

  // ── Edge case: name + phone only (no email) ───────────────────────────────

  test("Solicitor heading visible and name row shown when only name and phone are present", async ({ page }) => {
    await setupRoutes(page, SUBMISSION_NAME_PHONE_ONLY)
    const dialog = await openSalesTab(page)

    const acceptedSection = dialog.getByTestId("panda-properties-sales-accepted-offer-section")
    await expect(acceptedSection.getByText("Rework Test Buyer")).toBeVisible({ timeout: 15_000 })

    const submissionPanel = acceptedSection.getByTestId(`buyer-offer-form-submission-panel--${ACCEPTED_OFFER.propertyEntityId}`)
    const solicitorSection = submissionPanel.getByTestId("panda-offer-submission-solicitor")
    await expect(solicitorSection).toBeVisible({ timeout: 5_000 })

    await expect(solicitorSection).toContainText("Bob Conveyancer")
    await expect(solicitorSection).toContainText("0422000002")

    await shotFocused(page, submissionPanel, SHOT_DIR, "03a-solicitor-name-phone-before")
    story.addScene({
      title: "03 — Solicitor Section: Name and Phone Only",
      images: [join(SHOT_DIR, "03a-solicitor-name-phone-before.png")],
      seeing: "Solicitor section visible with name and phone rows. Address and email rows are absent (null).",
      steps: [
        "Submission has solicitorName and solicitorPhone only",
        "Observe heading visible, name and phone rows present, address/email rows absent",
      ],
    })
  })

  // ── Seller's solicitor block: distinct from the buyer's, labelled clearly ──

  test("shows separate Buyer's Solicitor and Seller's Solicitor blocks with the right people", async ({ page }) => {
    await setupRoutes(page, SUBMISSION_WITH_BOTH_SOLICITORS)
    const dialog = await openSalesTab(page)

    const acceptedSection = dialog.getByTestId("panda-properties-sales-accepted-offer-section")
    await expect(acceptedSection.getByText("Rework Test Buyer")).toBeVisible({ timeout: 15_000 })

    const submissionPanel = acceptedSection.getByTestId(`buyer-offer-form-submission-panel--${ACCEPTED_OFFER.propertyEntityId}`)

    // Buyer's solicitor (relabelled from the old "Solicitor") still shows the submission solicitor.
    const buyerSolicitor = submissionPanel.getByTestId("panda-offer-submission-solicitor")
    await expect(buyerSolicitor).toContainText("Buyer's Solicitor")
    await expect(buyerSolicitor).toContainText("Jane Buyer-Solicitor")

    // Seller's solicitor block is new and sourced from the seller-tagged contact.
    const sellerSolicitor = submissionPanel.getByTestId("panda-offer-submission-seller-solicitor")
    await expect(sellerSolicitor).toBeVisible({ timeout: 5_000 })
    await expect(sellerSolicitor).toContainText("Seller's Solicitor")
    await expect(sellerSolicitor).toContainText("Everingham Wallace")
    await expect(sellerSolicitor).toContainText("julia@everinghamwallace.com.au")

    await shotFocused(page, submissionPanel, SHOT_DIR, "05-buyer-and-seller-solicitors")
    story.addScene({
      title: "05 — Buyer's and Seller's Solicitor Blocks",
      images: [join(SHOT_DIR, "05-buyer-and-seller-solicitors.png")],
      seeing: "The submission panel showing two distinct solicitor blocks: 'Buyer's Solicitor' (Jane Buyer-Solicitor, from the offer form) and 'Seller's Solicitor' (Everingham Wallace, from the seller-tagged contact).",
      steps: [
        "Property has a seller-tagged Solicitor contact and a buyer who entered their own solicitor on the offer form",
        "Open Edit property → Sales Information tab",
        "Observe a 'Buyer's Solicitor' block and a separate 'Seller's Solicitor' block with the correct people",
      ],
    })
  })

  // ── Edge case: 2B — null solicitor shows heading with no data rows ────────

  test("Solicitor section heading present but no data rows rendered when all fields null", async ({ page }) => {
    await setupRoutes(page, SUBMISSION_NULL_SOLICITOR)
    const dialog = await openSalesTab(page)

    const acceptedSection = dialog.getByTestId("panda-properties-sales-accepted-offer-section")
    await expect(acceptedSection.getByText("Rework Test Buyer")).toBeVisible({ timeout: 15_000 })

    const submissionPanel = acceptedSection.getByTestId(`buyer-offer-form-submission-panel--${ACCEPTED_OFFER.propertyEntityId}`)
    const solicitorSection = submissionPanel.getByTestId("panda-offer-submission-solicitor")
    await expect(solicitorSection).toBeVisible({ timeout: 5_000 })

    // When all null: heading present but no name/phone/email/address content
    await expect(solicitorSection).not.toContainText("Name:")
    await expect(solicitorSection).not.toContainText("Phone:")
    await expect(solicitorSection).not.toContainText("Email:")

    await shotFocused(page, submissionPanel, SHOT_DIR, "04-solicitor-null-heading-only")
    story.addScene({
      title: "04 — Solicitor Section: Heading Only (All Null)",
      images: [join(SHOT_DIR, "04-solicitor-null-heading-only.png")],
      seeing: "The Solicitor heading is visible in the panel but no data rows appear beneath it since all fields are null.",
      steps: [
        "All solicitor fields are null in the submission",
        "Heading is visible",
        "No name/phone/address/email rows rendered",
      ],
    })
  })
})
