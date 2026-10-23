import { expect, test, type Locator, type Route } from "@playwright/test"

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

/** Related inline grid: content should not exceed the scroll viewport (no horizontal scrollbar). */
async function expectPandaBuyerOffersTableFitsHorizontally(
  offersPanel: Locator,
): Promise<void> {
  const scroll = offersPanel
    .getByTestId("admin-entity-crud-related-editor--property-entities--buyerOffers")
    .locator(".overflow-x-auto")
    .first()
  await expect(scroll).toBeVisible()
  const ratio = await scroll.evaluate((el) => {
    const w = el.clientWidth
    if (w < 1) return 0
    return el.scrollWidth / w
  })
  expect(ratio).toBeLessThanOrEqual(1.02)
}

test.describe("Panda Realty admin — properties buyers panel (mocked APIs)", () => {
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

  test("buyer workspace shows offers on the right with date offered and accepted switch", async ({
    page,
  }) => {
    const detailWithOffer = {
      ...PROPERTY_ENTITY_501_DETAIL,
      buyerOffers: [
        {
          buyerOfferId: 9001,
          propertyEntityId: 501,
          offer: "125000",
          isAccepted: false,
          dateOffered: "2026-03-15",
        },
      ],
    }

    await page.route("**/api/admin/properties**", async (route) => {
      const url = route.request().url()
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

    await page.setViewportSize({ width: 1400, height: 900 })
    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible()
    await page.getByTestId("admin-entity-row--properties--1001").click()
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

    const offersPanel = entitiesDlg.getByTestId(
      "admin-entity-crud-related-panel--property-entities--buyer-offers-tab",
    )
    await expect(offersPanel).toBeVisible({ timeout: 15_000 })
    await expect(
      offersPanel.getByRole("columnheader", { name: /date offered/i }),
    ).toBeVisible()
    await expect(
      offersPanel.getByRole("columnheader", { name: /^accepted$/i }),
    ).toBeVisible()

    await expect(
      offersPanel.getByTestId(
        "admin-entity-crud-related-switch--property-entities--buyerOffers--isAccepted--saved-9001",
      ),
    ).toBeVisible()

    await expect(
      offersPanel.getByTestId(
        "admin-entity-edit-date-picker--buyer-offers--dateOffered",
      ).first(),
    ).toContainText("Mar")

    await expect(
      offersPanel.getByTestId(
        "admin-entity-crud-related-editor--property-entities--buyerOffers--add-row",
      ),
    ).toBeVisible()

    await expectPandaBuyerOffersTableFitsHorizontally(offersPanel)

    await page.setViewportSize({ width: 1024, height: 768 })
    await expectPandaBuyerOffersTableFitsHorizontally(offersPanel)
  })

  test("buyer workspace nested dialog opens from saved buyer row", async ({ page }) => {
    await page.route("**/api/admin/properties**", async (route) => {
      const url = route.request().url()
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
      if (url.includes("/property-entities/501")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(PROPERTY_ENTITY_501_DETAIL),
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
    await expect(
      page.getByTestId("admin-entity-crud-dialog--properties"),
    ).toBeVisible()

    await page.getByTestId("panda-properties-form-tab-trigger--buyers").click()
    await expect(page.getByTestId("panda-properties-form-tab--buyers")).toBeVisible()
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
    await expect(
      entitiesDlg.getByTestId("admin-entity-crud-related-panel--property-entities--buyer-offers-tab"),
    ).toBeVisible({ timeout: 15_000 })
    await expect(entitiesDlg).toContainText("12 Test Street")
  })

  test("buyers tab opens nested entities dialog from related-target control", async ({
    page,
  }) => {
    const entityDetail = {
      entityId: 201,
      entityName: "Test Buyer LLC",
      entityCategoryId: 1,
      emailAddress: "buyer@test.com",
      phoneNumber: "0400 111 222",
      address: "1 Buyer Rd",
      entityBuyerStatuses: [],
    }

    await page.route("**/api/admin/properties**", async (route) => {
      const url = route.request().url()
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
    await page.route("**/api/admin/property-entities**", async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(EMPTY_PROPERTY_ENTITIES_RESPONSE),
      })
    })
    await page.route("**/api/admin/entities**", async (route: Route) => {
      if (route.request().method() !== "GET") {
        await route.continue()
        return
      }
      const url = route.request().url()
      if (url.match(/\/api\/admin\/entities\/201(\?|$)/)) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(entityDetail),
        })
        return
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: [], totalCount: 0, limit: 20, totalPages: 0 }),
      })
    })
    await page.route("**/api/admin/buyer-status**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: [], totalCount: 0, limit: 100, totalPages: 0 }),
      })
    })

    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible()
    await page.getByTestId("admin-entity-row--properties--1001").click()
    await expect(
      page.getByTestId("admin-entity-crud-dialog--properties"),
    ).toBeVisible()

    await page.getByTestId("panda-properties-form-tab-trigger--buyers").click()
    await expect(page.getByTestId("panda-properties-form-tab--buyers")).toBeVisible()
    await expect(page.getByTestId("property-buyers-panel-add-new")).toBeEnabled({ timeout: 10_000 })
    await page.getByTestId("panda-properties-form-tab--buyers")
      .getByTestId("property-buyer-owner-row-open-profile--501")
      .click()

    await expect(
      page.getByTestId("admin-entity-crud-dialog--entities"),
    ).toBeVisible()

    const nestedEntities = page.getByTestId("admin-entity-crud-dialog--entities")
    await nestedEntities.getByTestId("panda-entities-dialog-form").evaluate((el) => {
      el.scrollTo(0, el.scrollHeight)
    })
    // Property 1001 (12 Test Street) is a favorite — it should be pre-selected in the
    // property connection select when the entity dialog opens from that property's context.
    const propertySelect = nestedEntities.getByTestId(
      "panda-entities-property-connections--select",
    )
    await expect(propertySelect).toContainText(/12 Test Street/i, { timeout: 20_000 })
  })
})
