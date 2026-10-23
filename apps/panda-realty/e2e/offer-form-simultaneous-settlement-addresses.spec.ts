// Run: npm run test:e2e:scratch -- --app=panda-realty --spec="apps/panda-realty/e2e/offer-form-simultaneous-settlement-addresses.spec.ts" --no-retry

import { expect, test } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { createStory, shotFocused } from "@repo/e2e-utils"

import { mockOfferFormGet, OFFER_FORM_PREFILL } from "./offer-form-helpers"

const SHOT_DIR = join(dirname(fileURLToPath(import.meta.url)), "screenshots", "simultaneous-settlement-addresses")

const story = createStory({ specUrl: import.meta.url, slug: "offer-form-simultaneous-settlement-addresses" })

story.setWhatWasBuilt(
  "The simultaneous settlement question label in the buyer offer form now displays the actual property addresses instead of a generic sentence. When the buyer enables subject-to-sale, the label reads 'Will the settlement of [sold address] occur at the same time as the purchase of [purchase address]?' with both addresses styled in green bold underlined text. Placeholder text is shown when either address is missing. The label updates live as the buyer types the sale address. Changes are in offer-form-sale-section.tsx (label rendering), offer-form-section4-terms.tsx (prop threading), and offer-form-fields.tsx (passing propertyAddress down).",
)

test.beforeEach(async () => {
  await mkdir(SHOT_DIR, { recursive: true })
})

test.afterAll(() => {
  story.write()
})

// ── Happy path ───────────────────────────────────────────────────────────────

test("settlement label shows purchase address and placeholder when sale address is empty", async ({ page }) => {
  await mockOfferFormGet(page)
  await page.goto("/offer-form/abc123token")

  await page.getByTestId("offer-form-subject-to-sale-yes").click()

  const panel = page.getByTestId("offer-form-simultaneous-settlement-panel")
  const soldSpan = panel.getByTestId("offer-form-settlement-sold-address-span")
  const purchaseSpan = panel.getByTestId("offer-form-settlement-purchase-address-span")

  await expect(soldSpan).toBeVisible({ timeout: 5_000 })
  await expect(soldSpan).toHaveText("[Property to be Sold Address]")
  await expect(purchaseSpan).toBeVisible()
  await expect(purchaseSpan).toHaveText(OFFER_FORM_PREFILL.propertyAddress!)

  await shotFocused(page, panel, SHOT_DIR, "01-placeholder-label")
  story.addScene({
    title: "01 — Settlement label with placeholder and purchase address",
    images: [join(SHOT_DIR, "01-placeholder-label.png")],
    seeing: "The simultaneous settlement panel shows the full question with a green placeholder for the sale address and the real purchase address — both styled green bold underline. The Yes/No radio buttons are visible below.",
    steps: [
      "Open offer form token",
      "Click Subject to Sale Yes",
      "Observe settlement panel — question label has placeholder sale address and real purchase address",
    ],
  })
})

test("settlement label updates live as sale address is typed", async ({ page }) => {
  await mockOfferFormGet(page)
  await page.goto("/offer-form/abc123token")

  await page.getByTestId("offer-form-subject-to-sale-yes").click()

  const panel = page.getByTestId("offer-form-simultaneous-settlement-panel")
  const saleAddressInput = page.getByTestId("offer-form-sale-property-address")
  const soldSpan = panel.getByTestId("offer-form-settlement-sold-address-span")

  await expect(soldSpan).toHaveText("[Property to be Sold Address]")

  await shotFocused(page, panel, SHOT_DIR, "02a-before-typing")

  await saleAddressInput.fill("54 Baooly Drive")

  await expect(soldSpan).toHaveText("54 Baooly Drive")

  await shotFocused(page, panel, SHOT_DIR, "02b-after-typing")
  story.addScene({
    title: "02 — Settlement label updates live as address is typed",
    images: [
      join(SHOT_DIR, "02a-before-typing.png"),
      join(SHOT_DIR, "02b-after-typing.png"),
    ],
    seeing: "Left: panel shows placeholder before typing. Right: panel shows the typed address in the question label in real time — both states show the full question and radio buttons for context.",
    steps: [
      "Click Subject to Sale Yes",
      "Observe panel shows placeholder (screenshot 1)",
      "Type sale address into the input above",
      "Observe question label updates to the typed value (screenshot 2)",
    ],
  })
})

test("settlement label shows pre-filled sale address on load", async ({ page }) => {
  await page.route("**/api/offer-form/abc123token**", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ...OFFER_FORM_PREFILL,
          isSubjectToSale: true,
          subjectToSaleAddress: "54 Baooly Drive, Brisbane QLD 4000",
        }),
      })
      return
    }
    await route.fallback()
  })

  await page.goto("/offer-form/abc123token")
  await page.getByTestId("offer-form-subject-to-sale-yes").click()

  const panel = page.getByTestId("offer-form-simultaneous-settlement-panel")
  const soldSpan = panel.getByTestId("offer-form-settlement-sold-address-span")
  const purchaseSpan = panel.getByTestId("offer-form-settlement-purchase-address-span")

  await expect(soldSpan).toHaveText("54 Baooly Drive, Brisbane QLD 4000")
  await expect(purchaseSpan).toHaveText(OFFER_FORM_PREFILL.propertyAddress!)

  await shotFocused(page, panel, SHOT_DIR, "03-prefilled-addresses")
  story.addScene({
    title: "03 — Settlement label with pre-filled sale address",
    images: [join(SHOT_DIR, "03-prefilled-addresses.png")],
    seeing: "Both address spans in the question label show real values immediately on load — no typing needed. The full panel shows the question, both green addresses, and the Yes/No radio buttons.",
    steps: [
      "Load form with subjectToSaleAddress pre-filled in the API response",
      "Click Subject to Sale Yes",
      "Observe both real addresses appear in the settlement question panel",
    ],
  })
})

// ── Edge cases ───────────────────────────────────────────────────────────────

test("settlement label shows placeholder for purchase address when propertyAddress is null", async ({ page }) => {
  await page.route("**/api/offer-form/abc123token**", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ...OFFER_FORM_PREFILL, propertyAddress: null }),
      })
      return
    }
    await route.fallback()
  })

  await page.goto("/offer-form/abc123token")
  await page.getByTestId("offer-form-subject-to-sale-yes").click()

  const panel = page.getByTestId("offer-form-simultaneous-settlement-panel")
  const purchaseSpan = panel.getByTestId("offer-form-settlement-purchase-address-span")
  await expect(purchaseSpan).toHaveText("[Property Address]")

  await shotFocused(page, panel, SHOT_DIR, "04-null-purchase-address")
  story.addScene({
    title: "04 — Settlement label purchase placeholder when address is null",
    images: [join(SHOT_DIR, "04-null-purchase-address.png")],
    seeing: "When propertyAddress is null, the purchase side of the question shows the green [Property Address] placeholder. The full panel is visible showing both placeholders and the radio buttons.",
    steps: [
      "Load form with propertyAddress: null",
      "Click Subject to Sale Yes",
      "Observe panel — purchase span shows [Property Address] placeholder",
    ],
  })
})

test("clearing the sale address restores placeholder", async ({ page }) => {
  await mockOfferFormGet(page)
  await page.goto("/offer-form/abc123token")

  await page.getByTestId("offer-form-subject-to-sale-yes").click()

  const saleAddressInput = page.getByTestId("offer-form-sale-property-address")
  const soldSpan = page.getByTestId("offer-form-settlement-sold-address-span")

  await saleAddressInput.fill("54 Baooly Drive")
  await expect(soldSpan).toHaveText("54 Baooly Drive")

  await saleAddressInput.fill("")
  await expect(soldSpan).toHaveText("[Property to be Sold Address]")
})

test("switching subject-to-sale off then back on preserves the dynamic label", async ({ page }) => {
  await mockOfferFormGet(page)
  await page.goto("/offer-form/abc123token")

  await page.getByTestId("offer-form-subject-to-sale-yes").click()

  const saleAddressInput = page.getByTestId("offer-form-sale-property-address")
  await saleAddressInput.fill("54 Baooly Drive")

  const soldSpan = page.getByTestId("offer-form-settlement-sold-address-span")
  await expect(soldSpan).toHaveText("54 Baooly Drive")

  await page.getByTestId("offer-form-subject-to-sale-no").click()
  await expect(page.getByTestId("offer-form-sale-details")).not.toBeVisible()

  await page.getByTestId("offer-form-subject-to-sale-yes").click()
  await expect(soldSpan).toHaveText("54 Baooly Drive")
  await expect(page.getByTestId("offer-form-settlement-purchase-address-span")).toHaveText(
    OFFER_FORM_PREFILL.propertyAddress!,
  )
})
