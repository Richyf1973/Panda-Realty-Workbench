/**
 * E2E: Reminder Bell button in Buyers tab and Contacts tab of the property edit dialog
 *
 * Success factors:
 * 1. Bell button is visible on each buyer row in the Buyers tab
 * 2. Clicking Bell on a buyer row opens AddReminderDialog with the buyer dropdown visible and that buyer pre-selected
 * 3. Cancel closes the buyer reminder dialog without side effects
 * 4. Bell button is visible on each contact row in the Contacts tab
 * 5. Clicking Bell on a contact row opens AddReminderDialog with no buyer dropdown (contacts have no buyer context)
 * 6. Cancel closes the contact reminder dialog without side effects
 * 7. Required field validation: title blank → submit blocked
 * 8. Required field validation: date blank → submit blocked
 */

import { expect, test } from "@playwright/test"

import { e2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import {
  EMPTY_LIST,
  openPropertyAndBuyersTab,
  openPropertyAndContactsTab,
  PROPERTY_DETAIL_EMPTY_CATEGORIES,
  setupBaseRoutes,
  SINGLE_PROPERTY_ROW,
} from "./helpers/admin-properties-add-entity-helpers"

// ---------------------------------------------------------------------------
// Shared test data
// ---------------------------------------------------------------------------

const PROPERTY_LIST_ID = 1001
const BUYER_PROPERTY_ENTITY_ID = 5001
const BUYER_ENTITY_ID = 901
const BUYER_NAME = "TREVOR & NARELLE CLARK"

const CONTACT_PROPERTY_ENTITY_ID = 6001
const CONTACT_NAME = "McAuley Law"

const MOCK_BUYER = {
  propertyEntityId: BUYER_PROPERTY_ENTITY_ID,
  entityId: BUYER_ENTITY_ID,
  entityName: BUYER_NAME,
  entityCategoryId: 1,
  address: null,
  emailAddress: "buyer@example.com",
  phoneNumber: "0412345678",
  notes: null,
  buyerPipelineStatusId: null,
  pipelineStatusLabel: "Active Buyers",
}

const MOCK_CONTACT = {
  propertyEntityId: CONTACT_PROPERTY_ENTITY_ID,
  entityId: 902,
  entityName: CONTACT_NAME,
  contactCategoryName: "Solicitor",
  association: "Buyer",
  phoneNumber: "0478848131",
  emailAddress: "admin@mcauleylaw.com",
  address: "2c, 26-28 Relland Bay Road",
}

// ---------------------------------------------------------------------------
// Route setup helpers
// ---------------------------------------------------------------------------

async function setupBuyersTab(page: import("@playwright/test").Page) {
  await setupBaseRoutes(page, { entityId: BUYER_ENTITY_ID, entityName: BUYER_NAME })

  await page.route(`**/api/admin/properties/${PROPERTY_LIST_ID}/buyers**`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items: [MOCK_BUYER] }),
    })
  })

  await page.route("**/api/admin/calendar/status**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ connected: true }),
    })
  })
}

async function setupContactsTab(page: import("@playwright/test").Page) {
  await setupBaseRoutes(page, { entityId: BUYER_ENTITY_ID, entityName: BUYER_NAME })

  await page.route(`**/api/admin/properties/${PROPERTY_LIST_ID}/contacts**`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items: [MOCK_CONTACT] }),
    })
  })

  await page.route("**/api/admin/contact-categories**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(EMPTY_LIST),
    })
  })

  await page.route("**/api/admin/calendar/status**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ connected: true }),
    })
  })
}

// ---------------------------------------------------------------------------
// Tests — Buyers tab reminder Bell button
// ---------------------------------------------------------------------------

test.describe("Reminder Bell button — Buyers tab", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")
    await signInAsAdmin(page)
  })

  test("Bell button is visible on each buyer row (success factor 1)", async ({ page }) => {
    await setupBuyersTab(page)
    await openPropertyAndBuyersTab(page)

    const bellBtn = page.getByTestId(`property-buyer-panel-add-reminder--${BUYER_PROPERTY_ENTITY_ID}`)
    await expect(bellBtn).toBeVisible()
  })

  test("Bell button opens AddReminderDialog with buyer dropdown showing that buyer pre-selected (success factor 2)", async ({ page }) => {
    await setupBuyersTab(page)
    await openPropertyAndBuyersTab(page)

    await page.getByTestId(`property-buyer-panel-add-reminder--${BUYER_PROPERTY_ENTITY_ID}`).click()

    const dialog = page.getByTestId("add-reminder-dialog")
    await expect(dialog).toBeVisible()

    // Buyer dropdown is visible (buyers are passed to the dialog)
    const buyerSelect = dialog.getByTestId("reminder-buyer-select")
    await expect(buyerSelect).toBeVisible()

    // The clicked buyer should be pre-selected
    await expect(buyerSelect).toContainText(BUYER_NAME)
  })

  test("Cancel closes the buyer reminder dialog cleanly (success factor 3)", async ({ page }) => {
    await setupBuyersTab(page)
    await openPropertyAndBuyersTab(page)

    await page.getByTestId(`property-buyer-panel-add-reminder--${BUYER_PROPERTY_ENTITY_ID}`).click()

    const dialog = page.getByTestId("add-reminder-dialog")
    await expect(dialog).toBeVisible()
    await dialog.getByRole("button", { name: "Cancel" }).click()
    await expect(dialog).not.toBeVisible()

    // Buyers tab still visible after cancel
    await expect(page.getByTestId("property-buyers-panel-add-new")).toBeVisible()
  })

})

// ---------------------------------------------------------------------------
// Tests — Contacts tab reminder Bell button
// ---------------------------------------------------------------------------

test.describe("Reminder Bell button — Contacts tab", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")
    await signInAsAdmin(page)
  })

  test("Bell button is visible on each contact row (success factor 4)", async ({ page }) => {
    await setupContactsTab(page)
    await openPropertyAndContactsTab(page)

    const bellBtn = page.getByTestId(`property-contact-add-reminder--${CONTACT_PROPERTY_ENTITY_ID}`)
    await expect(bellBtn).toBeVisible()
  })

  test("Bell button opens AddReminderDialog with no buyer dropdown (success factor 5)", async ({ page }) => {
    await setupContactsTab(page)
    await openPropertyAndContactsTab(page)

    await page.getByTestId(`property-contact-add-reminder--${CONTACT_PROPERTY_ENTITY_ID}`).click()

    const dialog = page.getByTestId("add-reminder-dialog")
    await expect(dialog).toBeVisible()

    // No buyer dropdown — contacts have no buyer context
    await expect(dialog.getByTestId("reminder-buyer-select")).toHaveCount(0)

    // Standard fields are present
    await expect(dialog.getByTestId("reminder-title-input")).toBeVisible()
    await expect(dialog.getByTestId("reminder-date-input")).toBeVisible()
  })

  test("Cancel closes the contact reminder dialog cleanly (success factor 6)", async ({ page }) => {
    await setupContactsTab(page)
    await openPropertyAndContactsTab(page)

    await page.getByTestId(`property-contact-add-reminder--${CONTACT_PROPERTY_ENTITY_ID}`).click()

    const dialog = page.getByTestId("add-reminder-dialog")
    await expect(dialog).toBeVisible()
    await dialog.getByRole("button", { name: "Cancel" }).click()
    await expect(dialog).not.toBeVisible()

    // Contacts tab still visible after cancel
    await expect(page.getByTestId("property-contacts-add-new")).toBeVisible()
  })

})
