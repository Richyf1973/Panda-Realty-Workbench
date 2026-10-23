import { expect, test } from "@playwright/test"

import {
  e2eAdminCredentials,
  e2ePandaAdminListApiConfigured,
  signInAsAdmin,
} from "./helpers/admin-auth"

test.describe("Edit Buyer dialog — Buyer tabs (Members / Requirements / Status)", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")
    test.skip(
      !e2ePandaAdminListApiConfigured,
      "DATABASE_URL not set — admin list uses live APIs (see apps/panda-realty/.env.example)",
    )

    // Stub entity-members so the test is data-independent
    await page.route("**/api/admin/entity-members**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: [] }),
      })
    })

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

  // ──────────────────────────────────────────────────────────────────────────
  // 1. Tab container is present with the Members tab active by default
  // ──────────────────────────────────────────────────────────────────────────

  test("buyer tabs container is visible in edit dialog with Members tab default", async ({ page }) => {
    await openFirstBuyerEditDialog(page)

    const tabs = page.getByTestId("panda-entities-buyer-tabs")
    await expect(tabs).toBeVisible({ timeout: 10_000 })

    await expect(page.getByTestId("panda-entities-buyer-tab--members")).toBeVisible()
    await expect(page.getByTestId("panda-entities-buyer-tab--requirements")).toBeVisible()
    await expect(page.getByTestId("panda-entities-buyer-tab--status")).toBeVisible()
  })

  // ──────────────────────────────────────────────────────────────────────────
  // 2. DOM order: tab container → property connections
  // ──────────────────────────────────────────────────────────────────────────

  test("buyer tabs container sits above property connections", async ({ page }) => {
    await openFirstBuyerEditDialog(page)

    const dialogForm = page.getByTestId("panda-entities-dialog-form")
    await dialogForm.evaluate((el) => el.scrollTo(0, el.scrollHeight))

    const tabsBox = await page
      .getByTestId("panda-entities-buyer-tabs")
      .boundingBox()
    const connectionsBox = await page
      .getByTestId("panda-entities-property-connections")
      .boundingBox()

    expect(tabsBox).not.toBeNull()
    expect(connectionsBox).not.toBeNull()

    expect(tabsBox!.y).toBeLessThan(connectionsBox!.y)
  })

  // ──────────────────────────────────────────────────────────────────────────
  // 3. Empty state renders on Members tab (stubbed API returns 0 members)
  // ──────────────────────────────────────────────────────────────────────────

  test("Members tab shows empty state when no members", async ({ page }) => {
    await openFirstBuyerEditDialog(page)

    const tabs = page.getByTestId("panda-entities-buyer-tabs")
    await expect(tabs).toBeVisible({ timeout: 10_000 })

    // The panel empty-state paragraph reads "No members added yet."
    await expect(
      tabs.getByText("No members added yet."),
    ).toBeVisible({ timeout: 8_000 })
  })

  // ──────────────────────────────────────────────────────────────────────────
  // 4. "Add new" button is reachable from the Members tab
  // ──────────────────────────────────────────────────────────────────────────

  test("Members tab has an Add new button", async ({ page }) => {
    await openFirstBuyerEditDialog(page)

    const tabs = page.getByTestId("panda-entities-buyer-tabs")
    await expect(tabs).toBeVisible({ timeout: 10_000 })

    await expect(tabs.getByRole("button", { name: /add new/i })).toBeVisible()
  })

  // ──────────────────────────────────────────────────────────────────────────
  // 5. "Buyer members" tab is GONE from the Property Connection tab strip
  // ──────────────────────────────────────────────────────────────────────────

  test("property connections tabs no longer include Buyer members tab", async ({ page }) => {
    await openFirstBuyerEditDialog(page)

    const dialogForm = page.getByTestId("panda-entities-dialog-form")
    await dialogForm.evaluate((el) => el.scrollTo(0, el.scrollHeight))

    const connections = page.getByTestId("panda-entities-property-connections")
    await expect(connections).toBeVisible({ timeout: 10_000 })

    // Wait for the tab strip to finish loading
    const offerTab = connections.getByRole("tab", { name: /offers/i })
    await expect(offerTab).toBeVisible({ timeout: 8_000 })

    // Buyer members tab must be absent
    await expect(connections.getByRole("tab", { name: /buyer members/i })).toHaveCount(0)

    // Remaining tabs: Offers, Files, Notes
    await expect(connections.getByRole("tab", { name: /files/i })).toBeVisible()
    await expect(connections.getByRole("tab", { name: /notes/i })).toBeVisible()
  })
})
