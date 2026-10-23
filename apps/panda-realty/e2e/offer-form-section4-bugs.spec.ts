/**
 * E2E: Offer Form Section 4 — Radio Button Visual Selection + Settlement Pre-fill Bugs
 *
 * Run: npm run test:e2e:scratch -- --app=panda-realty --spec="apps/panda-realty/e2e/offer-form-section4-bugs.spec.ts" --no-bail
 *
 * Bug 1: Radio inputs in Section 4 lacked accent-slate-900 class, causing Chrome to use
 *        color (near-black) as fallback accent-color, making selected/unselected states look identical.
 * Bug 2: Pre-filled settlementPeriod from a draft save did not auto-populate the calendar
 *        date on load because useSettlementState only recalculates on onChange, not on mount.
 */

import { expect, test } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { createStory, shotFocused } from "@repo/e2e-utils"

import { mockOfferFormGet, OFFER_FORM_PREFILL } from "./offer-form-helpers"

const SHOT_DIR = join(dirname(fileURLToPath(import.meta.url)), "screenshots", "section4-bugs")

function daysFromToday(target: Date): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 3600 * 24))
}

const story = createStory({ specUrl: import.meta.url, slug: "section4-bugs" })

story.setWhatWasBuilt(
  "Fixed two bugs in offer form Section 4: (1) added accent-slate-900 class to all radio inputs " +
    "in the outer groups so Chrome renders a visually distinct checked/unchecked state; " +
    "(2) added a mount-time useEffect in useSettlementState that calls handleSettlementPeriodChange " +
    "when initial.settlementPeriod is set but initial.settlementDate is empty, so pre-filled periods " +
    "from draft saves auto-populate the calendar date on load.",
)

test.beforeEach(async () => {
  await mkdir(SHOT_DIR, { recursive: true })
})

// ── Bug 1 — Radio buttons visual selection (accent-slate-900 class) ───────────

test.describe("Bug 1 — Radio inputs have accent-slate-900 class", () => {
  test("cooling-off radio inputs have accent-slate-900 class", async ({ page }) => {
    await mockOfferFormGet(page)
    await page.goto("/offer-form/abc123token")

    const coolingOffNo = page.getByTestId("offer-form-cooling-off-no")
    await expect(coolingOffNo).toBeVisible({ timeout: 15_000 })
    await shotFocused(page, coolingOffNo, SHOT_DIR, "01a-cooling-off-default")

    await expect(page.getByTestId("offer-form-cooling-off-yes")).toHaveClass(/accent-slate-900/)
    await expect(coolingOffNo).toHaveClass(/accent-slate-900/)

    story.addScene({
      title: "01a — Cooling Off radio inputs",
      images: [join(SHOT_DIR, "01a-cooling-off-default.png")],
      seeing:
        "Cooling-off radio group on default load — both inputs carry accent-slate-900 so the selected state renders with a dark, clearly visible filled circle.",
      steps: ["Load the offer form", "Observe cooling-off radio group", "Verify accent class is present"],
    })
  })

  test("cash buyer radio inputs have accent-slate-900 class", async ({ page }) => {
    await mockOfferFormGet(page)
    await page.goto("/offer-form/abc123token")

    const cashBuyerNo = page.getByTestId("offer-form-cash-buyer-no")
    await expect(cashBuyerNo).toBeVisible({ timeout: 15_000 })
    await shotFocused(page, cashBuyerNo, SHOT_DIR, "01b-cash-buyer-default")

    await expect(page.getByTestId("offer-form-cash-buyer-yes")).toHaveClass(/accent-slate-900/)
    await expect(cashBuyerNo).toHaveClass(/accent-slate-900/)

    story.addScene({
      title: "01b — Cash Buyer radio inputs",
      images: [join(SHOT_DIR, "01b-cash-buyer-default.png")],
      seeing: "Cash buyer radio group — both inputs carry accent-slate-900 for clear visual selection.",
      steps: ["Load the offer form", "Observe cash buyer radio group", "Verify accent class is present"],
    })
  })

  test("building pest radio inputs have accent-slate-900 class", async ({ page }) => {
    await mockOfferFormGet(page)
    await page.goto("/offer-form/abc123token")

    const buildingPestNo = page.getByTestId("offer-form-building-pest-no")
    await expect(buildingPestNo).toBeVisible({ timeout: 15_000 })
    await shotFocused(page, buildingPestNo, SHOT_DIR, "01c-building-pest-default")

    await expect(page.getByTestId("offer-form-building-pest-yes")).toHaveClass(/accent-slate-900/)
    await expect(buildingPestNo).toHaveClass(/accent-slate-900/)

    story.addScene({
      title: "01c — Building Pest radio inputs",
      images: [join(SHOT_DIR, "01c-building-pest-default.png")],
      seeing: "Building pest radio group — both inputs carry accent-slate-900 for clear visual selection.",
      steps: ["Load the offer form", "Observe building pest radio group", "Verify accent class is present"],
    })
  })
})

// ── Bug 2 — Settlement date auto-populates from pre-filled period ─────────────

test.describe("Bug 2 — Settlement date auto-populates from pre-filled period on load", () => {
  test("pre-filled period landing on a weekday auto-populates calendar date on load", async ({ page }) => {
    // Use known Monday 2026-08-03 so the target date is always a weekday
    const days = daysFromToday(new Date(2026, 7, 3))

    await page.route("**/api/offer-form/abc123token**", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ...OFFER_FORM_PREFILL, settlementPeriod: String(days) }),
        })
        return
      }
      await route.fallback()
    })

    await page.goto("/offer-form/abc123token")

    const dateInput = page.getByTestId("offer-form-settlement-date-input")
    await expect(dateInput).toBeVisible({ timeout: 15_000 })
    await shotFocused(page, dateInput, SHOT_DIR, "02a-settlement-prefill-weekday-load")

    // Before fix: date is empty (bug). After fix: date auto-fills to 2026-08-03.
    await expect(dateInput).toHaveValue("2026-08-03")
    await expect(page.getByTestId("offer-form-settlement-note")).toContainText("Settlement date lands on a")
    await expect(page.getByTestId("offer-form-settlement-note")).toContainText("Monday")

    story.addScene({
      title: "02a — Settlement: Pre-filled weekday period auto-populates date on load",
      images: [join(SHOT_DIR, "02a-settlement-prefill-weekday-load.png")],
      seeing:
        "Form loaded with pre-filled settlement period (N days to Monday 2026-08-03) but no saved date — " +
        "calendar date auto-fills to 2026-08-03 and note shows day-of-week.",
      steps: [
        "Load form with settlementPeriod pre-filled (N days to Monday 2026-08-03), settlementDate absent",
        "Observe calendar date auto-fills to 2026-08-03",
        "Observe note reads Settlement date lands on a Monday",
      ],
    })
  })

  test("pre-filled period landing on a weekend shows error note on load", async ({ page }) => {
    // Use known Saturday 2026-08-01 so the weekend check fires on mount
    const days = daysFromToday(new Date(2026, 7, 1))

    await page.route("**/api/offer-form/abc123token**", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ...OFFER_FORM_PREFILL, settlementPeriod: String(days) }),
        })
        return
      }
      await route.fallback()
    })

    await page.goto("/offer-form/abc123token")

    const settlementNote = page.getByTestId("offer-form-settlement-note")
    await expect(settlementNote).toBeVisible({ timeout: 15_000 })
    await shotFocused(page, settlementNote, SHOT_DIR, "02b-settlement-prefill-weekend-load")

    // Before fix: shows default helper text (bug). After fix: shows weekend error.
    await expect(settlementNote).toContainText("Settlement cannot fall on a weekend")
    await expect(page.getByTestId("offer-form-settlement-date-input")).toHaveValue("")

    story.addScene({
      title: "02b — Settlement: Pre-filled weekend period shows error note on load",
      images: [join(SHOT_DIR, "02b-settlement-prefill-weekend-load.png")],
      seeing:
        "Form loaded with pre-filled settlement period landing on Saturday — shows weekend error note and " +
        "keeps calendar date empty (no invalid date is populated).",
      steps: [
        "Load form with settlementPeriod pre-filled (N days to Saturday 2026-08-01), settlementDate absent",
        "Observe note reads Settlement cannot fall on a weekend",
        "Observe calendar date is empty",
      ],
    })
  })

  test.afterAll(() => {
    story.write()
  })
})
