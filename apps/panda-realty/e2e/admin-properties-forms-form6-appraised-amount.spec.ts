// Run: npm run test:e2e:scratch -- --app=panda-realty --spec="apps/panda-realty/e2e/admin-properties-forms-form6-appraised-amount.spec.ts" --no-bail

import { expect, test } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { createStory, shotFocused } from "@repo/e2e-utils"

import {
  PREFILL_DATA_FULL,
  makeForm6Prefill,
  openForm6SendDialog,
} from "./helpers/panda-form6-send-mocks"

const SHOT_DIR = join(dirname(fileURLToPath(import.meta.url)), "screenshots", "form6-appraised-amount")

const story = createStory({ specUrl: import.meta.url, slug: "form6-appraised-amount-link" })

story.setWhatWasBuilt(
  "Form 6 Section 3 Price now pre-populates the '$ amount' field and the 'List' checkbox from the property's Appraised Amount (appraised_amount column) instead of the Last Sale Price. " +
  "When no Appraised Amount is set, the field is blank and List is unchecked. " +
  "Changed files: form6-prefill.ts (DB select + JSON response), prefill-types.ts (Form6ApiData type), prefill-mappers.ts (mapForm6Data logic).",
)

test.beforeEach(async () => {
  await mkdir(SHOT_DIR, { recursive: true })
})

test.afterAll(() => {
  story.write()
})

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const PREFILL_WITH_APPRAISED_ONLY = {
  ...PREFILL_DATA_FULL,
  salePrice: null,
  appraisedAmount: "980000",
}

const PREFILL_WITH_APPRAISED_AND_SALE = {
  ...PREFILL_DATA_FULL,
  salePrice: "336900",
  appraisedAmount: "980000",
}

const PREFILL_WITH_SALE_ONLY = {
  ...PREFILL_DATA_FULL,
  salePrice: "336900",
  appraisedAmount: null,
}

const PREFILL_NO_PRICE = {
  ...PREFILL_DATA_FULL,
  salePrice: null,
  appraisedAmount: null,
}

// ─── Happy path ───────────────────────────────────────────────────────────────

test.describe("Form 6 — appraisedAmount pre-fills price amount", () => {
  test.beforeEach(makeForm6Prefill(PREFILL_WITH_APPRAISED_ONLY))

  test("appraisedAmount pre-fills price amount formatted as 980,000.00", async ({ page }) => {
    await openForm6SendDialog(page)
    await page.getByTestId("form6-tab-trigger--4").click()

    const priceAmount = page.getByTestId("form6-part4-price-amount")
    await expect(priceAmount).toBeVisible()
    await expect(priceAmount).toHaveValue("980,000.00")

    await shotFocused(page, priceAmount, SHOT_DIR, "01-appraised-amount-prefilled")
    story.addScene({
      title: "01 — Happy Path: Appraised Amount Pre-fills Price",
      images: [join(SHOT_DIR, "01-appraised-amount-prefilled.png")],
      seeing: "The Form 6 Section 3 Price '$ amount' field shows 980,000.00 — sourced from the property's Appraised Amount, not the Last Sale Price.",
      steps: [
        "Open a property's Forms tab",
        "Click Send next to Form 6",
        "Navigate to tab 4 Appointment",
        "Observe the $ amount field shows the Appraised Amount formatted as 980,000.00",
      ],
    })
  })

  test("appraisedAmount auto-ticks the List checkbox", async ({ page }) => {
    await openForm6SendDialog(page)
    await page.getByTestId("form6-tab-trigger--4").click()

    const listCheckbox = page.getByTestId("form6-part4-price-list")
    await expect(listCheckbox).toBeChecked()

    await shotFocused(page, listCheckbox, SHOT_DIR, "02-list-checkbox-checked")
    story.addScene({
      title: "02 — List Checkbox Auto-Checked",
      images: [join(SHOT_DIR, "02-list-checkbox-checked.png")],
      seeing: "The List checkbox is auto-checked because the property has an Appraised Amount set.",
      steps: [
        "Open Form 6 for a property with Appraised Amount set",
        "Navigate to tab 4 Appointment",
        "Observe the List checkbox is checked automatically",
      ],
    })
  })

  test("price amount field is editable after appraisedAmount pre-fill", async ({ page }) => {
    await openForm6SendDialog(page)
    await page.getByTestId("form6-tab-trigger--4").click()

    const priceAmount = page.getByTestId("form6-part4-price-amount")
    // Assert pre-fill value is correct first, then confirm the field accepts edits
    await expect(priceAmount).toHaveValue("980,000.00")
    await priceAmount.fill("1,200,000.00")
    await expect(priceAmount).toHaveValue("1,200,000.00")
  })
})

// ─── Priority: appraisedAmount over salePrice ─────────────────────────────────

test.describe("Form 6 — appraisedAmount takes priority over salePrice", () => {
  test.beforeEach(makeForm6Prefill(PREFILL_WITH_APPRAISED_AND_SALE))

  test("appraisedAmount takes priority over salePrice when both are set", async ({ page }) => {
    await openForm6SendDialog(page)
    await page.getByTestId("form6-tab-trigger--4").click()

    const priceAmount = page.getByTestId("form6-part4-price-amount")
    await expect(priceAmount).toHaveValue("980,000.00")

    await shotFocused(page, priceAmount, SHOT_DIR, "03-appraised-over-sale-price")
    story.addScene({
      title: "03 — Appraised Amount Wins Over Sale Price",
      images: [join(SHOT_DIR, "03-appraised-over-sale-price.png")],
      seeing: "When both Appraised Amount (980,000) and Last Sale Price (336,900) are set, the $ amount field shows 980,000.00 — the Appraised Amount wins.",
      steps: [
        "Open Form 6 for a property with both Appraised Amount ($980,000) and Last Sale Price ($336,900)",
        "Navigate to tab 4 Appointment",
        "Observe the $ amount shows 980,000.00 (appraised), not 336,900.00 (sale price)",
      ],
    })
  })
})

// ─── Edge cases ───────────────────────────────────────────────────────────────

test.describe("Form 6 — no appraisedAmount — price amount blank", () => {
  test.beforeEach(makeForm6Prefill(PREFILL_WITH_SALE_ONLY))

  test("no appraisedAmount — price amount is blank even when salePrice is set", async ({ page }) => {
    await openForm6SendDialog(page)
    await page.getByTestId("form6-tab-trigger--4").click()

    const priceAmount = page.getByTestId("form6-part4-price-amount")
    await expect(priceAmount).toHaveValue("")

    await shotFocused(page, priceAmount, SHOT_DIR, "04-no-appraised-blank")
    story.addScene({
      title: "04 — No Appraised Amount: Price Field Blank",
      images: [join(SHOT_DIR, "04-no-appraised-blank.png")],
      seeing: "When no Appraised Amount is set (even though Last Sale Price exists), the $ amount field is blank — no fallback to sale price.",
      steps: [
        "Open Form 6 for a property with no Appraised Amount but with a Last Sale Price",
        "Navigate to tab 4 Appointment",
        "Observe the $ amount field is blank",
      ],
    })
  })

  test("no appraisedAmount — List checkbox is unchecked even when salePrice is set", async ({ page }) => {
    await openForm6SendDialog(page)
    await page.getByTestId("form6-tab-trigger--4").click()

    const listCheckbox = page.getByTestId("form6-part4-price-list")
    await expect(listCheckbox).not.toBeChecked()

    await shotFocused(page, listCheckbox, SHOT_DIR, "05-no-appraised-list-unchecked")
    story.addScene({
      title: "05 — No Appraised Amount: List Checkbox Unchecked",
      images: [join(SHOT_DIR, "05-no-appraised-list-unchecked.png")],
      seeing: "When no Appraised Amount is set, the List checkbox is unchecked, even though a Last Sale Price exists.",
      steps: [
        "Open Form 6 for a property with no Appraised Amount but with a Last Sale Price",
        "Navigate to tab 4 Appointment",
        "Observe the List checkbox is unchecked",
      ],
    })
  })
})

test.describe("Form 6 — null appraisedAmount — blank and unchecked", () => {
  test.beforeEach(makeForm6Prefill(PREFILL_NO_PRICE))

  test("appraisedAmount null — price amount is blank and List unchecked", async ({ page }) => {
    await openForm6SendDialog(page)
    await page.getByTestId("form6-tab-trigger--4").click()

    const priceAmount = page.getByTestId("form6-part4-price-amount")
    const listCheckbox = page.getByTestId("form6-part4-price-list")
    await expect(priceAmount).toHaveValue("")
    await expect(listCheckbox).not.toBeChecked()
  })
})
