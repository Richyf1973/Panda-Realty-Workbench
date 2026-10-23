/**
 * E2E: Buyer sort by offer tier + pipeline stage label in property dialog
 *
 * Covers:
 * 1. Buyers tab — accepted-offer buyer appears first, then any-offer, then no-offer
 * 2. Pipeline stage column shows the status label ("Active"), not the raw integer ID
 */

import { expect, test } from "@playwright/test"

import { e2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"

// ─── Shared mock data ────────────────────────────────────────────────────────

const BASE_PROPERTY = {
  propertyListId: 2001,
  streetAddress: "99 Sort Street",
  suburb: "Testville",
  state: "QLD",
  postcode: "4000",
  propertyType: "House",
  bed: 3,
  bath: 2,
  car: 1,
  salePrice: null,
  propertyStatusId: 1,
  buyerName: null,
  buyerId: null,
  owner1name: null,
  owner2name: null,
  owner3name: null,
  combinedOwner: null,
  isFavorite: true,
  priceUndisclosed: false,
  excludeFromReport: false,
  saleDate: null,
  updatedAt: "2026-01-01T00:00:00Z",
}

/** Buyer with an accepted offer (tier 0 — should appear first) */
const BUYER_ACCEPTED = {
  propertyEntityId: 601,
  entityId: 101,
  isOriginalOwner: false,
  buyerPipelineStatusId: 27,
  propertyEntity: {
    entityId: 101,
    entityName: "Accepted Buyer",
    entityCategoryId: 1,
    address: "1 Accepted Rd",
    emailAddress: "accepted@test.com",
    phoneNumber: "0400 000 001",
  },
  buyerOffers: [
    {
      buyerOfferId: 8001,
      propertyEntityId: 601,
      offer: "500000",
      isAccepted: true,
      dateOffered: "2026-03-01",
    },
  ],
}

/** Buyer with an unaccepted offer (tier 1 — should appear second) */
const BUYER_HAS_OFFER = {
  propertyEntityId: 602,
  entityId: 102,
  isOriginalOwner: false,
  buyerPipelineStatusId: null,
  propertyEntity: {
    entityId: 102,
    entityName: "Offer Buyer",
    entityCategoryId: 1,
    address: "2 Offer Rd",
    emailAddress: "offer@test.com",
    phoneNumber: "0400 000 002",
  },
  buyerOffers: [
    {
      buyerOfferId: 8002,
      propertyEntityId: 602,
      offer: "450000",
      isAccepted: false,
      dateOffered: "2026-03-02",
    },
  ],
}

/** Buyer with no offers (tier 2 — should appear last) */
const BUYER_NO_OFFER = {
  propertyEntityId: 603,
  entityId: 103,
  isOriginalOwner: false,
  buyerPipelineStatusId: null,
  propertyEntity: {
    entityId: 103,
    entityName: "No Offer Buyer",
    entityCategoryId: 1,
    address: "3 None St",
    emailAddress: "none@test.com",
    phoneNumber: "0400 000 003",
  },
  buyerOffers: [],
}

/**
 * Server response already sorted by offer tier (as our custom route does).
 * Order: accepted-offer (601) → has-offer (602) → no-offer (603).
 * The mock simulates what the real GET /api/admin/properties/2001 returns after our fix.
 */
const PROPERTY_2001_DETAIL = {
  ...BASE_PROPERTY,
  propertyEntities: [BUYER_ACCEPTED, BUYER_HAS_OFFER, BUYER_NO_OFFER],
  propertyBuyers: [BUYER_ACCEPTED, BUYER_HAS_OFFER, BUYER_NO_OFFER],
}

/** Property-status options list — label "Active" for id 27 */
const PIPELINE_STATUS_BUYERS = {
  items: [
    {
      propertyStatusId: 27,
      propertyStatusCode: "ENQUIRY",
      propertyStatus: "Enquiry",
      isShownOnFavorite: false,
      pipeline: "buyers",
    },
    {
      propertyStatusId: 28,
      propertyStatusCode: "NEGOTIATING",
      propertyStatus: "Negotiating",
      isShownOnFavorite: false,
      pipeline: "buyers",
    },
  ],
  totalCount: 2,
  limit: 100,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false,
  startCursor: null,
  endCursor: null,
}

const PROPERTIES_LIST_RESPONSE = {
  items: [BASE_PROPERTY],
  totalCount: 1,
  limit: 25,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false,
  startCursor: null,
  endCursor: null,
}

const EMPTY_RESPONSE = {
  items: [],
  totalCount: 0,
  limit: 20,
  totalPages: 0,
  hasNextPage: false,
  hasPreviousPage: false,
  startCursor: null,
  endCursor: null,
}

// ─── Tests ───────────────────────────────────────────────────────────────────

test.describe("Property dialog — buyers panel cards and pipeline status badge (mocked APIs)", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")

    // Properties list + property detail
    await page.route("**/api/admin/properties**", async (route) => {
      const url = route.request().url()
      if (url.match(/\/api\/admin\/properties\/2001(\?|$)/)) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(PROPERTY_2001_DETAIL),
        })
        return
      }
      if (url.match(/\/api\/admin\/properties\/2001\/buyers(\?|$)/)) {
        // Panel fetches buyers separately — return the three buyers with pipeline labels
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            items: [
              {
                propertyEntityId: 601,
                entityId: 101,
                entityName: "Accepted Buyer",
                entityCategoryId: 1,
                address: "1 Accepted Rd",
                emailAddress: "accepted@test.com",
                phoneNumber: "0400 000 001",
                esuburb: null,
                estate: null,
                epostcode: null,
                notes: null,
                buyerPipelineStatusId: 27,
                pipelineStatusLabel: "Enquiry",
              },
              {
                propertyEntityId: 602,
                entityId: 102,
                entityName: "Offer Buyer",
                entityCategoryId: 1,
                address: "2 Offer Rd",
                emailAddress: "offer@test.com",
                phoneNumber: "0400 000 002",
                esuburb: null,
                estate: null,
                epostcode: null,
                notes: null,
                buyerPipelineStatusId: null,
                pipelineStatusLabel: null,
              },
              {
                propertyEntityId: 603,
                entityId: 103,
                entityName: "No Offer Buyer",
                entityCategoryId: 1,
                address: "3 None St",
                emailAddress: "none@test.com",
                phoneNumber: "0400 000 003",
                esuburb: null,
                estate: null,
                epostcode: null,
                notes: null,
                buyerPipelineStatusId: null,
                pipelineStatusLabel: null,
              },
            ],
          }),
        })
        return
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(PROPERTIES_LIST_RESPONSE),
      })
    })

    // Property-status options (pipeline stage labels)
    await page.route("**/api/admin/property-status**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(PIPELINE_STATUS_BUYERS),
      })
    })

    // Property-entities (not needed for this flow but stub to avoid 404s)
    await page.route("**/api/admin/property-entities**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(EMPTY_RESPONSE),
      })
    })

    // Entities search (async search for buyer name — stub empty so no real calls)
    await page.route("**/api/admin/entities**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(EMPTY_RESPONSE),
      })
    })

    await signInAsAdmin(page)
  })

  async function openPropertyAndBuyersTab(page: Parameters<typeof signInAsAdmin>[0]) {
    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible()
    await page.getByTestId("admin-entity-row--properties--2001").click()
    await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible()
    await page.getByTestId("panda-properties-form-tab-trigger--buyers").click()
    await expect(page.getByTestId("panda-properties-form-tab--buyers")).toBeVisible()
    await expect(page.getByTestId("property-buyers-panel-add-new")).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId("property-buyers-panel-add-new")).toBeEnabled({ timeout: 10_000 })
  }

  test("all three buyer cards appear in the buyers panel", async ({ page }) => {
    await openPropertyAndBuyersTab(page)

    const buyerRows = page.getByTestId(/^property-buyer-panel-row--/)
    await expect(buyerRows).toHaveCount(3, { timeout: 10_000 })

    await expect(page.getByTestId("property-buyer-panel-row--601")).toBeVisible()
    await expect(page.getByTestId("property-buyer-panel-row--602")).toBeVisible()
    await expect(page.getByTestId("property-buyer-panel-row--603")).toBeVisible()
  })

  test("buyer card shows pipeline status badge when status is set", async ({ page }) => {
    await openPropertyAndBuyersTab(page)

    const buyerRows = page.getByTestId(/^property-buyer-panel-row--/)
    await expect(buyerRows).toHaveCount(3, { timeout: 10_000 })

    // Accepted buyer (601) has pipelineStatusLabel "Enquiry"
    const badge601 = page.getByTestId("property-buyer-panel-status--601")
    await expect(badge601).toBeVisible()
    await expect(badge601).toContainText("Enquiry")
    await expect(badge601).not.toContainText("27")
  })

  test("buyer card without pipeline status shows no badge", async ({ page }) => {
    await openPropertyAndBuyersTab(page)

    const buyerRows = page.getByTestId(/^property-buyer-panel-row--/)
    await expect(buyerRows).toHaveCount(3, { timeout: 10_000 })

    // Offer buyer (602) has buyerPipelineStatusId = null → no badge rendered
    await expect(page.getByTestId("property-buyer-panel-status--602")).toHaveCount(0)
  })
})
