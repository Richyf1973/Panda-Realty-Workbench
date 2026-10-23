import { expect, test } from "@playwright/test"

import {
  e2eAdminCredentials,
  e2ePandaAdminListApiConfigured,
  signInAsAdmin,
} from "./helpers/admin-auth"
import {
  createPandaPropertyContact,
  deletePandaContactMembersByEntityName,
  deletePandaPropertyContactByName,
} from "./helpers/panda-property-contacts-db"

const SEED_PROPERTY_STREET = "99 E2E Seed Street"

const TEST_CONTACT = {
  name: "E2E Contact Representatives Spec (Playwright)",
  email: "e2e-contact-rep@example.com",
  phone: "0411777888",
} as const

const TEST_REP = {
  name: "E2E Rep Jane Doe",
  phone: "0400 111 222",
  email: "jane@e2e-rep.com",
} as const

const TEST_REP_UPDATED = {
  name: "E2E Rep Jane Doe",
  phone: "0400 999 888",
  email: "jane-updated@e2e-rep.com",
} as const

test.describe("Panda Realty admin — property contact dialog: representatives", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")
    test.skip(!e2ePandaAdminListApiConfigured, "DATABASE_URL not set")
    await deletePandaContactMembersByEntityName(TEST_CONTACT.name)
    await deletePandaPropertyContactByName(TEST_CONTACT.name)
    await signInAsAdmin(page)
  })

  test.afterEach(async () => {
    await deletePandaContactMembersByEntityName(TEST_CONTACT.name)
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
    await expect(page.getByTestId("property-contacts-add-new")).toBeEnabled({ timeout: 15_000 })
  }

  test("Add new contact dialog shows Company Name label", async ({ page }) => {
    await openContactsTab(page)
    await page.getByTestId("property-contacts-add-new").click()
    const dialog = page.getByTestId("property-contact-dialog")
    await expect(dialog).toBeVisible({ timeout: 10_000 })
    await expect(dialog.getByLabel("Company Name *")).toBeVisible()
  })

  test("Representatives section shows save-first placeholder in create mode", async ({ page }) => {
    await openContactsTab(page)
    await page.getByTestId("property-contacts-add-new").click()
    const dialog = page.getByTestId("property-contact-dialog")
    await expect(dialog).toBeVisible({ timeout: 10_000 })
    await expect(dialog.getByText("Save the contact first to manage representatives.")).toBeVisible()
    await expect(dialog.getByTestId("contact-members-panel-add-new")).not.toBeVisible()
  })

  test("Add, edit, and delete a representative in edit mode", async ({ page }) => {
    // Create the contact via DB so we can edit it immediately
    await createPandaPropertyContact(SEED_PROPERTY_STREET, TEST_CONTACT)

    await openContactsTab(page)

    // Locate and open the edit dialog for the test contact
    const contactRow = page
      .locator('[data-testid^="property-contact-row--"]')
      .filter({ hasText: TEST_CONTACT.name })
    await expect(contactRow).toBeVisible({ timeout: 15_000 })
    await contactRow.locator('[data-testid^="property-contact-edit--"]').click()

    const dialog = page.getByTestId("property-contact-dialog")
    await expect(dialog).toBeVisible({ timeout: 10_000 })

    // Representatives section is visible in edit mode
    await expect(dialog.getByTestId("contact-members-panel-add-new")).toBeVisible()
    await expect(dialog.getByTestId("contact-members-panel-add-new")).toBeEnabled()

    // --- Add a representative ---
    await dialog.getByTestId("contact-members-panel-add-new").click()
    const memberDialog = page.getByTestId("contact-member-dialog")
    await expect(memberDialog).toBeVisible({ timeout: 10_000 })
    await expect(memberDialog.getByLabel("Name *")).toBeVisible()
    await expect(memberDialog.getByLabel("Phone")).toBeVisible()
    await expect(memberDialog.getByLabel("Email")).toBeVisible()

    await memberDialog.getByTestId("contact-member-dialog-name").fill(TEST_REP.name)
    await memberDialog.getByTestId("contact-member-dialog-phone").fill(TEST_REP.phone)
    await memberDialog.getByTestId("contact-member-dialog-email").fill(TEST_REP.email)
    await memberDialog.getByTestId("contact-member-dialog-save").click()

    await expect(memberDialog).toBeHidden({ timeout: 10_000 })

    // Card appears in the representatives list
    const repRow = dialog.locator('[data-testid^="contact-member-row--"]').filter({ hasText: TEST_REP.name })
    await expect(repRow).toBeVisible({ timeout: 10_000 })
    await expect(repRow.getByText(TEST_REP.phone)).toBeVisible()
    await expect(repRow.getByText(TEST_REP.email)).toBeVisible()

    // Quick-action buttons visible when phone/email present
    await expect(repRow.locator('[data-testid^="contact-member-quick-call--"]')).toBeVisible()
    await expect(repRow.locator('[data-testid^="contact-member-quick-email--"]')).toBeVisible()

    // --- Edit the representative ---
    await repRow.locator('[data-testid^="contact-member-edit--"]').click()
    await expect(memberDialog).toBeVisible({ timeout: 10_000 })
    await expect(memberDialog.getByTestId("contact-member-dialog-name")).toHaveValue(TEST_REP.name)
    await expect(memberDialog.getByTestId("contact-member-dialog-phone")).toHaveValue(TEST_REP.phone)

    await memberDialog.getByTestId("contact-member-dialog-phone").fill(TEST_REP_UPDATED.phone)
    await memberDialog.getByTestId("contact-member-dialog-email").fill(TEST_REP_UPDATED.email)
    await memberDialog.getByTestId("contact-member-dialog-save").click()
    await expect(memberDialog).toBeHidden({ timeout: 10_000 })

    // Card shows updated phone
    const updatedRepRow = dialog.locator('[data-testid^="contact-member-row--"]').filter({ hasText: TEST_REP_UPDATED.name })
    await expect(updatedRepRow.getByText(TEST_REP_UPDATED.phone)).toBeVisible({ timeout: 10_000 })

    // --- Delete the representative ---
    await updatedRepRow.locator('[data-testid^="contact-member-delete--"]').click()
    const deleteDialog = page.getByTestId("contact-member-delete-dialog")
    await expect(deleteDialog).toBeVisible({ timeout: 10_000 })
    await deleteDialog.getByTestId("contact-member-delete-confirm").click()
    await expect(deleteDialog).toBeHidden({ timeout: 10_000 })

    // Card is gone; empty state shown
    await expect(dialog.locator('[data-testid^="contact-member-row--"]')).toHaveCount(0)
  })

  test("Required name validation prevents saving a representative with empty name", async ({ page }) => {
    await createPandaPropertyContact(SEED_PROPERTY_STREET, TEST_CONTACT)

    await openContactsTab(page)

    const contactRow = page
      .locator('[data-testid^="property-contact-row--"]')
      .filter({ hasText: TEST_CONTACT.name })
    await expect(contactRow).toBeVisible({ timeout: 15_000 })
    await contactRow.locator('[data-testid^="property-contact-edit--"]').click()

    const dialog = page.getByTestId("property-contact-dialog")
    await expect(dialog).toBeVisible({ timeout: 10_000 })

    await dialog.getByTestId("contact-members-panel-add-new").click()
    const memberDialog = page.getByTestId("contact-member-dialog")
    await expect(memberDialog).toBeVisible({ timeout: 10_000 })

    // Leave name empty and click Save
    await memberDialog.getByTestId("contact-member-dialog-save").click()

    // Error shown, dialog stays open
    await expect(memberDialog.getByRole("alert")).toBeVisible()
    await expect(memberDialog).toBeVisible()
  })

  test("Representative without phone has call button enabled; without email has mail button visible but disabled", async ({ page }) => {
    await createPandaPropertyContact(SEED_PROPERTY_STREET, TEST_CONTACT)
    await openContactsTab(page)

    const contactRow = page
      .locator('[data-testid^="property-contact-row--"]')
      .filter({ hasText: TEST_CONTACT.name })
    await expect(contactRow).toBeVisible({ timeout: 15_000 })
    await contactRow.locator('[data-testid^="property-contact-edit--"]').click()

    const dialog = page.getByTestId("property-contact-dialog")
    await expect(dialog).toBeVisible({ timeout: 10_000 })

    // Add rep with phone only (no email)
    await dialog.getByTestId("contact-members-panel-add-new").click()
    const memberDialog = page.getByTestId("contact-member-dialog")
    await expect(memberDialog).toBeVisible({ timeout: 10_000 })
    await memberDialog.getByTestId("contact-member-dialog-name").fill("Rep Phone Only")
    await memberDialog.getByTestId("contact-member-dialog-phone").fill("0411000111")
    await memberDialog.getByTestId("contact-member-dialog-save").click()
    await expect(memberDialog).toBeHidden({ timeout: 10_000 })

    const phoneOnlyRow = dialog.locator('[data-testid^="contact-member-row--"]').filter({ hasText: "Rep Phone Only" })
    await expect(phoneOnlyRow.locator('[data-testid^="contact-member-quick-call--"]')).toBeVisible()
    // Email button always rendered — visible but disabled when no email address
    await expect(phoneOnlyRow.locator('[data-testid^="contact-member-quick-email--"]')).toBeVisible()
    await expect(phoneOnlyRow.locator('[data-testid^="contact-member-quick-email--"]')).toBeDisabled()
  })
})
