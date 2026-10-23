import { expect, test } from "@playwright/test"

import {
  e2eAdminCredentials,
  e2ePandaAdminListApiConfigured,
  signInAsAdmin,
} from "./helpers/admin-auth"

const SEED_PROPERTY_STREET = "99 E2E Seed Street"

// Fake property contact row to stub the contacts list — entityId matches our connection stub
const FAKE_PROPERTY_CONTACT: Record<string, unknown> = {
  propertyEntityId: 300,
  entityId: 2,
  entityName: "E2E Test Contact",
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

const CONTACT_MEMBER_WITH_CONTACT: Record<string, unknown> = {
  entityMemberId: 201,
  entityId: 2,
  memberName: "Jane Smith",
  memberPhoneNumber: "0411222333",
  memberEmailAddress: "jane@example.com",
}

const CONTACT_MEMBER_NO_CONTACT: Record<string, unknown> = {
  entityMemberId: 202,
  entityId: 2,
  memberName: "Bob Jones",
  memberPhoneNumber: null,
  memberEmailAddress: null,
}

const CONNECTION: Record<string, unknown> = {
  propertyEntityId: 601,
  entityId: 2,
  propertyListId: 2001,
  propertyEntityNote: null,
  buyerPipelineStatusId: null,
  isOriginalOwner: false,
}

test.describe("Contact member rows — full action button set", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")
    test.skip(
      !e2ePandaAdminListApiConfigured,
      "DATABASE_URL not set — admin list uses live APIs",
    )
    await signInAsAdmin(page)
  })

  function stubContactMembers(page: Parameters<typeof signInAsAdmin>[0], members: unknown[]) {
    return page.route("**/api/admin/entity-members**", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ items: members }),
        })
      } else {
        await route.continue()
      }
    })
  }

  function stubConnections(page: Parameters<typeof signInAsAdmin>[0], connections: unknown[]) {
    return page.route("**/api/admin/property-entities**", async (route) => {
      const url = new URL(route.request().url())
      if (route.request().method() === "GET" && url.pathname === "/api/admin/property-entities") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ items: connections }),
        })
      } else {
        await route.continue()
      }
    })
  }

  // Navigate via properties → Contacts tab → contact edit → PropertyContactDialog (contains ContactMembersPanel)
  async function openPropertyContactDialog(page: Parameters<typeof signInAsAdmin>[0]) {
    // Stub the property contacts list to return our fake contact
    await page.route("**/api/admin/properties/*/contacts", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ items: [FAKE_PROPERTY_CONTACT] }),
        })
      } else {
        await route.continue()
      }
    })

    await page.goto(
      `/admin/properties?limit=25&page=1&search=${encodeURIComponent(SEED_PROPERTY_STREET)}&sortKey=updatedAt&sortDir=desc`,
    )
    const editButton = page.getByTestId(/^admin-entity-row-edit--properties--/).first()
    await expect(editButton).toBeVisible({ timeout: 15_000 })
    await editButton.click()
    await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible()
    await page.getByTestId("panda-properties-form-tab-trigger--contacts").click()
    await expect(page.getByTestId("panda-properties-form-tab--contacts")).toBeVisible()

    // Click edit on our stubbed contact
    const contactEditBtn = page.getByTestId(
      `property-contact-edit--${FAKE_PROPERTY_CONTACT.propertyEntityId as number}`,
    )
    await expect(contactEditBtn).toBeVisible({ timeout: 10_000 })
    await contactEditBtn.click()

    const dialog = page.getByTestId("property-contact-dialog")
    await expect(dialog).toBeVisible({ timeout: 10_000 })
    return dialog
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 1. Member with full contact data — all 8 buttons present and enabled
  // ──────────────────────────────────────────────────────────────────────────

  test("contact member with phone and email has all 8 action buttons enabled", async ({ page }) => {
    await stubContactMembers(page, [CONTACT_MEMBER_WITH_CONTACT])
    await stubConnections(page, [CONNECTION])
    await openPropertyContactDialog(page)
    const id = CONTACT_MEMBER_WITH_CONTACT.entityMemberId as number

    await expect(page.getByTestId(`contact-member-quick-call--${id}`)).toBeEnabled()
    await expect(page.getByTestId(`contact-member-quick-email--${id}`)).toBeEnabled()
    await expect(page.getByTestId(`contact-member-inbox--${id}`)).toBeEnabled()
    await expect(page.getByTestId(`contact-member-add-event--${id}`)).toBeEnabled()
    await expect(page.getByTestId(`contact-member-add-note--${id}`)).toBeEnabled()
    await expect(page.getByTestId(`contact-member-add-reminder--${id}`)).toBeEnabled()
    await expect(page.getByTestId(`contact-member-edit--${id}`)).toBeEnabled()
    await expect(page.getByTestId(`contact-member-delete--${id}`)).toBeEnabled()
  })

  // ──────────────────────────────────────────────────────────────────────────
  // 2. Member with no phone — phone button present but disabled with tooltip
  // ──────────────────────────────────────────────────────────────────────────

  test("contact member with no phone has phone button visible but disabled", async ({ page }) => {
    await stubContactMembers(page, [CONTACT_MEMBER_NO_CONTACT])
    await stubConnections(page, [CONNECTION])
    await openPropertyContactDialog(page)
    const id = CONTACT_MEMBER_NO_CONTACT.entityMemberId as number

    const callBtn = page.getByTestId(`contact-member-quick-call--${id}`)
    await expect(callBtn).toBeVisible()
    await expect(callBtn).toBeDisabled()
  })

  test("disabled phone button on contact member shows tooltip with reason", async ({ page }) => {
    await stubContactMembers(page, [CONTACT_MEMBER_NO_CONTACT])
    await stubConnections(page, [CONNECTION])
    await openPropertyContactDialog(page)
    const id = CONTACT_MEMBER_NO_CONTACT.entityMemberId as number

    await page.getByTestId(`contact-member-quick-call--${id}`).hover({ force: true })
    await expect(page.getByRole("tooltip")).toContainText(/no phone/i)
  })

  // ──────────────────────────────────────────────────────────────────────────
  // 3. Member with no email — mail and inbox buttons disabled
  // ──────────────────────────────────────────────────────────────────────────

  test("contact member with no email has mail button visible but disabled", async ({ page }) => {
    await stubContactMembers(page, [CONTACT_MEMBER_NO_CONTACT])
    await stubConnections(page, [CONNECTION])
    await openPropertyContactDialog(page)
    const id = CONTACT_MEMBER_NO_CONTACT.entityMemberId as number

    const mailBtn = page.getByTestId(`contact-member-quick-email--${id}`)
    await expect(mailBtn).toBeVisible()
    await expect(mailBtn).toBeDisabled()
  })

  test("contact member with no email has inbox button visible but disabled", async ({ page }) => {
    await stubContactMembers(page, [CONTACT_MEMBER_NO_CONTACT])
    await stubConnections(page, [CONNECTION])
    await openPropertyContactDialog(page)
    const id = CONTACT_MEMBER_NO_CONTACT.entityMemberId as number

    const inboxBtn = page.getByTestId(`contact-member-inbox--${id}`)
    await expect(inboxBtn).toBeVisible()
    await expect(inboxBtn).toBeDisabled()
  })

  // ──────────────────────────────────────────────────────────────────────────
  // 4. No property connection — meeting/note/reminder disabled
  // ──────────────────────────────────────────────────────────────────────────

  test("contact member row has meeting/note/reminder disabled when no property connection", async ({ page }) => {
    await stubContactMembers(page, [CONTACT_MEMBER_WITH_CONTACT])
    await stubConnections(page, [])
    await openPropertyContactDialog(page)
    const id = CONTACT_MEMBER_WITH_CONTACT.entityMemberId as number

    await expect(page.getByTestId(`contact-member-add-event--${id}`)).toBeDisabled()
    await expect(page.getByTestId(`contact-member-add-note--${id}`)).toBeDisabled()
    await expect(page.getByTestId(`contact-member-add-reminder--${id}`)).toBeDisabled()
  })

  test("disabled meeting button on contact member shows tooltip about linking a property", async ({ page }) => {
    await stubContactMembers(page, [CONTACT_MEMBER_WITH_CONTACT])
    await stubConnections(page, [])
    await openPropertyContactDialog(page)
    const id = CONTACT_MEMBER_WITH_CONTACT.entityMemberId as number

    await page.getByTestId(`contact-member-add-event--${id}`).hover({ force: true })
    await expect(page.getByRole("tooltip")).toContainText(/property/i)
  })

  // ──────────────────────────────────────────────────────────────────────────
  // 5. Edit and delete always enabled regardless of contact data
  // ──────────────────────────────────────────────────────────────────────────

  test("edit and delete buttons are always enabled even when no contact data", async ({ page }) => {
    await stubContactMembers(page, [CONTACT_MEMBER_NO_CONTACT])
    await stubConnections(page, [])
    await openPropertyContactDialog(page)
    const id = CONTACT_MEMBER_NO_CONTACT.entityMemberId as number

    await expect(page.getByTestId(`contact-member-edit--${id}`)).toBeEnabled()
    await expect(page.getByTestId(`contact-member-delete--${id}`)).toBeEnabled()
  })

  // ──────────────────────────────────────────────────────────────────────────
  // 6. Both members in same panel — each gets full button set
  // ──────────────────────────────────────────────────────────────────────────

  test("each contact member row independently shows all 8 buttons", async ({ page }) => {
    await stubContactMembers(page, [CONTACT_MEMBER_WITH_CONTACT, CONTACT_MEMBER_NO_CONTACT])
    await stubConnections(page, [CONNECTION])
    await openPropertyContactDialog(page)

    for (const m of [CONTACT_MEMBER_WITH_CONTACT, CONTACT_MEMBER_NO_CONTACT]) {
      const id = m.entityMemberId as number
      await expect(page.getByTestId(`contact-member-quick-call--${id}`)).toBeVisible()
      await expect(page.getByTestId(`contact-member-quick-email--${id}`)).toBeVisible()
      await expect(page.getByTestId(`contact-member-inbox--${id}`)).toBeVisible()
      await expect(page.getByTestId(`contact-member-add-event--${id}`)).toBeVisible()
      await expect(page.getByTestId(`contact-member-add-note--${id}`)).toBeVisible()
      await expect(page.getByTestId(`contact-member-add-reminder--${id}`)).toBeVisible()
      await expect(page.getByTestId(`contact-member-edit--${id}`)).toBeVisible()
      await expect(page.getByTestId(`contact-member-delete--${id}`)).toBeVisible()
    }
  })
})
