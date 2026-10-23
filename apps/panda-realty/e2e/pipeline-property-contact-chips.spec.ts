/**
 * E2E: Contact hover chips on Summary tab — sellers and buyers.
 *
 * Success factors:
 * 1. Seller chip with contact info renders a hoverable trigger (dotted underline).
 * 2. Hovering a seller chip opens a card with phone (tel:), email (mailto:), "Add to Calendar".
 * 3. "Add to Calendar" opens Add Meeting dialog pre-filled with "Meeting with <seller name>".
 * 4. Buyer chip with contact info shows the same hover card.
 * 5. Seller with no contact info renders as plain text (no chip trigger).
 *
 * Requires live E2E env (DATABASE_URL + admin credentials).
 * Uses the standard seed card: "99 E2E Seed Street".
 * Seed sets owner1phone=0400000001, owner1email=e2e-owner@example.com,
 *              buyer phone_number=0400000002, email_address=e2e-buyer@example.com.
 */

import { expect, test } from "@playwright/test"

import { signInAsAdmin } from "./helpers/admin-auth"
import {
  goToPropertySummaryTab,
  gotoSellersPipeline,
  openPropertyPanel,
  PANDA_E2E_SELLERS_NO_OFFER_SNIPPET,
  PANDA_PIPELINE_SEED_CARD_ADDRESS_SNIPPET,
  sellersCardByAddressSnippet,
} from "./helpers/panda-pipeline-panels"
import { requirePandaLiveE2eEnv } from "./helpers/require-panda-live-e2e-env"

// ── shared setup ─────────────────────────────────────────────────────────────

async function openSeedSummary(page: Parameters<typeof signInAsAdmin>[0]) {
  await signInAsAdmin(page)
  await gotoSellersPipeline(page)
  const card = sellersCardByAddressSnippet(page, PANDA_PIPELINE_SEED_CARD_ADDRESS_SNIPPET).first()
  await expect(card).toBeVisible({ timeout: 20_000 })
  const panel = await openPropertyPanel(page, card)
  await goToPropertySummaryTab(panel)
  return panel
}

function hoverCard(page: Parameters<typeof signInAsAdmin>[0]) {
  return page.locator('[data-slot="hover-card-content"]').first()
}

// ── describe ─────────────────────────────────────────────────────────────────

test.describe("Summary tab — contact hover chips", () => {
  test.beforeEach(() => {
    requirePandaLiveE2eEnv()
  })

  // ── seller chip with contact ─────────────────────────────────────────────

  test("seller with phone and email renders a chip trigger", async ({ page }) => {
    const panel = await openSeedSummary(page)

    const sellersRow = panel.getByTestId("panda-property-summary-row--sellers")
    await expect(sellersRow).toBeVisible()

    const chipTrigger = sellersRow.getByTestId("contact-chip-trigger").first()
    await expect(chipTrigger).toBeVisible()
  })

  test("hovering a seller chip opens a card with phone and email", async ({ page }) => {
    const panel = await openSeedSummary(page)

    const sellersRow = panel.getByTestId("panda-property-summary-row--sellers")
    const chipTrigger = sellersRow.getByTestId("contact-chip-trigger").first()
    await chipTrigger.hover()

    const card = hoverCard(page)
    await expect(card).toBeVisible({ timeout: 5_000 })

    await expect(card.locator('a[href^="tel:"]')).toBeVisible()
    await expect(card.locator('a[href^="tel:"]')).toContainText("0400000001")
    await expect(card.locator('a[href^="mailto:"]')).toBeVisible()
    await expect(card.locator('a[href^="mailto:"]')).toContainText("e2e-owner@example.com")
  })

  test("phone link has tel: href and email link has mailto: href on seller chip", async ({ page }) => {
    const panel = await openSeedSummary(page)

    const sellersRow = panel.getByTestId("panda-property-summary-row--sellers")
    await sellersRow.getByTestId("contact-chip-trigger").first().hover()

    const card = hoverCard(page)
    await expect(card).toBeVisible({ timeout: 5_000 })

    const phoneHref = await card.locator('a[href^="tel:"]').getAttribute("href")
    expect(phoneHref).toBe("tel:0400000001")

    const emailHref = await card.locator('a[href^="mailto:"]').getAttribute("href")
    expect(emailHref).toBe("mailto:e2e-owner@example.com")
  })

  test("'Add to Calendar' in seller hover card opens Add Meeting dialog pre-filled with seller name", async ({
    page,
  }) => {
    const panel = await openSeedSummary(page)

    const sellersRow = panel.getByTestId("panda-property-summary-row--sellers")
    const chipTrigger = sellersRow.getByTestId("contact-chip-trigger").first()
    const sellerName = await chipTrigger.textContent()

    await chipTrigger.hover()
    const card = hoverCard(page)
    await expect(card).toBeVisible({ timeout: 5_000 })

    await card.getByRole("button", { name: /add to calendar/i }).click()

    const dialog = page.getByTestId("add-meeting-dialog")
    await expect(dialog).toBeVisible({ timeout: 8_000 })

    const titleValue = await dialog.getByTestId("meeting-title-input").inputValue()
    expect(titleValue).toContain(sellerName?.trim() ?? "")

    await dialog.getByRole("button", { name: "Cancel" }).click()
    await expect(dialog).toBeHidden({ timeout: 5_000 })
  })

  // ── buyer chip with contact ──────────────────────────────────────────────

  test("buyer with phone and email renders a chip trigger", async ({ page }) => {
    const panel = await openSeedSummary(page)

    const buyersRow = panel.getByTestId("panda-property-summary-row--buyers")
    await expect(buyersRow).toBeVisible()

    await expect(buyersRow.getByTestId("contact-chip-trigger").first()).toBeVisible()
  })

  test("hovering a buyer chip opens a card with phone and email", async ({ page }) => {
    const panel = await openSeedSummary(page)

    const buyersRow = panel.getByTestId("panda-property-summary-row--buyers")
    await buyersRow.getByTestId("contact-chip-trigger").first().hover()

    const card = hoverCard(page)
    await expect(card).toBeVisible({ timeout: 5_000 })

    await expect(card.locator('a[href^="tel:"]')).toBeVisible()
    await expect(card.locator('a[href^="mailto:"]')).toBeVisible()
  })

  test("'Add to Calendar' in buyer hover card opens Add Meeting dialog pre-filled with buyer name", async ({
    page,
  }) => {
    const panel = await openSeedSummary(page)

    const buyersRow = panel.getByTestId("panda-property-summary-row--buyers")
    const chipTrigger = buyersRow.getByTestId("contact-chip-trigger").first()
    const buyerName = await chipTrigger.textContent()

    await chipTrigger.hover()
    const card = hoverCard(page)
    await expect(card).toBeVisible({ timeout: 5_000 })

    await card.getByRole("button", { name: /add to calendar/i }).click()

    const dialog = page.getByTestId("add-meeting-dialog")
    await expect(dialog).toBeVisible({ timeout: 8_000 })

    const titleValue = await dialog.getByTestId("meeting-title-input").inputValue()
    expect(titleValue).toContain(buyerName?.trim() ?? "")

    await dialog.getByRole("button", { name: "Cancel" }).click()
    await expect(dialog).toBeHidden({ timeout: 5_000 })
  })

  // ── seller without contact ───────────────────────────────────────────────

  test("sellers row with no contact info renders as plain text (no chip trigger)", async ({ page }) => {
    await signInAsAdmin(page)
    await gotoSellersPipeline(page)

    const card = sellersCardByAddressSnippet(page, PANDA_E2E_SELLERS_NO_OFFER_SNIPPET).first()
    await expect(card).toBeVisible({ timeout: 20_000 })
    const panel = await openPropertyPanel(page, card)
    await goToPropertySummaryTab(panel)

    const sellersRow = panel.getByTestId("panda-property-summary-row--sellers")
    if (await sellersRow.isVisible()) {
      await expect(sellersRow.getByTestId("contact-chip-trigger")).toHaveCount(0)
    }
  })
})
