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

// Isolated test contact — not the seeded "E2E Seed Contact (Playwright)" so we don't
// interfere with other specs that rely on it.
const TEST_CONTACT = {
  name: "E2E Contact Add Spec (Playwright)",
  email: "e2e-contact-spec@example.com",
  phone: "0411222333",
  address: "1 Spec Test Street",
  suburb: "Specville",
  state: "QLD",
  postcode: "4111",
  notes: "E2E spec test notes",
  association: "Seller",
  contactCategoryName: "Solicitor", // contact_category_id = 1 in seed data
} as const

test.describe("Panda Realty admin — property Contacts tab: Add new", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")
    test.skip(!e2ePandaAdminListApiConfigured, "DATABASE_URL not set")
    await signInAsAdmin(page)
  })

  test.afterEach(async () => {
    await deletePandaPropertyContactByName(TEST_CONTACT.name)
  })

  async function openContactsTab(page: import("@playwright/test").Page) {
    await page.goto(
      `/admin/properties?limit=25&page=1&search=${encodeURIComponent(SEED_PROPERTY_STREET)}&sortKey=updatedAt&sortDir=desc`,
    )
    const editButton = page.getByTestId(/^admin-entity-row-edit--properties--/).first()
    await expect(editButton).toBeVisible({ timeout: 15_000 })
    await editButton.click()
    await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible()
    await page.getByTestId("panda-properties-form-tab-trigger--contacts").click()
    await expect(page.getByTestId("panda-properties-form-tab--contacts")).toBeVisible()
    await expect(page.getByTestId("property-contacts-add-new")).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId("property-contacts-add-new")).toBeEnabled({ timeout: 10_000 })
  }

  test("Contacts tab shows Add new button for the seeded property", async ({ page }) => {
    await openContactsTab(page)
    await expect(page.getByTestId("property-contacts-add-new")).toBeVisible()
  })

  test("Add new creates contact in DB and shows card in UI", async ({ page }) => {
    // Delete any leftover from a previous run before starting
    await deletePandaPropertyContactByName(TEST_CONTACT.name)

    await openContactsTab(page)

    await page.getByTestId("property-contacts-add-new").click()

    const dialog = page.getByTestId("property-contact-dialog")
    await expect(dialog).toBeVisible({ timeout: 10_000 })

    // Fill every form field
    await dialog.getByTestId("property-contact-dialog-name").fill(TEST_CONTACT.name)
    await dialog.getByTestId("property-contact-dialog-email").fill(TEST_CONTACT.email)
    await dialog.getByTestId("property-contact-dialog-phone").fill(TEST_CONTACT.phone)
    await dialog.getByTestId("property-contact-dialog-address").fill(TEST_CONTACT.address)
    await dialog.getByTestId("property-contact-dialog-suburb").fill(TEST_CONTACT.suburb)
    await dialog.getByTestId("property-contact-dialog-state").fill(TEST_CONTACT.state)
    await dialog.getByTestId("property-contact-dialog-postcode").fill(TEST_CONTACT.postcode)
    await dialog.getByTestId("property-contact-dialog-notes").fill(TEST_CONTACT.notes)

    // Contact category — Radix Select
    await dialog.getByTestId("property-contact-dialog-category").click()
    await page.getByRole("option", { name: TEST_CONTACT.contactCategoryName }).click()

    // Association — Radix Select: click trigger then pick option
    await dialog.getByTestId("property-contact-dialog-association").click()
    await page.getByRole("option", { name: TEST_CONTACT.association }).click()

    await dialog.getByTestId("property-contact-dialog-create-and-close").click()

    // Dialog must close after save
    await expect(dialog).toBeHidden({ timeout: 15_000 })

    // UI: contact card must appear with the correct name
    await expect(page.getByText(TEST_CONTACT.name)).toBeVisible({ timeout: 10_000 })

    // DB: verify every field was committed to the entities table
    const saved = await getPandaPropertyContactByName(SEED_PROPERTY_STREET, TEST_CONTACT.name)
    expect(saved).not.toBeNull()
    expect(saved!.propertyEntityId).toBeGreaterThan(0)
    expect(saved!.entityId).toBeGreaterThan(0)
    expect(saved!.entityName).toBe(TEST_CONTACT.name)
    expect(saved!.emailAddress).toBe(TEST_CONTACT.email)
    expect(saved!.phoneNumber).toBe(TEST_CONTACT.phone)
    expect(saved!.address).toBe(TEST_CONTACT.address)
    expect(saved!.esuburb).toBe(TEST_CONTACT.suburb)
    expect(saved!.estate).toBe(TEST_CONTACT.state)
    expect(saved!.epostcode).toBe(TEST_CONTACT.postcode)
    expect(saved!.notes).toBe(TEST_CONTACT.notes)
    expect(saved!.association).toBe(TEST_CONTACT.association)
    expect(saved!.contactCategoryName).toBe(TEST_CONTACT.contactCategoryName)
  })
})
