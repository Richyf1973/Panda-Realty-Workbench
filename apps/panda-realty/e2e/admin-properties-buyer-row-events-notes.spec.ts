/**
 * E2E: Buyer row — Add Event and Add Note buttons (property edit dialog, Buyers tab)
 *
 * Success factors:
 * 1. "Add event" button is visible on each buyer row in the Buyers tab
 * 2. "Add note" button is visible on each buyer row in the Buyers tab
 * 3. "Add event" button is disabled with a tooltip when Google Calendar is not connected
 * 4. "Add event" button is enabled when Google Calendar is connected
 * 5. Clicking "Add event" opens the calendar event dialog with the title pre-filled as "<BuyerName> – <PropertyAddress>"
 * 6. The pre-filled title is editable and the custom title is used when submitted
 * 7. Clicking "Add note" opens the Add Note dialog with a textarea and agent picker
 * 8. Submitting an empty note is blocked (submit button disabled)
 * 9. Submitting a note with an agent shows a success state and closes the dialog
 * 10. Submitting a note without an agent (None) still succeeds
 */

import { expect, test } from "@playwright/test"

import { e2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import {
  emptyList,
  SINGLE_PROPERTY_ROW,
  setupBaseRoutes,
  openPropertyAndBuyersTab,
} from "./helpers/admin-properties-add-entity-helpers"

const PROPERTY_ENTITY_ID = 5001
const ENTITY_ID = 901
const BUYER_NAME = "TREVOR & NARELLE CLARK"
// propertyAddress is derived in the form as [streetAddress, suburb].join(", ")
// SINGLE_PROPERTY_ROW has streetAddress: "12 Test Street", suburb: "Testville"
const PROPERTY_ADDRESS = "12 Test Street, Testville"

const MOCK_BUYER = {
  propertyEntityId: PROPERTY_ENTITY_ID,
  entityId: ENTITY_ID,
  entityName: BUYER_NAME,
  entityCategoryId: 1,
  address: null,
  emailAddress: null,
  phoneNumber: null,
  esuburb: null,
  estate: null,
  epostcode: null,
  notes: null,
  buyerPipelineStatusId: null,
  pipelineStatusLabel: "Offer Made",
}

const MOCK_AGENT = { agentId: 42, agentName: "Jane Agent", email: "jane@example.com" }

async function setupBuyerRow(page: import("@playwright/test").Page, calendarConnected = true) {
  await setupBaseRoutes(page, { entityId: ENTITY_ID, entityName: BUYER_NAME })

  // Override buyers endpoint to return one buyer
  await page.route("**/api/admin/properties/1001/buyers**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items: [MOCK_BUYER] }),
    })
  })

  // Mock calendar status endpoint
  await page.route("**/api/admin/calendar/status**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ connected: calendarConnected }),
    })
  })

  // Mock agents endpoint
  await page.route("**/api/admin/agents**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([MOCK_AGENT]),
    })
  })
}

test.describe("Buyer row — Add Event and Add Note buttons", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")
    await signInAsAdmin(page)
  })

  // ── Presence of buttons (success factors 1 & 2) ───────────────────────────

  test("Add event and Add note buttons are visible on buyer row (success factors 1 & 2)", async ({ page }) => {
    await setupBuyerRow(page)
    await openPropertyAndBuyersTab(page)

    const addEventBtn = page.getByTestId(`property-buyer-panel-add-event--${PROPERTY_ENTITY_ID}`)
    const addNoteBtn = page.getByTestId(`property-buyer-panel-add-note--${PROPERTY_ENTITY_ID}`)

    await expect(addEventBtn).toBeVisible()
    await expect(addNoteBtn).toBeVisible()
  })

  // ── Calendar gate (success factors 3 & 4) ────────────────────────────────

  test("Add event button is disabled when calendar is not connected (success factor 3)", async ({ page }) => {
    await setupBuyerRow(page, false /* calendarConnected = false */)
    await openPropertyAndBuyersTab(page)

    const addEventBtn = page.getByTestId(`property-buyer-panel-add-event--${PROPERTY_ENTITY_ID}`)
    await expect(addEventBtn).toBeDisabled()
  })

  test("Add event button tooltip explains disconnection when calendar is not connected (success factor 3)", async ({ page }) => {
    await setupBuyerRow(page, false)
    await openPropertyAndBuyersTab(page)

    // Focus the span wrapper (tabIndex=0) then wait for Radix tooltip delay (300ms)
    const trigger = page.getByTestId(`property-buyer-panel-add-event-trigger--${PROPERTY_ENTITY_ID}`)
    await trigger.focus()
    await expect(page.getByRole("tooltip")).toBeVisible()
    // Tooltip content should mention calendar not connected
    await expect(page.getByRole("tooltip")).toContainText(/calendar.*not connected|not connected/i)
  })

  test("Add event button is enabled when calendar is connected (success factor 4)", async ({ page }) => {
    await setupBuyerRow(page, true)
    await openPropertyAndBuyersTab(page)

    const addEventBtn = page.getByTestId(`property-buyer-panel-add-event--${PROPERTY_ENTITY_ID}`)
    await expect(addEventBtn).toBeEnabled()
  })

  // ── Add Event dialog (success factors 5 & 6) ─────────────────────────────

  test("Add event dialog opens with title pre-filled as BuyerName – PropertyAddress (success factor 5)", async ({ page }) => {
    await setupBuyerRow(page, true)
    await openPropertyAndBuyersTab(page)

    await page.getByTestId(`property-buyer-panel-add-event--${PROPERTY_ENTITY_ID}`).click()

    const dialog = page.getByTestId("add-calendar-event-dialog")
    await expect(dialog).toBeVisible()

    const titleInput = page.getByTestId("add-calendar-event-title")
    await expect(titleInput).toHaveValue(`${BUYER_NAME} – ${PROPERTY_ADDRESS}`)
  })

  test("Pre-filled title can be edited before submission (success factor 6)", async ({ page }) => {
    await setupBuyerRow(page, true)
    await openPropertyAndBuyersTab(page)

    await page.getByTestId(`property-buyer-panel-add-event--${PROPERTY_ENTITY_ID}`).click()

    const dialog = page.getByTestId("add-calendar-event-dialog")
    await expect(dialog).toBeVisible()

    const titleInput = page.getByTestId("add-calendar-event-title")
    // Has a pre-filled value (not empty)
    await expect(titleInput).not.toHaveValue("")

    // User can clear and type a completely custom title
    await titleInput.clear()
    await titleInput.fill("My Custom Event Title")
    await expect(titleInput).toHaveValue("My Custom Event Title")
  })

  // ── Add Note dialog (success factors 7, 8, 9, 10) ────────────────────────

  test("Add note dialog opens with textarea and agent picker (success factor 7)", async ({ page }) => {
    await setupBuyerRow(page, true)
    await openPropertyAndBuyersTab(page)

    await page.getByTestId(`property-buyer-panel-add-note--${PROPERTY_ENTITY_ID}`).click()

    const dialog = page.getByTestId("buyer-row-add-note-dialog")
    await expect(dialog).toBeVisible()
    await expect(page.getByTestId("buyer-row-add-note-textarea")).toBeVisible()
    await expect(page.getByTestId("buyer-row-add-note-assignee-trigger")).toBeVisible()
  })

  test("Submit button is disabled when note textarea is empty (success factor 8)", async ({ page }) => {
    await setupBuyerRow(page, true)
    await openPropertyAndBuyersTab(page)

    await page.getByTestId(`property-buyer-panel-add-note--${PROPERTY_ENTITY_ID}`).click()
    await expect(page.getByTestId("buyer-row-add-note-dialog")).toBeVisible()

    const submitBtn = page.getByTestId("buyer-row-add-note-submit")
    await expect(submitBtn).toBeDisabled()
  })

  test("Note submitted with agent shows success state (success factor 9)", async ({ page }) => {
    await setupBuyerRow(page, true)

    let capturedNoteBody: Record<string, unknown> | undefined
    await page.route("**/api/admin/property-entity-notes**", async (route) => {
      if (route.request().method() === "POST") {
        capturedNoteBody = route.request().postDataJSON() as Record<string, unknown>
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({ success: true }),
        })
        return
      }
      await route.continue()
    })

    await openPropertyAndBuyersTab(page)
    await page.getByTestId(`property-buyer-panel-add-note--${PROPERTY_ENTITY_ID}`).click()

    const dialog = page.getByTestId("buyer-row-add-note-dialog")
    await expect(dialog).toBeVisible()

    await page.getByTestId("buyer-row-add-note-textarea").fill("Buyer confirmed interest")
    await page.getByTestId("buyer-row-add-note-assignee-trigger").click()
    const agentOption = page.getByTestId(`buyer-row-add-note-assignee-option--${MOCK_AGENT.agentId}`)
    await expect(agentOption).toBeVisible()
    await agentOption.click()

    await page.getByTestId("buyer-row-add-note-submit").click()
    await expect(dialog).not.toBeVisible({ timeout: 10_000 })
  })

  test("Note submitted without agent (None) still succeeds (success factor 10)", async ({ page }) => {
    await setupBuyerRow(page, true)

    await page.route("**/api/admin/property-entity-notes**", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({ success: true }),
        })
        return
      }
      await route.continue()
    })

    await openPropertyAndBuyersTab(page)
    await page.getByTestId(`property-buyer-panel-add-note--${PROPERTY_ENTITY_ID}`).click()

    const dialog = page.getByTestId("buyer-row-add-note-dialog")
    await expect(dialog).toBeVisible()

    await page.getByTestId("buyer-row-add-note-textarea").fill("No agent note")
    await page.getByTestId("buyer-row-add-note-submit").click()
    await expect(dialog).not.toBeVisible({ timeout: 10_000 })
  })
})
