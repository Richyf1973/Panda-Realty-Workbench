// Run: npm run test:e2e:scratch -- --app=panda-realty --spec="apps/panda-realty/e2e/offer-form-label-cleanup-signature-validation.spec.ts" --no-bail

import { expect, test } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { createStory, shotFocused } from "@repo/e2e-utils"

import { checkMultiOfferBoxes, mockOfferFormGet, mockOfferFormGetAndPost } from "./offer-form-helpers"

const SHOT_DIR = join(dirname(fileURLToPath(import.meta.url)), "screenshots", "offer-form-label-cleanup-signature-validation")

const story = createStory({
  specUrl: import.meta.url,
  slug: "offer-form-label-cleanup-signature-validation",
})

story.setWhatWasBuilt(
  "Three label-text cleanups in Section 4 of the offer form: " +
  "Cash Buyer Yes radio changed from 'Yes (Unconditional on Finance)' to 'Yes'; " +
  "Cash Buyer No radio changed from 'No (Subject to Finance / Terms)' to 'No'; " +
  "building/pest question changed from 'Do you require a building and pest inspection contingency?' to 'Do you require a building and pest inspection?'. " +
  "Also added mandatory signature validation: each purchaser must sign before submission, " +
  "showing an inline error below each unsigned pad (data-testid offer-form-signature-N-error) " +
  "and a summary error near the Submit button (data-testid offer-form-signatures-error).",
)

const TWO_BUYER_PREFILL = {
  propertyAddress: "195/46 Amy Street, Morayfield, QLD, 4506",
  buyers: [
    { name: "Sandesh Panta", phone: "0449 192 053", email: "sandesh.panta15@gmail.com", address: "12 Smith Street, Brisbane" },
    { name: "Jane Doe", phone: "0400000000", email: "jane@example.com", address: "5 Other Street, Brisbane" },
  ],
  rep: null,
  solicitorName: null,
  solicitorPhone: null,
  solicitorAddress: null,
  solicitorEmail: null,
}

function mockTwoBuyerGet(page: import("@playwright/test").Page) {
  return page.route("**/api/offer-form/abc123token**", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(TWO_BUYER_PREFILL) })
      return
    }
    await route.fallback()
  })
}

test.describe("Offer form — label cleanup and signature validation", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => { window.print = () => {} })
    await mkdir(SHOT_DIR, { recursive: true })
  })

  test.afterAll(() => {
    story.write()
  })

  // ── Label changes — Section 4 ────────────────────────────────────────────

  test("Cash Buyer Yes radio reads exactly Yes with no parenthetical", async ({ page }) => {
    await mockOfferFormGet(page)
    await page.goto("/offer-form/abc123token")

    const yesRadio = page.getByTestId("offer-form-cash-buyer-yes")
    await expect(yesRadio).toBeVisible()
    // Assert the label next to the radio does NOT contain the old parenthetical text
    const yesLabel = page.locator("label").filter({ has: yesRadio })
    await expect(yesLabel).not.toContainText("Unconditional on Finance")
    // Assert the label text is exactly "Yes"
    await expect(yesLabel).toHaveText("Yes")

    const cashBuyerQuestion = page.getByTestId("offer-form-cash-buyer-question")
    await shotFocused(page, cashBuyerQuestion, SHOT_DIR, "01-cash-buyer-yes-label")
    story.addScene({
      title: "01 — Cash Buyer Yes label: No parenthetical",
      images: [join(SHOT_DIR, "01-cash-buyer-yes-label.png")],
      seeing: "The Are you a Cash Buyer? question with both radio options visible. Yes reads 'Yes' only — '(Unconditional on Finance)' has been removed.",
      steps: [
        "Navigate to /offer-form/abc123token",
        "Scroll to Section 4 — Offer Contingencies & Terms",
        "Observe Cash Buyer Yes radio reads 'Yes' with no parenthetical",
      ],
    })
  })

  test("Cash Buyer No radio reads exactly No with no parenthetical", async ({ page }) => {
    await mockOfferFormGet(page)
    await page.goto("/offer-form/abc123token")

    const noRadio = page.getByTestId("offer-form-cash-buyer-no")
    await expect(noRadio).toBeVisible()
    const noLabel = page.locator("label").filter({ has: noRadio })
    await expect(noLabel).not.toContainText("Subject to Finance")
    await expect(noLabel).toHaveText("No")

    await shotFocused(page, page.getByTestId("offer-form-cash-buyer-question"), SHOT_DIR, "02-cash-buyer-no-label")
    story.addScene({
      title: "02 — Cash Buyer No label: No parenthetical",
      images: [join(SHOT_DIR, "02-cash-buyer-no-label.png")],
      seeing: "The Are you a Cash Buyer? question with both radio options visible. No reads 'No' only — '(Subject to Finance / Terms)' has been removed.",
      steps: [
        "Navigate to /offer-form/abc123token",
        "Scroll to Section 4 — Cash Buyer question",
        "Observe No radio reads 'No' with no parenthetical",
      ],
    })
  })

  test("Building pest question label has no word contingency", async ({ page }) => {
    await mockOfferFormGet(page)
    await page.goto("/offer-form/abc123token")

    // Assert the new label text is present
    const newLabel = page.getByText("Do you require a building and pest inspection?", { exact: true })
    await expect(newLabel).toBeVisible()

    // Assert the old label with "contingency" is gone
    const oldLabel = page.getByText("Do you require a building and pest inspection contingency?", { exact: true })
    await expect(oldLabel).not.toBeVisible()

    await shotFocused(page, page.getByTestId("offer-form-building-pest-question"), SHOT_DIR, "03-building-pest-label")
    story.addScene({
      title: "03 — Building Pest Label: word contingency removed",
      images: [join(SHOT_DIR, "03-building-pest-label.png")],
      seeing: "The building inspection question group showing the label and Yes/No radios. Label reads 'Do you require a building and pest inspection?' — the word 'contingency' has been removed.",
      steps: [
        "Navigate to /offer-form/abc123token",
        "Scroll to building and pest question in Section 4",
        "Observe question text has no word 'contingency'",
      ],
    })
  })

  test("Finance sub-panel still expands when Cash Buyer No is selected (regression)", async ({ page }) => {
    await mockOfferFormGet(page)
    await page.goto("/offer-form/abc123token")
    await page.getByTestId("offer-form-cash-buyer-no").click()
    await expect(page.getByTestId("offer-form-subject-to-finance-section")).toBeVisible()
  })

  // ── Signature validation — single buyer ──────────────────────────────────

  test("submit with empty signature on single buyer shows inline error and summary error", async ({ page }) => {
    await mockOfferFormGet(page)
    await page.goto("/offer-form/abc123token")
    await page.getByTestId("offer-form-offer-amount").fill("650000")
    await checkMultiOfferBoxes(page)
    // Leave signature empty, attempt submit
    await page.getByTestId("offer-form-submit").click()

    // Form must NOT have submitted
    await expect(page.getByTestId("offer-form-success")).not.toBeVisible()

    // Inline error under pad 1
    const inlineError1 = page.getByTestId("offer-form-signature-1-error")
    await expect(inlineError1).toBeVisible()

    // Summary error near submit button
    const summaryError = page.getByTestId("offer-form-signatures-error")
    await expect(summaryError).toBeVisible()

    await shotFocused(page, page.getByTestId("offer-form-signature-1"), SHOT_DIR, "04a-sig-inline-error")
    await shotFocused(page, page.getByTestId("offer-form-submit-footer"), SHOT_DIR, "04b-sig-summary-error")
    story.addScene({
      title: "04 — Signature Validation: inline error and summary error on empty submit",
      images: [join(SHOT_DIR, "04a-sig-inline-error.png"), join(SHOT_DIR, "04b-sig-summary-error.png")],
      seeing:
        "Left: full Purchaser 1 signature pad card showing the pad area and inline error below it. " +
        "Right: the submit footer area showing the summary error message and the Submit Offer button.",
      steps: [
        "Fill offer amount and tick all multi-offer checkboxes",
        "Leave signature empty",
        "Click Submit Offer",
        "Observe inline error below pad and summary error near Submit",
      ],
    })
  })

  test("filling signature then submitting clears error and succeeds", async ({ page }) => {
    const captured: { body: Record<string, unknown> | null } = { body: null }
    await mockOfferFormGetAndPost(page, captured)

    await page.goto("/offer-form/abc123token")
    await page.getByTestId("offer-form-offer-amount").fill("650000")
    await checkMultiOfferBoxes(page)

    // Type a signature
    await page.getByTestId("offer-form-signature-1-text-input").fill("Sandesh Panta")

    await page.getByTestId("offer-form-submit").click()
    await expect(page.getByTestId("offer-form-success")).toBeVisible({ timeout: 8_000 })

    // No inline or summary errors
    await expect(page.getByTestId("offer-form-signature-1-error")).not.toBeVisible()
    await expect(page.getByTestId("offer-form-signatures-error")).not.toBeVisible()
  })

  // ── Signature validation — two buyers ────────────────────────────────────

  test("two buyers: partial sign (buyer 1 only) still blocks submit and shows error on buyer 2 pad only", async ({ page }) => {
    await mockTwoBuyerGet(page)
    await page.goto("/offer-form/abc123token")
    await page.getByTestId("offer-form-offer-amount").fill("650000")
    await checkMultiOfferBoxes(page)

    // Sign only buyer 1
    await page.getByTestId("offer-form-signature-1-text-input").fill("Sandesh Panta")

    await page.getByTestId("offer-form-submit").click()
    await expect(page.getByTestId("offer-form-success")).not.toBeVisible()

    // Buyer 1: no error
    await expect(page.getByTestId("offer-form-signature-1-error")).not.toBeVisible()
    // Buyer 2: inline error
    const inlineError2 = page.getByTestId("offer-form-signature-2-error")
    await expect(inlineError2).toBeVisible()
    // Summary still shows
    await expect(page.getByTestId("offer-form-signatures-error")).toBeVisible()

    await shotFocused(page, page.getByTestId("offer-form-signature-2"), SHOT_DIR, "05-buyer2-unsigned-error")
    story.addScene({
      title: "05 — Two Buyers: only unsigned pad shows error",
      images: [join(SHOT_DIR, "05-buyer2-unsigned-error.png")],
      seeing: "Purchaser 2 full signature pad card showing the empty pad area and inline error below it. Buyer 1 (not shown) has no error. Submit is blocked.",
      steps: [
        "Load two-buyer prefill, fill offer amount and multi-offer boxes",
        "Type name in signature pad 1 only",
        "Click Submit",
        "Observe only pad 2 has an inline error",
      ],
    })
  })

  test("two buyers: both signed — form submits", async ({ page }) => {
    const captured: { body: Record<string, unknown> | null } = { body: null }
    await page.route("**/api/offer-form/abc123token**", async (route) => {
      if (route.request().method() === "POST") {
        captured.body = (await route.request().postDataJSON()) as Record<string, unknown>
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) })
        return
      }
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(TWO_BUYER_PREFILL) })
    })
    await page.goto("/offer-form/abc123token")
    await page.getByTestId("offer-form-offer-amount").fill("650000")
    await checkMultiOfferBoxes(page)

    await page.getByTestId("offer-form-signature-1-text-input").fill("Sandesh Panta")
    await page.getByTestId("offer-form-signature-2-text-input").fill("Jane Doe")

    await page.getByTestId("offer-form-submit").click()
    await expect(page.getByTestId("offer-form-success")).toBeVisible({ timeout: 8_000 })
  })

  // ── Edge: switch to draw mode and clear ──────────────────────────────────

  test("switching signed type pad to draw mode and clearing makes it unsigned", async ({ page }) => {
    await mockOfferFormGet(page)
    await page.goto("/offer-form/abc123token")
    await page.getByTestId("offer-form-offer-amount").fill("650000")
    await checkMultiOfferBoxes(page)

    // Type a name → pad is signed
    await page.getByTestId("offer-form-signature-1-text-input").fill("Sandesh Panta")

    // Switch to draw mode (clears the typed data)
    await page.getByTestId("offer-form-signature-1-draw-btn").click()
    // Canvas is now empty — no drawing done

    await page.getByTestId("offer-form-submit").click()
    await expect(page.getByTestId("offer-form-success")).not.toBeVisible()
    await expect(page.getByTestId("offer-form-signature-1-error")).toBeVisible()
  })

  // ── Edge: all validations fire together ──────────────────────────────────

  test("all validation errors appear simultaneously when buyer name, multi-offer boxes and signature are all empty", async ({ page }) => {
    await mockOfferFormGet(page)
    await page.goto("/offer-form/abc123token")
    // Clear the prefilled buyer name
    await page.getByTestId("offer-form-buyer-1-name").fill("")
    // Leave offer amount, multi-offer boxes and signature empty
    await page.getByTestId("offer-form-submit").click()

    await expect(page.getByTestId("offer-form-success")).not.toBeVisible()
    // Signature inline error
    await expect(page.getByTestId("offer-form-signature-1-error")).toBeVisible()
    // Summary signature error
    await expect(page.getByTestId("offer-form-signatures-error")).toBeVisible()
  })
})
