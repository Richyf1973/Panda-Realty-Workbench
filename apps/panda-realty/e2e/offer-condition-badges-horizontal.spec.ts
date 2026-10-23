import { expect, test, type Page, type Route } from "@playwright/test"

import { e2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import {
  EMPTY_PROPERTY_ENTITIES_RESPONSE,
  SINGLE_PROPERTY_RESPONSE,
  STATUS_LIST_RESPONSE,
} from "./helpers/admin-properties-mocks"
import { maybeFulfillPandaPropertyBuyerOffersGet } from "./helpers/panda-properties-dialog-mocks"

const BASE_OFFER = {
  buyerOfferId: 9010,
  entityName: "Test Buyer LLC",
  offer: "900000.00",
  isAccepted: false,
  dateOffered: "2026-05-21",
  createdAt: "2026-05-21T00:00:00Z",
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
  settlementPeriod: null,
}

const PROPERTY_DETAIL = {
  ...SINGLE_PROPERTY_RESPONSE.items[0],
  propertyListId: 1001,
  isFavorite: true,
}

async function setupMockedProperty(page: Page, offers: Record<string, unknown>[]) {
  await page.route("**/api/admin/property-status**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(STATUS_LIST_RESPONSE) })
  })
  await page.route("**/api/admin/property-entities**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_PROPERTY_ENTITIES_RESPONSE) })
  })
  await page.route("**/api/admin/properties**", async (route: Route) => {
    const url = route.request().url()
    if (await maybeFulfillPandaPropertyBuyerOffersGet(route, { body: offers })) return
    if (url.match(/\/api\/admin\/properties\/1001(\?|$)/)) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(PROPERTY_DETAIL) })
      return
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ...SINGLE_PROPERTY_RESPONSE, items: [PROPERTY_DETAIL] }),
    })
  })
}

test.describe("Offer condition badges layout in Latest Buyer Offers table", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")
  })

  test("Finance and Subject to Sale badges appear on the same horizontal line", async ({ page }) => {
    const offer = { ...BASE_OFFER, isSubjectToFinance: true, isSubjectToSale: true }
    await setupMockedProperty(page, [offer])
    await signInAsAdmin(page)

    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible()
    await page.getByTestId("admin-entity-row--properties--1001").click()
    await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible()

    await page.getByTestId("panda-properties-form-tab-trigger--sales").click()

    const offersSection = page.getByTestId("panda-properties-form-section--buyer-offers")
    const row = offersSection.getByTestId(`panda-properties-buyer-offer-row--${offer.buyerOfferId}`)
    await expect(row).toBeVisible()

    const financeBadge = row.locator('span:has-text("Finance")')
    const subjectToSaleBadge = row.locator('span:has-text("Subject to Sale")')

    await expect(financeBadge).toBeVisible()
    await expect(subjectToSaleBadge).toBeVisible()

    const financeBox = await financeBadge.boundingBox()
    const subjectBox = await subjectToSaleBadge.boundingBox()

    expect(financeBox).not.toBeNull()
    expect(subjectBox).not.toBeNull()

    // Both badges must share the same horizontal line — tops within 4px of each other
    const verticalDiff = Math.abs(financeBox!.y - subjectBox!.y)
    expect(verticalDiff, `Finance badge top=${financeBox!.y}, Subject to Sale badge top=${subjectBox!.y} — expected same line`).toBeLessThan(4)
  })

  test("only Finance badge renders when isSubjectToFinance is true and isSubjectToSale is false", async ({ page }) => {
    const offer = { ...BASE_OFFER, isSubjectToFinance: true, isSubjectToSale: false }
    await setupMockedProperty(page, [offer])
    await signInAsAdmin(page)

    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible()
    await page.getByTestId("admin-entity-row--properties--1001").click()
    await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible()

    await page.getByTestId("panda-properties-form-tab-trigger--sales").click()

    const offersSection = page.getByTestId("panda-properties-form-section--buyer-offers")
    const row = offersSection.getByTestId(`panda-properties-buyer-offer-row--${offer.buyerOfferId}`)
    await expect(row).toBeVisible()

    await expect(row.locator('span:has-text("Finance")')).toBeVisible()
    await expect(row.locator('span:has-text("Subject to Sale")')).toHaveCount(0)
  })

  test("only Subject to Sale badge renders when isSubjectToSale is true and isSubjectToFinance is false", async ({ page }) => {
    const offer = { ...BASE_OFFER, isSubjectToFinance: false, isSubjectToSale: true }
    await setupMockedProperty(page, [offer])
    await signInAsAdmin(page)

    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible()
    await page.getByTestId("admin-entity-row--properties--1001").click()
    await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible()

    await page.getByTestId("panda-properties-form-tab-trigger--sales").click()

    const offersSection = page.getByTestId("panda-properties-form-section--buyer-offers")
    const row = offersSection.getByTestId(`panda-properties-buyer-offer-row--${offer.buyerOfferId}`)
    await expect(row).toBeVisible()

    await expect(row.locator('span:has-text("Subject to Sale")')).toBeVisible()
    await expect(row.locator('span:has-text("Finance")')).toHaveCount(0)
  })

  test("no condition badges render when both flags are null", async ({ page }) => {
    const offer = { ...BASE_OFFER, isSubjectToFinance: null, isSubjectToSale: null }
    await setupMockedProperty(page, [offer])
    await signInAsAdmin(page)

    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible()
    await page.getByTestId("admin-entity-row--properties--1001").click()
    await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible()

    await page.getByTestId("panda-properties-form-tab-trigger--sales").click()

    const offersSection = page.getByTestId("panda-properties-form-section--buyer-offers")
    const row = offersSection.getByTestId(`panda-properties-buyer-offer-row--${offer.buyerOfferId}`)
    await expect(row).toBeVisible()

    await expect(row.locator('span:has-text("Finance")')).toHaveCount(0)
    await expect(row.locator('span:has-text("Subject to Sale")')).toHaveCount(0)
  })
})
