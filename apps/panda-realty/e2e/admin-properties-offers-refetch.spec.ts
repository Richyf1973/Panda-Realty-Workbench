import { expect, test, type Route } from "@playwright/test"

import { e2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import {
  BUYER_OFFER_ACCEPTED,
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

test.describe("Panda Realty admin — properties buyer offers refetch (mocked APIs)", () => {
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

  test("buyer-offers is not re-fetched when buyer workspace opens; refetches after nested save", async ({
    page,
  }) => {
    let buyerOffersCallCount = 0
    let propertyDetailGetCount = 0

    await page.route("**/api/admin/properties**", async (route: Route) => {
      const url = route.request().url()
      if (
        await maybeFulfillPandaPropertyBuyerOffersGet(route, {
          body: [BUYER_OFFER_ACCEPTED],
          onHit: () => {
            buyerOffersCallCount++
          },
        })
      ) {
        return
      }
      if (url.match(/\/api\/admin\/properties\/1001\/buyers(\?|$)/)) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(BUYER_PANEL_ITEMS_RESPONSE_1001),
        })
        return
      }
      if (url.match(/\/api\/admin\/properties\/1001(\?|$)/)) {
        if (route.request().method() === "GET") {
          propertyDetailGetCount++
        }
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

    const detailWithOffer = {
      ...PROPERTY_ENTITY_501_DETAIL,
      buyerOffers: [
        {
          buyerOfferId: 9002,
          propertyEntityId: 501,
          offer: "850000",
          isAccepted: true,
          dateOffered: "2026-03-20",
        },
      ],
    }

    await routeMockEntity201DetailForBuyerWorkspace(page)
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
      if (method === "PATCH" && url.includes("/property-entities/501")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(detailWithOffer),
        })
        return
      }
      if (url.includes("/property-entities/501")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(detailWithOffer),
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

    await expect.poll(() => buyerOffersCallCount).toBeGreaterThan(0)
    const countBeforeWorkspace = buyerOffersCallCount
    const propertyGetsBeforeWorkspace = propertyDetailGetCount

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

    await expect.poll(() => buyerOffersCallCount).toBe(countBeforeWorkspace)

    await entitiesDlg.getByTestId("admin-entity-edit-save-and-close--entities").click()
    await expect(entitiesDlg).toBeHidden({ timeout: 15_000 })

    await expect.poll(() => propertyDetailGetCount).toBeGreaterThan(propertyGetsBeforeWorkspace)
    await expect.poll(() => buyerOffersCallCount).toBeGreaterThan(countBeforeWorkspace)

    // The properties dialog is still open on the Buyers tab; switch to Sales tab
    // so LatestBuyerOffersSection (which lives there) is active and its rows are visible.
    await page.getByTestId("panda-properties-form-tab-trigger--sales").click()

    const propertiesDialog = page.getByTestId("admin-entity-crud-dialog--properties")
    await expect(
      propertiesDialog.getByTestId("panda-properties-buyer-offer-row--9002"),
    ).toHaveCount(1)
  })
})
