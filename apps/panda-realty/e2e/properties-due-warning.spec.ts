// Run: npm run test:e2e:scratch -- --app=panda-realty --spec="apps/panda-realty/e2e/properties-due-warning.spec.ts" --no-bail
//
// Properties list — three-tier "due" indicator (gold / red / green), the passive warning tiers.
// A property under contract carries a passive tick on its next condition:
//   • RED  (dueWarningTier="soon")     — the next condition is within 3 days.
//   • GOLD (dueWarningTier="upcoming") — the next condition is more than 3 days out (uncapped).
// Both are passive (NO clear button) and do NOT tint the row. The tick carries the countdown label
// (e.g. "Finance, due in 2 days" / "Settlement, due in 34 days") and exposes data-due-warning-tier
// so the colour can be asserted. Green always wins: a due/overdue row shows the green clear tick and
// no warning tick.

import { expect, test } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { createStory, shotFocused } from "@repo/e2e-utils"

import { refreshPandaE2eEnv, requirePandaE2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import { makePropertiesListResponse, STATUS_LIST_RESPONSE } from "./helpers/admin-properties-mocks"

const SHOT_DIR = join(dirname(fileURLToPath(import.meta.url)), "screenshots", "properties-due-warning")

const story = createStory({ specUrl: import.meta.url, slug: "panda-properties-due-warning" })
story.setWhatWasBuilt(
  "Three-tier due indicator on the Panda Realty properties list, shown as a passive tick in the " +
    "actions column instead of a row tint. The tick is RED when the next condition is within 3 days " +
    "(dueWarningTier=soon) and GOLD when it is more than 3 days out (dueWarningTier=upcoming, uncapped " +
    "so every under-contract property carries it). Both tiers are passive (no clear button) and do " +
    "not tint the row; the tick carries the countdown label and exposes data-due-warning-tier. Green " +
    "takes precedence: a due/overdue row shows the green clear tick and no warning tick.",
)

const SOON_LABEL = "Finance, due in 2 days"
const UPCOMING_LABEL = "Settlement, due in 34 days"

// Within 3 days, nothing due yet → RED tick, passive, no clear button, no row tint.
const SOON_OVERRIDES = {
  propertyListId: 1001,
  streetAddress: "30 SILVEREYE AVENUE",
  isFavorite: true,
  dueHighlightActive: false,
  dueHighlightLabels: [],
  dueWarningActive: true,
  dueWarningTier: "soon",
  dueWarningLabels: [SOON_LABEL],
}

// More than 3 days out → GOLD tick, passive, no clear button, no row tint.
const UPCOMING_OVERRIDES = {
  propertyListId: 1001,
  streetAddress: "12 OAK COURT",
  isFavorite: true,
  dueHighlightActive: false,
  dueHighlightLabels: [],
  dueWarningActive: true,
  dueWarningTier: "upcoming",
  dueWarningLabels: [UPCOMING_LABEL],
}

// Due/overdue AND a later date within 3 days → green wins, warning suppressed server-side.
const GREEN_WINS_OVERRIDES = {
  propertyListId: 1001,
  streetAddress: "80 HOLLYWOOD AVENUE",
  isFavorite: true,
  dueHighlightActive: true,
  dueHighlightLabels: ["Finance overdue"],
  dueWarningActive: false,
  dueWarningLabels: [],
}

test.describe("Properties — three-tier due tick (gold/red/green)", () => {
  test.beforeEach(async ({ page }) => {
    refreshPandaE2eEnv()
    requirePandaE2eAdminCredentials()
    await page.setViewportSize({ width: 1440, height: 900 })
    await mkdir(SHOT_DIR, { recursive: true })
    await page.route("**/api/admin/property-status**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(STATUS_LIST_RESPONSE),
      })
    })
    await signInAsAdmin(page)
  })

  test.afterAll(() => {
    story.write()
  })

  test("red tick: next condition within 3 days shows a passive red tick with countdown and no clear button", async ({ page }) => {
    await page.route("**/api/admin/properties**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(makePropertiesListResponse(SOON_OVERRIDES)),
      })
    })
    await page.goto("/admin/properties")

    const row = page.getByTestId("admin-entity-row--properties--1001")
    await expect(row).toBeVisible({ timeout: 15_000 })

    // Row is NOT tinted — the warning lives in the actions column.
    await expect(row).not.toHaveClass(/bg-amber-100/)
    await expect(row).not.toHaveClass(/bg-green-100/)

    // Red tick present (tier=soon), carrying the countdown label.
    // The list renders the actions twice (desktop row + quick-card), so scope to the first match.
    const tick = page.getByTestId("property-due-warning--1001").first()
    await expect(tick).toBeVisible()
    await expect(tick).toHaveAttribute("aria-label", SOON_LABEL)
    await expect(tick).toHaveAttribute("data-due-warning-tier", "soon")
    await expect(tick).toHaveClass(/text-red-/)

    // Passive: no clear button on a warning row.
    await expect(page.getByTestId("property-due-highlight-clear--1001")).toHaveCount(0)

    await shotFocused(page, row, SHOT_DIR, "01-red-soon-tick")
    story.addScene({
      title: "01 — Red tick: next condition within 3 days",
      images: [join(SHOT_DIR, "01-red-soon-tick.png")],
      seeing:
        "The 30 Silvereye Avenue row is not tinted; a small RED tick sits at the start of the actions " +
        "column because its next condition falls due within 3 days. The tick carries the countdown " +
        "label (Finance, due in 2 days) and there is no clear button — the warning is passive.",
      steps: [
        "Sign in as admin",
        "Open /admin/properties with a property whose dueWarningTier=soon",
        "Observe the untinted row, the red tick with its countdown label, and no clear button",
      ],
    })
  })

  test("gold tick: next condition more than 3 days out shows a passive gold tick (uncapped)", async ({ page }) => {
    await page.route("**/api/admin/properties**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(makePropertiesListResponse(UPCOMING_OVERRIDES)),
      })
    })
    await page.goto("/admin/properties")

    const row = page.getByTestId("admin-entity-row--properties--1001")
    await expect(row).toBeVisible({ timeout: 15_000 })

    await expect(row).not.toHaveClass(/bg-amber-100/)
    await expect(row).not.toHaveClass(/bg-green-100/)

    // Gold tick present (tier=upcoming), carrying the far-out countdown label.
    const tick = page.getByTestId("property-due-warning--1001").first()
    await expect(tick).toBeVisible()
    await expect(tick).toHaveAttribute("aria-label", UPCOMING_LABEL)
    await expect(tick).toHaveAttribute("data-due-warning-tier", "upcoming")
    await expect(tick).toHaveClass(/text-amber-/)

    await expect(page.getByTestId("property-due-highlight-clear--1001")).toHaveCount(0)

    await shotFocused(page, row, SHOT_DIR, "02-gold-upcoming-tick")
    story.addScene({
      title: "02 — Gold tick: next condition more than 3 days out",
      images: [join(SHOT_DIR, "02-gold-upcoming-tick.png")],
      seeing:
        "The 12 Oak Court row is not tinted; a small GOLD tick sits in the actions column because its " +
        "next condition is more than 3 days out. With the 3-day cap removed, every under-contract " +
        "property carries this gold heads-up. The tick reads Settlement, due in 34 days, and there is " +
        "no clear button.",
      steps: [
        "Open /admin/properties with a property whose dueWarningTier=upcoming",
        "Observe the untinted row, the gold tick with its long countdown, and no clear button",
      ],
    })
  })

  test("green takes precedence: due or overdue shows the green tick and no yellow tick", async ({ page }) => {
    await page.route("**/api/admin/properties**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(makePropertiesListResponse(GREEN_WINS_OVERRIDES)),
      })
    })
    await page.goto("/admin/properties")

    const row = page.getByTestId("admin-entity-row--properties--1001")
    await expect(row).toBeVisible({ timeout: 15_000 })

    // Green wins: green tint + clear button present, yellow tick absent.
    await expect(row).toHaveClass(/bg-green-100/)
    await expect(page.getByTestId("property-due-highlight-clear--1001").first()).toBeVisible()
    await expect(page.getByTestId("property-due-warning--1001")).toHaveCount(0)

    await shotFocused(page, row, SHOT_DIR, "03-green-wins")
    story.addScene({
      title: "03 — Green precedence: due/overdue shows the green tick only",
      images: [join(SHOT_DIR, "03-green-wins.png")],
      seeing:
        "The 80 Hollywood Avenue row is due/overdue, so it renders green with its clear tick — the " +
        "yellow warning tick is suppressed. A property shows exactly one tick at a time.",
      steps: [
        "Open /admin/properties with a due/overdue property (dueHighlightActive=true)",
        "Observe the green tint, the green clear tick, and the absence of the yellow tick",
      ],
    })
  })
})
