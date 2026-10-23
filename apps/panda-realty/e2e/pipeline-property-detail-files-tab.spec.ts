/**
 * E2E: Property detail panel — Files tab shows property-level files.
 *
 * Regression for the bug where files uploaded via the edit dialog (stored in
 * property_list_files) were not appearing in the detail panel's Files tab.
 */

import { expect, test } from "@playwright/test"

import { signInAsAdmin } from "./helpers/admin-auth"
import {
  gotoSellersPipeline,
  openPropertyPanel,
  PANDA_PIPELINE_SEED_CARD_ADDRESS_SNIPPET,
  sellersCardByAddressSnippet,
} from "./helpers/panda-pipeline-panels"
import { requirePandaLiveE2eEnv } from "./helpers/require-panda-live-e2e-env"

test.describe("Property detail panel — Files tab", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaLiveE2eEnv()
    await signInAsAdmin(page)
    await gotoSellersPipeline(page)
  })

  test("Files tab shows property-level file seeded via property_list_files", async ({ page }) => {
    const card = sellersCardByAddressSnippet(page, PANDA_PIPELINE_SEED_CARD_ADDRESS_SNIPPET).first()
    await expect(card).toBeVisible({ timeout: 20_000 })
    const panel = await openPropertyPanel(page, card)

    await panel.getByTestId("property-panel-tab--files").click()

    // Seeded in seed-panda-pipeline-fixture.mjs: "E2E Seed File.pdf"
    await expect(panel.getByText("E2E Seed File.pdf")).toBeVisible({ timeout: 10_000 })
    await expect(panel.getByText("No files attached yet.")).toHaveCount(0)
  })

  test("Files tab shows empty state for a property with no files", async ({ page }) => {
    // The "98 E2E No-Offer" property has no seeded files
    const card = sellersCardByAddressSnippet(page, "98 E2E No-Offer").first()
    await expect(card).toBeVisible({ timeout: 20_000 })
    const panel = await openPropertyPanel(page, card)

    await panel.getByTestId("property-panel-tab--files").click()

    await expect(panel.getByText("No files attached yet.")).toBeVisible({ timeout: 10_000 })
  })
})
