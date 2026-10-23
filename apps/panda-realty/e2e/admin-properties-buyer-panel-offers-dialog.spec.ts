import { expect, test, type Route } from "@playwright/test"

import { e2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import {
  BUYER_PANEL_ITEMS_RESPONSE_1001,
  EMPTY_PROPERTY_ENTITIES_RESPONSE,
  PROPERTY_EDIT_WITH_BUYER,
  SINGLE_PROPERTY_RESPONSE,
  STATUS_LIST_RESPONSE,
} from "./helpers/admin-properties-mocks"

const OFFER_9001 = {
  buyerOfferId: 9001,
  offer: "750000",
  isAccepted: false,
  dateOffered: "2026-03-15",
  isCashOffer: false,
  noConditions: false,
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
}

const OFFER_9002 = {
  ...OFFER_9001,
  buyerOfferId: 9002,
  offer: "720000",
  isAccepted: true,
  dateOffered: "2026-02-10",
}

const BUYER_OFFERS_RESPONSE_WITH_TWO = {
  propertyListId: 1001,
  contractDate: null,
  offers: [OFFER_9001, OFFER_9002],
}

const BUYER_OFFERS_EMPTY_RESPONSE = {
  propertyListId: 1001,
  contractDate: null,
  offers: [],
}

const BUYER_PANEL_TWO_BUYERS = {
  items: [
    {
      propertyEntityId: 501,
      entityId: 201,
      entityName: "Test Buyer LLC",
      phoneNumber: "0400 111 222",
      emailAddress: "buyer@test.com",
      address: "1 Buyer Rd",
      esuburb: null,
      estate: null,
      epostcode: null,
      notes: null,
      buyerPipelineStatusId: null,
      pipelineStatusLabel: null,
    },
    {
      propertyEntityId: 502,
      entityId: 202,
      entityName: "Second Buyer Co",
      phoneNumber: null,
      emailAddress: null,
      address: null,
      esuburb: null,
      estate: null,
      epostcode: null,
      notes: null,
      buyerPipelineStatusId: null,
      pipelineStatusLabel: null,
    },
  ],
}

test.describe("Buyer panel row — Offers dialog button (mocked APIs)", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")
    await page.route("**/api/admin/property-status**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(STATUS_LIST_RESPONSE) })
    })
    await page.route("**/api/admin/buyer-status**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [] }) })
    })
    await signInAsAdmin(page)
  })

  async function openBuyersTab(page: Parameters<typeof signInAsAdmin>[0]) {
    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible()
    await page.getByTestId("admin-entity-row--properties--1001").click()
    await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible()
    await page.getByTestId("panda-properties-form-tab-trigger--buyers").click()
    await expect(page.getByTestId("panda-properties-form-tab--buyers")).toBeVisible()
    await expect(page.getByTestId("property-buyers-panel-add-new")).toBeEnabled({ timeout: 10_000 })
  }

  test("DollarSign offers button is visible on each buyer panel row", async ({ page }) => {
    await page.route("**/api/admin/properties**", async (route: Route) => {
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
    await page.route("**/api/admin/property-entities**", async (route: Route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_PROPERTY_ENTITIES_RESPONSE) })
    })

    await openBuyersTab(page)

    await expect(page.getByTestId("property-buyer-panel-row--501")).toBeVisible()
    await expect(page.getByTestId("property-buyer-owner-row-offers--501")).toBeVisible()
  })

  test("clicking offers button opens dialog titled with buyer name", async ({ page }) => {
    await page.route("**/api/admin/properties**", async (route: Route) => {
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
    await page.route("**/api/admin/property-entities**", async (route: Route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_PROPERTY_ENTITIES_RESPONSE) })
    })
    await page.route("**/api/admin/property-entities/501/buyer-offers**", async (route: Route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(BUYER_OFFERS_RESPONSE_WITH_TWO) })
    })

    await openBuyersTab(page)
    await page.getByTestId("property-buyer-owner-row-offers--501").click()

    const dialog = page.getByTestId("property-buyer-panel-offers-dialog")
    await expect(dialog).toBeVisible()
    await expect(dialog).toContainText("Test Buyer LLC")
  })

  test("dialog shows existing offers in a table", async ({ page }) => {
    await page.route("**/api/admin/properties**", async (route: Route) => {
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
    await page.route("**/api/admin/property-entities**", async (route: Route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_PROPERTY_ENTITIES_RESPONSE) })
    })
    await page.route("**/api/admin/property-entities/501/buyer-offers**", async (route: Route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(BUYER_OFFERS_RESPONSE_WITH_TWO) })
    })

    await openBuyersTab(page)
    await page.getByTestId("property-buyer-owner-row-offers--501").click()

    const dialog = page.getByTestId("property-buyer-panel-offers-dialog")
    await expect(dialog).toBeVisible()
    await expect(dialog.getByTestId("offers-tab-table")).toBeVisible()
    await expect(dialog.getByTestId("offers-row--9001")).toBeVisible()
    await expect(dialog.getByTestId("offers-row--9002")).toBeVisible()
    await expect(dialog).toContainText("Accepted")
  })

  test("dialog shows empty state when buyer has no offers", async ({ page }) => {
    await page.route("**/api/admin/properties**", async (route: Route) => {
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
    await page.route("**/api/admin/property-entities**", async (route: Route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_PROPERTY_ENTITIES_RESPONSE) })
    })
    await page.route("**/api/admin/property-entities/501/buyer-offers**", async (route: Route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(BUYER_OFFERS_EMPTY_RESPONSE) })
    })

    await openBuyersTab(page)
    await page.getByTestId("property-buyer-owner-row-offers--501").click()

    const dialog = page.getByTestId("property-buyer-panel-offers-dialog")
    await expect(dialog).toBeVisible()
    await expect(dialog).toContainText("No offers recorded yet")
    await expect(dialog.getByTestId("offers-tab-toggle-btn")).toBeVisible()
  })

  test("Add Offer button is disabled while amount field is empty", async ({ page }) => {
    await page.route("**/api/admin/properties**", async (route: Route) => {
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
    await page.route("**/api/admin/property-entities**", async (route: Route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_PROPERTY_ENTITIES_RESPONSE) })
    })
    await page.route("**/api/admin/property-entities/501/buyer-offers**", async (route: Route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(BUYER_OFFERS_EMPTY_RESPONSE) })
    })

    await openBuyersTab(page)
    await page.getByTestId("property-buyer-owner-row-offers--501").click()

    const dialog = page.getByTestId("property-buyer-panel-offers-dialog")
    await expect(dialog).toBeVisible()
    await dialog.getByTestId("offers-tab-toggle-btn").click()
    await expect(dialog.getByTestId("offers-tab-form")).toBeVisible()
    await expect(dialog.getByTestId("offers-tab-submit-btn")).toBeDisabled()

    await dialog.getByTestId("offers-tab-amount-input").fill("800000")
    await expect(dialog.getByTestId("offers-tab-submit-btn")).toBeEnabled()
  })

  test("adding a new offer via the dialog creates it and shows the new row", async ({ page }) => {
    const newOffer = { ...OFFER_9001, buyerOfferId: 9999, offer: "800000" }
    let offers = [...BUYER_OFFERS_RESPONSE_WITH_TWO.offers]

    await page.route("**/api/admin/properties**", async (route: Route) => {
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
    await page.route("**/api/admin/property-entities**", async (route: Route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_PROPERTY_ENTITIES_RESPONSE) })
    })
    await page.route("**/api/admin/property-entities/501/buyer-offers**", async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ...BUYER_OFFERS_RESPONSE_WITH_TWO, offers }),
      })
    })
    await page.route("**/api/admin/buyer-offers**", async (route: Route) => {
      if (route.request().method() === "POST") {
        offers = [...offers, newOffer]
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(newOffer) })
        return
      }
      await route.continue()
    })

    await openBuyersTab(page)
    await page.getByTestId("property-buyer-owner-row-offers--501").click()

    const dialog = page.getByTestId("property-buyer-panel-offers-dialog")
    await expect(dialog).toBeVisible()
    await dialog.getByTestId("offers-tab-toggle-btn").click()
    await expect(dialog.getByTestId("offers-tab-form")).toBeVisible()
    await dialog.getByTestId("offers-tab-amount-input").fill("800000")
    await dialog.getByTestId("offers-tab-submit-btn").click()

    await expect(dialog.getByTestId("offers-row--9999")).toBeVisible({ timeout: 8_000 })
  })

  test("deleting an offer removes its row from the dialog", async ({ page }) => {
    let offers = [OFFER_9001]

    await page.route("**/api/admin/properties**", async (route: Route) => {
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
    await page.route("**/api/admin/property-entities**", async (route: Route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_PROPERTY_ENTITIES_RESPONSE) })
    })
    await page.route("**/api/admin/property-entities/501/buyer-offers**", async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ propertyListId: 1001, contractDate: null, offers }),
      })
    })
    await page.route("**/api/admin/buyer-offers/9001**", async (route: Route) => {
      if (route.request().method() === "DELETE") {
        offers = []
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) })
        return
      }
      await route.continue()
    })

    await openBuyersTab(page)
    await page.getByTestId("property-buyer-owner-row-offers--501").click()

    const dialog = page.getByTestId("property-buyer-panel-offers-dialog")
    await expect(dialog).toBeVisible()
    await expect(dialog.getByTestId("offers-row--9001")).toBeVisible()
    await dialog.getByTestId("offers-tab-delete--9001").click()

    await expect(dialog.getByTestId("offers-row--9001")).not.toBeVisible({ timeout: 8_000 })
    await expect(dialog).toContainText("No offers recorded yet")
  })

  test("closing the dialog returns focus to buyer panel", async ({ page }) => {
    await page.route("**/api/admin/properties**", async (route: Route) => {
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
    await page.route("**/api/admin/property-entities**", async (route: Route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_PROPERTY_ENTITIES_RESPONSE) })
    })
    await page.route("**/api/admin/property-entities/501/buyer-offers**", async (route: Route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(BUYER_OFFERS_EMPTY_RESPONSE) })
    })

    await openBuyersTab(page)
    await page.getByTestId("property-buyer-owner-row-offers--501").click()

    const dialog = page.getByTestId("property-buyer-panel-offers-dialog")
    await expect(dialog).toBeVisible()
    await page.keyboard.press("Escape")
    await expect(dialog).not.toBeVisible()
    await expect(page.getByTestId("property-buyer-panel-row--501")).toBeVisible()
  })

  test("opening offers for a second buyer shows that buyer's data (no stale state)", async ({ page }) => {
    const buyer502Offers = {
      propertyListId: 1001,
      contractDate: null,
      offers: [{ ...OFFER_9001, buyerOfferId: 8888, offer: "600000" }],
    }

    await page.route("**/api/admin/properties**", async (route: Route) => {
      const url = route.request().url()
      if (url.match(/\/api\/admin\/properties\/1001\/buyers(\?|$)/)) {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(BUYER_PANEL_TWO_BUYERS) })
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
    await page.route("**/api/admin/property-entities**", async (route: Route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_PROPERTY_ENTITIES_RESPONSE) })
    })
    await page.route("**/api/admin/property-entities/501/buyer-offers**", async (route: Route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(BUYER_OFFERS_RESPONSE_WITH_TWO) })
    })
    await page.route("**/api/admin/property-entities/502/buyer-offers**", async (route: Route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(buyer502Offers) })
    })

    await openBuyersTab(page)

    // Open buyer 501's offers
    await page.getByTestId("property-buyer-owner-row-offers--501").click()
    let dialog = page.getByTestId("property-buyer-panel-offers-dialog")
    await expect(dialog).toBeVisible()
    await expect(dialog).toContainText("Test Buyer LLC")
    await expect(dialog.getByTestId("offers-row--9001")).toBeVisible()
    await page.keyboard.press("Escape")
    await expect(dialog).not.toBeVisible()

    // Open buyer 502's offers — dialog must reflect the second buyer
    await page.getByTestId("property-buyer-owner-row-offers--502").click()
    dialog = page.getByTestId("property-buyer-panel-offers-dialog")
    await expect(dialog).toBeVisible()
    await expect(dialog).toContainText("Second Buyer Co")
    await expect(dialog.getByTestId("offers-row--8888")).toBeVisible()
    await expect(dialog.getByTestId("offers-row--9001")).not.toBeVisible()
    await expect(dialog.getByTestId("offers-row--9002")).not.toBeVisible()
  })
})
