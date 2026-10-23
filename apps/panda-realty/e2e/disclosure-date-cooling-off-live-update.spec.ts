/**
 * E2E (user-run scratch): live recompute of derived dates in the Offer Form Submission panel
 * when the Contract date / Disclosure date inputs change in the Sales tab — BEFORE saving.
 *
 * Bug: the submission panel reads disclosureDate/contractDate from a fetched-once snapshot,
 * so editing the date inputs does not recompute the Cooling Off (and contract-derived) dates.
 *
 * Anchor dates (all land on known weekdays):
 *   contract  = 2026-06-01 (Mon), disclosure = 2026-06-08 (Mon), coolingOff = 21 days
 *   cooling from disclosure 8 Jun  + 21 = Mon 29 Jun 2026
 *   cooling from disclosure 15 Jun + 21 = Mon  6 Jul 2026
 *   cooling from contract   1 Jun  + 21 = Mon 22 Jun 2026 (disclosure cleared)
 *   B&P (14d) from contract 1 Jun  + 14 = Mon 15 Jun 2026
 *   B&P (14d) from contract 8 Jun  + 14 = Mon 22 Jun 2026
 *
 * Uses mocked APIs — no live DB required. TDD: written BEFORE implementation (red phase).
 *
 * Run (user, after `npm run dev:panda-realty`):
 *   npm run test:e2e:scratch -- --app=panda-realty --spec="apps/panda-realty/e2e/disclosure-date-cooling-off-live-update.spec.ts" --no-bail
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

const SHOT_DIR = join(dirname(fileURLToPath(import.meta.url)), "screenshots", "disclosure-cooling-off-live")

const story = createStory({ specUrl: import.meta.url, slug: "disclosure-cooling-off-live" })
story.setWhatWasBuilt(
  "The Offer Form Submission panel in the property Sales tab now recomputes its derived dates from the LIVE Contract date and Disclosure date form inputs. Changing either input updates the Cooling Off date (and all contract-date-derived deadlines) immediately, before saving — instead of using only the fetched-once snapshot. Files: panda-properties-form-favorite-tabs.tsx (subscribes to live dates), accepted-offer-submission-panel.tsx + buyer-offer-submission-panel.tsx (accept date overrides).",
)

// ── Property + offer-form-status fixtures ──────────────────────────────────────

function propertyMh(overrides: Record<string, unknown> = {}) {
  return {
    ...PROPERTY_EDIT_WITH_BUYER,
    propertyType: "Manufactured Home",
    contractDate: "2026-06-01",
    disclosureDate: "2026-06-08",
    ...overrides,
  }
}

function propertyHouse(overrides: Record<string, unknown> = {}) {
  return {
    ...PROPERTY_EDIT_WITH_BUYER,
    propertyType: "House",
    contractDate: "2026-06-01",
    disclosureDate: null,
    ...overrides,
  }
}

function offerFormStatus(overrides: Record<string, unknown> = {}) {
  return {
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
      ...overrides,
    },
  }
}

// ── Navigation: open the Sales tab with the accepted offer panel ────────────────

async function openSalesTab(
  page: Parameters<typeof signInAsAdmin>[0],
  propertyData: unknown,
  status: unknown,
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
  await page.route("**/api/admin/property-entities**", async (route: Route) => {
    const url = route.request().url()
    if (url.includes("/offer-form-status")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(status) })
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

const disclosureInput = (page: Parameters<typeof signInAsAdmin>[0]) => page.locator("#pp-disclosureDate")
const contractInput = (page: Parameters<typeof signInAsAdmin>[0]) => page.locator("#pp-contractDate")
const coolingRow = (page: Parameters<typeof signInAsAdmin>[0]) => page.getByTestId("submission-cooling-off-resolved")

test.beforeEach(async () => {
  await mkdir(SHOT_DIR, { recursive: true })
})

test.afterAll(() => {
  story.write()
})

// ── Tests ───────────────────────────────────────────────────────────────────

test.describe("Offer panel — derived dates recompute live from date inputs", () => {
  test.describe.configure({ timeout: 45_000 })

  test.beforeEach(async ({ page }) => {
    if (!e2eAdminCredentials) throw new Error("E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set in .env.local")
    await signInAsAdmin(page)
  })

  test("MV-2/3 baseline — Cooling Off shows 21 Days from disclosure date (Mon 29 Jun 2026)", async ({ page }) => {
    await openSalesTab(page, propertyMh(), offerFormStatus())
    await expect(coolingRow(page)).toContainText("21 Days (Mon 29 Jun 2026)", { timeout: 10_000 })
    await shotFocused(page, page.getByTestId("panda-properties-sales-accepted-offer-section"), SHOT_DIR, "01-baseline")
    story.addScene({
      title: "01 — Baseline: Cooling Off from disclosure date",
      images: [join(SHOT_DIR, "01-baseline.png")],
      seeing: "Cooling Off row shows '21 Days (Mon 29 Jun 2026)' — disclosure date 8 Jun + 21 days.",
      steps: ["Open Manufactured Home property Sales tab", "Cooling Off shows Mon 29 Jun 2026"],
    })
  })

  test("MV-4 Cooling Off recomputes live when Disclosure date changes (08 to 15 Jun gives Mon 6 Jul 2026)", async ({ page }) => {
    const section = await openSalesTab(page, propertyMh(), offerFormStatus())
    await expect(coolingRow(page)).toContainText("Mon 29 Jun 2026", { timeout: 10_000 })
    await shotFocused(page, section, SHOT_DIR, "02a-before-disclosure-change")

    await disclosureInput(page).fill("2026-06-15")

    await expect(coolingRow(page)).toContainText("Mon 6 Jul 2026", { timeout: 10_000 })
    await expect(coolingRow(page)).not.toContainText("Mon 29 Jun 2026")
    await shotFocused(page, section, SHOT_DIR, "02b-after-disclosure-change")
    story.addScene({
      title: "02 — Disclosure date change updates Cooling Off live",
      images: [
        join(SHOT_DIR, "02a-before-disclosure-change.png"),
        join(SHOT_DIR, "02b-after-disclosure-change.png"),
      ],
      seeing:
        "Left: Cooling Off '21 Days (Mon 29 Jun 2026)' (disclosure 8 Jun). " +
        "Right: after changing Disclosure date to 15 Jun, Cooling Off updates to 'Mon 6 Jul 2026' without saving.",
      steps: [
        "Open Sales tab; Cooling Off = Mon 29 Jun 2026",
        "Change Disclosure date input to 2026-06-15",
        "Cooling Off recomputes live to Mon 6 Jul 2026",
      ],
    })
  })

  test("MV-5 clearing Disclosure date falls back to Contract date (Mon 22 Jun 2026)", async ({ page }) => {
    await openSalesTab(page, propertyMh(), offerFormStatus())
    await expect(coolingRow(page)).toContainText("Mon 29 Jun 2026", { timeout: 10_000 })

    await disclosureInput(page).fill("")

    await expect(coolingRow(page)).toContainText("Mon 22 Jun 2026", { timeout: 10_000 })
    await expect(coolingRow(page)).not.toContainText("Mon 29 Jun 2026")
  })

  test("MV-6/7 contract-derived Building and Pest recomputes live when Contract date changes (01 to 08 Jun gives Mon 22 Jun 2026)", async ({ page }) => {
    const section = await openSalesTab(page, propertyMh(), offerFormStatus())
    await expect(section).toContainText("Mon 15 Jun 2026", { timeout: 10_000 })

    await contractInput(page).fill("2026-06-08")

    await expect(section).toContainText("Mon 22 Jun 2026", { timeout: 10_000 })
    await expect(section).not.toContainText("Mon 15 Jun 2026")
  })

  test("MV-8 non-MH House — Cooling Off (5 days) tracks Contract date live (01 to 08 Jun gives Sat 13 Jun 2026)", async ({ page }) => {
    await openSalesTab(
      page,
      propertyHouse(),
      offerFormStatus({ disclosureDate: null, coolingOffDays: 5, contractDate: "2026-06-01" }),
    )
    // Disclosure field is hidden for non-MH.
    await expect(disclosureInput(page)).toHaveCount(0)
    await expect(coolingRow(page)).toContainText("5 Days (Sat 6 Jun 2026)", { timeout: 10_000 })

    await contractInput(page).fill("2026-06-08")

    await expect(coolingRow(page)).toContainText("Sat 13 Jun 2026", { timeout: 10_000 })
    await expect(coolingRow(page)).not.toContainText("Sat 6 Jun 2026")
  })

  test("MV-9 waived Manufactured Home (7 days) — Cooling Off tracks Disclosure date live (08 to 15 Jun gives Mon 22 Jun 2026)", async ({ page }) => {
    await openSalesTab(
      page,
      propertyMh(),
      offerFormStatus({ waiveCoolingOff: true, coolingOffDays: 7 }),
    )
    await expect(coolingRow(page)).toContainText("7 Days (Mon 15 Jun 2026)", { timeout: 10_000 })

    await disclosureInput(page).fill("2026-06-15")

    await expect(coolingRow(page)).toContainText("Mon 22 Jun 2026", { timeout: 10_000 })
    await expect(coolingRow(page)).not.toContainText("Mon 15 Jun 2026")
  })
})
