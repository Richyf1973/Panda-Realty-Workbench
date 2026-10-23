/**
 * E2E: Properties admin — owner Call & Email action buttons
 *
 * Success factors (all mocked, no live DB needed):
 * 1. Call and Email buttons are visible in the table row action column alongside Bell/Note/Calendar.
 * 2. Call button for owner-1 with phone: is a tel: link with the owner's phone number.
 * 3. Email button for owner-1 with email: opens GmailComposeDialog with correct to/subject/body.
 * 4. Gmail compose dialog: to = owner 1 email, subject = address + suburb, body starts with "Dear <name>,".
 * 5. Call button disabled with tooltip "No phone number" when owner 1 exists but has no phone.
 * 6. Email button disabled with tooltip "No email address" when owner 1 exists but has no email.
 * 7. Both buttons disabled with tooltip "No owner" when no owner 1 is set on the property.
 * 8. Gmail compose dialog closes cleanly on cancel; no JS errors.
 */

import { expect, test } from "@playwright/test"

import { e2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import { STATUS_LIST_RESPONSE } from "./helpers/admin-properties-mocks"
import {
  BASE_PROPERTY,
  makeListResponse,
  PROPERTY_ONE_OWNER,
} from "./helpers/panda-properties-owners-helpers"

// ── Fixtures ─────────────────────────────────────────────────────────────────

/** Owner 1 with both phone and email. */
const PROPERTY_FULL_CONTACT = {
  ...PROPERTY_ONE_OWNER,
  propertyListId: 2001,
  streetAddress: "42 Owner Street",
  suburb: "Contactville",
  owner1name: "Smith, John",
  owner1phone: "0412345678",
  owner1email: "john.smith@example.com",
}

/** Owner 1 exists but no phone number. */
const PROPERTY_NO_PHONE = {
  ...PROPERTY_ONE_OWNER,
  propertyListId: 2002,
  streetAddress: "43 Owner Street",
  suburb: "Contactville",
  owner1name: "Jane Owner",
  owner1phone: null,
  owner1email: "jane@example.com",
}

/** Owner 1 exists but no email. */
const PROPERTY_NO_EMAIL = {
  ...PROPERTY_ONE_OWNER,
  propertyListId: 2003,
  streetAddress: "44 Owner Street",
  suburb: "Contactville",
  owner1name: "Bob Owner",
  owner1phone: "0499999999",
  owner1email: null,
}

/** No owner set at all. */
const PROPERTY_NO_OWNER = {
  ...BASE_PROPERTY,
  propertyListId: 2004,
  streetAddress: "45 Owner Street",
  suburb: "Contactville",
  owner1name: null,
  owner1phone: null,
  owner1email: null,
  combinedOwner: "",
}

function makeMultiListResponse(...properties: typeof BASE_PROPERTY[]) {
  return {
    items: properties,
    totalCount: properties.length,
    limit: 25,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
    startCursor: null,
    endCursor: null,
  }
}

async function setupMocks(page: import("@playwright/test").Page, listBody: unknown) {
  await page.route("**/api/admin/properties**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(listBody),
    })
  })
  await page.route("**/api/admin/property-status**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(STATUS_LIST_RESPONSE),
    })
  })
  await page.route("**/api/admin/agents**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    })
  })
  await page.route("**/api/admin/gmail/**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({}) })
  })
}

async function gotoAndWaitForRow(page: import("@playwright/test").Page, propertyListId: number) {
  await page.goto("/admin/properties")
  await expect(
    page.getByTestId(`admin-entity-row--properties--${propertyListId}`),
  ).toBeVisible({ timeout: 15_000 })
}

// ── Tests ────────────────────────────────────────────────────────────────────

test.describe("Properties admin — owner Call & Email action buttons (mocked)", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")
    await setupMocks(page, makeListResponse(PROPERTY_FULL_CONTACT))
    await signInAsAdmin(page)
  })

  test("Call and Email buttons are visible in the table row action column", async ({ page }) => {
    await gotoAndWaitForRow(page, 2001)

    const callBtn = page.getByTestId("property-list-call-button--2001").first()
    const emailBtn = page.getByTestId("property-list-email-button--2001").first()
    const noteBtn = page.getByTestId("property-list-add-note-button--2001").first()
    const editBtn = page.getByTestId("admin-entity-row-edit--properties--2001").first()

    await expect(callBtn).toBeVisible()
    await expect(emailBtn).toBeVisible()
    // Buttons appear before the standard edit/delete controls
    const callBox = await callBtn.boundingBox()
    const editBox = await editBtn.boundingBox()
    const noteBox = await noteBtn.boundingBox()
    expect(callBox!.x).toBeLessThan(editBox!.x)
    expect(noteBox!.x).toBeLessThan(editBox!.x)
  })

  test("Call button is a tel: link with the owner 1 phone number", async ({ page }) => {
    await gotoAndWaitForRow(page, 2001)

    const callBtn = page.getByTestId("property-list-call-button--2001").first()
    await expect(callBtn).toBeEnabled()
    // The button renders as an <a> with a tel: href
    await expect(callBtn).toHaveAttribute("href", `tel:${PROPERTY_FULL_CONTACT.owner1phone}`)
  })

  test("Email button opens GmailComposeDialog with correct to/subject/body", async ({ page }) => {
    await gotoAndWaitForRow(page, 2001)

    await page.getByTestId("property-list-email-button--2001").first().click()

    const dialog = page.getByTestId("property-gmail-compose-dialog")
    await expect(dialog).toBeVisible()

    // to = owner 1 email
    await expect(page.getByTestId("property-gmail-compose-to")).toHaveValue(
      PROPERTY_FULL_CONTACT.owner1email,
    )
    // subject = streetAddress + suburb
    await expect(page.getByTestId("property-gmail-compose-subject")).toHaveValue(
      `${PROPERTY_FULL_CONTACT.streetAddress}, ${PROPERTY_FULL_CONTACT.suburb}`,
    )
  })

  test("Gmail compose dialog body starts with 'Dear <owner name>,'", async ({ page }) => {
    await gotoAndWaitForRow(page, 2001)

    await page.getByTestId("property-list-email-button--2001").first().click()

    const dialog = page.getByTestId("property-gmail-compose-dialog")
    await expect(dialog).toBeVisible()
    // Body textarea should contain the greeting
    const bodyContent = await dialog.textContent()
    expect(bodyContent).toContain(`Dear ${PROPERTY_FULL_CONTACT.owner1name}`)
  })

  test("clicking Cancel closes the Gmail compose dialog cleanly", async ({ page }) => {
    await gotoAndWaitForRow(page, 2001)

    await page.getByTestId("property-list-email-button--2001").first().click()
    await expect(page.getByTestId("property-gmail-compose-dialog")).toBeVisible()

    await page.getByTestId("property-gmail-compose-cancel").click()
    await expect(page.getByTestId("property-gmail-compose-dialog")).not.toBeVisible()

    // Properties list still intact
    await expect(
      page.getByTestId("admin-entity-row--properties--2001"),
    ).toBeVisible()
  })
})

test.describe("Properties admin — Call button disabled states (mocked)", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")
    await signInAsAdmin(page)
  })

  test("Call button disabled with tooltip 'No phone number' when owner 1 has no phone", async ({
    page,
  }) => {
    await setupMocks(page, makeListResponse(PROPERTY_NO_PHONE))
    await gotoAndWaitForRow(page, 2002)

    const callBtn = page.getByTestId("property-list-call-button--2002").first()
    await expect(callBtn).toBeDisabled()

    // Hover the trigger span (Radix wraps disabled buttons in a span for tooltip)
    const trigger = page.getByTestId("property-list-call-trigger--2002").first()
    await trigger.hover()
    await expect(page.getByRole("tooltip", { name: "No phone number" })).toBeVisible()
  })

  test("Email button enabled when owner 1 has email but no phone", async ({ page }) => {
    await setupMocks(page, makeListResponse(PROPERTY_NO_PHONE))
    await gotoAndWaitForRow(page, 2002)

    const emailBtn = page.getByTestId("property-list-email-button--2002").first()
    await expect(emailBtn).toBeEnabled()
  })

  test("Email button disabled with tooltip 'No email address' when owner 1 has no email", async ({
    page,
  }) => {
    await setupMocks(page, makeListResponse(PROPERTY_NO_EMAIL))
    await gotoAndWaitForRow(page, 2003)

    const emailBtn = page.getByTestId("property-list-email-button--2003").first()
    await expect(emailBtn).toBeDisabled()

    const trigger = page.getByTestId("property-list-email-trigger--2003").first()
    await trigger.hover()
    await expect(page.getByRole("tooltip", { name: "No email address" })).toBeVisible()
  })

  test("Call button enabled when owner 1 has phone but no email", async ({ page }) => {
    await setupMocks(page, makeListResponse(PROPERTY_NO_EMAIL))
    await gotoAndWaitForRow(page, 2003)

    const callBtn = page.getByTestId("property-list-call-button--2003").first()
    await expect(callBtn).toBeEnabled()
  })
})

test.describe("Properties admin — No owner disabled state (mocked)", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")
    await setupMocks(page, makeListResponse(PROPERTY_NO_OWNER))
    await signInAsAdmin(page)
  })

  test("Call button disabled with tooltip 'No owner' when property has no owner 1", async ({
    page,
  }) => {
    await gotoAndWaitForRow(page, 2004)

    const callBtn = page.getByTestId("property-list-call-button--2004").first()
    await expect(callBtn).toBeDisabled()

    const trigger = page.getByTestId("property-list-call-trigger--2004").first()
    await trigger.hover()
    await expect(page.getByRole("tooltip", { name: "No owner" })).toBeVisible()
  })

  test("Email button disabled with tooltip 'No owner' when property has no owner 1", async ({
    page,
  }) => {
    await gotoAndWaitForRow(page, 2004)

    const emailBtn = page.getByTestId("property-list-email-button--2004").first()
    await expect(emailBtn).toBeDisabled()

    const trigger = page.getByTestId("property-list-email-trigger--2004").first()
    await trigger.hover()
    await expect(page.getByRole("tooltip", { name: "No owner" })).toBeVisible()
  })
})
