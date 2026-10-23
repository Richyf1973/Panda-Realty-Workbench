/**
 * E2E: Kanban cards — offer details removed from main dashboard
 *
 * Uses live DB — globalSetup seeds fixtures when DATABASE_URL is set.
 */

import { expect, test } from "@playwright/test"

import { signInAsAdmin } from "./helpers/admin-auth"
import {
  buyersCardByAddressSnippet,
  PANDA_E2E_BUYERS_SEED_SNIPPET,
  PANDA_PIPELINE_SEED_CARD_ADDRESS_SNIPPET,
  sellersCardByAddressSnippet,
} from "./helpers/panda-pipeline-panels"
import { requirePandaLiveE2eEnv } from "./helpers/require-panda-live-e2e-env"

test.describe("Kanban cards — offer details removed from main dashboard", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaLiveE2eEnv()
    await signInAsAdmin(page)
  })

  test("sellers pipeline: no buyer name/offer rows on any card", async ({ page }) => {
    await page.goto("/admin/pipeline?pipeline=sellers")
    await page.waitForLoadState("networkidle")
    await expect(page.locator('[data-testid^="kanban-column--"]').first()).toBeVisible({
      timeout: 15_000,
    })

    await expect(page.locator('[data-testid^="kanban-card-buyer--"]')).toHaveCount(0)
  })

  test("sellers pipeline: accepted offer uses compact badge (no per-offer rows on card)", async ({
    page,
  }) => {
    await page.goto("/admin/pipeline?pipeline=sellers")
    await page.waitForLoadState("networkidle")
    await expect(page.locator('[data-testid^="kanban-column--"]').first()).toBeVisible({
      timeout: 15_000,
    })

    await expect(page.locator('[data-testid^="kanban-card-buyer--"]')).toHaveCount(0)

    const seedCard = sellersCardByAddressSnippet(page, PANDA_PIPELINE_SEED_CARD_ADDRESS_SNIPPET).first()
    await expect(seedCard).toBeVisible({ timeout: 20_000 })
    await expect(
      seedCard.locator('[data-testid^="kanban-card-buyer-offer-accepted--"]'),
    ).toBeVisible()
    await expect(seedCard.getByText("Offer accepted")).toBeVisible()
  })

  test("sellers pipeline: property cards still render address and are clickable", async ({
    page,
  }) => {
    await page.goto("/admin/pipeline?pipeline=sellers")
    await page.waitForLoadState("networkidle")
    await expect(page.locator('[data-testid^="kanban-column--"]').first()).toBeVisible({
      timeout: 15_000,
    })

    const card = sellersCardByAddressSnippet(page, PANDA_PIPELINE_SEED_CARD_ADDRESS_SNIPPET).first()
    await expect(card).toBeVisible({ timeout: 20_000 })
    await expect(card).not.toBeEmpty()
    await expect(card).toHaveAttribute("role", "button")
  })

  test("buyers pipeline: buyer cards show buyer name and address", async ({ page }) => {
    await page.goto("/admin/pipeline?pipeline=buyers")
    await page.waitForLoadState("networkidle")
    await expect(page.locator('[data-testid^="kanban-column--"]').first()).toBeVisible({
      timeout: 15_000,
    })

    const card = buyersCardByAddressSnippet(page, PANDA_E2E_BUYERS_SEED_SNIPPET).first()
    await expect(card).toBeVisible({ timeout: 20_000 })
    await expect(card).toHaveAttribute("role", "button")

    const nameSpan = card.locator("span.font-medium.leading-snug").first()
    await expect(nameSpan).toBeVisible()
    await expect(nameSpan).not.toBeEmpty()
  })
})
