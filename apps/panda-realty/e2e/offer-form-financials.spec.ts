import { expect, test } from "@playwright/test"

const PREFILL = {
  propertyAddress: "195/46 Amy Street, Morayfield, QLD, 4506",
  buyers: [{ name: "Sandesh Panta", phone: "0449 192 053", email: "sandesh.panta15@gmail.com", address: "12 Smith Street, Brisbane" }],
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

test.describe("Offer form — financial details (Section 3)", () => {
  test("financial section shows offer amount, total deposit, initial payment, 2nd payment", async ({ page }) => {
    await mockGet(page)
    await page.goto("/offer-form/abc123token")
    await expect(page.getByTestId("offer-form-offer-amount")).toBeVisible()
    await expect(page.getByTestId("offer-form-total-deposit")).toBeVisible()
    await expect(page.getByTestId("offer-form-initial-payment")).toBeVisible()
    await expect(page.getByTestId("offer-form-second-payment")).toBeVisible()
  })

  test("total deposit defaults to 20000, initial payment to 2000, 2nd payment to 18000", async ({ page }) => {
    await mockGet(page)
    await page.goto("/offer-form/abc123token")
    await expect(page.getByTestId("offer-form-total-deposit")).toHaveValue("20000")
    await expect(page.getByTestId("offer-form-initial-payment")).toHaveValue("2000")
    await expect(page.getByTestId("offer-form-second-payment")).toHaveValue("18000")
  })
})
