import { expect, test } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { createStory, shotFocused } from "@repo/e2e-utils"

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

function mockGet(page: import("@playwright/test").Page) {
  return page.route("**/api/offer-form/abc123token**", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(PREFILL) })
      return
    }
    await route.fallback()
  })
}

const SHOT_DIR = join(dirname(fileURLToPath(import.meta.url)), "screenshots", "offer-form-html-alignment-signatures")

const story = createStory({
  specUrl: import.meta.url,
  slug: "offer-form-html-alignment-signatures",
})

story.setWhatWasBuilt(
  "§7 Signatures section and footer were aligned to the HTML blueprint. " +
  "Signature box label changed to 'Purchaser N Execution Signature'; mode buttons now read 'Type Text' / 'Draw Canvas'; " +
  "type input placeholder updated to 'Type your formal complete legal identity name...'; " +
  "date label changed to 'Attestation Record Date:'; signature font cycles per buyer index. " +
  "Footer updated to dark bg-slate-950 with agent titles (Senior Relationship Associate / Principal Director) " +
  "and 'Direct Line:' / 'Email:' prefixes. Submit button label shortened to 'Submit Offer'.",
)

test.describe("Offer form — signatures and footer UI (§7)", () => {
  test.describe.configure({ mode: "serial" })

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => { window.print = () => {} })
    await mkdir(SHOT_DIR, { recursive: true })
  })

  test.afterAll(() => {
    story.write()
  })

  // ── Section 6: Extra Comments ────────────────────────────────────────────

  test("extra comments textarea is present and accepts text", async ({ page }) => {
    await mockGet(page)
    await page.goto("/offer-form/abc123token")
    await expect(page.getByTestId("offer-form-extra-comments")).toBeVisible()
    await page.getByTestId("offer-form-extra-comments").fill("Please note the property has a pool.")
    await expect(page.getByTestId("offer-form-extra-comments")).toHaveValue(
      "Please note the property has a pool.",
    )
  })

  // ── Section 7: Signatures ────────────────────────────────────────────────

  test("one signature pad is shown for buyer 1 by default", async ({ page }) => {
    await mockGet(page)
    await page.goto("/offer-form/abc123token")
    await expect(page.getByTestId("offer-form-signature-1")).toBeVisible()
    await expect(page.getByTestId("offer-form-signature-2")).not.toBeVisible()

    await shotFocused(page, page.getByTestId("offer-form-signature-1"), SHOT_DIR, "01-signature-pad")
    story.addScene({
      title: "01 — §7 Signature Pad: Purchaser 1 Execution Signature",
      images: [join(SHOT_DIR, "01-signature-pad.png")],
      seeing:
        "§7 shows 'Purchaser 1 Execution Signature' as the box label. Mode buttons read 'Type Text' and 'Draw Canvas'. " +
        "Default is type mode — text input visible with placeholder 'Type your formal complete legal identity name...'. " +
        "Date label reads 'Attestation Record Date:'.",
      steps: [
        "Navigate to /offer-form/abc123token",
        "Scroll to §7 Purchaser Acknowledgements & Signatures",
        "Observe label 'Purchaser 1 Execution Signature', buttons 'Type Text' / 'Draw Canvas', and date label 'Attestation Record Date:'",
      ],
    })
  })

  test("adding a second buyer creates a second signature pad", async ({ page }) => {
    await mockGet(page)
    await page.goto("/offer-form/abc123token")
    await page.getByTestId("offer-form-add-buyer").click()
    await expect(page.getByTestId("offer-form-signature-2")).toBeVisible()
  })

  test("removing a buyer removes its signature pad", async ({ page }) => {
    await mockGet(page)
    await page.goto("/offer-form/abc123token")
    await page.getByTestId("offer-form-add-buyer").click()
    await expect(page.getByTestId("offer-form-signature-2")).toBeVisible()
    await page.getByTestId("offer-form-remove-buyer-2").click()
    await expect(page.getByTestId("offer-form-signature-2")).not.toBeVisible()
  })

  test("signature draw and type mode toggle works", async ({ page }) => {
    await mockGet(page)
    await page.goto("/offer-form/abc123token")
    // Default mode is "type" — text input visible, canvas hidden
    await expect(page.getByTestId("offer-form-signature-1-text-input")).toBeVisible()
    await expect(page.getByTestId("offer-form-signature-1-canvas")).not.toBeVisible()
    await shotFocused(page, page.getByTestId("offer-form-signature-1"), SHOT_DIR, "02a-sig-type-mode")

    // Switch to draw mode
    await page.getByTestId("offer-form-signature-1-draw-btn").click()
    await expect(page.getByTestId("offer-form-signature-1-canvas")).toBeVisible()
    await expect(page.getByTestId("offer-form-signature-1-text-input")).not.toBeVisible()
    await shotFocused(page, page.getByTestId("offer-form-signature-1"), SHOT_DIR, "02b-sig-draw-mode")

    story.addScene({
      title: "02 — Signature Mode Toggle: Type Text → Draw Canvas",
      images: [join(SHOT_DIR, "02a-sig-type-mode.png"), join(SHOT_DIR, "02b-sig-draw-mode.png")],
      seeing:
        "Left: default 'Type Text' mode — text input visible, canvas hidden. " +
        "Right: after clicking 'Draw Canvas' — canvas appears for hand-drawn signature, text input hidden.",
      steps: [
        "Navigate to /offer-form/abc123token",
        "Scroll to §7 — observe default type mode (screenshot 1)",
        "Click 'Draw Canvas'",
        "Observe canvas appears and text input hides (screenshot 2)",
      ],
    })

    // Switch back to type mode
    await page.getByTestId("offer-form-signature-1-type-btn").click()
    await expect(page.getByTestId("offer-form-signature-1-text-input")).toBeVisible()
  })

  test("signature sign date input is present per buyer", async ({ page }) => {
    await mockGet(page)
    await page.goto("/offer-form/abc123token")
    await expect(page.getByTestId("offer-form-signature-1-date")).toBeVisible()
  })

  // ── Submit button label ──────────────────────────────────────────────────

  test("submit button reads 'Submit Offer'", async ({ page }) => {
    await mockGet(page)
    await page.goto("/offer-form/abc123token")
    const submitBtn = page.getByTestId("offer-form-submit")
    await expect(submitBtn).toContainText("Submit Offer")
    await shotFocused(page, submitBtn, SHOT_DIR, "03-submit-btn")
    story.addScene({
      title: "03 — Submit Button Label: 'Submit Offer'",
      images: [join(SHOT_DIR, "03-submit-btn.png")],
      seeing:
        "Bottom of the form shows 'Print Offer' and 'Submit Offer' buttons. " +
        "Previously labelled 'Print Form Layout' and 'Submit Offer & Generate PDF'.",
      steps: [
        "Navigate to /offer-form/abc123token",
        "Scroll to the bottom of the form",
        "Observe 'Print Offer' and 'Submit Offer' button labels",
      ],
    })
  })

  // ── Footer ───────────────────────────────────────────────────────────────

  test("footer shows managing agent details", async ({ page }) => {
    await mockGet(page)
    await page.goto("/offer-form/abc123token")
    const footer = page.getByTestId("offer-form-footer")
    await expect(footer).toContainText("Maria Koch")
    await expect(footer).toContainText("0493 635 666")
    await expect(footer).toContainText("maria@mypandarealty.com.au")
    await shotFocused(page, footer, SHOT_DIR, "04-footer")
    story.addScene({
      title: "04 — Footer: Dark Background, Agent Titles, Direct Line Labels",
      images: [join(SHOT_DIR, "04-footer.png")],
      seeing:
        "Footer has dark bg-slate-950 background with light text. " +
        "Agent 1: 'Maria Koch — Senior Relationship Associate', 'Direct Line: 0493 635 666', 'Email: maria@mypandarealty.com.au'. " +
        "Agent 2: 'Richard Falzon — Principal Director'. Previously the footer was light-coloured with no titles.",
      steps: [
        "Navigate to /offer-form/abc123token",
        "Scroll to the footer",
        "Observe dark background, agent name + title, 'Direct Line:' and 'Email:' prefixes",
      ],
    })
  })

  // ── Validation ───────────────────────────────────────────────────────────

  test("invalid token shows not-found screen", async ({ page }) => {
    await page.route("**/api/offer-form/bad-token**", async (route) => {
      await route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ error: "Not found" }) })
    })
    await page.goto("/offer-form/bad-token")
    await expect(page.getByTestId("offer-form-not-found")).toBeVisible()
  })
})
