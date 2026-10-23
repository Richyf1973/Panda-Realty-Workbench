import { expect, test } from "@playwright/test"

import { e2eAdminCredentials, refreshPandaE2eEnv, signInAsAdmin } from "./helpers/admin-auth"

const STATUS_LIST_RESPONSE = {
  items: [],
  totalCount: 0,
  limit: 100,
  totalPages: 0,
  hasNextPage: false,
  hasPreviousPage: false,
  startCursor: null,
  endCursor: null,
}

const EMPTY_LIST_RESPONSE = {
  items: [],
  totalCount: 0,
  limit: 25,
  totalPages: 0,
  hasNextPage: false,
  hasPreviousPage: false,
  startCursor: null,
  endCursor: null,
}

const PROPERTY_LIST_ID = 9001
const PROPERTY_ENTITY_ID = 5001
const ENTITY_ID = 901
const BUYER_NAME = "TREVOR & NARELLE CLARK"

const BASE_ITEM = {
  propertyListId: PROPERTY_LIST_ID,
  streetAddress: "181/46 AMY STREET",
  suburb: "MORAYFIELD",
  state: "QLD",
  postcode: "4506",
  propertyType: "House",
  bed: 3,
  bath: 2,
  car: 2,
  buildingArea: 180,
  salePrice: 805000,
  saleDate: null,
  propertyStatusId: 1,
  buyerName: null,
  buyerId: null,
  owner1name: "DEBRA",
  owner2name: null,
  owner3name: null,
  combinedOwner: "DEBRA",
  isFavorite: false,
  priceUndisclosed: false,
  excludeFromReport: false,
  updatedAt: "2026-01-01T00:00:00Z",
  contractPrice: "805000",
  successfulBuyer: BUYER_NAME,
  successfulBuyerPropertyEntityId: PROPERTY_ENTITY_ID,
  successfulBuyerEntityId: ENTITY_ID,
  successfulBuyerPhoneNumber: "0400111222",
  successfulBuyerEmailAddress: "buyer@example.com",
}

function makeQuickListResponse(overrides: Record<string, unknown>) {
  return {
    items: [{ ...BASE_ITEM, ...overrides }],
    totalCount: 1,
    limit: 25,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
    startCursor: null,
    endCursor: null,
  }
}

function requireAuth(): void {
  refreshPandaE2eEnv()
  if (!e2eAdminCredentials) {
    throw new Error("Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD (see apps/panda-realty/.env.example).")
  }
}

async function gotoQuickCards(page: import("@playwright/test").Page, listResponse: object) {
  await page.route("**/api/admin/property-status**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(STATUS_LIST_RESPONSE) })
  })
  await page.route("**/api/admin/properties**", async (route) => {
    const url = route.request().url()
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(url.includes("propertyType=") ? listResponse : EMPTY_LIST_RESPONSE),
    })
  })
  await page.goto(`/admin/properties?propertyType=House`)
  await expect(page.getByTestId("admin-entity-quick-cards-scroll--properties")).toBeVisible({ timeout: 30_000 })
}

test.describe("Properties quick card - successful buyer action row", () => {
  test.beforeEach(async ({ page }) => {
    requireAuth()
    await page.setViewportSize({ width: 1280, height: 800 })
    await signInAsAdmin(page)
  })

  test("successful buyer row renders with the buyer name", async ({ page }) => {
    await page.route("**/api/admin/calendar/status**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ connected: true }) })
    })
    await gotoQuickCards(page, makeQuickListResponse({}))

    const row = page.getByTestId(`property-successful-buyer-row--${PROPERTY_LIST_ID}`)
    await expect(row).toBeVisible()
    await expect(row).toContainText("Successful Buyer")
    await expect(row).toContainText(BUYER_NAME)
  })

  test("successful buyer row shows call email inbox add meeting and add note actions", async ({ page }) => {
    await page.route("**/api/admin/calendar/status**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ connected: true }) })
    })
    await gotoQuickCards(page, makeQuickListResponse({}))

    await expect(page.getByTestId(`property-successful-buyer-quick-call--${PROPERTY_LIST_ID}`)).toBeVisible()
    await expect(page.getByTestId(`property-successful-buyer-quick-email--${PROPERTY_LIST_ID}`)).toBeVisible()
    await expect(page.getByTestId(`property-successful-buyer-inbox--${PROPERTY_LIST_ID}`)).toBeVisible()
    await expect(page.getByTestId(`property-successful-buyer-add-event--${PROPERTY_LIST_ID}`)).toBeVisible()
    await expect(page.getByTestId(`property-successful-buyer-add-note--${PROPERTY_LIST_ID}`)).toBeVisible()
  })

  test("missing phone and email keep the action buttons visible but disabled", async ({ page }) => {
    await page.route("**/api/admin/calendar/status**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ connected: true }) })
    })
    await gotoQuickCards(
      page,
      makeQuickListResponse({
        successfulBuyerPhoneNumber: null,
        successfulBuyerEmailAddress: null,
      }),
    )

    await expect(page.getByTestId(`property-successful-buyer-quick-call--${PROPERTY_LIST_ID}`)).toBeDisabled()
    await expect(page.getByTestId(`property-successful-buyer-quick-email--${PROPERTY_LIST_ID}`)).toBeDisabled()
    await expect(page.getByTestId(`property-successful-buyer-inbox--${PROPERTY_LIST_ID}`)).toBeDisabled()
  })

  test("add meeting opens Add Meeting already targeted at the accepted buyer", async ({ page }) => {
    await page.route("**/api/admin/calendar/status**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ connected: true }) })
    })
    await gotoQuickCards(page, makeQuickListResponse({}))

    await page.getByTestId(`property-successful-buyer-add-event--${PROPERTY_LIST_ID}`).click()

    const dialog = page.getByTestId("add-meeting-dialog")
    await expect(dialog).toBeVisible()
    await expect(dialog.getByTestId("meeting-buyer-select")).toContainText(BUYER_NAME)
  })

  test("add note opens the buyer note dialog for the accepted buyer", async ({ page }) => {
    await page.route("**/api/admin/calendar/status**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ connected: true }) })
    })
    await page.route("**/api/admin/agents/options", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) })
    })
    await gotoQuickCards(page, makeQuickListResponse({}))

    await page.getByTestId(`property-successful-buyer-add-note--${PROPERTY_LIST_ID}`).click()
    await expect(page.getByTestId("buyer-row-add-note-dialog")).toBeVisible()
    await expect(page.getByTestId("buyer-row-add-note-submit")).toBeVisible()
  })

  test("inbox expands the threads panel for the accepted buyer email", async ({ page }) => {
    await page.route("**/api/admin/calendar/status**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ connected: true }) })
    })
    await page.route("**/api/admin/gmail/threads**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) })
    })
    await gotoQuickCards(page, makeQuickListResponse({}))

    const row = page.getByTestId(`property-successful-buyer-row--${PROPERTY_LIST_ID}`)
    await expect(row.locator("[data-threads-panel]")).toHaveCount(0)

    await page.getByTestId(`property-successful-buyer-inbox--${PROPERTY_LIST_ID}`).click()
    await expect(row.locator("[data-threads-panel='open']")).toBeVisible()
  })

  test("successful buyer row is absent when there is no accepted buyer", async ({ page }) => {
    await gotoQuickCards(
      page,
      makeQuickListResponse({
        contractPrice: null,
        successfulBuyer: null,
        successfulBuyerPropertyEntityId: null,
        successfulBuyerEntityId: null,
        successfulBuyerPhoneNumber: null,
        successfulBuyerEmailAddress: null,
      }),
    )

    await expect(page.getByTestId(`property-successful-buyer-row--${PROPERTY_LIST_ID}`)).toHaveCount(0)
  })

  test("default table mode stays unchanged", async ({ page }) => {
    await page.route("**/api/admin/property-status**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(STATUS_LIST_RESPONSE) })
    })
    await page.route("**/api/admin/properties**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_LIST_RESPONSE) })
    })
    await page.goto("/admin/properties")

    await expect(page.getByTestId("admin-entity-table-scroll--properties")).toBeVisible()
    await expect(page.getByTestId(`property-successful-buyer-row--${PROPERTY_LIST_ID}`)).toHaveCount(0)
  })
})
