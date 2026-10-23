import { expect, test } from "@playwright/test"

import { e2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import {
  PREFILL_BASE,
  PREFILL_CASH_BUYER,
  PREFILL_WITH_BUILDING_PEST,
  PREFILL_WITH_FINANCE,
  PREFILL_WITH_NOTES,
  PREFILL_WITH_REP,
  PREFILL_WITH_SALE_LISTED,
  PREFILL_WITH_SALE_UNDER_CONTRACT,
} from "./helpers/buyer-offer-native-view-mocks"
import {
  openNativePanel,
  openOffersDialog,
  setupNativeViewRoutes,
  setupPropertyRoutes,
} from "./helpers/buyer-offer-native-view-nav"

import { STATUS_LIST_RESPONSE } from "./helpers/admin-properties-mocks"

test.describe("Buyer offer — native form controls view", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")
    await page.route("**/api/admin/property-status**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(STATUS_LIST_RESPONSE) })
    })
    await page.route("**/api/admin/buyer-status**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [] }) })
    })
    await signInAsAdmin(page)
  })

  // ── Section 1 — Property & Buyer Details ───────────────────────────────────

  test("Section 1: property address renders as a disabled input, not plain text", async ({ page }) => {
    await setupPropertyRoutes(page)
    await setupNativeViewRoutes(page)
    await openOffersDialog(page)
    const panel = await openNativePanel(page)

    const input = panel.getByTestId("buyer-offer-native--property-address")
    await expect(input).toBeVisible()
    await expect(input).toHaveValue("12 Test Street, Testville, QLD, 4000")
    await expect(input).toBeDisabled()
  })

  test("Section 1: buyer name, phone, email, address render as disabled inputs", async ({ page }) => {
    await setupPropertyRoutes(page)
    await setupNativeViewRoutes(page)
    await openOffersDialog(page)
    const panel = await openNativePanel(page)

    await expect(panel.getByTestId("buyer-offer-native--buyer-1-name")).toBeDisabled()
    await expect(panel.getByTestId("buyer-offer-native--buyer-1-phone")).toBeDisabled()
    await expect(panel.getByTestId("buyer-offer-native--buyer-1-email")).toBeDisabled()
    await expect(panel.getByTestId("buyer-offer-native--buyer-1-address")).toBeDisabled()

    await expect(panel.getByTestId("buyer-offer-native--buyer-1-name")).toHaveValue("Test Buyer")
    await expect(panel.getByTestId("buyer-offer-native--buyer-1-phone")).toHaveValue("0400 000 000")
  })

  // ── Section 2 — Solicitor Details ─────────────────────────────────────────

  test("Section 2: solicitor fields render as disabled inputs in a 2-col grid", async ({ page }) => {
    await setupPropertyRoutes(page)
    await setupNativeViewRoutes(page)
    await openOffersDialog(page)
    const panel = await openNativePanel(page)

    await expect(panel.getByTestId("buyer-offer-native--solicitor-name")).toBeDisabled()
    await expect(panel.getByTestId("buyer-offer-native--solicitor-phone")).toBeDisabled()
    await expect(panel.getByTestId("buyer-offer-native--solicitor-address")).toBeDisabled()
    await expect(panel.getByTestId("buyer-offer-native--solicitor-email")).toBeDisabled()

    await expect(panel.getByTestId("buyer-offer-native--solicitor-name")).toHaveValue("Jane Solicitor")
    await expect(panel.getByTestId("buyer-offer-native--solicitor-email")).toHaveValue("jane@lawfirm.com")
  })

  // ── Section 3 — Offer Details ──────────────────────────────────────────────

  test("Section 3: offer amount, total deposit, initial payment, balance render as disabled inputs", async ({ page }) => {
    await setupPropertyRoutes(page)
    await setupNativeViewRoutes(page)
    await openOffersDialog(page)
    const panel = await openNativePanel(page)

    await expect(panel.getByTestId("buyer-offer-native--offer-amount")).toBeDisabled()
    await expect(panel.getByTestId("buyer-offer-native--total-deposit")).toBeDisabled()
    await expect(panel.getByTestId("buyer-offer-native--initial-payment")).toBeDisabled()
    await expect(panel.getByTestId("buyer-offer-native--second-payment")).toBeDisabled()

    await expect(panel.getByTestId("buyer-offer-native--offer-amount")).toHaveValue("750000")
  })

  // ── Section 4 — Terms: Cooling Off & Cash Buyer ────────────────────────────

  test("Section 4: cooling off radio group is visible and disabled", async ({ page }) => {
    await setupPropertyRoutes(page)
    await setupNativeViewRoutes(page)
    await openOffersDialog(page)
    const panel = await openNativePanel(page)

    const coolingOffSection = panel.getByTestId("buyer-offer-native--cooling-off")
    await expect(coolingOffSection).toBeVisible()
    const noRadio = coolingOffSection.locator('input[type="radio"][value="no"]')
    await expect(noRadio).toBeChecked()
    await expect(noRadio).toBeDisabled()
  })

  test("Section 4: cash buyer radio group is visible and disabled", async ({ page }) => {
    await setupPropertyRoutes(page)
    await setupNativeViewRoutes(page)
    await openOffersDialog(page)
    const panel = await openNativePanel(page)

    const cashBuyerSection = panel.getByTestId("buyer-offer-native--cash-buyer")
    await expect(cashBuyerSection).toBeVisible()
    const noRadio = cashBuyerSection.locator('input[type="radio"][value="no"]')
    await expect(noRadio).toBeChecked()
    await expect(noRadio).toBeDisabled()
  })

  // ── Section 4 — Finance sub-panel ─────────────────────────────────────────

  test("Section 4: finance panel is hidden when isCashOffer=true", async ({ page }) => {
    await setupPropertyRoutes(page)
    await setupNativeViewRoutes(page, PREFILL_CASH_BUYER)
    await openOffersDialog(page)
    const panel = await openNativePanel(page)

    await expect(panel.getByTestId("buyer-offer-native--finance-panel")).not.toBeVisible()
  })

  test("Section 4: finance panel is visible when isCashOffer=false", async ({ page }) => {
    await setupPropertyRoutes(page)
    await setupNativeViewRoutes(page, PREFILL_BASE)
    await openOffersDialog(page)
    const panel = await openNativePanel(page)

    await expect(panel.getByTestId("buyer-offer-native--finance-panel")).toBeVisible()
  })

  test("Section 4: finance sub-panel details visible when isSubjectToFinance=true", async ({ page }) => {
    await setupPropertyRoutes(page)
    await setupNativeViewRoutes(page, PREFILL_WITH_FINANCE)
    await openOffersDialog(page)
    const panel = await openNativePanel(page)

    const financePanel = panel.getByTestId("buyer-offer-native--finance-panel")
    await expect(financePanel).toBeVisible()

    const yesRadio = financePanel.locator('input[type="radio"][value="yes"]').first()
    await expect(yesRadio).toBeDisabled()

    const detailsPanel = panel.getByTestId("buyer-offer-native--finance-details")
    await expect(detailsPanel).toBeVisible()
    await expect(panel.getByTestId("buyer-offer-native--finance-bank")).toBeDisabled()
    await expect(panel.getByTestId("buyer-offer-native--finance-bank")).toHaveValue("ANZ")
    await expect(panel.getByTestId("buyer-offer-native--finance-approval-days")).toBeDisabled()
    await expect(panel.getByTestId("buyer-offer-native--finance-bank-contact-name")).toBeDisabled()
    await expect(panel.getByTestId("buyer-offer-native--finance-bank-contact-name")).toHaveValue("Bob Banker")
  })

  test("Section 4: finance details NOT visible when isSubjectToFinance=false", async ({ page }) => {
    await setupPropertyRoutes(page)
    await setupNativeViewRoutes(page, PREFILL_BASE)
    await openOffersDialog(page)
    const panel = await openNativePanel(page)

    await expect(panel.getByTestId("buyer-offer-native--finance-details")).not.toBeVisible()
  })

  // ── Section 4 — Building & Pest ────────────────────────────────────────────

  test("Section 4: building & pest sub-panel hidden when buildingPestDays is null", async ({ page }) => {
    await setupPropertyRoutes(page)
    await setupNativeViewRoutes(page, PREFILL_BASE)
    await openOffersDialog(page)
    const panel = await openNativePanel(page)

    await expect(panel.getByTestId("buyer-offer-native--building-pest-panel")).not.toBeVisible()
  })

  test("Section 4: building & pest sub-panel visible and disabled when buildingPestDays=7", async ({ page }) => {
    await setupPropertyRoutes(page)
    await setupNativeViewRoutes(page, PREFILL_WITH_BUILDING_PEST)
    await openOffersDialog(page)
    const panel = await openNativePanel(page)

    const bpPanel = panel.getByTestId("buyer-offer-native--building-pest-panel")
    await expect(bpPanel).toBeVisible()
    const sevenDaysRadio = bpPanel.locator('input[type="radio"][value="7"]')
    await expect(sevenDaysRadio).toBeChecked()
    await expect(sevenDaysRadio).toBeDisabled()
    const suggestYes = bpPanel.locator('input[type="radio"][value="yes"]')
    await expect(suggestYes).toBeChecked()
  })

  // ── Section 4 — Sale sub-panel ─────────────────────────────────────────────

  test("Section 4: sale panel is hidden when isCashOffer=true", async ({ page }) => {
    await setupPropertyRoutes(page)
    await setupNativeViewRoutes(page, PREFILL_CASH_BUYER)
    await openOffersDialog(page)
    const panel = await openNativePanel(page)

    await expect(panel.getByTestId("buyer-offer-native--sale-panel")).not.toBeVisible()
  })

  test("Section 4: sale panel visible when isCashOffer=false", async ({ page }) => {
    await setupPropertyRoutes(page)
    await setupNativeViewRoutes(page, PREFILL_BASE)
    await openOffersDialog(page)
    const panel = await openNativePanel(page)

    await expect(panel.getByTestId("buyer-offer-native--sale-panel")).toBeVisible()
  })

  test("Section 4: sale details visible when isSubjectToSale=true — shows address and status", async ({ page }) => {
    await setupPropertyRoutes(page)
    await setupNativeViewRoutes(page, PREFILL_WITH_SALE_LISTED)
    await openOffersDialog(page)
    const panel = await openNativePanel(page)

    const saleDetails = panel.getByTestId("buyer-offer-native--sale-details")
    await expect(saleDetails).toBeVisible()
    await expect(panel.getByTestId("buyer-offer-native--sale-property-address")).toBeDisabled()
    await expect(panel.getByTestId("buyer-offer-native--sale-property-address")).toHaveValue("99 Old Rd, Brisbane, QLD, 4000")
    await expect(panel.getByTestId("buyer-offer-native--sale-status")).toBeDisabled()
  })

  test("Section 4: sale timeline panel visible when stage=to_be_listed", async ({ page }) => {
    await setupPropertyRoutes(page)
    await setupNativeViewRoutes(page, PREFILL_WITH_SALE_LISTED)
    await openOffersDialog(page)
    const panel = await openNativePanel(page)

    const timeline = panel.getByTestId("buyer-offer-native--sale-timeline")
    await expect(timeline).toBeVisible()
    await expect(panel.getByTestId("buyer-offer-native--sale-days-to-contract")).toBeDisabled()
    await expect(panel.getByTestId("buyer-offer-native--sale-days-to-contract")).toHaveValue("30")
  })

  test("Section 4: under-contract panel visible when stage=under_contract", async ({ page }) => {
    await setupPropertyRoutes(page)
    await setupNativeViewRoutes(page, PREFILL_WITH_SALE_UNDER_CONTRACT)
    await openOffersDialog(page)
    const panel = await openNativePanel(page)

    const underContract = panel.getByTestId("buyer-offer-native--sale-under-contract")
    await expect(underContract).toBeVisible()
    const noRadio = underContract.locator('input[type="radio"][value="no"]')
    await expect(noRadio).toBeChecked()
    await expect(noRadio).toBeDisabled()
    const financeCheckbox = underContract.getByTestId("buyer-offer-native--sale-condition-finance")
    await expect(financeCheckbox).toBeChecked()
    await expect(financeCheckbox).toBeDisabled()
    const bpCheckbox = underContract.getByTestId("buyer-offer-native--sale-condition-building-pest")
    await expect(bpCheckbox).toBeChecked()
    await expect(bpCheckbox).toBeDisabled()
  })

  test("Section 4: sale timeline NOT visible when stage=under_contract", async ({ page }) => {
    await setupPropertyRoutes(page)
    await setupNativeViewRoutes(page, PREFILL_WITH_SALE_UNDER_CONTRACT)
    await openOffersDialog(page)
    const panel = await openNativePanel(page)

    await expect(panel.getByTestId("buyer-offer-native--sale-timeline")).not.toBeVisible()
  })

  // ── Section 4 — Settlement ─────────────────────────────────────────────────

  test("Section 4: settlement block visible with disabled period input", async ({ page }) => {
    await setupPropertyRoutes(page)
    await setupNativeViewRoutes(page, PREFILL_BASE)
    await openOffersDialog(page)
    const panel = await openNativePanel(page)

    const settlementBlock = panel.getByTestId("buyer-offer-native--settlement-block")
    await expect(settlementBlock).toBeVisible()
    await expect(panel.getByTestId("buyer-offer-native--settlement-period")).toBeDisabled()
    await expect(panel.getByTestId("buyer-offer-native--settlement-period")).toHaveValue("60")
  })

  // ── Section 5 — Extra Comments ─────────────────────────────────────────────

  test("Section 5: extra comments textarea is disabled with conditionNotes value", async ({ page }) => {
    await setupPropertyRoutes(page)
    await setupNativeViewRoutes(page, PREFILL_WITH_NOTES)
    await openOffersDialog(page)
    const panel = await openNativePanel(page)

    const textarea = panel.getByTestId("buyer-offer-native--extra-comments")
    await expect(textarea).toBeVisible()
    await expect(textarea).toBeDisabled()
    await expect(textarea).toHaveValue("Buyer requests early access for inspection.")
  })

  // ── Rep section ────────────────────────────────────────────────────────────

  test("Rep section hidden when rep is null", async ({ page }) => {
    await setupPropertyRoutes(page)
    await setupNativeViewRoutes(page, PREFILL_BASE)
    await openOffersDialog(page)
    const panel = await openNativePanel(page)

    await expect(panel.getByTestId("buyer-offer-native--rep-section")).not.toBeVisible()
  })

  test("Rep section shows disabled inputs when rep is present", async ({ page }) => {
    await setupPropertyRoutes(page)
    await setupNativeViewRoutes(page, PREFILL_WITH_REP)
    await openOffersDialog(page)
    const panel = await openNativePanel(page)

    const repSection = panel.getByTestId("buyer-offer-native--rep-section")
    await expect(repSection).toBeVisible()
    await expect(panel.getByTestId("buyer-offer-native--rep-name")).toBeDisabled()
    await expect(panel.getByTestId("buyer-offer-native--rep-name")).toHaveValue("Rep Person")
    await expect(panel.getByTestId("buyer-offer-native--rep-phone")).toBeDisabled()
    await expect(panel.getByTestId("buyer-offer-native--rep-email")).toBeDisabled()
  })

  // ── Backward-compat: existing content checks still pass ───────────────────

  test("panel still shows property address value (existing behaviour preserved)", async ({ page }) => {
    await setupPropertyRoutes(page)
    await setupNativeViewRoutes(page)
    await openOffersDialog(page)
    const panel = await openNativePanel(page)

    await expect(panel.getByTestId("buyer-offer-native--property-address")).toHaveValue("12 Test Street, Testville, QLD, 4000")
  })

  test("panel still shows buyer name value (existing behaviour preserved)", async ({ page }) => {
    await setupPropertyRoutes(page)
    await setupNativeViewRoutes(page)
    await openOffersDialog(page)
    const panel = await openNativePanel(page)

    await expect(panel.getByTestId("buyer-offer-native--buyer-1-name")).toHaveValue("Test Buyer")
  })
})
