/**
 * E2E: Entities dialog — Buyer Offers panel (display tests)
 *
 * Covers: SF6–SF9 — sub-detail removal (cooling-off and bank lines must not appear).
 * CRUD tests (SF1–SF5) live in admin-entities-buyer-offers-panel-crud.spec.ts.
 *
 * All HTTP calls are mocked — no live DB required.
 *
 * Run (from repo root):
 *   npx playwright test apps/panda-realty/e2e/admin-entities-buyer-offers-panel-display.spec.ts --config=apps/panda-realty/playwright.config.ts
 * Or via workspace script:
 *   npm run test:e2e -w panda-realty -- apps/panda-realty/e2e/admin-entities-buyer-offers-panel-display.spec.ts
 */

import { expect, test } from "@playwright/test"

import { requirePandaE2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import {
  MOCK_PROPERTY_LIST_ID,
  installBaseRoutes,
  openOffersTab,
} from "./helpers/buyer-offers-panel"

const OFFERS_WITH_SUB_DETAILS = {
  propertyListId: MOCK_PROPERTY_LIST_ID,
  contractDate: "2026-05-22",
  offerFormToken: null,
  offers: [
    {
      buyerOfferId: 9010,
      offer: "1200000",
      isAccepted: false,
      dateOffered: "2026-05-22",
      isCashOffer: false,
      noConditions: false,
      waiveCoolingOff: true,
      isSubjectToFinance: true,
      financeBank: "CBA",
      settlementPeriod: "42 days",
      financeBankContactName: null,
      financeBankContactPhone: null,
      financeBankContactEmail: null,
      financePreApproved: null,
      suggestBuildingCompanies: null,
      coolingOffDays: null,
      financeDays: null,
      buildingPestDays: null,
      dueDiligenceDays: null,
      subjectToSaleDays: null,
      subjectToSaleStage: null,
      subjectToSaleAddress: null,
      saleOfPropertyDays: null,
      unconditionalContractDays: null,
      depositInitial: null,
      depositBalance: null,
      otherConditions: null,
      customConditions: null,
      conditionNotes: null,
      settlementCalendarEventId: null,
      coolingOffCalendarEventId: null,
      financeCalendarEventId: null,
      buildingPestCalendarEventId: null,
      isSubjectToSale: null,
      saleDaysBeforeListingLive: null,
      saleIsUnconditional: null,
      saleUnconditionalDate: null,
      saleBuyerSettlementDate: null,
      saleActiveConditions: null,
      saleFreeAppraisal: null,
    },
    {
      buyerOfferId: 9011,
      offer: "1100000",
      isAccepted: false,
      dateOffered: "2026-05-22",
      isCashOffer: false,
      noConditions: false,
      waiveCoolingOff: false,
      isSubjectToFinance: false,
      financeBank: null,
      settlementPeriod: null,
      financeBankContactName: null,
      financeBankContactPhone: null,
      financeBankContactEmail: null,
      financePreApproved: null,
      suggestBuildingCompanies: null,
      coolingOffDays: null,
      financeDays: null,
      buildingPestDays: null,
      dueDiligenceDays: null,
      subjectToSaleDays: null,
      subjectToSaleStage: null,
      subjectToSaleAddress: null,
      saleOfPropertyDays: null,
      unconditionalContractDays: null,
      depositInitial: null,
      depositBalance: null,
      otherConditions: null,
      customConditions: null,
      conditionNotes: null,
      settlementCalendarEventId: null,
      coolingOffCalendarEventId: null,
      financeCalendarEventId: null,
      buildingPestCalendarEventId: null,
      isSubjectToSale: null,
      saleDaysBeforeListingLive: null,
      saleIsUnconditional: null,
      saleUnconditionalDate: null,
      saleBuyerSettlementDate: null,
      saleActiveConditions: null,
      saleFreeAppraisal: null,
    },
  ],
}

test.describe("Entities dialog — Buyer Offers panel (display)", () => {
  test.describe.configure({ timeout: 120_000 })

  test.beforeEach(async ({ page }) => {
    requirePandaE2eAdminCredentials()
    await installBaseRoutes(page, OFFERS_WITH_SUB_DETAILS)
    await signInAsAdmin(page)
  })

  // ── SF6: No cooling-off sub-detail ────────────────────────────────────────

  test("SF6 — no 'Cooling off waived' sub-detail shown even when waiveCoolingOff=true", async ({ page }) => {
    const { panel } = await openOffersTab(page)
    await expect(panel.getByTestId("offers-tab-table")).toBeVisible({ timeout: 8_000 })

    const row = panel.getByTestId("offers-row--9010")
    await expect(row).toBeVisible()
    await expect(row.getByText(/cooling off waived/i)).not.toBeVisible()
  })

  // ── SF7: No bank sub-detail ───────────────────────────────────────────────

  test("SF7 — no 'Bank' sub-detail shown even when financeBank is set", async ({ page }) => {
    const { panel } = await openOffersTab(page)
    await expect(panel.getByTestId("offers-tab-table")).toBeVisible({ timeout: 8_000 })

    const row = panel.getByTestId("offers-row--9010")
    await expect(row).toBeVisible()
    await expect(row.getByText(/^Bank:/i)).not.toBeVisible()
  })

  // ── SF8: Settlement sub-detail still appears ───────────────────────────────

  test("SF8 — 'Settlement' sub-detail still appears when settlementPeriod is set", async ({ page }) => {
    const { panel } = await openOffersTab(page)
    await expect(panel.getByTestId("offers-tab-table")).toBeVisible({ timeout: 8_000 })

    const row = panel.getByTestId("offers-row--9010")
    await expect(row).toBeVisible()
    await expect(row.getByText(/Settlement:/i)).toBeVisible()
    await expect(row.getByText("42 days")).toBeVisible()
  })

  // ── SF9: Row with all nulls shows no sub-details ───────────────────────────

  test("SF9 — row with waiveCoolingOff=false shows no sub-detail lines at all", async ({ page }) => {
    const { panel } = await openOffersTab(page)
    await expect(panel.getByTestId("offers-tab-table")).toBeVisible({ timeout: 8_000 })

    const row = panel.getByTestId("offers-row--9011")
    await expect(row).toBeVisible()
    await expect(row.getByText(/cooling off waived/i)).not.toBeVisible()
    await expect(row.getByText(/^Bank:/i)).not.toBeVisible()
    await expect(row.getByText(/Settlement:/i)).not.toBeVisible()
  })
})
