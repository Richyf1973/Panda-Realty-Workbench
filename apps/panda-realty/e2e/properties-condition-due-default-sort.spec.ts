// Run: npm run test:e2e:scratch -- --app=panda-realty --spec="apps/panda-realty/e2e/properties-condition-due-default-sort.spec.ts" --no-bail
//
// Properties list — default order by next condition due (ascending), no-condition properties below
// alphabetically. The ORDER itself is produced server-side (DB ORDER BY next_condition_due ASC,
// street_address ASC) and is unit-tested in lib/admin/next-condition-due.test.ts +
// lib/admin/entities/pandaProperties-default-sort.test.ts. This spec is the VISUAL confirmation:
// given the server-ordered payload, the list renders the rows top-to-bottom in that order, with
// every "live condition" row (green/red/gold tick) above every no-condition row. It also documents
// the override/reset contract: clicking a column header overrides the default for the session, and
// a fresh visit (clean URL, no sortKey) resets to the condition-due default.

import { expect, test } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { createStory, shotFocused } from "@repo/e2e-utils"

import { refreshPandaE2eEnv, requirePandaE2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import { SINGLE_PROPERTY_RESPONSE, STATUS_LIST_RESPONSE } from "./helpers/admin-properties-mocks"

const SHOT_DIR = join(dirname(fileURLToPath(import.meta.url)), "screenshots", "properties-condition-due-default-sort")

const story = createStory({ specUrl: import.meta.url, slug: "panda-properties-condition-due-default-sort" })
story.setWhatWasBuilt(
  "The Panda Realty properties list now defaults to ordering by the next condition due, ascending: " +
    "properties under contract with a live condition sit on top (overdue/due-today first, then " +
    "within-3-days, then further-out by date), and properties with no live condition fall below in " +
    "alphabetical street order. The ordering is materialised as a next_condition_due column on " +
    "panda_properties (the earliest uncleared candidate date), recomputed on offer/contract edits and " +
    "tick clear/unclear, and used as the list's default ORDER BY. Clicking a column header overrides " +
    "the order for the session; a fresh visit resets to this condition-due default.",
)

// Rows pre-ordered as the server would return them under the default ORDER BY.
const ORDERED_ROWS: Array<Record<string, unknown>> = [
  {
    propertyListId: 2001,
    streetAddress: "180 AMY STREET",
    isFavorite: true,
    dueHighlightActive: true,
    dueHighlightLabels: ["Settlement, due today"],
    dueWarningActive: false,
    dueWarningLabels: [],
    dueWarningTier: null,
  },
  {
    propertyListId: 2002,
    streetAddress: "184 AMY STREET",
    isFavorite: true,
    dueHighlightActive: false,
    dueHighlightLabels: [],
    dueWarningActive: true,
    dueWarningTier: "soon",
    dueWarningLabels: ["Finance, due in 2 days"],
  },
  {
    propertyListId: 2003,
    streetAddress: "12 TORRENS ROAD",
    isFavorite: true,
    dueHighlightActive: false,
    dueHighlightLabels: [],
    dueWarningActive: true,
    dueWarningTier: "upcoming",
    dueWarningLabels: ["Building & Pest, due in 14 days"],
  },
  {
    propertyListId: 2004,
    streetAddress: "80 HOLLYWOOD AVENUE",
    isFavorite: true,
    dueHighlightActive: false,
    dueHighlightLabels: [],
    dueWarningActive: true,
    dueWarningTier: "upcoming",
    dueWarningLabels: ["Settlement, due in 34 days"],
  },
  {
    propertyListId: 2005,
    streetAddress: "195 AMY STREET",
    isFavorite: true,
    dueHighlightActive: false,
    dueHighlightLabels: [],
    dueWarningActive: false,
    dueWarningLabels: [],
    dueWarningTier: null,
  },
  {
    propertyListId: 2006,
    streetAddress: "54 BSTY DRIVE",
    isFavorite: true,
    dueHighlightActive: false,
    dueHighlightLabels: [],
    dueWarningActive: false,
    dueWarningLabels: [],
    dueWarningTier: null,
  },
]

const EXPECTED_ORDER = [2001, 2002, 2003, 2004, 2005, 2006]
const TICKED_IDS = [2001, 2002, 2003, 2004]
const NO_CONDITION_IDS = [2005, 2006]

function makeOrderedListResponse() {
  return {
    items: ORDERED_ROWS.map((o) => ({ ...SINGLE_PROPERTY_RESPONSE.items[0], ...o })),
    totalCount: ORDERED_ROWS.length,
    limit: 25,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
    startCursor: null,
    endCursor: null,
  }
}

/** DOM-order of properties rows, deduped to first appearance (the list also renders quick-cards). */
async function rowOrder(page: import("@playwright/test").Page): Promise<number[]> {
  const testIds = await page
    .locator('[data-testid^="admin-entity-row--properties--"]')
    .evaluateAll((els) => els.map((e) => e.getAttribute("data-testid") ?? ""))
  const seen = new Set<number>()
  const order: number[] = []
  for (const tid of testIds) {
    const m = tid.match(/admin-entity-row--properties--(\d+)$/)
    if (!m) continue
    const id = Number(m[1])
    if (seen.has(id)) continue
    seen.add(id)
    order.push(id)
  }
  return order
}

test.describe("Properties — default order by next condition due", () => {
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

  test("default order renders condition-due rows on top by date, then no-condition rows alphabetically", async ({ page }) => {
    await page.route("**/api/admin/properties**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(makeOrderedListResponse()),
      })
    })
    await page.goto("/admin/properties")

    await expect(page.getByTestId("admin-entity-row--properties--2001").first()).toBeVisible({ timeout: 15_000 })

    const order = await rowOrder(page)
    expect(order).toEqual(EXPECTED_ORDER)

    await shotFocused(page, page.locator("table").first(), SHOT_DIR, "01-default-order")
    story.addScene({
      title: "01 — Default order: condition due ascending, others alphabetical",
      images: [join(SHOT_DIR, "01-default-order.png")],
      seeing:
        "The list opens with the due-today property (180 Amy Street) first, then the within-3-days " +
        "row (184 Amy Street), then the further-out gold rows by increasing days (12 Torrens Road at " +
        "14 days, then 80 Hollywood Avenue at 34 days), and finally the two properties with no live " +
        "condition (195 Amy Street, 54 Bsty Drive) in alphabetical street order.",
      steps: [
        "Sign in as admin",
        "Open /admin/properties with no sort applied",
        "Observe rows ordered by next condition date ascending, no-condition rows last alphabetically",
      ],
    })
  })

  test("every live-condition row appears above every no-condition row", async ({ page }) => {
    await page.route("**/api/admin/properties**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(makeOrderedListResponse()),
      })
    })
    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-row--properties--2001").first()).toBeVisible({ timeout: 15_000 })

    const order = await rowOrder(page)
    const lastTicked = Math.max(...TICKED_IDS.map((id) => order.indexOf(id)))
    const firstNoCondition = Math.min(...NO_CONDITION_IDS.map((id) => order.indexOf(id)))
    expect(lastTicked).toBeGreaterThanOrEqual(0)
    expect(firstNoCondition).toBeGreaterThan(lastTicked)
  })

  test("override then reset: clean load uses the condition-due default, Street header overrides, a fresh visit resets", async ({ page }) => {
    await page.route("**/api/admin/properties**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(makeOrderedListResponse()),
      })
    })

    const listRequestUrls: string[] = []
    page.on("request", (req) => {
      const u = req.url()
      if (u.includes("/api/admin/properties") && req.method() === "GET") listRequestUrls.push(u)
    })

    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-row--properties--2001").first()).toBeVisible({ timeout: 15_000 })

    // Clean load: no URL sortKey, so the client emits the entity default explicitly — which is now
    // the condition-due ordering (sortKey=nextConditionDue&sortDir=asc).
    const initialRequest = listRequestUrls.find((u) => u.includes("/api/admin/properties"))
    expect(initialRequest).toBeDefined()
    expect(initialRequest!).toContain("sortKey=nextConditionDue")
    expect(initialRequest!).toContain("sortDir=asc")

    // Override: click the Street column header → request carries sortKey=streetAddress.
    const streetHeader = page.getByTestId("admin-entity-sort-header--properties--streetAddress")
    await expect(streetHeader).toBeVisible()
    await streetHeader.click()
    await expect.poll(() => listRequestUrls.some((u) => u.includes("sortKey=streetAddress"))).toBe(true)

    // Reset: a fresh navigation to the clean URL drops the override and returns to the default.
    listRequestUrls.length = 0
    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-row--properties--2001").first()).toBeVisible({ timeout: 15_000 })
    await expect
      .poll(() => listRequestUrls.some((u) => u.includes("sortKey=nextConditionDue")))
      .toBe(true)
    expect(listRequestUrls.some((u) => u.includes("sortKey=streetAddress"))).toBe(false)
  })
})
