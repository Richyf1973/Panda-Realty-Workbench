/**
 * E2E: Contract S&P — FormCaption guidance text on all 6 page tabs
 * Run: npm run test:e2e:scratch -- --app=panda-realty --spec="apps/panda-realty/e2e/admin-properties-forms-contract-sp-captions.spec.ts" --no-bail
 */
import { expect, test } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { createStory, shotFocused } from "@repo/e2e-utils"
import { CSP_PREFILL_DATA_FULL } from "./helpers/panda-contract-sp-mock-data"
import { makeContractSpPrefill, openContractSpSendDialog } from "./helpers/panda-contract-sp-send-mocks"

const SHOT_DIR = join(dirname(fileURLToPath(import.meta.url)), "screenshots", "contract-sp-captions")

const story = createStory({ specUrl: import.meta.url, slug: "contract-sp-captions" })
story.setWhatWasBuilt(
  "Contract S&P fill step (pages 1–6): FormCaption guidance text added to every page tab " +
  "matching the printed helper text from the PDF. " +
  "Covers sellers/solicitor hints, property sold-as note, deposit warnings, " +
  "GST/land-tax/finance/inspection guidance, title encumbrances, safety notes, " +
  "community titles inspection dates, and signature attestation captions.",
)

test.beforeEach(async () => {
  await mkdir(SHOT_DIR, { recursive: true })
})

test.afterAll(async () => {
  story.write()
})

// ── Page 1 ────────────────────────────────────────────────────────────────────

test.describe("Page 1 — Sellers / Agent / Solicitor captions", () => {
  test.beforeEach(makeContractSpPrefill(CSP_PREFILL_DATA_FULL))

  test("Page 1 — Sellers section shows 'or any other person authorised to act as Seller' caption", async ({ page }) => {
    await openContractSpSendDialog(page)
    const fill = page.getByTestId("contract-sp-fill-step")
    const caption = fill.getByText("or any other person authorised to act as Seller")
    await expect(caption).toBeVisible({ timeout: 10_000 })
    await shotFocused(page, caption, SHOT_DIR, "01-page1-sellers-caption")
    story.addScene({
      title: "01 — Page 1: Sellers section caption",
      images: [join(SHOT_DIR, "01-page1-sellers-caption.png")],
      seeing: "Sellers section shows guidance caption matching PDF printed text.",
      steps: ["Open Contract S&P send dialog", "Page 1 tab is default"],
    })
  })

  test("Page 1 — Seller's Solicitor section shows 'or any other solicitor notified to the buyer' caption", async ({ page }) => {
    await openContractSpSendDialog(page)
    const fill = page.getByTestId("contract-sp-fill-step")
    const caption = fill.getByText("or any other solicitor notified to the buyer")
    await expect(caption).toBeVisible({ timeout: 10_000 })
    await shotFocused(page, caption, SHOT_DIR, "02-page1-solicitor-caption")
    story.addScene({
      title: "02 — Page 1: Seller's Solicitor caption",
      images: [join(SHOT_DIR, "02-page1-solicitor-caption.png")],
      seeing: "Seller's Solicitor section shows guidance caption.",
      steps: ["Open dialog", "Page 1 default"],
    })
  })
})

// ── Page 2 ────────────────────────────────────────────────────────────────────

test.describe("Page 2 — Property / Price & Deposit captions", () => {
  test.beforeEach(makeContractSpPrefill(CSP_PREFILL_DATA_FULL))

  test("Page 2 — Buyer's Solicitor section shows 'or any other solicitor notified to the Seller' caption", async ({ page }) => {
    await openContractSpSendDialog(page)
    await page.getByTestId("contract-sp-tab-trigger--2").click()
    const fill = page.getByTestId("contract-sp-fill-step")
    const caption = fill.getByText("or any other solicitor notified to the Seller")
    await expect(caption).toBeVisible({ timeout: 10_000 })
    await shotFocused(page, caption, SHOT_DIR, "03-page2-buyer-solicitor-caption")
    story.addScene({
      title: "03 — Page 2: Buyer's Solicitor caption",
      images: [join(SHOT_DIR, "03-page2-buyer-solicitor-caption.png")],
      seeing: "Buyer's Solicitor section shows solicitor hint caption.",
      steps: ["Open dialog", "Click Page 2 tab"],
    })
  })

  test("Page 2 — Sold As shows 'If neither is selected, the Lot is treated as being Freehold.' caption", async ({ page }) => {
    await openContractSpSendDialog(page)
    await page.getByTestId("contract-sp-tab-trigger--2").click()
    const fill = page.getByTestId("contract-sp-fill-step")
    await expect(fill.getByText("If neither is selected, the Lot is treated as being Freehold.")).toBeVisible({ timeout: 10_000 })
  })

  test("Page 2 — Excluded Fixtures shows 'attach annexure for additional space' caption", async ({ page }) => {
    await openContractSpSendDialog(page)
    await page.getByTestId("contract-sp-tab-trigger--2").click()
    const fill = page.getByTestId("contract-sp-fill-step")
    // Two instances expected (Excluded Fixtures + Included Chattels) — assert at least one
    await expect(fill.getByText("attach annexure for additional space").first()).toBeVisible({ timeout: 10_000 })
  })

  test("Page 2 — Price section shows Cyber Warning caption", async ({ page }) => {
    await openContractSpSendDialog(page)
    await page.getByTestId("contract-sp-tab-trigger--2").click()
    const fill = page.getByTestId("contract-sp-fill-step")
    const caption = fill.getByText(/Cyber criminals are targeting real estate transactions/)
    await expect(caption).toBeVisible({ timeout: 10_000 })
    await shotFocused(page, caption, SHOT_DIR, "04-page2-cyber-warning")
    story.addScene({
      title: "04 — Page 2: Cyber Warning caption",
      images: [join(SHOT_DIR, "04-page2-cyber-warning.png")],
      seeing: "Price & Deposit section shows verbatim Cyber Warning from PDF before Purchase Price field.",
      steps: ["Open dialog", "Click Page 2 tab", "Scroll to Price section"],
    })
  })

  test("Page 2 — Deposit Initial shows 'payable on the day the Buyer signs' caption", async ({ page }) => {
    await openContractSpSendDialog(page)
    await page.getByTestId("contract-sp-tab-trigger--2").click()
    const fill = page.getByTestId("contract-sp-fill-step")
    await expect(fill.getByText(/payable on the day the Buyer signs this Contract/)).toBeVisible({ timeout: 10_000 })
  })

  test("Page 2 — Deposit Balance shows 'NOTE: failure to pay the deposit' caption", async ({ page }) => {
    await openContractSpSendDialog(page)
    await page.getByTestId("contract-sp-tab-trigger--2").click()
    const fill = page.getByTestId("contract-sp-fill-step")
    await expect(fill.getByText(/failure to pay the deposit on the date/)).toBeVisible({ timeout: 10_000 })
  })

  test("Page 2 — Default Interest Rate shows 'If no figure is inserted, the Contract Rate' caption", async ({ page }) => {
    await openContractSpSendDialog(page)
    await page.getByTestId("contract-sp-tab-trigger--2").click()
    const fill = page.getByTestId("contract-sp-fill-step")
    const caption = fill.getByText(/If no figure is inserted, the Contract Rate/)
    await expect(caption).toBeVisible({ timeout: 10_000 })
    await shotFocused(page, caption, SHOT_DIR, "05-page2-deposit-captions")
    story.addScene({
      title: "05 — Page 2: Deposit section captions",
      images: [join(SHOT_DIR, "05-page2-deposit-captions.png")],
      seeing: "Deposit fields include guidance captions for initial deposit timing, balance deposit NOTE, and default interest rate.",
      steps: ["Open dialog", "Click Page 2 tab", "Scroll to deposit section"],
    })
  })

  test("Page 2 — existing 'Banking details for the trust account' caption still present (regression)", async ({ page }) => {
    await openContractSpSendDialog(page)
    await page.getByTestId("contract-sp-tab-trigger--2").click()
    const fill = page.getByTestId("contract-sp-fill-step")
    await expect(fill.getByText("Banking details for the trust account where the deposit will be held.")).toBeVisible({ timeout: 10_000 })
  })
})

// ── Page 3 ────────────────────────────────────────────────────────────────────

test.describe("Page 3 — Settlement / GST / Finance captions", () => {
  test.beforeEach(makeContractSpPrefill(CSP_PREFILL_DATA_FULL))

  test("Page 3 — Settlement Date shows clause 6.2 / WARNING caption", async ({ page }) => {
    await openContractSpSendDialog(page)
    await page.getByTestId("contract-sp-tab-trigger--3").click()
    const fill = page.getByTestId("contract-sp-fill-step")
    const caption = fill.getByText(/or any later date for settlement in accordance with clause 6\.2/)
    await expect(caption).toBeVisible({ timeout: 10_000 })
    await shotFocused(page, caption, SHOT_DIR, "06-page3-settlement-caption")
    story.addScene({
      title: "06 — Page 3: Settlement Date caption",
      images: [join(SHOT_DIR, "06-page3-settlement-caption.png")],
      seeing: "Settlement Date field shows verbatim clause reference and WARNING from PDF.",
      steps: ["Open dialog", "Click Page 3 tab"],
    })
  })

  test("Page 3 — GST radios show select-one + professional advice caption", async ({ page }) => {
    await openContractSpSendDialog(page)
    await page.getByTestId("contract-sp-tab-trigger--3").click()
    const fill = page.getByTestId("contract-sp-fill-step")
    await expect(fill.getByText(/Select one\. For sale of house or residential land/)).toBeVisible({ timeout: 10_000 })
  })

  test("Page 3 — existing GST Withholding Obligation caption still present (regression)", async ({ page }) => {
    await openContractSpSendDialog(page)
    await page.getByTestId("contract-sp-tab-trigger--3").click()
    const fill = page.getByTestId("contract-sp-fill-step")
    await expect(fill.getByText("Applies when the supply is new residential premises or potential residential land.")).toBeVisible({ timeout: 10_000 })
  })

  test("Page 3 — Land Tax shows 'NOTE: This item must be completed if' caption", async ({ page }) => {
    await openContractSpSendDialog(page)
    await page.getByTestId("contract-sp-tab-trigger--3").click()
    const fill = page.getByTestId("contract-sp-fill-step")
    await expect(fill.getByText(/This item must be completed if: the Property is not the Seller/)).toBeVisible({ timeout: 10_000 })
  })

  test("Page 3 — Finance shows 'Unless all of Finance Amount, Financier and Finance Date' caption", async ({ page }) => {
    await openContractSpSendDialog(page)
    await page.getByTestId("contract-sp-tab-trigger--3").click()
    const fill = page.getByTestId("contract-sp-fill-step")
    const caption = fill.getByText(/Unless all of .Finance Amount., .Financier. and .Finance Date./)
    await expect(caption).toBeVisible({ timeout: 10_000 })
    await shotFocused(page, caption, SHOT_DIR, "07-page3-finance-inspection-captions")
    story.addScene({
      title: "07 — Page 3: Finance & Inspection captions",
      images: [join(SHOT_DIR, "07-page3-finance-inspection-captions.png")],
      seeing: "Finance section and Inspection Date both show captions explaining when the clause applies.",
      steps: ["Open dialog", "Click Page 3 tab", "Scroll to Finance section"],
    })
  })

  test("Page 3 — Inspection Date shows 'If Inspection Date is not completed' caption", async ({ page }) => {
    await openContractSpSendDialog(page)
    await page.getByTestId("contract-sp-tab-trigger--3").click()
    const fill = page.getByTestId("contract-sp-fill-step")
    await expect(fill.getByText(/If .Inspection Date. is not completed, the contract is not subject to an inspection/)).toBeVisible({ timeout: 10_000 })
  })
})

// ── Page 4 ────────────────────────────────────────────────────────────────────

test.describe("Page 4 — Title / Pool / Safety captions", () => {
  test.beforeEach(makeContractSpPrefill(CSP_PREFILL_DATA_FULL))

  test("Page 4 — Title Encumbrances shows 'The Encumbrances listed below will remain after settlement' caption", async ({ page }) => {
    await openContractSpSendDialog(page)
    await page.getByTestId("contract-sp-tab-trigger--4").click()
    const fill = page.getByTestId("contract-sp-fill-step")
    const caption = fill.getByText("The Encumbrances listed below will remain after settlement under clause 7.2.")
    await expect(caption).toBeVisible({ timeout: 10_000 })
    await shotFocused(page, caption, SHOT_DIR, "08-page4-encumbrances-caption")
    story.addScene({
      title: "08 — Page 4: Title Encumbrances caption",
      images: [join(SHOT_DIR, "08-page4-encumbrances-caption.png")],
      seeing: "Title Encumbrances section opens with the clause 7.2 guidance caption.",
      steps: ["Open dialog", "Click Page 4 tab"],
    })
  })

  test("Page 4 — Electrical Safety section shows 'NOTE: This section must be completed if there is a domestic dwelling' caption", async ({ page }) => {
    await openContractSpSendDialog(page)
    await page.getByTestId("contract-sp-tab-trigger--4").click()
    const fill = page.getByTestId("contract-sp-fill-step")
    await expect(fill.getByText(/This section must be completed if there is a domestic dwelling/)).toBeVisible({ timeout: 10_000 })
  })

  test("Page 4 — Safety Switch shows WARNING about false or misleading information caption", async ({ page }) => {
    await openContractSpSendDialog(page)
    await page.getByTestId("contract-sp-tab-trigger--4").click()
    const fill = page.getByTestId("contract-sp-fill-step")
    const caption = fill.getByText(/for giving false or misleading information in this section/)
    await expect(caption).toBeVisible({ timeout: 10_000 })
    await shotFocused(page, caption, SHOT_DIR, "09-page4-safety-captions")
    story.addScene({
      title: "09 — Page 4: Safety Switch & Smoke Alarms captions",
      images: [join(SHOT_DIR, "09-page4-safety-captions.png")],
      seeing: "Safety Switch and Smoke Alarms each show their respective WARNING captions from the PDF.",
      steps: ["Open dialog", "Click Page 4 tab", "Scroll to Electrical Safety section"],
    })
  })

  test("Page 4 — Smoke Alarms shows WARNING clause 7.8 / Fire Services Act caption", async ({ page }) => {
    await openContractSpSendDialog(page)
    await page.getByTestId("contract-sp-tab-trigger--4").click()
    const fill = page.getByTestId("contract-sp-fill-step")
    await expect(fill.getByText(/clause 7\.8 the Seller must assist in achieving or complying with the Smoke Alarm/)).toBeVisible({ timeout: 10_000 })
  })
})

// ── Page 5 ────────────────────────────────────────────────────────────────────

test.describe("Page 5 — Community Titles / Building Units captions", () => {
  test.beforeEach(makeContractSpPrefill(CSP_PREFILL_DATA_FULL))

  test("Page 5 — existing (a)–(g) community titles captions still present (regression)", async ({ page }) => {
    await openContractSpSendDialog(page)
    await page.getByTestId("contract-sp-tab-trigger--5").click()
    const fill = page.getByTestId("contract-sp-fill-step")
    await expect(fill.getByTestId("contract-sp-page5-community-titles-caption-a")).toBeVisible({ timeout: 10_000 })
    await expect(fill.getByTestId("contract-sp-page5-community-titles-caption-g")).toBeVisible({ timeout: 10_000 })
  })

  test("Page 5 — Community Titles Records Inspection Date shows clause 12.3 caption", async ({ page }) => {
    await openContractSpSendDialog(page)
    await page.getByTestId("contract-sp-tab-trigger--5").click()
    const fill = page.getByTestId("contract-sp-fill-step")
    const caption = fill.getByText(/clause 12\.3 does not apply/)
    await expect(caption).toBeVisible({ timeout: 10_000 })
    await shotFocused(page, caption, SHOT_DIR, "10-page5-inspection-date-captions")
    story.addScene({
      title: "10 — Page 5: Inspection Date captions",
      images: [join(SHOT_DIR, "10-page5-inspection-date-captions.png")],
      seeing: "Both Records Inspection Date fields show captions referencing the relevant clause (12.3 / 13.3).",
      steps: ["Open dialog", "Click Page 5 tab", "Scroll to Records Inspection Date fields"],
    })
  })

  test("Page 5 — Building Units Records Inspection Date shows clause 13.3 caption", async ({ page }) => {
    await openContractSpSendDialog(page)
    await page.getByTestId("contract-sp-tab-trigger--5").click()
    const fill = page.getByTestId("contract-sp-fill-step")
    await expect(fill.getByText(/clause 13\.3 does not apply/)).toBeVisible({ timeout: 10_000 })
  })
})

// ── Page 6 ────────────────────────────────────────────────────────────────────

test.describe("Page 6 — Special Conditions / Signatures captions", () => {
  test.beforeEach(makeContractSpPrefill(CSP_PREFILL_DATA_FULL))

  test("Page 6 — Special Conditions shows REIQ Terms preamble caption", async ({ page }) => {
    await openContractSpSendDialog(page)
    await page.getByTestId("contract-sp-tab-trigger--6").click()
    const fill = page.getByTestId("contract-sp-fill-step")
    const caption = fill.getByText(/REIQ Terms of Contract for the Sale and Purchase of Residential Real Estate \(Pages 7-18\)/)
    await expect(caption).toBeVisible({ timeout: 10_000 })
    await shotFocused(page, caption, SHOT_DIR, "11-page6-special-conditions-caption")
    story.addScene({
      title: "11 — Page 6: Special Conditions caption",
      images: [join(SHOT_DIR, "11-page6-special-conditions-caption.png")],
      seeing: "Special Conditions section shows REIQ Terms preamble caption from PDF page 6.",
      steps: ["Open dialog", "Click Page 6 tab"],
    })
  })

  test("Page 6 — Buyer Signatures section shows statutory cooling-off period caption", async ({ page }) => {
    await openContractSpSendDialog(page)
    await page.getByTestId("contract-sp-tab-trigger--6").click()
    const fill = page.getByTestId("contract-sp-fill-step")
    const caption = fill.getByText(/5 business day statutory cooling-off period/)
    await expect(caption).toBeVisible({ timeout: 10_000 })
    await shotFocused(page, caption, SHOT_DIR, "12-page6-signatures-caption")
    story.addScene({
      title: "12 — Page 6: Signatures cooling-off caption",
      images: [join(SHOT_DIR, "12-page6-signatures-caption.png")],
      seeing: "Buyer Signatures section opens with the statutory cooling-off period warning from the PDF.",
      steps: ["Open dialog", "Click Page 6 tab", "Scroll to Buyer Signatures section"],
    })
  })

  test("Page 6 — Buyer 1 signing row shows warrant caption", async ({ page }) => {
    await openContractSpSendDialog(page)
    await page.getByTestId("contract-sp-tab-trigger--6").click()
    const fill = page.getByTestId("contract-sp-fill-step")
    await expect(fill.getByText(/I warrant that I am the Buyer named in the Reference Schedule/).first()).toBeVisible({ timeout: 10_000 })
  })

  test("Page 6 — Buyer signing rows show no-witness note caption", async ({ page }) => {
    await openContractSpSendDialog(page)
    await page.getByTestId("contract-sp-tab-trigger--6").click()
    const fill = page.getByTestId("contract-sp-fill-step")
    await expect(fill.getByText(/No witness is required if the Buyer signs using an Electronic Signature/).first()).toBeVisible({ timeout: 10_000 })
  })

  test("Page 6 — Seller 1 signing row shows warrant caption", async ({ page }) => {
    await openContractSpSendDialog(page)
    await page.getByTestId("contract-sp-tab-trigger--6").click()
    const fill = page.getByTestId("contract-sp-fill-step")
    const caption = fill.getByText(/I warrant that I am the Seller named in the Reference Schedule/).first()
    await expect(caption).toBeVisible({ timeout: 10_000 })
    await shotFocused(page, caption, SHOT_DIR, "13-page6-signing-captions")
    story.addScene({
      title: "13 — Page 6: Signing row captions",
      images: [join(SHOT_DIR, "13-page6-signing-captions.png")],
      seeing: "Each of the four signing rows shows the warrant statement and no-witness note captions.",
      steps: ["Open dialog", "Click Page 6 tab", "Scroll to Seller Signatures section"],
    })
  })

  test("Page 6 — Seller signing rows show no-witness note caption", async ({ page }) => {
    await openContractSpSendDialog(page)
    await page.getByTestId("contract-sp-tab-trigger--6").click()
    const fill = page.getByTestId("contract-sp-fill-step")
    await expect(fill.getByText(/No witness is required if the Seller signs using an Electronic Signature/).first()).toBeVisible({ timeout: 10_000 })
  })
})
