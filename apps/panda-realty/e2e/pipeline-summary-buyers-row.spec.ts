/**
 * E2E: Buyers row display logic on the property detail Summary tab.
 *
 * Three states:
 *   1. No offers at all          → show all linked buyers
 *   2. Offers exist, none accepted → show only buyers who have ≥1 offer
 *   3. Offer accepted             → show only the accepted offerer
 *
 * Fixtures (seeded by globalSetup via seed-panda-pipeline-fixture.mjs):
 *   "93 E2E No-Buyer-Offers"  — 1 buyer, 0 offer rows               (state 1)
 *   "98 E2E No-Offer"         — 1 buyer with is_accepted=false offer (state 2)
 *   "99 E2E Seed Street"      — 1 buyer with is_accepted=true offer  (state 3)
 *
 * Requires live E2E env (DATABASE_URL + admin credentials).
 */

import { expect, test } from "@playwright/test"

import { signInAsAdmin } from "./helpers/admin-auth"
import {
  goToPropertySummaryTab,
  gotoSellersPipeline,
  openPropertyPanel,
  PANDA_E2E_SELLERS_NO_BUYER_OFFERS_SNIPPET,
  PANDA_E2E_SELLERS_NO_OFFER_SNIPPET,
  PANDA_PIPELINE_SEED_CARD_ADDRESS_SNIPPET,
  sellersCardByAddressSnippet,
} from "./helpers/panda-pipeline-panels"
import { requirePandaLiveE2eEnv } from "./helpers/require-panda-live-e2e-env"

test.describe("Summary tab — buyers row display logic", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaLiveE2eEnv()
    await signInAsAdmin(page)
    await gotoSellersPipeline(page)
  })

  // ── State 1: no offers at all ──────────────────────────────────────────────

  test("state 1 — no offers: buyers row shows all linked buyers", async ({ page }) => {
    const card = sellersCardByAddressSnippet(page, PANDA_E2E_SELLERS_NO_BUYER_OFFERS_SNIPPET).first()
    await expect(card).toBeVisible({ timeout: 20_000 })
    const panel = await openPropertyPanel(page, card)
    await goToPropertySummaryTab(panel)

    const buyersRow = panel.getByTestId("panda-property-summary-row--buyers")
    await expect(buyersRow).toBeVisible()
    await expect(buyersRow).toContainText("E2E No-Offer Buyer (Playwright)")
  })

  // ── State 2: offers exist but none accepted ────────────────────────────────

  test("state 2 — offers pending: buyers row shows only buyers who have offers", async ({ page }) => {
    const card = sellersCardByAddressSnippet(page, PANDA_E2E_SELLERS_NO_OFFER_SNIPPET).first()
    await expect(card).toBeVisible({ timeout: 20_000 })
    const panel = await openPropertyPanel(page, card)
    await goToPropertySummaryTab(panel)

    const buyersRow = panel.getByTestId("panda-property-summary-row--buyers")
    await expect(buyersRow).toBeVisible()
    await expect(buyersRow).toContainText("E2E No-Accept Buyer (Playwright)")
    // Buyer with zero offer rows must not appear when other buyers have offers
    await expect(buyersRow).not.toContainText("E2E No-Offer Buyer (Playwright)")
  })

  // ── State 3: offer accepted ────────────────────────────────────────────────

  test("state 3 — accepted offer: buyers row shows only the accepted offerer", async ({ page }) => {
    const card = sellersCardByAddressSnippet(page, PANDA_PIPELINE_SEED_CARD_ADDRESS_SNIPPET).first()
    await expect(card).toBeVisible({ timeout: 20_000 })
    const panel = await openPropertyPanel(page, card)
    await goToPropertySummaryTab(panel)

    const buyersRow = panel.getByTestId("panda-property-summary-row--buyers")
    await expect(buyersRow).toBeVisible()
    await expect(buyersRow).toContainText("E2E Seed Buyer (Playwright)")
  })

  test("state 3 — accepted offer: buyers row shows exactly one item (only the accepted offerer)", async ({ page }) => {
    const card = sellersCardByAddressSnippet(page, PANDA_PIPELINE_SEED_CARD_ADDRESS_SNIPPET).first()
    await expect(card).toBeVisible({ timeout: 20_000 })
    const panel = await openPropertyPanel(page, card)
    await goToPropertySummaryTab(panel)

    const buyersRow = panel.getByTestId("panda-property-summary-row--buyers")
    await expect(buyersRow).toBeVisible()

    // Each buyer is wrapped in a "flex items-center" span inside the dd.
    const itemWrappers = buyersRow.locator("dd > span.flex")
    await expect(itemWrappers).toHaveCount(1)
  })
})
