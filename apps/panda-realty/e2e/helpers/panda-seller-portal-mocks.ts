import { expect } from "@playwright/test"

import { signInAsAdmin } from "./admin-auth"
import {
  MOCK_PROPERTY_ID,
  routePandaPropertiesListDetailAndBuyerOffers,
} from "./panda-properties-dialog-mocks"

export { MOCK_PROPERTY_ID }

// Live DB fixtures — favourite properties with owner1name populated
export const FIXTURE_A = { propertyListId: 172088 } // LORRELL PRESTON — 348 KING STREET (primary)
export const FIXTURE_B = { propertyListId: 208493 } // LINDA MARGARET HEUVEL — 1/350 KING STREET (revocation)

export const MOCK_SELLER_TOKEN_ACTIVE = {
  portalTokenId: 99,
  token: "seller-e2e-token-abc",
  propertyEntityId: null,
  propertyListId: MOCK_PROPERTY_ID,
  role: "seller",
  revokedAt: null,
  lastAccessedAt: null,
  createdAt: "2026-05-27T09:00:00.000Z",
}

export const MOCK_SELLER_TOKEN_REVOKED = {
  ...MOCK_SELLER_TOKEN_ACTIVE,
  revokedAt: "2026-05-27T10:00:00.000Z",
}

export const MOCK_SELLERS_API_RESPONSE = {
  items: [
    {
      name: "Smith, John",
      address: "12 Test Street, Testville QLD 4000",
      phone: "0412000000",
      email: "john@example.com",
      propertyAddress: "12 Test Street",
      propertyListId: MOCK_PROPERTY_ID,
    },
  ],
  total: 1,
}

/** POST seller portal token via admin API and return token string + id */
export async function createOrGetSellerToken(
  page: Parameters<typeof signInAsAdmin>[0],
  fixture: { propertyListId: number },
): Promise<{ token: string; portalTokenId: number }> {
  await signInAsAdmin(page)
  const res = await page.context().request.post("/api/admin/portal-tokens/seller", {
    data: fixture,
  })
  const body = await res.json()
  return { token: body.token, portalTokenId: body.portalTokenId }
}

export async function setupMockedSellersPage(
  page: Parameters<typeof signInAsAdmin>[0],
  tokenResponse: unknown,
) {
  await page.route("**/api/admin/sellers**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_SELLERS_API_RESPONSE) })
  })
  await page.route("**/api/admin/portal-tokens/seller**", async (route) => {
    const method = route.request().method()
    if (method === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(tokenResponse) })
      return
    }
    if (method === "POST") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_SELLER_TOKEN_ACTIVE) })
      return
    }
    await route.fallback()
  })
  await page.route("**/api/admin/portal-tokens/*", async (route) => {
    const method = route.request().method()
    if (method === "PATCH") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_SELLER_TOKEN_REVOKED) })
      return
    }
    await route.fallback()
  })
  await signInAsAdmin(page)
}

export async function setupMockedPropertyWithSellerPortal(
  page: Parameters<typeof signInAsAdmin>[0],
  tokenResponse: unknown,
) {
  await page.route("**/api/admin/property-status**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        items: [{ propertyStatusId: 1, propertyStatusCode: "ACTIVE", propertyStatus: "Active" }],
        totalCount: 1, limit: 100, totalPages: 1,
        hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null,
      }),
    })
  })
  await page.route("**/api/admin/portal-tokens/seller**", async (route) => {
    const method = route.request().method()
    if (method === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(tokenResponse) })
      return
    }
    if (method === "POST") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_SELLER_TOKEN_ACTIVE) })
      return
    }
    await route.fallback()
  })
  await page.route("**/api/admin/portal-tokens/*", async (route) => {
    const method = route.request().method()
    if (method === "PATCH") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_SELLER_TOKEN_REVOKED) })
      return
    }
    await route.fallback()
  })
  await routePandaPropertiesListDetailAndBuyerOffers(page)
  await signInAsAdmin(page)
}

export async function navigateToPropertyDialog(page: Parameters<typeof signInAsAdmin>[0]) {
  await page.goto("/admin/properties")
  await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible({ timeout: 20_000 })
  await page.getByTestId(`admin-entity-row--properties--${MOCK_PROPERTY_ID}`).click()
  const dialog = page.getByTestId("admin-entity-crud-dialog--properties")
  await expect(dialog).toBeVisible({ timeout: 10_000 })
  return dialog
}
