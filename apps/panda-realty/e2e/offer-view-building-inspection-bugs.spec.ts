// Run: npm run test:e2e:scratch -- --app=panda-realty --spec=apps/panda-realty/e2e/offer-view-building-inspection-bugs.spec.ts --no-bail

import { expect, test, type Page } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { createStory, shotFocused } from "@repo/e2e-utils"

import { e2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import {
  OFFER_ACCEPTED,
  openSalesTabWithOfferFormStatus,
} from "./helpers/admin-offer-form-edit-fixtures"

const SHOT_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "screenshots",
  "offer-view-building-inspection-bugs",
)

const story = createStory({
  specUrl: import.meta.url,
  slug: "offer-view-building-inspection-bugs",
})

story.setWhatWasBuilt(
  "Fixed two display bugs in panda-realty. " +
  "Bug 1: Cooling Off and Cash Buyer radio option label spans in offer-form-section4-terms.tsx lacked data-testid attributes on the text spans; added labelTestId prop to OfferRadio and wired it to those radio groups. " +
  "Bug 2: The building inspection recommendation (suggestBuildingCompanies) was not shown in the admin accepted offer panel — updated BuyerOfferSubmissionPanel to display a white question box with read-only radio buttons (Yes, please / No, I have my own) below the Building & Pest row.",
)

// ── Fixtures ─────────────────────────────────────────────────────────────────

const MOCK_TOKEN = "test-offer-form-token-bugs"

const PREFILL_VIEW_MODE = {
  propertyAddress: "45 Test Street, QLD 4505",
  buyers: [{ name: "John Smith", phone: "0400 111 222", email: "john@example.com", address: "" }],
  rep: null,
  solicitorName: null,
  solicitorPhone: null,
  solicitorAddress: null,
  solicitorEmail: null,
  offerAmount: "980000",
  depositInitial: "2000",
  depositBalance: "18000",
  isCashOffer: false,
  isSubjectToFinance: true,
  financeBank: "CBA",
  financeApprovalDays: "7",
  waiveCoolingOff: false,
  buildingPestDays: 7,
  suggestBuildingCompanies: true,
  isSubjectToSale: false,
  settlementPeriod: "30",
  viewMode: true,
}

function buildSubmission(overrides: Record<string, unknown>) {
  return {
    submittedAt: "2026-05-28T00:00:00Z",
    buyer1Name: "Test Buyer 2",
    buyer2Name: null,
    buyerPhone: "045445888",
    buyerEmail: "richardtrading1973@gmail.com",
    buyerAddress: null,
    offerAmount: "980000",
    isCashBuyer: false,
    buildingPestInspection: "7_days",
    suggestBuildingCompanies: true,
    waiveCoolingOff: false,
    totalDeposit: "20000",
    initialPayment: "2000",
    secondPayment: "18000",
    settlementPeriod: "61",
    isSubjectToSale: true,
    salePropertyAddress: "89 Tripciny Street",
    salePropertyStatus: "to_be_listed",
    saleTimeframeDays: null,
    saleSettlementDate: null,
    saleIsUnconditional: null,
    saleUnconditionalDate: null,
    saleBuyerSettlementDate: null,
    saleActiveConditions: null,
    saleConditionsElaboration: null,
    saleFreeAppraisal: true,
    isSubjectToFinance: false,
    financePreApproved: false,
    financeDaysToApprove: "7",
    financeBank: "Cba",
    financeBankPhone: null,
    financeBankContactName: null,
    financeBankContactEmail: null,
    solicitorName: null,
    solicitorPhone: null,
    solicitorAddress: null,
    solicitorEmail: null,
    extraComments: null,
    buyersJson: null,
    saleDaysBeforeListingLive: 7,
    saleDaysToGetSaleContract: 30,
    saleDaysToGetUnconditionalContract: 45,
    saleDaysToSettleExistingProperty: 60,
    ...overrides,
  }
}

function buildOfferFormStatus(submission: ReturnType<typeof buildSubmission> | null) {
  return {
    token: "edit-token-abc",
    formUrl: "http://localhost:3044/offer-form/edit-token-abc",
    entityEmail: "test@buyer.com",
    submission,
  }
}

async function routeOfferFormViewMode(page: Page) {
  await page.route(`**/api/offer-form/${MOCK_TOKEN}**`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(PREFILL_VIEW_MODE),
    })
  })
}

// ── Setup ─────────────────────────────────────────────────────────────────────

test.beforeEach(async ({ page }) => {
  if (!e2eAdminCredentials) throw new Error("E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set in .env.local")
  await mkdir(SHOT_DIR, { recursive: true })
  await page.route("**/api/admin/property-status**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [] }) })
  })
  await page.route("**/api/admin/buyer-status**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [] }) })
  })
})

test.afterAll(() => {
  story.write()
})

// ── Bug 1: Offer view page — radio option labels visible ──────────────────────

test("Bug1 — Cooling Off option labels are visible in offer view page", async ({ page }) => {
  await routeOfferFormViewMode(page)
  await page.goto(`/offer-form/${MOCK_TOKEN}?view=1`)
  await expect(page.getByTestId("offer-form-view-mode-banner")).toBeVisible({ timeout: 10_000 })

  const yesLabel = page.getByTestId("offer-form-cooling-off-label-yes")
  const noLabel = page.getByTestId("offer-form-cooling-off-label-no")

  await expect(yesLabel).toBeVisible({ timeout: 8_000 })
  await expect(noLabel).toBeVisible({ timeout: 8_000 })
  await expect(yesLabel).toContainText("Yes, Waive Period")
  await expect(noLabel).toContainText("No, Retain Statutory Period")

  const section4 = page.getByTestId("offer-form-section4")
  await shotFocused(page, yesLabel, SHOT_DIR, "01a-cooling-off-labels")

  story.addScene({
    title: "01 — Bug 1: Cooling Off labels visible",
    images: [join(SHOT_DIR, "01a-cooling-off-labels.png")],
    seeing: "The Cooling Off radio group shows Yes, Waive Period and No, Retain Statutory Period labels next to the radio dots — not bare invisible dots.",
    steps: [
      "Open the offer form in view mode (?view=1)",
      "Scroll to Section 4 Offer Contingencies and Terms",
      "Observe the Cooling Off radio labels are visible with text",
    ],
  })
})

test("Bug1 — Cash Buyer option labels are visible in offer view page", async ({ page }) => {
  await routeOfferFormViewMode(page)
  await page.goto(`/offer-form/${MOCK_TOKEN}?view=1`)
  await expect(page.getByTestId("offer-form-view-mode-banner")).toBeVisible({ timeout: 10_000 })

  const yesLabel = page.getByTestId("offer-form-cash-buyer-label-yes")
  const noLabel = page.getByTestId("offer-form-cash-buyer-label-no")

  await expect(yesLabel).toBeVisible({ timeout: 8_000 })
  await expect(noLabel).toBeVisible({ timeout: 8_000 })
  await expect(yesLabel).toContainText("Yes (Unconditional on Finance)")
  await expect(noLabel).toContainText("No (Subject to Finance / Terms)")

  await shotFocused(page, yesLabel, SHOT_DIR, "02a-cash-buyer-labels")

  story.addScene({
    title: "02 — Bug 1: Cash Buyer labels visible",
    images: [join(SHOT_DIR, "02a-cash-buyer-labels.png")],
    seeing: "The Cash Buyer radio group shows both option labels with visible text — not bare radio dots.",
    steps: [
      "Open the offer form in view mode",
      "Scroll to Section 4",
      "Observe Cash Buyer radio labels are visible",
    ],
  })
})

// ── Bug 2: Recommend Inspectors row in submission panel ───────────────────────

test("Bug2 — Recommend Inspectors row shows Yes in submission panel when suggestBuildingCompanies=true", async ({ page }) => {
  await signInAsAdmin(page)
  const submission = buildSubmission({ suggestBuildingCompanies: true, buildingPestInspection: "7_days" })
  const status = buildOfferFormStatus(submission)

  await openSalesTabWithOfferFormStatus(page, [OFFER_ACCEPTED], OFFER_ACCEPTED.propertyEntityId, status)

  const panel = page.getByTestId(`buyer-offer-form-submission-panel--${OFFER_ACCEPTED.propertyEntityId}`)
  await expect(panel).toBeVisible({ timeout: 8_000 })

  const suggestBox = panel.getByTestId("suggest-building-companies-box")
  await expect(suggestBox).toBeVisible({ timeout: 5_000 })
  await expect(suggestBox.getByText("Yes, please")).toBeVisible()

  await shotFocused(page, suggestBox, SHOT_DIR, "03a-recommend-inspectors-yes")

  story.addScene({
    title: "03 — Bug 2: Recommend Inspectors shows Yes",
    images: [join(SHOT_DIR, "03a-recommend-inspectors-yes.png")],
    seeing: "Below the Building & Pest row, a white question box appears asking 'Would you like My Panda Realty to recommend credentialed building inspection providers?' with Yes, please selected.",
    steps: [
      "Open admin property dialog, go to Sales tab",
      "Observe the accepted offer submission panel with BP inspection and suggestBuildingCompanies=true",
      "Verify the white question box shows Yes, please as the selected radio option",
    ],
  })
})

test("Bug2 — Recommend Inspectors row shows No when suggestBuildingCompanies=false", async ({ page }) => {
  await signInAsAdmin(page)
  const submission = buildSubmission({ suggestBuildingCompanies: false, buildingPestInspection: "7_days" })
  const status = buildOfferFormStatus(submission)

  await openSalesTabWithOfferFormStatus(page, [OFFER_ACCEPTED], OFFER_ACCEPTED.propertyEntityId, status)

  const panel = page.getByTestId(`buyer-offer-form-submission-panel--${OFFER_ACCEPTED.propertyEntityId}`)
  await expect(panel).toBeVisible({ timeout: 8_000 })

  const suggestBox = panel.getByTestId("suggest-building-companies-box")
  await expect(suggestBox).toBeVisible({ timeout: 5_000 })
  await expect(suggestBox.getByText("No, I have my own")).toBeVisible()

  await shotFocused(page, suggestBox, SHOT_DIR, "04a-recommend-inspectors-no")

  story.addScene({
    title: "04 — Bug 2: Recommend Inspectors shows No",
    images: [join(SHOT_DIR, "04a-recommend-inspectors-no.png")],
    seeing: "When the buyer chose not to have inspector recommendations, the white question box shows No, I have my own as the selected radio option.",
    steps: [
      "Open the Sales tab with an accepted offer where suggestBuildingCompanies=false",
      "Observe the white question box with No, I have my own selected",
    ],
  })
})

// ── Edge cases ────────────────────────────────────────────────────────────────

test("Bug2 edge — Recommend Inspectors row absent when buildingPestInspection is null", async ({ page }) => {
  await signInAsAdmin(page)
  const submission = buildSubmission({ suggestBuildingCompanies: null, buildingPestInspection: null })
  const status = buildOfferFormStatus(submission)

  await openSalesTabWithOfferFormStatus(page, [OFFER_ACCEPTED], OFFER_ACCEPTED.propertyEntityId, status)

  const panel = page.getByTestId(`buyer-offer-form-submission-panel--${OFFER_ACCEPTED.propertyEntityId}`)
  await expect(panel).toBeVisible({ timeout: 8_000 })

  await expect(panel.getByTestId("suggest-building-companies-box")).not.toBeVisible()

  await shotFocused(page, panel, SHOT_DIR, "05-no-bp-no-recommend-row")

  story.addScene({
    title: "05 — Edge: No BP inspection means no recommend question box",
    images: [join(SHOT_DIR, "05-no-bp-no-recommend-row.png")],
    seeing: "When building pest inspection was not requested, the white recommend inspectors question box does not appear in the accepted offer panel.",
    steps: [
      "Open the Sales tab with an accepted offer where buildingPestInspection is null",
      "Confirm the suggest-building-companies-box is absent",
    ],
  })
})

test("Bug2 edge — Recommend Inspectors row absent when buildingPestInspection is no", async ({ page }) => {
  await signInAsAdmin(page)
  const submission = buildSubmission({ suggestBuildingCompanies: null, buildingPestInspection: "no" })
  const status = buildOfferFormStatus(submission)

  await openSalesTabWithOfferFormStatus(page, [OFFER_ACCEPTED], OFFER_ACCEPTED.propertyEntityId, status)

  const panel = page.getByTestId(`buyer-offer-form-submission-panel--${OFFER_ACCEPTED.propertyEntityId}`)
  await expect(panel).toBeVisible({ timeout: 8_000 })

  await expect(panel.getByTestId("suggest-building-companies-box")).not.toBeVisible()

  await shotFocused(page, panel, SHOT_DIR, "06-bp-no-no-recommend-row")

  story.addScene({
    title: "06 — Edge: BP inspection declined means no recommend question box",
    images: [join(SHOT_DIR, "06-bp-no-no-recommend-row.png")],
    seeing: "When building pest inspection was explicitly declined (no), the white recommend inspectors question box does not appear in the accepted offer panel.",
    steps: [
      "Open the Sales tab with an accepted offer where buildingPestInspection=no",
      "Confirm the suggest-building-companies-box is absent",
    ],
  })
})
