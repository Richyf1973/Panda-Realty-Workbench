import { expect, test } from "@playwright/test"

import {
  e2eAdminCredentials,
  e2ePandaAdminListApiConfigured,
  signInAsAdmin,
} from "./helpers/admin-auth"
import {
  createPandaPropertyContact,
  deletePandaPropertyContactByName,
  getPandaPropertyContactByName,
} from "./helpers/panda-property-contacts-db"

// Uses the seeded property created by globalSetup (seed-sellers-pipeline-accepted-offer.mjs)
const SEED_PROPERTY_STREET = "99 E2E Seed Street"

// Isolated test contact — separate from "E2E Seed Contact (Playwright)" to avoid interfering
// with other specs that rely on that seeded record.
const TEST_CONTACT_INITIAL = {
  name: "E2E Contact Edit Spec (Playwright)",
  email: "e2e-contact-edit@example.com",
  phone: "0411333444",
  address: "2 Edit Spec Street",
  suburb: "Editville",
  state: "QLD",
  postcode: "4222",
  notes: "Initial edit spec notes",
  association: "Seller",
} as const

const TEST_CONTACT_UPDATED = {
  name: "E2E Contact Edit Spec Updated (Playwright)",
  email: "e2e-contact-edit-updated@example.com",
  phone: "0411555666",
  address: "3 Updated Spec Street",
  suburb: "Updatedville",
  state: "NSW",
  postcode: "2000",
  notes: "Updated edit spec notes",
  association: "Buyer",
  contactCategoryName: "Solicitor", // contact_category_id = 1 in seed data
} as const

test.describe("Panda Realty admin — property Contacts tab: Edit existing", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")
    test.skip(!e2ePandaAdminListApiConfigured, "DATABASE_URL not set")

    // Clean slate — remove both names in case a prior run was interrupted mid-edit
    await deletePandaPropertyContactByName(TEST_CONTACT_INITIAL.name)
    await deletePandaPropertyContactByName(TEST_CONTACT_UPDATED.name)

    await createPandaPropertyContact(SEED_PROPERTY_STREET, TEST_CONTACT_INITIAL)
    await signInAsAdmin(page)
  })

  test.afterEach(async () => {
    await deletePandaPropertyContactByName(TEST_CONTACT_INITIAL.name)
    await deletePandaPropertyContactByName(TEST_CONTACT_UPDATED.name)
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

  test("Edit saves updated fields to DB and reflects changes in UI", async ({ page }) => {
    await openContactsTab(page)

    // Locate the contact row by name and click its edit button
    const contactRow = page
      .locator('[data-testid^="property-contact-row--"]')
      .filter({ hasText: TEST_CONTACT_INITIAL.name })
    await expect(contactRow).toBeVisible({ timeout: 15_000 })

    const contactEditBtn = contactRow.locator('[data-testid^="property-contact-edit--"]')
    await expect(contactEditBtn).toBeVisible()
    await contactEditBtn.click()

    const dialog = page.getByTestId("property-contact-dialog")
    await expect(dialog).toBeVisible({ timeout: 10_000 })

    // Dialog should be pre-filled with initial values
    await expect(dialog.getByTestId("property-contact-dialog-name")).toHaveValue(
      TEST_CONTACT_INITIAL.name,
    )

    // Clear and fill every field with updated values
    await dialog.getByTestId("property-contact-dialog-name").fill(TEST_CONTACT_UPDATED.name)
    await dialog.getByTestId("property-contact-dialog-email").fill(TEST_CONTACT_UPDATED.email)
    await dialog.getByTestId("property-contact-dialog-phone").fill(TEST_CONTACT_UPDATED.phone)
    await dialog.getByTestId("property-contact-dialog-address").fill(TEST_CONTACT_UPDATED.address)
    await dialog.getByTestId("property-contact-dialog-suburb").fill(TEST_CONTACT_UPDATED.suburb)
    await dialog.getByTestId("property-contact-dialog-state").fill(TEST_CONTACT_UPDATED.state)
    await dialog.getByTestId("property-contact-dialog-postcode").fill(TEST_CONTACT_UPDATED.postcode)
    await dialog.getByTestId("property-contact-dialog-notes").fill(TEST_CONTACT_UPDATED.notes)

    // Contact category — Radix Select
    await dialog.getByTestId("property-contact-dialog-category").click()
    await page.getByRole("option", { name: TEST_CONTACT_UPDATED.contactCategoryName }).click()

    // Association — Radix Select: click trigger then pick option
    await dialog.getByTestId("property-contact-dialog-association").click()
    await page.getByRole("option", { name: TEST_CONTACT_UPDATED.association }).click()

    await dialog.getByTestId("property-contact-dialog-save").click()

    // Dialog must close after save
    await expect(dialog).toBeHidden({ timeout: 15_000 })

    // UI: updated name must appear in the contacts list
    await expect(page.getByText(TEST_CONTACT_UPDATED.name)).toBeVisible({ timeout: 10_000 })

    // UI: contact category name must appear in the panel card
    const updatedRow = page
      .locator('[data-testid^="property-contact-row--"]')
      .filter({ hasText: TEST_CONTACT_UPDATED.name })
    await expect(updatedRow.getByText(TEST_CONTACT_UPDATED.contactCategoryName)).toBeVisible()

    // UI: re-open edit dialog and verify category is pre-filled
    await updatedRow.locator('[data-testid^="property-contact-edit--"]').click()
    await expect(dialog).toBeVisible({ timeout: 10_000 })
    await expect(
      dialog.getByTestId("property-contact-dialog-category"),
    ).toContainText(TEST_CONTACT_UPDATED.contactCategoryName)
    await dialog.getByTestId("property-contact-dialog-save").click()
    await expect(dialog).toBeHidden({ timeout: 10_000 })

    // DB: verify every updated field was committed
    const saved = await getPandaPropertyContactByName(SEED_PROPERTY_STREET, TEST_CONTACT_UPDATED.name)
    expect(saved).not.toBeNull()
    expect(saved!.propertyEntityId).toBeGreaterThan(0)
    expect(saved!.entityId).toBeGreaterThan(0)
    expect(saved!.entityName).toBe(TEST_CONTACT_UPDATED.name)
    expect(saved!.emailAddress).toBe(TEST_CONTACT_UPDATED.email)
    expect(saved!.phoneNumber).toBe(TEST_CONTACT_UPDATED.phone)
    expect(saved!.address).toBe(TEST_CONTACT_UPDATED.address)
    expect(saved!.esuburb).toBe(TEST_CONTACT_UPDATED.suburb)
    expect(saved!.estate).toBe(TEST_CONTACT_UPDATED.state)
    expect(saved!.epostcode).toBe(TEST_CONTACT_UPDATED.postcode)
    expect(saved!.notes).toBe(TEST_CONTACT_UPDATED.notes)
    expect(saved!.association).toBe(TEST_CONTACT_UPDATED.association)
    expect(saved!.contactCategoryName).toBe(TEST_CONTACT_UPDATED.contactCategoryName)
  })
})
