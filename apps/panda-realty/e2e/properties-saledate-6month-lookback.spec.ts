/**
 * Panda Realty — Last Sales Date "6 month look back" quick button
 *
 * The saleDate date-range filter (uiStyle: "date-range") renders two native
 * date inputs via the shared HintFilterRange component. This feature adds a
 * "6 month look back" button ABOVE those inputs that, on click, sets:
 *   - from = today − 6 calendar months
 *   - to   = today
 * and applies the filter (URL gains saleDate=<from>|<to>).
 *
 * Run: npm run test:e2e:scratch -- --app=panda-realty --spec=apps/panda-realty/e2e/properties-saledate-6month-lookback.spec.ts --no-bail
 *
 * Testids:
 *   admin-entity-list-hint-filter-side--saleDate                        — the Last Sales Date section
 *   admin-entity-list-date-range-quickset--saleDate--last6months        — the new button
 *   admin-entity-filter-side-panel-toggle--properties                   — desktop side panel toggle
 *   admin-entity-list-mobile-filters-bar--properties                    — mobile filters bar
 *   admin-entity-list-mobile-filters-dialog--properties                 — mobile dialog
 */

import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { expect, test } from "@playwright/test"

import { createStory, shotFocused } from "@repo/e2e-utils"

import { e2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import {
  EMPTY_LIST_RESPONSE,
  EMPTY_PROPERTY_ENTITIES_RESPONSE,
  STATUS_LIST_RESPONSE,
} from "./helpers/admin-properties-mocks"

const MOBILE_VIEWPORT = { width: 390, height: 844 }
const DESKTOP_VIEWPORT = { width: 1280, height: 900 }

const SHOT_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "screenshots",
  "saledate-6month-lookback",
)

const story = createStory({
  specUrl: import.meta.url,
  slug: "panda-realty-saledate-6month-lookback",
})

story.setWhatWasBuilt(
  "Added a '6 month look back' quick button to the Last Sales Date date-range " +
    "filter on /admin/properties. The button sits above the two date inputs " +
    "(shared HintFilterRange component) and, on click, sets the 'from' input to " +
    "today minus six calendar months and the 'to' input to today, then applies " +
    "the filter (saleDate=<from>|<to> in the URL).",
)

/** Local ISO YYYY-MM-DD (no UTC drift). Mirrors the implementation. */
function toIsoLocal(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function expectedToday(): string {
  return toIsoLocal(new Date())
}

function expectedSixMonthsAgo(): string {
  const d = new Date()
  d.setMonth(d.getMonth() - 6)
  return toIsoLocal(d)
}

async function setupMocks(page: import("@playwright/test").Page) {
  await page.route("**/api/admin/**", async (route) => {
    if (route.request().method() !== "GET") {
      await route.continue()
      return
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ options: [] }),
    })
  })
  await page.route("**/api/admin/property-entities**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(EMPTY_PROPERTY_ENTITIES_RESPONSE),
    })
  })
  await page.route("**/api/admin/property-status**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(STATUS_LIST_RESPONSE),
    })
  })
  await page.route("**/api/admin/properties**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(EMPTY_LIST_RESPONSE),
    })
  })
}

/** Expand the desktop side filter panel and return the saleDate section locator. */
async function openSideSaleDateSection(page: import("@playwright/test").Page) {
  const toggle = page.getByTestId(
    "admin-entity-filter-side-panel-toggle--properties",
  )
  await expect(toggle).toBeVisible()
  await toggle.click()
  const panel = page.getByTestId(
    "admin-entity-relation-filters-side--properties",
  )
  await expect(panel).toBeVisible()
  const section = panel.getByTestId(
    "admin-entity-list-hint-filter-side--saleDate",
  )
  await expect(section).toBeVisible()
  return section
}

test.describe("Panda Realty — Last Sales Date 6 month look back", () => {
  test.beforeEach(async ({ page }) => {
    if (!e2eAdminCredentials) {
      throw new Error("E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set in .env.local")
    }
    await mkdir(SHOT_DIR, { recursive: true })
    await page.setViewportSize(DESKTOP_VIEWPORT)
    await setupMocks(page)
    await signInAsAdmin(page)
  })

  test.afterAll(() => {
    story.write()
  })

  // ── Happy path ──────────────────────────────────────────────────────────────

  // MV-3
  test("the 6 month look back button renders above the date inputs", async ({
    page,
  }) => {
    await page.goto("/admin/properties")
    const section = await openSideSaleDateSection(page)

    const button = section.getByTestId(
      "admin-entity-list-date-range-quickset--saleDate--last6months",
    )
    await expect(button).toBeVisible()
    await expect(button).toHaveText(/6 month look back/i)

    const dateInputs = section.locator('input[type="date"]')
    await expect(dateInputs).toHaveCount(2)

    // Button must sit ABOVE (smaller y) the first date input.
    const btnBox = await button.boundingBox()
    const firstInputBox = await dateInputs.first().boundingBox()
    expect(btnBox!.y).toBeLessThan(firstInputBox!.y)

    await shotFocused(page, section, SHOT_DIR, "01-button-above-inputs")
    story.addScene({
      title: "01 — Button renders above the date inputs",
      images: [join(SHOT_DIR, "01-button-above-inputs.png")],
      seeing:
        "The Last Sales Date section shows the '6 month look back' button " +
        "positioned above the from/to date inputs.",
      steps: [
        "Open /admin/properties",
        "Expand the side filter panel",
        "Observe the Last Sales Date section",
      ],
    })
  })

  // MV-4 + MV-edge-rollover
  test("clicking sets from = today minus 6 months and to = today and applies the filter", async ({
    page,
  }) => {
    await page.goto("/admin/properties")
    const section = await openSideSaleDateSection(page)

    await shotFocused(page, section, SHOT_DIR, "02a-before-click")

    const button = section.getByTestId(
      "admin-entity-list-date-range-quickset--saleDate--last6months",
    )
    await button.click()

    const dateInputs = section.locator('input[type="date"]')
    const fromInput = dateInputs.first()
    const toInput = dateInputs.nth(1)

    const expFrom = expectedSixMonthsAgo()
    const expTo = expectedToday()

    await expect(fromInput).toHaveValue(expFrom)
    await expect(toInput).toHaveValue(expTo)

    // Filter applied → URL carries saleDate=<from>|<to>
    await expect
      .poll(() => new URL(page.url()).searchParams.get("saleDate"))
      .toBe(`${expFrom}|${expTo}`)

    await shotFocused(page, section, SHOT_DIR, "02b-after-click")
    story.addScene({
      title: "02 — Click sets the last-6-months range",
      images: [
        join(SHOT_DIR, "02a-before-click.png"),
        join(SHOT_DIR, "02b-after-click.png"),
      ],
      seeing:
        `Left: empty date inputs. Right: from=${expFrom}, to=${expTo} after ` +
        "clicking the button; the list re-queries with saleDate in the URL.",
      steps: [
        "Open the Last Sales Date section",
        "Click '6 month look back'",
        "Observe both date inputs filled and the URL updated",
      ],
    })
  })

  // ── Edge cases ──────────────────────────────────────────────────────────────

  // MV-edge-overwrite
  test("clicking overwrites a pre-existing custom range", async ({ page }) => {
    await page.goto(
      "/admin/properties?saleDate=2000-01-01%7C2001-01-01",
    )
    const section = await openSideSaleDateSection(page)

    const dateInputs = section.locator('input[type="date"]')
    // Pre-existing range is reflected in the inputs.
    await expect(dateInputs.first()).toHaveValue("2000-01-01")
    await expect(dateInputs.nth(1)).toHaveValue("2001-01-01")

    await section
      .getByTestId("admin-entity-list-date-range-quickset--saleDate--last6months")
      .click()

    await expect(dateInputs.first()).toHaveValue(expectedSixMonthsAgo())
    await expect(dateInputs.nth(1)).toHaveValue(expectedToday())
  })

  // MV-edge-mobile
  test("the button is present and works in the mobile filter dialog", async ({
    page,
  }) => {
    await page.setViewportSize(MOBILE_VIEWPORT)
    await page.goto("/admin/properties")

    const bar = page.getByTestId("admin-entity-list-mobile-filters-bar--properties")
    await expect(bar).toBeVisible()
    await bar.click()
    const dialog = page.getByTestId(
      "admin-entity-list-mobile-filters-dialog--properties",
    )
    await expect(dialog).toBeVisible()

    const section = dialog.getByTestId(
      "admin-entity-list-hint-filter-side--saleDate",
    )
    await expect(section).toBeVisible()

    const button = section.getByTestId(
      "admin-entity-list-date-range-quickset--saleDate--last6months",
    )
    await expect(button).toBeVisible()
    await button.click()

    const dateInputs = section.locator('input[type="date"]')
    await expect(dateInputs.first()).toHaveValue(expectedSixMonthsAgo())
    await expect(dateInputs.nth(1)).toHaveValue(expectedToday())
  })

  // ── Persistence ─────────────────────────────────────────────────────────────

  // MV-persist
  test("the applied range persists across a page reload", async ({ page }) => {
    await page.goto("/admin/properties")
    const section = await openSideSaleDateSection(page)

    await section
      .getByTestId("admin-entity-list-date-range-quickset--saleDate--last6months")
      .click()

    const expFrom = expectedSixMonthsAgo()
    const expTo = expectedToday()
    await expect
      .poll(() => new URL(page.url()).searchParams.get("saleDate"))
      .toBe(`${expFrom}|${expTo}`)

    await page.reload()

    expect(new URL(page.url()).searchParams.get("saleDate")).toBe(
      `${expFrom}|${expTo}`,
    )

    const reopened = await openSideSaleDateSection(page)
    const dateInputs = reopened.locator('input[type="date"]')
    await expect(dateInputs.first()).toHaveValue(expFrom)
    await expect(dateInputs.nth(1)).toHaveValue(expTo)
  })
})
