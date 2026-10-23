// Run: npm run test:e2e:scratch -- --app=panda-realty --spec="apps/panda-realty/e2e/portal-seller-messaging.spec.ts" --no-bail

import { expect, test } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { createStory, shotFocused } from "@repo/e2e-utils"

import { requirePandaE2eAdminListLiveEnv, signInAsAdmin } from "./helpers/admin-auth"
import {
  MOCK_PROPERTY_ID,
  routePandaPropertiesListDetailAndBuyerOffers,
} from "./helpers/panda-properties-dialog-mocks"

const SHOT_DIR = join(dirname(fileURLToPath(import.meta.url)), "screenshots", "portal-seller-messaging")

const story = createStory({ specUrl: import.meta.url, slug: "portal-seller-messaging" })
story.setWhatWasBuilt(
  "Seller Portal Phase 3 — Messaging: admin Messages panel refactored into a dual-tab view " +
  "(Buyer / Seller). Buyer tab is active by default. Each tab shows its own isolated message thread " +
  "scoped to that portal token. Tab labels show an unread dot when the thread has unread messages. " +
  "Seller token API extended to accept ?propertyEntityId for lookup. Thread logic extracted to " +
  "portal-message-thread.tsx; panel is a thin tab wrapper.",
)

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_PE_ID = 185969

const STATUS_MIN = {
  items: [{ propertyStatusId: 1, propertyStatusCode: "ACTIVE", propertyStatus: "Active" }],
  totalCount: 1, limit: 100, totalPages: 1,
  hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null,
}

const EMPTY_LIST = {
  items: [], totalCount: 0, limit: 20, totalPages: 0,
  hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null,
}

const MOCK_ENTITY_DETAIL = {
  entityId: 99999, entityName: "E2E Buyer", entityCategoryId: 1,
  phoneNumber: null, emailAddress: null, address: null, esuburb: null, estate: null,
  epostcode: null, notes: null, contactCategoryId: null, isVip: false,
  createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z",
}

const BUYER_PANEL_ITEM = {
  propertyEntityId: MOCK_PE_ID, entityId: 99999, entityName: "E2E Buyer",
  phoneNumber: null, emailAddress: null, address: null, esuburb: null, estate: null,
  epostcode: null, notes: null, buyerPipelineStatusId: null, pipelineStatusLabel: null,
  hasOfferFormSubmission: false,
}

const MOCK_BUYER_ENTITY = {
  propertyEntityId: MOCK_PE_ID, entityId: 99999,
  propertyListId: MOCK_PROPERTY_ID, propertyEntityNote: null, buyerPipelineStatusId: null,
  isOriginalOwner: false, contactCategoryId: null, association: "Buyer",
  createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z",
  propertyEntity: { entityId: 99999, entityCategoryId: 1, entityName: "E2E Buyer" },
  propertyRef: { streetAddress: "12 Test Street", state: "QLD", postcode: "4000" },
  buyerPipelineStatus: null, contactCategory: null,
}

const MOCK_BUYER_TOKEN = {
  portalTokenId: 42, token: "e2e-buyer-token-abc",
  propertyEntityId: MOCK_PE_ID, propertyListId: MOCK_PROPERTY_ID,
  role: "buyer", revokedAt: null, lastAccessedAt: null, createdAt: "2026-05-22T09:00:00.000Z",
}

const MOCK_SELLER_TOKEN = {
  portalTokenId: 77, token: "e2e-seller-token-xyz",
  propertyEntityId: null, propertyListId: MOCK_PROPERTY_ID,
  role: "seller", revokedAt: null, lastAccessedAt: null, createdAt: "2026-05-22T09:30:00.000Z",
}

const MOCK_BUYER_MESSAGE = {
  portalMessageId: 1, portalTokenId: 42, senderRole: "client",
  body: "Buyer thread: when is settlement?",
  sentAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  readAt: null,
}

const MOCK_SELLER_MESSAGE = {
  portalMessageId: 10, portalTokenId: 77, senderRole: "client",
  body: "Seller thread: what price did we get?",
  sentAt: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
  readAt: null,
}

// ─── Setup helpers ────────────────────────────────────────────────────────────

async function setupMockedAdmin(
  page: Parameters<typeof signInAsAdmin>[0],
  opts: {
    buyerToken?: typeof MOCK_BUYER_TOKEN | null
    sellerToken?: typeof MOCK_SELLER_TOKEN | null
    buyerMessages?: unknown[]
    sellerMessages?: unknown[]
  } = {},
) {
  const {
    buyerToken = MOCK_BUYER_TOKEN,
    sellerToken = MOCK_SELLER_TOKEN,
    buyerMessages = [],
    sellerMessages = [],
  } = opts

  await page.route("**/api/admin/property-status**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(STATUS_MIN) })
  })
  await page.route("**/api/admin/property-entities**", async (route) => {
    const url = route.request().url()
    const method = route.request().method()
    if (url.match(/\/property-entities\/\d+/) && method === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_BUYER_ENTITY) })
      return
    }
    if (method === "GET") {
      await route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify({
          items: [MOCK_BUYER_ENTITY], totalCount: 1, limit: 20, totalPages: 1,
          hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null,
        }),
      })
      return
    }
    await route.continue()
  })

  // Buyer token — register FIRST (lower LIFO priority); broad pattern must not intercept /seller** requests
  await page.route("**/api/admin/portal-tokens**", async (route) => {
    const url = route.request().url()
    const method = route.request().method()
    // Defer any request that looks like /portal-tokens/seller to the seller-specific route below
    if (url.includes("/portal-tokens/seller")) {
      await route.fallback()
      return
    }
    if (method === "GET") {
      await route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify(buyerToken),
      })
      return
    }
    await route.continue()
  })

  // Seller token — register SECOND (higher LIFO priority)
  await page.route("**/api/admin/portal-tokens/seller**", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(sellerToken),
      })
      return
    }
    await route.fallback()
  })

  // Buyer messages (portalTokenId 42)
  await page.route(`**/api/admin/portal-messages/${MOCK_BUYER_TOKEN.portalTokenId}**`, async (route) => {
    const method = route.request().method()
    if (method === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ messages: buyerMessages }) })
      return
    }
    if (method === "POST") {
      const body = route.request().postDataJSON() as { body: string }
      await route.fulfill({
        status: 201, contentType: "application/json",
        body: JSON.stringify({ portalMessageId: 99, portalTokenId: MOCK_BUYER_TOKEN.portalTokenId, senderRole: "agent", body: body.body, sentAt: new Date().toISOString(), readAt: null }),
      })
      return
    }
    await route.continue()
  })

  // Seller messages (portalTokenId 77)
  await page.route(`**/api/admin/portal-messages/${MOCK_SELLER_TOKEN.portalTokenId}**`, async (route) => {
    const method = route.request().method()
    if (method === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ messages: sellerMessages }) })
      return
    }
    if (method === "POST") {
      const body = route.request().postDataJSON() as { body: string }
      await route.fulfill({
        status: 201, contentType: "application/json",
        body: JSON.stringify({ portalMessageId: 88, portalTokenId: MOCK_SELLER_TOKEN.portalTokenId, senderRole: "agent", body: body.body, sentAt: new Date().toISOString(), readAt: null }),
      })
      return
    }
    await route.continue()
  })

  await page.route("**/api/admin/entities**", async (route) => {
    const url = route.request().url()
    const method = route.request().method()
    if (method === "GET" && url.match(/\/entities\/\d+/)) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_ENTITY_DETAIL) })
      return
    }
    if (method === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_LIST) })
      return
    }
    await route.continue()
  })
  await page.route("**/api/admin/properties**/buyers", async (route) => {
    await route.fulfill({
      status: 200, contentType: "application/json",
      body: JSON.stringify({ items: [BUYER_PANEL_ITEM] }),
    })
  })
  await routePandaPropertiesListDetailAndBuyerOffers(page)
  await signInAsAdmin(page)
}

async function navigateToMessagesPanel(page: Parameters<typeof signInAsAdmin>[0]) {
  await page.goto("/admin/properties")
  await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible({ timeout: 20_000 })
  await page.getByTestId(`admin-entity-row--properties--${MOCK_PROPERTY_ID}`).click()
  const propertiesDialog = page.getByTestId("admin-entity-crud-dialog--properties")
  await expect(propertiesDialog).toBeVisible({ timeout: 10_000 })
  await propertiesDialog.getByTestId("panda-properties-form-tab-trigger--buyers").click()
  const openProfileBtn = propertiesDialog
    .getByTestId("panda-properties-form-tab--buyers")
    .getByTestId(`property-buyer-owner-row-open-profile--${MOCK_PE_ID}`)
  await expect(openProfileBtn).toBeVisible({ timeout: 15_000 })
  await openProfileBtn.click()
  const buyerWorkspace = page.getByTestId("admin-entity-crud-dialog--entities")
  await expect(buyerWorkspace).toBeVisible({ timeout: 15_000 })
  await buyerWorkspace
    .getByTestId("admin-entity-crud-related-tab--property-entities--messages-tab")
    .click()
  const panel = buyerWorkspace.getByTestId("portal-message-panel")
  await expect(panel).toBeVisible({ timeout: 10_000 })
  return panel
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.beforeAll(() => {
  requirePandaE2eAdminListLiveEnv()
})

test.beforeEach(async () => {
  await mkdir(SHOT_DIR, { recursive: true })
})

test.afterAll(() => {
  story.write()
})

test.describe("Seller Portal Messaging — Admin dual-tab panel", () => {
  test.beforeEach(() => test.setTimeout(120_000))

  test("Messages panel shows Buyer and Seller sub-tabs; Buyer is active by default", async ({ page }) => {
    await setupMockedAdmin(page)
    const panel = await navigateToMessagesPanel(page)

    const buyerTab = panel.getByTestId("portal-message-tab-buyer")
    const sellerTab = panel.getByTestId("portal-message-tab-seller")

    await expect(buyerTab).toBeVisible({ timeout: 10_000 })
    await expect(sellerTab).toBeVisible({ timeout: 10_000 })

    // Buyer tab is active by default — has an active style indicator
    await expect(buyerTab).toHaveAttribute("aria-selected", "true")

    await shotFocused(page, panel, SHOT_DIR, "01-dual-tabs-buyer-default")
    story.addScene({
      title: "01 — Admin: Messages Panel — Buyer and Seller tabs visible, Buyer active",
      images: [join(SHOT_DIR, "01-dual-tabs-buyer-default.png")],
      seeing: "Messages panel shows two sub-tabs: Buyer (active/underlined) and Seller.",
      steps: [
        "Open admin → properties → buyer workspace → Messages tab",
        "Two sub-tabs Buyer and Seller are visible",
        "Buyer tab is active by default",
      ],
    })
  })

  test("Buyer tab shows buyer thread content", async ({ page }) => {
    await setupMockedAdmin(page, { buyerMessages: [MOCK_BUYER_MESSAGE] })
    const panel = await navigateToMessagesPanel(page)

    const buyerTab = panel.getByTestId("portal-message-tab-buyer")
    await expect(buyerTab).toBeVisible({ timeout: 10_000 })

    // Buyer thread is visible by default without clicking
    const bubble = panel.getByTestId("portal-message-bubble").first()
    await expect(bubble).toBeVisible({ timeout: 10_000 })
    await expect(bubble).toContainText("Buyer thread: when is settlement?")

    await shotFocused(page, panel, SHOT_DIR, "02-buyer-thread-content")
    story.addScene({
      title: "02 — Admin: Buyer Tab Shows Buyer Thread",
      images: [join(SHOT_DIR, "02-buyer-thread-content.png")],
      seeing: "Buyer tab is active and shows the buyer thread message bubble.",
      steps: ["Open Messages tab — Buyer tab active by default", "Buyer message visible in thread"],
    })
  })

  test("Switching to Seller tab shows seller thread (different messages)", async ({ page }) => {
    await setupMockedAdmin(page, {
      buyerMessages: [MOCK_BUYER_MESSAGE],
      sellerMessages: [MOCK_SELLER_MESSAGE],
    })
    const panel = await navigateToMessagesPanel(page)

    const sellerTab = panel.getByTestId("portal-message-tab-seller")
    await expect(sellerTab).toBeVisible({ timeout: 10_000 })

    await shotFocused(page, panel, SHOT_DIR, "03a-before-seller-tab")
    await sellerTab.click()

    // Seller thread message is shown; buyer message is not
    const bubble = panel.getByTestId("portal-message-bubble").first()
    await expect(bubble).toBeVisible({ timeout: 10_000 })
    await expect(bubble).toContainText("Seller thread: what price did we get?")

    // Buyer-only message is not in this thread
    await expect(panel).not.toContainText("Buyer thread: when is settlement?")

    await shotFocused(page, panel, SHOT_DIR, "03b-seller-thread-content")
    story.addScene({
      title: "03 — Admin: Seller Tab Shows Isolated Seller Thread",
      images: [join(SHOT_DIR, "03a-before-seller-tab.png"), join(SHOT_DIR, "03b-seller-thread-content.png")],
      seeing: "Left: Buyer tab active with buyer message. Right: after switching to Seller tab, seller message visible and buyer message absent.",
      steps: [
        "Open Messages tab with both buyer and seller threads having messages",
        "Buyer message visible (screenshot 1)",
        "Click Seller tab",
        "Seller message visible; buyer message absent (screenshot 2)",
      ],
    })
  })

  test("Reply sent in Buyer tab does not appear in Seller tab", async ({ page }) => {
    await setupMockedAdmin(page)
    const panel = await navigateToMessagesPanel(page)

    // Ensure on Buyer tab
    const buyerTab = panel.getByTestId("portal-message-tab-buyer")
    await expect(buyerTab).toBeVisible({ timeout: 10_000 })

    // Send in buyer tab
    const textarea = panel.getByTestId("portal-message-panel-textarea")
    await textarea.fill("Buyer reply only")
    await panel.getByTestId("portal-message-panel-send-btn").click()
    const sentBubble = panel.getByTestId("portal-message-bubble").last()
    await expect(sentBubble).toBeVisible({ timeout: 10_000 })
    await expect(sentBubble).toContainText("Buyer reply only")

    // Switch to Seller tab — no messages there
    const sellerTab = panel.getByTestId("portal-message-tab-seller")
    await sellerTab.click()

    await expect(panel).not.toContainText("Buyer reply only")

    await shotFocused(page, panel, SHOT_DIR, "04-isolation-seller-empty-after-buyer-send")
    story.addScene({
      title: "04 — Admin: Thread Isolation — Buyer Reply Not in Seller Thread",
      images: [join(SHOT_DIR, "04-isolation-seller-empty-after-buyer-send.png")],
      seeing: "After sending a reply in the Buyer tab and switching to Seller tab, the buyer reply is absent.",
      steps: [
        "Send a message in the Buyer tab",
        "Switch to Seller tab",
        "Buyer reply is not visible in the Seller thread",
      ],
    })
  })

  test("Unread dot appears on Seller tab label when seller thread has unread messages", async ({ page }) => {
    await setupMockedAdmin(page, { sellerMessages: [MOCK_SELLER_MESSAGE] })
    const panel = await navigateToMessagesPanel(page)

    // Buyer tab is active; seller tab should show unread dot since seller message is unread
    const sellerTab = panel.getByTestId("portal-message-tab-seller")
    await expect(sellerTab).toBeVisible({ timeout: 10_000 })

    const sellerDot = panel.getByTestId("portal-message-tab-seller-dot")
    await expect(sellerDot).toBeVisible({ timeout: 10_000 })

    await shotFocused(page, panel, SHOT_DIR, "05-seller-tab-unread-dot")
    story.addScene({
      title: "05 — Admin: Unread Dot on Seller Tab When Seller Thread Has Unread",
      images: [join(SHOT_DIR, "05-seller-tab-unread-dot.png")],
      seeing: "Seller tab label shows a small unread dot because the seller thread has an unread message.",
      steps: [
        "Open Messages tab with an unread seller message",
        "Buyer tab is active by default",
        "Seller tab shows unread dot indicator",
      ],
    })
  })

  test("Seller tab shows no-token state when no seller portal link exists", async ({ page }) => {
    await setupMockedAdmin(page, { sellerToken: null })
    const panel = await navigateToMessagesPanel(page)

    const sellerTab = panel.getByTestId("portal-message-tab-seller")
    await expect(sellerTab).toBeVisible({ timeout: 10_000 })
    await sellerTab.click()

    // No-token state message
    await expect(panel).toContainText(/No seller portal link generated|Generate a portal link|portal link/)

    // No textarea when no token
    const textarea = panel.getByTestId("portal-message-panel-textarea")
    await expect(textarea).not.toBeVisible()

    await shotFocused(page, panel, SHOT_DIR, "06-seller-tab-no-token")
    story.addScene({
      title: "06 — Admin: Seller Tab — No-Token Empty State",
      images: [join(SHOT_DIR, "06-seller-tab-no-token.png")],
      seeing: "When no seller portal link exists, the Seller tab shows a no-token message and no textarea.",
      steps: [
        "Open Messages tab when no seller portal link generated",
        "Click Seller tab",
        "Panel shows no-token empty state; no textarea visible",
      ],
    })
  })

  test("Buyer tab preserves existing no-token behavior when no buyer portal link", async ({ page }) => {
    await setupMockedAdmin(page, { buyerToken: null })
    const panel = await navigateToMessagesPanel(page)

    // New dual-tab structure must exist
    const buyerTab = panel.getByTestId("portal-message-tab-buyer")
    await expect(buyerTab).toBeVisible({ timeout: 10_000 })

    // Buyer tab is default; no token means no-token state
    await expect(panel).toContainText(/Generate a portal link|portal link|No portal link/)

    const textarea = panel.getByTestId("portal-message-panel-textarea")
    await expect(textarea).not.toBeVisible()

    await shotFocused(page, panel, SHOT_DIR, "07-buyer-tab-no-token")
    story.addScene({
      title: "07 — Admin: Buyer Tab — No-Token Empty State (Existing Behavior Preserved)",
      images: [join(SHOT_DIR, "07-buyer-tab-no-token.png")],
      seeing: "When no buyer portal link exists, the Buyer tab shows the existing no-token message.",
      steps: [
        "Open Messages tab when no buyer portal link generated",
        "Buyer tab active by default",
        "Panel shows no-token empty state",
      ],
    })
  })
})
