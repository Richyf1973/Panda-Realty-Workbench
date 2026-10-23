/**
 * Shared `page.route` stubs for Edit Buyer → inline **Link property** E2E flows.
 */

import type { Page } from "@playwright/test"

import {
  BUYER_ENTITY_DETAIL,
  BUYER_ENTITY_ROW,
  EMPTY_LIST,
  parseJsonBody,
} from "./buyer-offers-edit-mocks"

export const BUYER_FAVORITE_LINK_NEW_PE_DETAIL = {
  propertyEntityId: 888,
  entityId: 201,
  propertyListId: 3001,
  propertyEntityNote: null,
  buyerPipelineStatusId: null,
  isOriginalOwner: false,
  buyerPipelineStatus: null,
  propertyRef: {
    streetAddress: "54 Valley Drive",
    state: "QLD",
    postcode: "4510",
  },
  buyerOffers: [] as unknown[],
  entityMembers: [] as unknown[],
  propertyEntityFiles: [] as unknown[],
  propertyEntityNotes: [] as unknown[],
}

export type BuyerFavoriteLinkInlineMockHandles = {
  /** Bodies recorded from `POST /api/admin/property-entities` (link action). */
  postBodies: Record<string, unknown>[]
}

/**
 * Registers mocked admin APIs for a buyer entity **201** with zero property connections until
 * the first mocked `POST /api/admin/property-entities` runs.
 */
export async function installBuyerFavoriteLinkInlineMocks(
  page: Page,
): Promise<BuyerFavoriteLinkInlineMockHandles> {
  const postBodies: Record<string, unknown>[] = []
  const peState = { items: [] as Record<string, unknown>[] }

  await page.route("**/api/admin/entities**", async (route) => {
    if (route.request().method() !== "GET") {
      await route.continue()
      return
    }
    const url = route.request().url()
    if (url.match(/\/api\/admin\/entities\/201(\?|$)/)) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(BUYER_ENTITY_DETAIL),
      })
      return
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ...EMPTY_LIST,
        items: [BUYER_ENTITY_ROW],
        totalCount: 1,
        totalPages: 1,
      }),
    })
  })

  await page.route("**/api/admin/property-entities**", async (route) => {
    const req = route.request()
    const method = req.method()
    const url = req.url()
    if (method === "POST") {
      const body = parseJsonBody(req)
      postBodies.push(body)
      peState.items = [
        {
          propertyEntityId: 888,
          entityId: 201,
          propertyListId: body.propertyListId,
          propertyRef: BUYER_FAVORITE_LINK_NEW_PE_DETAIL.propertyRef,
        },
      ]
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          propertyEntityId: 888,
          entityId: 201,
          propertyListId: body.propertyListId,
          isOriginalOwner: false,
        }),
      })
      return
    }
    if (method !== "GET") {
      await route.continue()
      return
    }
    const detailMatch = url.match(/\/property-entities\/(\d+)/)
    if (detailMatch) {
      const id = Number(detailMatch[1])
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          id === 888 ? BUYER_FAVORITE_LINK_NEW_PE_DETAIL : {},
        ),
      })
      return
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ...EMPTY_LIST,
        items: peState.items,
        totalCount: peState.items.length,
        totalPages: peState.items.length > 0 ? 1 : 0,
      }),
    })
  })

  await page.route("**/api/admin/properties**", async (route) => {
    if (route.request().method() !== "GET") {
      await route.continue()
      return
    }
    const url = route.request().url()
    const detailMatch = url.match(/\/api\/admin\/properties\/(\d+)(?:\?|$)/)
    if (detailMatch) {
      const id = Number(detailMatch[1])
      if (id === 3001) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            propertyListId: 3001,
            streetAddress: "54 Valley Drive",
            state: "QLD",
            postcode: "4510",
            isFavorite: true,
          }),
        })
        return
      }
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ...EMPTY_LIST,
        items: [
          {
            propertyListId: 3001,
            streetAddress: "54 Valley Drive",
            state: "QLD",
            postcode: "4510",
            isFavorite: true,
          },
        ],
        totalCount: 1,
        totalPages: 1,
      }),
    })
  })

  for (const pattern of [
    "**/api/admin/entity-members**",
    "**/api/admin/buyer-status**",
    "**/api/admin/property-status**",
    "**/api/admin/buyer-pipeline-status**",
    "**/api/admin/entity-categories**",
    "**/api/admin/lead-sources**",
  ]) {
    await page.route(pattern, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(EMPTY_LIST),
      })
    })
  }

  return { postBodies }
}
