// Run: npm run test:e2e:scratch -- --app=panda-realty --spec="apps/panda-realty/e2e/property-inline-portal-messages.spec.ts" --no-bail

import { expect, test } from "@playwright/test"
import type { Page } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { createStory, shotFocused } from "@repo/e2e-utils"

import { e2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import {
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
import {
  MOCK_SELLER_TOKEN_ACTIVE,
  MOCK_SELLER_TOKEN_REVOKED,
} from "./helpers/panda-seller-portal-mocks"

const SHOT_DIR = join(dirname(fileURLToPath(import.meta.url)), "screenshots", "property-inline-portal-messages")

const story = createStory({ specUrl: import.meta.url, slug: "property-inline-portal-messages" })
story.setWhatWasBuilt(
  "Added inline portal messaging to the property edit dialog. A Messages button now sits inline with the seller " +
  "portal buttons (Owner Information) and next to the successful buyer's Open Portal button. Clicking it expands the " +
  "existing PortalMessageThread in place so the agent can message a seller or buyer directly from the property, with " +
  "no need to open a buyer's profile dialog. The portal link is auto-generated on first open when none exists, and an " +
  "unread dot shows on the Messages button (prefetched with a non-mutating peek query) when the client has a new message.",
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

const UNREAD_CLIENT_MESSAGE = {
  portalMessageId: 5,
  senderRole: "client",
  body: "Any update on the building and pest?",
  sentAt: "2026-05-30T01:00:00.000Z",
  readAt: null,
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
  /** Seller token returned by GET …/portal-tokens/seller — null = no-token state. */
  sellerToken?: unknown
  /** Buyer token returned by GET …/portal-tokens?propertyEntityId= — null = no-token (auto-generate on open). */
  buyerToken?: unknown
  /** Messages returned by GET …/portal-messages/<id> (and peek). */
  messages?: unknown[]
}

async function setupPropertyRoutes(page: Page, options: SetupOptions) {
  // Use `=== undefined` (not `??`) so an explicit `null` token reaches the no-token state.
  const sellerToken = options.sellerToken === undefined ? MOCK_SELLER_TOKEN_ACTIVE : options.sellerToken
  const buyerToken = options.buyerToken === undefined ? null : options.buyerToken
  const messages = options.messages ?? []

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

  // Portal message thread endpoint — GET (incl. ?peek=1) returns the messages list; POST echoes an agent message.
  await page.route("**/api/admin/portal-messages/**", async (route) => {
    const method = route.request().method()
    if (method === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ messages }) })
      return
    }
    if (method === "POST") {
      const reqBody = (route.request().postDataJSON() ?? {}) as { body?: string }
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          portalMessageId: 9999,
          senderRole: "agent",
          body: reqBody.body ?? "",
          sentAt: "2026-06-01T00:00:00.000Z",
          readAt: null,
        }),
      })
      return
    }
    await route.fallback()
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

test.describe("Inline portal messages on the property dialog", () => {
  test.beforeEach(() => {
    test.setTimeout(120_000)
  })

  test("seller Messages button toggles the thread inline", async ({ page }) => {
    await setupPropertyRoutes(page, { buyerOffers: [ACCEPTED_OFFER] })
    const dialog = await openPropertyDialog(page)

    const sellerPortal = dialog.getByTestId("panda-properties-form-section--seller-portal")
    await expect(sellerPortal).toBeVisible({ timeout: 15_000 })

    const messagesBtn = sellerPortal.getByTestId("portal-seller-messages-btn")
    await expect(messagesBtn).toBeVisible({ timeout: 10_000 })
    await expect(messagesBtn).toContainText(/messages/i)

    // Collapsed by default.
    await expect(sellerPortal.getByTestId("portal-seller-messages-panel")).toHaveCount(0)
    await shotFocused(page, sellerPortal, SHOT_DIR, "01a-seller-messages-collapsed")

    // Expand inline.
    await messagesBtn.click()
    const panel = sellerPortal.getByTestId("portal-seller-messages-panel")
    await expect(panel).toBeVisible({ timeout: 10_000 })
    await expect(panel.getByTestId("portal-message-panel-textarea")).toBeVisible()
    await shotFocused(page, sellerPortal, SHOT_DIR, "01b-seller-messages-expanded")

    // Collapse again.
    await messagesBtn.click()
    await expect(sellerPortal.getByTestId("portal-seller-messages-panel")).toHaveCount(0)

    story.addScene({
      title: "01 — Seller Messages toggles inline",
      images: [
        join(SHOT_DIR, "01a-seller-messages-collapsed.png"),
        join(SHOT_DIR, "01b-seller-messages-expanded.png"),
      ],
      seeing: "Left: the seller portal row with a Messages button inline beside the portal buttons, thread collapsed. Right: after clicking, the message thread expands in place with a reply box.",
      steps: [
        "Open a property edit dialog with an active seller portal link",
        "Confirm a Messages button sits inline with the seller portal buttons",
        "Click Messages and confirm the thread expands inline, then collapses again",
      ],
    })
  })

  test("buyer Messages button toggles the buyer thread inline", async ({ page }) => {
    await setupPropertyRoutes(page, { buyerOffers: [ACCEPTED_OFFER], buyerToken: MOCK_BUYER_TOKEN_ACTIVE })
    const dialog = await openPropertyDialog(page)

    const section = dialog.getByTestId("panda-properties-form-section--successful-buyer")
    await expect(section).toBeVisible({ timeout: 15_000 })

    const messagesBtn = section.getByTestId(`panda-properties-form-successful-buyer-messages--${BUYER_PROPERTY_ENTITY_ID}`)
    await expect(messagesBtn).toBeVisible({ timeout: 10_000 })

    await messagesBtn.click()
    const panel = section.getByTestId(`panda-properties-form-successful-buyer-messages-panel--${BUYER_PROPERTY_ENTITY_ID}`)
    await expect(panel).toBeVisible({ timeout: 10_000 })
    await expect(panel.getByTestId("portal-message-panel-textarea")).toBeVisible()

    await shotFocused(page, section, SHOT_DIR, "02-buyer-messages-expanded")
    story.addScene({
      title: "02 — Buyer Messages toggles inline",
      images: [join(SHOT_DIR, "02-buyer-messages-expanded.png")],
      seeing: "The successful buyer row has a Messages button next to Open Portal; clicking it expands that buyer's thread inline.",
      steps: [
        "Open a property with an accepted offer",
        "Click Messages next to the buyer's Open Portal button",
        "Confirm the buyer thread expands inline with a reply box",
      ],
    })
  })

  test("sending a message from the seller thread shows the agent bubble", async ({ page }) => {
    await setupPropertyRoutes(page, { buyerOffers: [ACCEPTED_OFFER], messages: [] })
    const dialog = await openPropertyDialog(page)

    const sellerPortal = dialog.getByTestId("panda-properties-form-section--seller-portal")
    await sellerPortal.getByTestId("portal-seller-messages-btn").click()
    const panel = sellerPortal.getByTestId("portal-seller-messages-panel")
    await expect(panel).toBeVisible({ timeout: 10_000 })

    await panel.getByTestId("portal-message-panel-textarea").fill("Booked for Thursday 10am.")
    await panel.getByTestId("portal-message-panel-send-btn").click()

    const bubble = panel.getByTestId("portal-message-bubble")
    await expect(bubble).toContainText("Booked for Thursday 10am.", { timeout: 10_000 })

    await shotFocused(page, sellerPortal, SHOT_DIR, "03-seller-send-message")
    story.addScene({
      title: "03 — Seller: send a message",
      images: [join(SHOT_DIR, "03-seller-send-message.png")],
      seeing: "After typing and sending, the agent's message appears as a right-aligned bubble in the seller thread.",
      steps: ["Open the seller thread", "Type a message and click Send", "Confirm the message bubble appears"],
    })
  })

  test("seller no-token: clicking Messages auto-generates the link then opens the thread", async ({ page }) => {
    await setupPropertyRoutes(page, { buyerOffers: [ACCEPTED_OFFER], sellerToken: null })
    const dialog = await openPropertyDialog(page)

    const sellerPortal = dialog.getByTestId("panda-properties-form-section--seller-portal")
    await expect(sellerPortal).toBeVisible({ timeout: 15_000 })
    // No link yet → Generate state, but the Messages button is still offered.
    await expect(sellerPortal.getByTestId("portal-seller-generate-btn")).toBeVisible({ timeout: 10_000 })
    const messagesBtn = sellerPortal.getByTestId("portal-seller-messages-btn")
    await expect(messagesBtn).toBeVisible({ timeout: 10_000 })

    await messagesBtn.click()
    const panel = sellerPortal.getByTestId("portal-seller-messages-panel")
    await expect(panel).toBeVisible({ timeout: 10_000 })
    // After auto-generate, the compose box is enabled (not the "generate a link first" hint).
    await expect(panel.getByTestId("portal-message-panel-textarea")).toBeVisible({ timeout: 10_000 })

    await shotFocused(page, sellerPortal, SHOT_DIR, "04-seller-no-token-autogen")
    story.addScene({
      title: "04 — Seller no-token: auto-generate on first open",
      images: [join(SHOT_DIR, "04-seller-no-token-autogen.png")],
      seeing: "Even with no seller link yet, the Messages button is present; clicking it auto-generates the portal link and opens an enabled message thread.",
      steps: ["Open a property with no seller portal link", "Click Messages", "Confirm the link is generated and the reply box is enabled"],
    })
  })

  test("unread dot shows on the Messages button on dialog open", async ({ page }) => {
    await setupPropertyRoutes(page, { buyerOffers: [ACCEPTED_OFFER], messages: [UNREAD_CLIENT_MESSAGE] })
    const dialog = await openPropertyDialog(page)

    const sellerPortal = dialog.getByTestId("panda-properties-form-section--seller-portal")
    await expect(sellerPortal).toBeVisible({ timeout: 15_000 })

    // Dot is present BEFORE the thread is opened (prefetched via peek).
    const unreadDot = sellerPortal.getByTestId("portal-seller-messages-unread")
    await expect(unreadDot).toBeVisible({ timeout: 10_000 })

    await shotFocused(page, sellerPortal, SHOT_DIR, "05-seller-unread-dot")
    story.addScene({
      title: "05 — Unread dot on dialog open",
      images: [join(SHOT_DIR, "05-seller-unread-dot.png")],
      seeing: "The seller Messages button shows an unread dot as soon as the dialog opens, because the client has an unread message (prefetched without marking it read).",
      steps: ["Client sends a message", "Open the property dialog", "Confirm the Messages button shows an unread dot before opening the thread"],
    })
  })

  test("revoked seller link: Messages panel shows the revoked notice, no compose box", async ({ page }) => {
    await setupPropertyRoutes(page, { buyerOffers: [ACCEPTED_OFFER], sellerToken: MOCK_SELLER_TOKEN_REVOKED })
    const dialog = await openPropertyDialog(page)

    const sellerPortal = dialog.getByTestId("panda-properties-form-section--seller-portal")
    await expect(sellerPortal).toBeVisible({ timeout: 15_000 })

    const messagesBtn = sellerPortal.getByTestId("portal-seller-messages-btn")
    await expect(messagesBtn).toBeVisible({ timeout: 10_000 })
    await messagesBtn.click()

    const panel = sellerPortal.getByTestId("portal-seller-messages-panel")
    await expect(panel).toBeVisible({ timeout: 10_000 })
    await expect(panel).toContainText(/revoked/i)
    await expect(panel.getByTestId("portal-message-panel-textarea")).toHaveCount(0)
  })

  test("create (add property) variant has no seller Messages button", async ({ page }) => {
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
    await expect(dialog.getByTestId("portal-seller-messages-btn")).toHaveCount(0)
  })
})
