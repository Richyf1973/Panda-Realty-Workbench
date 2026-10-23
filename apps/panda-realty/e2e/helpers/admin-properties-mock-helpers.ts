import type { Page, Route } from "@playwright/test"

import { maybeFulfillPandaPropertyBuyerOffersGet } from "./panda-properties-dialog-mocks"
import {
  BUYER_OFFER_ACCEPTED,
  BUYER_OFFER_NOT_ACCEPTED,
  BUYER_PANEL_ITEMS_RESPONSE_1001,
  EMPTY_PROPERTY_ENTITIES_RESPONSE,
  MOCK_ENTITY_201_DETAIL,
  PROPERTY_EDIT_WITH_BUYER,
  SINGLE_PROPERTY_RESPONSE,
} from "./admin-properties-mock-data"

export function makePropertiesListResponse(overrides: Record<string, unknown>) {
  return {
    items: [{ ...SINGLE_PROPERTY_RESPONSE.items[0], ...overrides }],
    totalCount: 1,
    limit: 25,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
    startCursor: null,
    endCursor: null,
  }
}

/** `GET /api/admin/property-entities?…&entityId=201` — Property Connections list for Edit Buyer (entity 201). */
export function mockPropertyEntitiesListJsonForEntity201(): string {
  return JSON.stringify({
    ...EMPTY_PROPERTY_ENTITIES_RESPONSE,
    items: [
      {
        propertyEntityId: 501,
        entityId: 201,
        propertyListId: 1001,
        propertyEntityNote: null,
        buyerPipelineStatusId: null,
        isOriginalOwner: false,
      },
    ],
    totalCount: 1,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  })
}

/**
 * Mocks `GET /api/admin/entities/201` and successful `PATCH /api/admin/entities/201` for flows that
 * open the entities dialog from a property buyer row (Save & Close completes without hitting the real API).
 */
export async function routeMockEntity201DetailForBuyerWorkspace(page: Page): Promise<void> {
  await page.route("**/api/admin/entities**", async (route: Route) => {
    const method = route.request().method()
    const url = route.request().url()
    if (url.match(/\/api\/admin\/entities\/201(\?|$)/)) {
      if (method === "GET" || method === "PATCH") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(MOCK_ENTITY_201_DETAIL),
        })
        return
      }
      await route.continue()
      return
    }
    if (method !== "GET") {
      await route.continue()
      return
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items: [], totalCount: 0, limit: 20, totalPages: 0 }),
    })
  })
}

export async function setupPropertyWithBuyerOffers(
  page: Page,
  offers: (typeof BUYER_OFFER_ACCEPTED | typeof BUYER_OFFER_NOT_ACCEPTED)[],
  propertyDetailMerge?: Record<string, unknown>,
) {
  const propertyDetailPayload = {
    ...PROPERTY_EDIT_WITH_BUYER,
    ...propertyDetailMerge,
  }
  await page.route("**/api/admin/properties**", async (route: Route) => {
    const url = route.request().url()
    if (await maybeFulfillPandaPropertyBuyerOffersGet(route, { body: offers })) return
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
        body: JSON.stringify(propertyDetailPayload),
      })
      return
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ...SINGLE_PROPERTY_RESPONSE,
        items: [{ ...propertyDetailPayload }],
      }),
    })
  })
  await page.route("**/api/admin/property-entities/**", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(EMPTY_PROPERTY_ENTITIES_RESPONSE),
    })
  })
}
