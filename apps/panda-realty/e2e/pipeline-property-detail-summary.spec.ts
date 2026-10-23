/**
 * E2E: Sellers pipeline board — property detail panel Summary tab
 *
 * Uses live DB — `globalSetup` seeds fixtures when DATABASE_URL is set.
 */

import { expect, test } from "@playwright/test"

import { signInAsAdmin } from "./helpers/admin-auth"
import {
  goToPropertySummaryTab,
  gotoSellersPipeline,
  openPropertyPanel,
  PANDA_E2E_SELLERS_NO_CONTRACT_SNIPPET,
  PANDA_E2E_SELLERS_NO_OFFER_SNIPPET,
  PANDA_PIPELINE_SEED_CARD_ADDRESS_SNIPPET,
  sellersCardByAddressSnippet,
} from "./helpers/panda-pipeline-panels"
import { requirePandaLiveE2eEnv } from "./helpers/require-panda-live-e2e-env"

test.describe("Sellers pipeline board — property detail Summary tab", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaLiveE2eEnv()
    await signInAsAdmin(page)
    await gotoSellersPipeline(page)
  })

  test("clicking a property card opens the detail panel on the Summary tab", async ({ page }) => {
    const card = sellersCardByAddressSnippet(page, PANDA_PIPELINE_SEED_CARD_ADDRESS_SNIPPET).first()
    await expect(card).toBeVisible({ timeout: 20_000 })

    await card.click()
    await expect(page.getByTestId("panel-content-ready")).toBeVisible({ timeout: 10_000 })
    await expect(page.getByTestId("property-panel-tab--summary")).toBeVisible()
  })

  test("seeded property with sale_price does not show Asking in header or Summary list", async ({ page }) => {
    const card = sellersCardByAddressSnippet(page, PANDA_PIPELINE_SEED_CARD_ADDRESS_SNIPPET).first()
    await expect(card).toBeVisible({ timeout: 20_000 })
    await card.click()
    await expect(page.getByTestId("panel-content-ready")).toBeVisible({ timeout: 10_000 })

    const panel = page.getByTestId("property-detail-panel")
    await expect(panel.getByTestId("panda-property-summary-row--asking")).toHaveCount(0)
    await expect(panel.getByText(/^Asking:/)).toHaveCount(0)
  })

  test("property with accepted offer shows Contract price on Summary tab", async ({ page }) => {
    const card = sellersCardByAddressSnippet(page, PANDA_PIPELINE_SEED_CARD_ADDRESS_SNIPPET).first()
    await expect(card).toBeVisible({ timeout: 20_000 })
    await card.click()

    await expect(page.getByTestId("panel-content-ready")).toBeVisible({ timeout: 10_000 })

    const contractPriceRow = page.getByTestId("panda-property-summary-row--contract-price")
    await expect(contractPriceRow).toBeVisible()
    await expect(contractPriceRow).toContainText("$")
  })

  test("property with contract_date set shows Contract date on Summary tab", async ({ page }) => {
    const card = sellersCardByAddressSnippet(page, PANDA_PIPELINE_SEED_CARD_ADDRESS_SNIPPET).first()
    await expect(card).toBeVisible({ timeout: 20_000 })
    await card.click()
    await expect(page.getByTestId("panel-content-ready")).toBeVisible({ timeout: 10_000 })

    const contractDateRow = page.getByTestId("panda-property-summary-row--contract-date")
    await expect(contractDateRow).toBeVisible()
    const text = await contractDateRow.locator("dd").textContent()
    expect(text?.trim().length).toBeGreaterThan(0)
  })

  test("Buyers row shows buyers with offers when no offer is accepted", async ({ page }) => {
    const card = sellersCardByAddressSnippet(page, PANDA_E2E_SELLERS_NO_OFFER_SNIPPET).first()
    await expect(card).toBeVisible({ timeout: 20_000 })
    await card.click()

    await expect(page.getByTestId("panel-content-ready")).toBeVisible({ timeout: 10_000 })
    const buyersRow = page.getByTestId("panda-property-summary-row--buyers")
    await expect(buyersRow).toBeVisible()
    const text = await buyersRow.locator("dd").textContent()
    expect(text?.trim().length).toBeGreaterThan(0)
  })

  test("Buyers row appears with buyer member names when accepted offer buyer has members", async ({
    page,
  }) => {
    const card = sellersCardByAddressSnippet(page, PANDA_PIPELINE_SEED_CARD_ADDRESS_SNIPPET).first()
    await expect(card).toBeVisible({ timeout: 20_000 })
    await card.click()
    await expect(page.getByTestId("panel-content-ready")).toBeVisible({ timeout: 10_000 })

    const buyersRow = page.getByTestId("panda-property-summary-row--buyers")
    await expect(buyersRow).toBeVisible()

    const namesText = await buyersRow.locator("dd").textContent()
    expect(namesText?.trim().length).toBeGreaterThan(0)

    const addressRow = page.getByTestId("panda-property-summary-row--buyer-address")
    const addressBox = await addressRow.boundingBox()
    const buyersBox = await buyersRow.boundingBox()
    expect(addressBox).not.toBeNull()
    expect(buyersBox).not.toBeNull()
    expect(buyersBox!.y).toBeLessThan(addressBox!.y)
  })

  test("property without accepted offer does not show Contract price row", async ({ page }) => {
    const card = sellersCardByAddressSnippet(page, PANDA_E2E_SELLERS_NO_OFFER_SNIPPET).first()
    await expect(card).toBeVisible({ timeout: 20_000 })
    await card.click()

    await expect(page.getByTestId("panel-content-ready")).toBeVisible({ timeout: 10_000 })
    await expect(page.getByTestId("panda-property-summary-row--contract-price")).toHaveCount(0)
  })

  test("Buyers row shows buyer entity names", async ({ page }) => {
    const card = sellersCardByAddressSnippet(page, PANDA_PIPELINE_SEED_CARD_ADDRESS_SNIPPET).first()
    await expect(card).toBeVisible({ timeout: 20_000 })
    await card.click()
    await expect(page.getByTestId("panel-content-ready")).toBeVisible({ timeout: 10_000 })

    const buyersRow = page.getByTestId("panda-property-summary-row--buyers")
    await expect(buyersRow).toBeVisible()

    const namesText = await buyersRow.locator("dd").textContent()
    expect(namesText).toContain("E2E Seed Buyer (Playwright)")
  })

  test("Commission row shows calculated $ amount when rate and accepted offer are present", async ({
    page,
  }) => {
    const card = sellersCardByAddressSnippet(page, PANDA_PIPELINE_SEED_CARD_ADDRESS_SNIPPET).first()
    await expect(card).toBeVisible({ timeout: 20_000 })
    await card.click()
    await expect(page.getByTestId("panel-content-ready")).toBeVisible({ timeout: 10_000 })

    const panel = page.getByTestId("property-detail-panel")
    // Summary tab commission row: seeded offer=$500k, rate=2% → $10,000.00
    const commissionRow = panel.getByTestId("panda-property-summary-row--commission")
    await expect(commissionRow).toBeVisible()
    await expect(commissionRow.locator("dd")).toContainText("10,000")
    await expect(commissionRow.locator("dd")).toContainText("$")
    // Must NOT show a percentage
    await expect(commissionRow.locator("dd")).not.toContainText("%")
  })

  test("Commission header badge shows calculated $ amount when rate and accepted offer are present", async ({
    page,
  }) => {
    const card = sellersCardByAddressSnippet(page, PANDA_PIPELINE_SEED_CARD_ADDRESS_SNIPPET).first()
    await expect(card).toBeVisible({ timeout: 20_000 })
    await card.click()
    await expect(page.getByTestId("panel-content-ready")).toBeVisible({ timeout: 10_000 })

    const panel = page.getByTestId("property-detail-panel")
    const badge = panel.getByTestId("property-panel-commission-badge")
    await expect(badge).toBeVisible()
    await expect(badge).toContainText("10,000")
    await expect(badge).not.toContainText("%")
  })

  test("Commission row shows 'No offer yet' when rate is set but no accepted offer", async ({
    page,
  }) => {
    const card = sellersCardByAddressSnippet(page, PANDA_E2E_SELLERS_NO_OFFER_SNIPPET).first()
    await expect(card).toBeVisible({ timeout: 20_000 })
    await card.click()
    await expect(page.getByTestId("panel-content-ready")).toBeVisible({ timeout: 10_000 })

    const panel = page.getByTestId("property-detail-panel")
    const commissionRow = panel.getByTestId("panda-property-summary-row--commission")
    await expect(commissionRow).toBeVisible()
    await expect(commissionRow.locator("dd")).toContainText("No offer yet")
  })

  test("Commission row is hidden when no commission rate is set", async ({ page }) => {
    const card = sellersCardByAddressSnippet(page, PANDA_E2E_SELLERS_NO_CONTRACT_SNIPPET).first()
    await expect(card).toBeVisible({ timeout: 20_000 })
    await card.click()
    await expect(page.getByTestId("panel-content-ready")).toBeVisible({ timeout: 10_000 })

    const panel = page.getByTestId("property-detail-panel")
    await expect(panel.getByTestId("panda-property-summary-row--commission")).toHaveCount(0)
  })

  test("Summary Condition Due Dates omits finance, building & pest, and due diligence when saved day counts are zero", async ({
    page,
  }) => {
    test.setTimeout(120_000)
    const targetCard = sellersCardByAddressSnippet(page, PANDA_PIPELINE_SEED_CARD_ADDRESS_SNIPPET).first()
    await expect(targetCard).toBeVisible({ timeout: 20_000 })

    const panel = await openPropertyPanel(page, targetCard, { loadTimeoutMs: 90_000 })
    await goToPropertySummaryTab(panel)

    const conditionsRoot = panel.locator('[data-testid^="offer-conditions-panel--"]')
    await expect(conditionsRoot).toBeVisible({ timeout: 8_000 })
    const offerId = (await conditionsRoot.getAttribute("data-testid"))!.replace("offer-conditions-panel--", "")

    await panel.locator(`[data-testid="offer-conditions-days-input--finance--${offerId}"]`).fill("0")
    await panel.locator(`[data-testid="offer-conditions-days-input--building-pest--${offerId}"]`).fill("0")
    await panel.locator(`[data-testid="offer-conditions-days-input--due-diligence--${offerId}"]`).fill("0")

    const saveBtn = panel.getByRole("button", { name: "Save conditions" })
    await saveBtn.click()
    await expect(saveBtn).toBeEnabled({ timeout: 20_000 })

    await expect(panel.getByTestId("panda-property-condition-due--finance")).toHaveCount(0)
    await expect(panel.getByTestId("panda-property-condition-due--building-and-pest")).toHaveCount(0)
    await expect(panel.getByTestId("panda-property-condition-due--due-diligence")).toHaveCount(0)
  })

  test("Summary Condition Due Dates shows a contract-date warning when day counts exist but contract date is missing", async ({
    page,
  }) => {
    const targetCard = sellersCardByAddressSnippet(page, PANDA_E2E_SELLERS_NO_CONTRACT_SNIPPET).first()
    await expect(targetCard).toBeVisible({ timeout: 20_000 })

    const panel = await openPropertyPanel(page, targetCard)
    await goToPropertySummaryTab(panel)

    await expect(
      panel.getByText("Set contract date to calculate due dates."),
    ).toBeVisible({ timeout: 8_000 })
  })
})
