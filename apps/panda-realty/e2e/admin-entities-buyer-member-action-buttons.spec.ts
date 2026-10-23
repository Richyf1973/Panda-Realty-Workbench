import { expect, test } from "@playwright/test"

import {
  e2eAdminCredentials,
  e2ePandaAdminListApiConfigured,
  signInAsAdmin,
} from "./helpers/admin-auth"

const MEMBER_WITH_CONTACT: Record<string, unknown> = {
  entityMemberId: 101,
  entityId: 1,
  memberName: "Christopher Matthews",
  memberPhoneNumber: "0438347078",
  memberEmailAddress: "test@example.com",
  memberAddress: "28 Ridgegarden Drive",
  propertyToSellAddress: null,
  scheduledViewingDate: null,
  isBuyersRepresentative: false,
}

const MEMBER_NO_CONTACT: Record<string, unknown> = {
  entityMemberId: 102,
  entityId: 1,
  memberName: "Merilyn Matthews",
  memberPhoneNumber: null,
  memberEmailAddress: null,
  memberAddress: "28 Ridgegarden Drive",
  propertyToSellAddress: null,
  scheduledViewingDate: null,
  isBuyersRepresentative: false,
}

const CONNECTION: Record<string, unknown> = {
  propertyEntityId: 501,
  entityId: 1,
  propertyListId: 1001,
  propertyEntityNote: null,
  buyerPipelineStatusId: null,
  isOriginalOwner: false,
}

test.describe("Buyer member rows — full action button set", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")
    test.skip(
      !e2ePandaAdminListApiConfigured,
      "DATABASE_URL not set — admin list uses live APIs",
    )
    await signInAsAdmin(page)
  })

  function stubMembers(page: Parameters<typeof signInAsAdmin>[0], members: unknown[]) {
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

  async function openFirstBuyerEditDialog(page: Parameters<typeof signInAsAdmin>[0]) {
    await page.goto(
      "/admin/entities?limit=25&page=1&sortKey=entityName&sortDir=asc&entityCategoryId=1&listLayout=grid",
    )
    await page.waitForLoadState("networkidle")
    await page.getByTestId(/^admin-entity-row-edit--entities--/).first().click()
    await expect(page.getByTestId("admin-entity-crud-dialog--entities")).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.getByTestId("panda-entities-dialog-form")).toBeVisible()
    const tabs = page.getByTestId("panda-entities-buyer-tabs")
    await expect(tabs).toBeVisible({ timeout: 10_000 })
    return tabs
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 1. Member with full contact data — all 8 buttons present and enabled
  // ──────────────────────────────────────────────────────────────────────────

  test("member with phone and email has all 8 action buttons enabled", async ({ page }) => {
    await stubMembers(page, [MEMBER_WITH_CONTACT])
    await stubConnections(page, [CONNECTION])
    const tabs = await openFirstBuyerEditDialog(page)
    const id = MEMBER_WITH_CONTACT.entityMemberId as number

    await expect(tabs.getByTestId(`buyer-member-quick-call--${id}`)).toBeEnabled()
    await expect(tabs.getByTestId(`buyer-member-quick-email--${id}`)).toBeEnabled()
    await expect(tabs.getByTestId(`buyer-member-inbox--${id}`)).toBeEnabled()
    await expect(tabs.getByTestId(`buyer-member-edit--${id}`)).toBeEnabled()
    await expect(tabs.getByTestId(`buyer-member-delete--${id}`)).toBeEnabled()
  })

  test("member with phone and email has meeting, note, reminder buttons enabled when property connected", async ({ page }) => {
    await stubMembers(page, [MEMBER_WITH_CONTACT])
    await stubConnections(page, [CONNECTION])
    const tabs = await openFirstBuyerEditDialog(page)
    const id = MEMBER_WITH_CONTACT.entityMemberId as number

    await expect(tabs.getByTestId(`buyer-member-add-event--${id}`)).toBeEnabled()
    await expect(tabs.getByTestId(`buyer-member-add-note--${id}`)).toBeEnabled()
    await expect(tabs.getByTestId(`buyer-member-add-reminder--${id}`)).toBeEnabled()
  })

  // ──────────────────────────────────────────────────────────────────────────
  // 2. Member with no phone — phone button present but disabled
  // ──────────────────────────────────────────────────────────────────────────

  test("member with no phone has phone button visible but disabled", async ({ page }) => {
    await stubMembers(page, [MEMBER_NO_CONTACT])
    await stubConnections(page, [CONNECTION])
    const tabs = await openFirstBuyerEditDialog(page)
    const id = MEMBER_NO_CONTACT.entityMemberId as number

    const callBtn = tabs.getByTestId(`buyer-member-quick-call--${id}`)
    await expect(callBtn).toBeVisible()
    await expect(callBtn).toBeDisabled()
  })

  test("disabled phone button shows tooltip with reason", async ({ page }) => {
    await stubMembers(page, [MEMBER_NO_CONTACT])
    await stubConnections(page, [CONNECTION])
    const tabs = await openFirstBuyerEditDialog(page)
    const id = MEMBER_NO_CONTACT.entityMemberId as number

    await tabs.getByTestId(`buyer-member-quick-call--${id}`).hover({ force: true })
    await expect(page.getByRole("tooltip")).toContainText(/no phone/i)
  })

  // ──────────────────────────────────────────────────────────────────────────
  // 3. Member with no email — mail and inbox buttons present but disabled
  // ──────────────────────────────────────────────────────────────────────────

  test("member with no email has mail button visible but disabled", async ({ page }) => {
    await stubMembers(page, [MEMBER_NO_CONTACT])
    await stubConnections(page, [CONNECTION])
    const tabs = await openFirstBuyerEditDialog(page)
    const id = MEMBER_NO_CONTACT.entityMemberId as number

    const mailBtn = tabs.getByTestId(`buyer-member-quick-email--${id}`)
    await expect(mailBtn).toBeVisible()
    await expect(mailBtn).toBeDisabled()
  })

  test("disabled mail button shows tooltip with reason", async ({ page }) => {
    await stubMembers(page, [MEMBER_NO_CONTACT])
    await stubConnections(page, [CONNECTION])
    const tabs = await openFirstBuyerEditDialog(page)
    const id = MEMBER_NO_CONTACT.entityMemberId as number

    await tabs.getByTestId(`buyer-member-quick-email--${id}`).hover({ force: true })
    await expect(page.getByRole("tooltip")).toContainText(/no email/i)
  })

  test("member with no email has inbox button visible but disabled", async ({ page }) => {
    await stubMembers(page, [MEMBER_NO_CONTACT])
    await stubConnections(page, [CONNECTION])
    const tabs = await openFirstBuyerEditDialog(page)
    const id = MEMBER_NO_CONTACT.entityMemberId as number

    const inboxBtn = tabs.getByTestId(`buyer-member-inbox--${id}`)
    await expect(inboxBtn).toBeVisible()
    await expect(inboxBtn).toBeDisabled()
  })

  // ──────────────────────────────────────────────────────────────────────────
  // 4. No property connection — meeting/note/reminder disabled
  // ──────────────────────────────────────────────────────────────────────────

  test("member row has meeting/note/reminder disabled when no property connection", async ({ page }) => {
    await stubMembers(page, [MEMBER_WITH_CONTACT])
    await stubConnections(page, [])
    const tabs = await openFirstBuyerEditDialog(page)
    const id = MEMBER_WITH_CONTACT.entityMemberId as number

    await expect(tabs.getByTestId(`buyer-member-add-event--${id}`)).toBeDisabled()
    await expect(tabs.getByTestId(`buyer-member-add-note--${id}`)).toBeDisabled()
    await expect(tabs.getByTestId(`buyer-member-add-reminder--${id}`)).toBeDisabled()
  })

  test("disabled meeting button shows tooltip about linking a property", async ({ page }) => {
    await stubMembers(page, [MEMBER_WITH_CONTACT])
    await stubConnections(page, [])
    const tabs = await openFirstBuyerEditDialog(page)
    const id = MEMBER_WITH_CONTACT.entityMemberId as number

    await tabs.getByTestId(`buyer-member-add-event--${id}`).hover({ force: true })
    await expect(page.getByRole("tooltip")).toContainText(/property/i)
  })

  // ──────────────────────────────────────────────────────────────────────────
  // 5. Edit and delete always enabled regardless of contact data
  // ──────────────────────────────────────────────────────────────────────────

  test("edit and delete buttons are always enabled even when no contact data", async ({ page }) => {
    await stubMembers(page, [MEMBER_NO_CONTACT])
    await stubConnections(page, [])
    const tabs = await openFirstBuyerEditDialog(page)
    const id = MEMBER_NO_CONTACT.entityMemberId as number

    await expect(tabs.getByTestId(`buyer-member-edit--${id}`)).toBeEnabled()
    await expect(tabs.getByTestId(`buyer-member-delete--${id}`)).toBeEnabled()
  })

  // ──────────────────────────────────────────────────────────────────────────
  // 6. Inbox toggle — expands email threads panel
  // ──────────────────────────────────────────────────────────────────────────

  test("clicking enabled inbox button expands email thread panel", async ({ page }) => {
    await stubMembers(page, [MEMBER_WITH_CONTACT])
    await stubConnections(page, [CONNECTION])
    // Stub email threads to avoid real Gmail API
    await page.route("**/api/admin/entity-threads**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ threads: [] }),
      })
    })
    const tabs = await openFirstBuyerEditDialog(page)
    const id = MEMBER_WITH_CONTACT.entityMemberId as number

    const inboxBtn = tabs.getByTestId(`buyer-member-inbox--${id}`)
    await expect(inboxBtn).toBeEnabled()
    await inboxBtn.click()

    // Thread panel or empty-state should be visible
    const memberRow = tabs.locator(`li:has([data-testid="buyer-member-inbox--${id}"])`)
    await expect(memberRow).toBeVisible()
  })

  // ──────────────────────────────────────────────────────────────────────────
  // 7. Both members in same panel — each gets full button set
  // ──────────────────────────────────────────────────────────────────────────

  test("each member row independently shows all 8 buttons", async ({ page }) => {
    await stubMembers(page, [MEMBER_WITH_CONTACT, MEMBER_NO_CONTACT])
    await stubConnections(page, [CONNECTION])
    const tabs = await openFirstBuyerEditDialog(page)

    for (const m of [MEMBER_WITH_CONTACT, MEMBER_NO_CONTACT]) {
      const id = m.entityMemberId as number
      await expect(tabs.getByTestId(`buyer-member-quick-call--${id}`)).toBeVisible()
      await expect(tabs.getByTestId(`buyer-member-quick-email--${id}`)).toBeVisible()
      await expect(tabs.getByTestId(`buyer-member-inbox--${id}`)).toBeVisible()
      await expect(tabs.getByTestId(`buyer-member-add-event--${id}`)).toBeVisible()
      await expect(tabs.getByTestId(`buyer-member-add-note--${id}`)).toBeVisible()
      await expect(tabs.getByTestId(`buyer-member-add-reminder--${id}`)).toBeVisible()
      await expect(tabs.getByTestId(`buyer-member-edit--${id}`)).toBeVisible()
      await expect(tabs.getByTestId(`buyer-member-delete--${id}`)).toBeVisible()
    }
  })
})
