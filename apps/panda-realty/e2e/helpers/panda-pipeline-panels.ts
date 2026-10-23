/**
 * Kanban pipeline sheet helpers — Panda Realty E2E.
 * `SheetTitle` updates after load break `getByRole("dialog", { name })`; use stable testids.
 */

import { expect, type Locator, type Page } from "@playwright/test"

export const DEFAULT_PANEL_LOAD_TIMEOUT_MS = 45_000

/** Matches `e2e/scripts/seed-sellers-pipeline-accepted-offer.mjs` — prefer this card when seeded. */
export const PANDA_PIPELINE_SEED_CARD_ADDRESS_SNIPPET = "99 E2E Seed Street"

/** Sellers card: buyer with is_accepted=false offer — used to test buyers-row state 2 (offers pending). */
export const PANDA_E2E_SELLERS_NO_OFFER_SNIPPET = "98 E2E No-Offer"

/** Sellers card: accepted offer but `contract_date` is null — calendar icon buttons disabled on Summary. */
export const PANDA_E2E_SELLERS_NO_CONTRACT_SNIPPET = "97 E2E No-Contract"

/** Buyers Kanban: same fixture as seed main property (accepted + contract). */
export const PANDA_E2E_BUYERS_SEED_SNIPPET = "99 E2E Seed"

/** Buyers Kanban: pending offer only (no accepted). */
export const PANDA_E2E_BUYERS_NO_ACCEPT_SNIPPET = "98 E2E No-Offer"

/** Sellers card: buyer linked with zero offer rows — buyers-row state 1 (all buyers shown). */
export const PANDA_E2E_SELLERS_NO_BUYER_OFFERS_SNIPPET = "93 E2E No-Buyer-Offers"

/** Buyers Kanban: `created_at` backdated (outside recent calendar-month windows). */
export const PANDA_E2E_BUYERS_ANCIENT_SNIPPET = "96 E2E Ancient"

/** Sellers Kanban: `updated_at` backdated on panda_properties (outside recent calendar-month windows). */
export const PANDA_E2E_SELLERS_ANCIENT_SNIPPET = "95 E2E Ancient Sellers"

export function sellersCardByAddressSnippet(page: Page, addressSnippet: string): Locator {
  return page.locator('[data-testid^="kanban-card--"]').filter({ hasText: addressSnippet })
}

export function buyersCardByAddressSnippet(page: Page, addressSnippet: string): Locator {
  return page.locator('[data-testid^="kanban-buyer-card--"]').filter({ hasText: addressSnippet })
}

export async function gotoSellersPipeline(page: Page): Promise<void> {
  await page.goto("/admin/pipeline?pipeline=sellers")
  await page.waitForLoadState("networkidle")
  await expect(page.locator('[data-testid^="kanban-column--"]').first()).toBeVisible({
    timeout: 15_000,
  })
}

export async function gotoBuyersPipeline(page: Page): Promise<void> {
  await page.goto("/admin/pipeline?pipeline=buyers")
  await page.waitForLoadState("networkidle")
  await expect(page.locator('[data-testid^="kanban-column--"]').first()).toBeVisible({
    timeout: 15_000,
  })
}

export async function waitForPanelLoad(
  panel: Locator,
  options?: { timeoutMs?: number },
): Promise<void> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_PANEL_LOAD_TIMEOUT_MS
  const ready = panel.locator('[data-testid="panel-content-ready"]')
  const errorDiv = panel.locator('[data-testid="panel-load-error"]')
  const result = await Promise.race([
    ready.waitFor({ state: "visible", timeout: timeoutMs }).then(() => "ready" as const).catch(() => null),
    errorDiv.waitFor({ state: "visible", timeout: timeoutMs }).then(() => "error" as const).catch(() => null),
  ])
  if (result === "error") {
    const msg = await errorDiv.textContent().catch(() => "(could not read error)")
    throw new Error(`Panel load error: ${msg}`)
  }
  if (result === null) {
    throw new Error(
      `Panel timed out: neither panel-content-ready nor panel-load-error appeared within ${timeoutMs}ms`,
    )
  }
}

export type OpenPropertyPanelOptions = {
  /** Default true — scroll card into view before click (Kanban overflow). */
  scrollIntoView?: boolean
  panelVisibleTimeoutMs?: number
  loadTimeoutMs?: number
}

export async function openPropertyPanel(
  page: Page,
  cardLocator: Locator,
  options?: OpenPropertyPanelOptions,
): Promise<Locator> {
  const scrollIntoView = options?.scrollIntoView ?? true
  const panelVisibleTimeoutMs = options?.panelVisibleTimeoutMs ?? 15_000
  if (scrollIntoView) await cardLocator.scrollIntoViewIfNeeded()
  await cardLocator.click()
  const panel = page.locator('[data-testid="property-detail-panel"]')
  await expect(panel).toBeVisible({ timeout: panelVisibleTimeoutMs })
  await waitForPanelLoad(panel, { timeoutMs: options?.loadTimeoutMs })
  return panel
}

export type OpenBuyerPanelOptions = {
  /**
   * When true, return null if the panel never loads instead of throwing
   * (buyers pipeline: some cards may not open a panel).
   */
  soft?: boolean
  clickForce?: boolean
  scrollIntoView?: boolean
  panelVisibleTimeoutMs?: number
  loadTimeoutMs?: number
}

export async function openBuyerPanel(
  page: Page,
  cardLocator: Locator,
  options: OpenBuyerPanelOptions & { soft: true },
): Promise<Locator | null>
export async function openBuyerPanel(
  page: Page,
  cardLocator: Locator,
  options?: OpenBuyerPanelOptions & { soft?: false },
): Promise<Locator>
export async function openBuyerPanel(
  page: Page,
  cardLocator: Locator,
  options?: OpenBuyerPanelOptions,
): Promise<Locator | null> {
  const soft = options?.soft ?? false
  const scrollIntoView = options?.scrollIntoView ?? true
  const clickForce = options?.clickForce ?? soft
  const panelVisibleTimeoutMs = options?.panelVisibleTimeoutMs ?? 10_000

  if (scrollIntoView) await cardLocator.scrollIntoViewIfNeeded()
  await cardLocator.click({ force: clickForce })
  const panel = page.locator('[data-testid="buyer-detail-panel"]')

  if (soft) {
    const panelVisible = await panel.isVisible({ timeout: panelVisibleTimeoutMs }).catch(() => false)
    if (!panelVisible) {
      await page.keyboard.press("Escape")
      await page.waitForTimeout(400)
      return null
    }
    try {
      await waitForPanelLoad(panel, { timeoutMs: options?.loadTimeoutMs })
    } catch {
      await page.keyboard.press("Escape")
      await page.waitForTimeout(400)
      return null
    }
    return panel
  }

  await expect(panel).toBeVisible({ timeout: panelVisibleTimeoutMs })
  await waitForPanelLoad(panel, { timeoutMs: options?.loadTimeoutMs })
  return panel
}

export async function findSellersCardWithAcceptedOffer(page: Page): Promise<Locator | null> {
  const bySeed = page
    .locator('[data-testid^="kanban-card--"]')
    .filter({ hasText: PANDA_PIPELINE_SEED_CARD_ADDRESS_SNIPPET })
    .first()
  if ((await bySeed.count()) > 0) {
    const hasBadge = await bySeed.locator('[data-testid^="kanban-card-buyer-offer-accepted--"]').count()
    if (hasBadge > 0) return bySeed
  }
  const cards = page.locator('[data-testid^="kanban-card--"]')
  const cardCount = await cards.count()
  for (let i = 0; i < cardCount; i++) {
    const card = cards.nth(i)
    if ((await card.locator('[data-testid^="kanban-card-buyer-offer-accepted--"]').count()) > 0) {
      return card
    }
  }
  return null
}

export async function goToPropertySummaryTab(panel: Locator): Promise<void> {
  await panel.getByTestId("property-panel-tab--summary").click()
  await expect(panel.locator('[data-testid="panel-content-ready"]')).toBeVisible()
}
