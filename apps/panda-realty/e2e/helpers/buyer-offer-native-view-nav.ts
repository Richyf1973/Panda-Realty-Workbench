import { expect, type Route } from "@playwright/test"

import { signInAsAdmin } from "./admin-auth"
import {
  BUYER_OFFERS_WITH_TOKEN,
  OFFER_FORM_STATUS_RESPONSE,
  PREFILL_BASE,
} from "./buyer-offer-native-view-mocks"
import {
  BUYER_PANEL_ITEMS_RESPONSE_1001,
  EMPTY_PROPERTY_ENTITIES_RESPONSE,
  PROPERTY_EDIT_WITH_BUYER,
  SINGLE_PROPERTY_RESPONSE,
  STATUS_LIST_RESPONSE,
} from "./admin-properties-mocks"

type Page = Parameters<typeof signInAsAdmin>[0]

export async function setupPropertyRoutes(page: Page) {
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
}

export async function setupNativeViewRoutes(
  page: Page,
  prefill: Record<string, unknown> = PREFILL_BASE,
) {
  await page.route("**/api/admin/property-entities/501/buyer-offers**", async (route: Route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(BUYER_OFFERS_WITH_TOKEN) })
  })
  await page.route("**/api/admin/property-entities/501/offer-form-status**", async (route: Route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(OFFER_FORM_STATUS_RESPONSE) })
  })
  await page.route("**/api/offer-form/testtoken501**", async (route: Route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(prefill) })
  })
}

export async function openOffersDialog(page: Page) {
  await page.goto("/admin/properties")
  await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible()
  await page.getByTestId("admin-entity-row--properties--1001").click()
  await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible()
  await page.getByTestId("panda-properties-form-tab-trigger--buyers").click()
  await expect(page.getByTestId("panda-properties-form-tab--buyers")).toBeVisible()
  await expect(page.getByTestId("property-buyers-panel-add-new")).toBeEnabled({ timeout: 10_000 })
  await page.getByTestId("property-buyer-owner-row-offers--501").click()
  await expect(page.getByTestId("property-buyer-panel-offers-dialog")).toBeVisible()
}

export async function openNativePanel(page: Page) {
  const dialog = page.getByTestId("property-buyer-panel-offers-dialog")
  await dialog.getByTestId("buyer-offer-conditions-toggle--9001").click()
  const panel = dialog.getByTestId("buyer-offer-native-view--9001")
  await expect(panel).toBeVisible({ timeout: 10_000 })
  return panel
}
