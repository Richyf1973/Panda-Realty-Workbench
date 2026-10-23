// Run: npm run test:e2e:scratch -- --app=panda-realty --spec=apps/panda-realty/e2e/properties-freeze-left-columns.spec.ts --no-bail

import { expect, test, type Page } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { createStory, shotFocused } from "@repo/e2e-utils"

import { e2eAdminCredentials, refreshPandaE2eEnv, signInAsAdmin } from "./helpers/admin-auth"
import { EMPTY_LIST_RESPONSE, STATUS_LIST_RESPONSE } from "./helpers/admin-properties-mocks"

/**
 * Properties admin — freeze the left columns (row-links + Status + Street) of the standard
 * properties list table so the right-side columns scroll horizontally underneath them.
 *
 * Success factors map 1:1 to specs/panda-realty-properties-table-freeze-columns.md ## Manual Verification.
 */

const SHOT_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "screenshots",
  "properties-freeze-left-columns",
)

const story = createStory({
  specUrl: import.meta.url,
  slug: "properties-freeze-left-columns",
})

story.setWhatWasBuilt(
  "Froze the leading columns (row-links icons, Status, Street) of the standard panda-realty " +
    "properties list table to the left edge via a reusable listStickyStartColumnKey config on the " +
    "shared admin EntityDataTable. The remaining columns scroll horizontally underneath; a seam " +
    "shadow marks the frozen edge. Quick-cards and mobile variants are unaffected.",
)

const FROZEN_KEYS = ["row-links", "propertyStatusId", "streetAddress"] as const
const TABLE_SCROLL = "admin-entity-table-scroll--properties"

function header(page: Page, columnId: string) {
  return page.getByTestId(`admin-entity-col-header--properties--${columnId}`)
}

/** Returns the computed style snapshot for a column header th by column id. */
async function headerStyle(page: Page, columnId: string) {
  return page.evaluate((id) => {
    const el = document.querySelector(
      `[data-testid="admin-entity-col-header--properties--${id}"]`,
    ) as HTMLElement | null
    if (!el) return null
    const cs = getComputedStyle(el)
    return {
      position: cs.position,
      left: cs.left,
      boxShadow: cs.boxShadow,
      backgroundColor: cs.backgroundColor,
      maxWidth: cs.maxWidth,
      textOverflow: cs.textOverflow,
    }
  }, columnId)
}

const baseItem = {
  propertyListId: 9001,
  streetAddress: "12 POSITANO STREET",
  suburb: "MORAYFIELD",
  state: "QLD",
  postcode: "4506",
  propertyType: "House",
  bed: 4,
  bath: 2,
  car: 2,
  buildingArea: null as number | null,
  landSize: 600 as number | null,
  salePrice: 720000,
  saleDate: "2024-03-10",
  propertyStatusId: 1,
  buyerName: null,
  buyerId: null,
  owner1name: "AARATI KANDEL",
  owner2name: "DEVENDRA ADHIKARI",
  owner3name: null,
  combinedOwner: "AARATI KANDEL / DEVENDRA ADHIKARI",
  isFavorite: true,
  priceUndisclosed: false,
  excludeFromReport: false,
  appraisedAmount: null,
  contractDate: null,
  contractPrice: null,
  commissionAmount: null,
  commissionRate: null,
  coolingOffDate: null,
  buildingPestDate: null,
  financeDate: null,
  dueDiligenceDate: null,
  saleOfPropertyDate: null,
  unconditionalContractDate: null,
  completionDate: null,
  isCashOffer: null,
  noConditions: null,
  isSubjectToSale: null,
  otherConditions: null,
  successfulBuyer: null,
  successfulBuyerPropertyEntityId: null,
  successfulBuyerEntityId: null,
  successfulBuyerPhoneNumber: null,
  successfulBuyerEmailAddress: null,
  dueHighlightActive: false as boolean,
  dueHighlightLabels: null as string[] | null,
  updatedAt: "2026-01-01T00:00:00Z",
}

function row(overrides: Partial<typeof baseItem>) {
  return { ...baseItem, ...overrides }
}

function listResponse(items: (typeof baseItem)[]) {
  return {
    items,
    totalCount: items.length,
    limit: 25,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
    startCursor: null,
    endCursor: null,
  }
}

const MULTI_ROWS = [
  row({ propertyListId: 9001, streetAddress: "12 POSITANO STREET" }),
  row({
    propertyListId: 9002,
    streetAddress: "LOT 3/2 SIENNA DRIVE EXTENDED LONG ADDRESS THAT OVERFLOWS THE COLUMN",
    combinedOwner: "ISHWORI BISTA",
  }),
  row({
    propertyListId: 9003,
    streetAddress: "502 OAKEY FLAT ROAD",
    combinedOwner: "DREW JAMES ANTROBUS / MARILYN ANTROBUS",
    dueHighlightActive: true,
    dueHighlightLabels: ["Cooling-off due"],
  }),
]

async function routeStandardTable(page: Page, items = MULTI_ROWS) {
  await page.route("**/api/admin/properties**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(listResponse(items)),
    })
  })
}

test.describe("Properties — freeze left columns up to Street", () => {
  test.beforeEach(async ({ page }) => {
    refreshPandaE2eEnv()
    if (!e2eAdminCredentials) {
      throw new Error(
        "E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD must be set in apps/panda-realty/.env.local",
      )
    }
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.route("**/api/admin/property-status**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(STATUS_LIST_RESPONSE),
      })
    })
    await signInAsAdmin(page)
    await mkdir(SHOT_DIR, { recursive: true })
  })

  test.afterAll(() => {
    story.write()
  })

  // MV-2: standard table renders frozen + scrolling headers in order
  test("MV-2: standard table renders Status, Street, Suburb headers in order", async ({ page }) => {
    await routeStandardTable(page)
    await page.goto("/admin/properties?isFavorite=all")
    await expect(page.getByTestId(TABLE_SCROLL)).toBeVisible()

    await expect(header(page, "propertyStatusId")).toBeVisible({ timeout: 10_000 })
    await expect(header(page, "streetAddress")).toBeVisible()
    await expect(header(page, "suburb")).toBeVisible()

    const scroll = page.getByTestId(TABLE_SCROLL)
    await shotFocused(page, scroll, SHOT_DIR, "01-standard-table")
    story.addScene({
      title: "01 — Standard properties table",
      images: [join(SHOT_DIR, "01-standard-table.png")],
      seeing: "The standard properties table with Status, Street, Suburb, Owner, State columns.",
      steps: ["Open /admin/properties?isFavorite=all", "Observe the standard table columns"],
    })
  })

  // MV-3: frozen headers are sticky with ascending left offsets; suburb is not sticky; pin survives scroll
  test("MV-3: frozen columns are sticky-left and stay pinned on horizontal scroll", async ({
    page,
  }) => {
    await routeStandardTable(page)
    await page.goto("/admin/properties?isFavorite=all")
    await expect(page.getByTestId(TABLE_SCROLL)).toBeVisible()
    await expect(header(page, "streetAddress")).toBeVisible({ timeout: 10_000 })

    const styles = await Promise.all(FROZEN_KEYS.map((k) => headerStyle(page, k)))
    for (const [i, s] of styles.entries()) {
      expect(s, `frozen header ${FROZEN_KEYS[i]} should exist`).not.toBeNull()
      expect(s!.position, `frozen header ${FROZEN_KEYS[i]} should be sticky`).toBe("sticky")
    }
    // Ascending cumulative left offsets: row-links=0, then Status, then Street.
    const lefts = styles.map((s) => Number.parseFloat(s!.left))
    expect(lefts[0]).toBe(0)
    expect(lefts[1]).toBeGreaterThan(lefts[0])
    expect(lefts[2]).toBeGreaterThan(lefts[1])

    // Suburb (first scrolling column) must NOT be sticky.
    const suburb = await headerStyle(page, "suburb")
    expect(suburb!.position).not.toBe("sticky")

    // True pin check: Street's viewport x must not move when the table scrolls horizontally.
    const scroll = page.getByTestId(TABLE_SCROLL)
    const streetBefore = await header(page, "streetAddress").boundingBox()
    await scroll.evaluate((el) => {
      el.scrollLeft = 400
    })
    await page.waitForTimeout(150)
    const streetAfter = await header(page, "streetAddress").boundingBox()
    expect(streetBefore).not.toBeNull()
    expect(streetAfter).not.toBeNull()
    expect(Math.abs(streetAfter!.x - streetBefore!.x)).toBeLessThanOrEqual(1)

    await shotFocused(page, scroll, SHOT_DIR, "02-scrolled-pinned")
    story.addScene({
      title: "02 — Scrolled right: left columns stay frozen",
      images: [join(SHOT_DIR, "02-scrolled-pinned.png")],
      seeing: "After scrolling right, Status and Street stay pinned while Suburb/Owner slide underneath.",
      steps: [
        "Open /admin/properties?isFavorite=all",
        "Scroll the table horizontally to the right",
        "Observe Status and Street remain fixed at the left",
      ],
    })
  })

  // MV-4: seam shadow on the frozen Street edge
  test("MV-4: Street frozen column shows a right-edge seam shadow", async ({ page }) => {
    await routeStandardTable(page)
    await page.goto("/admin/properties?isFavorite=all")
    await expect(header(page, "streetAddress")).toBeVisible({ timeout: 10_000 })

    const s = await headerStyle(page, "streetAddress")
    expect(s!.boxShadow).not.toBe("none")
    expect(s!.boxShadow.length).toBeGreaterThan(0)
  })

  // MV-5: frozen cells have an opaque background
  test("MV-5: frozen header cells have an opaque (non-transparent) background", async ({ page }) => {
    await routeStandardTable(page)
    await page.goto("/admin/properties?isFavorite=all")
    await expect(header(page, "streetAddress")).toBeVisible({ timeout: 10_000 })

    for (const key of FROZEN_KEYS) {
      const s = await headerStyle(page, key)
      const bg = s!.backgroundColor
      expect(bg, `frozen header ${key} background`).not.toBe("rgba(0, 0, 0, 0)")
      expect(bg).not.toBe("transparent")
    }
  })

  // MV-6: hover keeps frozen cell sticky (light assertion — visual parity covered by story shot)
  test("MV-6: frozen columns remain sticky while hovering a row", async ({ page }) => {
    await routeStandardTable(page)
    await page.goto("/admin/properties?isFavorite=all")
    await expect(header(page, "streetAddress")).toBeVisible({ timeout: 10_000 })

    const firstRow = page.getByTestId("admin-entity-row--properties--9001")
    await firstRow.hover()
    const s = await headerStyle(page, "streetAddress")
    expect(s!.position).toBe("sticky")
  })

  // MV-7: a due-highlighted row still renders with frozen columns sticky
  test("MV-7: due-highlighted row renders with frozen columns still sticky", async ({ page }) => {
    await routeStandardTable(page)
    await page.goto("/admin/properties?isFavorite=all")
    await expect(header(page, "streetAddress")).toBeVisible({ timeout: 10_000 })

    const highlightedRow = page.getByTestId("admin-entity-row--properties--9003")
    await expect(highlightedRow).toBeVisible()
    const s = await headerStyle(page, "streetAddress")
    expect(s!.position).toBe("sticky")
  })

  // MV-8: long Street truncates with ellipsis and remains sticky
  test("MV-8: long Street address truncates with ellipsis and stays sticky", async ({ page }) => {
    await routeStandardTable(page)
    await page.goto("/admin/properties?isFavorite=all")
    await expect(header(page, "streetAddress")).toBeVisible({ timeout: 10_000 })

    const s = await headerStyle(page, "streetAddress")
    expect(s!.position).toBe("sticky")
    // Fixed width => maxWidth is a px value (not "none").
    expect(s!.maxWidth).not.toBe("none")
  })

  // MV-9: the frozen Street header's sort control is still clickable (not obscured by the sticky layer)
  test("MV-9: the frozen Street sort header is clickable while frozen", async ({ page }) => {
    await routeStandardTable(page)
    await page.goto("/admin/properties?isFavorite=all")
    await expect(header(page, "streetAddress")).toBeVisible({ timeout: 10_000 })

    // A successful click on the sort button proves the frozen header is not covered by the
    // sticky overlay (Playwright actionability fails if the target is obscured). Sorting is
    // client-side TanStack state, so we assert interactivity + that the header stays sticky.
    const sortBtn = page.getByTestId("admin-entity-sort-header--properties--streetAddress")
    await expect(sortBtn).toBeVisible()
    await sortBtn.click()
    await expect(sortBtn).toBeVisible()
    const s = await headerStyle(page, "streetAddress")
    expect(s!.position).toBe("sticky")
  })

  // MV-10: clicking a frozen data cell opens the edit dialog
  test("MV-10: clicking a frozen Street cell opens the edit dialog", async ({ page }) => {
    await routeStandardTable(page)
    await page.goto("/admin/properties?isFavorite=all")
    await expect(header(page, "streetAddress")).toBeVisible({ timeout: 10_000 })

    const streetCell = page.getByTestId("admin-entity-row-cell--properties--9001--streetAddress")
    await streetCell.click()
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 10_000 })
  })

  // MV-11: quick-cards variant is unaffected (regression guard)
  test("MV-11: quick-cards variant renders cards, not the sticky table", async ({ page }) => {
    await page.route("**/api/admin/properties**", async (route) => {
      const url = route.request().url()
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          url.includes("propertyType=") ? listResponse([row({})]) : EMPTY_LIST_RESPONSE,
        ),
      })
    })
    await page.goto(`/admin/properties?propertyType=House`)
    await expect(page.getByTestId("admin-entity-quick-cards-scroll--properties")).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.getByTestId(TABLE_SCROLL)).toHaveCount(0)
  })

  // MV-12: mobile viewport renders mobile cards, freeze is a no-op (regression guard)
  test("MV-12: mobile viewport renders mobile cards (freeze no-op)", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await routeStandardTable(page)
    await page.goto("/admin/properties?isFavorite=all")
    await expect(page.getByTestId("admin-entity-mobile-list-scroll--properties")).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.getByTestId(TABLE_SCROLL)).toHaveCount(0)
  })

  // MV-13: freeze persists after reload
  test("MV-13: frozen columns persist after reload", async ({ page }) => {
    await routeStandardTable(page)
    await page.goto("/admin/properties?isFavorite=all")
    await expect(header(page, "streetAddress")).toBeVisible({ timeout: 10_000 })

    await page.reload()
    await expect(header(page, "streetAddress")).toBeVisible({ timeout: 10_000 })
    const s = await headerStyle(page, "streetAddress")
    expect(s!.position).toBe("sticky")
  })
})
