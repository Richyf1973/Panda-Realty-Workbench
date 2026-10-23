import { expect, test } from "@playwright/test"

const PREFILL = {
  propertyAddress: "195/46 Amy Street, Morayfield, QLD, 4506",
  buyers: [{ name: "Test Buyer", phone: "0400000000", email: "buyer@example.com", address: "1 Test Street, Brisbane" }],
  rep: null,
  solicitorName: null,
  solicitorPhone: null,
  solicitorAddress: null,
  solicitorEmail: null,
}

function mockForm(page: import("@playwright/test").Page) {
  return page.route("**/api/offer-form/abc123token**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(PREFILL) })
  })
}

test.describe("Offer form — light mode & template sync", () => {
  // ── Header title ────────────────────────────────────────────────────────

  test("header title is 'PRO FORMA CONTRACT' without the year", async ({ page }) => {
    await mockForm(page)
    await page.goto("/offer-form/abc123token")
    const heading = page.getByTestId("offer-form-header").locator("h1")
    await expect(heading).toHaveText("PRO FORMA CONTRACT")
  })

  // ── Footer label & layout ────────────────────────────────────────────────

  test("footer uses 'Sales Agent:' label for both agents", async ({ page }) => {
    await mockForm(page)
    await page.goto("/offer-form/abc123token")
    const footer = page.getByTestId("offer-form-footer")
    const labels = footer.locator("strong")
    // Each agent block has one "Sales Agent:" strong tag
    await expect(labels.filter({ hasText: "Sales Agent:" })).toHaveCount(2)
    await expect(labels.filter({ hasText: "Managing Agent:" })).toHaveCount(0)
  })

  test("footer renders phone and email inline separated by |", async ({ page }) => {
    await mockForm(page)
    await page.goto("/offer-form/abc123token")
    const footer = page.getByTestId("offer-form-footer")
    const footerText = await footer.innerText()
    // Both agent rows should contain the pipe separator
    expect(footerText).toContain("0493 635 666 | Email: maria@mypandarealty.com.au")
    expect(footerText).toContain("0490 456 959 | Email: richard@mypandarealty.com.au")
  })

  // ── Finance label casing ────────────────────────────────────────────────

  test("finance section label starts with capital 'Is'", async ({ page }) => {
    await mockForm(page)
    await page.goto("/offer-form/abc123token")
    const financeSection = page.getByTestId("offer-form-subject-to-finance-section")
    // The label wrapping the Yes/No radios
    const label = financeSection.locator("label").first()
    await expect(label).toContainText("Is this offer subject to finance approval?")
  })

  // ── Buyer rep label ─────────────────────────────────────────────────────

  test("buyer rep checkbox label includes parenthetical '(e.g. POA, Executive Buyer Agent)'", async ({ page }) => {
    await mockForm(page)
    await page.goto("/offer-form/abc123token")
    const repCheckbox = page.getByTestId("offer-form-buyer-1-has-rep")
    const label = repCheckbox.locator("..")  // parent label element
    await expect(label).toContainText("(e.g. POA, Executive Buyer Agent)")
  })

  // ── Bank contact table headers ───────────────────────────────────────────

  test("bank contact table shows full column headers", async ({ page }) => {
    await mockForm(page)
    await page.goto("/offer-form/abc123token")
    await page.getByTestId("offer-form-subject-to-finance-yes").click()
    const financeSection = page.getByTestId("offer-form-finance-section")
    await expect(financeSection.getByRole("columnheader", { name: "Bank Contact Name" })).toBeVisible()
    await expect(financeSection.getByRole("columnheader", { name: "Bank Contact Phone Number" })).toBeVisible()
    await expect(financeSection.getByRole("columnheader", { name: "Bank Contact Email Address" })).toBeVisible()
  })

  // ── Under contract: status-driven sections ──────────────────────────────

  test("under contract unconditional shows only settlement date, no conditions section", async ({ page }) => {
    await mockForm(page)
    await page.goto("/offer-form/abc123token")

    await page.getByTestId("offer-form-subject-to-sale-yes").click()
    await page.getByTestId("offer-form-sale-status-dropdown").selectOption("under_contract_unconditional")

    const panel = page.getByTestId("offer-form-sale-under-contract-panel")
    await expect(panel).toBeVisible()
    await expect(page.getByTestId("offer-form-sale-buyer-settlement-date")).toBeVisible()
    // No conditions section for unconditional
    await expect(panel.locator("input[type=checkbox]")).toHaveCount(0)
  })

  test("under contract conditional: 'Other Conditions' checkbox reveals elaboration textarea", async ({ page }) => {
    await mockForm(page)
    await page.goto("/offer-form/abc123token")

    await page.getByTestId("offer-form-subject-to-sale-yes").click()
    await page.getByTestId("offer-form-sale-status-dropdown").selectOption("under_contract_conditional")

    const panel = page.getByTestId("offer-form-sale-under-contract-panel")
    // Elaboration textarea hidden by default
    await expect(panel.locator("textarea")).not.toBeVisible()
    // Tick "Other Unique Conditions"
    await page.getByTestId("offer-form-sale-condition-other").check()
    await expect(panel.locator("textarea")).toBeVisible()
  })

  test("under contract conditional shows present-tense conditions label 'Outstanding conditions still applying'", async ({ page }) => {
    await mockForm(page)
    await page.goto("/offer-form/abc123token")

    await page.getByTestId("offer-form-subject-to-sale-yes").click()
    await page.getByTestId("offer-form-sale-status-dropdown").selectOption("under_contract_conditional")

    const panel = page.getByTestId("offer-form-sale-under-contract-panel")
    await expect(panel).toContainText("Outstanding conditions still applying")
  })

  // ── Dark mode — form always renders light ───────────────────────────────

  test("form renders with light background when OS color scheme is dark", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" })
    await mockForm(page)
    await page.goto("/offer-form/abc123token")

    // The form card should have a white background, not a dark slate background
    const formBg = await page.getByTestId("offer-form-page").evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor
    })
    // white = rgb(255, 255, 255)
    expect(formBg).toBe("rgb(255, 255, 255)")
  })

  test("form renders with light background when OS color scheme is light", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" })
    await mockForm(page)
    await page.goto("/offer-form/abc123token")

    const formBg = await page.getByTestId("offer-form-page").evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor
    })
    expect(formBg).toBe("rgb(255, 255, 255)")
  })
})
