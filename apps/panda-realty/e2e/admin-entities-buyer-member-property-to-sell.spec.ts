import { expect, test } from "@playwright/test"

import {
  e2eAdminCredentials,
  e2ePandaAdminListApiConfigured,
  signInAsAdmin,
} from "./helpers/admin-auth"

const MEMBER_WITH_HOME_ADDRESS = {
  entityMemberId: 101,
  entityId: 1,
  memberName: "Christopher Matthews",
  memberPhoneNumber: "0438347078",
  memberEmailAddress: "test@example.com",
  memberAddress: "28 Ridgegarden Drive Morayfield QLD",
  propertyToSellAddress: null,
  scheduledViewingDate: null,
  isBuyersRepresentative: false,
}

const MEMBER_WITH_STORED_SELL_ADDRESS = {
  ...MEMBER_WITH_HOME_ADDRESS,
  entityMemberId: 102,
  propertyToSellAddress: "123 Sell Street Brisbane QLD 4000",
}

const MEMBER_WITH_NO_ADDRESS = {
  entityMemberId: 103,
  entityId: 1,
  memberName: "No Address Member",
  memberPhoneNumber: null,
  memberEmailAddress: null,
  memberAddress: null,
  propertyToSellAddress: null,
  scheduledViewingDate: null,
  isBuyersRepresentative: false,
}

test.describe("Buyer member — property to sell address", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")
    test.skip(
      !e2ePandaAdminListApiConfigured,
      "DATABASE_URL not set — admin list uses live APIs",
    )
    await signInAsAdmin(page)
  })

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
  }

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

  // ──────────────────────────────────────────────────────────────────────────
  // 1. Member row with null propertyToSellAddress falls back to home address
  // ──────────────────────────────────────────────────────────────────────────

  test("member row shows home address as fallback when property-to-sell address is null", async ({ page }) => {
    await stubMembers(page, [MEMBER_WITH_HOME_ADDRESS])
    await openFirstBuyerEditDialog(page)

    const tabs = page.getByTestId("panda-entities-buyer-tabs")
    await expect(tabs).toBeVisible({ timeout: 10_000 })

    await expect(
      tabs.getByTestId(`buyer-member-property-to-sell--${MEMBER_WITH_HOME_ADDRESS.entityMemberId}`),
    ).toContainText(MEMBER_WITH_HOME_ADDRESS.memberAddress)
  })

  // ──────────────────────────────────────────────────────────────────────────
  // 2. Member row shows stored property-to-sell address (not home address)
  // ──────────────────────────────────────────────────────────────────────────

  test("member row shows stored property-to-sell address when set", async ({ page }) => {
    await stubMembers(page, [MEMBER_WITH_STORED_SELL_ADDRESS])
    await openFirstBuyerEditDialog(page)

    const tabs = page.getByTestId("panda-entities-buyer-tabs")
    await expect(tabs).toBeVisible({ timeout: 10_000 })

    await expect(
      tabs.getByTestId(`buyer-member-property-to-sell--${MEMBER_WITH_STORED_SELL_ADDRESS.entityMemberId}`),
    ).toContainText("123 Sell Street Brisbane QLD 4000")
  })

  // ──────────────────────────────────────────────────────────────────────────
  // 3. Edit dialog pre-fills property-to-sell from home address when null
  // ──────────────────────────────────────────────────────────────────────────

  test("edit dialog pre-fills property-to-sell from home address when stored value is null", async ({ page }) => {
    await stubMembers(page, [MEMBER_WITH_HOME_ADDRESS])
    await openFirstBuyerEditDialog(page)

    const tabs = page.getByTestId("panda-entities-buyer-tabs")
    await expect(tabs).toBeVisible({ timeout: 10_000 })

    await tabs.getByTestId(`buyer-member-edit--${MEMBER_WITH_HOME_ADDRESS.entityMemberId}`).click()
    await expect(page.getByTestId("buyer-member-dialog")).toBeVisible()

    const sellField = page.getByTestId("buyer-member-dialog-property-to-sell-address")
    await expect(sellField).toBeVisible()
    await expect(sellField).toHaveValue(MEMBER_WITH_HOME_ADDRESS.memberAddress)
  })

  // ──────────────────────────────────────────────────────────────────────────
  // 4. Edit dialog shows stored value (not home address) when already set
  // ──────────────────────────────────────────────────────────────────────────

  test("edit dialog shows stored property-to-sell address when already set", async ({ page }) => {
    await stubMembers(page, [MEMBER_WITH_STORED_SELL_ADDRESS])
    await openFirstBuyerEditDialog(page)

    const tabs = page.getByTestId("panda-entities-buyer-tabs")
    await expect(tabs).toBeVisible({ timeout: 10_000 })

    await tabs.getByTestId(`buyer-member-edit--${MEMBER_WITH_STORED_SELL_ADDRESS.entityMemberId}`).click()
    await expect(page.getByTestId("buyer-member-dialog")).toBeVisible()

    const sellField = page.getByTestId("buyer-member-dialog-property-to-sell-address")
    await expect(sellField).toHaveValue("123 Sell Street Brisbane QLD 4000")
  })

  // ──────────────────────────────────────────────────────────────────────────
  // 5. Member with no home address has empty property-to-sell field in dialog
  // ──────────────────────────────────────────────────────────────────────────

  test("edit dialog has empty property-to-sell field when member has no home address", async ({ page }) => {
    await stubMembers(page, [MEMBER_WITH_NO_ADDRESS])
    await openFirstBuyerEditDialog(page)

    const tabs = page.getByTestId("panda-entities-buyer-tabs")
    await expect(tabs).toBeVisible({ timeout: 10_000 })

    await tabs.getByTestId(`buyer-member-edit--${MEMBER_WITH_NO_ADDRESS.entityMemberId}`).click()
    await expect(page.getByTestId("buyer-member-dialog")).toBeVisible()

    const sellField = page.getByTestId("buyer-member-dialog-property-to-sell-address")
    await expect(sellField).toHaveValue("")
  })

  // ──────────────────────────────────────────────────────────────────────────
  // 6. Property-to-sell field is present in Add new dialog (empty)
  // ──────────────────────────────────────────────────────────────────────────

  test("Add new member dialog includes an empty property-to-sell address field", async ({ page }) => {
    await stubMembers(page, [])
    await openFirstBuyerEditDialog(page)

    const tabs = page.getByTestId("panda-entities-buyer-tabs")
    await expect(tabs).toBeVisible({ timeout: 10_000 })

    await tabs.getByRole("button", { name: /add new/i }).click()
    await expect(page.getByTestId("buyer-member-dialog")).toBeVisible()

    const sellField = page.getByTestId("buyer-member-dialog-property-to-sell-address")
    await expect(sellField).toBeVisible()
    await expect(sellField).toHaveValue("")
  })

  // ──────────────────────────────────────────────────────────────────────────
  // 7. Saving a distinct property-to-sell address sends it in the API payload
  // ──────────────────────────────────────────────────────────────────────────

  test("saving member sends property-to-sell address in POST payload", async ({ page }) => {
    await stubMembers(page, [])
    await openFirstBuyerEditDialog(page)

    const tabs = page.getByTestId("panda-entities-buyer-tabs")
    await expect(tabs).toBeVisible({ timeout: 10_000 })

    let capturedBody: Record<string, unknown> | null = null
    await page.route("**/api/admin/entity-members", async (route) => {
      if (route.request().method() === "POST") {
        capturedBody = JSON.parse(route.request().postData() ?? "{}") as Record<string, unknown>
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            entityMemberId: 999,
            entityId: 1,
            memberName: "New Member",
            memberAddress: "10 Home St",
            propertyToSellAddress: "55 Sell Ave",
            memberPhoneNumber: null,
            memberEmailAddress: null,
            scheduledViewingDate: null,
            isBuyersRepresentative: false,
          }),
        })
      } else {
        await route.continue()
      }
    })

    await tabs.getByRole("button", { name: /add new/i }).click()
    const dialog = page.getByTestId("buyer-member-dialog")
    await expect(dialog).toBeVisible()

    await dialog.getByLabel(/name/i).fill("New Member")
    await dialog.getByLabel(/^address$/i).fill("10 Home St")
    await dialog.getByTestId("buyer-member-dialog-property-to-sell-address").fill("55 Sell Ave")

    await page.getByTestId("buyer-member-dialog-save").click()

    await expect.poll(() => capturedBody).not.toBeNull()
    expect(capturedBody).toMatchObject({
      memberName: "New Member",
      memberAddress: "10 Home St",
      propertyToSellAddress: "55 Sell Ave",
    })
  })

  // ──────────────────────────────────────────────────────────────────────────
  // 8. Member row shows property-to-sell label/heading
  // ──────────────────────────────────────────────────────────────────────────

  test("member row includes a property-to-sell label", async ({ page }) => {
    await stubMembers(page, [MEMBER_WITH_HOME_ADDRESS])
    await openFirstBuyerEditDialog(page)

    const tabs = page.getByTestId("panda-entities-buyer-tabs")
    await expect(tabs).toBeVisible({ timeout: 10_000 })

    await expect(
      tabs.getByTestId(`buyer-member-property-to-sell--${MEMBER_WITH_HOME_ADDRESS.entityMemberId}`),
    ).toBeVisible()
  })
})
