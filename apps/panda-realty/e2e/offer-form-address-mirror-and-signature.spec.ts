import { expect, test } from "@playwright/test"

const PREFILL = {
  propertyAddress: "195/46 Amy Street, Morayfield, QLD, 4506",
  buyers: [
    { name: "Alice Smith", phone: "0400 000 001", email: "alice@test.com", address: "12 Smith Street, Brisbane" },
  ],
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

test.describe("Offer form — buyer address mirroring", () => {
  test("new Buyer 2 pre-fills address from Buyer 1", async ({ page }) => {
    await mockGet(page)
    await page.goto("/offer-form/abc123token")
    await page.getByTestId("offer-form-add-buyer").click()
    await expect(page.getByTestId("offer-form-buyer-2-address")).toHaveValue("12 Smith Street, Brisbane")
  })

  test("typing Buyer 1 address mirrors to existing Buyer 2", async ({ page }) => {
    await mockGet(page)
    await page.goto("/offer-form/abc123token")
    await page.getByTestId("offer-form-add-buyer").click()

    await page.getByTestId("offer-form-buyer-1-address").fill("99 New Road, Sydney")
    await expect(page.getByTestId("offer-form-buyer-2-address")).toHaveValue("99 New Road, Sydney")
  })

  test("Buyer 2 can override their own address independently", async ({ page }) => {
    await mockGet(page)
    await page.goto("/offer-form/abc123token")
    await page.getByTestId("offer-form-add-buyer").click()

    await page.getByTestId("offer-form-buyer-2-address").fill("7 Different Lane, Melbourne")
    await expect(page.getByTestId("offer-form-buyer-2-address")).toHaveValue("7 Different Lane, Melbourne")
    // Buyer 1 address is unchanged
    await expect(page.getByTestId("offer-form-buyer-1-address")).toHaveValue("12 Smith Street, Brisbane")
  })
})

test.describe("Offer form — Buyer 2 signature defaults to Type mode", () => {
  test("Buyer 2 signature panel defaults to type mode (text input visible)", async ({ page }) => {
    await mockGet(page)
    await page.goto("/offer-form/abc123token")
    await page.getByTestId("offer-form-add-buyer").click()

    await expect(page.getByTestId("offer-form-signature-2")).toBeVisible()
    // Type mode: text input is visible, canvas is not
    await expect(page.getByTestId("offer-form-signature-2-text-input")).toBeVisible()
    await expect(page.getByTestId("offer-form-signature-2-canvas")).not.toBeVisible()
  })

  test("Buyer 1 signature defaults to type mode (text input visible)", async ({ page }) => {
    await mockGet(page)
    await page.goto("/offer-form/abc123token")

    await expect(page.getByTestId("offer-form-signature-1")).toBeVisible()
    await expect(page.getByTestId("offer-form-signature-1-text-input")).toBeVisible()
    await expect(page.getByTestId("offer-form-signature-1-canvas")).not.toBeVisible()
  })
})
