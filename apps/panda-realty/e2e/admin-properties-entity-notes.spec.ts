import { expect, test } from "@playwright/test"

import { e2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import {
  registerPropertyRoutes,
  PROPERTY_ONE_OWNER,
} from "./helpers/panda-properties-owners-helpers"

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const PROPERTY_ID = 1001

type Note = {
  propertyEntityNoteId: number
  note: string
  createdBy: string | null
  createdAt: string | null
  agentName: string | null
}

type ContactFixture = {
  propertyEntityId: number
  entityId: number
  entityName: string
  phoneNumber: string
  emailAddress: string
  address: string
  contactCategoryName: string | null
  association: string
}

const PROPERTY_ONE_OWNER_FAVORITE = { ...PROPERTY_ONE_OWNER, isFavorite: true }

const CONTACT_ROW: ContactFixture = {
  propertyEntityId: 701,
  entityId: 301,
  entityName: "GKS Law",
  phoneNumber: "1800457529",
  emailAddress: "mail@gkslaw.com.au",
  address: "19 Creek Street",
  contactCategoryName: "Solicitor",
  association: "Buyer",
}

const CONTACT_ROW_B: ContactFixture = {
  propertyEntityId: 702,
  entityId: 302,
  entityName: "Vantage Caboolture",
  phoneNumber: "0458550540",
  emailAddress: "caboolture@vantage.com.au",
  address: "176 Torrens Road",
  contactCategoryName: null,
  association: "Seller",
}

const BUYER_ROW = {
  propertyEntityId: 501,
  entityId: 201,
  entityName: "Test Buyer LLC",
  phoneNumber: "0400111222",
  emailAddress: "buyer@test.com",
  address: "1 Buyer Rd",
  buyerStatusName: null,
  isFavorite: false,
}

const AGENT_LIST = [{ agentId: 1, agentName: "Agent Smith", email: "agent@example.com" }]

const NOTE_A = {
  propertyEntityNoteId: 901,
  note: "Follow up call scheduled for Monday",
  createdBy: "agent@example.com",
  createdAt: "2026-05-01T10:00:00Z",
  agentName: "Agent Smith",
}

const NOTE_B = {
  propertyEntityNoteId: 902,
  note: "Confirmed settlement date 15 June",
  createdBy: "agent@example.com",
  createdAt: "2026-04-28T09:00:00Z",
  agentName: null,
}

const STATUS_LIST_RESPONSE = {
  items: [{ propertyStatusId: 1, propertyStatusCode: "ACTIVE", propertyStatus: "Active" }],
  totalCount: 1,
  limit: 100,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false,
  startCursor: null,
  endCursor: null,
}

const EMPTY_PROPERTY_ENTITIES_RESPONSE = {
  items: [],
  totalCount: 0,
  limit: 20,
  totalPages: 0,
  hasNextPage: false,
  hasPreviousPage: false,
  startCursor: null,
  endCursor: null,
}

// ---------------------------------------------------------------------------
// Setup helper — registers ALL routes before navigation (LIFO: last = first matched)
// Panel-specific routes are registered AFTER the general catch-all so they win.
// ---------------------------------------------------------------------------

async function setupAndOpenDialog(
  page: import("@playwright/test").Page,
  opts: {
    property?: typeof PROPERTY_ONE_OWNER_FAVORITE
    contacts?: ContactFixture[]
    buyers?: typeof BUYER_ROW[]
    notesByEntityId?: Record<number, Note[]>
    postNote?: Note
    includeAgents?: boolean
  } = {},
) {
  const property = opts.property ?? PROPERTY_ONE_OWNER_FAVORITE
  const contacts = opts.contacts ?? [CONTACT_ROW]
  const buyers = opts.buyers ?? [BUYER_ROW]
  const notesByEntityId = opts.notesByEntityId ?? {}

  // 1. General property catch-all — registered first (lower LIFO priority)
  await registerPropertyRoutes(page, property)

  // 2. Panel-specific routes — registered AFTER (higher LIFO priority, matched first)
  await page.route(`**/api/admin/properties/${PROPERTY_ID}/contacts**`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items: contacts }),
    })
  })
  await page.route(`**/api/admin/properties/${PROPERTY_ID}/buyers**`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items: buyers }),
    })
  })

  // 3. Entity notes GET
  await page.route("**/api/admin/property-entity-notes**", async (route) => {
    if (route.request().method() !== "GET") {
      await route.continue()
      return
    }
    const url = new URL(route.request().url())
    const entityId = parseInt(url.searchParams.get("propertyEntityId") ?? "0", 10)
    const notes = notesByEntityId[entityId] ?? []
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(notes),
    })
  })

  // 4. Entity notes POST (if needed)
  if (opts.postNote) {
    const returnedNote = opts.postNote
    await page.route("**/api/admin/property-entity-notes**", async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue()
        return
      }
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      })
      // After POST, re-stub GET to return the new note
      await page.route("**/api/admin/property-entity-notes**", async (r) => {
        if (r.request().method() !== "GET") {
          await r.continue()
          return
        }
        await r.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([returnedNote]),
        })
      })
    })
  }

  // 5. Agents (if needed)
  if (opts.includeAgents) {
    await page.route("**/api/admin/agents**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(AGENT_LIST),
      })
    })
  }

  // 6. Navigate AFTER all routes are registered
  await page.goto("/admin/properties")
  await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible()
  await page.getByTestId("admin-entity-row--properties--1001").click()
  await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible()
  await expect(page.getByTestId("panda-properties-dialog-form")).toBeVisible()
}

// ---------------------------------------------------------------------------
// Navigation helpers
// ---------------------------------------------------------------------------

async function openContactsTab(page: import("@playwright/test").Page) {
  await page.getByTestId("panda-properties-form-tab-trigger--contacts").click()
  await expect(page.getByTestId("panda-properties-form-tab--contacts")).toBeVisible()
  await expect(page.getByTestId("property-contacts-add-new")).toBeEnabled({ timeout: 10_000 })
}

async function openBuyersTab(page: import("@playwright/test").Page) {
  await page.getByTestId("panda-properties-form-tab-trigger--buyers").click()
  await expect(page.getByTestId("panda-properties-form-tab--buyers")).toBeVisible()
  await expect(page.getByTestId("property-buyers-panel-add-new")).toBeEnabled({ timeout: 10_000 })
}

// ---------------------------------------------------------------------------
// Tests — Contacts tab
// ---------------------------------------------------------------------------

test.describe("Panda Realty — entity notes dialog (contacts tab)", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")

    await page.route("**/api/admin/property-status**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(STATUS_LIST_RESPONSE) })
    })
    await page.route("**/api/admin/property-entities**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_PROPERTY_ENTITIES_RESPONSE) })
    })
    await page.route("**/api/admin/calendar/status**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ connected: false }) })
    })

    await signInAsAdmin(page)
  })

  test("NotebookText notes button is visible on a contact row", async ({ page }) => {
    await setupAndOpenDialog(page)
    await openContactsTab(page)

    await expect(
      page.getByTestId(`property-contact-add-note--${CONTACT_ROW.propertyEntityId}`),
    ).toBeVisible()
  })

  test("Notes button tooltip reads 'Notes' (not 'Add note')", async ({ page }) => {
    await setupAndOpenDialog(page)
    await openContactsTab(page)

    const btn = page.getByTestId(`property-contact-add-note--${CONTACT_ROW.propertyEntityId}`)
    await btn.hover()
    await expect(page.getByRole("tooltip", { name: "Notes" })).toBeVisible({ timeout: 5_000 })
  })

  test("Clicking notes button opens the entity notes dialog", async ({ page }) => {
    await setupAndOpenDialog(page)
    await openContactsTab(page)

    await page.getByTestId(`property-contact-add-note--${CONTACT_ROW.propertyEntityId}`).click()
    await expect(page.getByTestId("property-entity-notes-dialog")).toBeVisible()
  })

  test("Dialog title contains the contact name", async ({ page }) => {
    await setupAndOpenDialog(page)
    await openContactsTab(page)

    await page.getByTestId(`property-contact-add-note--${CONTACT_ROW.propertyEntityId}`).click()
    await expect(page.getByTestId("property-entity-notes-dialog-title")).toContainText(
      CONTACT_ROW.entityName,
    )
  })

  test("Empty state is shown when no notes exist for this contact", async ({ page }) => {
    await setupAndOpenDialog(page)
    await openContactsTab(page)

    await page.getByTestId(`property-contact-add-note--${CONTACT_ROW.propertyEntityId}`).click()
    await expect(page.getByTestId("property-entity-notes-empty")).toBeVisible()
    await expect(page.getByTestId("property-entity-notes-empty")).toContainText("No notes")
  })

  test("Dialog shows textarea and Add Note submit button", async ({ page }) => {
    await setupAndOpenDialog(page)
    await openContactsTab(page)

    await page.getByTestId(`property-contact-add-note--${CONTACT_ROW.propertyEntityId}`).click()
    await expect(page.getByTestId("property-entity-notes-textarea")).toBeVisible()
    await expect(page.getByTestId("property-entity-notes-submit")).toBeVisible()
  })

  test("Add Note button is disabled when textarea is empty", async ({ page }) => {
    await setupAndOpenDialog(page)
    await openContactsTab(page)

    await page.getByTestId(`property-contact-add-note--${CONTACT_ROW.propertyEntityId}`).click()
    await expect(page.getByTestId("property-entity-notes-submit")).toBeDisabled()
  })

  test("Typing a note enables the Add Note button", async ({ page }) => {
    await setupAndOpenDialog(page)
    await openContactsTab(page)

    await page.getByTestId(`property-contact-add-note--${CONTACT_ROW.propertyEntityId}`).click()
    await page.getByTestId("property-entity-notes-textarea").fill("Follow up call scheduled")
    await expect(page.getByTestId("property-entity-notes-submit")).toBeEnabled()
  })

  test("Existing notes for a contact are listed in the dialog", async ({ page }) => {
    await setupAndOpenDialog(page, {
      notesByEntityId: { [CONTACT_ROW.propertyEntityId]: [NOTE_A] },
    })
    await openContactsTab(page)

    await page.getByTestId(`property-contact-add-note--${CONTACT_ROW.propertyEntityId}`).click()
    await expect(page.getByTestId("property-entity-notes-empty")).toHaveCount(0)
    await expect(page.getByTestId("property-entity-notes-list")).toContainText(NOTE_A.note)
  })

  test("Notes are isolated — contact A notes do not appear in contact B dialog", async ({ page }) => {
    await setupAndOpenDialog(page, {
      contacts: [CONTACT_ROW, CONTACT_ROW_B],
      notesByEntityId: {
        [CONTACT_ROW.propertyEntityId]: [NOTE_A],
        [CONTACT_ROW_B.propertyEntityId]: [NOTE_B],
      },
    })
    await openContactsTab(page)

    await page.getByTestId(`property-contact-add-note--${CONTACT_ROW_B.propertyEntityId}`).click()
    await expect(page.getByTestId("property-entity-notes-list")).toContainText(NOTE_B.note)
    await expect(page.getByTestId("property-entity-notes-list")).not.toContainText(NOTE_A.note)
  })

  test("After successful add, note appears in list and textarea clears", async ({ page }) => {
    await setupAndOpenDialog(page, { postNote: NOTE_A })
    await openContactsTab(page)

    await page.getByTestId(`property-contact-add-note--${CONTACT_ROW.propertyEntityId}`).click()
    await page.getByTestId("property-entity-notes-textarea").fill(NOTE_A.note)
    await page.getByTestId("property-entity-notes-submit").click()

    await expect(page.getByTestId("property-entity-notes-list")).toContainText(NOTE_A.note, {
      timeout: 10_000,
    })
    await expect(page.getByTestId("property-entity-notes-textarea")).toHaveValue("")
  })

  test("Assignee combobox is visible and defaults to None", async ({ page }) => {
    await setupAndOpenDialog(page, { includeAgents: true })
    await openContactsTab(page)

    await page.getByTestId(`property-contact-add-note--${CONTACT_ROW.propertyEntityId}`).click()
    await expect(page.getByTestId("property-entity-notes-assignee-trigger")).toBeVisible()
    await expect(page.getByTestId("property-entity-notes-assignee-trigger")).toContainText("None")
  })
})

// ---------------------------------------------------------------------------
// Tests — Buyers tab
// ---------------------------------------------------------------------------

test.describe("Panda Realty — entity notes dialog (buyers tab)", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")

    await page.route("**/api/admin/property-status**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(STATUS_LIST_RESPONSE) })
    })
    await page.route("**/api/admin/property-entities**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_PROPERTY_ENTITIES_RESPONSE) })
    })
    await page.route("**/api/admin/calendar/status**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ connected: false }) })
    })

    await signInAsAdmin(page)
  })

  test("NotebookText notes button is visible on a buyer row", async ({ page }) => {
    await setupAndOpenDialog(page)
    await openBuyersTab(page)

    await expect(
      page.getByTestId(`property-buyer-panel-add-note--${BUYER_ROW.propertyEntityId}`),
    ).toBeVisible()
  })

  test("Buyer notes dialog opens with correct title", async ({ page }) => {
    await setupAndOpenDialog(page)
    await openBuyersTab(page)

    await page.getByTestId(`property-buyer-panel-add-note--${BUYER_ROW.propertyEntityId}`).click()
    await expect(page.getByTestId("property-entity-notes-dialog")).toBeVisible()
    await expect(page.getByTestId("property-entity-notes-dialog-title")).toContainText(
      BUYER_ROW.entityName,
    )
  })

  test("Buyer notes are isolated from contact notes (different entity)", async ({ page }) => {
    await setupAndOpenDialog(page, {
      notesByEntityId: {
        [BUYER_ROW.propertyEntityId]: [NOTE_B],
        [CONTACT_ROW.propertyEntityId]: [NOTE_A],
      },
    })
    await openBuyersTab(page)

    await page.getByTestId(`property-buyer-panel-add-note--${BUYER_ROW.propertyEntityId}`).click()
    await expect(page.getByTestId("property-entity-notes-list")).toContainText(NOTE_B.note)
    await expect(page.getByTestId("property-entity-notes-list")).not.toContainText(NOTE_A.note)
  })

  test("Buyer empty state shown when no notes exist", async ({ page }) => {
    await setupAndOpenDialog(page)
    await openBuyersTab(page)

    await page.getByTestId(`property-buyer-panel-add-note--${BUYER_ROW.propertyEntityId}`).click()
    await expect(page.getByTestId("property-entity-notes-empty")).toBeVisible()
  })

  test("After successful add on buyer, note appears in list and textarea clears", async ({ page }) => {
    await setupAndOpenDialog(page, { postNote: NOTE_B })
    await openBuyersTab(page)

    await page.getByTestId(`property-buyer-panel-add-note--${BUYER_ROW.propertyEntityId}`).click()
    await page.getByTestId("property-entity-notes-textarea").fill(NOTE_B.note)
    await page.getByTestId("property-entity-notes-submit").click()

    await expect(page.getByTestId("property-entity-notes-list")).toContainText(NOTE_B.note, {
      timeout: 10_000,
    })
    await expect(page.getByTestId("property-entity-notes-textarea")).toHaveValue("")
  })
})
