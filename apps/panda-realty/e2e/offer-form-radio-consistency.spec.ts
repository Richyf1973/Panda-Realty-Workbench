// Run: npm run test:e2e:scratch -- --app=panda-realty --spec=apps/panda-realty/e2e/offer-form-radio-consistency.spec.ts --no-bail

import { expect, test } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { createStory, shotFocused } from "@repo/e2e-utils"

import { OFFER_FORM_PREFILL } from "./offer-form-helpers"

const SHOT_DIR = join(dirname(fileURLToPath(import.meta.url)), "screenshots", "offer-form-radio-consistency")
const MOCK_TOKEN = "abc123token"

const story = createStory({ specUrl: import.meta.url, slug: "offer-form-radio-consistency" })

story.setWhatWasBuilt(
  "Fixed radio button styling inconsistencies in the panda-realty offer form. " +
  "Added missing disabled={viewMode} to buildingPestDays and suggestBuildingCompanies sub-panel radios " +
  "(offer-form-section4-terms.tsx). Added w-4 h-4 size and cursor-pointer to the OfferRadio component " +
  "(offer-form-shared.tsx). Replaced inline simultaneousSettlement radios with OfferRadio for consistent " +
  "accent-slate-900 styling (offer-form-sale-section.tsx).",
)

// ── Mock prefills ──────────────────────────────────────────────────────────────

const PREFILL_BPEST_VIEWMODE = {
  ...OFFER_FORM_PREFILL,
  buildingPestDays: 7,
  suggestBuildingCompanies: true,
  viewMode: true,
}

const PREFILL_BPEST_EDITABLE = {
  ...OFFER_FORM_PREFILL,
  buildingPestDays: 7,
  suggestBuildingCompanies: true,
  viewMode: false,
}

const PREFILL_WITH_SALE = {
  ...OFFER_FORM_PREFILL,
  isSubjectToSale: true,
  subjectToSaleAddress: "123 Test Street, QLD 4000",
  viewMode: false,
}

test.beforeEach(async () => {
  await mkdir(SHOT_DIR, { recursive: true })
})

test.afterAll(() => {
  story.write()
})

// ── SF1: Sub-panel radios disabled in view mode ────────────────────────────────

test("SF1 — building pest sub-panel radios are all disabled in view mode", async ({ page }) => {
  await page.route(`**/api/offer-form/${MOCK_TOKEN}**`, async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(PREFILL_BPEST_VIEWMODE) })
  })
  await page.goto(`/offer-form/${MOCK_TOKEN}?view=1`)
  await page.waitForLoadState("domcontentloaded")

  const bpestQuestion = page.getByTestId("offer-form-building-pest-question")
  await expect(bpestQuestion).toBeVisible({ timeout: 10_000 })
  const subPanel = page.getByTestId("offer-form-building-pest-subpanel")
  await expect(subPanel).toBeVisible({ timeout: 8_000 })

  await expect(page.getByTestId("offer-form-building-pest-7days")).toBeDisabled()
  await expect(page.getByTestId("offer-form-building-pest-14days")).toBeDisabled()
  await expect(page.getByTestId("offer-form-suggest-building-companies-yes")).toBeDisabled()
  await expect(page.getByTestId("offer-form-suggest-building-companies-no")).toBeDisabled()

  await shotFocused(page, subPanel, SHOT_DIR, "01-subpanel-disabled-viewmode")
  story.addScene({
    title: "01 — Sub-panel Radios: All Disabled in View Mode",
    images: [join(SHOT_DIR, "01-subpanel-disabled-viewmode.png")],
    seeing:
      "Building pest sub-panel showing 7/14 calendar days and suggest-companies radios — " +
      "all four are disabled (dimmed) matching the outer building pest Yes/No radios above.",
    steps: [
      "Open offer form with buildingPestDays=7 and viewMode=true",
      "Observe the building pest sub-panel is visible (prefilled with 7 days)",
      "Verify all four sub-panel radio inputs carry the disabled attribute",
    ],
  })
})

// ── SF2: simultaneousSettlement radios use accent-slate-900 ───────────────────

test("SF2 — simultaneousSettlement radio inputs carry the accent-slate-900 class", async ({ page }) => {
  await page.route(`**/api/offer-form/${MOCK_TOKEN}**`, async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(PREFILL_WITH_SALE) })
  })
  await page.goto(`/offer-form/${MOCK_TOKEN}`)
  await page.waitForLoadState("domcontentloaded")

  const settlementPanel = page.getByTestId("offer-form-simultaneous-settlement-panel")
  await expect(settlementPanel).toBeVisible({ timeout: 10_000 })

  const yesRadio = page.getByTestId("offer-form-simultaneous-settlement-yes")
  const noRadio = page.getByTestId("offer-form-simultaneous-settlement-no")
  await expect(yesRadio).toBeVisible()
  await expect(noRadio).toBeVisible()

  await expect(yesRadio).toHaveClass(/accent-slate-900/)
  await expect(noRadio).toHaveClass(/accent-slate-900/)

  await shotFocused(page, settlementPanel, SHOT_DIR, "02-simultaneous-settlement-accent")
  story.addScene({
    title: "02 — Simultaneous Settlement Radios: Consistent accent-slate-900",
    images: [join(SHOT_DIR, "02-simultaneous-settlement-accent.png")],
    seeing:
      "The simultaneous settlement Yes/No radios inside the sale sub-panel. " +
      "Both inputs carry accent-slate-900, matching all other offer form radios.",
    steps: [
      "Open offer form with isSubjectToSale=true",
      "Scroll to the simultaneous settlement panel",
      "Verify both radio inputs have accent-slate-900 in their class attribute",
    ],
  })
})

// ── SF3: OfferRadio inputs have w-4 h-4 ──────────────────────────────────────

test("SF3 — OfferRadio inputs carry the w-4 h-4 size classes", async ({ page }) => {
  await page.route(`**/api/offer-form/${MOCK_TOKEN}**`, async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(OFFER_FORM_PREFILL) })
  })
  await page.goto(`/offer-form/${MOCK_TOKEN}`)
  await page.waitForLoadState("domcontentloaded")

  await expect(page.getByTestId("offer-form-building-pest-question")).toBeVisible({ timeout: 10_000 })

  const radiosToCheck = [
    "offer-form-building-pest-yes",
    "offer-form-building-pest-no",
    "offer-form-cooling-off-yes",
    "offer-form-cooling-off-no",
    "offer-form-cash-buyer-yes",
    "offer-form-cash-buyer-no",
  ]

  for (const testId of radiosToCheck) {
    const radio = page.getByTestId(testId)
    await expect(radio).toBeVisible()
    await expect(radio).toHaveClass(/w-4/)
    await expect(radio).toHaveClass(/h-4/)
  }

  const bpestQuestion = page.getByTestId("offer-form-building-pest-question")
  await shotFocused(page, bpestQuestion, SHOT_DIR, "03-radio-size-classes")
  story.addScene({
    title: "03 — Offer Radio Inputs: Consistent w-4 h-4 Size",
    images: [join(SHOT_DIR, "03-radio-size-classes.png")],
    seeing: "Building pest question radios — all inputs are the same explicit 16px size.",
    steps: [
      "Open offer form",
      "Verify cooling-off, cash buyer, and building pest radio inputs all have w-4 h-4 class",
    ],
  })
})

// ── SF4: OfferRadio labels have cursor-pointer ────────────────────────────────

test("SF4 — OfferRadio labels carry cursor-pointer", async ({ page }) => {
  await page.route(`**/api/offer-form/${MOCK_TOKEN}**`, async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(OFFER_FORM_PREFILL) })
  })
  await page.goto(`/offer-form/${MOCK_TOKEN}`)
  await page.waitForLoadState("domcontentloaded")

  await expect(page.getByTestId("offer-form-building-pest-question")).toBeVisible({ timeout: 10_000 })

  const radiosToCheck = [
    "offer-form-building-pest-yes",
    "offer-form-building-pest-no",
    "offer-form-cash-buyer-yes",
    "offer-form-cash-buyer-no",
  ]

  for (const testId of radiosToCheck) {
    const label = page.getByTestId(testId).locator("xpath=..")
    await expect(label).toHaveClass(/cursor-pointer/)
  }

  const bpestQuestion = page.getByTestId("offer-form-building-pest-question")
  await shotFocused(page, bpestQuestion, SHOT_DIR, "04-radio-label-cursor")
  story.addScene({
    title: "04 — OfferRadio Labels: cursor-pointer Applied",
    images: [join(SHOT_DIR, "04-radio-label-cursor.png")],
    seeing: "Building pest question with cursor-pointer labels — hovering shows a pointer cursor on all radio labels.",
    steps: [
      "Open offer form",
      "Verify the wrapping label elements for key radios contain cursor-pointer in their class",
    ],
  })
})

// ── Edge case: sub-panel radios are interactive when viewMode is false ─────────

test("Edge — sub-panel radios are interactive (not disabled) in editable mode", async ({ page }) => {
  await page.route(`**/api/offer-form/${MOCK_TOKEN}**`, async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(PREFILL_BPEST_EDITABLE) })
  })
  await page.goto(`/offer-form/${MOCK_TOKEN}`)
  await page.waitForLoadState("domcontentloaded")

  const subPanel = page.getByTestId("offer-form-building-pest-subpanel")
  await expect(subPanel).toBeVisible({ timeout: 8_000 })

  await expect(page.getByTestId("offer-form-building-pest-7days")).toBeEnabled()
  await expect(page.getByTestId("offer-form-building-pest-14days")).toBeEnabled()
  await expect(page.getByTestId("offer-form-suggest-building-companies-yes")).toBeEnabled()
  await expect(page.getByTestId("offer-form-suggest-building-companies-no")).toBeEnabled()

  // Can switch days
  await page.getByTestId("offer-form-building-pest-14days").click()
  await expect(page.getByTestId("offer-form-building-pest-14days")).toBeChecked()

  await shotFocused(page, subPanel, SHOT_DIR, "05-subpanel-enabled-editable")
  story.addScene({
    title: "05 — Sub-panel Radios: Interactive in Editable Mode",
    images: [join(SHOT_DIR, "05-subpanel-enabled-editable.png")],
    seeing:
      "Building pest sub-panel in editable mode — radios are enabled and 14 Calendar Days is selected after clicking.",
    steps: [
      "Open offer form with buildingPestDays=7 and viewMode=false",
      "Verify sub-panel radios are enabled",
      "Click 14 Calendar Days and verify it becomes checked",
    ],
  })
})
