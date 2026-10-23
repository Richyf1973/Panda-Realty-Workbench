/**
 * E2E (user-run scratch): Disclosure date field in the Sales tab for Manufactured Home properties.
 *
 * Verifies:
 *   1. "Disclosure date" field appears beside "Contract date" for Manufactured Home properties
 *   2. "Disclosure date" field is absent for non-MH properties (e.g. "House")
 *   3. Cooling Off deadline in the submission panel counts from disclosureDate when provided
 *   4. Other milestones (B&P, Finance) still count from contractDate
 *
 * Uses mocked APIs — no live DB required.
 *
 * Run (user, after `npm run dev:panda-realty`):
 *   npm run test:e2e:scratch -- --app=panda-realty --spec="apps/panda-realty/e2e/disclosure-date-sales-tab.scratch.spec.ts" --no-bail
 */

import { expect, test, type Route } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { createStory, shotFocused } from "@repo/e2e-utils"

import { e2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import {
  EMPTY_PROPERTY_ENTITIES_RESPONSE,
  PROPERTY_EDIT_WITH_BUYER,
  SINGLE_PROPERTY_RESPONSE,
  STATUS_LIST_RESPONSE,
} from "./helpers/admin-properties-mocks"
import { OFFER_ACCEPTED } from "./helpers/admin-offer-form-edit-fixtures"

const SHOT_DIR = join(dirname(fileURLToPath(import.meta.url)), "screenshots", "disclosure-date-sales-tab")

const story = createStory({ specUrl: import.meta.url, slug: "disclosure-date-sales-tab" })
story.setWhatWasBuilt(
  "A 'Disclosure date' field appears beside 'Contract date' in the Sales tab for Manufactured Home properties. " +
    "The cooling off deadline in the offer submission panel counts from this date when set; all other milestones remain anchored to the contract date. " +
    "For non-MH properties the field is hidden. Files: panda-properties-form-favorite-tabs.tsx (UI), " +
    "buyer-offer-submission-panel.tsx (deadline split), offer-form-status route (returns disclosureDate).",
)

// ── Shared property overrides ──────────────────────────────────────────────────

const PROPERTY_MH = { ...PROPERTY_EDIT_WITH_BUYER, propertyType: "Manufactured Home" }
const PROPERTY_HOUSE = { ...PROPERTY_EDIT_WITH_BUYER, propertyType: "House" }

// contractDate = Mon 1 Jun 2026; disclosureDate = Mon 8 Jun 2026 (7 days later)
// Cooling off = 21 days:
//   from contractDate:   +21 = Mon 22 Jun 2026
//   from disclosureDate: +21 = Mon 29 Jun 2026  ← expected when disclosure date set
// B&P = 14 days from contractDate: Mon 15 Jun 2026  ← must NOT shift
const OFFER_FORM_STATUS_WITH_DISCLOSURE = {
  token: "abc123",
  formUrl: "http://localhost:3024/offer-form/abc123",
  submission: {
    submittedAt: "2026-05-22T00:00:00.000Z",
    contractDate: "2026-06-01",
    disclosureDate: "2026-06-08",
    buyer1Name: "Christopher Matthews",
    buyer2Name: null,
    buyerPhone: "0419665682",
    buyerEmail: "test@example.com",
    buyerAddress: "28 Ridgegarden Drive Morayfield QLD 4506",
    offerAmount: "947000",
    isCashBuyer: false,
    buildingPestInspection: "14_days",
    suggestBuildingCompanies: false,
    waiveCoolingOff: false,
    coolingOffDays: 21,
    totalDeposit: "20000",
    initialPayment: "2000",
    secondPayment: "18000",
    settlementPeriod: "30",
    isSubjectToSale: false,
    salePropertyAddress: null,
    salePropertyStatus: null,
    saleTimeframeDays: null,
    saleSettlementDate: null,
    saleIsUnconditional: null,
    saleUnconditionalDate: null,
    saleBuyerSettlementDate: null,
    saleActiveConditions: null,
    saleConditionsElaboration: null,
    saleFreeAppraisal: null,
    isSubjectToFinance: false,
    financePreApproved: null,
    financeDaysToApprove: null,
    financeBank: null,
    financeBankPhone: null,
    financeBankContactName: null,
    financeBankContactEmail: null,
    solicitorName: null,
    solicitorPhone: null,
    solicitorAddress: null,
    solicitorEmail: null,
    sellerSolicitorName: null,
    sellerSolicitorPhone: null,
    sellerSolicitorAddress: null,
    sellerSolicitorEmail: null,
    extraComments: null,
    buyersJson: null,
    saleDaysBeforeListingLive: null,
    saleDaysToGetSaleContract: null,
    saleDaysToGetUnconditionalContract: null,
    saleDaysToSettleExistingProperty: null,
  },
}

// ── Shared navigation helpers ──────────────────────────────────────────────────

async function openSalesTab(
  page: Parameters<typeof signInAsAdmin>[0],
  propertyData: unknown,
  offerFormStatus?: unknown,
) {
  await page.route("**/api/admin/property-status**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(STATUS_LIST_RESPONSE) })
  })
  await page.route("**/api/admin/buyer-status**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [] }) })
  })
  await page.route("**/api/admin/properties**", async (route: Route) => {
    const url = route.request().url()
    if (url.includes("/buyer-offers") && route.request().method() === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([OFFER_ACCEPTED]) })
      return
    }
    if (url.match(/\/api\/admin\/properties\/1001(\?|$)/)) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(propertyData) })
      return
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ...SINGLE_PROPERTY_RESPONSE, items: [propertyData] }),
    })
  })
  // Handle the entity route, intercepting offer-form-status before falling back to empty response.
  await page.route("**/api/admin/property-entities**", async (route: Route) => {
    const url = route.request().url()
    if (offerFormStatus && url.includes("/offer-form-status")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(offerFormStatus) })
      return
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_PROPERTY_ENTITIES_RESPONSE) })
  })
  const T = 10_000
  await page.goto("/admin/properties")
  await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible({ timeout: T })
  await page.getByTestId("admin-entity-row--properties--1001").click({ timeout: T })
  await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible({ timeout: T })
  await page.getByTestId("panda-properties-form-tab-trigger--sales").click({ timeout: T })
  await expect(page.getByTestId("panda-properties-form-tab--sales")).toBeVisible({ timeout: T })
  return page.getByTestId("panda-properties-sales-accepted-offer-section")
}

test.beforeEach(async () => {
  await mkdir(SHOT_DIR, { recursive: true })
})

test.afterAll(() => {
  story.write()
})

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe("Disclosure date — Sales tab field visibility and cooling off deadline", () => {
  test.describe.configure({ timeout: 40_000 })

  test.beforeEach(async ({ page }) => {
    test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")
    await signInAsAdmin(page)
  })

  test("Disclosure date field is visible for Manufactured Home", async ({ page }) => {
    const section = await openSalesTab(page, PROPERTY_MH)
    const disclosureField = section.locator("label", { hasText: "Disclosure date" })
    await expect(disclosureField).toBeVisible({ timeout: 10_000 })
    await shotFocused(page, section, SHOT_DIR, "01-mh-disclosure-field-visible")
    story.addScene({
      title: "01 — Manufactured Home: Disclosure date field visible",
      images: [join(SHOT_DIR, "01-mh-disclosure-field-visible.png")],
      seeing: "Sales tab shows both 'Contract date' and 'Disclosure date' side by side for Manufactured Home.",
      steps: ["Open a Manufactured Home property", "Sales Information tab", "See Disclosure date field"],
    })
  })

  test("Disclosure date field is absent for non-MH property (House)", async ({ page }) => {
    const section = await openSalesTab(page, PROPERTY_HOUSE)
    const disclosureField = section.locator("label", { hasText: "Disclosure date" })
    await expect(disclosureField).not.toBeVisible({ timeout: 5_000 })
    await shotFocused(page, section, SHOT_DIR, "02-house-no-disclosure-field")
    story.addScene({
      title: "02 — House: Disclosure date field hidden",
      images: [join(SHOT_DIR, "02-house-no-disclosure-field.png")],
      seeing: "Sales tab shows only 'Contract date' for a non-Manufactured Home property.",
      steps: ["Open a House property", "Sales Information tab", "Disclosure date field is not present"],
    })
  })

  test("Cooling Off deadline counts from disclosureDate, not contractDate", async ({ page }) => {
    const section = await openSalesTab(page, PROPERTY_MH, OFFER_FORM_STATUS_WITH_DISCLOSURE)
    // Cooling Off: 21 days from disclosure date (Mon 8 Jun) = Mon 29 Jun 2026
    const coolingRow = page.getByTestId("submission-cooling-off-resolved")
    await expect(coolingRow).toContainText("Mon 29 Jun 2026", { timeout: 10_000 })
    // NOT counted from contract date (Mon 1 Jun + 21 = Mon 22 Jun)
    await expect(coolingRow).not.toContainText("Mon 22 Jun 2026")
    await shotFocused(page, section, SHOT_DIR, "03-cooling-off-from-disclosure")
    story.addScene({
      title: "03 — Cooling Off deadline from disclosure date",
      images: [join(SHOT_DIR, "03-cooling-off-from-disclosure.png")],
      seeing: "Cooling Off row shows '21 Days (Mon 29 Jun 2026)' — counted from disclosure date (Mon 8 Jun), not contract date (Mon 1 Jun). Building & Pest also visible showing '14 days (Mon 15 Jun 2026)' — still anchored to contract date (1 Jun + 14), confirming only the cooling off deadline shifts.",
      steps: [
        "Property has contractDate = 2026-06-01, disclosureDate = 2026-06-08, coolingOffDays = 21",
        "Cooling Off row shows Mon 29 Jun 2026 (8 Jun + 21), not Mon 22 Jun 2026 (1 Jun + 21)",
      ],
    })
  })

  test("Building & Pest deadline still counts from contractDate, not disclosureDate", async ({ page }) => {
    await openSalesTab(page, PROPERTY_MH, OFFER_FORM_STATUS_WITH_DISCLOSURE)
    // B&P: 14 days from contractDate (Mon 1 Jun) = Mon 15 Jun 2026
    await expect(page.getByTestId("panda-properties-sales-accepted-offer-section")).toContainText("Mon 15 Jun 2026", { timeout: 10_000 })
    // NOT from disclosure date (Mon 8 Jun + 14 = Mon 22 Jun)
    await expect(page.getByTestId("panda-properties-sales-accepted-offer-section")).not.toContainText("Mon 22 Jun 2026")
  })
})
