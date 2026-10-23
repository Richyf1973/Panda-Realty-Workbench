import { expect, test } from "@playwright/test"

import {
  e2eAdminCredentials,
  e2ePandaAdminListApiConfigured,
  signInAsAdmin,
} from "./helpers/admin-auth"

test(
  "seeded favorite property has saved buyer and contact rows in the Buyers and Contacts tabs",
  async ({ page }) => {
    test.skip(
      !e2eAdminCredentials || !e2ePandaAdminListApiConfigured,
      "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD / DATABASE_URL not set",
    )

    await signInAsAdmin(page)

    // Navigate to favorites (default) and search for the E2E seeded property.
    // The seeded property has is_favorite=true so it appears in the favorites view.
    await page.goto(
      "/admin/properties?limit=25&page=1&search=99+E2E+Seed+Street&sortKey=updatedAt&sortDir=desc",
    )

    // Wait for the list to load and find the first edit button
    const editButton = page
      .getByTestId(/^admin-entity-row-edit--properties--/)
      .first()
    await expect(editButton).toBeVisible({ timeout: 15_000 })
    await editButton.click()

    // Edit dialog should open
    await expect(
      page.getByTestId("admin-entity-crud-dialog--properties"),
    ).toBeVisible()

    // Switch to the Buyers tab (only visible for favorite properties)
    await page
      .getByTestId("panda-properties-form-tab-trigger--buyers")
      .click()
    await expect(
      page.getByTestId("panda-properties-form-tab--buyers"),
    ).toBeVisible()

    // Wait for the buyers panel to finish loading — Add new button becomes enabled
    await expect(page.getByTestId("property-buyers-panel-add-new")).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId("property-buyers-panel-add-new")).toBeEnabled({ timeout: 10_000 })

    // Assert at least one buyer card row is present (seeded buyer entity)
    const buyerRows = page.getByTestId(/^property-buyer-panel-row--/)
    await expect(buyerRows.first()).toBeVisible({ timeout: 10_000 })
    expect(await buyerRows.count()).toBeGreaterThan(0)

    // Switch to the Contacts tab and verify the seeded contact card
    await page
      .getByTestId("panda-properties-form-tab-trigger--contacts")
      .click()
    await expect(
      page.getByTestId("panda-properties-form-tab--contacts"),
    ).toBeVisible()

    // Wait for the contacts panel to finish loading — button visible and enabled
    await expect(page.getByTestId("property-contacts-add-new")).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId("property-contacts-add-new")).toBeEnabled({ timeout: 10_000 })

    // Assert at least one contact card row is present (seeded contact entity)
    const contactRows = page.getByTestId(/^property-contact-row--/)
    await expect(contactRows.first()).toBeVisible({ timeout: 10_000 })
    expect(await contactRows.count()).toBeGreaterThan(0)
  },
)
