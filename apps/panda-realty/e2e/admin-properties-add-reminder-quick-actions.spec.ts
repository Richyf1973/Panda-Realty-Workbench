import { expect, test } from "@playwright/test"

import { requirePandaE2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"

// ---------------------------------------------------------------------------
// Shared mock responses
// ---------------------------------------------------------------------------

const STATUS_LIST_RESPONSE = {
  items: [],
  totalCount: 0,
  limit: 100,
  totalPages: 0,
  hasNextPage: false,
  hasPreviousPage: false,
  startCursor: null,
  endCursor: null,
}

const EMPTY_LIST_RESPONSE = {
  items: [],
  totalCount: 0,
  limit: 25,
  totalPages: 0,
  hasNextPage: false,
  hasPreviousPage: false,
  startCursor: null,
  endCursor: null,
}

const PROPERTY_LIST_ID = 9001
const PROPERTY_ENTITY_ID = 5001
const ENTITY_ID = 901
const BUYER_NAME = "TREVOR & NARELLE CLARK"

const BASE_ITEM = {
  propertyListId: PROPERTY_LIST_ID,
  streetAddress: "42 REMINDER TEST STREET",
  suburb: "PLAYWRIGHT HEIGHTS",
  state: "QLD",
  postcode: "4500",
  propertyType: "House",
  bed: 3,
  bath: 2,
  car: 1,
  buildingArea: 180,
  salePrice: 650000,
  saleDate: null,
  propertyStatusId: 1,
  buyerName: null,
  buyerId: null,
  isFavorite: false,
  priceUndisclosed: false,
  excludeFromReport: false,
  updatedAt: "2026-01-01T00:00:00Z",
  owner1name: "JOHN OWNER",
  owner1phone: "0412345678",
  owner1email: "john@example.com",
  owner2name: null,
  owner2phone: null,
  owner2email: null,
  owner3name: null,
  owner3phone: null,
  owner3email: null,
  combinedOwner: "JOHN OWNER",
  contractPrice: null,
  successfulBuyer: null,
  successfulBuyerPropertyEntityId: null,
  successfulBuyerEntityId: null,
  successfulBuyerPhoneNumber: null,
  successfulBuyerEmailAddress: null,
}

function makeTableListResponse(overrides: Record<string, unknown> = {}) {
  return {
    items: [{ ...BASE_ITEM, ...overrides }],
    totalCount: 1,
    limit: 25,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
    startCursor: null,
    endCursor: null,
  }
}

function makeQuickListResponse(overrides: Record<string, unknown> = {}) {
  return makeTableListResponse(overrides)
}

// ---------------------------------------------------------------------------
// Navigation helpers
// ---------------------------------------------------------------------------

async function gotoTableView(page: import("@playwright/test").Page, overrides: Record<string, unknown> = {}) {
  await page.route("**/api/admin/property-status**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(STATUS_LIST_RESPONSE) })
  })
  await page.route("**/api/admin/properties**", async (route) => {
    if (route.request().method() !== "GET") { await route.continue(); return }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(makeTableListResponse(overrides)) })
  })
  await page.goto("/admin/properties")
  await expect(page.getByTestId("admin-entity-table-scroll--properties")).toBeVisible()
  await expect(page.locator(`[data-testid^="admin-entity-row--properties--"]`).first()).toBeVisible()
}

async function gotoQuickCards(page: import("@playwright/test").Page, overrides: Record<string, unknown> = {}) {
  await page.route("**/api/admin/property-status**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(STATUS_LIST_RESPONSE) })
  })
  await page.route("**/api/admin/properties**", async (route) => {
    const url = route.request().url()
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(url.includes("propertyType=") ? makeQuickListResponse(overrides) : EMPTY_LIST_RESPONSE),
    })
  })
  await page.goto(`/admin/properties?propertyType=House`)
  await expect(page.getByTestId("admin-entity-quick-cards-scroll--properties")).toBeVisible({ timeout: 30_000 })
}

// ---------------------------------------------------------------------------
// Tests — column action Bell button (table view)
// ---------------------------------------------------------------------------

test.describe("Add Reminder quick action — column action button (table view)", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaE2eAdminCredentials()
    await page.setViewportSize({ width: 1600, height: 900 })
    await signInAsAdmin(page)
  })

  test("Bell button is visible in the actions column for every property row", async ({ page }) => {
    await gotoTableView(page)
    await expect(page.getByTestId(`property-list-add-reminder-button--${PROPERTY_LIST_ID}`).first()).toBeVisible()
  })

  test("Bell button opens AddReminderDialog", async ({ page }) => {
    await gotoTableView(page)
    await page.getByTestId(`property-list-add-reminder-button--${PROPERTY_LIST_ID}`).first().click()
    await expect(page.getByTestId("add-reminder-dialog")).toBeVisible()
  })

  test("Reminder dialog from column action shows title, date fields but no buyer dropdown", async ({ page }) => {
    await gotoTableView(page)
    await page.getByTestId(`property-list-add-reminder-button--${PROPERTY_LIST_ID}`).first().click()
    const dialog = page.getByTestId("add-reminder-dialog")
    await expect(dialog).toBeVisible()
    await expect(dialog.getByTestId("reminder-title-input")).toBeVisible()
    await expect(dialog.getByTestId("reminder-date-input")).toBeVisible()
    await expect(dialog.getByTestId("reminder-buyer-select")).toHaveCount(0)
  })

  test("Reminder dialog from column action closes on Cancel", async ({ page }) => {
    await gotoTableView(page)
    await page.getByTestId(`property-list-add-reminder-button--${PROPERTY_LIST_ID}`).first().click()
    const dialog = page.getByTestId("add-reminder-dialog")
    await expect(dialog).toBeVisible()
    await dialog.getByRole("button", { name: "Cancel" }).click()
    await expect(dialog).not.toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Tests — owner quick card Bell button
// ---------------------------------------------------------------------------

test.describe("Add Reminder quick action — owner quick card row", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaE2eAdminCredentials()
    await page.setViewportSize({ width: 1600, height: 900 })
    await signInAsAdmin(page)
  })

  test("Bell button is visible in the owner row action group", async ({ page }) => {
    await page.route("**/api/admin/calendar/status**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ connected: true }) })
    })
    await gotoQuickCards(page)
    await expect(page.getByTestId("property-owner-add-reminder--1")).toBeVisible()
  })

  test("Bell button opens AddReminderDialog with no buyer dropdown", async ({ page }) => {
    await page.route("**/api/admin/calendar/status**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ connected: true }) })
    })
    await gotoQuickCards(page)
    await page.getByTestId("property-owner-add-reminder--1").click()
    const dialog = page.getByTestId("add-reminder-dialog")
    await expect(dialog).toBeVisible()
    await expect(dialog.getByTestId("reminder-buyer-select")).toHaveCount(0)
  })

  test("Owner quick card reminder dialog closes on Cancel", async ({ page }) => {
    await page.route("**/api/admin/calendar/status**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ connected: true }) })
    })
    await gotoQuickCards(page)
    await page.getByTestId("property-owner-add-reminder--1").click()
    const dialog = page.getByTestId("add-reminder-dialog")
    await expect(dialog).toBeVisible()
    await dialog.getByRole("button", { name: "Cancel" }).click()
    await expect(dialog).not.toBeVisible()
  })

  test("Owner row with no name does not show Bell button (showOwnerActions guard)", async ({ page }) => {
    await page.route("**/api/admin/calendar/status**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ connected: true }) })
    })
    await gotoQuickCards(page, { owner1name: null, combinedOwner: null })
    await expect(page.getByTestId("property-owner-add-reminder--1")).toHaveCount(0)
  })
})

// ---------------------------------------------------------------------------
// Tests — successful buyer quick card Bell button
// ---------------------------------------------------------------------------

test.describe("Add Reminder quick action — successful buyer quick card row", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaE2eAdminCredentials()
    await page.setViewportSize({ width: 1600, height: 900 })
    await signInAsAdmin(page)
  })

  test("Bell button is visible in the successful buyer row action group", async ({ page }) => {
    await page.route("**/api/admin/calendar/status**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ connected: true }) })
    })
    await gotoQuickCards(page, {
      successfulBuyer: BUYER_NAME,
      successfulBuyerPropertyEntityId: PROPERTY_ENTITY_ID,
      successfulBuyerEntityId: ENTITY_ID,
      successfulBuyerPhoneNumber: "0400111222",
      successfulBuyerEmailAddress: "buyer@example.com",
    })
    await expect(page.getByTestId(`property-successful-buyer-add-reminder--${PROPERTY_LIST_ID}`)).toBeVisible()
  })

  test("Buyer Bell button opens AddReminderDialog with buyer dropdown pre-selected", async ({ page }) => {
    await page.route("**/api/admin/calendar/status**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ connected: true }) })
    })
    await gotoQuickCards(page, {
      successfulBuyer: BUYER_NAME,
      successfulBuyerPropertyEntityId: PROPERTY_ENTITY_ID,
      successfulBuyerEntityId: ENTITY_ID,
      successfulBuyerPhoneNumber: "0400111222",
      successfulBuyerEmailAddress: "buyer@example.com",
    })
    await page.getByTestId(`property-successful-buyer-add-reminder--${PROPERTY_LIST_ID}`).click()
    const dialog = page.getByTestId("add-reminder-dialog")
    await expect(dialog).toBeVisible()
    await expect(dialog.getByTestId("reminder-buyer-select")).toBeVisible()
    await expect(dialog.getByTestId("reminder-buyer-select")).toContainText(BUYER_NAME)
  })

  test("Successful buyer reminder dialog closes on Cancel", async ({ page }) => {
    await page.route("**/api/admin/calendar/status**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ connected: true }) })
    })
    await gotoQuickCards(page, {
      successfulBuyer: BUYER_NAME,
      successfulBuyerPropertyEntityId: PROPERTY_ENTITY_ID,
      successfulBuyerEntityId: ENTITY_ID,
      successfulBuyerPhoneNumber: "0400111222",
      successfulBuyerEmailAddress: "buyer@example.com",
    })
    await page.getByTestId(`property-successful-buyer-add-reminder--${PROPERTY_LIST_ID}`).click()
    const dialog = page.getByTestId("add-reminder-dialog")
    await expect(dialog).toBeVisible()
    await dialog.getByRole("button", { name: "Cancel" }).click()
    await expect(dialog).not.toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Tests — OwnerRow Bell button in the property edit form section
// ---------------------------------------------------------------------------

test.describe("Add Reminder quick action — form section OwnerRow", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaE2eAdminCredentials()
    await page.setViewportSize({ width: 1600, height: 900 })
    await signInAsAdmin(page)
  })

  async function openEditDialog(page: import("@playwright/test").Page, propertyListId: number) {
    await page.getByTestId(`admin-entity-row-edit--properties--${propertyListId}`).click()
    await expect(page.getByTestId("panda-properties-form-section--owners")).toBeVisible()
  }

  test("Bell button appears on a saved owner row with a name", async ({ page }) => {
    await page.route("**/api/admin/calendar/status**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ connected: true }) })
    })
    await gotoTableView(page)
    await openEditDialog(page, PROPERTY_LIST_ID)
    await expect(page.getByTestId("property-owner-add-reminder--1")).toBeVisible()
  })

  test("Bell button opens AddReminderDialog with no buyer dropdown", async ({ page }) => {
    await page.route("**/api/admin/calendar/status**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ connected: true }) })
    })
    await gotoTableView(page)
    await openEditDialog(page, PROPERTY_LIST_ID)
    await page.getByTestId("property-owner-add-reminder--1").click()
    const dialog = page.getByTestId("add-reminder-dialog")
    await expect(dialog).toBeVisible()
    await expect(dialog.getByTestId("reminder-buyer-select")).toHaveCount(0)
  })

  test("Form section reminder dialog closes on Cancel without affecting the property form", async ({ page }) => {
    await page.route("**/api/admin/calendar/status**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ connected: true }) })
    })
    await gotoTableView(page)
    await openEditDialog(page, PROPERTY_LIST_ID)
    await page.getByTestId("property-owner-add-reminder--1").click()
    const dialog = page.getByTestId("add-reminder-dialog")
    await expect(dialog).toBeVisible()
    await dialog.getByRole("button", { name: "Cancel" }).click()
    await expect(dialog).not.toBeVisible()
    await expect(page.getByTestId("panda-properties-form-section--owners")).toBeVisible()
  })

  test("Bell button is absent on blank owner row (showOwnerActions guard)", async ({ page }) => {
    await page.route("**/api/admin/calendar/status**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ connected: true }) })
    })
    await gotoTableView(page, { owner1name: null })
    await openEditDialog(page, PROPERTY_LIST_ID)
    await expect(page.getByTestId("property-owner-add-reminder--1")).toHaveCount(0)
  })
})
