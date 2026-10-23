import type { Page } from "@playwright/test"

import { signInAsAdmin } from "./admin-auth"
import {
  MOCK_PROPERTY_ID,
  MOCK_SELLER_TOKEN_ACTIVE,
} from "./panda-seller-portal-mocks"
import { routePandaPropertiesListDetailAndBuyerOffers } from "./panda-properties-dialog-mocks"

export type SellerToken = typeof MOCK_SELLER_TOKEN_ACTIVE

export const MOCK_NEW_SELLER_TOKEN: SellerToken = {
  portalTokenId: 100,
  token: "seller-e2e-token-NEWCRASH",
  propertyEntityId: null,
  propertyListId: MOCK_PROPERTY_ID,
  role: "seller",
  revokedAt: null,
  lastAccessedAt: null,
  createdAt: "2026-05-27T12:00:00.000Z",
}

export const STATUS_MIN = {
  items: [{ propertyStatusId: 1, propertyStatusCode: "ACTIVE", propertyStatus: "Active" }],
  totalCount: 1, limit: 100, totalPages: 1,
  hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null,
}

export async function setupCrashPage(
  page: Page,
  {
    sellerToken = MOCK_SELLER_TOKEN_ACTIVE,
    crashStatus = 200,
    crashBody = { sellerToken: MOCK_NEW_SELLER_TOKEN } as unknown,
  }: {
    sellerToken?: SellerToken
    crashStatus?: number
    crashBody?: unknown
  } = {},
) {
  await page.route("**/api/admin/property-status**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(STATUS_MIN) })
  })

  await page.route("**/api/admin/portal-tokens/seller**", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(sellerToken) })
      return
    }
    await route.fallback()
  })

  await routePandaPropertiesListDetailAndBuyerOffers(page)

  await page.route(`**/api/admin/properties/${MOCK_PROPERTY_ID}/contract-crash`, async (route) => {
    if (route.request().method() !== "POST") { await route.fallback(); return }
    await route.fulfill({
      status: crashStatus,
      contentType: "application/json",
      body: JSON.stringify(crashBody),
    })
  })

  await signInAsAdmin(page)
}
