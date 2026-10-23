/**
 * E2E: Property dialog Sales tab — contract conditions native view mirror
 *
 * Verifies that the editable BuyerOfferNativeView is shown in the Sales tab
 * whenever an accepted offer exists, and that the placeholder is shown when
 * no accepted offer is present.
 *
 * Fallback: when the accepted offer has no offerFormToken, the view renders
 * via the admin fallback endpoint /api/admin/buyer-offers/[offerId]/form-view.
 *
 * Spec: specs/panda-realty-property-contract-conditions-mirror-view.md
 */

import { expect, test, type Page } from "@playwright/test"

import {
  requirePandaE2eAdminCredentials,
  signInAsAdmin,
} from "./helpers/admin-auth"
import { PREFILL_BASE } from "./helpers/buyer-offer-native-view-mocks"
import { MOCK_PROPERTY_ID } from "./helpers/panda-properties-dialog-mocks"
import { setupSalesTabMockRoutes } from "./helpers/sales-tab-mock-routes"

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const OFFER_TOKEN = "mirror-view-token-196"
const OFFER_ID = 196
const OFFER_ID_NO_TOKEN = 197

const ACCEPTED_OFFER_WITH_TOKEN = {
  buyerOfferId: OFFER_ID,
  entityName: "E2E Mirror Buyer",
  propertyEntityId: 501,
  offerFormToken: OFFER_TOKEN,
  offer: "950000.00",
  isAccepted: true,
  dateOffered: "2026-05-22",
  createdAt: "2026-05-22T00:00:00Z",
  isCashOffer: false,
  noConditions: false,
  coolingOffDays: 5,
  financeDays: 14,
  buildingPestDays: 7,
  dueDiligenceDays: null,
  subjectToSaleDays: null,
  subjectToSaleStage: null,
  subjectToSaleAddress: null,
  memberPropertyToSellAddress: null,
  saleOfPropertyDays: null,
  unconditionalContractDays: null,
  depositInitial: "10000.00",
  depositBalance: "20000.00",
  otherConditions: null,
  customConditions: null,
  conditionNotes: null,
  waiveCoolingOff: false,
  isSubjectToFinance: true,
  financePreApproved: null,
  financeBank: null,
  financeBankContactName: null,
  financeBankContactPhone: null,
  financeBankContactEmail: null,
  suggestBuildingCompanies: null,
  isSubjectToSale: false,
  saleDaysBeforeListingLive: null,
  saleIsUnconditional: null,
  saleUnconditionalDate: null,
  saleBuyerSettlementDate: null,
  saleActiveConditions: null,
  saleFreeAppraisal: null,
  settlementPeriod: "38",
}

const ACCEPTED_OFFER_NO_TOKEN = {
  ...ACCEPTED_OFFER_WITH_TOKEN,
  buyerOfferId: OFFER_ID_NO_TOKEN,
  offerFormToken: null,
}

// ─── Route helpers ─────────────────────────────────────────────────────────────

async function setupSalesTabRoutes(
  page: Page,
  offers: unknown[],
  offerFormPrefill: Record<string, unknown> = PREFILL_BASE,
): Promise<void> {
  await setupSalesTabMockRoutes(page, offers, OFFER_TOKEN, offerFormPrefill)
}

async function openSalesTab(page: Page) {
  await page.goto("/admin/properties")
  await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible({
    timeout: 15_000,
  })
  await page.getByTestId(`admin-entity-row--properties--${MOCK_PROPERTY_ID}`).click()
  const dialog = page.getByTestId("admin-entity-crud-dialog--properties")
  await expect(dialog).toBeVisible({ timeout: 15_000 })
  await page.getByTestId("panda-properties-form-tab-trigger--sales").click()
  await expect(page.getByTestId("panda-properties-form-tab--sales")).toBeVisible()
  return dialog
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe("Property Sales tab — contract conditions native view mirror (mocked)", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaE2eAdminCredentials()
    await signInAsAdmin(page)
  })

  // ── Happy path: accepted offer with token ────────────────────────────────

  test("renders BuyerOfferNativeView when accepted offer has token", async ({ page }) => {
    await setupSalesTabRoutes(page, [ACCEPTED_OFFER_WITH_TOKEN])
    const dialog = await openSalesTab(page)
    await expect(dialog.getByTestId(`buyer-offer-native-view--${OFFER_ID}`)).toBeVisible({
      timeout: 10_000,
    })
  })

  test("native view shows property & buyer details section", async ({ page }) => {
    await setupSalesTabRoutes(page, [ACCEPTED_OFFER_WITH_TOKEN])
    const dialog = await openSalesTab(page)
    await expect(dialog.getByTestId(`buyer-offer-native-view--${OFFER_ID}`)).toBeVisible({
      timeout: 10_000,
    })
    await expect(dialog.getByTestId("buyer-offer-native--property-address")).toBeVisible()
  })

  test("no editable Save conditions button when accepted offer present", async ({ page }) => {
    await setupSalesTabRoutes(page, [ACCEPTED_OFFER_WITH_TOKEN])
    const dialog = await openSalesTab(page)
    await expect(dialog.getByTestId(`buyer-offer-native-view--${OFFER_ID}`)).toBeVisible({
      timeout: 10_000,
    })
    await expect(dialog.getByRole("button", { name: /save conditions/i })).toHaveCount(0)
  })

  test("Contract Date grid field is hidden when accepted offer present", async ({ page }) => {
    await setupSalesTabRoutes(page, [ACCEPTED_OFFER_WITH_TOKEN])
    const dialog = await openSalesTab(page)
    await expect(dialog.getByTestId(`buyer-offer-native-view--${OFFER_ID}`)).toBeVisible({
      timeout: 10_000,
    })
    await expect(dialog.getByTestId("panda-properties-form-field--contractDate")).toHaveCount(0)
  })

  // ── No token fallback ────────────────────────────────────────────────────

  test("renders native view via fallback endpoint when accepted offer has no token", async ({
    page,
  }) => {
    await setupSalesTabRoutes(page, [ACCEPTED_OFFER_NO_TOKEN])
    const dialog = await openSalesTab(page)
    await expect(
      dialog.getByTestId(`buyer-offer-native-view--${OFFER_ID_NO_TOKEN}`),
    ).toBeVisible({ timeout: 10_000 })
  })

  // ── No accepted offer ────────────────────────────────────────────────────

  test("shows placeholder when no accepted offer", async ({ page }) => {
    await setupSalesTabRoutes(page, [])
    const dialog = await openSalesTab(page)
    await expect(
      dialog.getByTestId("panda-properties-sales-conditions-placeholder"),
    ).toBeVisible()
  })

  test("Contract Date grid field visible when no accepted offer", async ({ page }) => {
    await setupSalesTabRoutes(page, [])
    const dialog = await openSalesTab(page)
    await expect(
      dialog.getByTestId("panda-properties-form-field--contractDate"),
    ).toBeVisible()
  })

  test("no native view rendered when no accepted offer", async ({ page }) => {
    await setupSalesTabRoutes(page, [])
    const dialog = await openSalesTab(page)
    await expect(
      dialog.locator('[data-testid^="buyer-offer-native-view--"]'),
    ).toHaveCount(0)
  })

  // ── View Form per-row toggle unaffected ──────────────────────────────────

  test("View Form row toggle still expands and collapses inline view", async ({ page }) => {
    await setupSalesTabRoutes(page, [ACCEPTED_OFFER_WITH_TOKEN])
    const dialog = await openSalesTab(page)
    await expect(dialog.getByTestId(`buyer-offer-native-view--${OFFER_ID}`)).toBeVisible({
      timeout: 10_000,
    })
    const viewFormBtn = dialog.getByTestId(`buyer-offer-section-view-form-btn--${OFFER_ID}`)
    await expect(viewFormBtn).toBeVisible()
    await viewFormBtn.click()
    await expect(viewFormBtn).toContainText(/hide form/i)
    await viewFormBtn.click()
    await expect(viewFormBtn).toContainText(/view form/i)
  })
})
