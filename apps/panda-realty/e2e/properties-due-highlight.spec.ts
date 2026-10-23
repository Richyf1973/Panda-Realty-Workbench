// Run: npm run test:e2e:scratch -- --app=panda-realty --spec="apps/panda-realty/e2e/properties-due-highlight.spec.ts" --no-bail
//
// Properties list — green "due today / overdue" row highlight.
// A property whose list payload has dueHighlightActive=true renders a green-tinted row,
// a clear button, and the triggering date labels (for the tooltip). An inactive row has none.

import { expect, test } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { createStory, shotFocused } from "@repo/e2e-utils"

import { refreshPandaE2eEnv, requirePandaE2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import { makePropertiesListResponse, STATUS_LIST_RESPONSE } from "./helpers/admin-properties-mocks"

const SHOT_DIR = join(dirname(fileURLToPath(import.meta.url)), "screenshots", "properties-due-highlight")

const story = createStory({ specUrl: import.meta.url, slug: "panda-properties-due-highlight" })
story.setWhatWasBuilt(
  "Green due-today/overdue highlight on the Panda Realty properties list. A row whose list " +
    "payload reports dueHighlightActive=true is tinted green (bg-green-100), shows a per-row clear " +
    "button (property-due-highlight-clear--<id>), and exposes the triggering date labels for a tooltip. " +
    "Rows that are not due/overdue (or have been cleared) render normally with no clear button.",
)

const LABELS = ["Finance overdue", "Settlement due today"]

const ACTIVE_OVERRIDES = {
  propertyListId: 1001,
  streetAddress: "80 HOLLYWOOD AVENUE",
  isFavorite: true,
  dueHighlightActive: true,
  dueHighlightLabels: LABELS,
}

// A no-contract property (82 Hollywood Avenue, the row Richard reported): even with a stale
// imported settlement_date, the server gate resolves it to dueHighlightActive=false, so the row
// renders plain with no clear button. See specs/panda-realty-due-highlight-requires-contract.md.
const INACTIVE_OVERRIDES = {
  propertyListId: 1001,
  streetAddress: "82 HOLLYWOOD AVENUE",
  isFavorite: true,
  dueHighlightActive: false,
  dueHighlightLabels: [],
}

test.describe("Properties — due-date green row highlight", () => {
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

  test("active row is tinted green with a clear button and triggering labels", async ({ page }) => {
    await page.route("**/api/admin/properties**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(makePropertiesListResponse(ACTIVE_OVERRIDES)),
      })
    })
    await page.goto("/admin/properties")

    const row = page.getByTestId("admin-entity-row--properties--1001")
    await expect(row).toBeVisible({ timeout: 15_000 })

    // Whole row tinted green.
    await expect(row).toHaveClass(/bg-green-100/)

    // Per-row clear button present. (Row actions render a desktop + mobile copy; assert the
    // visible desktop one via .first(), matching the convention in the other properties specs.)
    const clear = page.getByTestId("property-due-highlight-clear--1001").first()
    await expect(clear).toBeVisible()

    // Triggering date labels exposed (drives the tooltip text).
    await expect(row).toHaveAttribute("data-row-highlight-labels", LABELS.join(", "))

    await shotFocused(page, row, SHOT_DIR, "01-active-row-green")
    story.addScene({
      title: "01 — Active row: tinted green with clear button",
      images: [join(SHOT_DIR, "01-active-row-green.png")],
      seeing:
        "The 80 Hollywood Avenue row is tinted green because a critical date is due/overdue. " +
        "A clear (✕) button sits in the row, and the triggering dates (Finance overdue, Settlement due today) " +
        "are available for the tooltip.",
      steps: [
        "Sign in as admin",
        "Open /admin/properties with a property whose dueHighlightActive=true",
        "Observe the green row and its clear button",
      ],
    })
  })

  test("clicking clear posts to the clear route and the row de-tints", async ({ page }) => {
    let cleared = false
    let clearPosted = false

    // Specific clear route registered LAST so it wins LIFO for its sub-path.
    await page.route("**/api/admin/properties**", async (route) => {
      // Let the clear sub-path fall through to its dedicated handler.
      if (route.request().url().includes("due-highlight-clear")) {
        await route.fallback()
        return
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          makePropertiesListResponse(cleared ? INACTIVE_OVERRIDES : ACTIVE_OVERRIDES),
        ),
      })
    })
    await page.route("**/api/admin/properties/1001/due-highlight-clear", async (route) => {
      clearPosted = true
      cleared = true
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) })
    })

    await page.goto("/admin/properties")
    const row = page.getByTestId("admin-entity-row--properties--1001")
    await expect(row).toHaveClass(/bg-green-100/)

    await shotFocused(page, row, SHOT_DIR, "03a-before-clear")

    await page.getByTestId("property-due-highlight-clear--1001").first().click()

    // POST fired and the row de-tints after the list refetches.
    await expect.poll(() => clearPosted).toBe(true)
    await expect(row).not.toHaveClass(/bg-green-100/)
    await expect(page.getByTestId("property-due-highlight-clear--1001")).toHaveCount(0)

    await shotFocused(page, row, SHOT_DIR, "03b-after-clear")
    story.addScene({
      title: "03 — Clear: row de-tints after POST",
      images: [join(SHOT_DIR, "03a-before-clear.png"), join(SHOT_DIR, "03b-after-clear.png")],
      seeing:
        "Left: green row with clear button. Right: after clicking clear, the POST fires, the list " +
        "refetches with dueHighlightActive=false, and the row returns to normal with no clear button.",
      steps: [
        "Open /admin/properties with a due/overdue property",
        "Click the clear button",
        "Observe the clear POST and the row de-tinting",
      ],
    })
  })

  test("no-contract row is not tinted and shows no clear button", async ({ page }) => {
    await page.route("**/api/admin/properties**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(makePropertiesListResponse(INACTIVE_OVERRIDES)),
      })
    })
    await page.goto("/admin/properties")

    const row = page.getByTestId("admin-entity-row--properties--1001")
    await expect(row).toBeVisible({ timeout: 15_000 })

    await expect(row).not.toHaveClass(/bg-green-100/)
    await expect(page.getByTestId("property-due-highlight-clear--1001")).toHaveCount(0)

    await shotFocused(page, row, SHOT_DIR, "02-inactive-row-plain")
    story.addScene({
      title: "02 — No-contract row: plain, no marker",
      images: [join(SHOT_DIR, "02-inactive-row-plain.png")],
      seeing:
        "82 Hollywood Avenue has no contract (only a stale imported settlement date). The server " +
        "gate resolves it to dueHighlightActive=false, so the row renders normally — no green tint, " +
        "no clear button. This is the fix Richard reported: no contract means no marker.",
      steps: [
        "Open /admin/properties with a no-contract property (dueHighlightActive=false)",
        "Observe the row is not tinted and has no clear button",
      ],
    })
  })
})
