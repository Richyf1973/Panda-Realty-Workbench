/**
 * E2E (TDD): "View offer" button on PropertyEntityBuyerOffersPanel
 *
 * Tests the per-row "View offer" button added to the entity edit dialog's Offers tab.
 * Clicking the button must open a new tab at /offer-form/{token}?offerId={id}&view=1.
 *
 * The panel receives offerFormToken from GET /property-entities/{id}/buyer-offers response.
 * All API calls are mocked — no live DB required.
 *
 * Success factors:
 * 1. "View offer" button (offers-row-view-btn--{id}) is visible on every offer row
 * 2. Clicking opens new tab with URL containing /offer-form/{token}?offerId={id}&view=1
 * 3. Different rows produce different offerId params in the URL
 * 4. Button is present even on accepted offer rows (not gated on isAccepted)
 *
 * Run:
 *   npm run test:e2e -w panda-realty -- apps/panda-realty/e2e/offer-view-button-entity-dialog.spec.ts
 */

import { expect, test, type Page } from "@playwright/test"

import { requirePandaE2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import {
  BUYER_ENTITY_DETAIL,
  BUYER_ENTITY_ROW,
  CONNECTION_501_DETAIL,
  EMPTY_LIST,
} from "./helpers/buyer-offers-edit-mocks"

const MOCK_PE_ID = 501
const MOCK_TOKEN = "test-offer-form-token-abc"

const BASE_OFFER = {
  isCashOffer: false,
  noConditions: false,
  coolingOffDays: null,
  financeDays: null,
  buildingPestDays: null,
  dueDiligenceDays: null,
  subjectToSaleDays: null,
  subjectToSaleStage: null,
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
  waiveCoolingOff: false,
  isSubjectToFinance: false,
  financeBank: null,
  settlementPeriod: "38 Days",
}

const MOCK_OFFERS_RESPONSE = {
  propertyListId: 1001,
  contractDate: null,
  offerFormToken: MOCK_TOKEN,
  offers: [
    { ...BASE_OFFER, buyerOfferId: 9001, offer: "1200000", isAccepted: false, dateOffered: "2026-05-22" },
    { ...BASE_OFFER, buyerOfferId: 9002, offer: "950000", isAccepted: false, dateOffered: "2026-05-22" },
  ],
}

async function installRoutes(page: Page, offersResponse = MOCK_OFFERS_RESPONSE) {
  await page.route("**/api/admin/entities**", async (route) => {
    if (route.request().method() !== "GET") { await route.continue(); return }
    const url = route.request().url()
    if (url.match(/\/api\/admin\/entities\/201(\?|$)/)) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(BUYER_ENTITY_DETAIL) })
      return
    }
    await route.fulfill({
      status: 200, contentType: "application/json",
      body: JSON.stringify({ ...EMPTY_LIST, items: [BUYER_ENTITY_ROW], totalCount: 1, totalPages: 1 }),
    })
  })

  await page.route("**/api/admin/property-entities**", async (route) => {
    const url = route.request().url()
    if (route.request().method() !== "GET") { await route.continue(); return }
    if (url.match(/\/property-entities\/\d+\/buyer-offers/)) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(offersResponse) })
      return
    }
    const detailMatch = url.match(/\/property-entities\/(\d+)/)
    if (detailMatch) {
      const id = Number(detailMatch[1])
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(id === MOCK_PE_ID ? CONNECTION_501_DETAIL : {}) })
      return
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [CONNECTION_501_DETAIL] }) })
  })

  for (const pattern of [
    "**/api/admin/entity-members**",
    "**/api/admin/buyer-status**",
    "**/api/admin/property-status**",
    "**/api/admin/buyer-pipeline-status**",
    "**/api/admin/entity-categories**",
    "**/api/admin/lead-sources**",
    "**/api/admin/contact-categories**",
  ]) {
    await page.route(pattern, async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_LIST) })
    })
  }
}

async function openOffersTab(page: Page) {
  await page.goto("/admin/entities?limit=25&page=1&sortKey=entityName&sortDir=asc&entityCategoryId=1&listLayout=grid")
  await page.waitForLoadState("domcontentloaded")
  await page.getByTestId(/^admin-entity-row-edit--entities--/).first().click()

  const dialog = page.getByTestId("admin-entity-crud-dialog--entities")
  await expect(dialog).toBeVisible()

  const dialogForm = dialog.getByTestId("panda-entities-dialog-form")
  await dialogForm.evaluate((el) => el.scrollTo(0, el.scrollHeight))

  const connections = dialog.getByTestId("panda-entities-property-connections")
  await expect(connections).toBeVisible({ timeout: 10_000 })

  const peTabs = connections.getByTestId("admin-entity-crud-related-tabs--property-entities")
  await expect(peTabs.getByRole("tab", { name: /^offers$/i })).toBeVisible({ timeout: 10_000 })
  await peTabs.getByRole("tab", { name: /^offers$/i }).click()

  const panel = connections.getByTestId("admin-entity-crud-related-panel--property-entities--buyer-offers-tab")
  await expect(panel).toBeVisible({ timeout: 10_000 })
  await expect(panel.getByTestId("offers-tab-table")).toBeVisible({ timeout: 8_000 })

  return { dialog, connections, panel }
}

test.describe("View offer button — entity edit dialog Offers tab", () => {
  test.describe.configure({ timeout: 120_000 })

  test.beforeEach(async ({ page }) => {
    requirePandaE2eAdminCredentials()
    await installRoutes(page)
    await signInAsAdmin(page)
  })

  // ── SF1: Button visible on every row ─────────────────────────────────────

  test("SF1 — View offer button is visible on every offer row", async ({ page }) => {
    const { panel } = await openOffersTab(page)

    await expect(panel.getByTestId("offers-row-view-btn--9001")).toBeVisible()
    await expect(panel.getByTestId("offers-row-view-btn--9002")).toBeVisible()
  })

  // ── SF2: Opens correct URL with offerId + view=1 ──────────────────────────

  test("SF2 — clicking View offer opens new tab at /offer-form/{token}?offerId=&view=1", async ({ page }) => {
    const { panel } = await openOffersTab(page)

    const [newPage] = await Promise.all([
      page.context().waitForEvent("page"),
      panel.getByTestId("offers-row-view-btn--9001").click(),
    ])

    await newPage.waitForLoadState("domcontentloaded")
    const url = newPage.url()
    expect(url).toContain(`/offer-form/${MOCK_TOKEN}`)
    expect(url).toContain("offerId=9001")
    expect(url).toContain("view=1")

    await newPage.close()
  })

  // ── SF3: Different rows → different offerId ───────────────────────────────

  test("SF3 — different rows produce distinct offerId params", async ({ page }) => {
    const { panel } = await openOffersTab(page)

    const [page1] = await Promise.all([
      page.context().waitForEvent("page"),
      panel.getByTestId("offers-row-view-btn--9001").click(),
    ])
    await page1.waitForLoadState("domcontentloaded")
    expect(page1.url()).toContain("offerId=9001")
    expect(page1.url()).not.toContain("offerId=9002")
    await page1.close()

    const [page2] = await Promise.all([
      page.context().waitForEvent("page"),
      panel.getByTestId("offers-row-view-btn--9002").click(),
    ])
    await page2.waitForLoadState("domcontentloaded")
    expect(page2.url()).toContain("offerId=9002")
    expect(page2.url()).not.toContain("offerId=9001")
    await page2.close()
  })

  // ── SF4: Button present on accepted rows ─────────────────────────────────

  test("SF4 — View offer button shown even when offer is accepted", async ({ page }) => {
    const acceptedResponse = {
      ...MOCK_OFFERS_RESPONSE,
      offers: [{ ...MOCK_OFFERS_RESPONSE.offers[0]!, isAccepted: true }],
    }

    await page.route("**/api/admin/property-entities**", async (route) => {
      const url = route.request().url()
      if (route.request().method() !== "GET") { await route.continue(); return }
      if (url.match(/\/property-entities\/\d+\/buyer-offers/)) {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(acceptedResponse) })
        return
      }
      const detailMatch = url.match(/\/property-entities\/(\d+)/)
      if (detailMatch) {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(Number(detailMatch[1]) === MOCK_PE_ID ? CONNECTION_501_DETAIL : {}) })
        return
      }
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [CONNECTION_501_DETAIL] }) })
    })

    const { panel } = await openOffersTab(page)

    const row = panel.getByTestId("offers-row--9001")
    await expect(row).toContainText("Accepted")
    await expect(panel.getByTestId("offers-row-view-btn--9001")).toBeVisible()
  })
})
