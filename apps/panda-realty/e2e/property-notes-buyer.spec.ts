import { expect, test } from "@playwright/test"

import {
  e2eAdminCredentials,
  e2ePandaAdminListApiConfigured,
  signInAsAdmin,
} from "./helpers/admin-auth"
import { openNotesTab } from "./helpers/agent-note-helpers"

test.beforeEach(async ({ page }) => {
  test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")
  test.skip(
    !e2ePandaAdminListApiConfigured,
    "DATABASE_URL not set — admin list uses live APIs (see apps/panda-realty/.env.example)",
  )
  await signInAsAdmin(page)
})

test.describe("Panda Realty admin — property notes buyer association", () => {
  test("Assign-to dropdown lists buyers under a Buyers group heading", async ({ page }) => {
    const panel = await openNotesTab(page)

    await panel.getByRole("combobox").filter({ hasText: "None" }).click()
    await expect(page.getByPlaceholder("Search…")).toBeVisible({ timeout: 5_000 })

    const buyersHeading = page.locator("[cmdk-group-heading]").filter({ hasText: "Buyers" })
    const hasBuyers = await buyersHeading.isVisible()
    if (!hasBuyers) {
      await page.keyboard.press("Escape")
      test.skip(true, "No buyers linked to the first pipeline property — skipping")
      return
    }

    await expect(buyersHeading).toBeVisible()
    await page.keyboard.press("Escape")
  })

  test("note assigned to buyer shows buyer name in header and appears in filter", async ({ page }) => {
    const panel = await openNotesTab(page)

    // Open the Assign to combobox and look for buyers
    await panel.getByRole("combobox").filter({ hasText: "None" }).click()
    await expect(page.getByPlaceholder("Search…")).toBeVisible({ timeout: 5_000 })

    const buyersHeading = page.locator("[cmdk-group-heading]").filter({ hasText: "Buyers" })
    const hasBuyers = await buyersHeading.isVisible()
    if (!hasBuyers) {
      await page.keyboard.press("Escape")
      test.skip(true, "No buyers linked to the first pipeline property — skipping")
      return
    }

    // Pick the first buyer option that is a child of the Buyers group
    const buyersGroup = page.locator("[cmdk-group]").filter({ has: buyersHeading })
    const firstBuyerOption = buyersGroup.getByRole("option").first()
    const buyerName = (await firstBuyerOption.textContent())?.trim() ?? ""
    expect(buyerName.length).toBeGreaterThan(0)

    await firstBuyerOption.click()
    // Combobox trigger should now show the buyer name
    await expect(panel.getByRole("combobox").filter({ hasText: buyerName })).toBeVisible()

    // Submit a note linked to this buyer
    const noteText = `Buyer link test ${Date.now()}`
    await panel.locator('textarea[placeholder="Type a note…"]').fill(noteText)
    await panel.getByRole("button", { name: "Add Note" }).click()

    // Note text appears
    await expect.poll(
      () => panel.locator(`text=${noteText}`).count(),
      { timeout: 10_000 },
    ).toBeGreaterThan(0)

    // Buyer name shown in the note's metadata header
    await expect(panel.locator(`text=${buyerName}`).first()).toBeVisible()

    // "Filter by buyer" dropdown should now contain this buyer
    await expect(panel.getByText("Filter by buyer:")).toBeVisible()
    await panel.getByRole("combobox").filter({ hasText: "All buyers" }).click()
    await expect(page.getByRole("option", { name: buyerName })).toBeVisible()
    await page.getByRole("option", { name: buyerName }).click()

    // After filtering, the linked note should still be visible
    await expect(panel.locator(`text=${noteText}`).first()).toBeVisible({ timeout: 5_000 })
  })

  test("buyer filter hides notes not linked to that buyer", async ({ page }) => {
    const panel = await openNotesTab(page)

    // First, add an unlinked note
    const unlinkedNote = `Unlinked note ${Date.now()}`
    await panel.locator('textarea[placeholder="Type a note…"]').fill(unlinkedNote)
    await panel.getByRole("button", { name: "Add Note" }).click()
    await expect.poll(
      () => panel.locator(`text=${unlinkedNote}`).count(),
      { timeout: 10_000 },
    ).toBeGreaterThan(0)

    // If there's a buyer filter, select any buyer and verify unlinked note disappears
    const filterCombobox = panel.getByRole("combobox").filter({ hasText: "All buyers" })
    const hasFilter = await filterCombobox.isVisible()
    if (!hasFilter) {
      test.skip(true, "No buyer-linked notes on this property — filter not shown")
      return
    }

    await filterCombobox.click()
    // Select first named buyer (not "All buyers")
    const buyerOption = page.getByRole("option").filter({ hasNot: page.locator('[data-value="__all__"]') }).first()
    const buyerName = (await buyerOption.textContent())?.trim() ?? ""
    await buyerOption.click()

    // The unlinked note should not appear when filtered by a specific buyer
    await expect(panel.locator(`text=${unlinkedNote}`)).not.toBeVisible({ timeout: 5_000 })
  })
})
