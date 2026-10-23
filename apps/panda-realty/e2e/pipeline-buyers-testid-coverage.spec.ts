/**
 * Pipeline buyers — data-testid coverage smoke test.
 * Verifies that all key elements added in the testid-coverage pass are
 * queryable by testid on the buyers pipeline page and in the detail panels.
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

test.describe("Pipeline buyers — testid coverage", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaLiveE2eEnv()
    await signInAsAdmin(page)
  })

  test("pipeline tab links have correct testids and aria-selected state", async ({ page }) => {
    await gotoBuyersPipeline(page)

    const buyersTab = page.getByTestId("pipeline-tab--buyers")
    const sellersTab = page.getByTestId("pipeline-tab--sellers")

    await expect(buyersTab).toBeVisible()
    await expect(sellersTab).toBeVisible()
    await expect(buyersTab).toHaveAttribute("aria-selected", "true")
    await expect(sellersTab).toHaveAttribute("aria-selected", "false")
  })

  test("hide-empty toggle and scroll buttons have testids", async ({ page }) => {
    await gotoBuyersPipeline(page)

    await expect(page.getByTestId("pipeline-hide-empty-toggle")).toBeVisible()
    await expect(page.getByTestId("pipeline-scroll-left")).toBeVisible()
    await expect(page.getByTestId("pipeline-scroll-right")).toBeVisible()
  })

  test("column headers have label and count testids", async ({ page }) => {
    await gotoBuyersPipeline(page)

    const firstLabel = page.locator('[data-testid^="kanban-column-label--"]').first()
    const firstCount = page.locator('[data-testid^="kanban-column-count--"]').first()

    await expect(firstLabel).toBeVisible({ timeout: 15_000 })
    await expect(firstLabel).not.toBeEmpty()
    await expect(firstCount).toBeVisible()
  })

  test("buyer kanban cards have entity-name and address testids", async ({ page }) => {
    await gotoBuyersPipeline(page)

    const card = buyersCardByAddressSnippet(page, PANDA_E2E_BUYERS_SEED_SNIPPET).first()
    await expect(card).toBeVisible({ timeout: 25_000 })

    const nameSpan = card.getByTestId("buyer-card-entity-name")
    const addrSpan = card.getByTestId("buyer-card-address")

    await expect(nameSpan).toBeVisible()
    await expect(nameSpan).not.toBeEmpty()
    await expect(addrSpan).toBeVisible()
    await expect(addrSpan).not.toBeEmpty()
  })

  test("buyer detail panel header buttons have testids", async ({ page }) => {
    await gotoBuyersPipeline(page)

    const card = buyersCardByAddressSnippet(page, PANDA_E2E_BUYERS_SEED_SNIPPET).first()
    await expect(card).toBeVisible({ timeout: 25_000 })

    const panel = await openBuyerPanel(page, card)

    await expect(panel.getByTestId("buyer-panel-close-btn")).toBeVisible()
    await expect(panel.getByTestId("buyer-panel-add-meeting-btn")).toBeVisible()
    await expect(panel.getByTestId("buyer-panel-add-reminder-btn")).toBeVisible()
  })

  test("buyer panel close button actually closes the panel", async ({ page }) => {
    await gotoBuyersPipeline(page)

    const card = buyersCardByAddressSnippet(page, PANDA_E2E_BUYERS_SEED_SNIPPET).first()
    await expect(card).toBeVisible({ timeout: 25_000 })

    const panel = await openBuyerPanel(page, card)
    await expect(panel).toBeVisible()

    await panel.getByTestId("buyer-panel-close-btn").click()
    await expect(panel).not.toBeVisible({ timeout: 5_000 })
  })

  test("sellers pipeline tab link navigates correctly", async ({ page }) => {
    await gotoBuyersPipeline(page)

    await page.getByTestId("pipeline-tab--sellers").click()
    await expect(page).toHaveURL(/pipeline=sellers/, { timeout: 10_000 })
    await expect(page.getByTestId("pipeline-tab--sellers")).toHaveAttribute("aria-selected", "true")
    await expect(page.getByTestId("pipeline-tab--buyers")).toHaveAttribute("aria-selected", "false")
  })
})
