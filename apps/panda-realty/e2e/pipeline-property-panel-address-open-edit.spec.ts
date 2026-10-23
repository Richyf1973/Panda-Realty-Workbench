/**
 * E2E: Sellers pipeline — property panel address opens admin property edit in a new tab (`openEdit` deep link).
 *
 * Requires: E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD + DATABASE_URL.
 * Playwright globalSetup runs `e2e/scripts/seed-sellers-pipeline-accepted-offer.mjs` when DATABASE_URL is set.
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

test.describe("Property panel — address opens edit in new tab", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaLiveE2eEnv()
    await signInAsAdmin(page)
    await gotoSellersPipeline(page)
  })

  test("address link opens /admin/properties in a new tab and opens property CRUD dialog", async ({
    page,
  }) => {
    const card = sellersCardByAddressSnippet(page, PANDA_PIPELINE_SEED_CARD_ADDRESS_SNIPPET).first()
    await expect(card).toBeVisible({ timeout: 20_000 })

    const panel = await openPropertyPanel(page, card)

    const addressLink = panel.getByTestId("property-detail-panel-address-open-edit")
    await expect(addressLink).toBeVisible()
    await expect(addressLink).toHaveAttribute("target", "_blank")
    await expect(addressLink).toHaveAttribute(
      "href",
      /\/admin\/properties\?openEdit=\d+/,
    )

    const popupPromise = page.waitForEvent("popup")
    await addressLink.click()
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
