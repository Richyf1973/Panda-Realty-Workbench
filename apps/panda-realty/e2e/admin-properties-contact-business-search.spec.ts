import { expect, test } from "@playwright/test"
import {
  e2eAdminCredentials,
  e2ePandaAdminListApiConfigured,
  signInAsAdmin,
} from "./helpers/admin-auth"
import {
  deletePandaPropertyContactByName,
  getPandaPropertyContactByName,
} from "./helpers/panda-property-contacts-db"

// Uses the seeded property created by globalSetup (seed-sellers-pipeline-accepted-offer.mjs)
const SEED_PROPERTY_STREET = "99 E2E Seed Street"

const TEST_CONTACT_NAME = "E2E Business Search Spec (Playwright)"

// Mock response returned by GET /api/admin/places/search?q=...
const MOCK_PLACE = {
  placeId: "ChIJmock1234",
  name: TEST_CONTACT_NAME,
  phone: "07 3000 0000",
  address: "123 Queen St",
  suburb: "Brisbane City",
  state: "QLD",
  postcode: "4000",
}

const MOCK_PLACES_RESPONSE = { items: [MOCK_PLACE] }

async function mockPlacesSearchSuccess(page: import("@playwright/test").Page) {
  await page.route("**/api/admin/places/search**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_PLACES_RESPONSE),
    })
  })
}

async function mockPlacesSearchEmpty(page: import("@playwright/test").Page) {
  await page.route("**/api/admin/places/search**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items: [] }),
    })
  })
}

async function mockPlacesSearchError(page: import("@playwright/test").Page) {
  await page.route("**/api/admin/places/search**", async (route) => {
    await route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "API error" }) })
  })
}

async function openContactsAddDialog(page: import("@playwright/test").Page) {
  await page.goto(
    `/admin/properties?limit=25&page=1&search=${encodeURIComponent(SEED_PROPERTY_STREET)}&sortKey=updatedAt&sortDir=desc`,
  )
  const editButton = page.getByTestId(/^admin-entity-row-edit--properties--/).first()
  await expect(editButton).toBeVisible({ timeout: 15_000 })
  await editButton.click()
  await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible()
  await page.getByTestId("panda-properties-form-tab-trigger--contacts").click()
  await expect(page.getByTestId("panda-properties-form-tab--contacts")).toBeVisible()
  await expect(page.getByTestId("property-contacts-add-new")).toBeEnabled({ timeout: 15_000 })
  await page.getByTestId("property-contacts-add-new").click()
  const dialog = page.getByTestId("property-contact-dialog")
  await expect(dialog).toBeVisible({ timeout: 10_000 })
  return dialog
}

test.describe("Panda Realty — Add Contact: business name search & autofill", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")
    test.skip(!e2ePandaAdminListApiConfigured, "DATABASE_URL not set")
    await signInAsAdmin(page)
  })

  test.afterEach(async () => {
    await deletePandaPropertyContactByName(TEST_CONTACT_NAME)
  })

  // MV step 3 — search button visible in Add Contact dialog
  test("search button is visible in Add Contact dialog", async ({ page }) => {
    const dialog = await openContactsAddDialog(page)
    await expect(dialog.getByTestId("property-contact-dialog-business-search-btn")).toBeVisible()
  })

  // MV steps 4–13 — search triggers request, dropdown shows, selecting autofills fields
  test("search autofills name, phone, address, suburb, state, postcode on result selection", async ({ page }) => {
    await mockPlacesSearchSuccess(page)
    const dialog = await openContactsAddDialog(page)

    await dialog.getByTestId("property-contact-dialog-name").fill("Ray White")
    await dialog.getByTestId("property-contact-dialog-business-search-btn").click()

    // Spinner shown while loading (button disabled)
    // Results dropdown appears
    const results = dialog.getByTestId("property-contact-dialog-business-search-results")
    await expect(results).toBeVisible({ timeout: 10_000 })

    const resultItem = dialog.getByTestId(`property-contact-dialog-business-search-result--${MOCK_PLACE.placeId}`)
    await expect(resultItem).toBeVisible()
    await resultItem.click()

    // Dropdown closes after selection
    await expect(results).toBeHidden()

    // Fields autofilled from mock data
    await expect(dialog.getByTestId("property-contact-dialog-name")).toHaveValue(MOCK_PLACE.name)
    await expect(dialog.getByTestId("property-contact-dialog-phone")).toHaveValue(MOCK_PLACE.phone)
    await expect(dialog.getByTestId("property-contact-dialog-address")).toHaveValue(MOCK_PLACE.address)
    await expect(dialog.getByTestId("property-contact-dialog-suburb")).toHaveValue(MOCK_PLACE.suburb)
    await expect(dialog.getByTestId("property-contact-dialog-state")).toHaveValue(MOCK_PLACE.state)
    await expect(dialog.getByTestId("property-contact-dialog-postcode")).toHaveValue(MOCK_PLACE.postcode)

    // Email and Notes untouched (Places does not return them)
    await expect(dialog.getByTestId("property-contact-dialog-email")).toHaveValue("")
    await expect(dialog.getByTestId("property-contact-dialog-notes")).toHaveValue("")
  })

  // MV steps 15–16 + persistence steps 30–34 — autofilled data saves to DB and card appears
  test("contact created with autofilled data is persisted to DB and card shown", async ({ page }) => {
    await deletePandaPropertyContactByName(TEST_CONTACT_NAME)
    await mockPlacesSearchSuccess(page)

    const dialog = await openContactsAddDialog(page)

    await dialog.getByTestId("property-contact-dialog-name").fill("Ray White")
    await dialog.getByTestId("property-contact-dialog-business-search-btn").click()

    const resultItem = dialog.getByTestId(`property-contact-dialog-business-search-result--${MOCK_PLACE.placeId}`)
    await expect(resultItem).toBeVisible({ timeout: 10_000 })
    await resultItem.click()

    await dialog.getByTestId("property-contact-dialog-create-and-close").click()
    await expect(dialog).toBeHidden({ timeout: 15_000 })

    // Card appears in the contacts panel
    await expect(page.getByText(MOCK_PLACE.name)).toBeVisible({ timeout: 10_000 })

    // DB verify — all autofilled fields persisted
    const saved = await getPandaPropertyContactByName(SEED_PROPERTY_STREET, MOCK_PLACE.name)
    expect(saved).not.toBeNull()
    expect(saved!.entityName).toBe(MOCK_PLACE.name)
    expect(saved!.phoneNumber).toBe(MOCK_PLACE.phone)
    expect(saved!.address).toBe(MOCK_PLACE.address)
    expect(saved!.esuburb).toBe(MOCK_PLACE.suburb)
    expect(saved!.estate).toBe(MOCK_PLACE.state)
    expect(saved!.epostcode).toBe(MOCK_PLACE.postcode)
  })

  // MV steps 17–18 — empty company name shows inline message, no API call
  test("clicking search with empty Company Name shows guard message and makes no API call", async ({ page }) => {
    let apiCalled = false
    await page.route("**/api/admin/places/search**", async (route) => {
      apiCalled = true
      await route.continue()
    })

    const dialog = await openContactsAddDialog(page)

    // Name field is empty — click search
    await expect(dialog.getByTestId("property-contact-dialog-name")).toHaveValue("")
    await dialog.getByTestId("property-contact-dialog-business-search-btn").click()

    // Guard message appears
    await expect(dialog.getByTestId("property-contact-dialog-business-search-error")).toBeVisible()

    expect(apiCalled).toBe(false)
  })

  // MV steps 19–20 — no results shows empty state in dropdown
  test("search with no matching results shows empty state message in dropdown", async ({ page }) => {
    await mockPlacesSearchEmpty(page)
    const dialog = await openContactsAddDialog(page)

    await dialog.getByTestId("property-contact-dialog-name").fill("xzqw9283noresult")
    await dialog.getByTestId("property-contact-dialog-business-search-btn").click()

    const results = dialog.getByTestId("property-contact-dialog-business-search-results")
    await expect(results).toBeVisible({ timeout: 10_000 })
    await expect(dialog.getByTestId("property-contact-dialog-business-search-empty")).toBeVisible()
  })

  // MV steps 21–22 — dropdown closes on outside click without autofilling
  test("clicking outside the results dropdown closes it without autofilling", async ({ page }) => {
    await mockPlacesSearchSuccess(page)
    const dialog = await openContactsAddDialog(page)

    await dialog.getByTestId("property-contact-dialog-name").fill("Ray White")
    await dialog.getByTestId("property-contact-dialog-business-search-btn").click()

    const results = dialog.getByTestId("property-contact-dialog-business-search-results")
    await expect(results).toBeVisible({ timeout: 10_000 })

    // Click outside — the dialog header is a safe outside target
    await page.getByRole("dialog").getByRole("heading").click()

    await expect(results).toBeHidden()

    // Fields remain empty — no autofill happened
    await expect(dialog.getByTestId("property-contact-dialog-phone")).toHaveValue("")
    await expect(dialog.getByTestId("property-contact-dialog-address")).toHaveValue("")
  })

  // MV steps 23–24 — existing values are unconditionally overwritten on autofill
  test("autofill overwrites pre-filled field values unconditionally", async ({ page }) => {
    await mockPlacesSearchSuccess(page)
    const dialog = await openContactsAddDialog(page)

    // Pre-fill address manually
    await dialog.getByTestId("property-contact-dialog-address").fill("999 Old Address Rd")

    await dialog.getByTestId("property-contact-dialog-name").fill("Ray White")
    await dialog.getByTestId("property-contact-dialog-business-search-btn").click()

    const resultItem = dialog.getByTestId(`property-contact-dialog-business-search-result--${MOCK_PLACE.placeId}`)
    await expect(resultItem).toBeVisible({ timeout: 10_000 })
    await resultItem.click()

    // Old address overwritten with Places result
    await expect(dialog.getByTestId("property-contact-dialog-address")).toHaveValue(MOCK_PLACE.address)
  })

  // MV steps 27–28 — API error shows inline error message without crash
  test("Places API error shows inline error message and does not crash", async ({ page }) => {
    await mockPlacesSearchError(page)
    const dialog = await openContactsAddDialog(page)

    await dialog.getByTestId("property-contact-dialog-name").fill("Ray White")
    await dialog.getByTestId("property-contact-dialog-business-search-btn").click()

    await expect(dialog.getByTestId("property-contact-dialog-business-search-error")).toBeVisible({ timeout: 10_000 })

    // Dialog and all form fields still functional
    await expect(dialog.getByTestId("property-contact-dialog-name")).toBeVisible()
    await expect(dialog.getByTestId("property-contact-dialog-create-and-close")).toBeEnabled()
  })
})
