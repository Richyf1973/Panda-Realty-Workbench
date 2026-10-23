/**
 * E2E: Property detail panel — tab visibility after History tab removal.
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

test.describe("Property detail panel — tab bar", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaLiveE2eEnv()
    await signInAsAdmin(page)
    await gotoSellersPipeline(page)
  })

  test("History tab is absent from the panel", async ({ page }) => {
    const card = sellersCardByAddressSnippet(page, PANDA_PIPELINE_SEED_CARD_ADDRESS_SNIPPET).first()
    await expect(card).toBeVisible({ timeout: 20_000 })
    const panel = await openPropertyPanel(page, card)

    await expect(panel.getByTestId("property-panel-tab--history")).toHaveCount(0)
  })

  test("all expected tabs are present", async ({ page }) => {
    const card = sellersCardByAddressSnippet(page, PANDA_PIPELINE_SEED_CARD_ADDRESS_SNIPPET).first()
    await expect(card).toBeVisible({ timeout: 20_000 })
    const panel = await openPropertyPanel(page, card)

    for (const tab of ["summary", "buyers", "contacts", "notes", "files", "offers", "meetings"]) {
      await expect(panel.getByTestId(`property-panel-tab--${tab}`)).toBeVisible()
    }
  })
})
