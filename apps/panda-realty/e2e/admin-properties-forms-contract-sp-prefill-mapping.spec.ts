/**
 * E2E: Contract S&P — Prefill mapping verification story
 * Run: npm run test:e2e:scratch -- --app=panda-realty --spec="apps/panda-realty/e2e/admin-properties-forms-contract-sp-prefill-mapping.spec.ts" --no-retry
 */
import { expect, test } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { createStory, shotFocused } from "@repo/e2e-utils"
import {
  CSP_PREFILL_DATA_CASH_BUYER,
  CSP_PREFILL_DATA_FINANCED_BUYER,
  CSP_PREFILL_DATA_SETTLEMENT_PERIOD_ONLY,
  CSP_PREFILL_DATA_SPECIAL_CONDITIONS_FULL,
  CSP_PREFILL_DATA_WITH_BUYER_SOLICITOR,
} from "./helpers/panda-contract-sp-mock-data"
import { makeContractSpPrefill, openContractSpSendDialog } from "./helpers/panda-contract-sp-send-mocks"

const SHOT_DIR = join(dirname(fileURLToPath(import.meta.url)), "screenshots", "contract-sp-prefill-mapping")

const story = createStory({ specUrl: import.meta.url, slug: "contract-sp-prefill-mapping" })
story.setWhatWasBuilt(
  "The REIQ Contract S&P web form (contract-sp-fill-step) now pre-populates all fields from the accepted buyer offer. " +
  "Seller/buyer parties, solicitors, property details, purchase price, deposits, settlement date, finance conditions, building inspection, " +
  "and special conditions are all correctly mapped from the database. Finance fields are conditionally blank for cash buyers. " +
  "Settlement date is a plain text input to support relative strings like '30 Days from Contract Date'. " +
  "Special conditions are auto-compiled with sequential numbering: ET clause first, then further terms, then subject-to-sale.",
)

test.describe("Contract S&P — prefill mapping verification", () => {
  test.beforeEach(async () => {
    await mkdir(SHOT_DIR, { recursive: true })
  })

  test.afterAll(() => {
    story.write()
  })

  test.describe("Financed buyer — happy path", () => {
    test.beforeEach(makeContractSpPrefill(CSP_PREFILL_DATA_FINANCED_BUYER))

    test("01 — Page 1: seller name pre-populated from property owner", async ({ page }) => {
      await openContractSpSendDialog(page)
      const sellerName = page.getByTestId("contract-sp-page1-seller1-name")
      await expect(sellerName).toHaveValue("Margaret Smith")
      await shotFocused(page, sellerName, SHOT_DIR, "01-page1-seller-name")
      story.addScene({
        title: "01 — Page 1: Seller name prefilled",
        images: [join(SHOT_DIR, "01-page1-seller-name.png")],
        seeing:
          "Seller 1 Name input is pre-populated with 'Margaret Smith' from the property owner data. " +
          "The field is a plain editable text input so agents can adjust before sending.",
        steps: [
          "Open Admin → Properties",
          "Click a property row → dialog opens",
          "Click the Forms tab",
          "Click Fill on the Contract S&P form",
          "Page 1 (Sellers section) is active by default",
        ],
      })
    })

    test("02 — Page 2: buyer solicitor shows 'To Be Confirmed' when no solicitor on file", async ({ page }) => {
      await openContractSpSendDialog(page)
      await page.getByTestId("contract-sp-tab-trigger--2").click()
      const buyerSolicitorName = page.getByTestId("contract-sp-page2-buyer-solicitor-name")
      await expect(buyerSolicitorName).toHaveValue("To Be Confirmed")
      await shotFocused(page, buyerSolicitorName, SHOT_DIR, "02-buyer-solicitor-tbc")
      story.addScene({
        title: "02 — Page 2: Buyer solicitor 'To Be Confirmed' fallback",
        images: [join(SHOT_DIR, "02-buyer-solicitor-tbc.png")],
        seeing:
          "When the buyer has not yet filled in their solicitor via the offer form, the Buyer's Solicitor Name " +
          "field shows 'To Be Confirmed' as a clear placeholder so agents know it needs to be filled before sending.",
        steps: [
          "Open the Contract S&P fill dialog",
          "Click Page 2 tab",
          "Observe Buyer's Solicitor Name field — shows 'To Be Confirmed' placeholder",
        ],
      })
    })

    test("04 — Page 2: purchase price formatted with $ prefix and commas", async ({ page }) => {
      await openContractSpSendDialog(page)
      await page.getByTestId("contract-sp-tab-trigger--2").click()
      const purchasePrice = page.getByTestId("contract-sp-page2-purchase-price")
      await expect(purchasePrice).toHaveValue("$825,000.00")
      await shotFocused(page, purchasePrice, SHOT_DIR, "04-purchase-price")
      story.addScene({
        title: "04 — Page 2: Purchase price formatted with $ prefix",
        images: [join(SHOT_DIR, "04-purchase-price.png")],
        seeing:
          "The Purchase Price field shows '$825,000.00' — the sale price from the property record, formatted " +
          "with a dollar sign prefix, comma separators, and two decimal places per the PDF spec.",
        steps: [
          "Open the Contract S&P fill dialog",
          "Click Page 2 tab",
          "Observe the Purchase Price field in the Price & Deposit section",
        ],
      })
    })

    test("05 — Page 2: deposits formatted + depositHolder defaults to trust account", async ({ page }) => {
      await openContractSpSendDialog(page)
      await page.getByTestId("contract-sp-tab-trigger--2").click()
      const depositInitial = page.getByTestId("contract-sp-page2-deposit-initial")
      const depositBalance = page.getByTestId("contract-sp-page2-deposit-balance")
      const depositHolder = page.getByTestId("contract-sp-page2-deposit-holder")
      await expect(depositInitial).toHaveValue("$20,000.00")
      await expect(depositBalance).toHaveValue("$62,500.00")
      await expect(depositHolder).toHaveValue("My Panda Realty Trust Account")
      await shotFocused(page, depositHolder, SHOT_DIR, "05-deposit-holder")
      story.addScene({
        title: "05 — Page 2: Deposits formatted + deposit holder default",
        images: [join(SHOT_DIR, "05-deposit-holder.png")],
        seeing:
          "Deposit Initial ($20,000.00) and Deposit Balance ($62,500.00) from the accepted offer are formatted " +
          "with $ prefix. Deposit Holder defaults to 'My Panda Realty Trust Account' per business rules.",
        steps: [
          "Open the Contract S&P fill dialog",
          "Click Page 2 tab",
          "Scroll to Price & Deposit section",
        ],
      })
    })

    test("06 — Page 3: settlement date is a plain text input showing the actual date", async ({ page }) => {
      await openContractSpSendDialog(page)
      await page.getByTestId("contract-sp-tab-trigger--3").click()
      const settlementDate = page.getByTestId("contract-sp-page3-settlement-date")
      await expect(settlementDate).toHaveValue("2026-09-15")
      await shotFocused(page, settlementDate, SHOT_DIR, "06-settlement-date-text")
      story.addScene({
        title: "06 — Page 3: Settlement date as plain text input",
        images: [join(SHOT_DIR, "06-settlement-date-text.png")],
        seeing:
          "The Settlement Date field is a plain text input (not a browser date picker). The accepted offer's " +
          "settlement date '2026-09-15' is displayed as-is. The placeholder notes it also accepts relative strings " +
          "like '30 Days from Contract Date'.",
        steps: [
          "Open the Contract S&P fill dialog",
          "Click Page 3 tab",
          "Observe Settlement Date field at the top — plain text, not a calendar picker",
        ],
      })
    })

    test("08 — Page 3: finance fields auto-populated for financed buyer", async ({ page }) => {
      await openContractSpSendDialog(page)
      await page.getByTestId("contract-sp-tab-trigger--3").click()
      const financeAmount = page.getByTestId("contract-sp-page3-finance-amount")
      const financier = page.getByTestId("contract-sp-page3-financier")
      const financeDate = page.getByTestId("contract-sp-page3-finance-date")
      const inspectionDate = page.getByTestId("contract-sp-page3-inspection-date")
      await expect(financeAmount).toHaveValue("Sufficient to complete the transaction")
      await expect(financier).toHaveValue("ANZ Bank")
      await expect(financeDate).toHaveValue("14 Days from Contract Date")
      await expect(inspectionDate).toHaveValue("14 Days from Contract Date")
      await shotFocused(page, financeAmount, SHOT_DIR, "08-finance-fields-populated")
      story.addScene({
        title: "08 — Page 3: Finance and inspection fields auto-populated (financed buyer)",
        images: [join(SHOT_DIR, "08-finance-fields-populated.png")],
        seeing:
          "For a buyer with isSubjectToFinance=true: Finance Amount shows 'Sufficient to complete the transaction', " +
          "Financier shows 'ANZ Bank' from the offer, Finance Date shows '14 Days from Contract Date' from financeDays, " +
          "and Inspection Date shows '14 Days from Contract Date' from buildingPestDays.",
        steps: [
          "Open the Contract S&P fill dialog for a property with a financed accepted offer",
          "Click Page 3 tab",
          "Observe the Finance and Building/Pest Inspection sections",
        ],
      })
    })

    test("10a — Page 6: special conditions auto-compiled — ET + further terms", async ({ page }) => {
      await openContractSpSendDialog(page)
      await page.getByTestId("contract-sp-tab-trigger--6").click()
      const specialConditions = page.getByTestId("contract-sp-page6-special-conditions")
      await expect(specialConditions).toContainText("1. ELECTRONIC TRANSMISSION:")
      await expect(specialConditions).toContainText("2. FURTHER TERMS:")
      await shotFocused(page, specialConditions, SHOT_DIR, "10a-special-conditions-et-further-terms")
      story.addScene({
        title: "10a — Page 6: Special conditions — ET + further terms",
        images: [join(SHOT_DIR, "10a-special-conditions-et-further-terms.png")],
        seeing:
          "The Special Conditions textarea is auto-compiled: clause 1 is the Electronic Transmission consent text, " +
          "clause 2 is FURTHER TERMS populated from the offer's conditionNotes field. Numbers are sequential.",
        steps: [
          "Open the Contract S&P fill dialog",
          "Click Page 6 tab",
          "Observe Special Conditions textarea — two numbered clauses",
        ],
      })
    })
  })

  test.describe("Buyer solicitor populated from offer form", () => {
    test.beforeEach(makeContractSpPrefill(CSP_PREFILL_DATA_WITH_BUYER_SOLICITOR))

    test("03 — Page 2: buyer solicitor name populated when available", async ({ page }) => {
      await openContractSpSendDialog(page)
      await page.getByTestId("contract-sp-tab-trigger--2").click()
      const buyerSolicitorName = page.getByTestId("contract-sp-page2-buyer-solicitor-name")
      await expect(buyerSolicitorName).toHaveValue("Buyer Legal Partners")
      await shotFocused(page, buyerSolicitorName, SHOT_DIR, "03-buyer-solicitor-populated")
      story.addScene({
        title: "03 — Page 2: Buyer solicitor name populated from offer form",
        images: [join(SHOT_DIR, "03-buyer-solicitor-populated.png")],
        seeing:
          "When the buyer's offer form submission includes a solicitor, the Buyer's Solicitor Name shows " +
          "'Buyer Legal Partners' — pulled from the latest submitted offer form for this buyer's propertyEntityId.",
        steps: [
          "Open the Contract S&P fill dialog for a property whose buyer submitted an offer form with solicitor details",
          "Click Page 2 tab",
          "Observe Buyer's Solicitor Name — shows actual solicitor name, not 'To Be Confirmed'",
        ],
      })
    })
  })

  test.describe("Settlement period fallback", () => {
    test.beforeEach(makeContractSpPrefill(CSP_PREFILL_DATA_SETTLEMENT_PERIOD_ONLY))

    test("07 — Page 3: settlement shows '30 Days from Contract Date' when only period is set", async ({ page }) => {
      await openContractSpSendDialog(page)
      await page.getByTestId("contract-sp-tab-trigger--3").click()
      const settlementDate = page.getByTestId("contract-sp-page3-settlement-date")
      await expect(settlementDate).toHaveValue("30 Days from Contract Date")
      await shotFocused(page, settlementDate, SHOT_DIR, "07-settlement-period-fallback")
      story.addScene({
        title: "07 — Page 3: Settlement period fallback string",
        images: [join(SHOT_DIR, "07-settlement-period-fallback.png")],
        seeing:
          "When the accepted offer has settlementDate=null but settlementPeriod='30', the Settlement Date field " +
          "shows '30 Days from Contract Date' — a human-readable relative string that a date picker input cannot display.",
        steps: [
          "Open the Contract S&P fill dialog for a property whose offer has settlementPeriod='30' but no fixed date",
          "Click Page 3 tab",
          "Observe Settlement Date field — shows '30 Days from Contract Date'",
        ],
      })
    })
  })

  test.describe("Cash buyer — finance fields blank", () => {
    test.beforeEach(makeContractSpPrefill(CSP_PREFILL_DATA_CASH_BUYER))

    test("09 — Page 3: finance fields empty for cash buyer", async ({ page }) => {
      await openContractSpSendDialog(page)
      await page.getByTestId("contract-sp-tab-trigger--3").click()
      const financeAmount = page.getByTestId("contract-sp-page3-finance-amount")
      const financier = page.getByTestId("contract-sp-page3-financier")
      const financeDate = page.getByTestId("contract-sp-page3-finance-date")
      await expect(financeAmount).toHaveValue("")
      await expect(financier).toHaveValue("")
      await expect(financeDate).toHaveValue("")
      await shotFocused(page, financeAmount, SHOT_DIR, "09-finance-fields-cash-buyer")
      story.addScene({
        title: "09 — Page 3: Finance fields empty (cash buyer)",
        images: [join(SHOT_DIR, "09-finance-fields-cash-buyer.png")],
        seeing:
          "For a cash buyer (isCashOffer=true), all three finance fields — Amount, Financier, Date — are left blank " +
          "even when isSubjectToFinance is also set. The cash flag takes priority per the PDF spec.",
        steps: [
          "Open the Contract S&P fill dialog for a property whose accepted offer has isCashOffer=true",
          "Click Page 3 tab",
          "Observe the Finance section — all fields are empty",
        ],
      })
    })
  })

  test.describe("All special conditions — ET + further terms + subject to sale", () => {
    test.beforeEach(makeContractSpPrefill(CSP_PREFILL_DATA_SPECIAL_CONDITIONS_FULL))

    test("10b — Page 6: special conditions sequential numbering with all 3 clauses", async ({ page }) => {
      await openContractSpSendDialog(page)
      await page.getByTestId("contract-sp-tab-trigger--6").click()
      const specialConditions = page.getByTestId("contract-sp-page6-special-conditions")
      await expect(specialConditions).toContainText("1. ELECTRONIC TRANSMISSION:")
      await expect(specialConditions).toContainText("2. FURTHER TERMS:")
      await expect(specialConditions).toContainText("3. SUBJECT TO SALE:")
      await shotFocused(page, specialConditions, SHOT_DIR, "10b-special-conditions-all-three")
      story.addScene({
        title: "10b — Page 6: Special conditions — all 3 clauses sequential",
        images: [join(SHOT_DIR, "10b-special-conditions-all-three.png")],
        seeing:
          "When the offer has conditionNotes AND isSubjectToSale=true, all three clauses are compiled with sequential " +
          "numbers: 1. Electronic Transmission, 2. Further Terms (from conditionNotes), 3. Subject to Sale " +
          "(with the buyer's current property address). No gaps in numbering.",
        steps: [
          "Open the Contract S&P fill dialog for a property with conditionNotes + isSubjectToSale=true",
          "Click Page 6 tab",
          "Observe the Special Conditions textarea — three sequential numbered clauses",
        ],
      })
    })
  })
})
