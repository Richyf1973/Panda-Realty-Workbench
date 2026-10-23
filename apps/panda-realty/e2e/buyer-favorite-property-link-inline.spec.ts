/**
 * Edit Buyer → Property Connections: inline link to a property via favorites select.
 */

import { expect, test } from "@playwright/test"

import { requirePandaE2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import { installBuyerFavoriteLinkInlineMocks } from "./helpers/buyer-favorite-link-inline-mocks"

test.describe("Edit Buyer — link property inline", () => {
  test.describe.configure({ timeout: 120_000 })

  test("no Add new; select favorite from dropdown, Link issues POST and opens workspace", async ({
    page,
  }) => {
    requirePandaE2eAdminCredentials()

    const { postBodies } = await installBuyerFavoriteLinkInlineMocks(page)

    await signInAsAdmin(page)

    await page.goto(
      "/admin/entities?limit=25&page=1&sortKey=entityName&sortDir=asc&entityCategoryId=1&listLayout=grid",
    )
    await page.waitForLoadState("domcontentloaded")

    const editTrigger = page.getByTestId(/^admin-entity-row-edit--entities--/).first()
    await editTrigger.waitFor({ state: "visible", timeout: 25_000 })
    await editTrigger.click()

    const dialog = page.getByTestId("admin-entity-crud-dialog--entities")
    await expect(dialog).toBeVisible({ timeout: 25_000 })
    await expect(dialog.getByTestId("panda-entities-dialog-form")).toBeVisible()

    const dialogForm = dialog.getByTestId("panda-entities-dialog-form")
    await dialogForm.evaluate((el) => el.scrollTo(0, el.scrollHeight))

    const connections = dialog.getByTestId("panda-entities-property-connections")
    await expect(connections).toBeVisible({ timeout: 15_000 })

    await expect(connections.getByRole("button", { name: /^add new$/i })).toHaveCount(0)

    // The select should appear with all favorite properties
    const propertySelect = connections.getByTestId(
      "panda-entities-property-connections--select",
    )
    await expect(propertySelect).toBeVisible({ timeout: 15_000 })
    await propertySelect.scrollIntoViewIfNeeded()

    // Open the select and choose the favorite property
    await propertySelect.click()
    await page.getByRole("option", { name: /54 Valley Drive/i }).click()

    // Link button appears beside the select when an unlinked favorite is selected
    const linkBtn = connections.getByTestId("panda-entities-property-connections--link-btn")
    await expect(linkBtn).toBeVisible({ timeout: 5_000 })
    await linkBtn.click()

    await expect.poll(() => postBodies.length).toBeGreaterThan(0)
    const posted = postBodies[postBodies.length - 1]!
    expect(String(posted.entityId)).toBe("201")
    expect(String(posted.propertyListId)).toBe("3001")
    expect(posted.isOriginalOwner).toBe("false")

    await expect(
      connections.getByTestId("panda-entities-property-connections--workspace"),
    ).toBeVisible({ timeout: 20_000 })
  })

  test("unlinked favorite shows workspace placeholder and Link button; link btn disappears after linking", async ({
    page,
  }) => {
    requirePandaE2eAdminCredentials()

    await installBuyerFavoriteLinkInlineMocks(page)

    await signInAsAdmin(page)

    await page.goto(
      "/admin/entities?limit=25&page=1&sortKey=entityName&sortDir=asc&entityCategoryId=1&listLayout=grid",
    )
    await page.waitForLoadState("domcontentloaded")

    const editTrigger = page.getByTestId(/^admin-entity-row-edit--entities--/).first()
    await editTrigger.waitFor({ state: "visible", timeout: 25_000 })
    await editTrigger.click()

    const dialog = page.getByTestId("admin-entity-crud-dialog--entities")
    await expect(dialog).toBeVisible({ timeout: 25_000 })

    const dialogForm = dialog.getByTestId("panda-entities-dialog-form")
    await dialogForm.evaluate((el) => el.scrollTo(0, el.scrollHeight))

    const connections = dialog.getByTestId("panda-entities-property-connections")
    await expect(connections).toBeVisible({ timeout: 15_000 })

    const propertySelect = connections.getByTestId(
      "panda-entities-property-connections--select",
    )
    await expect(propertySelect).toBeVisible({ timeout: 15_000 })
    await propertySelect.scrollIntoViewIfNeeded()

    // Select the unlinked favorite
    await propertySelect.click()
    await page.getByRole("option", { name: /54 Valley Drive/i }).click()

    // Workspace shows placeholder text, not pipeline controls
    const workspace = connections.getByTestId(
      "panda-entities-property-connections--workspace",
    )
    await expect(workspace).toBeVisible({ timeout: 10_000 })
    await expect(workspace).toContainText(/link the buyer to this property first/i)

    // Link button is visible
    await expect(
      connections.getByTestId("panda-entities-property-connections--link-btn"),
    ).toBeVisible()

    // After linking, Link button disappears and workspace shows pipeline controls
    await connections.getByTestId("panda-entities-property-connections--link-btn").click()

    await expect(
      connections.getByTestId("panda-entities-property-connections--link-btn"),
    ).toHaveCount(0, { timeout: 10_000 })

    await expect(workspace).not.toContainText(/link the buyer to this property first/i, {
      timeout: 10_000,
    })
  })
})
