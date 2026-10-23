/**
 * Feature Verification: Finance badge false positive in Latest Buyer Offers
 *
 * Run: npm run test:e2e:scratch -- --app=panda-realty --spec="apps/panda-realty/e2e/verify-offer-finance-badge-false-positive.spec.ts" --no-bail
 *
 * Confirms that in the Sales Information tab / Latest Buyer Offers section:
 *  - Finance badge NOT shown when isCashOffer=true (even if isSubjectToFinance=true)
 *  - Finance badge NOT shown when noConditions=true (even if isSubjectToFinance=true)
 *  - Finance badge IS shown when isCashOffer=false and isSubjectToFinance=true
 *  - Finance badge IS shown when isCashOffer=null and isSubjectToFinance=true
 *  - Subject to Sale badge NOT shown when noConditions=true (even if isSubjectToSale=true)
 *  - Subject to Sale badge IS shown when noConditions=false and isSubjectToSale=true
 *  - Settlement badge unaffected by these guards
 */

import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"

import { expect, test, type Page } from "@playwright/test"
import { createStory, shotFocused } from "@repo/e2e-utils"

import { requirePandaE2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import {
  BUYER_PANEL_ITEMS_RESPONSE_1001,
  EMPTY_PROPERTY_ENTITIES_RESPONSE,
  PROPERTY_EDIT_WITH_BUYER,
  SINGLE_PROPERTY_RESPONSE,
  STATUS_LIST_RESPONSE,
} from "./helpers/admin-properties-mocks"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SHOT_DIR = path.join(__dirname, "screenshots", "verify-offer-finance-badge-false-positive")
fs.mkdirSync(SHOT_DIR, { recursive: true })

const story = createStory({
  specUrl: import.meta.url,
  slug: "offer-finance-badge-false-positive",
})

story.setWhatWasBuilt(
  "Fixed false-positive condition badges in the Latest Buyer Offers table (Sales Information tab). " +
  "Finance, Subject to Sale, and Waive Cooling Off badges were showing even when the offer was a cash offer " +
  "(isCashOffer=true) or unconditional (noConditions=true), because stale DB flags were not cleared when " +
  "the admin conditions panel updated those fields. The fix suppresses each badge when its flag contradicts " +
  "the controlling override: Finance requires !isCashOffer && !noConditions; Subject to Sale and Waive Cooling Off " +
  "require !noConditions.",
)

// ── Base offer shape ──────────────────────────────────────────────────────────

const BASE_OFFER = {
  buyerOfferId: 9901,
  entityName: "John Test Collins",
  propertyEntityId: 501,
  offerFormToken: null,
  offer: "940000",
  isAccepted: false,
  dateOffered: "2026-05-28",
  createdAt: "2026-05-28T00:00:00Z",
  isCashOffer: false,
  noConditions: false,
  coolingOffDays: null,
  financeDays: null,
  buildingPestDays: null,
  dueDiligenceDays: null,
  subjectToSaleDays: null,
  subjectToSaleStage: null,
  subjectToSaleAddress: null,
  memberPropertyToSellAddress: null,
  saleOfPropertyDays: null,
  unconditionalContractDays: null,
  depositInitial: null,
  depositBalance: null,
  otherConditions: null,
  customConditions: null,
  conditionNotes: null,
  waiveCoolingOff: null,
  isSubjectToFinance: null,
  financePreApproved: null,
  financeBank: null,
  financeBankContactName: null,
  financeBankContactPhone: null,
  financeBankContactEmail: null,
  suggestBuildingCompanies: null,
  isSubjectToSale: null,
  saleDaysBeforeListingLive: null,
  saleIsUnconditional: null,
  saleUnconditionalDate: null,
  saleBuyerSettlementDate: null,
  saleActiveConditions: null,
  saleFreeAppraisal: null,
  settlementPeriod: "36 Days (Friday)",
}

// ── Route helpers ─────────────────────────────────────────────────────────────

async function installBaseRoutes(page: Page): Promise<void> {
  await page.route("**/api/admin/property-status**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(STATUS_LIST_RESPONSE) })
  })
  await page.route("**/api/admin/buyer-status**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [] }) })
  })
  await page.route("**/api/admin/property-entities**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_PROPERTY_ENTITIES_RESPONSE) })
  })
  await page.route("**/api/admin/properties**", async (route) => {
    const url = route.request().url()
    if (url.match(/\/api\/admin\/properties\/1001\/buyers(\?|$)/)) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(BUYER_PANEL_ITEMS_RESPONSE_1001) })
      return
    }
    if (url.match(/\/api\/admin\/properties\/1001(\?|$)/)) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(PROPERTY_EDIT_WITH_BUYER) })
      return
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ...SINGLE_PROPERTY_RESPONSE, items: [{ ...PROPERTY_EDIT_WITH_BUYER }] }),
    })
  })
}

async function openSalesTabWithOffers(page: Page, offers: object[]): Promise<void> {
  await page.route("**/api/admin/properties/1001/buyer-offers**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(offers),
    })
  })

  await page.goto("/admin/properties")
  await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible({ timeout: 15_000 })
  await page.getByTestId("admin-entity-row--properties--1001").click()
  await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible({ timeout: 10_000 })
  // Sales Information is the default tab — wait for buyer offers section
  await expect(page.getByTestId("panda-properties-form-section--buyer-offers")).toBeVisible({ timeout: 10_000 })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe("Verify: Finance badge false positive fix", () => {
  test.setTimeout(60_000)

  test.beforeEach(async ({ page }) => {
    requirePandaE2eAdminCredentials()
    await signInAsAdmin(page)
    await installBaseRoutes(page)
  })

  test.afterAll(() => {
    story.write()
  })

  test("01 — cash offer with isSubjectToFinance=true shows NO Finance badge", async ({ page }) => {
    await openSalesTabWithOffers(page, [
      { ...BASE_OFFER, isCashOffer: true, isSubjectToFinance: true },
    ])

    const row = page.getByTestId(`panda-properties-buyer-offer-row--${BASE_OFFER.buyerOfferId}`)
    await expect(row).toBeVisible({ timeout: 10_000 })

    // Finance badge must NOT appear for a cash offer — this assertion fails before the fix
    await expect(row.getByText("Finance")).not.toBeVisible()

    const section01 = page.getByTestId("panda-properties-form-section--buyer-offers")
    await shotFocused(page, section01, SHOT_DIR, "01-cash-offer-no-finance-badge")
    story.addScene({
      title: "01 — Finance badge absent: cash offer",
      images: [path.join(SHOT_DIR, "01-cash-offer-no-finance-badge.png")],
      seeing:
        "The offer row for a cash offer (isCashOffer=true) shows no Finance badge, even though " +
        "isSubjectToFinance=true is set in the DB. Only the Settlement badge appears.",
      steps: [
        "Open the Edit Property dialog for a property with a buyer offer",
        "Ensure the offer has isCashOffer=true and isSubjectToFinance=true (stale DB state)",
        "Observe the Latest Buyer Offers table — no Finance badge on the row",
      ],
    })
  })

  test("02 — non-cash offer with isSubjectToFinance=true shows Finance badge", async ({ page }) => {
    await openSalesTabWithOffers(page, [
      { ...BASE_OFFER, isCashOffer: false, isSubjectToFinance: true },
    ])

    const row = page.getByTestId(`panda-properties-buyer-offer-row--${BASE_OFFER.buyerOfferId}`)
    await expect(row).toBeVisible({ timeout: 10_000 })

    // Finance badge MUST appear — verifies the fix does not break the positive case
    const financeBadge = row.getByText("Finance")
    await expect(financeBadge).toBeVisible()

    const section02 = page.getByTestId("panda-properties-form-section--buyer-offers")
    await shotFocused(page, section02, SHOT_DIR, "02-non-cash-finance-badge-shown")
    story.addScene({
      title: "02 — Finance badge present: non-cash offer",
      images: [path.join(SHOT_DIR, "02-non-cash-finance-badge-shown.png")],
      seeing:
        "The Finance badge appears on a non-cash offer row (isCashOffer=false, isSubjectToFinance=true). " +
        "The fix does not suppress valid Finance badges.",
      steps: [
        "Open the Edit Property dialog for a property with a non-cash offer",
        "Ensure the offer has isCashOffer=false and isSubjectToFinance=true",
        "Observe the Latest Buyer Offers table — Finance badge is visible on the row",
      ],
    })
  })

  test("03 — unconditional offer (noConditions=true) with isSubjectToFinance=true shows NO Finance badge", async ({ page }) => {
    await openSalesTabWithOffers(page, [
      { ...BASE_OFFER, isCashOffer: false, noConditions: true, isSubjectToFinance: true },
    ])

    const row = page.getByTestId(`panda-properties-buyer-offer-row--${BASE_OFFER.buyerOfferId}`)
    await expect(row).toBeVisible({ timeout: 10_000 })

    // Finance badge must NOT appear for unconditional offer — fails before fix
    await expect(row.getByText("Finance")).not.toBeVisible()

    const section03 = page.getByTestId("panda-properties-form-section--buyer-offers")
    await shotFocused(page, section03, SHOT_DIR, "03-unconditional-no-finance-badge")
    story.addScene({
      title: "03 — Finance badge absent: unconditional offer (noConditions=true)",
      images: [path.join(SHOT_DIR, "03-unconditional-no-finance-badge.png")],
      seeing:
        "An unconditional offer row (noConditions=true) shows no Finance badge, even though " +
        "isSubjectToFinance=true is stale in the DB. The Settlement badge still appears.",
      steps: [
        "Open the Edit Property dialog for a property with an unconditional offer",
        "Ensure the offer has noConditions=true and isSubjectToFinance=true (stale DB state)",
        "Observe the Latest Buyer Offers table — no Finance badge on the row",
      ],
    })
  })

  test("04 — unconditional offer (noConditions=true) with isSubjectToSale=true shows NO Subject to Sale badge", async ({ page }) => {
    await openSalesTabWithOffers(page, [
      { ...BASE_OFFER, noConditions: true, isSubjectToSale: true },
    ])

    const row = page.getByTestId(`panda-properties-buyer-offer-row--${BASE_OFFER.buyerOfferId}`)
    await expect(row).toBeVisible({ timeout: 10_000 })

    // Subject to Sale badge must NOT appear for unconditional offer — fails before fix
    await expect(row.getByText("Subject to Sale")).not.toBeVisible()

    const section04 = page.getByTestId("panda-properties-form-section--buyer-offers")
    await shotFocused(page, section04, SHOT_DIR, "04-unconditional-no-sale-badge")
    story.addScene({
      title: "04 — Subject to Sale badge absent: unconditional offer",
      images: [path.join(SHOT_DIR, "04-unconditional-no-sale-badge.png")],
      seeing:
        "An unconditional offer row (noConditions=true) shows no 'Subject to Sale' badge, even though " +
        "isSubjectToSale=true is stale in the DB.",
      steps: [
        "Open the Edit Property dialog for a property with an unconditional offer",
        "Ensure the offer has noConditions=true and isSubjectToSale=true (stale DB state)",
        "Observe the Latest Buyer Offers table — no 'Subject to Sale' badge on the row",
      ],
    })
  })

  test("05 — conditional offer with isSubjectToSale=true shows Subject to Sale badge", async ({ page }) => {
    await openSalesTabWithOffers(page, [
      { ...BASE_OFFER, isCashOffer: false, noConditions: false, isSubjectToSale: true },
    ])

    const row = page.getByTestId(`panda-properties-buyer-offer-row--${BASE_OFFER.buyerOfferId}`)
    await expect(row).toBeVisible({ timeout: 10_000 })

    const saleBadge = row.getByText("Subject to Sale")
    await expect(saleBadge).toBeVisible()

    const section05 = page.getByTestId("panda-properties-form-section--buyer-offers")
    await shotFocused(page, section05, SHOT_DIR, "05-conditional-sale-badge-shown")
    story.addScene({
      title: "05 — Subject to Sale badge present: conditional offer",
      images: [path.join(SHOT_DIR, "05-conditional-sale-badge-shown.png")],
      seeing:
        "A conditional offer row (noConditions=false, isSubjectToSale=true) shows the 'Subject to Sale' badge. " +
        "The fix does not suppress valid Subject to Sale badges.",
      steps: [
        "Open the Edit Property dialog for a property with a conditional offer",
        "Ensure the offer has noConditions=false and isSubjectToSale=true",
        "Observe the Latest Buyer Offers table — 'Subject to Sale' badge is visible",
      ],
    })
  })

  test("06 — isCashOffer=null with isSubjectToFinance=true still shows Finance badge", async ({ page }) => {
    await openSalesTabWithOffers(page, [
      { ...BASE_OFFER, isCashOffer: null, isSubjectToFinance: true },
    ])

    const row = page.getByTestId(`panda-properties-buyer-offer-row--${BASE_OFFER.buyerOfferId}`)
    await expect(row).toBeVisible({ timeout: 10_000 })

    // null is not explicitly cash — Finance badge should still show
    const financeBadge = row.getByText("Finance")
    await expect(financeBadge).toBeVisible()

    const section06 = page.getByTestId("panda-properties-form-section--buyer-offers")
    await shotFocused(page, section06, SHOT_DIR, "06-null-cash-finance-badge-shown")
    story.addScene({
      title: "06 — Finance badge present: isCashOffer=null (not explicitly cash)",
      images: [path.join(SHOT_DIR, "06-null-cash-finance-badge-shown.png")],
      seeing:
        "When isCashOffer is null (buyer has not answered the cash question), the Finance badge still " +
        "shows for isSubjectToFinance=true. The guard only suppresses when isCashOffer is explicitly true.",
      steps: [
        "Open the Edit Property dialog for a property with an offer where isCashOffer=null",
        "Ensure the offer has isSubjectToFinance=true",
        "Observe the Latest Buyer Offers table — Finance badge is visible",
      ],
    })
  })

  test("07 — settlement badge shows even when isCashOffer=true and noConditions=true", async ({ page }) => {
    await openSalesTabWithOffers(page, [
      { ...BASE_OFFER, isCashOffer: true, noConditions: true, settlementPeriod: "36 Days (Friday)" },
    ])

    const row = page.getByTestId(`panda-properties-buyer-offer-row--${BASE_OFFER.buyerOfferId}`)
    await expect(row).toBeVisible({ timeout: 10_000 })

    // Settlement badge is unaffected by cash/noConditions guards
    const settlementBadge = row.getByText("Settlement: 36 Days (Friday)")
    await expect(settlementBadge).toBeVisible()

    const section07 = page.getByTestId("panda-properties-form-section--buyer-offers")
    await shotFocused(page, section07, SHOT_DIR, "07-settlement-badge-unaffected")
    story.addScene({
      title: "07 — Settlement badge unaffected: shows even when isCashOffer=true and noConditions=true",
      images: [path.join(SHOT_DIR, "07-settlement-badge-unaffected.png")],
      seeing:
        "The Settlement badge is unaffected by cash/noConditions guards. When isCashOffer=true and " +
        "noConditions=true, only the Settlement badge appears — Finance, Subject to Sale, and Waive " +
        "Cooling Off badges are all suppressed.",
      steps: [
        "Open the Edit Property dialog for a property with a cash, unconditional offer",
        "Ensure the offer has isCashOffer=true, noConditions=true, and settlementPeriod set",
        "Observe the Latest Buyer Offers table — Settlement badge appears; no condition badges",
      ],
    })
  })
})
