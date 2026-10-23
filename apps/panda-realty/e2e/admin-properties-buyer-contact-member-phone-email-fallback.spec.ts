/**
 * E2E: Buyer & Contact panel — entity-member phone/email fallback + always-render buttons
 *
 * Success factors (all mocked, no live DB needed):
 * 1. Buyer with no entity phone but a member phone: Phone button is enabled and is a tel: link.
 * 2. Buyer with no entity email but a member email: Mail and Inbox buttons are enabled.
 * 3. The member fallback phone/email appears in the info text line under the entity name.
 * 4. Buyer with no phone anywhere: Phone button is visible, disabled, tooltip "No phone number".
 * 5. Buyer with no email anywhere: Mail and Inbox buttons visible, disabled, tooltip "No email address".
 * 6. Contact with member fallback phone: Phone button enabled (tel: link).
 * 7. Contact with member fallback email: Mail and Inbox buttons enabled.
 * 8. Contact with no phone/email anywhere: buttons visible, disabled, correct tooltips.
 */

import { expect, test } from "@playwright/test"

import { e2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import {
  EMPTY_PROPERTY_ENTITIES_RESPONSE,
  PROPERTY_EDIT_WITH_BUYER,
  SINGLE_PROPERTY_RESPONSE,
  STATUS_LIST_RESPONSE,
} from "./helpers/admin-properties-mocks"

// ── Fixtures ──────────────────────────────────────────────────────────────────

/** Buyer panel item where phone + email come from a member fallback (entity fields are null on the
 *  real entity, but the server COALESCE returns the member values). */
const BUYER_MEMBER_FALLBACK = {
  propertyEntityId: 601,
  entityId: 301,
  entityName: "Smith & Jones Pty Ltd",
  phoneNumber: "0412000001",   // member fallback — COALESCE'd by the server
  emailAddress: "smith@example.com", // member fallback
  address: null,
  esuburb: null,
  estate: null,
  epostcode: null,
  notes: null,
  buyerPipelineStatusId: null,
  pipelineStatusLabel: "Offer Made",
}

/** Buyer panel item with its own phone + email (no fallback needed). */
const BUYER_OWN_CONTACT = {
  propertyEntityId: 602,
  entityId: 302,
  entityName: "Direct Contact Buyer",
  phoneNumber: "0412000002",
  emailAddress: "direct@example.com",
  address: null,
  esuburb: null,
  estate: null,
  epostcode: null,
  notes: null,
  buyerPipelineStatusId: null,
  pipelineStatusLabel: null,
}

/** Buyer with no phone or email anywhere (entity + members all null). */
const BUYER_NO_CONTACT = {
  propertyEntityId: 603,
  entityId: 303,
  entityName: "Empty Contact Buyer",
  phoneNumber: null,
  emailAddress: null,
  address: null,
  esuburb: null,
  estate: null,
  epostcode: null,
  notes: null,
  buyerPipelineStatusId: null,
  pipelineStatusLabel: null,
}

/** Contact panel item where phone + email come from a member fallback. */
const CONTACT_MEMBER_FALLBACK = {
  propertyEntityId: 701,
  entityId: 401,
  entityName: "Fallback Contact Agency",
  phoneNumber: "0413000001",   // member fallback COALESCE'd by server
  emailAddress: "agency@example.com", // member fallback
  address: null,
  esuburb: null,
  estate: null,
  epostcode: null,
  notes: null,
  contactCategoryId: null,
  contactCategoryName: null,
  association: null,
}

/** Contact with no phone or email anywhere. */
const CONTACT_NO_CONTACT = {
  propertyEntityId: 702,
  entityId: 402,
  entityName: "Empty Contact Agency",
  phoneNumber: null,
  emailAddress: null,
  address: null,
  esuburb: null,
  estate: null,
  epostcode: null,
  notes: null,
  contactCategoryId: null,
  contactCategoryName: null,
  association: null,
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function setupBaseMocks(page: import("@playwright/test").Page) {
  await page.route("**/api/admin/property-status**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(STATUS_LIST_RESPONSE) })
  })
  await page.route("**/api/admin/property-entities**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_PROPERTY_ENTITIES_RESPONSE) })
  })
  await page.route("**/api/admin/gmail/**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({}) })
  })
}

async function setupPropertyMock(
  page: import("@playwright/test").Page,
  {
    buyersItems,
    contactsItems,
  }: {
    buyersItems?: unknown[]
    contactsItems?: unknown[]
  },
) {
  await page.route("**/api/admin/properties**", async (route) => {
    const url = route.request().url()
    if (url.match(/\/api\/admin\/properties\/1001\/buyers(\?|$)/)) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: buyersItems ?? [] }),
      })
      return
    }
    if (url.match(/\/api\/admin\/properties\/1001\/contacts(\?|$)/)) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: contactsItems ?? [] }),
      })
      return
    }
    if (url.match(/\/api\/admin\/properties\/1001(\?|$)/)) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(PROPERTY_EDIT_WITH_BUYER),
      })
      return
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ...SINGLE_PROPERTY_RESPONSE,
        items: [PROPERTY_EDIT_WITH_BUYER],
      }),
    })
  })
}

async function openPropertyBuyersTab(page: import("@playwright/test").Page) {
  await page.goto("/admin/properties")
  await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible()
  await page.getByTestId("admin-entity-row--properties--1001").click()
  await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible()
  await page.getByTestId("panda-properties-form-tab-trigger--buyers").click()
  await expect(page.getByTestId("panda-properties-form-tab--buyers")).toBeVisible()
  await expect(page.getByTestId("property-buyers-panel-add-new")).toBeEnabled({ timeout: 10_000 })
}

async function openPropertyContactsTab(page: import("@playwright/test").Page) {
  await page.goto("/admin/properties")
  await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible()
  await page.getByTestId("admin-entity-row--properties--1001").click()
  await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible()
  await page.getByTestId("panda-properties-form-tab-trigger--contacts").click()
  await expect(page.getByTestId("panda-properties-form-tab--contacts")).toBeVisible()
  await expect(page.getByTestId("property-contacts-add-new")).toBeEnabled({ timeout: 10_000 })
}

// ── Buyer tests ───────────────────────────────────────────────────────────────

test.describe("Buyers panel — member phone/email fallback (mocked)", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")
    await setupBaseMocks(page)
    await setupPropertyMock(page, { buyersItems: [BUYER_MEMBER_FALLBACK, BUYER_OWN_CONTACT, BUYER_NO_CONTACT] })
    await signInAsAdmin(page)
  })

  test("Phone button is enabled and is a tel: link when phone comes from member fallback", async ({ page }) => {
    await openPropertyBuyersTab(page)

    const callBtn = page.getByTestId(`property-buyer-panel-quick-call--${BUYER_MEMBER_FALLBACK.propertyEntityId}`)
    await expect(callBtn).toBeVisible()
    await expect(callBtn).toBeEnabled()
    await expect(callBtn).toHaveAttribute("href", `tel:${BUYER_MEMBER_FALLBACK.phoneNumber}`)
  })

  test("Mail button is enabled when email comes from member fallback", async ({ page }) => {
    await openPropertyBuyersTab(page)

    const mailBtn = page.getByTestId(`property-buyer-panel-quick-email--${BUYER_MEMBER_FALLBACK.propertyEntityId}`)
    await expect(mailBtn).toBeVisible()
    await expect(mailBtn).toBeEnabled()
  })

  test("Inbox button is enabled when email comes from member fallback", async ({ page }) => {
    await openPropertyBuyersTab(page)

    const inboxBtn = page.getByTestId(`property-buyer-panel-inbox--${BUYER_MEMBER_FALLBACK.propertyEntityId}`)
    await expect(inboxBtn).toBeVisible()
    await expect(inboxBtn).toBeEnabled()
  })

  test("Member fallback phone and email appear in the info text line under entity name", async ({ page }) => {
    await openPropertyBuyersTab(page)

    const row = page.getByTestId(`property-buyer-panel-row--${BUYER_MEMBER_FALLBACK.propertyEntityId}`)
    await expect(row).toContainText(BUYER_MEMBER_FALLBACK.phoneNumber!)
    await expect(row).toContainText(BUYER_MEMBER_FALLBACK.emailAddress!)
  })

  test("Buyer with own phone and email: Phone button is still a tel: link (no regression)", async ({ page }) => {
    await openPropertyBuyersTab(page)

    const callBtn = page.getByTestId(`property-buyer-panel-quick-call--${BUYER_OWN_CONTACT.propertyEntityId}`)
    await expect(callBtn).toBeEnabled()
    await expect(callBtn).toHaveAttribute("href", `tel:${BUYER_OWN_CONTACT.phoneNumber}`)
  })

  test("Phone button is visible but disabled with tooltip 'No phone number' when no phone anywhere", async ({ page }) => {
    await openPropertyBuyersTab(page)

    const trigger = page.getByTestId(`property-buyer-panel-quick-call-trigger--${BUYER_NO_CONTACT.propertyEntityId}`)
    const callBtn = page.getByTestId(`property-buyer-panel-quick-call--${BUYER_NO_CONTACT.propertyEntityId}`)

    await expect(callBtn).toBeVisible()
    await expect(callBtn).toBeDisabled()

    await trigger.hover()
    await expect(page.getByRole("tooltip", { name: "No phone number" })).toBeVisible()
  })

  test("Mail button is visible but disabled with tooltip 'No email address' when no email anywhere", async ({ page }) => {
    await openPropertyBuyersTab(page)

    const trigger = page.getByTestId(`property-buyer-panel-quick-email-trigger--${BUYER_NO_CONTACT.propertyEntityId}`)
    const mailBtn = page.getByTestId(`property-buyer-panel-quick-email--${BUYER_NO_CONTACT.propertyEntityId}`)

    await expect(mailBtn).toBeVisible()
    await expect(mailBtn).toBeDisabled()

    await trigger.hover()
    await expect(page.getByRole("tooltip", { name: "No email address" })).toBeVisible()
  })

  test("Inbox button is visible but disabled with tooltip 'No email address' when no email anywhere", async ({ page }) => {
    await openPropertyBuyersTab(page)

    const trigger = page.getByTestId(`property-buyer-panel-inbox-trigger--${BUYER_NO_CONTACT.propertyEntityId}`)
    const inboxBtn = page.getByTestId(`property-buyer-panel-inbox--${BUYER_NO_CONTACT.propertyEntityId}`)

    await expect(inboxBtn).toBeVisible()
    await expect(inboxBtn).toBeDisabled()

    await trigger.hover()
    await expect(page.getByRole("tooltip", { name: "No email address" })).toBeVisible()
  })
})

// ── Contact tests ─────────────────────────────────────────────────────────────

test.describe("Contacts panel — member phone/email fallback (mocked)", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")
    await setupBaseMocks(page)
    await setupPropertyMock(page, { contactsItems: [CONTACT_MEMBER_FALLBACK, CONTACT_NO_CONTACT] })
    await signInAsAdmin(page)
  })

  test("Phone button is enabled and is a tel: link when contact phone comes from member fallback", async ({ page }) => {
    await openPropertyContactsTab(page)

    const callBtn = page.getByTestId(`property-contact-quick-call--${CONTACT_MEMBER_FALLBACK.propertyEntityId}`)
    await expect(callBtn).toBeVisible()
    await expect(callBtn).toBeEnabled()
    await expect(callBtn).toHaveAttribute("href", `tel:${CONTACT_MEMBER_FALLBACK.phoneNumber}`)
  })

  test("Mail button is enabled when contact email comes from member fallback", async ({ page }) => {
    await openPropertyContactsTab(page)

    const mailBtn = page.getByTestId(`property-contact-quick-email--${CONTACT_MEMBER_FALLBACK.propertyEntityId}`)
    await expect(mailBtn).toBeVisible()
    await expect(mailBtn).toBeEnabled()
  })

  test("Inbox button is enabled when contact email comes from member fallback", async ({ page }) => {
    await openPropertyContactsTab(page)

    const inboxBtn = page.getByTestId(`property-contact-inbox--${CONTACT_MEMBER_FALLBACK.propertyEntityId}`)
    await expect(inboxBtn).toBeVisible()
    await expect(inboxBtn).toBeEnabled()
  })

  test("Member fallback phone and email appear in the info text line under contact name", async ({ page }) => {
    await openPropertyContactsTab(page)

    const row = page.getByTestId(`property-contact-row--${CONTACT_MEMBER_FALLBACK.propertyEntityId}`)
    await expect(row).toContainText(CONTACT_MEMBER_FALLBACK.phoneNumber!)
    await expect(row).toContainText(CONTACT_MEMBER_FALLBACK.emailAddress!)
  })

  test("Phone button is visible but disabled with tooltip 'No phone number' when no contact phone anywhere", async ({ page }) => {
    await openPropertyContactsTab(page)

    const trigger = page.getByTestId(`property-contact-quick-call-trigger--${CONTACT_NO_CONTACT.propertyEntityId}`)
    const callBtn = page.getByTestId(`property-contact-quick-call--${CONTACT_NO_CONTACT.propertyEntityId}`)

    await expect(callBtn).toBeVisible()
    await expect(callBtn).toBeDisabled()

    await trigger.hover()
    await expect(page.getByRole("tooltip", { name: "No phone number" })).toBeVisible()
  })

  test("Mail button is visible but disabled with tooltip 'No email address' when no contact email anywhere", async ({ page }) => {
    await openPropertyContactsTab(page)

    const trigger = page.getByTestId(`property-contact-quick-email-trigger--${CONTACT_NO_CONTACT.propertyEntityId}`)
    const mailBtn = page.getByTestId(`property-contact-quick-email--${CONTACT_NO_CONTACT.propertyEntityId}`)

    await expect(mailBtn).toBeVisible()
    await expect(mailBtn).toBeDisabled()

    await trigger.hover()
    await expect(page.getByRole("tooltip", { name: "No email address" })).toBeVisible()
  })

  test("Inbox button is visible but disabled with tooltip 'No email address' when no contact email anywhere", async ({ page }) => {
    await openPropertyContactsTab(page)

    const trigger = page.getByTestId(`property-contact-inbox-trigger--${CONTACT_NO_CONTACT.propertyEntityId}`)
    const inboxBtn = page.getByTestId(`property-contact-inbox--${CONTACT_NO_CONTACT.propertyEntityId}`)

    await expect(inboxBtn).toBeVisible()
    await expect(inboxBtn).toBeDisabled()

    await trigger.hover()
    await expect(page.getByRole("tooltip", { name: "No email address" })).toBeVisible()
  })
})
