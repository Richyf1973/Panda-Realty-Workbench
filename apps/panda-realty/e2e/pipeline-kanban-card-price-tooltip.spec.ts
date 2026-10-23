/**
 * E2E: Sellers pipeline kanban card — appraised vs contract price display with tooltip.
 *
 * Uses live DB — `globalSetup` seeds fixtures when DATABASE_URL is set.
 * Seed guarantees:
 *   PANDA_PIPELINE_SEED_CARD_ADDRESS_SNIPPET  — accepted offer $500k, appraised $480k → shows $500k
 *   PANDA_E2E_SELLERS_NO_OFFER_SNIPPET        — no accepted offer, appraised $380k     → shows $380k
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

test.describe("Sellers pipeline — kanban card price & tooltip", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaLiveE2eEnv()
    await signInAsAdmin(page)
    await gotoSellersPipeline(page)
  })

  // --- Happy path: no accepted offer ---

  test("card without accepted offer shows the appraised price", async ({ page }) => {
    const card = sellersCardByAddressSnippet(page, PANDA_E2E_SELLERS_NO_OFFER_SNIPPET).first()
    await expect(card).toBeVisible({ timeout: 20_000 })

    const priceEl = card.getByTestId("kanban-card-price")
    await expect(priceEl).toBeVisible()
    await expect(priceEl).toContainText("380,000")
  })

  test("hovering the price on a card without accepted offer shows 'Showing appraised price' tooltip", async ({ page }) => {
    const card = sellersCardByAddressSnippet(page, PANDA_E2E_SELLERS_NO_OFFER_SNIPPET).first()
    await expect(card).toBeVisible({ timeout: 20_000 })

    const priceEl = card.getByTestId("kanban-card-price")
    await expect(priceEl).toBeVisible()
    await priceEl.hover()
    await expect(page.getByRole("tooltip")).toContainText(
      "Showing appraised price — no accepted offer yet",
    )
  })

  // --- Happy path: accepted offer exists ---

  test("card with accepted offer shows the contract price (not the appraised price)", async ({ page }) => {
    const card = sellersCardByAddressSnippet(page, PANDA_PIPELINE_SEED_CARD_ADDRESS_SNIPPET).first()
    await expect(card).toBeVisible({ timeout: 20_000 })

    const priceEl = card.getByTestId("kanban-card-price")
    await expect(priceEl).toBeVisible()
    // Contract price ($500k) should be visible; appraised ($480k) should not
    await expect(priceEl).toContainText("500,000")
    await expect(priceEl).not.toContainText("480,000")
  })

  test("hovering the price on a card with accepted offer shows 'Showing contract price' tooltip", async ({ page }) => {
    const card = sellersCardByAddressSnippet(page, PANDA_PIPELINE_SEED_CARD_ADDRESS_SNIPPET).first()
    await expect(card).toBeVisible({ timeout: 20_000 })

    const priceEl = card.getByTestId("kanban-card-price")
    await expect(priceEl).toBeVisible()
    await priceEl.hover()
    await expect(page.getByRole("tooltip")).toContainText(
      "Showing contract price — offer accepted",
    )
  })

  // --- Edge case: OFFER ACCEPTED badge still present alongside contract price ---

  test("card with accepted offer still shows the OFFER ACCEPTED badge below the price", async ({ page }) => {
    const card = sellersCardByAddressSnippet(page, PANDA_PIPELINE_SEED_CARD_ADDRESS_SNIPPET).first()
    await expect(card).toBeVisible({ timeout: 20_000 })

    await expect(card.getByTestId("kanban-card-price")).toBeVisible()
    await expect(
      card.locator('[data-testid^="kanban-card-buyer-offer-accepted--"]'),
    ).toBeVisible()
  })
})
