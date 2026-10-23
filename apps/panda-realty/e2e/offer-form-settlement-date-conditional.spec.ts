import { expect, test } from "@playwright/test"

// Fixed future dates with known days of week (2026 calendar)
const KNOWN_FRIDAY = "2026-07-31"    // Friday
const KNOWN_SATURDAY = "2026-08-01"  // Saturday
const KNOWN_SUNDAY = "2026-08-02"    // Sunday
const KNOWN_MONDAY = "2026-08-03"    // Monday

const PREFILL = {
  propertyAddress: "195/46 Amy Street, Morayfield, QLD, 4506",
  buyers: [{ name: "Test Buyer", phone: "0400 000 000", email: "buyer@test.com", address: "12 Smith Street, Brisbane" }],
  rep: null,
  solicitorName: null,
  solicitorPhone: null,
  solicitorAddress: null,
  solicitorEmail: null,
}

function mockGet(page: import("@playwright/test").Page) {
  return page.route("**/api/offer-form/abc123token**", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(PREFILL) })
      return
    }
    await route.fallback()
  })
}

test.describe("Offer form — settlement block conditional visibility", () => {
  test("settlement block is visible when subjectToSale is No (default)", async ({ page }) => {
    await mockGet(page)
    await page.goto("/offer-form/abc123token")
    await expect(page.getByTestId("offer-form-settlement-block")).toBeVisible()
  })

  test("settlement block is visible when cashBuyer is Yes", async ({ page }) => {
    await mockGet(page)
    await page.goto("/offer-form/abc123token")
    await page.getByTestId("offer-form-cash-buyer-yes").click()
    await expect(page.getByTestId("offer-form-settlement-block")).toBeVisible()
  })

  test("settlement block is hidden when subjectToSale=yes and simultaneousSettlement is not yet answered", async ({ page }) => {
    await mockGet(page)
    await page.goto("/offer-form/abc123token")
    await page.getByTestId("offer-form-subject-to-sale-yes").click()
    // simultaneousSettlement is "" (unanswered) — block not at bottom and not inside sale section
    await expect(page.getByTestId("offer-form-settlement-block")).not.toBeVisible()
  })

  test("settlement block is hidden when subjectToSale=yes and simultaneousSettlement=yes", async ({ page }) => {
    await mockGet(page)
    await page.goto("/offer-form/abc123token")
    await page.getByTestId("offer-form-subject-to-sale-yes").click()
    await page.getByTestId("offer-form-simultaneous-settlement-yes").click()
    await expect(page.getByTestId("offer-form-settlement-block")).not.toBeVisible()
  })

  test("settlement block shows inside sale section when subjectToSale=yes and simultaneousSettlement=no", async ({ page }) => {
    await mockGet(page)
    await page.goto("/offer-form/abc123token")
    await page.getByTestId("offer-form-subject-to-sale-yes").click()
    await page.getByTestId("offer-form-simultaneous-settlement-no").click()
    await expect(page.getByTestId("offer-form-settlement-block")).toBeVisible()
  })

  test("settlement block reappears at bottom when subjectToSale switches back to No", async ({ page }) => {
    await mockGet(page)
    await page.goto("/offer-form/abc123token")
    await page.getByTestId("offer-form-subject-to-sale-yes").click()
    await page.getByTestId("offer-form-simultaneous-settlement-yes").click()
    await expect(page.getByTestId("offer-form-settlement-block")).not.toBeVisible()
    await page.getByTestId("offer-form-subject-to-sale-no").click()
    await expect(page.getByTestId("offer-form-settlement-block")).toBeVisible()
  })

  test("settlement block hides when simultaneousSettlement switches from no to yes", async ({ page }) => {
    await mockGet(page)
    await page.goto("/offer-form/abc123token")
    await page.getByTestId("offer-form-subject-to-sale-yes").click()
    await page.getByTestId("offer-form-simultaneous-settlement-no").click()
    await expect(page.getByTestId("offer-form-settlement-block")).toBeVisible()
    await page.getByTestId("offer-form-simultaneous-settlement-yes").click()
    await expect(page.getByTestId("offer-form-settlement-block")).not.toBeVisible()
  })

  test("settlementPeriod value is preserved through simultaneous settlement toggle", async ({ page }) => {
    await mockGet(page)
    await page.goto("/offer-form/abc123token")
    await page.getByTestId("offer-form-settlement-period").fill("30 Days")
    await page.getByTestId("offer-form-subject-to-sale-yes").click()
    await page.getByTestId("offer-form-simultaneous-settlement-no").click()
    await expect(page.getByTestId("offer-form-settlement-block")).toBeVisible()
    await expect(page.getByTestId("offer-form-settlement-period")).toHaveValue("30 Days")
  })
})

test.describe("Offer form — settlement day-of-week and weekend logic", () => {
  test("default helper note shown on load", async ({ page }) => {
    await mockGet(page)
    await page.goto("/offer-form/abc123token")
    await expect(page.getByTestId("offer-form-settlement-note")).toContainText(
      "Selecting an exact calendar field date automatically determines net days tracking."
    )
  })

  test("picking a Monday fills days as 'N Days (Monday)' and shows success note", async ({ page }) => {
    await mockGet(page)
    await page.goto("/offer-form/abc123token")
    await page.getByTestId("offer-form-settlement-date-input").fill(KNOWN_MONDAY)
    await expect(page.getByTestId("offer-form-settlement-period")).toHaveValue(/\d+ Days \(Monday\)/)
    await expect(page.getByTestId("offer-form-settlement-note")).toContainText("Settlement date lands on a")
    await expect(page.getByTestId("offer-form-settlement-note")).toContainText("Monday")
  })

  test("picking a Friday fills days as 'N Days (Friday)' and shows Friday in note", async ({ page }) => {
    await mockGet(page)
    await page.goto("/offer-form/abc123token")
    await page.getByTestId("offer-form-settlement-date-input").fill(KNOWN_FRIDAY)
    await expect(page.getByTestId("offer-form-settlement-period")).toHaveValue(/\d+ Days \(Friday\)/)
    await expect(page.getByTestId("offer-form-settlement-note")).toContainText("Friday")
  })

  test("picking Saturday clears date and days and shows weekend error", async ({ page }) => {
    await mockGet(page)
    await page.goto("/offer-form/abc123token")
    await page.getByTestId("offer-form-settlement-date-input").fill(KNOWN_SATURDAY)
    await expect(page.getByTestId("offer-form-settlement-date-input")).toHaveValue("")
    await expect(page.getByTestId("offer-form-settlement-period")).toHaveValue("")
    await expect(page.getByTestId("offer-form-settlement-note")).toContainText("Settlement cannot occur on a weekend")
    await expect(page.getByTestId("offer-form-settlement-note")).toContainText("Saturday")
  })

  test("picking Sunday clears date and days and shows weekend error", async ({ page }) => {
    await mockGet(page)
    await page.goto("/offer-form/abc123token")
    await page.getByTestId("offer-form-settlement-date-input").fill(KNOWN_SUNDAY)
    await expect(page.getByTestId("offer-form-settlement-date-input")).toHaveValue("")
    await expect(page.getByTestId("offer-form-settlement-period")).toHaveValue("")
    await expect(page.getByTestId("offer-form-settlement-note")).toContainText("Settlement cannot occur on a weekend")
    await expect(page.getByTestId("offer-form-settlement-note")).toContainText("Sunday")
  })

  test("picking weekend then valid weekday clears error and shows day-of-week", async ({ page }) => {
    await mockGet(page)
    await page.goto("/offer-form/abc123token")
    await page.getByTestId("offer-form-settlement-date-input").fill(KNOWN_SATURDAY)
    await expect(page.getByTestId("offer-form-settlement-note")).toContainText("Settlement cannot occur on a weekend")
    await page.getByTestId("offer-form-settlement-date-input").fill(KNOWN_MONDAY)
    await expect(page.getByTestId("offer-form-settlement-note")).toContainText("Settlement date lands on a")
    await expect(page.getByTestId("offer-form-settlement-note")).toContainText("Monday")
  })

  test("typing days count syncs date picker to correct weekday date", async ({ page }) => {
    await mockGet(page)
    await page.goto("/offer-form/abc123token")
    // Compute days from today to the known Monday (2026-08-03) dynamically
    const knownMonday = new Date(2026, 7, 3)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    knownMonday.setHours(0, 0, 0, 0)
    const diff = Math.ceil((knownMonday.getTime() - today.getTime()) / (1000 * 3600 * 24))
    await page.getByTestId("offer-form-settlement-period").fill(String(diff))
    await expect(page.getByTestId("offer-form-settlement-date-input")).toHaveValue(KNOWN_MONDAY)
    await expect(page.getByTestId("offer-form-settlement-note")).toContainText("Monday")
  })

  test("typing days count that lands on Saturday shows error and keeps date empty", async ({ page }) => {
    await mockGet(page)
    await page.goto("/offer-form/abc123token")
    // Compute days from today to the known Saturday (2026-08-01) dynamically
    const knownSaturday = new Date(2026, 7, 1)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    knownSaturday.setHours(0, 0, 0, 0)
    const diff = Math.ceil((knownSaturday.getTime() - today.getTime()) / (1000 * 3600 * 24))
    await page.getByTestId("offer-form-settlement-period").fill(String(diff))
    await expect(page.getByTestId("offer-form-settlement-date-input")).toHaveValue("")
    await expect(page.getByTestId("offer-form-settlement-note")).toContainText("Settlement cannot fall on a weekend")
  })

  test("clearing days text clears date picker and resets note to default", async ({ page }) => {
    await mockGet(page)
    await page.goto("/offer-form/abc123token")
    await page.getByTestId("offer-form-settlement-date-input").fill(KNOWN_MONDAY)
    await expect(page.getByTestId("offer-form-settlement-period")).toHaveValue(/\d+ Days \(Monday\)/)
    await page.getByTestId("offer-form-settlement-period").fill("")
    await expect(page.getByTestId("offer-form-settlement-date-input")).toHaveValue("")
    await expect(page.getByTestId("offer-form-settlement-note")).toContainText(
      "Selecting an exact calendar field date automatically determines net days tracking."
    )
  })
})
