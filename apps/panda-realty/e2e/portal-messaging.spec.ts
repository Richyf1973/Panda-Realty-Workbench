// Run: npm run test:e2e:scratch -- --app=panda-realty --spec="apps/panda-realty/e2e/portal-messaging.spec.ts" --no-bail

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

const SHOT_DIR = join(dirname(fileURLToPath(import.meta.url)), "screenshots", "portal-messaging")

const story = createStory({ specUrl: import.meta.url, slug: "portal-messaging" })
story.setWhatWasBuilt(
  "Portal Two-Way Messaging for Panda Realty: adds portal_messages table, public API routes " +
  "(GET/POST /api/portal/[token]/messages), admin API routes (GET/POST /api/admin/portal-messages/[id]), " +
  "a PortalMessages client component on the portal page with 30s polling and Ctrl+Enter send, " +
  "a new Messages tab in the buyer workspace admin panel, and Gmail email notification to Richard " +
  "when a client sends a message.",
)

// Live fixtures (same seed data as portal-documents and portal-admin-controls)
const FIXTURE_A = { propertyEntityId: 185969, propertyListId: 202739 }

async function createPortalToken(
  page: Parameters<typeof signInAsAdmin>[0],
  fixture: typeof FIXTURE_A,
): Promise<{ token: string; portalTokenId: number }> {
  await signInAsAdmin(page)
  const res = await page.context().request.post("/api/admin/portal-tokens", { data: fixture })
  const body = await res.json()
  return { token: body.token as string, portalTokenId: body.portalTokenId as number }
}

// ── Mock data for admin UI tests ──────────────────────────────────────────────

const MOCK_PE_ID = 185969
const MOCK_ENTITY_ID = 99999

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
  entityId: MOCK_ENTITY_ID, entityName: "E2E Buyer", entityCategoryId: 1,
  phoneNumber: null, emailAddress: null, address: null, esuburb: null, estate: null,
  epostcode: null, notes: null, contactCategoryId: null, isVip: false,
  createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z",
}

const BUYER_PANEL_ITEM = {
  propertyEntityId: MOCK_PE_ID, entityId: MOCK_ENTITY_ID, entityName: "E2E Buyer",
  phoneNumber: null, emailAddress: null, address: null, esuburb: null, estate: null,
  epostcode: null, notes: null, buyerPipelineStatusId: null, pipelineStatusLabel: null,
  hasOfferFormSubmission: false,
}

const MOCK_BUYER_ENTITY = {
  propertyEntityId: MOCK_PE_ID, entityId: MOCK_ENTITY_ID,
  propertyListId: MOCK_PROPERTY_ID, propertyEntityNote: null, buyerPipelineStatusId: null,
  isOriginalOwner: false, contactCategoryId: null, association: "Buyer",
  createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z",
  propertyEntity: { entityId: MOCK_ENTITY_ID, entityCategoryId: 1, entityName: "E2E Buyer" },
  propertyRef: { streetAddress: "12 Test Street", state: "QLD", postcode: "4000" },
  buyerPipelineStatus: null, contactCategory: null,
}

const MOCK_ACTIVE_TOKEN = {
  portalTokenId: 42, token: "e2e-msg-token-abc-123",
  propertyEntityId: MOCK_PE_ID, propertyListId: MOCK_PROPERTY_ID,
  revokedAt: null, lastAccessedAt: null, createdAt: "2026-05-22T09:00:00.000Z",
}

const MOCK_CLIENT_MESSAGE = {
  portalMessageId: 1, portalTokenId: 42, senderRole: "client",
  body: "Hi Richard, when is settlement?",
  sentAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  readAt: null,
}

const MOCK_AGENT_MESSAGE = {
  portalMessageId: 2, portalTokenId: 42, senderRole: "agent",
  body: "Settlement is next Friday — all on track.",
  sentAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
  readAt: null,
}

const MOCK_MESSAGES_RESPONSE = { messages: [MOCK_CLIENT_MESSAGE, MOCK_AGENT_MESSAGE] }
const MOCK_EMPTY_MESSAGES = { messages: [] }

async function setupMockedAdmin(
  page: Parameters<typeof signInAsAdmin>[0],
  messagesResponse: typeof MOCK_EMPTY_MESSAGES | typeof MOCK_MESSAGES_RESPONSE,
) {
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
  await page.route("**/api/admin/portal-tokens**", async (route) => {
    const method = route.request().method()
    if (method === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_ACTIVE_TOKEN) })
      return
    }
    await route.continue()
  })
  await page.route(`**/api/admin/portal-messages/${MOCK_ACTIVE_TOKEN.portalTokenId}**`, async (route) => {
    const method = route.request().method()
    if (method === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(messagesResponse) })
      return
    }
    if (method === "POST") {
      const body = route.request().postDataJSON() as { body: string }
      const newMsg = {
        portalMessageId: 99, portalTokenId: MOCK_ACTIVE_TOKEN.portalTokenId,
        senderRole: "agent", body: body.body,
        sentAt: new Date().toISOString(), readAt: null,
      }
      await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify(newMsg) })
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

async function navigateToBuyerWorkspace(page: Parameters<typeof signInAsAdmin>[0]) {
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
  return buyerWorkspace
}

// ─────────────────────────────────────────────────────────────────────────────

test.beforeAll(() => {
  requirePandaE2eAdminListLiveEnv()
})

test.beforeEach(async () => {
  await mkdir(SHOT_DIR, { recursive: true })
})

test.afterAll(() => {
  story.write()
})

// ── API tests — public portal routes ─────────────────────────────────────────

test.describe("Portal Messaging — public API", () => {
  test.beforeEach(() => test.setTimeout(60_000))

  test("GET /api/portal/[token]/messages returns 200 with messages array", async ({ page }) => {
    const { token } = await createPortalToken(page, FIXTURE_A)
    const res = await page.context().request.get(`/api/portal/${token}/messages`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty("messages")
    expect(Array.isArray(body.messages)).toBe(true)
  })

  test("POST /api/portal/[token]/messages inserts a message and returns 201", async ({ page }) => {
    const { token } = await createPortalToken(page, FIXTURE_A)
    const res = await page.context().request.post(`/api/portal/${token}/messages`, {
      data: { body: "E2E test message from client" },
    })
    expect(res.status()).toBe(201)
    const body = await res.json()
    expect(body).toHaveProperty("portalMessageId")
    expect(body.senderRole).toBe("client")
  })

  test("POST /api/portal/[token]/messages returns 410 on revoked token", async ({ page }) => {
    await signInAsAdmin(page)
    const { token, portalTokenId } = await createPortalToken(page, FIXTURE_A)
    await page.context().request.patch(`/api/admin/portal-tokens/${portalTokenId}`)
    const res = await page.context().request.post(`/api/portal/${token}/messages`, {
      data: { body: "Should fail" },
    })
    expect(res.status()).toBe(410)
  })

  test("POST /api/portal/[token]/messages returns 400 on empty body", async ({ page }) => {
    const { token } = await createPortalToken(page, FIXTURE_A)
    const res = await page.context().request.post(`/api/portal/${token}/messages`, {
      data: { body: "" },
    })
    expect(res.status()).toBe(400)
  })
})

// ── API tests — admin routes ──────────────────────────────────────────────────

test.describe("Portal Messaging — admin API", () => {
  test.beforeEach(() => test.setTimeout(60_000))

  test("GET /api/admin/portal-messages/[id] authenticated returns 200", async ({ page }) => {
    const { portalTokenId } = await createPortalToken(page, FIXTURE_A)
    const res = await page.context().request.get(`/api/admin/portal-messages/${portalTokenId}`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty("messages")
  })

  test("GET /api/admin/portal-messages/[id] unauthenticated returns 401", async ({ baseURL }) => {
    const res = await fetch(`${baseURL}/api/admin/portal-messages/1`)
    expect(res.status).toBe(401)
  })

  test("POST /api/admin/portal-messages/[id] authenticated inserts agent message", async ({ page }) => {
    const { portalTokenId } = await createPortalToken(page, FIXTURE_A)
    const res = await page.context().request.post(`/api/admin/portal-messages/${portalTokenId}`, {
      data: { body: "E2E agent reply" },
    })
    expect(res.status()).toBe(201)
    const body = await res.json()
    expect(body.senderRole).toBe("agent")
  })
})

// ── Portal client UI ──────────────────────────────────────────────────────────

test.describe("Portal Messaging — portal client UI", () => {
  test.beforeEach(() => test.setTimeout(120_000))

  test("portal-messages section visible on portal page load", async ({ page }) => {
    const { token } = await createPortalToken(page, FIXTURE_A)
    await page.goto(`/portal/${token}`)

    const section = page.getByTestId("portal-messages")
    await expect(section).toBeVisible({ timeout: 15_000 })

    await shotFocused(page, section, SHOT_DIR, "01-portal-messages-section")
    story.addScene({
      title: "01 — Portal: Messages Section Visible",
      images: [join(SHOT_DIR, "01-portal-messages-section.png")],
      seeing: "The Messages section appears at the bottom of the portal page below the documents card.",
      steps: ["Navigate to /portal/<token>", "Messages section is visible"],
    })
  })

  test("portal-messages empty state shows when no messages exist", async ({ page }) => {
    const { token } = await createPortalToken(page, FIXTURE_A)
    await page.goto(`/portal/${token}`)

    const section = page.getByTestId("portal-messages")
    await expect(section).toBeVisible({ timeout: 15_000 })

    const emptyState = section.getByTestId("portal-messages-empty")
    await expect(emptyState).toBeVisible()
    await expect(emptyState).toContainText("No messages yet")

    await shotFocused(page, section, SHOT_DIR, "02-portal-messages-empty")
    story.addScene({
      title: "02 — Portal: Messages Empty State",
      images: [join(SHOT_DIR, "02-portal-messages-empty.png")],
      seeing: "Empty state shows Send a message to Richard below prompt when thread is empty.",
      steps: ["Navigate to portal with no messages", "Empty state text visible"],
    })
  })

  test("client sends message — appears right-aligned, textarea clears", async ({ page }) => {
    const { token } = await createPortalToken(page, FIXTURE_A)
    await page.goto(`/portal/${token}`)

    const section = page.getByTestId("portal-messages")
    await expect(section).toBeVisible({ timeout: 15_000 })

    const textarea = section.getByTestId("portal-messages-textarea")
    await expect(textarea).toBeVisible()

    const sendBtn = section.getByTestId("portal-messages-send-btn")
    await expect(sendBtn).toBeVisible()

    await shotFocused(page, section, SHOT_DIR, "03a-before-send")

    await textarea.fill("Hi Richard, when is settlement?")
    await sendBtn.click()

    // Message appears in thread
    const bubble = section.getByTestId("portal-message-bubble").last()
    await expect(bubble).toBeVisible({ timeout: 10_000 })
    await expect(bubble).toContainText("Hi Richard, when is settlement?")

    // Textarea clears after send
    await expect(textarea).toHaveValue("")

    await shotFocused(page, section, SHOT_DIR, "03b-after-send")
    story.addScene({
      title: "03 — Portal: Client Sends Message",
      images: [join(SHOT_DIR, "03a-before-send.png"), join(SHOT_DIR, "03b-after-send.png")],
      seeing: "Left: empty thread with send form. Right: message appears right-aligned after sending; textarea clears.",
      steps: ["Type message in textarea", "Click Send", "Message appears right-aligned in thread"],
    })
  })

  test("send button disabled when textarea is empty", async ({ page }) => {
    const { token } = await createPortalToken(page, FIXTURE_A)
    await page.goto(`/portal/${token}`)

    const section = page.getByTestId("portal-messages")
    await expect(section).toBeVisible({ timeout: 15_000 })

    const sendBtn = section.getByTestId("portal-messages-send-btn")
    await expect(sendBtn).toBeDisabled()

    await shotFocused(page, section, SHOT_DIR, "04-send-btn-disabled")
    story.addScene({
      title: "04 — Portal: Send Button Disabled When Empty",
      images: [join(SHOT_DIR, "04-send-btn-disabled.png")],
      seeing: "Send button is disabled when the textarea is empty — prevents blank submissions.",
      steps: ["Navigate to portal", "Send button is disabled with empty textarea"],
    })
  })

  test("char counter shows 0 / 2000 on empty textarea and updates while typing", async ({ page }) => {
    const { token } = await createPortalToken(page, FIXTURE_A)
    await page.goto(`/portal/${token}`)

    const section = page.getByTestId("portal-messages")
    await expect(section).toBeVisible({ timeout: 15_000 })

    const counter = section.getByTestId("portal-messages-char-count")
    await expect(counter).toBeVisible()
    await expect(counter).toContainText("0 / 2000")

    const textarea = section.getByTestId("portal-messages-textarea")
    await textarea.fill("Hello")

    await expect(counter).toContainText("5 / 2000")

    await shotFocused(page, section, SHOT_DIR, "05-char-counter")
    story.addScene({
      title: "05 — Portal: Character Counter",
      images: [join(SHOT_DIR, "05-char-counter.png")],
      seeing: "Character counter below the textarea shows current / 2000 and updates on each keystroke.",
      steps: ["Type in textarea", "Counter updates to reflect character count"],
    })
  })

  test("message persists after page reload", async ({ page }) => {
    const { token } = await createPortalToken(page, FIXTURE_A)
    await page.goto(`/portal/${token}`)

    const section = page.getByTestId("portal-messages")
    await expect(section).toBeVisible({ timeout: 15_000 })

    const textarea = section.getByTestId("portal-messages-textarea")
    await textarea.fill("Persistence test message")
    await section.getByTestId("portal-messages-send-btn").click()

    const bubble = section.getByTestId("portal-message-bubble").last()
    await expect(bubble).toBeVisible({ timeout: 10_000 })

    // Reload and confirm message still there
    await page.reload()

    const sectionAfterReload = page.getByTestId("portal-messages")
    await expect(sectionAfterReload).toBeVisible({ timeout: 15_000 })

    const bubbleAfterReload = sectionAfterReload.getByTestId("portal-message-bubble").last()
    await expect(bubbleAfterReload).toBeVisible({ timeout: 10_000 })
    await expect(bubbleAfterReload).toContainText("Persistence test message")

    await shotFocused(page, sectionAfterReload, SHOT_DIR, "06-persisted-message")
    story.addScene({
      title: "06 — Portal: Message Persists After Reload",
      images: [join(SHOT_DIR, "06-persisted-message.png")],
      seeing: "Client message is still visible after a full page reload — data is persisted to the DB.",
      steps: ["Send a message", "Reload the page", "Message still visible in thread"],
    })
  })

  test("Enter adds newline; Ctrl+Enter sends", async ({ page }) => {
    const { token } = await createPortalToken(page, FIXTURE_A)
    await page.goto(`/portal/${token}`)

    const section = page.getByTestId("portal-messages")
    await expect(section).toBeVisible({ timeout: 15_000 })

    const textarea = section.getByTestId("portal-messages-textarea")
    await textarea.focus()
    await textarea.type("Line one")
    await page.keyboard.press("Enter")
    await textarea.type("Line two")

    // Value should have a newline — not sent
    const value = await textarea.inputValue()
    expect(value).toContain("\n")

    // No message should have appeared yet
    const bubble = section.getByTestId("portal-message-bubble")
    expect(await bubble.count()).toBe(0)

    // Ctrl+Enter sends
    await page.keyboard.press("Control+Enter")
    const sentBubble = section.getByTestId("portal-message-bubble").last()
    await expect(sentBubble).toBeVisible({ timeout: 10_000 })

    await shotFocused(page, section, SHOT_DIR, "07-ctrl-enter-sent")
    story.addScene({
      title: "07 — Portal: Ctrl+Enter Sends Message",
      images: [join(SHOT_DIR, "07-ctrl-enter-sent.png")],
      seeing: "Enter key inserts a newline; Ctrl+Enter sends the message without clicking the button.",
      steps: ["Type in textarea", "Press Enter — newline added", "Press Ctrl+Enter — message sent"],
    })
  })

  test("revoked portal does not show portal-messages section", async ({ page }) => {
    await signInAsAdmin(page)
    const { token, portalTokenId } = await createPortalToken(page, FIXTURE_A)
    await page.context().request.patch(`/api/admin/portal-tokens/${portalTokenId}`)

    await page.goto(`/portal/${token}`)

    const revokedNotice = page.getByTestId("portal-revoked")
    await expect(revokedNotice).toBeVisible({ timeout: 15_000 })

    const messagesSection = page.getByTestId("portal-messages")
    await expect(messagesSection).not.toBeVisible()

    await shotFocused(page, page.locator("main"), SHOT_DIR, "08-revoked-no-messages")
    story.addScene({
      title: "08 — Portal: Revoked Token — No Messages Section",
      images: [join(SHOT_DIR, "08-revoked-no-messages.png")],
      seeing: "Revoked portal shows only the access-revoked notice — the Messages section is not rendered.",
      steps: ["Revoke the token", "Navigate to portal URL", "Only revoked notice visible; no messages section"],
    })
  })
})

// ── Admin UI — Messages tab ───────────────────────────────────────────────────

test.describe("Portal Messaging — admin Messages tab", () => {
  test.beforeEach(() => test.setTimeout(120_000))

  test("Messages tab trigger visible in buyer workspace dialog", async ({ page }) => {
    await setupMockedAdmin(page, MOCK_EMPTY_MESSAGES)
    const buyerWorkspace = await navigateToBuyerWorkspace(page)

    const messagesTabTrigger = buyerWorkspace.getByTestId(
      "admin-entity-crud-related-tab--property-entities--messages-tab",
    )
    await expect(messagesTabTrigger).toBeVisible({ timeout: 10_000 })

    await shotFocused(page, buyerWorkspace, SHOT_DIR, "09-admin-messages-tab-trigger")
    story.addScene({
      title: "09 — Admin: Messages Tab Trigger Visible",
      images: [join(SHOT_DIR, "09-admin-messages-tab-trigger.png")],
      seeing: "Messages tab appears in the buyer workspace dialog alongside Portal, Offers, Files, Notes tabs.",
      steps: [
        "Open admin → properties → buyer entity workspace dialog",
        "Messages tab trigger is visible",
      ],
    })
  })

  test("admin Messages tab — empty state when no messages", async ({ page }) => {
    await setupMockedAdmin(page, MOCK_EMPTY_MESSAGES)
    const buyerWorkspace = await navigateToBuyerWorkspace(page)

    await buyerWorkspace
      .getByTestId("admin-entity-crud-related-tab--property-entities--messages-tab")
      .click()

    const panel = buyerWorkspace.getByTestId("portal-message-panel")
    await expect(panel).toBeVisible({ timeout: 10_000 })

    const emptyState = panel.getByTestId("portal-message-panel-empty")
    await expect(emptyState).toBeVisible()
    await expect(emptyState).toContainText("No messages yet")

    await shotFocused(page, panel, SHOT_DIR, "10-admin-messages-empty")
    story.addScene({
      title: "10 — Admin: Messages Tab Empty State",
      images: [join(SHOT_DIR, "10-admin-messages-empty.png")],
      seeing: "Admin Messages tab shows empty state when the client has not sent any messages.",
      steps: ["Click Messages tab", "Empty state: Your client has not sent a message yet"],
    })
  })

  test("admin Messages tab — shows client message left-aligned with unread indicator", async ({ page }) => {
    await setupMockedAdmin(page, { messages: [MOCK_CLIENT_MESSAGE] })
    const buyerWorkspace = await navigateToBuyerWorkspace(page)

    await buyerWorkspace
      .getByTestId("admin-entity-crud-related-tab--property-entities--messages-tab")
      .click()

    const panel = buyerWorkspace.getByTestId("portal-message-panel")
    await expect(panel).toBeVisible({ timeout: 10_000 })

    const bubble = panel.getByTestId("portal-message-bubble").first()
    await expect(bubble).toBeVisible({ timeout: 10_000 })
    await expect(bubble).toContainText("Hi Richard, when is settlement?")

    const unreadIndicator = bubble.getByTestId("portal-message-unread")
    await expect(unreadIndicator).toBeVisible()

    await shotFocused(page, panel, SHOT_DIR, "11-admin-client-message-unread")
    story.addScene({
      title: "11 — Admin: Client Message Left-Aligned with Unread Indicator",
      images: [join(SHOT_DIR, "11-admin-client-message-unread.png")],
      seeing: "Client message appears left-aligned with an unread indicator dot visible on the bubble.",
      steps: ["Open Messages tab with unread client message", "Left-aligned bubble with unread indicator"],
    })
  })

  test("admin sends reply — appears right-aligned immediately", async ({ page }) => {
    await setupMockedAdmin(page, MOCK_EMPTY_MESSAGES)
    const buyerWorkspace = await navigateToBuyerWorkspace(page)

    await buyerWorkspace
      .getByTestId("admin-entity-crud-related-tab--property-entities--messages-tab")
      .click()

    const panel = buyerWorkspace.getByTestId("portal-message-panel")
    await expect(panel).toBeVisible({ timeout: 10_000 })

    const textarea = panel.getByTestId("portal-message-panel-textarea")
    await expect(textarea).toBeVisible()

    await shotFocused(page, panel, SHOT_DIR, "12a-admin-before-send")

    await textarea.fill("Settlement is next Friday.")
    await panel.getByTestId("portal-message-panel-send-btn").click()

    const bubble = panel.getByTestId("portal-message-bubble").last()
    await expect(bubble).toBeVisible({ timeout: 10_000 })
    await expect(bubble).toContainText("Settlement is next Friday.")
    await expect(textarea).toHaveValue("")

    await shotFocused(page, panel, SHOT_DIR, "12b-admin-after-send")
    story.addScene({
      title: "12 — Admin: Admin Sends Reply",
      images: [join(SHOT_DIR, "12a-admin-before-send.png"), join(SHOT_DIR, "12b-admin-after-send.png")],
      seeing: "Left: empty thread with send form. Right: admin reply appears right-aligned after sending.",
      steps: ["Type reply in admin textarea", "Click Send", "Reply appears right-aligned; textarea clears"],
    })
  })

  test("admin Messages tab — char counter updates; send button disabled when empty", async ({ page }) => {
    await setupMockedAdmin(page, MOCK_EMPTY_MESSAGES)
    const buyerWorkspace = await navigateToBuyerWorkspace(page)

    await buyerWorkspace
      .getByTestId("admin-entity-crud-related-tab--property-entities--messages-tab")
      .click()

    const panel = buyerWorkspace.getByTestId("portal-message-panel")
    await expect(panel).toBeVisible({ timeout: 10_000 })

    const sendBtn = panel.getByTestId("portal-message-panel-send-btn")
    await expect(sendBtn).toBeDisabled()

    const counter = panel.getByTestId("portal-message-panel-char-count")
    await expect(counter).toContainText("0 / 2000")

    const textarea = panel.getByTestId("portal-message-panel-textarea")
    await textarea.fill("Hello client")
    await expect(counter).toContainText("12 / 2000")
    await expect(sendBtn).toBeEnabled()

    await shotFocused(page, panel, SHOT_DIR, "13-admin-char-counter")
    story.addScene({
      title: "13 — Admin: Character Counter and Send Button State",
      images: [join(SHOT_DIR, "13-admin-char-counter.png")],
      seeing: "Counter shows 12 / 2000 after typing; Send button enables once text is present.",
      steps: ["Open admin Messages tab", "Observe disabled Send and 0 / 2000", "Type — counter updates, Send enables"],
    })
  })
})
