// Run: npm run test:e2e:scratch -- --app=panda-realty --spec="apps/panda-realty/e2e/open-portal-buttons.spec.ts" --no-bail

import { expect, test } from "@playwright/test"
import type { Page } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { createStory, shotFocused } from "@repo/e2e-utils"

import { e2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import {
  BUYER_PANEL_ITEMS_RESPONSE_1001,
  EMPTY_LIST_RESPONSE,
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

const SHOT_DIR = join(dirname(fileURLToPath(import.meta.url)), "screenshots", "open-portal-buttons")

const story = createStory({ specUrl: import.meta.url, slug: "open-portal-buttons" })
story.setWhatWasBuilt(
  "Reworked the property edit dialog portal UI: the seller portal toolbar moved from the top bar to under the " +
  "OWNER INFORMATION section, its raw URL is hidden and Copy link became an Open Portal button. The accepted " +
  "buyer's action row gained a labelled Open Portal button that opens that buyer's own portal page (auto-creating " +
  "the link when none exists). Non-accepted buyer rows keep the $ Offers icon and show no Open Portal button.",
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
  buyersPanelItems?: unknown[]
  /** Seller token returned by GET …/portal-tokens/seller — null = no-token state. */
  sellerToken?: unknown
  /** Buyer token returned by GET …/portal-tokens?propertyEntityId= — null = no-token (auto-generate on open). */
  buyerToken?: unknown
}

async function setupPropertyRoutes(page: Page, options: SetupOptions) {
  const buyersPanelItems = options.buyersPanelItems ?? []
  // Use `=== undefined` (not `??`) so an explicit `null` token reaches the no-token state.
  const sellerToken = options.sellerToken === undefined ? MOCK_SELLER_TOKEN_ACTIVE : options.sellerToken
  const buyerToken = options.buyerToken === undefined ? null : options.buyerToken

  await page.route("**/api/admin/properties**", async (route) => {
    const url = route.request().url()
    if (await maybeFulfillPandaPropertyBuyerOffersGet(route, { body: options.buyerOffers })) return
    if (url.match(new RegExp(`/api/admin/properties/${MOCK_PROPERTY_ID}/buyers(\\?|$)`))) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: buyersPanelItems }) })
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

  // Single handler covers seller + buyer portal token endpoints (avoids route-order ambiguity).
  await page.route("**/api/admin/portal-tokens**", async (route) => {
    const req = route.request()
    const url = req.url()
    const method = req.method()
    const json = (b: unknown) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(b) })

    if (url.includes("/portal-tokens/seller")) {
      if (method === "GET") return json(sellerToken)
      if (method === "POST") return json(MOCK_SELLER_TOKEN_ACTIVE)
      return route.fallback()
    }
    // Buyer token endpoints
    if (method === "GET") return json(buyerToken)
    if (method === "POST") return json(MOCK_BUYER_TOKEN_ACTIVE)
    if (method === "PATCH") return json({ ...MOCK_BUYER_TOKEN_ACTIVE, revokedAt: "2026-05-27T10:00:00.000Z" })
    return route.fallback()
  })
}

async function openPropertyDialog(page: Page) {
  await page.setViewportSize({ width: 1400, height: 900 })
  await page.goto("/admin/properties")
  await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible({ timeout: 15_000 })
  await page.getByTestId(`admin-entity-row--properties--${MOCK_PROPERTY_ID}`).click()
  const dialog = page.getByTestId("admin-entity-crud-dialog--properties")
  await expect(dialog).toBeVisible({ timeout: 10_000 })
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

test.describe("Open Portal buttons + seller toolbar relocation", () => {
  test.beforeEach(() => {
    test.setTimeout(120_000)
  })

  test("seller portal toolbar renders under the owner details, not in the top bar", async ({ page }) => {
    await setupPropertyRoutes(page, { buyerOffers: [ACCEPTED_OFFER] })
    const dialog = await openPropertyDialog(page)

    const owners = dialog.getByTestId("panda-properties-form-section--owners")
    await expect(owners).toBeVisible({ timeout: 15_000 })

    const sellerPortal = dialog.getByTestId("panda-properties-form-section--seller-portal")
    await expect(sellerPortal).toBeVisible({ timeout: 15_000 })

    const ownersBox = await owners.boundingBox()
    const portalBox = await sellerPortal.boundingBox()
    expect(ownersBox).not.toBeNull()
    expect(portalBox).not.toBeNull()
    // Relocated below the owner details (Richard: "placed under the sellers details, not on top of the page").
    expect(portalBox!.y).toBeGreaterThan(ownersBox!.y)

    await shotFocused(page, sellerPortal, SHOT_DIR, "01-seller-portal-relocated")
    story.addScene({
      title: "01 — Seller portal relocated under owner details",
      images: [join(SHOT_DIR, "01-seller-portal-relocated.png")],
      seeing: "The seller portal toolbar now sits below the OWNER INFORMATION block instead of across the top of the dialog.",
      steps: [
        "Open the edit dialog for a property with an active seller portal link",
        "The seller portal row appears under the owner details, not in the top bar",
      ],
    })
  })

  test("seller Open Portal button replaces Copy link and the raw URL is hidden", async ({ page }) => {
    await setupPropertyRoutes(page, { buyerOffers: [ACCEPTED_OFFER] })
    const dialog = await openPropertyDialog(page)

    const sellerPortal = dialog.getByTestId("panda-properties-form-section--seller-portal")
    await expect(sellerPortal).toBeVisible({ timeout: 15_000 })

    // Open Portal present; Copy link and raw URL gone.
    await expect(sellerPortal.getByTestId("portal-seller-open-btn")).toBeVisible({ timeout: 10_000 })
    await expect(dialog.getByTestId("portal-seller-copy-btn")).toHaveCount(0)
    await expect(dialog.getByTestId("portal-seller-url-display")).toHaveCount(0)

    // Other seller controls survive the relocation.
    await expect(sellerPortal.getByTestId("portal-seller-revoke-btn")).toBeVisible()
    await expect(sellerPortal.getByTestId("portal-seller-crash-btn")).toBeVisible()

    await shotFocused(page, sellerPortal, SHOT_DIR, "02-seller-open-portal-no-url")
    story.addScene({
      title: "02 — Seller: Open Portal replaces Copy link, URL hidden",
      images: [join(SHOT_DIR, "02-seller-open-portal-no-url.png")],
      seeing: "The seller row shows Open Portal, Send via email, Revoke and Contract Crash. No raw URL text and no Copy link button.",
      steps: [
        "Open the edit dialog for a property with an active seller portal link",
        "Confirm Open Portal is present and Copy link / URL are gone",
      ],
    })
  })

  test("accepted buyer row shows a labelled Open Portal button that opens the portal", async ({ page }) => {
    await setupPropertyRoutes(page, { buyerOffers: [ACCEPTED_OFFER], buyerToken: null })
    const dialog = await openPropertyDialog(page)

    const section = dialog.getByTestId("panda-properties-form-section--successful-buyer")
    await expect(section).toBeVisible({ timeout: 15_000 })

    const openPortalBtn = section.getByTestId(`panda-properties-form-successful-buyer-open-portal--${BUYER_PROPERTY_ENTITY_ID}`)
    await expect(openPortalBtn).toBeVisible({ timeout: 10_000 })
    await expect(openPortalBtn).toContainText(/open portal/i)

    await shotFocused(page, section, SHOT_DIR, "03a-buyer-open-portal-button")

    // No token yet → click auto-creates the link then opens the buyer portal in a new tab.
    const [popup] = await Promise.all([
      page.waitForEvent("popup", { timeout: 15_000 }),
      openPortalBtn.click(),
    ])
    // Blank tab opens synchronously, then navigates to the buyer portal once the token is known.
    await popup.waitForURL(/\/portal\//, { timeout: 15_000 })
    expect(popup.url()).toContain("/portal/")
    await popup.close()

    story.addScene({
      title: "03 — Accepted buyer: Open Portal opens that buyer's page",
      images: [join(SHOT_DIR, "03a-buyer-open-portal-button.png")],
      seeing: "The accepted buyer's action row has a labelled Open Portal button. Clicking it opens the buyer's own portal page in a new tab.",
      steps: [
        "Open the edit dialog for a property with an accepted offer",
        "Click Open Portal in the accepted buyer row",
        "A new tab opens the buyer portal (/portal/<token>)",
      ],
    })
  })

  test("pending offers: regular buyer rows keep the $ Offers icon and show no Open Portal; seller row still relocated", async ({ page }) => {
    await setupPropertyRoutes(page, {
      buyerOffers: [{ ...ACCEPTED_OFFER, isAccepted: false }],
      buyersPanelItems: BUYER_PANEL_ITEMS_RESPONSE_1001.items,
    })
    const dialog = await openPropertyDialog(page)

    await expect(dialog.getByTestId("panda-properties-form-section--owners")).toBeVisible({ timeout: 15_000 })

    // No accepted offer → no successful-buyer section, no buyer Open Portal anywhere.
    await expect(dialog.getByTestId("panda-properties-form-section--successful-buyer")).not.toBeVisible()

    // Regular buyer row keeps the $ Offers shortcut, and gains NO open-portal button (1C scope).
    // The buyer list now renders only under the Buyers tab (default-active in the no-accepted-offer
    // state) — there is no inline copy above the tabs — so scope these assertions to that tab.
    const inlineBuyers = dialog.getByTestId("panda-properties-form-tab--buyers")
    await expect(inlineBuyers).toBeVisible({ timeout: 10_000 })
    await expect(inlineBuyers.getByTestId(`property-buyer-owner-row-offers--${BUYER_PROPERTY_ENTITY_ID}`)).toBeVisible({ timeout: 10_000 })
    await expect(inlineBuyers.getByTestId(`property-buyer-owner-row-open-portal--${BUYER_PROPERTY_ENTITY_ID}`)).toHaveCount(0)

    // Relocation also applies in the no-accepted-offer layout.
    const sellerPortal = dialog.getByTestId("panda-properties-form-section--seller-portal")
    await expect(sellerPortal).toBeVisible({ timeout: 15_000 })
    await expect(sellerPortal.getByTestId("portal-seller-open-btn")).toBeVisible()

    await shotFocused(page, dialog.getByTestId("panda-properties-form-tab--buyers"), SHOT_DIR, "04-pending-buyers-dollar-only")
    story.addScene({
      title: "04 — Pending offers: $ kept, no buyer Open Portal",
      images: [join(SHOT_DIR, "04-pending-buyers-dollar-only.png")],
      seeing: "With offers still pending, each buyer row keeps the $ Offers icon and shows no Open Portal button.",
      steps: [
        "Open the edit dialog for a property with pending (unaccepted) offers",
        "Confirm the $ Offers icon is present and no Open Portal button appears on the buyer rows",
      ],
    })
  })

  test("seller no-token state shows Generate portal link, not Open Portal", async ({ page }) => {
    await setupPropertyRoutes(page, { buyerOffers: [ACCEPTED_OFFER], sellerToken: null })
    const dialog = await openPropertyDialog(page)

    const sellerPortal = dialog.getByTestId("panda-properties-form-section--seller-portal")
    await expect(sellerPortal).toBeVisible({ timeout: 15_000 })
    await expect(sellerPortal.getByTestId("portal-seller-generate-btn")).toBeVisible({ timeout: 10_000 })
    await expect(sellerPortal.getByTestId("portal-seller-open-btn")).toHaveCount(0)

    await shotFocused(page, sellerPortal, SHOT_DIR, "05-seller-no-token")
    story.addScene({
      title: "05 — Seller no-token: Generate portal link",
      images: [join(SHOT_DIR, "05-seller-no-token.png")],
      seeing: "When no seller link exists yet, the relocated panel shows Generate portal link; Open Portal is not shown.",
      steps: ["Open the edit dialog for a property with no seller portal link", "Confirm the Generate state, not Open Portal"],
    })
  })

  test("add property (create) variant does not render the relocated seller portal", async ({ page }) => {
    await page.route("**/api/admin/properties**", async (route) => {
      const url = route.request().url()
      if (url.match(/\/api\/admin\/properties(\?|$)/)) {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_LIST_RESPONSE) })
        return
      }
      await route.fallback()
    })
    await page.route("**/api/admin/property-status**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(STATUS_LIST_RESPONSE) })
    })
    await page.route("**/api/admin/property-entities**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_PROPERTY_ENTITIES_RESPONSE) })
    })

    await page.setViewportSize({ width: 1400, height: 900 })
    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-list-card--properties")).toBeVisible({ timeout: 15_000 })
    await page.getByTestId("admin-entity-list-add-new--properties").click()

    const dialog = page.getByTestId("admin-entity-crud-dialog--properties")
    await expect(dialog).toBeVisible()
    await expect(dialog.getByTestId("panda-properties-form-section--seller-portal")).not.toBeVisible()
  })
})
