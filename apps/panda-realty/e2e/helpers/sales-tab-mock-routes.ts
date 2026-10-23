import { type Page, type Route } from "@playwright/test"

import { maybeFulfillPandaPropertyBuyerOffersGet } from "./panda-properties-dialog-mocks"
import {
  EMPTY_PROPERTY_ENTITIES_RESPONSE,
  PROPERTY_EDIT_WITH_BUYER,
  SINGLE_PROPERTY_RESPONSE,
  STATUS_LIST_RESPONSE,
} from "./admin-properties-mocks"

export async function setupSalesTabMockRoutes(
  page: Page,
  offers: unknown[],
  offerToken: string,
  prefill: Record<string, unknown>,
): Promise<void> {
  const propertyPayload = { ...PROPERTY_EDIT_WITH_BUYER }

  await page.route("**/api/admin/properties**", async (route: Route) => {
    const url = route.request().url()
    if (await maybeFulfillPandaPropertyBuyerOffersGet(route, { body: offers })) return
    if (url.match(/\/api\/admin\/properties\/1001\/buyers(\?|$)/)) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [] }) })
      return
    }
    if (url.match(/\/api\/admin\/properties\/1001(\?|$)/)) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(propertyPayload) })
      return
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ...SINGLE_PROPERTY_RESPONSE, items: [propertyPayload] }),
    })
  })

  await page.route("**/api/admin/property-entities/**", async (route: Route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_PROPERTY_ENTITIES_RESPONSE) })
  })

  await page.route("**/api/admin/property-status**", async (route: Route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(STATUS_LIST_RESPONSE) })
  })

  await page.route(`**/api/offer-form/${offerToken}**`, async (route: Route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(prefill) })
  })

  await page.route("**/api/admin/buyer-offers/*/form-view**", async (route: Route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(prefill) })
  })
}
