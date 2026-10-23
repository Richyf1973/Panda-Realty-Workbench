/**
 * E2E: Sellers pipeline — Summary tab "Buyer address" row.
 *
 * Verifies that the Address field shows the accepted buyer's rep member's
 * memberAddress (not the property's own address), and shows "No address on file"
 * when no member has a memberAddress set.
 *
 * Seed: `npm run e2e:seed:sellers-accepted -w panda-realty`
 * Rep member "E2E Seed Buyers Rep" has member_address = "42 E2E Rep Home Street, Brisbane QLD 4001".
 */

import { expect, test } from "@playwright/test"

import { signInAsAdmin } from "./helpers/admin-auth"
import {
  gotoSellersPipeline,
  PANDA_E2E_SELLERS_NO_OFFER_SNIPPET,
  PANDA_PIPELINE_SEED_CARD_ADDRESS_SNIPPET,
  sellersCardByAddressSnippet,
} from "./helpers/panda-pipeline-panels"
import { requirePandaLiveE2eEnv } from "./helpers/require-panda-live-e2e-env"

const SEED_REP_MEMBER_ADDRESS = "42 E2E Rep Home Street, Brisbane QLD 4001"

test.describe("Sellers pipeline — Summary tab Buyer address row", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaLiveE2eEnv()
    await signInAsAdmin(page)
    await gotoSellersPipeline(page)
  })

  test("Buyer address row shows rep member's memberAddress for property with accepted offer", async ({
    page,
  }) => {
    const card = sellersCardByAddressSnippet(page, PANDA_PIPELINE_SEED_CARD_ADDRESS_SNIPPET).first()
    await expect(card).toBeVisible({ timeout: 20_000 })
    await card.click()
    await expect(page.getByTestId("panel-content-ready")).toBeVisible({ timeout: 10_000 })

    const row = page.getByTestId("panda-property-summary-row--buyer-address")
    await expect(row).toBeVisible()
    await expect(row.locator("dd")).toContainText(SEED_REP_MEMBER_ADDRESS)
  })

  test("Buyer address row label reads 'Buyer address' not 'Address'", async ({ page }) => {
    const card = sellersCardByAddressSnippet(page, PANDA_PIPELINE_SEED_CARD_ADDRESS_SNIPPET).first()
    await expect(card).toBeVisible({ timeout: 20_000 })
    await card.click()
    await expect(page.getByTestId("panel-content-ready")).toBeVisible({ timeout: 10_000 })

    const row = page.getByTestId("panda-property-summary-row--buyer-address")
    await expect(row).toBeVisible()
    await expect(row.locator("dt")).toHaveText("Buyer address")
  })

  test("Buyer address row does not show the property's own street address", async ({ page }) => {
    const card = sellersCardByAddressSnippet(page, PANDA_PIPELINE_SEED_CARD_ADDRESS_SNIPPET).first()
    await expect(card).toBeVisible({ timeout: 20_000 })
    await card.click()
    await expect(page.getByTestId("panel-content-ready")).toBeVisible({ timeout: 10_000 })

    const row = page.getByTestId("panda-property-summary-row--buyer-address")
    await expect(row).toBeVisible()
    // The property's address snippet must not appear in the buyer address row
    await expect(row.locator("dd")).not.toContainText(PANDA_PIPELINE_SEED_CARD_ADDRESS_SNIPPET)
  })

  test("Buyer address row shows 'No address on file' when buyer has no members with a memberAddress", async ({
    page,
  }) => {
    // "98 E2E No-Offer" buyer entity has no seeded members — memberAddress is null
    const card = sellersCardByAddressSnippet(page, PANDA_E2E_SELLERS_NO_OFFER_SNIPPET).first()
    await expect(card).toBeVisible({ timeout: 20_000 })
    await card.click()
    await expect(page.getByTestId("panel-content-ready")).toBeVisible({ timeout: 10_000 })

    const row = page.getByTestId("panda-property-summary-row--buyer-address")
    await expect(row).toBeVisible()
    await expect(row.locator("dd")).toContainText("No address on file")
  })

  test("old 'panda-property-summary-row--address' testid no longer exists", async ({ page }) => {
    const card = sellersCardByAddressSnippet(page, PANDA_PIPELINE_SEED_CARD_ADDRESS_SNIPPET).first()
    await expect(card).toBeVisible({ timeout: 20_000 })
    await card.click()
    await expect(page.getByTestId("panel-content-ready")).toBeVisible({ timeout: 10_000 })

    await expect(page.getByTestId("panda-property-summary-row--address")).toHaveCount(0)
  })
})
