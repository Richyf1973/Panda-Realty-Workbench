/**
 * E2E: Buyer Overview — property card opens admin property edit in a new tab (openEdit deep link)
 *
 * Requires: E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD + DATABASE_URL.
 * Playwright globalSetup runs `e2e/scripts/seed-sellers-pipeline-accepted-offer.mjs` when DATABASE_URL is set.
 */

import { expect, test } from "@playwright/test"

import { signInAsAdmin } from "./helpers/admin-auth"
import {
  buyersCardByAddressSnippet,
  gotoBuyersPipeline,
  openBuyerPanel,
  PANDA_E2E_BUYERS_SEED_SNIPPET,
} from "./helpers/panda-pipeline-panels"
import { requirePandaLiveE2eEnv } from "./helpers/require-panda-live-e2e-env"

test.describe("Buyer overview — open property in admin", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaLiveE2eEnv()
    await signInAsAdmin(page)
    await gotoBuyersPipeline(page)
  })

  test("property card opens /admin/properties in a new tab and opens property CRUD dialog", async ({
    page,
  }) => {
    const card = buyersCardByAddressSnippet(page, PANDA_E2E_BUYERS_SEED_SNIPPET).first()
    await expect(card).toBeVisible({ timeout: 20_000 })

    const panel = await openBuyerPanel(page, card)

    const propertyCard = panel.getByTestId("buyer-overview-property-card")
    await expect(propertyCard).toBeVisible()

    const popupPromise = page.waitForEvent("popup")
    await propertyCard.click()
    const propertiesPage = await popupPromise

    await propertiesPage.waitForURL((u) => u.pathname === "/admin/properties", { timeout: 20_000 })

    await expect(propertiesPage.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible({
      timeout: 30_000,
    })
    await expect(propertiesPage.getByTestId("panda-properties-dialog-form")).toBeVisible({
      timeout: 30_000,
    })
  })
})
