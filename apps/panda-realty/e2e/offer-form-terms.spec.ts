import { expect, test } from "@playwright/test"

import { mockOfferFormGet } from "./offer-form-helpers"

const mockGet = mockOfferFormGet

test.describe("Offer form — offer terms & conditions (Section 4)", () => {
  // ── Building & Pest ──────────────────────────────────────────────────────

  test("building and pest shows Yes/No toggle (not a 3-way radio)", async ({ page }) => {
    await mockGet(page)
    await page.goto("/offer-form/abc123token")
    await expect(page.getByTestId("offer-form-building-pest-yes")).toBeVisible()
    await expect(page.getByTestId("offer-form-building-pest-no")).toBeVisible()
    // Sub-panel (7/14 days) is hidden by default — only visible when Yes is selected
    await expect(page.getByTestId("offer-form-building-pest-subpanel")).not.toBeVisible()
  })

  // ── Cooling off waiver ───────────────────────────────────────────────────

  test("cooling off waiver shows Yes and No options", async ({ page }) => {
    await mockGet(page)
    await page.goto("/offer-form/abc123token")
    await expect(page.getByTestId("offer-form-cooling-off-yes")).toBeVisible()
    await expect(page.getByTestId("offer-form-cooling-off-no")).toBeVisible()
  })

  // ── Cash Buyer ───────────────────────────────────────────────────────────

  test("Cash Buyer Yes hides Subject to Finance and Subject to Sale sections", async ({ page }) => {
    await mockGet(page)
    await page.goto("/offer-form/abc123token")
    await page.getByTestId("offer-form-cash-buyer-yes").click()
    await expect(page.getByTestId("offer-form-subject-to-finance-section")).not.toBeVisible()
    await expect(page.getByTestId("offer-form-subject-to-sale-section")).not.toBeVisible()
  })

  test("Cash Buyer No shows Subject to Finance and Subject to Sale sections", async ({ page }) => {
    await mockGet(page)
    await page.goto("/offer-form/abc123token")
    await page.getByTestId("offer-form-cash-buyer-yes").click()
    await page.getByTestId("offer-form-cash-buyer-no").click()
    await expect(page.getByTestId("offer-form-subject-to-finance-section")).toBeVisible()
    await expect(page.getByTestId("offer-form-subject-to-sale-section")).toBeVisible()
  })

  // ── Subject to Sale ──────────────────────────────────────────────────────

  test("Subject to Sale Yes reveals sub-fields: address input and status dropdown", async ({ page }) => {
    await mockGet(page)
    await page.goto("/offer-form/abc123token")
    await expect(page.getByTestId("offer-form-sale-details")).not.toBeVisible()
    await page.getByTestId("offer-form-subject-to-sale-yes").click()
    await expect(page.getByTestId("offer-form-sale-details")).toBeVisible()
    await expect(page.getByTestId("offer-form-sale-property-address")).toBeVisible()
    await expect(page.getByTestId("offer-form-sale-status-dropdown")).toBeVisible()
  })

  test("Sale status To be Listed shows timeline metrics panel", async ({ page }) => {
    await mockGet(page)
    await page.goto("/offer-form/abc123token")
    await page.getByTestId("offer-form-subject-to-sale-yes").click()
    await page.getByTestId("offer-form-sale-status-dropdown").selectOption("to_be_listed")
    await expect(page.getByTestId("offer-form-sale-timeline-metrics")).toBeVisible()
    await expect(page.getByTestId("offer-form-sale-days-before-listing")).toBeVisible()
    await expect(page.getByTestId("offer-form-sale-days-to-contract")).toBeVisible()
    await expect(page.getByTestId("offer-form-sale-days-to-unconditional")).toBeVisible()
    await expect(page.getByTestId("offer-form-sale-days-to-settle")).toBeVisible()
  })

  test("Sale status On the Market shows timeline metrics panel (without days-before-listing)", async ({ page }) => {
    await mockGet(page)
    await page.goto("/offer-form/abc123token")
    await page.getByTestId("offer-form-subject-to-sale-yes").click()
    await page.getByTestId("offer-form-sale-status-dropdown").selectOption("on_the_market")
    await expect(page.getByTestId("offer-form-sale-timeline-metrics")).toBeVisible()
    await expect(page.getByTestId("offer-form-sale-days-before-listing")).not.toBeVisible()
  })

  test("Sale status Under Contract Conditional shows date fields and conditions directly", async ({ page }) => {
    await mockGet(page)
    await page.goto("/offer-form/abc123token")
    await page.getByTestId("offer-form-subject-to-sale-yes").click()
    await page.getByTestId("offer-form-sale-status-dropdown").selectOption("under_contract_conditional")
    await expect(page.getByTestId("offer-form-sale-under-contract-panel")).toBeVisible()
    await expect(page.getByTestId("offer-form-sale-unconditional-date")).toBeVisible()
    await expect(page.getByTestId("offer-form-sale-buyer-settlement-date")).toBeVisible()
    await expect(page.getByTestId("offer-form-sale-timeline-metrics")).not.toBeVisible()
  })

  test("Under Contract Conditional shows date fields and conditions checkboxes", async ({ page }) => {
    await mockGet(page)
    await page.goto("/offer-form/abc123token")
    await page.getByTestId("offer-form-subject-to-sale-yes").click()
    await page.getByTestId("offer-form-sale-status-dropdown").selectOption("under_contract_conditional")
    await expect(page.getByTestId("offer-form-sale-unconditional-date")).toBeVisible()
    await expect(page.getByTestId("offer-form-sale-buyer-settlement-date")).toBeVisible()
    await expect(page.getByTestId("offer-form-sale-condition-finance")).toBeVisible()
    await expect(page.getByTestId("offer-form-sale-condition-building-pest")).toBeVisible()
    await expect(page.getByTestId("offer-form-sale-condition-sale-of-property")).toBeVisible()
    await expect(page.getByTestId("offer-form-sale-condition-other")).toBeVisible()
  })

  test("Ticking Other Conditions reveals elaboration textarea", async ({ page }) => {
    await mockGet(page)
    await page.goto("/offer-form/abc123token")
    await page.getByTestId("offer-form-subject-to-sale-yes").click()
    await page.getByTestId("offer-form-sale-status-dropdown").selectOption("under_contract_conditional")
    await expect(page.getByTestId("offer-form-sale-conditions-elaboration")).not.toBeVisible()
    await page.getByTestId("offer-form-sale-condition-other").check()
    await expect(page.getByTestId("offer-form-sale-conditions-elaboration")).toBeVisible()
  })

  test("Free Market Appraisal question is shown when Subject to Sale is Yes and status is To be Listed", async ({ page }) => {
    await mockGet(page)
    await page.goto("/offer-form/abc123token")
    await page.getByTestId("offer-form-subject-to-sale-yes").click()
    await page.getByTestId("offer-form-sale-status-dropdown").selectOption("to_be_listed")
    await expect(page.getByTestId("offer-form-sale-free-appraisal-yes")).toBeVisible()
    await expect(page.getByTestId("offer-form-sale-free-appraisal-no")).toBeVisible()
  })

  test("Subject to Sale No hides sale sub-fields", async ({ page }) => {
    await mockGet(page)
    await page.goto("/offer-form/abc123token")
    await page.getByTestId("offer-form-subject-to-sale-yes").click()
    await page.getByTestId("offer-form-subject-to-sale-no").click()
    await expect(page.getByTestId("offer-form-sale-details")).not.toBeVisible()
  })

  // ── Subject to Finance ───────────────────────────────────────────────────

  test("Subject to Finance Yes shows sub-fields including days select and bank contact row", async ({ page }) => {
    await mockGet(page)
    await page.goto("/offer-form/abc123token")
    await page.getByTestId("offer-form-subject-to-finance-yes").click()
    await expect(page.getByTestId("offer-form-finance-section")).toBeVisible()
    await expect(page.getByTestId("offer-form-finance-preapproved-yes")).toBeVisible()
    await expect(page.getByTestId("offer-form-finance-preapproved-no")).toBeVisible()
    await expect(page.getByTestId("offer-form-finance-days-select")).toBeVisible()
    await expect(page.getByTestId("offer-form-finance-bank")).toBeVisible()
    await expect(page.getByTestId("offer-form-finance-bank-contact-name")).toBeVisible()
    await expect(page.getByTestId("offer-form-finance-bank-contact-phone")).toBeVisible()
    await expect(page.getByTestId("offer-form-finance-bank-contact-email")).toBeVisible()
  })

  test("Finance days select has options 7, 14, and 21", async ({ page }) => {
    await mockGet(page)
    await page.goto("/offer-form/abc123token")
    await page.getByTestId("offer-form-subject-to-finance-yes").click()
    const select = page.getByTestId("offer-form-finance-days-select")
    await expect(select.locator("option[value='7']")).toHaveCount(1)
    await expect(select.locator("option[value='14']")).toHaveCount(1)
    await expect(select.locator("option[value='21']")).toHaveCount(1)
  })

  test("Subject to Finance No hides finance sub-fields", async ({ page }) => {
    await mockGet(page)
    await page.goto("/offer-form/abc123token")
    await page.getByTestId("offer-form-subject-to-finance-yes").click()
    await page.getByTestId("offer-form-subject-to-finance-no").click()
    await expect(page.getByTestId("offer-form-finance-section")).not.toBeVisible()
  })

  // ── Settlement — date auto-calc ──────────────────────────────────────────

  test("picking a settlement date auto-populates the days text field", async ({ page }) => {
    await mockGet(page)
    await page.goto("/offer-form/abc123token")
    // 2026-07-31 is a Friday — guaranteed weekday so weekend-blocking doesn't clear the value
    await page.getByTestId("offer-form-settlement-date-input").fill("2026-07-31")
    const daysValue = await page.getByTestId("offer-form-settlement-period").inputValue()
    expect(daysValue).toMatch(/Days/)
  })

  test("settlement period text input accepts free text independently", async ({ page }) => {
    await mockGet(page)
    await page.goto("/offer-form/abc123token")
    await page.getByTestId("offer-form-settlement-period").fill("6 weeks")
    await expect(page.getByTestId("offer-form-settlement-period")).toHaveValue("6 weeks")
  })
})
