// Run: npm run test:e2e:scratch -- --app=panda-realty --spec="apps/panda-realty/e2e/admin-properties-notes-global-tab-edge-cases.spec.ts" --no-bail

import { expect, test } from "@playwright/test"

import { e2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import {
  BUYER_NOTE,
  NON_FAVOURITE_PROPERTY,
  openNotesTab,
  setupAndOpenDialog,
} from "./helpers/panda-properties-notes-helpers"

test.beforeEach(async ({ page }) => {
  test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")
  await signInAsAdmin(page)
})

test.describe("Panda Realty — property notes global tab edge cases", () => {
  test("Notes tab trigger absent on non-favourite property", async ({ page }) => {
    await setupAndOpenDialog(page, { property: NON_FAVOURITE_PROPERTY })

    const tabsList = page.getByTestId("panda-properties-form-bottom-tabs")
    await expect(tabsList).not.toBeVisible({ timeout: 5_000 })

    const trigger = page.getByTestId("panda-properties-form-tab-trigger--notes")
    await expect(trigger).not.toBeVisible()
  })

  test("Favourite property with zero notes shows empty-state message", async ({ page }) => {
    await setupAndOpenDialog(page, { notes: [] })
    await openNotesTab(page)

    const emptyState = page.getByTestId("property-notes-global-empty")
    await expect(emptyState).toBeVisible({ timeout: 10_000 })
  })

  test("Property with entity-notes-only shows no Owner or Property chips", async ({ page }) => {
    await setupAndOpenDialog(page, { notes: [BUYER_NOTE] })
    await openNotesTab(page)

    await expect(page.getByTestId("property-notes-global-item")).toHaveCount(1)
    await expect(page.getByTestId("property-notes-global-chip--owner-1")).not.toBeVisible()
    await expect(page.getByTestId("property-notes-global-chip--owner-2")).not.toBeVisible()
    await expect(page.getByTestId("property-notes-global-chip--property")).not.toBeVisible()
    await expect(page.getByTestId("property-notes-global-chip--buyer")).toBeVisible()
  })
})
