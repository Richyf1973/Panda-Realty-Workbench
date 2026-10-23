// Run: npm run test:e2e:scratch -- --app=panda-realty --spec=apps/panda-realty/e2e/admin-properties-contact-member-inbox.spec.ts --no-bail --workers=1

import { expect, test } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { createStory, shotFocused } from "@repo/e2e-utils"

import { requirePandaE2eAdminCredentials, requirePandaE2eAdminListLiveEnv, signInAsAdmin } from "./helpers/admin-auth"
import { routePandaPropertiesListDetailAndBuyerOffers, MOCK_PROPERTY_ID } from "./helpers/panda-properties-dialog-mocks"

const SHOT_DIR = join(dirname(fileURLToPath(import.meta.url)), "screenshots", "contact-member-inbox")

const story = createStory({ specUrl: import.meta.url, slug: "contact-member-inbox" })

// Single afterAll at module level so story.write() fires once with all scenes accumulated
test.afterAll(() => {
  story.write()
})

story.setWhatWasBuilt(
  "Member email threads from contacts (representatives) now always appear in the main " +
  "contact row inbox in the Contacts tab. The inbox button is enabled whenever the contact " +
  "has an entityId (even if it has no own email address), and the threads-by-entity API " +
  "returns member threads without date filtering. PropertyContactDialog now passes propertyListId " +
  "to ContactMembersPanel so replies tag threads with the correct property.",
)

// ── Fixture contacts ─────────────────────────────────────────────────────────

// Contact with NO own email — only members have emails (entityId only)
const CONTACT_NO_EMAIL = {
  propertyEntityId: 801,
  entityId: 501,
  entityName: "McAuley Law",
  phoneNumber: "0478848131",
  emailAddress: null,        // no own email — triggers the fix
  address: "2c, 26-28 Redland Bay Road",
  contactCategoryName: "Solicitor",
  association: "Buyer",
}

// Contact with own email AND member emails (normal case)
const CONTACT_WITH_EMAIL = {
  propertyEntityId: 802,
  entityId: 502,
  entityName: "Example Contact",
  phoneNumber: "0411222333",
  emailAddress: "contact@example.com",
  address: null,
  contactCategoryName: null,
  association: null,
}

const CONTACTS_NO_EMAIL_ONLY = {
  items: [CONTACT_NO_EMAIL],
}

const CONTACTS_WITH_EMAIL_ONLY = {
  items: [CONTACT_WITH_EMAIL],
}

// Thread from a member email — not from the entity's own email
const MEMBER_THREAD = {
  threadId: "member-thread-001",
  subject: "RE: Purchase 180/46 AMY STREET — Client JULENE ENID KELLS Disclosure Docs",
  from: "Eugene McAuley <eugene@mcauleylaw.com.au>",
  date: "2026-05-26T06:00:00.000Z",
  snippet: "Please find the disclosure documents for JULENE ENID KELLS",
  attachmentCount: 10,
}

const THREADS_WITH_MEMBER = {
  threads: [MEMBER_THREAD],
  hiddenCount: 0,
}

const EMPTY_THREADS = { threads: [], hiddenCount: 0 }

const EMPTY_PANEL = { items: [] }

const STATUS_MIN = {
  items: [{ propertyStatusId: 1, propertyStatusCode: "ACTIVE", propertyStatus: "Active" }],
  totalCount: 1,
  limit: 100,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false,
  startCursor: null,
  endCursor: null,
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function mockBaselineRoutes(page: import("@playwright/test").Page) {
  await page.route("**/api/admin/property-status**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(STATUS_MIN) })
  })
  await page.route("**/api/admin/property-entities**", async (route) => {
    const url = route.request().url()
    if (url.includes("/property-entities/")) { await route.continue(); return }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items: [], totalCount: 0, limit: 20, totalPages: 0, hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null }),
    })
  })
  await page.route(`**/api/admin/properties/${MOCK_PROPERTY_ID}/buyers**`, async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_PANEL) })
  })
  await page.route(`**/api/admin/properties/${MOCK_PROPERTY_ID}/tenants**`, async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_PANEL) })
  })
  await page.route("**/api/admin/contact-categories**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [] }) })
  })
}

async function openContactsTab(page: import("@playwright/test").Page) {
  await page.goto("/admin/properties")
  await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible()
  await page.getByTestId(`admin-entity-row--properties--${MOCK_PROPERTY_ID}`).click()
  await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible()
  await page.getByTestId("panda-properties-form-tab-trigger--contacts").click()
  await expect(page.getByTestId("panda-properties-form-tab--contacts")).toBeVisible()
}

// ── Tests ────────────────────────────────────────────────────────────────────

test.describe("Panda Realty — contact member inbox (mocked)", () => {
  test.beforeEach(async ({ page }) => {
    await mkdir(SHOT_DIR, { recursive: true })
    requirePandaE2eAdminCredentials()
    await signInAsAdmin(page)
    await routePandaPropertiesListDetailAndBuyerOffers(page)
    await mockBaselineRoutes(page)
  })

  // MV happy path 2 — contact with no own email but entityId → inbox button enabled
  test("inbox button is enabled for contact with entityId but no own emailAddress", async ({ page }) => {
    await page.route(`**/api/admin/properties/${MOCK_PROPERTY_ID}/contacts**`, async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(CONTACTS_NO_EMAIL_ONLY) })
    })
    await page.route("**/api/admin/gmail/threads-by-entity**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_THREADS) })
    })

    await openContactsTab(page)

    const row = page.getByTestId(`property-contact-row--${CONTACT_NO_EMAIL.propertyEntityId}`)
    await expect(row).toBeVisible({ timeout: 15_000 })

    // Take screenshot of the contact row showing inbox button state
    await shotFocused(page, row, SHOT_DIR, "01a-inbox-button-state")
    story.addScene({
      title: "01a — Contact with no email: inbox button state",
      images: [join(SHOT_DIR, "01a-inbox-button-state.png")],
      seeing: "Contact row for McAuley Law (no own email). After fix, the inbox button must be enabled because entityId is present.",
      steps: [
        "Open property dialog → Contacts tab",
        "Observe McAuley Law contact row",
        "Verify inbox button is enabled (not disabled)",
      ],
    })

    const inboxBtn = page.getByTestId(`property-contact-inbox--${CONTACT_NO_EMAIL.propertyEntityId}`)
    await expect(inboxBtn).toBeVisible()
    // This assertion FAILS currently — the inbox button is disabled when emailAddress is null
    await expect(inboxBtn).toBeEnabled()
  })

  // MV happy path 2 (part 2) — clicking the enabled inbox opens entity-threads-panel
  test("clicking inbox for entityId-only contact shows entity-threads-panel", async ({ page }) => {
    await page.route(`**/api/admin/properties/${MOCK_PROPERTY_ID}/contacts**`, async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(CONTACTS_NO_EMAIL_ONLY) })
    })
    await page.route("**/api/admin/gmail/threads-by-entity**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_THREADS) })
    })

    await openContactsTab(page)

    const row = page.getByTestId(`property-contact-row--${CONTACT_NO_EMAIL.propertyEntityId}`)
    await expect(row).toBeVisible({ timeout: 15_000 })

    const inboxBtn = page.getByTestId(`property-contact-inbox--${CONTACT_NO_EMAIL.propertyEntityId}`)
    await expect(inboxBtn).toBeEnabled()
    await inboxBtn.click()

    // After fix the entity-threads-panel should appear
    const panel = row.getByTestId("entity-threads-panel")

    await shotFocused(page, row, SHOT_DIR, "01b-panel-opened")
    story.addScene({
      title: "01b — Contact with no email: inbox panel opened",
      images: [join(SHOT_DIR, "01b-panel-opened.png")],
      seeing: "After clicking the inbox button on a contact with no own email, the EntityThreadsPanel expands below the row.",
      steps: [
        "Click the inbox button on the no-email contact",
        "EntityThreadsPanel expands",
      ],
    })

    // This FAILS currently because the inbox button is disabled (can't click), so panel never opens
    await expect(panel).toBeVisible({ timeout: 10_000 })
  })

  // MV happy path 1 — member thread from threads-by-entity appears in main contact inbox
  test("member email thread appears in main contact inbox from threads-by-entity response", async ({ page }) => {
    await page.route(`**/api/admin/properties/${MOCK_PROPERTY_ID}/contacts**`, async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(CONTACTS_WITH_EMAIL_ONLY) })
    })
    await page.route("**/api/admin/gmail/threads-by-entity**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(THREADS_WITH_MEMBER) })
    })

    await openContactsTab(page)

    const row = page.getByTestId(`property-contact-row--${CONTACT_WITH_EMAIL.propertyEntityId}`)
    await expect(row).toBeVisible({ timeout: 15_000 })

    const inboxBtn = page.getByTestId(`property-contact-inbox--${CONTACT_WITH_EMAIL.propertyEntityId}`)
    await expect(inboxBtn).toBeEnabled()
    await inboxBtn.click()

    await expect(row.getByTestId("entity-threads-panel")).toBeVisible({ timeout: 10_000 })

    // The member thread subject must appear in the panel
    await expect(row).toContainText("RE: Purchase 180/46 AMY STREET", { timeout: 10_000 })

    await shotFocused(page, row, SHOT_DIR, "02-member-thread-visible")
    story.addScene({
      title: "02 — Member thread visible in main contact inbox",
      images: [join(SHOT_DIR, "02-member-thread-visible.png")],
      seeing: "Contact row with member thread from eugene@mcauleylaw.com.au visible in the main inbox after threads-by-entity returns it.",
      steps: [
        "Open contact inbox",
        "threads-by-entity returns member email thread",
        "Thread subject appears in the panel",
      ],
    })
  })

  // MV edge case — contact WITH own email still has enabled inbox (no regression)
  test("inbox button remains enabled for contact with own email (no regression)", async ({ page }) => {
    await page.route(`**/api/admin/properties/${MOCK_PROPERTY_ID}/contacts**`, async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(CONTACTS_WITH_EMAIL_ONLY) })
    })

    await openContactsTab(page)

    const inboxBtn = page.getByTestId(`property-contact-inbox--${CONTACT_WITH_EMAIL.propertyEntityId}`)
    await expect(inboxBtn).toBeVisible({ timeout: 15_000 })

    await shotFocused(page, page.getByTestId(`property-contact-row--${CONTACT_WITH_EMAIL.propertyEntityId}`), SHOT_DIR, "03-email-contact-inbox-enabled")
    story.addScene({
      title: "03 — Contact with own email: inbox button still enabled",
      images: [join(SHOT_DIR, "03-email-contact-inbox-enabled.png")],
      seeing: "Contact row with own email address. Inbox button is enabled.",
      steps: ["Open Contacts tab", "Verify inbox button is enabled for contact with emailAddress"],
    })

    await expect(inboxBtn).toBeEnabled()
  })
})

// ── Live tests — require DATABASE_URL + Gmail credentials ────────────────────

test.describe("Panda Realty — contact member inbox (live)", () => {
  // Property 186834 = 180/46 Amy Street Morayfield; propertyEntityId 185876 = McAuley Law
  const LIVE_PROPERTY_ID = 186834
  const LIVE_PROPERTY_ENTITY_ID = 185876

  test.beforeEach(async ({ page }) => {
    await mkdir(SHOT_DIR, { recursive: true })
    requirePandaE2eAdminListLiveEnv()
    await signInAsAdmin(page)
  })

  test("McAuley Law member threads appear in main contact inbox", async ({ page }) => {
    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible({ timeout: 20_000 })
    await page.getByTestId(`admin-entity-row--properties--${LIVE_PROPERTY_ID}`).click()
    await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible()
    await page.getByTestId("panda-properties-form-tab-trigger--contacts").click()
    await expect(page.getByTestId("panda-properties-form-tab--contacts")).toBeVisible()

    const row = page.getByTestId(`property-contact-row--${LIVE_PROPERTY_ENTITY_ID}`)
    await expect(row).toBeVisible({ timeout: 15_000 })

    const inboxBtn = page.getByTestId(`property-contact-inbox--${LIVE_PROPERTY_ENTITY_ID}`)
    await expect(inboxBtn).toBeEnabled({ timeout: 15_000 })
    await inboxBtn.click()

    await expect(row.getByTestId("entity-threads-panel")).toBeVisible({ timeout: 15_000 })

    // Member threads from eugene@mcauleylaw.com.au must appear without needing a prior reply
    await expect(row).toContainText("eugene@mcauleylaw.com.au", { timeout: 25_000 })

    await shotFocused(page, row, SHOT_DIR, "04-live-mcauley-law-member-threads")
    story.addScene({
      title: "04 — Live: McAuley Law member threads in main inbox",
      images: [join(SHOT_DIR, "04-live-mcauley-law-member-threads.png")],
      seeing:
        "Live property 180/46 Amy Street Morayfield — McAuley Law contact inbox showing member " +
        "threads from eugene@mcauleylaw.com.au in the main contact row (not just inside Edit Contact).",
      steps: [
        "Open property 180/46 Amy Street Morayfield → Contacts tab",
        "Click the inbox button on the McAuley Law contact row",
        "Threads from eugene@mcauleylaw.com.au appear in the panel",
      ],
    })
  })
})
