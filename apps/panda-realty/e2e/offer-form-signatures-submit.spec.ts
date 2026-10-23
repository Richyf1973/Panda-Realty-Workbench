import { expect, test } from "@playwright/test"

import { checkMultiOfferBoxes } from "./offer-form-helpers"

const PREFILL = {
  propertyAddress: "195/46 Amy Street, Morayfield, QLD, 4506",
  buyers: [{ name: "Sandesh Panta", phone: "0449 192 053", email: "sandesh.panta15@gmail.com", address: "12 Smith Street, Brisbane" }],
  rep: null,
  solicitorName: null,
  solicitorPhone: null,
  solicitorAddress: null,
  solicitorEmail: null,
}

function mockGetAndPost(
  page: import("@playwright/test").Page,
  captured: { body: Record<string, unknown> | null },
  prefill = PREFILL,
) {
  return page.route("**/api/offer-form/abc123token**", async (route) => {
    if (route.request().method() === "POST") {
      captured.body = (await route.request().postDataJSON()) as Record<string, unknown>
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) })
      return
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(prefill) })
  })
}

test.describe("Offer form — submit POST body assertions", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => { window.print = () => {} })
  })

  test("submitting a valid form shows success state and sends new fields in POST body", async ({ page }) => {
    const captured: { body: Record<string, unknown> | null } = { body: null }
    await mockGetAndPost(page, captured)

    await page.goto("/offer-form/abc123token")
    await page.getByTestId("offer-form-offer-amount").fill("650000")
    await page.getByTestId("offer-form-building-pest-yes").click()
    await page.getByTestId("offer-form-building-pest-14days").click()
    await page.getByTestId("offer-form-cooling-off-no").click()
    await page.getByTestId("offer-form-extra-comments").fill("Test comment")
    await checkMultiOfferBoxes(page)
    await page.getByTestId("offer-form-submit").click()

    await expect(page.getByTestId("offer-form-success")).toBeVisible({ timeout: 8_000 })

    if (!captured.body) throw new Error("POST body was not captured")
    expect(captured.body.offerAmount).toBe("650000")
    expect(captured.body.buildingPestInspection).toBe("14_days")
    expect(captured.body.waiveCoolingOff).toBe(false)
    expect(captured.body.extraComments).toBe("Test comment")
  })

  test("submit sends buyers JSON array with all buyer cards", async ({ page }) => {
    const captured: { body: Record<string, unknown> | null } = { body: null }
    await mockGetAndPost(page, captured)

    await page.goto("/offer-form/abc123token")
    await page.getByTestId("offer-form-add-buyer").click()
    await page.getByTestId("offer-form-buyer-2-name").fill("Jane Doe")
    await page.getByTestId("offer-form-buyer-2-phone").fill("0400000000")
    await page.getByTestId("offer-form-buyer-2-email").fill("jane@example.com")
    await page.getByTestId("offer-form-buyer-2-address").fill("2 Example St")
    await page.getByTestId("offer-form-offer-amount").fill("700000")
    await checkMultiOfferBoxes(page)
    await page.getByTestId("offer-form-submit").click()

    await expect(page.getByTestId("offer-form-success")).toBeVisible({ timeout: 8_000 })

    if (!captured.body) throw new Error("POST body was not captured")
    const buyers = captured.body.buyers as Array<{ name: string }>
    expect(Array.isArray(buyers)).toBe(true)
    expect(buyers.length).toBe(2)
    expect(buyers[0].name).toBe("Sandesh Panta")
    expect(buyers[1].name).toBe("Jane Doe")
  })

  test("submit sends deposit amounts in POST body", async ({ page }) => {
    const captured: { body: Record<string, unknown> | null } = { body: null }
    await mockGetAndPost(page, captured)

    await page.goto("/offer-form/abc123token")
    await page.getByTestId("offer-form-offer-amount").fill("650000")
    await page.getByTestId("offer-form-total-deposit").fill("25000")
    await page.getByTestId("offer-form-initial-payment").fill("5000")
    await page.getByTestId("offer-form-second-payment").fill("20000")
    await checkMultiOfferBoxes(page)
    await page.getByTestId("offer-form-submit").click()

    await expect(page.getByTestId("offer-form-success")).toBeVisible({ timeout: 8_000 })

    if (!captured.body) throw new Error("POST body was not captured")
    expect(captured.body.totalDeposit).toBe("25000")
    expect(captured.body.initialPayment).toBe("5000")
    expect(captured.body.secondPayment).toBe("20000")
  })

  test("submit includes finance sub-fields when Subject to Finance is Yes", async ({ page }) => {
    const captured: { body: Record<string, unknown> | null } = { body: null }
    await mockGetAndPost(page, captured)

    await page.goto("/offer-form/abc123token")
    await page.getByTestId("offer-form-offer-amount").fill("650000")
    await page.getByTestId("offer-form-subject-to-finance-yes").click()
    await page.getByTestId("offer-form-finance-days-select").selectOption("14")
    await page.getByTestId("offer-form-finance-bank").fill("ANZ")
    await page.getByTestId("offer-form-finance-bank-contact-name").fill("Bob Manager")
    await page.getByTestId("offer-form-finance-bank-contact-phone").fill("0712345678")
    await page.getByTestId("offer-form-finance-bank-contact-email").fill("bob@anz.com")
    await checkMultiOfferBoxes(page)
    await page.getByTestId("offer-form-submit").click()

    await expect(page.getByTestId("offer-form-success")).toBeVisible({ timeout: 8_000 })

    if (!captured.body) throw new Error("POST body was not captured")
    expect(captured.body.subjectToFinance).toBe(true)
    expect(captured.body.financeApprovalDays).toBe("14")
    expect(captured.body.financeBank).toBe("ANZ")
    expect(captured.body.financeBankContactName).toBe("Bob Manager")
    expect(captured.body.financeBankContactPhone).toBe("0712345678")
    expect(captured.body.financeBankContactEmail).toBe("bob@anz.com")
  })

  // ── Error / rejection states ─────────────────────────────────────────────

  test("submitting with empty offer amount shows validation error", async ({ page }) => {
    await page.route("**/api/offer-form/abc123token**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(PREFILL) })
    })
    await page.goto("/offer-form/abc123token")
    await page.getByTestId("offer-form-submit").click()
    await expect(page.getByTestId("offer-form-success")).not.toBeVisible()
    await expect(page.getByTestId("offer-form-page")).toBeVisible()
  })

  test("API error on submit shows error message, not success", async ({ page }) => {
    await page.route("**/api/offer-form/abc123token**", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "Server error" }) })
        return
      }
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(PREFILL) })
    })
    await page.goto("/offer-form/abc123token")
    await page.getByTestId("offer-form-offer-amount").fill("650000")
    await checkMultiOfferBoxes(page)
    await page.getByTestId("offer-form-submit").click()
    await expect(page.getByTestId("offer-form-success")).not.toBeVisible({ timeout: 5_000 })
    await expect(page.getByTestId("offer-form-error")).toBeVisible()
  })
})
