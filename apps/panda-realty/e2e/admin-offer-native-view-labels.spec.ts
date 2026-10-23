/**
 * E2E: Admin buyer offer native view — label and section sync with HTML-aligned web form
 *
 * Verifies that all admin native view section titles, field labels, radio options,
 * sale status dropdown, multi-offer checkboxes, and section numbering match the
 * updated HTML-aligned web offer form (§1-§6, new labels, 4-option sale dropdown).
 *
 * Run: npm run test:e2e:scratch -- --app=panda-realty --spec="apps/panda-realty/e2e/admin-offer-native-view-labels.spec.ts"
 */

import { expect, test } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { createStory, shotFocused } from "@repo/e2e-utils"

import { e2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import {
  PREFILL_BASE,
  PREFILL_WITH_BUILDING_PEST,
  PREFILL_WITH_FINANCE,
  PREFILL_WITH_MULTI_OFFER,
  PREFILL_WITH_NOTES,
  PREFILL_WITH_SALE_LISTED,
  PREFILL_WITH_SALE_UNDER_CONTRACT_CONDITIONAL,
  PREFILL_WITH_SALE_UNDER_CONTRACT_UNCONDITIONAL,
  PREFILL_WITH_SELLER_SOLICITOR,
} from "./helpers/buyer-offer-native-view-mocks"
import {
  openNativePanel,
  openOffersDialog,
  setupNativeViewRoutes,
  setupPropertyRoutes,
} from "./helpers/buyer-offer-native-view-nav"
import {
  STATUS_LIST_RESPONSE,
} from "./helpers/admin-properties-mocks"

// ── Screenshot / story setup ─────────────────────────────────────────────────

const SHOT_DIR = join(dirname(fileURLToPath(import.meta.url)), "screenshots", "admin-offer-native-view-labels")

const story = createStory({ specUrl: import.meta.url, slug: "admin-offer-native-view-labels" })

story.setWhatWasBuilt(
  "Synced all admin buyer offer native view components to match the new HTML-aligned web offer form. " +
  "Updated section titles (§1–§6 numbering), field labels, radio options, sale status 4-option dropdown, " +
  "under-contract conditional/unconditional split, and added editable §5 Multi-Offer acknowledgment checkboxes.",
)

test.beforeEach(async () => {
  await mkdir(SHOT_DIR, { recursive: true })
})

test.afterAll(() => {
  story.write()
})

// ── Shared setup ─────────────────────────────────────────────────────────────

type P = Parameters<typeof signInAsAdmin>[0]

async function setup(page: P, prefill: Record<string, unknown> = PREFILL_BASE) {
  await page.route("**/api/admin/property-status**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(STATUS_LIST_RESPONSE) })
  })
  await page.route("**/api/admin/buyer-status**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [] }) })
  })
  await setupPropertyRoutes(page)
  await setupNativeViewRoutes(page, prefill)
  await openOffersDialog(page)
  return openNativePanel(page)
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe("Admin offer native view — label sync with web form", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")
    await signInAsAdmin(page)
  })

  // SF1 — Section headings §1-§6
  test("SF1 — section headings §1-§6 match web form numbering", async ({ page }) => {
    const panel = await setup(page)

    await expect(panel).toContainText("1. Property & Buyer Details")
    await expect(panel).toContainText("2. Solicitor Details")
    await expect(panel).toContainText("3. Financial Offer Structuring")
    await expect(panel).toContainText("4. Offer Contingencies & Terms")
    await expect(panel).toContainText("5. Multi-Offer Scenario Acknowledgment")
    await expect(panel).toContainText("6. Special Conditions / Extra Comments")

    await shotFocused(page, panel, SHOT_DIR, "01-section-headings")
    story.addScene({
      title: "01 — Section Headings §1–§6",
      images: [join(SHOT_DIR, "01-section-headings.png")],
      seeing: "Native view panel with all six section headings matching the web offer form numbering and titles.",
      steps: ["Open property dialog", "Open buyer offers dialog", "Expand offer row", "Observe all six section headings"],
    })
  })

  // SF2 — §1 buyer card heading
  test("SF2 — §1 buyer card heading reads 'Purchaser 1' not 'Buyer 1 Details'", async ({ page }) => {
    const panel = await setup(page)

    await expect(panel).toContainText("Purchaser 1")
    await expect(panel).not.toContainText("Buyer 1 Details")
  })

  // SF3 — §1 field labels
  test("SF3 — §1 field labels match web form (Full Legal Entity Name etc.)", async ({ page }) => {
    const panel = await setup(page)

    await expect(panel).toContainText("Full Legal Entity Name")
    await expect(panel).toContainText("Phone Number")
    await expect(panel).toContainText("Email Address")
    await expect(panel).toContainText("Current Residential Address")
  })

  // SF4 — §2 solicitor address label
  test("SF4 — §2 solicitor address label is 'Solicitor's Legal Practice Address'", async ({ page }) => {
    const panel = await setup(page)

    await expect(panel).toContainText("Solicitor's Legal Practice Address")
    await expect(panel).not.toContainText("Solicitor's Address")
  })

  // SF5 — §3 financial labels
  test("SF5 — §3 title 'Financial Offer Structuring' and updated field labels", async ({ page }) => {
    const panel = await setup(page)

    await expect(panel).toContainText("Financial Offer Structuring")
    await expect(panel).toContainText("Proposed Offer Amount ($)")
    await expect(panel).toContainText("Initial Holding Payment ($)")
    await expect(panel).toContainText("Secondary Payment / Balance ($)")
  })

  // SF6 — §4 title and cooling-off radio labels
  test("SF6 — §4 title 'Offer Contingencies & Terms' and cooling-off radio labels updated", async ({ page }) => {
    const panel = await setup(page)

    await expect(panel).toContainText("Offer Contingencies & Terms")
    await expect(panel).toContainText("Yes, Waive Period")
    await expect(panel).toContainText("No, Retain Statutory Period")

    await shotFocused(page, panel, SHOT_DIR, "02-section4-terms")
    story.addScene({
      title: "02 — §4 Terms Labels Updated",
      images: [join(SHOT_DIR, "02-section4-terms.png")],
      seeing: "§4 heading reads 'Offer Contingencies & Terms'; cooling-off radio shows 'Yes, Waive Period' / 'No, Retain Statutory Period'.",
      steps: ["Expand offer row", "Observe §4 section title and cooling-off radio options"],
    })
  })

  // SF7 — §4 cash buyer radio labels
  test("SF7 — §4 cash buyer radio options match web form", async ({ page }) => {
    const panel = await setup(page)

    await expect(panel).toContainText("Yes (Unconditional on Finance)")
    await expect(panel).toContainText("No (Subject to Finance / Terms)")
  })

  // SF8 — §4 settlement label
  test("SF8 — §4 settlement block label is 'Proposed Settlement Date / Interval'", async ({ page }) => {
    const panel = await setup(page)

    await expect(panel).toContainText("Proposed Settlement Date / Interval")
    await expect(panel).not.toContainText("Preferred Settlement Period or Date")
  })

  // SF9 — §4 finance sub-panel labels
  test("SF9 — §4 finance sub-panel labels match web form", async ({ page }) => {
    const panel = await setup(page, PREFILL_WITH_FINANCE)

    await expect(panel).toContainText("Is this offer subject to finance approval?")
    await expect(panel).toContainText("Days required to get full Bank Approval")
    await expect(panel).toContainText("Financier / Banking Institution")
  })

  // SF10 — §4 building pest labels
  test("SF10 — §4 building pest labels match web form", async ({ page }) => {
    const panel = await setup(page, PREFILL_WITH_BUILDING_PEST)

    await expect(panel).toContainText("Do you require a building and pest inspection contingency?")
    await expect(panel).toContainText("7 Calendar Days")
    await expect(panel).toContainText("14 Calendar Days")
  })

  // SF11 — §4 sale panel question and address label
  test("SF11 — §4 sale sub-panel question and address label match web form", async ({ page }) => {
    const panel = await setup(page, PREFILL_WITH_SALE_LISTED)

    await expect(panel).toContainText("Will this offer be contingent upon the sale of another property?")
    await expect(panel).toContainText("Full Address of the Asset to be Sold")
  })

  // SF12 — §4 sale status is a dropdown in editable mode
  test("SF12 — §4 sale status is a <select> dropdown with 4 options in editable mode", async ({ page }) => {
    const panel = await setup(page, PREFILL_WITH_SALE_LISTED)

    const salePanel = panel.getByTestId("buyer-offer-native--sale-panel")
    await expect(salePanel).toBeVisible({ timeout: 10_000 })

    const dropdown = salePanel.getByTestId("buyer-offer-native--sale-status-select")
    await expect(dropdown).toBeVisible()

    await expect(salePanel.locator("option", { hasText: "Under Contract (Conditional)" })).toBeAttached()
    await expect(salePanel.locator("option", { hasText: "Under Contract (Unconditional)" })).toBeAttached()
    await expect(salePanel.locator("option", { hasText: "On the Market / Live Campaign" })).toBeAttached()
    await expect(salePanel.locator("option", { hasText: "To be Listed" })).toBeAttached()
    await expect(panel).not.toContainText("Is the contract unconditional?")

    await shotFocused(page, salePanel, SHOT_DIR, "03-sale-status-dropdown")
    story.addScene({
      title: "03 — Sale Status Dropdown (4 Options)",
      images: [join(SHOT_DIR, "03-sale-status-dropdown.png")],
      seeing: "Sale sub-panel with a 4-option dropdown replacing the old read-only label + unconditional radio.",
      steps: ["Set subject-to-sale = Yes", "Observe sale status dropdown with 4 options"],
    })
  })

  // SF13 — §4 under_contract_conditional: conditions visible, no unconditional radio
  test("SF13 — under_contract_conditional shows conditions panel and no unconditional radio", async ({ page }) => {
    const panel = await setup(page, PREFILL_WITH_SALE_UNDER_CONTRACT_CONDITIONAL)

    const underContractPanel = panel.getByTestId("buyer-offer-native--sale-under-contract")
    await expect(underContractPanel).toBeVisible({ timeout: 10_000 })

    await expect(panel).toContainText("Building & Pest Assessment")
    await expect(panel).toContainText("Prior Interdependent Property Sale")
    await expect(panel).toContainText("Other Unique Conditions")
    await expect(panel).toContainText("Target date for contract becoming unconditional")
    await expect(panel).not.toContainText("Is the contract unconditional?")
  })

  // SF14 — §4 under_contract_unconditional: only settlement date visible
  test("SF14 — under_contract_unconditional shows only settlement date, no conditions", async ({ page }) => {
    const panel = await setup(page, PREFILL_WITH_SALE_UNDER_CONTRACT_UNCONDITIONAL)

    const settlementDate = panel.getByTestId("buyer-offer-native--sale-buyer-settlement-date")
    await expect(settlementDate).toBeVisible({ timeout: 10_000 })

    await expect(panel).not.toContainText("Is the contract unconditional?")
    await expect(panel).not.toContainText("Building & Pest Assessment")
    await expect(panel).not.toContainText("Target date for contract becoming unconditional")
  })

  // SF15 — §5 multi-offer editable checkboxes
  test("SF15 — §5 Multi-Offer editable checkboxes reflect PrefillData state", async ({ page }) => {
    const panel = await setup(page, PREFILL_WITH_MULTI_OFFER)

    await expect(panel).toContainText("Multi-Offer Scenario Acknowledgment")

    const cbHighest = panel.getByTestId("buyer-offer-native--multi-offer-highest")
    const cbDiscretion = panel.getByTestId("buyer-offer-native--multi-offer-discretion")
    const cbConfidential = panel.getByTestId("buyer-offer-native--multi-offer-confidential")

    await expect(cbHighest).toBeVisible({ timeout: 10_000 })
    await expect(cbDiscretion).toBeVisible()
    await expect(cbConfidential).toBeVisible()

    await expect(cbHighest).toBeChecked()
    await expect(cbDiscretion).not.toBeChecked()
    await expect(cbConfidential).toBeChecked()

    await shotFocused(page, panel, SHOT_DIR, "04-multi-offer-section")
    story.addScene({
      title: "04 — §5 Multi-Offer Acknowledgment Checkboxes",
      images: [join(SHOT_DIR, "04-multi-offer-section.png")],
      seeing: "§5 with three editable multi-offer acknowledgment checkboxes; highest=checked, discretion=unchecked, confidential=checked.",
      steps: ["Expand offer row with multi-offer prefill", "Observe §5 with correctly checked/unchecked boxes"],
    })
  })

  // SF16 — §2 seller solicitor sub-groups
  test("SF16 — §2 shows Buyer's Solicitor and Seller's Solicitor sub-group labels", async ({ page }) => {
    const panel = await setup(page, PREFILL_WITH_SELLER_SOLICITOR)

    await expect(panel).toContainText("Buyer's Solicitor")
    await expect(panel).toContainText("Seller's Solicitor")

    await expect(panel.getByTestId("buyer-offer-native--seller-solicitor-name")).toHaveValue("Smith & Partners Conveyancing")
    await expect(panel.getByTestId("buyer-offer-native--seller-solicitor-phone")).toHaveValue("0733 555 999")
    await expect(panel.getByTestId("buyer-offer-native--seller-solicitor-email")).toHaveValue("info@smithpartners.com.au")

    const sellerNameEl = panel.getByTestId("buyer-offer-native--seller-solicitor-name")
    await expect(sellerNameEl.locator("input")).toHaveCount(0)

    await shotFocused(page, panel, SHOT_DIR, "05-seller-solicitor")
    story.addScene({
      title: "05 — §2 Buyer & Seller Solicitor Sub-Groups",
      images: [join(SHOT_DIR, "05-seller-solicitor.png")],
      seeing: "Section 2 with 'Buyer's Solicitor' editable sub-group and 'Seller's Solicitor' read-only sub-group below it.",
      steps: ["Expand offer row with seller solicitor prefill", "Observe §2 with two solicitor sub-groups"],
    })
  })

  // SF17 — §6 Extra Comments title
  test("SF17 — §6 section title is 'Special Conditions / Extra Comments'", async ({ page }) => {
    const panel = await setup(page, PREFILL_WITH_NOTES)

    await expect(panel).toContainText("Special Conditions / Extra Comments")
    await expect(panel).not.toContainText("5. Extra Comments")
  })

  // SF18 — PATCH body includes multi-offer fields
  test("SF18 — Save PATCH body includes multiOfferCheck* boolean fields", async ({ page }) => {
    let patchBody: Record<string, unknown> | null = null

    await page.route("**/api/admin/buyer-offers/9001/form-data**", async (route) => {
      if (route.request().method() === "PATCH") {
        patchBody = JSON.parse(route.request().postData() ?? "{}") as Record<string, unknown>
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) })
        return
      }
      await route.continue()
    })

    const panel = await setup(page, PREFILL_WITH_MULTI_OFFER)

    const saveBtn = panel.getByTestId("buyer-offer-native-view-save--9001")
    await expect(saveBtn).toBeVisible({ timeout: 10_000 })

    // Toggle one checkbox to make the form dirty
    const cbDiscretion = panel.getByTestId("buyer-offer-native--multi-offer-discretion")
    await cbDiscretion.click()

    await expect(saveBtn).toBeEnabled()
    await saveBtn.click()

    await expect(panel.getByTestId("buyer-offer-native-view-save--9001")).toContainText("Saved", { timeout: 8_000 })

    expect(patchBody).toMatchObject({
      multiOfferCheckHighest: true,
      multiOfferCheckDiscretion: true,
      multiOfferCheckConfidential: true,
    })
  })
})
