import type { Page, Route } from "@playwright/test"

export const MOCK_PROPERTY_ID = 1001

/** When matched, fulfills the route and returns true so the caller can return early. */
export async function maybeFulfillPandaPropertyBuyerOffersGet(
  route: Route,
  options: { body: unknown; onHit?: () => void },
): Promise<boolean> {
  const url = route.request().url()
  if (!url.includes("/buyer-offers") || route.request().method() !== "GET") return false
  options.onHit?.()
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(options.body),
  })
  return true
}

/** Minimal property row for `GET /api/admin/properties/:id` in Files-tab E2E. */
export const PROPERTY_EDIT_FAVORITE = {
  propertyListId: MOCK_PROPERTY_ID,
  streetAddress: "12 Test Street",
  suburb: "Testville",
  state: "QLD",
  postcode: "4000",
  propertyType: "House",
  bed: 3,
  bath: 2,
  car: 1,
  salePrice: 500000,
  propertyStatusId: 1,
  buyerName: null,
  buyerId: null,
  owner1name: "Smith, John",
  owner1email: "john@example.com",
  owner2name: null,
  owner3name: null,
  combinedOwner: "Smith, John",
  isFavorite: true,
  priceUndisclosed: false,
  excludeFromReport: false,
  saleDate: null,
  updatedAt: "2026-01-01T00:00:00Z",
  primaryPhoneOwnerNum: 1,
  primaryEmailOwnerNum: 1,
  propertyEntities: [],
  propertyBuyers: [],
  propertyContacts: [],
  propertyTenants: [],
}

const LIST_ONE = {
  items: [PROPERTY_EDIT_FAVORITE],
  totalCount: 1,
  limit: 25,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false,
  startCursor: null,
  endCursor: null,
}

/**
 * Mocks `GET /api/admin/properties` list, `GET …/properties/${MOCK_PROPERTY_ID}` detail, and
 * `GET …/properties/${MOCK_PROPERTY_ID}/buyer-offers` (empty array) for property-dialog specs.
 */
export async function routePandaPropertiesListDetailAndBuyerOffers(page: Page) {
  await page.route("**/api/admin/properties**", async (route) => {
    const url = route.request().url()
    if (await maybeFulfillPandaPropertyBuyerOffersGet(route, { body: [] })) return
    // Pass sub-entity routes through so per-test handlers registered earlier can handle them
    if (/\/properties\/\d+\/(buyers|contacts|tenants|files)/.test(url)) {
      await route.fallback()
      return
    }
    if (url.match(new RegExp(`/api/admin/properties/${MOCK_PROPERTY_ID}(\\?|$)`))) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(PROPERTY_EDIT_FAVORITE),
      })
      return
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(LIST_ONE),
    })
  })
}

/**
 * Single-handler variant of `routePandaPropertiesListDetailAndBuyerOffers` where the
 * buyer-offers response body is provided by an async callback. Use this to hold the response
 * with a deferred promise in loading-state tests.
 *
 * ```ts
 * let resolveOffers!: (body: unknown) => void
 * const deferred = new Promise<unknown>((resolve) => { resolveOffers = resolve })
 * await routePandaPropertiesWithDeferredBuyerOffers(page, () => deferred)
 * // … open dialog, assert skeleton …
 * resolveOffers([BUYER_OFFER_ACCEPTED])
 * ```
 */
export async function routePandaPropertiesWithDeferredBuyerOffers(
  page: Page,
  getBuyerOffersBody: () => Promise<unknown>,
) {
  await page.route("**/api/admin/properties**", async (route) => {
    const url = route.request().url()
    if (url.includes("/buyer-offers") && route.request().method() === "GET") {
      const body = await getBuyerOffersBody()
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(body),
      })
      return
    }
    if (/\/properties\/\d+\/(buyers|contacts|tenants|files)/.test(url)) {
      await route.continue()
      return
    }
    if (url.match(new RegExp(`/api/admin/properties/${MOCK_PROPERTY_ID}(\\?|$)`))) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(PROPERTY_EDIT_FAVORITE),
      })
      return
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(LIST_ONE),
    })
  })
}
