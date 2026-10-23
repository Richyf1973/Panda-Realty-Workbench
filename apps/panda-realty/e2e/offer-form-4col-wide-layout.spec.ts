// Run: npm run test:e2e:scratch -- --app=panda-realty --spec=apps/panda-realty/e2e/offer-form-4col-wide-layout.spec.ts --no-bail

import type { Route } from "@playwright/test"
import { expect, test } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { createStory, shotFocused } from "@repo/e2e-utils"

import { e2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"

const SHOT_DIR = join(dirname(fileURLToPath(import.meta.url)), "screenshots", "offer-form-4col-wide-layout")

const story = createStory({ specUrl: import.meta.url, slug: "offer-form-4col-wide-layout" })

story.setWhatWasBuilt(
  "The buyer offer native view inside the admin property dialog was updated to render in 4 columns " +
  "at the xl breakpoint (≥1280px). Changed: buyer-offer-native-view-sections.tsx — " +
  "NativeSection1 buyer grid, NativeSection2 solicitor grid, and NativeSection3 finance grid " +
  "all gained xl:grid-cols-4. The representative section (3 fields) was changed from md:grid-cols-2 " +
  "to md:grid-cols-3 so all 3 rep fields sit on one row from md upward.",
)

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_PROPERTY_ID = 1001
const MOCK_OFFER_ID = 9001

const PROPERTY_DETAIL = {
  propertyListId: MOCK_PROPERTY_ID,
  streetAddress: "12 Test Street",
  suburb: "Testville",
  state: "QLD",
  postcode: "4000",
  propertyType: "House",
  bed: 3, bath: 2, car: 1,
  salePrice: 500000,
  propertyStatusId: 1,
  buyerName: null, buyerId: null,
  owner1name: "Smith, John", owner1email: "john@example.com",
  owner2name: null, owner3name: null,
  combinedOwner: "Smith, John",
  isFavorite: true,
  priceUndisclosed: false,
  excludeFromReport: false,
  saleDate: null,
  updatedAt: "2026-01-01T00:00:00Z",
  propertyEntities: [],
  propertyBuyers: [],
  propertyContacts: [],
  propertyTenants: [],
}

const PROPERTY_LIST = {
  items: [PROPERTY_DETAIL],
  totalCount: 1, limit: 25, totalPages: 1,
  hasNextPage: false, hasPreviousPage: false,
  startCursor: null, endCursor: null,
}

const BUYER_OFFER = {
  buyerOfferId: MOCK_OFFER_ID,
  entityName: "Test Buyer LLC",
  propertyEntityId: 501,
  offerFormToken: null,
  offer: "750000",
  isAccepted: false,
  dateOffered: "2026-05-01",
  createdAt: "2026-05-01T00:00:00Z",
  isCashOffer: false,
  noConditions: false,
  coolingOffDays: null, financeDays: null,
  buildingPestDays: null, dueDiligenceDays: null,
  subjectToSaleDays: null, subjectToSaleStage: null,
  subjectToSaleAddress: null, memberPropertyToSellAddress: null,
  saleOfPropertyDays: null, unconditionalContractDays: null,
  depositInitial: null, depositBalance: null,
  otherConditions: null, customConditions: null,
  conditionNotes: null, waiveCoolingOff: null,
  isSubjectToFinance: null, financePreApproved: null, financeBank: null,
}

const NATIVE_PREFILL = {
  propertyAddress: "12 Test Street, Testville, QLD, 4000",
  buyers: [{ name: "Test Buyer LLC", phone: "0400111222", email: "buyer@test.com", address: "1 Buyer Rd" }],
  rep: null,
  solicitorName: "John Solicitor",
  solicitorPhone: "0400222333",
  solicitorAddress: "1 Law St, City",
  solicitorEmail: "solicitor@law.com",
  offerAmount: "750000",
  depositInitial: "25000",
  depositBalance: "25000",
  isCashOffer: null,
  waiveCoolingOff: null,
  isSubjectToFinance: null,
  multiOfferCheckHighest: false,
  multiOfferCheckDiscretion: false,
  multiOfferCheckConfidential: false,
}

const NATIVE_PREFILL_WITH_REP = {
  ...NATIVE_PREFILL,
  rep: { name: "Nadia Rep", phone: "0400333444", email: "rep@law.com", isPreferredContact: "yes" },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function setupMocks(page: Parameters<typeof signInAsAdmin>[0], prefill: object = NATIVE_PREFILL) {
  await page.route("**/api/admin/property-status**", async (route) => {
    await route.fulfill({
      status: 200, contentType: "application/json",
      body: JSON.stringify({ items: [{ propertyStatusId: 1, propertyStatusCode: "ACTIVE", propertyStatus: "Active" }], totalCount: 1, limit: 100, totalPages: 1, hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null }),
    })
  })
  await page.route("**/api/admin/buyer-status**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [] }) })
  })
  await page.route("**/api/admin/properties**", async (route: Route) => {
    const url = route.request().url()
    if (url.includes("/buyer-offers") && route.request().method() === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([BUYER_OFFER]) })
      return
    }
    if (/\/properties\/\d+\/(buyers|contacts|tenants|files|entities)/.test(url)) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [] }) })
      return
    }
    if (url.match(new RegExp(`/api/admin/properties/${MOCK_PROPERTY_ID}(\\?|$)`))) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(PROPERTY_DETAIL) })
      return
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(PROPERTY_LIST) })
  })
  await page.route(`**/api/admin/buyer-offers/${MOCK_OFFER_ID}/form-view**`, async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(prefill) })
  })
}

async function openNativeView(page: Parameters<typeof signInAsAdmin>[0]) {
  await page.goto("/admin/properties")
  await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible({ timeout: 20_000 })
  await page.getByTestId(`admin-entity-row--properties--${MOCK_PROPERTY_ID}`).click()

  const dialog = page.getByTestId("admin-entity-crud-dialog--properties")
  await expect(dialog).toBeVisible({ timeout: 15_000 })

  await dialog.getByTestId("panda-properties-form-tab-trigger--sales").click()

  const offersSection = dialog.getByTestId("panda-properties-form-section--buyer-offers")
  await expect(offersSection).toBeVisible({ timeout: 10_000 })
  await expect(offersSection.getByTestId(`panda-properties-buyer-offer-row--${MOCK_OFFER_ID}`)).toBeVisible({ timeout: 10_000 })

  await offersSection.getByTestId(`buyer-offer-section-view-form-btn--${MOCK_OFFER_ID}`).click()
  const nativeView = page.getByTestId(`buyer-offer-native-view--${MOCK_OFFER_ID}`)
  await expect(nativeView).toBeVisible({ timeout: 10_000 })
  return nativeView
}

/** Computes top offsets of all targets relative to the native-view container in one JS evaluation. */
async function getRelativeTops(page: Parameters<typeof signInAsAdmin>[0], containerTestId: string, ...targetTestIds: string[]): Promise<number[]> {
  return page.evaluate(
    ({ containerId, targetIds }) => {
      const container = document.querySelector(`[data-testid="${containerId}"]`)
      if (!container) throw new Error(`Container [data-testid="${containerId}"] not found`)
      const containerRect = container.getBoundingClientRect()
      return targetIds.map((id) => {
        const el = document.querySelector(`[data-testid="${id}"]`)
        if (!el) throw new Error(`[data-testid="${id}"] not found`)
        return el.getBoundingClientRect().top - containerRect.top
      })
    },
    { containerId: containerTestId, targetIds: targetTestIds },
  )
}

const SAME_ROW_PX = 8
const DIFF_ROW_PX = 20

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe("Buyer offer native view — 4-column layout on wide screens", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set — cannot open admin")
    await mkdir(SHOT_DIR, { recursive: true })
  })

  test.afterAll(() => {
    story.write()
  })

  // ── Happy path: 4-col at xl ───────────────────────────────────────────────

  test("buyer fields: all 4 render in a single row at xl breakpoint (1440px)", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await setupMocks(page)
    await signInAsAdmin(page)
    const nativeView = await openNativeView(page)

    const container = `buyer-offer-native-view--${MOCK_OFFER_ID}`
    const [nameTop, phoneTop, emailTop, addressTop] = await getRelativeTops(
      page, container,
      "buyer-offer-native--buyer-1-name",
      "buyer-offer-native--buyer-1-phone",
      "buyer-offer-native--buyer-1-email",
      "buyer-offer-native--buyer-1-address",
    )

    expect(Math.abs(nameTop - phoneTop)).toBeLessThan(SAME_ROW_PX)
    expect(Math.abs(nameTop - emailTop)).toBeLessThan(SAME_ROW_PX)
    expect(Math.abs(nameTop - addressTop)).toBeLessThan(SAME_ROW_PX)

    const nameEl = nativeView.getByTestId("buyer-offer-native--buyer-1-name")
    await expect(nameEl).toBeVisible()
    await shotFocused(page, nameEl, SHOT_DIR, "01-buyer-4col-xl")
    story.addScene({
      title: "01 — Buyer Fields: 4-Column Layout at xl (1440px)",
      images: [join(SHOT_DIR, "01-buyer-4col-xl.png")],
      seeing:
        "All 4 buyer fields (Full Legal Entity Name, Phone Number, Email Address, Current Residential Address) " +
        "appear in a single row at the xl breakpoint inside the admin property dialog native view.",
      steps: [
        "Set viewport to 1440px wide",
        "Sign in to admin and open a property dialog",
        "Navigate to Sales tab → Latest Buyer Offers → View Form",
        "Observe all 4 buyer fields side-by-side in one horizontal row",
      ],
    })
  })

  test("solicitor fields: all 4 render in a single row at xl breakpoint (1440px)", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await setupMocks(page)
    await signInAsAdmin(page)
    const nativeView = await openNativeView(page)

    const container = `buyer-offer-native-view--${MOCK_OFFER_ID}`
    const [nameTop, phoneTop, addressTop, emailTop] = await getRelativeTops(
      page, container,
      "buyer-offer-native--solicitor-name",
      "buyer-offer-native--solicitor-phone",
      "buyer-offer-native--solicitor-address",
      "buyer-offer-native--solicitor-email",
    )

    expect(Math.abs(nameTop - phoneTop)).toBeLessThan(SAME_ROW_PX)
    expect(Math.abs(nameTop - addressTop)).toBeLessThan(SAME_ROW_PX)
    expect(Math.abs(nameTop - emailTop)).toBeLessThan(SAME_ROW_PX)

    const nameEl = nativeView.getByTestId("buyer-offer-native--solicitor-name")
    await expect(nameEl).toBeVisible()
    await shotFocused(page, nameEl, SHOT_DIR, "02-solicitor-4col-xl")
    story.addScene({
      title: "02 — Solicitor Fields: 4-Column Layout at xl (1440px)",
      images: [join(SHOT_DIR, "02-solicitor-4col-xl.png")],
      seeing:
        "All 4 solicitor fields (Name, Phone, Legal Practice Address, Email) appear in a single row " +
        "at the xl breakpoint inside the native view.",
      steps: [
        "Set viewport to 1440px wide",
        "Open the native view in the admin property dialog",
        "Scroll to Section 2 — Solicitor Details",
        "Observe all 4 solicitor fields side-by-side in one row",
      ],
    })
  })

  test("finance fields: all 4 render in a single row at xl breakpoint (1440px)", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await setupMocks(page)
    await signInAsAdmin(page)
    const nativeView = await openNativeView(page)

    const container = `buyer-offer-native-view--${MOCK_OFFER_ID}`
    const [amountTop, depositTop, initialTop, secondTop] = await getRelativeTops(
      page, container,
      "buyer-offer-native--offer-amount",
      "buyer-offer-native--total-deposit",
      "buyer-offer-native--initial-payment",
      "buyer-offer-native--second-payment",
    )

    expect(Math.abs(amountTop - depositTop)).toBeLessThan(SAME_ROW_PX)
    expect(Math.abs(amountTop - initialTop)).toBeLessThan(SAME_ROW_PX)
    expect(Math.abs(amountTop - secondTop)).toBeLessThan(SAME_ROW_PX)

    const amountEl = nativeView.getByTestId("buyer-offer-native--offer-amount")
    await expect(amountEl).toBeVisible()
    await shotFocused(page, amountEl, SHOT_DIR, "03-finance-4col-xl")
    story.addScene({
      title: "03 — Finance Fields: 4-Column Layout at xl (1440px)",
      images: [join(SHOT_DIR, "03-finance-4col-xl.png")],
      seeing:
        "All 4 financial offer fields (Proposed Offer Amount, Total Deposit, Initial Holding Payment, " +
        "Secondary Payment) appear in a single row at the xl breakpoint.",
      steps: [
        "Set viewport to 1440px wide",
        "Open the native view in the admin property dialog",
        "Scroll to Section 3 — Financial Offer Structuring",
        "Observe all 4 finance fields side-by-side in one row",
      ],
    })
  })

  // ── Edge case: rep section stays 3-col ───────────────────────────────────

  test("representative section: all 3 fields render in a single row at xl breakpoint (1440px)", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await setupMocks(page, NATIVE_PREFILL_WITH_REP)
    await signInAsAdmin(page)
    const nativeView = await openNativeView(page)

    await expect(nativeView.getByTestId("buyer-offer-native--rep-section")).toBeVisible()

    const container = `buyer-offer-native-view--${MOCK_OFFER_ID}`
    const [repNameTop, repPhoneTop, repEmailTop] = await getRelativeTops(
      page, container,
      "buyer-offer-native--rep-name",
      "buyer-offer-native--rep-phone",
      "buyer-offer-native--rep-email",
    )

    expect(Math.abs(repNameTop - repPhoneTop)).toBeLessThan(SAME_ROW_PX)
    expect(Math.abs(repNameTop - repEmailTop)).toBeLessThan(SAME_ROW_PX)

    const repSection = nativeView.getByTestId("buyer-offer-native--rep-section")
    await shotFocused(page, repSection, SHOT_DIR, "04-rep-3col-xl")
    story.addScene({
      title: "04 — Representative Section: Stays 3-Column at xl",
      images: [join(SHOT_DIR, "04-rep-3col-xl.png")],
      seeing:
        "The rep section (Name, Phone, Email) renders in 3 columns at xl, not 4. " +
        "Since there are only 3 rep fields, an empty 4th slot is avoided.",
      steps: [
        "Set viewport to 1440px wide",
        "Load native view with a rep prefill",
        "Observe rep section shows all 3 fields in one row with no empty slot",
      ],
    })
  })

  // ── Regression guards: md and mobile unchanged ────────────────────────────

  test("buyer fields: 2 columns at md breakpoint (900px) — regression guard", async ({ page }) => {
    // Navigate at a normal viewport; resize to md only for layout measurement
    await page.setViewportSize({ width: 1280, height: 900 })
    await setupMocks(page)
    await signInAsAdmin(page)
    const nativeView = await openNativeView(page)
    await page.setViewportSize({ width: 900, height: 900 })

    const container = `buyer-offer-native-view--${MOCK_OFFER_ID}`
    const [nameTop, phoneTop, emailTop, addressTop] = await getRelativeTops(
      page, container,
      "buyer-offer-native--buyer-1-name",
      "buyer-offer-native--buyer-1-phone",
      "buyer-offer-native--buyer-1-email",
      "buyer-offer-native--buyer-1-address",
    )

    // At 2-col: name & phone on row 1, email & address on row 2
    expect(Math.abs(nameTop - phoneTop)).toBeLessThan(SAME_ROW_PX)
    expect(Math.abs(emailTop - addressTop)).toBeLessThan(SAME_ROW_PX)
    expect(Math.abs(nameTop - emailTop)).toBeGreaterThan(DIFF_ROW_PX)

    const nameEl = nativeView.getByTestId("buyer-offer-native--buyer-1-name")
    await expect(nameEl).toBeVisible()
    await shotFocused(page, nameEl, SHOT_DIR, "05-buyer-2col-md")
    story.addScene({
      title: "05 — Buyer Fields: 2-Column Layout at md (900px) — No Regression",
      images: [join(SHOT_DIR, "05-buyer-2col-md.png")],
      seeing:
        "At md (900px), buyer fields stay in 2 columns: Name/Phone on row 1, Email/Address on row 2. " +
        "The xl change did not break the md layout.",
      steps: [
        "Set viewport to 900px wide",
        "Open native view in admin property dialog",
        "Observe 2-column buyer layout is unchanged",
      ],
    })
  })

  test("buyer fields: 1 column at mobile (375px) — regression guard", async ({ page }) => {
    // Navigate at a normal viewport; resize to mobile only for layout measurement
    await page.setViewportSize({ width: 1280, height: 900 })
    await setupMocks(page)
    await signInAsAdmin(page)
    const nativeView = await openNativeView(page)
    await page.setViewportSize({ width: 375, height: 812 })

    const container = `buyer-offer-native-view--${MOCK_OFFER_ID}`
    const [nameTop, phoneTop] = await getRelativeTops(
      page, container,
      "buyer-offer-native--buyer-1-name",
      "buyer-offer-native--buyer-1-phone",
    )

    // At 1-col, name and phone must be on different rows
    expect(Math.abs(nameTop - phoneTop)).toBeGreaterThan(DIFF_ROW_PX)

    const nameEl = nativeView.getByTestId("buyer-offer-native--buyer-1-name")
    await expect(nameEl).toBeVisible()
    await shotFocused(page, nameEl, SHOT_DIR, "06-buyer-1col-mobile")
    story.addScene({
      title: "06 — Buyer Fields: 1-Column Layout at Mobile (375px) — No Regression",
      images: [join(SHOT_DIR, "06-buyer-1col-mobile.png")],
      seeing:
        "At mobile (375px), buyer fields stack vertically in a single column. " +
        "The xl and md layout changes did not affect mobile.",
      steps: [
        "Set viewport to 375px wide",
        "Open native view in admin property dialog",
        "Observe single-column stacked layout",
      ],
    })
  })
})
