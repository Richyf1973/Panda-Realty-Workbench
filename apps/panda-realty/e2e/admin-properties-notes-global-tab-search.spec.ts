// Run: npm run test:e2e:scratch -- --app=panda-realty --spec="apps/panda-realty/e2e/admin-properties-notes-global-tab-search.spec.ts" --no-bail

import { expect, test } from "@playwright/test"

import { e2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import { openNotesTab, setupAndOpenDialog } from "./helpers/panda-properties-notes-helpers"

test.beforeEach(async ({ page }) => {
  test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")
  await signInAsAdmin(page)
})

test.describe("Panda Realty — property notes global tab search", () => {
  test("Typing in search input filters notes matching text (case-insensitive)", async ({
    page,
  }) => {
    await setupAndOpenDialog(page)
    await openNotesTab(page)

    const searchInput = page.getByTestId("property-notes-global-search")
    await expect(searchInput).toBeVisible({ timeout: 10_000 })

    await expect(page.getByTestId("property-notes-global-item")).toHaveCount(3)
    await searchInput.fill("follow up")

    const filteredItems = page.getByTestId("property-notes-global-item")
    await expect(filteredItems).toHaveCount(1)
    await expect(filteredItems.first()).toContainText("Follow up call scheduled for Monday")
  })

  test("Clearing search input restores all notes", async ({ page }) => {
    await setupAndOpenDialog(page)
    await openNotesTab(page)

    const searchInput = page.getByTestId("property-notes-global-search")
    await expect(searchInput).toBeVisible({ timeout: 10_000 })
    await searchInput.fill("follow up")
    await expect(page.getByTestId("property-notes-global-item")).toHaveCount(1)

    await searchInput.clear()
    await expect(page.getByTestId("property-notes-global-item")).toHaveCount(3)
  })

  test("Search with no matching text shows empty-results message", async ({ page }) => {
    await setupAndOpenDialog(page)
    await openNotesTab(page)

    const searchInput = page.getByTestId("property-notes-global-search")
    await expect(searchInput).toBeVisible({ timeout: 10_000 })
    await searchInput.fill("zzznomatch")

    const emptySearch = page.getByTestId("property-notes-global-no-results")
    await expect(emptySearch).toBeVisible({ timeout: 5_000 })
  })
})
