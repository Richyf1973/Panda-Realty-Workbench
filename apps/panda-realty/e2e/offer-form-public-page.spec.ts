import { expect, test } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { createStory, shotFocused } from "@repo/e2e-utils"

import { checkMultiOfferBoxes } from "./offer-form-helpers"

// Pre-filled form data returned by the token lookup API (new shape)
const FORM_PREFILL_RESPONSE = {
  propertyAddress: "195/46 Amy Street, Morayfield, QLD, 4506",
  buyers: [{ name: "Sandesh Panta", phone: "0449 192 053", email: "sandesh.panta15@gmail.com", address: "12 Smith Street" }],
  rep: null,
  solicitorName: null,
  solicitorPhone: null,
  solicitorAddress: null,
  solicitorEmail: null,
}

const FORM_PREFILL_WITH_SOLICITOR = {
  ...FORM_PREFILL_RESPONSE,
  solicitorName: "John Law",
  solicitorPhone: "07 3000 0000",
  solicitorAddress: "1 Law Street, Brisbane",
  solicitorEmail: "john@lawfirm.com",
}

const SHOT_DIR = join(dirname(fileURLToPath(import.meta.url)), "screenshots", "offer-form-html-alignment")

const story = createStory({
  specUrl: import.meta.url,
  slug: "offer-form-html-alignment",
})

story.setWhatWasBuilt(
  "The React offer web form was aligned to the approved HTML blueprint " +
  "(proforma-offer-multi-offer-disclosure.html). Key changes: emerald header border and branding, " +
  "numbered circle badges on all section headings (dark badge for §5 Multi-Offer), " +
  "updated field labels and radio wording throughout all sections, " +
  "a new §5 Multi-Offer Scenario Acknowledgment with amber container and 3 required checkboxes, " +
  "4-option sale status dropdown splitting under_contract into conditional/unconditional, " +
  "simultaneous settlement radio, and a dark footer with agent titles and Direct Line / Email labels.",
)

test.describe("Public offer form page — /offer-form/[token]", () => {
  test.describe.configure({ mode: "serial" })

  test.beforeEach(async ({ page }) => {
    // window.print() is called after successful submit; suppress it so tests don't hang
    await page.addInitScript(() => { window.print = () => {} })
    await mkdir(SHOT_DIR, { recursive: true })
  })

  test.afterAll(() => {
    story.write()
  })

  // ── Happy path ─────────────────────────────────────────────────────────

  test("form page loads without auth and shows pre-filled buyer details", async ({ page }) => {
    await page.route("**/api/offer-form/abc123token**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(FORM_PREFILL_RESPONSE) })
    })

    await page.goto("/offer-form/abc123token")

    await expect(page.getByTestId("offer-form-page")).toBeVisible()
    await expect(page.getByTestId("offer-form-property-address")).toHaveValue("195/46 Amy Street, Morayfield, QLD, 4506")
    await expect(page.getByTestId("offer-form-buyer-1-name")).toHaveValue("Sandesh Panta")
    await expect(page.getByTestId("offer-form-buyer-1-phone")).toHaveValue("0449 192 053")
    await expect(page.getByTestId("offer-form-buyer-1-email")).toHaveValue("sandesh.panta15@gmail.com")
    await expect(page.getByTestId("offer-form-buyer-1-address")).toHaveValue("12 Smith Street")

    await shotFocused(page, page.getByTestId("offer-form-page"), SHOT_DIR, "01-initial-load")
    story.addScene({
      title: "01 — Initial Load: Header, Branding, Buyer Card",
      images: [join(SHOT_DIR, "01-initial-load.png")],
      seeing:
        "Header has emerald bottom border, subtitle reads 'Real Estate Offer Submission Framework', " +
        "brand reads 'MY PANDA REALTY' in emerald. §1 buyer card heading reads 'Purchaser 1' with a " +
        "numbered circle badge. All prefilled buyer fields are populated.",
      steps: [
        "Navigate to /offer-form/abc123token",
        "Observe header — emerald border, correct subtitle and branding",
        "Observe §1 buyer card heading reads 'Purchaser 1' with a numbered circle badge",
        "Confirm prefilled buyer name, phone, email, and address are shown",
      ],
    })
  })

  test("property address field is read-only (pre-filled from agent)", async ({ page }) => {
    await page.route("**/api/offer-form/abc123token**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(FORM_PREFILL_RESPONSE) })
    })

    await page.goto("/offer-form/abc123token")
    const input = page.getByTestId("offer-form-property-address")
    await expect(input).toHaveValue("195/46 Amy Street, Morayfield, QLD, 4506")
    await expect(input).toBeDisabled()
  })

  test("solicitor fields are pre-filled when solicitor is linked to property", async ({ page }) => {
    await page.route("**/api/offer-form/abc123token**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(FORM_PREFILL_WITH_SOLICITOR) })
    })

    await page.goto("/offer-form/abc123token")

    await expect(page.getByTestId("offer-form-solicitor-name")).toHaveValue("John Law")
    await expect(page.getByTestId("offer-form-solicitor-phone")).toHaveValue("07 3000 0000")
    await expect(page.getByTestId("offer-form-solicitor-email")).toHaveValue("john@lawfirm.com")
  })

  test("Subject to Finance section is hidden by default and shown when Yes is selected", async ({ page }) => {
    await page.route("**/api/offer-form/abc123token**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(FORM_PREFILL_RESPONSE) })
    })

    await page.goto("/offer-form/abc123token")

    await expect(page.getByTestId("offer-form-finance-section")).not.toBeVisible()
    await shotFocused(page, page.getByTestId("offer-form-subject-to-finance-yes"), SHOT_DIR, "02a-finance-off")

    await page.getByTestId("offer-form-subject-to-finance-yes").click()
    await expect(page.getByTestId("offer-form-finance-section")).toBeVisible()
    await expect(page.getByTestId("offer-form-finance-days-select")).toBeVisible()
    await expect(page.getByTestId("offer-form-finance-bank")).toBeVisible()
    await shotFocused(page, page.getByTestId("offer-form-finance-section"), SHOT_DIR, "02b-finance-on")

    story.addScene({
      title: "02 — Finance Section Toggle: Hidden → Expanded",
      images: [join(SHOT_DIR, "02a-finance-off.png"), join(SHOT_DIR, "02b-finance-on.png")],
      seeing:
        "Left: default — finance sub-panel hidden; radio question reads 'Is this offer subject to finance approval?' " +
        "Right: after selecting Yes — sub-panel expands showing 'Days required to get full Bank Approval' " +
        "and bank field labelled 'Financier / Banking Institution'.",
      steps: [
        "Navigate to /offer-form/abc123token",
        "Observe finance sub-panel is hidden (screenshot 1)",
        "Click the Yes radio on Subject to Finance",
        "Observe expanded sub-panel with correct labels (screenshot 2)",
      ],
    })

    await page.getByTestId("offer-form-subject-to-finance-no").click()
    await expect(page.getByTestId("offer-form-finance-section")).not.toBeVisible()
  })

  test("Subject to Sale section is hidden by default and shown when Yes is selected", async ({ page }) => {
    await page.route("**/api/offer-form/abc123token**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(FORM_PREFILL_RESPONSE) })
    })

    await page.goto("/offer-form/abc123token")

    await expect(page.getByTestId("offer-form-sale-details")).not.toBeVisible()
    await shotFocused(page, page.getByTestId("offer-form-subject-to-sale-yes"), SHOT_DIR, "03a-sale-off")

    await page.getByTestId("offer-form-subject-to-sale-yes").click()
    await expect(page.getByTestId("offer-form-sale-details")).toBeVisible()
    await expect(page.getByTestId("offer-form-sale-status-dropdown")).toBeVisible()
    await shotFocused(page, page.getByTestId("offer-form-sale-details"), SHOT_DIR, "03b-sale-on")

    story.addScene({
      title: "03 — Subject to Sale Toggle: Hidden → Expanded",
      images: [join(SHOT_DIR, "03a-sale-off.png"), join(SHOT_DIR, "03b-sale-on.png")],
      seeing:
        "Left: default — sale sub-panel hidden; radio reads 'Will this offer be contingent upon the sale of another property?' " +
        "with options 'Yes, Contingent on Existing Sale' / 'No, Independent Offer'. " +
        "Right: after selecting Yes — sub-panel expands with 'Full Address of the Asset to be Sold' " +
        "and 'Current Transaction Status' dropdown.",
      steps: [
        "Navigate to /offer-form/abc123token",
        "Observe sale sub-panel is hidden (screenshot 1)",
        "Click 'Yes, Contingent on Existing Sale'",
        "Observe expanded sub-panel with correct labels (screenshot 2)",
      ],
    })

    await page.getByTestId("offer-form-subject-to-sale-no").click()
    await expect(page.getByTestId("offer-form-sale-details")).not.toBeVisible()
  })

  test("submitting the form with valid data calls the submit API and shows success", async ({ page }) => {
    const captured: { body: Record<string, unknown> | null } = { body: null }

    await page.route("**/api/offer-form/abc123token**", async (route) => {
      if (route.request().method() === "POST") {
        captured.body = (await route.request().postDataJSON()) as Record<string, unknown>
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) })
        return
      }
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(FORM_PREFILL_RESPONSE) })
    })

    await page.goto("/offer-form/abc123token")
    await page.getByTestId("offer-form-offer-amount").fill("650000")
    await page.getByTestId("offer-form-cash-buyer-no").click()

    await shotFocused(page, page.getByTestId("offer-form-multi-offer-section"), SHOT_DIR, "04a-multi-offer")
    story.addScene({
      title: "04a — §5 Multi-Offer Scenario Acknowledgment",
      images: [join(SHOT_DIR, "04a-multi-offer.png")],
      seeing:
        "§5 rendered inside amber container (bg-amber-50/40, amber border). Section heading badge is dark " +
        "(bg-slate-900 text-white) unlike §1–4 badges. Warning banner starts '⚠️ NOTICE TO PURCHASER(S)'. " +
        "Three required checkboxes: highest and best offer, vendor discretion, competing offer confidentiality.",
      steps: [
        "Navigate to /offer-form/abc123token",
        "Scroll to §5 Multi-Offer Scenario Acknowledgment",
        "Observe amber container, dark heading badge, warning banner, and 3 required checkboxes",
      ],
    })

    await checkMultiOfferBoxes(page)
    await page.getByTestId("offer-form-submit").click()

    await expect(page.getByTestId("offer-form-success")).toBeVisible({ timeout: 8_000 })
    await shotFocused(page, page.getByTestId("offer-form-success"), SHOT_DIR, "04b-success")
    story.addScene({
      title: "04b — Submit Success State",
      images: [join(SHOT_DIR, "04b-success.png")],
      seeing:
        "After checking all 3 multi-offer boxes and clicking 'Submit Offer', the success screen appears. " +
        "The form is no longer visible and the submit button is gone.",
      steps: [
        "Fill offer amount, click cash buyer No, check all 3 multi-offer checkboxes",
        "Click 'Submit Offer'",
        "Observe success state appears and form is hidden",
      ],
    })

    if (!captured.body) throw new Error("captured.body was null — form did not submit")
    expect(captured.body.offerAmount).toBe("650000")
  })

  test("after successful submission the success state is shown and form is hidden", async ({ page }) => {
    await page.route("**/api/offer-form/abc123token**", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) })
        return
      }
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(FORM_PREFILL_RESPONSE) })
    })

    await page.goto("/offer-form/abc123token")
    await page.getByTestId("offer-form-offer-amount").fill("650000")
    await checkMultiOfferBoxes(page)
    await page.getByTestId("offer-form-submit").click()

    await expect(page.getByTestId("offer-form-success")).toBeVisible({ timeout: 8_000 })
    await expect(page.getByTestId("offer-form-submit")).not.toBeVisible()
  })

  // ── Cash Buyer conditional visibility ──────────────────────────────────

  test("Cash Buyer Yes hides Subject to Finance and Subject to Sale sections", async ({ page }) => {
    await page.route("**/api/offer-form/abc123token**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(FORM_PREFILL_RESPONSE) })
    })

    await page.goto("/offer-form/abc123token")

    await page.getByTestId("offer-form-cash-buyer-yes").click()

    await expect(page.getByTestId("offer-form-subject-to-finance-section")).not.toBeVisible()
    await expect(page.getByTestId("offer-form-subject-to-sale-section")).not.toBeVisible()
  })

  test("Cash Buyer No shows Subject to Finance and Subject to Sale sections", async ({ page }) => {
    await page.route("**/api/offer-form/abc123token**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(FORM_PREFILL_RESPONSE) })
    })

    await page.goto("/offer-form/abc123token")

    await page.getByTestId("offer-form-cash-buyer-yes").click()
    await page.getByTestId("offer-form-cash-buyer-no").click()

    await expect(page.getByTestId("offer-form-subject-to-finance-section")).toBeVisible()
    await expect(page.getByTestId("offer-form-subject-to-sale-section")).toBeVisible()
  })

  test("Solicitor section stays visible when Cash Buyer Yes is selected", async ({ page }) => {
    await page.route("**/api/offer-form/abc123token**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(FORM_PREFILL_WITH_SOLICITOR) })
    })

    await page.goto("/offer-form/abc123token")
    await page.getByTestId("offer-form-cash-buyer-yes").click()

    await expect(page.getByTestId("offer-form-solicitor-section")).toBeVisible()
  })

  // ── Settlement period date input ────────────────────────────────────────

  test("settlement period text field accepts free text", async ({ page }) => {
    await page.route("**/api/offer-form/abc123token**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(FORM_PREFILL_RESPONSE) })
    })

    await page.goto("/offer-form/abc123token")
    await page.getByTestId("offer-form-settlement-period").fill("60")
    await expect(page.getByTestId("offer-form-settlement-period")).toHaveValue("60")
  })

  // ── Error / rejection states ────────────────────────────────────────────

  test("invalid token shows a friendly error page (not a 500)", async ({ page }) => {
    await page.route("**/api/offer-form/invalid-token**", async (route) => {
      await route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ error: "Not found" }) })
    })

    await page.goto("/offer-form/invalid-token")

    await expect(page.getByTestId("offer-form-not-found")).toBeVisible()
    await expect(page.getByTestId("offer-form-page")).not.toBeVisible()
  })

  test("submit with empty Buyer 1 name shows validation error", async ({ page }) => {
    await page.route("**/api/offer-form/abc123token**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(FORM_PREFILL_RESPONSE) })
    })

    await page.goto("/offer-form/abc123token")

    await page.getByTestId("offer-form-buyer-1-name").fill("")
    await page.getByTestId("offer-form-submit").click()

    await expect(page.getByTestId("offer-form-success")).not.toBeVisible()
    await expect(page.getByTestId("offer-form-page")).toBeVisible()
  })

  test("API error on submit shows an error message and does not show success", async ({ page }) => {
    await page.route("**/api/offer-form/abc123token**", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "Server error" }) })
        return
      }
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(FORM_PREFILL_RESPONSE) })
    })

    await page.goto("/offer-form/abc123token")
    await page.getByTestId("offer-form-offer-amount").fill("650000")
    await checkMultiOfferBoxes(page)
    await page.getByTestId("offer-form-submit").click()

    await expect(page.getByTestId("offer-form-success")).not.toBeVisible({ timeout: 5_000 })
    await expect(page.getByTestId("offer-form-error")).toBeVisible()
  })
})
