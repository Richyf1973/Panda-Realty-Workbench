/**
 * E2E: Calendar and History tabs removed — property and buyer detail panels
 *
 * Verifies the Calendar tab is gone from both panels and that the last
 * tab is Meetings in both the property and buyer panels.
 *
 * Requires: E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD + DATABASE_URL.
 */

import { expect, test } from "@playwright/test"

import { signInAsAdmin } from "./helpers/admin-auth"
import {
  buyersCardByAddressSnippet,
  gotoBuyersPipeline,
  gotoSellersPipeline,
  openBuyerPanel,
  openPropertyPanel,
  PANDA_E2E_BUYERS_SEED_SNIPPET,
  PANDA_PIPELINE_SEED_CARD_ADDRESS_SNIPPET,
  sellersCardByAddressSnippet,
} from "./helpers/panda-pipeline-panels"
import { requirePandaLiveE2eEnv } from "./helpers/require-panda-live-e2e-env"

test.describe("Property detail panel — tab bar after Calendar removal", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaLiveE2eEnv()
    await signInAsAdmin(page)
    await gotoSellersPipeline(page)
  })

  test("Calendar tab is absent from the property panel tab bar", async ({ page }) => {
    const card = sellersCardByAddressSnippet(page, PANDA_PIPELINE_SEED_CARD_ADDRESS_SNIPPET).first()
    await expect(card).toBeVisible({ timeout: 20_000 })

    const panel = await openPropertyPanel(page, card)

    await expect(panel.getByTestId("property-panel-tab--calendar")).toHaveCount(0)
  })

  test("History tab is also absent from the property panel tab bar", async ({ page }) => {
    const card = sellersCardByAddressSnippet(page, PANDA_PIPELINE_SEED_CARD_ADDRESS_SNIPPET).first()
    await expect(card).toBeVisible({ timeout: 20_000 })

    const panel = await openPropertyPanel(page, card)

    await expect(panel.getByTestId("property-panel-tab--history")).toHaveCount(0)
  })

  test("Meetings is the last tab in the property panel tab bar", async ({ page }) => {
    const card = sellersCardByAddressSnippet(page, PANDA_PIPELINE_SEED_CARD_ADDRESS_SNIPPET).first()
    await expect(card).toBeVisible({ timeout: 20_000 })

    const panel = await openPropertyPanel(page, card)

    const tabs = panel.locator('[data-testid^="property-panel-tab--"]')
    const count = await tabs.count()
    expect(count).toBeGreaterThan(0)
    const lastTab = tabs.nth(count - 1)
    await expect(lastTab).toHaveText("Meetings")
  })
})

test.describe("Buyer detail panel — tab bar after Calendar removal", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaLiveE2eEnv()
    await signInAsAdmin(page)
    await gotoBuyersPipeline(page)
  })

  test("Calendar tab is absent from the buyer panel tab bar", async ({ page }) => {
    const card = buyersCardByAddressSnippet(page, PANDA_E2E_BUYERS_SEED_SNIPPET).first()
    await expect(card).toBeVisible({ timeout: 20_000 })

    const panel = await openBuyerPanel(page, card)

    await expect(panel.getByTestId("buyer-panel-tab--calendar")).toHaveCount(0)
  })

  test("Meetings is the last tab in the buyer panel tab bar", async ({ page }) => {
    const card = buyersCardByAddressSnippet(page, PANDA_E2E_BUYERS_SEED_SNIPPET).first()
    await expect(card).toBeVisible({ timeout: 20_000 })

    const panel = await openBuyerPanel(page, card)

    const tabs = panel.locator('[data-testid^="buyer-panel-tab--"]')
    const count = await tabs.count()
    expect(count).toBeGreaterThan(0)
    const lastTab = tabs.nth(count - 1)
    await expect(lastTab).toHaveText("Meetings")
  })
})
