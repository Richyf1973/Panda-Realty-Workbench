/**
 * E2E: OFFER FORM SUBMISSION panel — Print button (admin Sales tab)
 *
 * A property with an accepted offer shows the read-only AcceptedOfferSubmissionPanel in the
 * Sales Information tab. This feature adds a Print button beside the heading that opens the
 * browser print dialog, isolates the panel for print (white layout, no app chrome), and adds a
 * print-only header with the property address + print date.
 *
 * Run: npm run test:e2e:scratch -- --app=panda-realty --spec=apps/panda-realty/e2e/admin-properties-offer-submission-print.spec.ts --no-bail
 * Spec: specs/panda-realty-offer-submission-print.md
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
  MOCK_SUBMISSION,
  OFFER_TOKEN,
} from "./helpers/offers-rework-fixtures"
import { MOCK_PROPERTY_ID } from "./helpers/panda-properties-dialog-mocks"
import { setupSalesTabMockRoutes } from "./helpers/sales-tab-mock-routes"

const SHOT_DIR = join(dirname(fileURLToPath(import.meta.url)), "screenshots", "offer-submission-print")

const story = createStory({ specUrl: import.meta.url, slug: "offer-submission-print" })

story.setWhatWasBuilt(
  "Adds a Print button to the read-only OFFER FORM SUBMISSION panel in the property dialog Sales tab. " +
  "The button (print:hidden) calls window.print(); a global @media print rule isolates the panel " +
  "(white background, black text, no sidebar/contact-bar/tabs/Save footer); and a print-only header " +
  "shows the property address and the print date. Files: accepted-offer-submission-panel.tsx, " +
  "buyer-offer-submission-panel.tsx, panda-properties-form-favorite-tabs.tsx, app/globals.css.",
)

// ─── Route helpers ─────────────────────────────────────────────────────────────

async function setupRoutes(
  page: Page,
  offerFormStatusBody: unknown = { submission: MOCK_SUBMISSION },
): Promise<void> {
  await setupSalesTabMockRoutes(page, [ACCEPTED_OFFER], OFFER_TOKEN, PREFILL_BASE)
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

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe("Offer submission panel — Print button (mocked)", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaE2eAdminCredentials()
    await signInAsAdmin(page)
    await mkdir(SHOT_DIR, { recursive: true })
  })

  test.afterAll(() => {
    story.write()
  })

  // ── Happy path ─────────────────────────────────────────────────────────────

  test("Print button renders inline beside the Offer Form Submission heading", async ({ page }) => {
    await setupRoutes(page)
    const dialog = await openSalesTab(page)

    const acceptedSection = dialog.getByTestId("panda-properties-sales-accepted-offer-section")
    // Wait for the panel to finish loading via the buyer name text.
    await expect(acceptedSection.getByText("Rework Test Buyer")).toBeVisible({ timeout: 15_000 })

    const printBtn = acceptedSection.getByTestId("offer-submission-print-button")
    await expect(printBtn).toBeVisible()
    await expect(printBtn).toContainText(/print/i)

    await shotFocused(page, acceptedSection, SHOT_DIR, "01-print-button")
    story.addScene({
      title: "01 — Print button beside the heading",
      images: [join(SHOT_DIR, "01-print-button.png")],
      seeing: "The OFFER FORM SUBMISSION panel shows a Print button inline to the right of the heading.",
      steps: [
        "Open a property with an accepted offer",
        "Open the Sales Information tab",
        "Observe the Print button beside the Offer Form Submission heading",
      ],
    })
  })

  test("clicking Print calls window.print()", async ({ page }) => {
    await page.addInitScript(() => {
      ;(window as unknown as { __printCalls: number }).__printCalls = 0
      window.print = () => {
        ;(window as unknown as { __printCalls: number }).__printCalls++
      }
    })
    await setupRoutes(page)
    const dialog = await openSalesTab(page)

    const acceptedSection = dialog.getByTestId("panda-properties-sales-accepted-offer-section")
    await expect(acceptedSection.getByText("Rework Test Buyer")).toBeVisible({ timeout: 15_000 })

    await acceptedSection.getByTestId("offer-submission-print-button").click()

    await expect
      .poll(() => page.evaluate(() => (window as unknown as { __printCalls: number }).__printCalls), {
        timeout: 5_000,
      })
      .toBeGreaterThan(0)
  })

  test("Print button carries the print:hidden class", async ({ page }) => {
    await setupRoutes(page)
    const dialog = await openSalesTab(page)

    const acceptedSection = dialog.getByTestId("panda-properties-sales-accepted-offer-section")
    await expect(acceptedSection.getByText("Rework Test Buyer")).toBeVisible({ timeout: 15_000 })

    const printBtn = acceptedSection.getByTestId("offer-submission-print-button")
    await expect(printBtn).toHaveClass(/print:hidden/)
  })

  // ── Structure / print-only ──────────────────────────────────────────────────

  test("print area wraps the panel content", async ({ page }) => {
    await setupRoutes(page)
    const dialog = await openSalesTab(page)

    const acceptedSection = dialog.getByTestId("panda-properties-sales-accepted-offer-section")
    await expect(acceptedSection.getByText("Rework Test Buyer")).toBeVisible({ timeout: 15_000 })

    const printArea = acceptedSection.getByTestId("offer-submission-print-area")
    await expect(printArea).toHaveCount(1)
    // The submission content lives inside the print area.
    await expect(printArea.getByText("Rework Test Buyer")).toBeVisible()
  })

  test("print-only header has the property address and Printed date, hidden on screen", async ({ page }) => {
    await setupRoutes(page)
    const dialog = await openSalesTab(page)

    const acceptedSection = dialog.getByTestId("panda-properties-sales-accepted-offer-section")
    await expect(acceptedSection.getByText("Rework Test Buyer")).toBeVisible({ timeout: 15_000 })

    const printHeader = acceptedSection.getByTestId("offer-submission-print-header")
    await expect(printHeader).toHaveCount(1)
    // Print-only: not visible on the on-screen (non-print) layout.
    await expect(printHeader).toBeHidden()

    const headerText = (await printHeader.textContent()) ?? ""
    expect(headerText).toContain("12 Test Street")
    expect(headerText).toMatch(/Printed/i)
  })

  // ── Edge case ────────────────────────────────────────────────────────────────

  test("no submission → not-yet-submitted state and no Print button", async ({ page }) => {
    await setupRoutes(page, { submission: null })
    const dialog = await openSalesTab(page)

    const acceptedSection = dialog.getByTestId("panda-properties-sales-accepted-offer-section")
    await expect(dialog.getByTestId("panda-properties-sales-accepted-offer-no-submission")).toBeVisible({
      timeout: 10_000,
    })
    await expect(acceptedSection.getByTestId("offer-submission-print-button")).toHaveCount(0)
  })
})
