// Run: npm run test:e2e:scratch -- --app=panda-realty --spec="apps/panda-realty/e2e/portal-notification-deeplink-messages.spec.ts" --no-bail
//
// Verifies the portal-notification email deep link: opening the property dialog via
// `?openEdit=<id>&openMessages=seller` (or `&openMessages=buyer&openMessagesEntity=<peId>`)
// auto-expands the matching portal messages thread on mount — no click needed.
// Spec: specs/panda-realty-portal-notification-email-404.md

import { expect, test } from "@playwright/test"
import type { Page } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { createStory, shotFocused } from "@repo/e2e-utils"

import { e2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import {
  EMPTY_PROPERTY_ENTITIES_RESPONSE,
  PROPERTY_EDIT_WITH_BUYER,
  SINGLE_PROPERTY_RESPONSE,
  STATUS_LIST_RESPONSE,
} from "./helpers/admin-properties-mocks"
import {
  maybeFulfillPandaPropertyBuyerOffersGet,
  MOCK_PROPERTY_ID,
} from "./helpers/panda-properties-dialog-mocks"
import { MOCK_SELLER_TOKEN_ACTIVE } from "./helpers/panda-seller-portal-mocks"

const SHOT_DIR = join(dirname(fileURLToPath(import.meta.url)), "screenshots", "portal-notification-deeplink-messages")

const story = createStory({ specUrl: import.meta.url, slug: "portal-notification-deeplink-messages" })
story.setWhatWasBuilt(
  "Portal notification emails now deep-link straight to the conversation. The 'View the conversation in the admin " +
  "panel' link opens /admin/properties?openEdit=<propertyListId>&openMessages=<role>[&openMessagesEntity=<peId>]. " +
  "The property dialog reads these params on mount and auto-expands the matching InlinePortalMessages thread — the " +
  "seller thread for openMessages=seller, or the successful buyer's thread when openMessagesEntity matches the " +
  "accepted offer's propertyEntityId. Previously the link pointed at /admin/property-entities/<id>, which 404'd.",
)

const BUYER_PROPERTY_ENTITY_ID = 501

const MOCK_BUYER_TOKEN_ACTIVE = {
  portalTokenId: 77,
  token: "buyer-e2e-token-xyz",
  propertyEntityId: BUYER_PROPERTY_ENTITY_ID,
  propertyListId: MOCK_PROPERTY_ID,
  role: "buyer",
  revokedAt: null,
  lastAccessedAt: null,
  createdAt: "2026-05-27T09:00:00.000Z",
}

/** Accepted offer — drives the "successful buyer" layout (propertyEntityId 501 / entityId 201). */
const ACCEPTED_OFFER = {
  buyerOfferId: 9002,
  propertyEntityId: BUYER_PROPERTY_ENTITY_ID,
  entityId: 201,
  entityName: "Test Buyer LLC",
  offerFormToken: null,
  phoneNumber: "0400 111 222",
  emailAddress: "buyer@test.com",
  offer: "850000.00",
  isAccepted: true,
  dateOffered: "2026-03-20",
  createdAt: "2026-03-20T00:00:00Z",
  isCashOffer: false,
  noConditions: false,
  coolingOffDays: null,
  financeDays: null,
  buildingPestDays: null,
  dueDiligenceDays: null,
  subjectToSaleDays: null,
  subjectToSaleStage: null,
  subjectToSaleAddress: null,
  memberPropertyToSellAddress: null,
  memberNames: [],
  saleOfPropertyDays: null,
  unconditionalContractDays: null,
  depositInitial: null,
  depositBalance: null,
  otherConditions: null,
  customConditions: null,
  conditionNotes: null,
  waiveCoolingOff: null,
  isSubjectToFinance: null,
  financePreApproved: null,
  financeBank: null,
  financeBankContactName: null,
  financeBankContactPhone: null,
  financeBankContactEmail: null,
  suggestBuildingCompanies: null,
  isSubjectToSale: null,
  saleDaysBeforeListingLive: null,
  saleIsUnconditional: null,
  saleUnconditionalDate: null,
  saleBuyerSettlementDate: null,
  saleActiveConditions: null,
  saleFreeAppraisal: null,
  settlementPeriod: null,
}

interface SetupOptions {
  buyerOffers: unknown[]
  buyerToken?: unknown
}

async function setupPropertyRoutes(page: Page, options: SetupOptions) {
  const buyerToken = options.buyerToken === undefined ? null : options.buyerToken

  await page.route("**/api/admin/properties**", async (route) => {
    const url = route.request().url()
    if (await maybeFulfillPandaPropertyBuyerOffersGet(route, { body: options.buyerOffers })) return
    if (url.match(new RegExp(`/api/admin/properties/${MOCK_PROPERTY_ID}/buyers(\\?|$)`))) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [] }) })
      return
    }
    if (url.match(new RegExp(`/api/admin/properties/${MOCK_PROPERTY_ID}(\\?|$)`))) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(PROPERTY_EDIT_WITH_BUYER) })
      return
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ...SINGLE_PROPERTY_RESPONSE, items: [{ ...PROPERTY_EDIT_WITH_BUYER }] }),
    })
  })

  await page.route("**/api/admin/property-status**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(STATUS_LIST_RESPONSE) })
  })

  await page.route("**/api/admin/property-entities**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_PROPERTY_ENTITIES_RESPONSE) })
  })

  await page.route("**/api/admin/entities**", async (route) => {
    const method = route.request().method()
    if (method === "GET" || method === "PATCH") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ entityId: 201, entityName: "Test Buyer LLC", address: null }),
      })
      return
    }
    await route.fallback()
  })

  await page.route("**/api/admin/calendar/status**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ connected: false }) })
  })

  // Portal message thread endpoint — GET (incl. ?peek=1) returns an empty list.
  await page.route("**/api/admin/portal-messages/**", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ messages: [] }) })
      return
    }
    await route.fallback()
  })

  // Seller + buyer portal token endpoints.
  await page.route("**/api/admin/portal-tokens**", async (route) => {
    const req = route.request()
    const url = req.url()
    const method = req.method()
    const json = (b: unknown) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(b) })

    if (url.includes("/portal-tokens/seller")) {
      if (method === "GET") return json(MOCK_SELLER_TOKEN_ACTIVE)
      if (method === "POST") return json(MOCK_SELLER_TOKEN_ACTIVE)
      return route.fallback()
    }
    if (method === "GET") return json(buyerToken)
    if (method === "POST") return json(MOCK_BUYER_TOKEN_ACTIVE)
    return route.fallback()
  })
}

/** Open the property dialog via the deep link (no row click) and wait for it to render. */
async function openViaDeepLink(page: Page, query: string) {
  await page.setViewportSize({ width: 1400, height: 900 })
  await page.goto(`/admin/properties?openEdit=${MOCK_PROPERTY_ID}&${query}`)
  const dialog = page.getByTestId("admin-entity-crud-dialog--properties")
  await expect(dialog).toBeVisible({ timeout: 30_000 })
  return dialog
}

test.beforeEach(async ({ page }) => {
  if (!e2eAdminCredentials) throw new Error("E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set in apps/panda-realty/.env.local")
  await mkdir(SHOT_DIR, { recursive: true })
  await signInAsAdmin(page)
})

test.afterAll(() => {
  story.write()
})

test.describe("Portal notification deep link → auto-open messages", () => {
  test.beforeEach(() => {
    test.setTimeout(120_000)
  })

  test("openMessages=seller auto-expands the seller thread on dialog open", async ({ page }) => {
    await setupPropertyRoutes(page, { buyerOffers: [ACCEPTED_OFFER] })
    const dialog = await openViaDeepLink(page, "openMessages=seller")

    const sellerPortal = dialog.getByTestId("panda-properties-form-section--seller-portal")
    await expect(sellerPortal).toBeVisible({ timeout: 15_000 })

    // The thread is open WITHOUT any click, because of the deep link.
    const panel = sellerPortal.getByTestId("portal-seller-messages-panel")
    await expect(panel).toBeVisible({ timeout: 15_000 })
    await expect(panel.getByTestId("portal-message-panel-textarea")).toBeVisible({ timeout: 10_000 })

    await shotFocused(page, sellerPortal, SHOT_DIR, "01-seller-deeplink-autoopen")
    story.addScene({
      title: "01 — Seller deep link auto-opens the thread",
      images: [join(SHOT_DIR, "01-seller-deeplink-autoopen.png")],
      seeing: "Arriving at /admin/properties?openEdit=<id>&openMessages=seller opens the property dialog with the seller's Messages thread already expanded (reply box visible) — no click needed.",
      steps: [
        "Click the 'View the conversation' link in a seller portal-message email",
        "The property dialog opens via openEdit",
        "The seller Messages thread is already expanded from openMessages=seller",
      ],
    })
  })

  test("openMessages=buyer + matching entity auto-expands the buyer thread", async ({ page }) => {
    await setupPropertyRoutes(page, { buyerOffers: [ACCEPTED_OFFER], buyerToken: MOCK_BUYER_TOKEN_ACTIVE })
    const dialog = await openViaDeepLink(page, `openMessages=buyer&openMessagesEntity=${BUYER_PROPERTY_ENTITY_ID}`)

    const section = dialog.getByTestId("panda-properties-form-section--successful-buyer")
    await expect(section).toBeVisible({ timeout: 15_000 })

    const panel = section.getByTestId(`panda-properties-form-successful-buyer-messages-panel--${BUYER_PROPERTY_ENTITY_ID}`)
    await expect(panel).toBeVisible({ timeout: 15_000 })
    await expect(panel.getByTestId("portal-message-panel-textarea")).toBeVisible({ timeout: 10_000 })

    await shotFocused(page, section, SHOT_DIR, "02-buyer-deeplink-autoopen")
    story.addScene({
      title: "02 — Buyer deep link auto-opens the thread",
      images: [join(SHOT_DIR, "02-buyer-deeplink-autoopen.png")],
      seeing: "openMessages=buyer with an openMessagesEntity matching the accepted offer opens the successful buyer's Messages thread already expanded.",
      steps: [
        "Click the link in a buyer portal-message email",
        "The property dialog opens via openEdit",
        "The successful buyer's Messages thread is already expanded",
      ],
    })
  })

  test("no openMessages param: threads stay collapsed (default behaviour intact)", async ({ page }) => {
    await setupPropertyRoutes(page, { buyerOffers: [ACCEPTED_OFFER] })
    const dialog = await openViaDeepLink(page, "noop=1")

    const sellerPortal = dialog.getByTestId("panda-properties-form-section--seller-portal")
    await expect(sellerPortal).toBeVisible({ timeout: 15_000 })
    // Messages button present, but the panel is NOT auto-opened.
    await expect(sellerPortal.getByTestId("portal-seller-messages-btn")).toBeVisible({ timeout: 10_000 })
    await expect(sellerPortal.getByTestId("portal-seller-messages-panel")).toHaveCount(0)
  })
})
