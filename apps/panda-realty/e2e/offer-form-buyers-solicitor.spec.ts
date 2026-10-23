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

const PREFILL_WITH_SOLICITOR = {
  ...PREFILL,
  solicitorName: "John Law",
  solicitorPhone: "07 3000 0000",
  solicitorAddress: "1 Law Street, Brisbane",
  solicitorEmail: "john@lawfirm.com",
}

function mockGet(page: import("@playwright/test").Page, body: Record<string, unknown> = PREFILL) {
  return page.route("**/api/offer-form/abc123token**", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) })
      return
    }
    await route.fallback()
  })
}

test.describe("Offer form — header, buyers, and solicitor (Sections 1 & 2)", () => {
  // ── Header & branding ────────────────────────────────────────────────────

  test("header shows slate background with green MY PANDA REALTY brand", async ({ page }) => {
    await mockGet(page)
    await page.goto("/offer-form/abc123token")
    await expect(page.getByTestId("offer-form-header")).toBeVisible()
    await expect(page.getByTestId("offer-form-brand-name")).toContainText("MY PANDA REALTY")
  })

  test("page title reads PRO FORMA CONTRACT", async ({ page }) => {
    await mockGet(page)
    await page.goto("/offer-form/abc123token")
    await expect(page.getByTestId("offer-form-page")).toContainText("PRO FORMA CONTRACT")
  })

  // ── Section 1: Property address + dynamic buyer cards ────────────────────

  test("property address is pre-filled and read-only", async ({ page }) => {
    await mockGet(page)
    await page.goto("/offer-form/abc123token")
    const addr = page.getByTestId("offer-form-property-address")
    await expect(addr).toHaveValue("195/46 Amy Street, Morayfield, QLD, 4506")
    await expect(addr).toBeDisabled()
  })

  test("Buyer 1 card is pre-filled with prefill data", async ({ page }) => {
    await mockGet(page)
    await page.goto("/offer-form/abc123token")
    await expect(page.getByTestId("offer-form-buyer-1-name")).toHaveValue("Sandesh Panta")
    await expect(page.getByTestId("offer-form-buyer-1-phone")).toHaveValue("0449 192 053")
    await expect(page.getByTestId("offer-form-buyer-1-email")).toHaveValue("sandesh.panta15@gmail.com")
    await expect(page.getByTestId("offer-form-buyer-1-address")).toHaveValue("12 Smith Street, Brisbane")
  })

  test("Add Another Buyer button adds a second buyer card", async ({ page }) => {
    await mockGet(page)
    await page.goto("/offer-form/abc123token")
    await expect(page.getByTestId("offer-form-buyer-card-2")).not.toBeVisible()
    await page.getByTestId("offer-form-add-buyer").click()
    await expect(page.getByTestId("offer-form-buyer-card-2")).toBeVisible()
    await expect(page.getByTestId("offer-form-buyer-2-name")).toBeVisible()
    await expect(page.getByTestId("offer-form-buyer-2-phone")).toBeVisible()
    await expect(page.getByTestId("offer-form-buyer-2-email")).toBeVisible()
    await expect(page.getByTestId("offer-form-buyer-2-address")).toBeVisible()
  })

  test("Remove button on buyer 2 removes the card", async ({ page }) => {
    await mockGet(page)
    await page.goto("/offer-form/abc123token")
    await page.getByTestId("offer-form-add-buyer").click()
    await expect(page.getByTestId("offer-form-buyer-card-2")).toBeVisible()
    await page.getByTestId("offer-form-remove-buyer-2").click()
    await expect(page.getByTestId("offer-form-buyer-card-2")).not.toBeVisible()
  })

  test("buyer 1 card has no Remove button", async ({ page }) => {
    await mockGet(page)
    await page.goto("/offer-form/abc123token")
    await expect(page.getByTestId("offer-form-remove-buyer-1")).not.toBeVisible()
  })

  // ── Section 2: Solicitor — always visible ────────────────────────────────

  test("solicitor section is always visible (not a collapsible accordion)", async ({ page }) => {
    await mockGet(page)
    await page.goto("/offer-form/abc123token")
    await expect(page.getByTestId("offer-form-solicitor-section")).toBeVisible()
    await expect(page.getByTestId("offer-form-solicitor-name")).toBeVisible()
    await expect(page.getByTestId("offer-form-solicitor-phone")).toBeVisible()
    await expect(page.getByTestId("offer-form-solicitor-address")).toBeVisible()
    await expect(page.getByTestId("offer-form-solicitor-email")).toBeVisible()
  })

  test("solicitor fields are pre-filled when solicitor data is in prefill", async ({ page }) => {
    await mockGet(page, PREFILL_WITH_SOLICITOR)
    await page.goto("/offer-form/abc123token")
    await expect(page.getByTestId("offer-form-solicitor-name")).toHaveValue("John Law")
    await expect(page.getByTestId("offer-form-solicitor-phone")).toHaveValue("07 3000 0000")
    await expect(page.getByTestId("offer-form-solicitor-address")).toHaveValue("1 Law Street, Brisbane")
    await expect(page.getByTestId("offer-form-solicitor-email")).toHaveValue("john@lawfirm.com")
  })
})
