import { expect, test, type Route } from "@playwright/test"

import { e2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import {
  BUYER_PANEL_ITEMS_RESPONSE_1001,
  EMPTY_LIST_RESPONSE,
  EMPTY_PROPERTY_ENTITIES_RESPONSE,
  mockPropertyEntitiesListJsonForEntity201,
  PROPERTY_EDIT_WITH_BUYER,
  PROPERTY_ENTITY_501_DETAIL,
  routeMockEntity201DetailForBuyerWorkspace,
  SINGLE_PROPERTY_RESPONSE,
  STATUS_LIST_RESPONSE,
} from "./helpers/admin-properties-mocks"
import { maybeFulfillPandaPropertyBuyerOffersGet } from "./helpers/panda-properties-dialog-mocks"

test.describe("Panda Realty admin — properties buyer offers validation (mocked APIs)", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")
    await page.route("**/api/admin/properties**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(EMPTY_LIST_RESPONSE),
      })
    })
    await page.route("**/api/admin/property-status**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(STATUS_LIST_RESPONSE),
      })
    })
    await page.route("**/api/admin/property-entities**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(EMPTY_PROPERTY_ENTITIES_RESPONSE),
      })
    })
    await signInAsAdmin(page)
  })

  test("validation error shown when accepting duplicate offer", async ({ page }) => {
    // Offer data for the PropertyEntityBuyerOffersPanel custom panel (GET /property-entities/501/buyer-offers)
    const buyerOffersApiBody = {
      propertyListId: 1001,
      contractDate: null,
      offers: [
        {
          buyerOfferId: 9002,
          propertyEntityId: 501,
          offer: "850000",
          isAccepted: true,
          dateOffered: "2026-03-20",
        },
        {
          buyerOfferId: 9003,
          propertyEntityId: 501,
          offer: "800000",
          isAccepted: false,
          dateOffered: "2026-03-15",
        },
      ],
    }

    await page.route("**/api/admin/properties**", async (route: Route) => {
      const url = route.request().url()
      if (await maybeFulfillPandaPropertyBuyerOffersGet(route, { body: [] })) return
      if (url.match(/\/api\/admin\/properties\/1001\/buyers(\?|$)/)) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(BUYER_PANEL_ITEMS_RESPONSE_1001),
        })
        return
      }
      if (url.match(/\/api\/admin\/properties\/1001(\?|$)/)) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(PROPERTY_EDIT_WITH_BUYER),
        })
        return
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ...SINGLE_PROPERTY_RESPONSE,
          items: [{ ...PROPERTY_EDIT_WITH_BUYER }],
        }),
      })
    })

    await routeMockEntity201DetailForBuyerWorkspace(page)

    // PATCH /buyer-offers/9003 → 400: simulates server rejecting a duplicate accepted offer
    await page.route("**/api/admin/buyer-offers/**", async (route: Route) => {
      const url = route.request().url()
      const method = route.request().method()
      if (method === "PATCH" && url.includes("/buyer-offers/9003")) {
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({ error: "Only one accepted offer is allowed per property." }),
        })
        return
      }
      await route.continue()
    })

    await page.route("**/api/admin/buyer-status**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: [], totalCount: 0, limit: 100, totalPages: 0 }),
      })
    })

    await page.route("**/api/admin/property-entities**", async (route: Route) => {
      const url = route.request().url()
      const method = route.request().method()
      if (
        method === "GET" &&
        url.includes("entityId=201") &&
        !url.includes("/property-entities/501")
      ) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: mockPropertyEntitiesListJsonForEntity201(),
        })
        return
      }
      // Sub-path /buyer-offers must be checked before the bare /501 path
      if (url.includes("/property-entities/501/buyer-offers")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(buyerOffersApiBody),
        })
        return
      }
      if (url.includes("/property-entities/501")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ...PROPERTY_ENTITY_501_DETAIL, buyerOffers: buyerOffersApiBody.offers }),
        })
        return
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(EMPTY_PROPERTY_ENTITIES_RESPONSE),
      })
    })

    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible()
    await page.getByTestId("admin-entity-row--properties--1001").click()
    await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible()

    await page.getByTestId("panda-properties-form-tab-trigger--buyers").click()
    await expect(page.getByTestId("property-buyers-panel-add-new")).toBeEnabled({ timeout: 10_000 })
    await page.getByTestId("panda-properties-form-tab--buyers")
      .getByTestId("property-buyer-owner-row-open-profile--501")
      .click()

    const entitiesDlg = page.getByTestId("admin-entity-crud-dialog--entities")
    await expect(entitiesDlg).toBeVisible()
    await entitiesDlg.evaluate((el) => el.scrollTo(0, el.scrollHeight))
    await expect(entitiesDlg.getByTestId("panda-entities-property-connections")).toBeVisible({
      timeout: 20_000,
    })

    // The custom buyer-offers panel (PropertyEntityBuyerOffersPanel) is the "Offers" tab
    // in the property-entities workspace; it auto-selects property-entity 501.
    const offersPanel = entitiesDlg.getByTestId(
      "admin-entity-crud-related-panel--property-entities--buyer-offers-tab",
    )
    // Wait for the panel to load and render offer 9003 (not accepted → Accept button shown)
    await expect(offersPanel.getByTestId("offers-row--9003")).toBeVisible({ timeout: 15_000 })

    // Click Accept — server rejects because offer 9002 is already accepted
    await offersPanel.getByTestId("offers-row-accept-btn--9003").click()

    await expect(
      offersPanel.getByTestId("offers-row-accept-error--9003"),
    ).toContainText("Only one accepted offer is allowed per property.", { timeout: 10_000 })
  })
})
