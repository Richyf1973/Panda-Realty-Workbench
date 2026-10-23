// Run: npm run test:e2e:scratch -- --app=panda-realty --spec=apps/panda-realty/e2e/offer-form-building-pest-update.spec.ts

import { expect, test } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { createStory, shotFocused } from "@repo/e2e-utils"

import { checkMultiOfferBoxes, mockOfferFormGet, mockOfferFormGetAndPost } from "./offer-form-helpers"

const SHOT_DIR = join(dirname(fileURLToPath(import.meta.url)), "screenshots", "offer-form-building-pest-update")
const MOCK_TOKEN = "abc123token"

const story = createStory({ specUrl: import.meta.url, slug: "offer-form-building-pest-update" })

story.setWhatWasBuilt(
  "Restructured the Building & Pest section in the panda-realty offer form. " +
  "Replaced a 3-way radio with Yes/No outer radios and a conditional sub-panel containing " +
  "7/14 Calendar Days and suggest-companies Yes/No radios. Added Free Market Appraisal " +
  "conditional on To be Listed status. Updated cooling off label to mention residential " +
  "and manufactured home sales timelines.",
)

const mockGet = mockOfferFormGet
const mockGetAndPost = mockOfferFormGetAndPost

test.afterAll(() => {
  story.write()
})

test.describe("Offer form — Building & Pest restructure + Free Appraisal + Cooling Off wording", () => {
  test.beforeEach(async ({ page }) => {
    await mkdir(SHOT_DIR, { recursive: true })
    await page.addInitScript(() => { window.print = () => {} })
  })

  // ── Building & Pest: default state ──────────────────────────────────────

  test("Building & Pest defaults to No with no sub-panel visible", async ({ page }) => {
    await mockGet(page)
    await page.goto(`/offer-form/${MOCK_TOKEN}`)
    await expect(page.getByTestId("offer-form-building-pest-no")).toBeChecked()
    await expect(page.getByTestId("offer-form-building-pest-subpanel")).not.toBeVisible()

    const section = page.getByTestId("offer-form-building-pest-question")
    await expect(section).toBeVisible({ timeout: 10_000 })
    await shotFocused(page, section, SHOT_DIR, "01-building-pest-default-no")
    story.addScene({
      title: "01 — Building & Pest: Default State (No Selected)",
      images: [join(SHOT_DIR, "01-building-pest-default-no.png")],
      seeing: "Building & Pest question with No selected by default and no sub-panel visible.",
      steps: ["Open offer form", "Observe Building & Pest No is checked and sub-panel is hidden"],
    })
  })

  test("Building & Pest shows Yes and No radio options (not 3-way radio)", async ({ page }) => {
    await mockGet(page)
    await page.goto(`/offer-form/${MOCK_TOKEN}`)
    const section = page.getByTestId("offer-form-building-pest-question")
    await expect(section).toBeVisible({ timeout: 10_000 })
    await expect(page.getByTestId("offer-form-building-pest-yes")).toBeVisible()
    await expect(page.getByTestId("offer-form-building-pest-no")).toBeVisible()
    // 7days and 14days are in the sub-panel, not directly visible at top level
    await expect(page.getByTestId("offer-form-building-pest-subpanel")).not.toBeVisible()

    await shotFocused(page, section, SHOT_DIR, "02-building-pest-yes-no-radios")
    story.addScene({
      title: "02 — Building & Pest: Yes/No Radio Structure",
      images: [join(SHOT_DIR, "02-building-pest-yes-no-radios.png")],
      seeing: "Two-radio Yes/No structure; day-range radios are hidden inside the sub-panel until Yes is selected.",
      steps: ["Open offer form", "Verify Yes and No radios are visible", "Verify sub-panel is hidden"],
    })
  })

  // ── Building & Pest: Yes reveals sub-panel ───────────────────────────────

  test("Clicking Building & Pest Yes shows sub-panel with 7/14 days and suggest-companies", async ({ page }) => {
    await mockGet(page)
    await page.goto(`/offer-form/${MOCK_TOKEN}`)
    await expect(page.getByTestId("offer-form-building-pest-question")).toBeVisible({ timeout: 10_000 })
    await page.getByTestId("offer-form-building-pest-yes").click()
    await expect(page.getByTestId("offer-form-building-pest-subpanel")).toBeVisible()
    await expect(page.getByTestId("offer-form-building-pest-7days")).toBeVisible()
    await expect(page.getByTestId("offer-form-building-pest-14days")).toBeVisible()
    await expect(page.getByTestId("offer-form-suggest-building-companies-yes")).toBeVisible()
    await expect(page.getByTestId("offer-form-suggest-building-companies-no")).toBeVisible()

    const subPanel = page.getByTestId("offer-form-building-pest-subpanel")
    await shotFocused(page, subPanel, SHOT_DIR, "03-building-pest-subpanel-expanded")
    story.addScene({
      title: "03 — Building & Pest: Sub-panel Expanded on Yes",
      images: [join(SHOT_DIR, "03-building-pest-subpanel-expanded.png")],
      seeing: "Sub-panel with 7 Calendar Days, 14 Calendar Days, and suggest-companies Yes/No radios visible.",
      steps: ["Open offer form", "Click Building & Pest Yes", "Observe sub-panel expands with timeline and suggest-companies radios"],
    })
  })

  test("Sub-panel defaults to 7 Days selected when Building & Pest Yes is first clicked", async ({ page }) => {
    await mockGet(page)
    await page.goto(`/offer-form/${MOCK_TOKEN}`)
    await expect(page.getByTestId("offer-form-building-pest-question")).toBeVisible({ timeout: 10_000 })
    await page.getByTestId("offer-form-building-pest-yes").click()
    await expect(page.getByTestId("offer-form-building-pest-7days")).toBeChecked()
    await expect(page.getByTestId("offer-form-building-pest-14days")).not.toBeChecked()

    const subPanel = page.getByTestId("offer-form-building-pest-subpanel")
    await shotFocused(page, subPanel, SHOT_DIR, "04-subpanel-7days-default")
    story.addScene({
      title: "04 — Building & Pest Sub-panel: 7 Days Default",
      images: [join(SHOT_DIR, "04-subpanel-7days-default.png")],
      seeing: "Sub-panel with 7 Calendar Days selected (checked) and 14 Calendar Days unchecked.",
      steps: ["Open offer form", "Click Building & Pest Yes", "Verify 7 Days is selected by default"],
    })
  })

  test("Can select 14 Days in the Building & Pest sub-panel", async ({ page }) => {
    await mockGet(page)
    await page.goto(`/offer-form/${MOCK_TOKEN}`)
    await expect(page.getByTestId("offer-form-building-pest-question")).toBeVisible({ timeout: 10_000 })
    await page.getByTestId("offer-form-building-pest-yes").click()
    await page.getByTestId("offer-form-building-pest-14days").click()
    await expect(page.getByTestId("offer-form-building-pest-14days")).toBeChecked()
    await expect(page.getByTestId("offer-form-building-pest-7days")).not.toBeChecked()

    const subPanel = page.getByTestId("offer-form-building-pest-subpanel")
    await shotFocused(page, subPanel, SHOT_DIR, "05-subpanel-14days-selected")
    story.addScene({
      title: "05 — Building & Pest Sub-panel: 14 Days Selected",
      images: [join(SHOT_DIR, "05-subpanel-14days-selected.png")],
      seeing: "After clicking 14 Calendar Days — 14 Days is checked, 7 Days is unchecked.",
      steps: ["Open offer form", "Click Building & Pest Yes", "Click 14 Calendar Days", "Verify 14 Days is selected"],
    })
  })

  test("Toggling Building & Pest No then Yes resets sub-panel to 7 Days default", async ({ page }) => {
    await mockGet(page)
    await page.goto(`/offer-form/${MOCK_TOKEN}`)
    await expect(page.getByTestId("offer-form-building-pest-question")).toBeVisible({ timeout: 10_000 })
    // Select Yes and pick 14 Days
    await page.getByTestId("offer-form-building-pest-yes").click()
    await page.getByTestId("offer-form-building-pest-14days").click()
    // Toggle back to No
    await page.getByTestId("offer-form-building-pest-no").click()
    await expect(page.getByTestId("offer-form-building-pest-subpanel")).not.toBeVisible()
    // Toggle back to Yes — should reset to 7 Days
    await page.getByTestId("offer-form-building-pest-yes").click()
    await expect(page.getByTestId("offer-form-building-pest-7days")).toBeChecked()
    await expect(page.getByTestId("offer-form-building-pest-14days")).not.toBeChecked()

    const subPanel = page.getByTestId("offer-form-building-pest-subpanel")
    await shotFocused(page, subPanel, SHOT_DIR, "06-subpanel-reset-to-7days")
    story.addScene({
      title: "06 — Building & Pest Sub-panel: Resets to 7 Days After Toggle",
      images: [join(SHOT_DIR, "06-subpanel-reset-to-7days.png")],
      seeing: "After toggling No then Yes — sub-panel resets to 7 Days default regardless of prior selection.",
      steps: [
        "Open offer form",
        "Click Yes, select 14 Days",
        "Click No (sub-panel disappears)",
        "Click Yes again — sub-panel resets to 7 Days",
      ],
    })
  })

  test("Can select suggest building companies Yes", async ({ page }) => {
    await mockGet(page)
    await page.goto(`/offer-form/${MOCK_TOKEN}`)
    await expect(page.getByTestId("offer-form-building-pest-question")).toBeVisible({ timeout: 10_000 })
    await page.getByTestId("offer-form-building-pest-yes").click()
    await page.getByTestId("offer-form-suggest-building-companies-yes").click()
    await expect(page.getByTestId("offer-form-suggest-building-companies-yes")).toBeChecked()

    const subPanel = page.getByTestId("offer-form-building-pest-subpanel")
    await shotFocused(page, subPanel, SHOT_DIR, "07-suggest-companies-yes")
    story.addScene({
      title: "07 — Suggest Building Companies: Yes Selected",
      images: [join(SHOT_DIR, "07-suggest-companies-yes.png")],
      seeing: "Sub-panel with suggest-companies Yes radio selected.",
      steps: ["Open offer form", "Click Building & Pest Yes", "Click suggest-companies Yes", "Verify it is checked"],
    })
  })

  test("Building & Pest No hides sub-panel", async ({ page }) => {
    await mockGet(page)
    await page.goto(`/offer-form/${MOCK_TOKEN}`)
    await expect(page.getByTestId("offer-form-building-pest-question")).toBeVisible({ timeout: 10_000 })
    await page.getByTestId("offer-form-building-pest-yes").click()
    await expect(page.getByTestId("offer-form-building-pest-subpanel")).toBeVisible()
    await page.getByTestId("offer-form-building-pest-no").click()
    await expect(page.getByTestId("offer-form-building-pest-subpanel")).not.toBeVisible()

    const section = page.getByTestId("offer-form-building-pest-question")
    await shotFocused(page, section, SHOT_DIR, "08-building-pest-no-subpanel-hidden")
    story.addScene({
      title: "08 — Building & Pest: No Hides Sub-panel",
      images: [join(SHOT_DIR, "08-building-pest-no-subpanel-hidden.png")],
      seeing: "Building & Pest question with No selected and sub-panel hidden again.",
      steps: ["Open offer form", "Click Yes (sub-panel expands)", "Click No", "Verify sub-panel is hidden"],
    })
  })

  test("Building & Pest visible when Cash Buyer = Yes (not hidden by cash buyer toggle)", async ({ page }) => {
    await mockGet(page)
    await page.goto(`/offer-form/${MOCK_TOKEN}`)
    await expect(page.getByTestId("offer-form-building-pest-question")).toBeVisible({ timeout: 10_000 })
    await page.getByTestId("offer-form-cash-buyer-yes").click()
    await expect(page.getByTestId("offer-form-building-pest-yes")).toBeVisible()
    await expect(page.getByTestId("offer-form-building-pest-no")).toBeVisible()

    const section = page.getByTestId("offer-form-building-pest-question")
    await shotFocused(page, section, SHOT_DIR, "09-building-pest-visible-cash-buyer")
    story.addScene({
      title: "09 — Building & Pest: Visible When Cash Buyer",
      images: [join(SHOT_DIR, "09-building-pest-visible-cash-buyer.png")],
      seeing: "Building & Pest section remains visible even with Cash Buyer = Yes selected.",
      steps: ["Open offer form", "Select Cash Buyer = Yes", "Verify Building & Pest Yes/No are still visible"],
    })
  })

  // ── Cooling off wording ──────────────────────────────────────────────────

  test("Cooling off label mentions residential and manufactured home timelines", async ({ page }) => {
    await mockGet(page)
    await page.goto(`/offer-form/${MOCK_TOKEN}`)
    const section = page.getByTestId("offer-form-building-pest-question")
    await expect(section).toBeVisible({ timeout: 10_000 })
    const bodyText = await page.locator("body").innerText()
    expect(bodyText).toContain("residential home sales")
    expect(bodyText).toContain("manufactured home sales")

    await shotFocused(page, section, SHOT_DIR, "10-cooling-off-wording-check")
    story.addScene({
      title: "10 — Cooling Off: Wording Check",
      images: [join(SHOT_DIR, "10-cooling-off-wording-check.png")],
      seeing: "Form section area; body text verified to contain both residential and manufactured home sales timeline wording.",
      steps: [
        "Open offer form",
        "Verify body text contains 'residential home sales'",
        "Verify body text contains 'manufactured home sales'",
      ],
    })
  })

  // ── Free Market Appraisal: status-gated ─────────────────────────────────

  test("Free Market Appraisal shown only for To be Listed status", async ({ page }) => {
    await mockGet(page)
    await page.goto(`/offer-form/${MOCK_TOKEN}`)
    await expect(page.getByTestId("offer-form-building-pest-question")).toBeVisible({ timeout: 10_000 })
    await page.getByTestId("offer-form-subject-to-sale-yes").click()
    await page.getByTestId("offer-form-sale-status-dropdown").selectOption("to_be_listed")
    await expect(page.getByTestId("offer-form-sale-free-appraisal-yes")).toBeVisible()
    await expect(page.getByTestId("offer-form-sale-free-appraisal-no")).toBeVisible()

    const saleSection = page.getByTestId("offer-form-subject-to-sale-section")
    await shotFocused(page, saleSection, SHOT_DIR, "11-free-appraisal-shown-to-be-listed")
    story.addScene({
      title: "11 — Free Market Appraisal: Shown for To be Listed",
      images: [join(SHOT_DIR, "11-free-appraisal-shown-to-be-listed.png")],
      seeing: "Sale section with To be Listed status — Free Market Appraisal Yes/No radios appear.",
      steps: ["Open offer form", "Select Subject to Sale = Yes", "Select To be Listed status", "Verify appraisal radios appear"],
    })
  })

  test("Free Market Appraisal hidden for On the Market status", async ({ page }) => {
    await mockGet(page)
    await page.goto(`/offer-form/${MOCK_TOKEN}`)
    await expect(page.getByTestId("offer-form-building-pest-question")).toBeVisible({ timeout: 10_000 })
    await page.getByTestId("offer-form-subject-to-sale-yes").click()
    await page.getByTestId("offer-form-sale-status-dropdown").selectOption("on_the_market")
    await expect(page.getByTestId("offer-form-sale-free-appraisal-yes")).not.toBeVisible()
    await expect(page.getByTestId("offer-form-sale-free-appraisal-no")).not.toBeVisible()

    const saleSection = page.getByTestId("offer-form-subject-to-sale-section")
    await shotFocused(page, saleSection, SHOT_DIR, "12-free-appraisal-hidden-on-the-market")
    story.addScene({
      title: "12 — Free Market Appraisal: Hidden for On the Market",
      images: [join(SHOT_DIR, "12-free-appraisal-hidden-on-the-market.png")],
      seeing: "Sale section with On the Market status — Free Market Appraisal radios are not visible.",
      steps: ["Open offer form", "Select Subject to Sale = Yes", "Select On the Market status", "Verify appraisal radios are hidden"],
    })
  })

  test("Free Market Appraisal hidden for Under Contract status", async ({ page }) => {
    await mockGet(page)
    await page.goto(`/offer-form/${MOCK_TOKEN}`)
    await expect(page.getByTestId("offer-form-building-pest-question")).toBeVisible({ timeout: 10_000 })
    await page.getByTestId("offer-form-subject-to-sale-yes").click()
    await page.getByTestId("offer-form-sale-status-dropdown").selectOption("under_contract_conditional")
    await expect(page.getByTestId("offer-form-sale-free-appraisal-yes")).not.toBeVisible()
    await expect(page.getByTestId("offer-form-sale-free-appraisal-no")).not.toBeVisible()

    const saleSection = page.getByTestId("offer-form-subject-to-sale-section")
    await shotFocused(page, saleSection, SHOT_DIR, "13-free-appraisal-hidden-under-contract")
    story.addScene({
      title: "13 — Free Market Appraisal: Hidden for Under Contract",
      images: [join(SHOT_DIR, "13-free-appraisal-hidden-under-contract.png")],
      seeing: "Sale section with Under Contract (Conditional) status — Free Market Appraisal radios are not visible.",
      steps: ["Open offer form", "Select Subject to Sale = Yes", "Select Under Contract Conditional status", "Verify appraisal radios are hidden"],
    })
  })

  // ── Submit payload: building pest + suggest companies persisted ──────────

  test("Submit sends buildingPestInspection=14_days and suggestBuildingCompanies=true in POST body", async ({ page }) => {
    const captured: { body: Record<string, unknown> | null } = { body: null }
    await mockGetAndPost(page, captured)
    await page.goto(`/offer-form/${MOCK_TOKEN}`)
    // Fill required fields
    await page.getByTestId("offer-form-buyer-1-name").fill("Test Buyer")
    await page.getByTestId("offer-form-offer-amount").fill("600000")
    // Building & Pest = Yes, 14 Days, suggest companies = Yes
    await page.getByTestId("offer-form-building-pest-yes").click()
    await page.getByTestId("offer-form-building-pest-14days").click()
    await page.getByTestId("offer-form-suggest-building-companies-yes").click()
    await page.getByTestId("offer-form-signature-1-text-input").fill("Test Buyer")
    await checkMultiOfferBoxes(page)
    await page.getByTestId("offer-form-submit").click()
    await expect(page.getByTestId("offer-form-success")).toBeVisible({ timeout: 8_000 })
    expect(captured.body?.buildingPestInspection).toBe("14_days")
    expect(captured.body?.suggestBuildingCompanies).toBe(true)
  })

  test("Submit sends buildingPestInspection=no when Building & Pest = No", async ({ page }) => {
    const captured: { body: Record<string, unknown> | null } = { body: null }
    await mockGetAndPost(page, captured)
    await page.goto(`/offer-form/${MOCK_TOKEN}`)
    await page.getByTestId("offer-form-buyer-1-name").fill("Test Buyer")
    await page.getByTestId("offer-form-offer-amount").fill("600000")
    // Building & Pest stays as No (default)
    await page.getByTestId("offer-form-signature-1-text-input").fill("Test Buyer")
    await checkMultiOfferBoxes(page)
    await page.getByTestId("offer-form-submit").click()
    await expect(page.getByTestId("offer-form-success")).toBeVisible({ timeout: 8_000 })
    expect(captured.body?.buildingPestInspection).toBe("no")
  })

  test("Submit sends financeBankContactPhone in POST body", async ({ page }) => {
    const captured: { body: Record<string, unknown> | null } = { body: null }
    await mockGetAndPost(page, captured)
    await page.goto(`/offer-form/${MOCK_TOKEN}`)
    await page.getByTestId("offer-form-buyer-1-name").fill("Test Buyer")
    await page.getByTestId("offer-form-offer-amount").fill("600000")
    // Fill finance bank contact phone
    await page.getByTestId("offer-form-subject-to-finance-yes").click()
    await page.getByTestId("offer-form-finance-bank-contact-phone").fill("0412 345 678")
    await page.getByTestId("offer-form-signature-1-text-input").fill("Test Buyer")
    await checkMultiOfferBoxes(page)
    await page.getByTestId("offer-form-submit").click()
    await expect(page.getByTestId("offer-form-success")).toBeVisible({ timeout: 8_000 })
    expect(captured.body?.financeBankContactPhone).toBe("0412 345 678")
  })
})
