// Run: npm run test:e2e:scratch -- --app=panda-realty --spec=apps/panda-realty/e2e/properties-row-hide-from-view.spec.ts --no-bail
//
// TDD: per-row "hide from view" checkbox on the panda-realty properties desktop
// table. Ticking a row removes it from the on-screen view ONLY (client memory,
// non-persistent). A "N removed from view — Reset" indicator appears next to the
// row count. Reload / fresh search / Reset restore all rows. The map quick-card
// view is untouched. No DB write, no export change.
//
// NOTE: the properties table is rendered twice in the DOM (a pre-existing frozen
// /sticky-column clone — see admin-properties-frozen-actions-column.spec.ts which
// also uses .first()). So per-row testids resolve to 2 elements; we take .first()
// for visibility/click/box and leave count assertions unscoped (both clones share
// the hidden-rows context, so a hidden row drops from both -> count 0).
//
// Source of truth: specs/panda-realty-properties-list-row-temporary-hide.md ## Manual Verification

import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { expect, test, type Page } from "@playwright/test"

import { createStory, shotFocused } from "@repo/e2e-utils"

import { e2eAdminCredentials, refreshPandaE2eEnv, signInAsAdmin } from "./helpers/admin-auth"
import { STATUS_LIST_RESPONSE } from "./helpers/admin-properties-mocks"

const SHOT_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "screenshots",
  "properties-row-hide-from-view",
)

const story = createStory({
  specUrl: import.meta.url,
  slug: "properties-row-hide-from-view",
})

story.setWhatWasBuilt(
  "A per-row checkbox on the panda-realty properties desktop table that temporarily " +
    "removes the ticked property from the on-screen filtered list only. The hide is held " +
    "in client memory (non-persistent): a reload, a fresh search, or the 'Reset' control " +
    "restores every removed row. A passive 'N removed from view — Reset' indicator sits next " +
    "to the row count. No database write occurs and the Export is unaffected. The map " +
    "quick-card view does not show the checkbox.",
)

const TILE_BASE = {
  suburb: "GRIFFIN",
  state: "QLD",
  postcode: "4503",
  propertyType: "House",
  bath: 2,
  car: 1,
  buildingArea: null,
  landSize: 320,
  salePrice: 770000,
  saleDate: "2025-10-22",
  propertyStatusId: 1,
  buyerName: null,
  buyerId: null,
  owner2name: null,
  owner3name: null,
  isFavorite: true,
  priceUndisclosed: false,
  excludeFromReport: false,
  appraisedAmount: null,
  contractDate: null,
  contractPrice: null,
  commissionAmount: null,
  commissionRate: null,
  completionDate: null,
  successfulBuyer: null,
  successfulBuyerPropertyEntityId: null,
  successfulBuyerEntityId: null,
  successfulBuyerPhoneNumber: null,
  successfulBuyerEmailAddress: null,
  updatedAt: "2026-01-01T00:00:00Z",
}

const THREE_ROWS = [
  {
    ...TILE_BASE,
    propertyListId: 1001,
    streetAddress: "92 BLUESTAR CIRCUIT",
    bed: 3,
    owner1name: "ELAINE PREBBLE",
    combinedOwner: "ELAINE PREBBLE",
  },
  {
    ...TILE_BASE,
    propertyListId: 1002,
    streetAddress: "13 DAHLIA CRESCENT",
    bed: 3,
    owner1name: "JOHN SMITH",
    combinedOwner: "JOHN SMITH",
  },
  {
    ...TILE_BASE,
    propertyListId: 1003,
    streetAddress: "4 HEALY STREET",
    bed: 4,
    owner1name: "MARY JONES",
    combinedOwner: "MARY JONES",
  },
]

function listResponse(items: typeof THREE_ROWS) {
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

const checkboxId = (id: number) => `admin-entity-row-hide-from-view--properties--${id}`
const rowId = (id: number) => `admin-entity-row--properties--${id}`
const INDICATOR = "admin-entity-removed-from-view--properties"
const RESET = "admin-entity-removed-from-view-reset--properties"

// Per-row elements are duplicated by the frozen-column clone -> always take .first().
const checkbox = (page: Page, id: number) => page.getByTestId(checkboxId(id)).first()
const rowVisible = (page: Page, id: number) => page.getByTestId(rowId(id)).first()
// Unscoped — for count assertions (0 = hidden in both clones).
const rowAll = (page: Page, id: number) => page.getByTestId(rowId(id))

test.describe("Properties — per-row hide from view (desktop table)", () => {
  test.beforeEach(async ({ page }) => {
    refreshPandaE2eEnv()
    if (!e2eAdminCredentials) {
      throw new Error("E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set in apps/panda-realty/.env.local")
    }
    await mkdir(SHOT_DIR, { recursive: true })
    await page.setViewportSize({ width: 1280, height: 800 })
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

  async function gotoTable(page: Page) {
    await page.route("**/api/admin/properties**", async (route) => {
      if (route.request().method() !== "GET") {
        await route.continue()
        return
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(listResponse(THREE_ROWS)),
      })
    })
    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-table-scroll--properties")).toBeVisible({
      timeout: 15_000,
    })
    await expect(rowVisible(page, 1001)).toBeVisible({ timeout: 15_000 })
  }

  // MV-2
  test("each table row has a hide checkbox at the right edge before the action icons", async ({
    page,
  }) => {
    await gotoTable(page)
    for (const id of [1001, 1002, 1003]) {
      await expect(checkbox(page, id)).toBeVisible()
    }
    // The checkbox is the first control in the sticky action-icon cluster, so it
    // sits to the left of the edit/delete icons. Anchor on the delete button.
    const cbBox = await checkbox(page, 1001).boundingBox()
    const deleteBox = await page
      .getByTestId("admin-entity-row-delete--properties--1001")
      .first()
      .boundingBox()
    expect(cbBox).not.toBeNull()
    expect(deleteBox).not.toBeNull()
    expect(cbBox!.x).toBeLessThan(deleteBox!.x)

    await shotFocused(page, rowVisible(page, 1001), SHOT_DIR, "01-checkbox-in-row")
    story.addScene({
      title: "01 — Hide checkbox present in each row",
      images: [join(SHOT_DIR, "01-checkbox-in-row.png")],
      seeing: "A property row with the hide checkbox at the right edge, before the action icons.",
      steps: ["Open /admin/properties (desktop table)", "Observe a checkbox at the right edge of each row"],
    })
  })

  // MV-3
  test("the hide checkbox shows a remove-from-view-only tooltip", async ({ page }) => {
    await gotoTable(page)
    await checkbox(page, 1001).hover()
    await expect(
      page.getByText("Remove from this view only — does not delete").first(),
    ).toBeVisible({ timeout: 5_000 })

    await shotFocused(page, rowVisible(page, 1001), SHOT_DIR, "02-tooltip")
    story.addScene({
      title: "02 — Tooltip: Remove from this view only",
      images: [join(SHOT_DIR, "02-tooltip.png")],
      seeing:
        "Hovering the hide checkbox shows the tooltip 'Remove from this view only — does not delete', " +
        "making clear it is not the destructive delete action.",
      steps: ["Open /admin/properties", "Hover the checkbox at the start of a row's action icons"],
    })
  })

  // MV-5
  test("ticking the checkbox removes that row from the view instantly", async ({ page }) => {
    await gotoTable(page)
    await expect(rowVisible(page, 1002)).toBeVisible()
    await shotFocused(page, page.getByTestId("admin-entity-list-card--properties"), SHOT_DIR, "03a-before-remove")
    await checkbox(page, 1002).click()
    await expect(rowAll(page, 1002)).toHaveCount(0, { timeout: 5_000 })
    // other rows stay
    await expect(rowVisible(page, 1001)).toBeVisible()
    await expect(rowVisible(page, 1003)).toBeVisible()
    // no navigation happened
    expect(new URL(page.url()).pathname).toBe("/admin/properties")

    await shotFocused(page, page.getByTestId("admin-entity-list-card--properties"), SHOT_DIR, "03b-after-remove")
    story.addScene({
      title: "03 — Remove: ticking a row drops it from the view instantly",
      images: [join(SHOT_DIR, "03a-before-remove.png"), join(SHOT_DIR, "03b-after-remove.png")],
      seeing:
        "Left: three rows including 13 DAHLIA CRESCENT. Right: after ticking that row's checkbox it " +
        "disappears immediately (no reload), the other two rows remain, and the URL is unchanged.",
      steps: [
        "Open /admin/properties",
        "Tick the checkbox on the 13 DAHLIA CRESCENT row",
        "Observe the row vanish with no page reload",
      ],
    })
  })

  // MV-6
  test("removing a row shows the N removed from view indicator with Reset", async ({ page }) => {
    await gotoTable(page)
    await checkbox(page, 1002).click()
    const indicator = page.getByTestId(INDICATOR).first()
    await expect(indicator).toBeVisible({ timeout: 5_000 })
    await expect(indicator).toContainText("1 removed from view")
    await expect(page.getByTestId(RESET).first()).toBeVisible()

    await shotFocused(page, page.getByTestId("admin-entity-list-status--properties"), SHOT_DIR, "04-indicator")
    story.addScene({
      title: "04 — Indicator: '1 removed from view — Reset'",
      images: [join(SHOT_DIR, "04-indicator.png")],
      seeing:
        "After removing one row, a passive '1 removed from view' note with a Reset link appears next to " +
        "the row count, so the user knows the view is filtered and can undo it.",
      steps: ["Open /admin/properties", "Tick one row's checkbox", "Read the indicator by the row count"],
    })
  })

  // MV-7
  test("the indicator counts up as more rows are removed", async ({ page }) => {
    await gotoTable(page)
    await checkbox(page, 1001).click()
    await checkbox(page, 1002).click()
    await checkbox(page, 1003).click()
    await expect(page.getByTestId(INDICATOR).first()).toContainText("3 removed from view")

    await shotFocused(page, page.getByTestId("admin-entity-list-status--properties"), SHOT_DIR, "05-indicator-3")
    story.addScene({
      title: "05 — Indicator counts up to '3 removed from view'",
      images: [join(SHOT_DIR, "05-indicator-3.png")],
      seeing: "Removing three rows updates the indicator to '3 removed from view'.",
      steps: ["Open /admin/properties", "Tick three rows' checkboxes", "Read the indicator count"],
    })
  })

  // MV-8
  test("Reset restores all removed rows and hides the indicator", async ({ page }) => {
    await gotoTable(page)
    await checkbox(page, 1001).click()
    await checkbox(page, 1002).click()
    await expect(rowAll(page, 1001)).toHaveCount(0)
    await shotFocused(page, page.getByTestId("admin-entity-list-card--properties"), SHOT_DIR, "06a-before-reset")
    await page.getByTestId(RESET).first().click()
    await expect(rowVisible(page, 1001)).toBeVisible({ timeout: 5_000 })
    await expect(rowVisible(page, 1002)).toBeVisible()
    await expect(page.getByTestId(INDICATOR)).toHaveCount(0)

    await shotFocused(page, page.getByTestId("admin-entity-list-card--properties"), SHOT_DIR, "06b-after-reset")
    story.addScene({
      title: "06 — Reset: restores all removed rows",
      images: [join(SHOT_DIR, "06a-before-reset.png"), join(SHOT_DIR, "06b-after-reset.png")],
      seeing:
        "Left: two rows removed, indicator showing '2 removed from view — Reset'. Right: after clicking " +
        "Reset, all rows are back and the indicator is gone.",
      steps: ["Remove two rows", "Click Reset", "Observe every row reappear and the indicator disappear"],
    })
  })

  // MV-9 / MV-15
  test("a reload restores removed rows (hide is non-persistent)", async ({ page }) => {
    await gotoTable(page)
    await checkbox(page, 1002).click()
    await expect(rowAll(page, 1002)).toHaveCount(0)
    await shotFocused(page, page.getByTestId("admin-entity-list-card--properties"), SHOT_DIR, "07a-before-reload")
    await page.reload()
    await expect(rowVisible(page, 1002)).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId(INDICATOR)).toHaveCount(0)

    await shotFocused(page, page.getByTestId("admin-entity-list-card--properties"), SHOT_DIR, "07b-after-reload")
    story.addScene({
      title: "07 — Reload: hide is non-persistent",
      images: [join(SHOT_DIR, "07a-before-reload.png"), join(SHOT_DIR, "07b-after-reload.png")],
      seeing:
        "Left: 13 DAHLIA CRESCENT removed before reload. Right: after a full page reload the row is back " +
        "and the indicator is gone — the hide lives only in memory.",
      steps: ["Remove a row", "Reload the page (F5)", "Observe the removed row reappear"],
    })
  })

  // MV-10
  test("a fresh search restores removed rows", async ({ page }) => {
    await gotoTable(page)
    await checkbox(page, 1002).click()
    await expect(rowAll(page, 1002)).toHaveCount(0)
    await shotFocused(page, page.getByTestId("admin-entity-list-card--properties"), SHOT_DIR, "08a-before-search")
    // change the filter → new list fetch (fresh result set)
    await page.goto("/admin/properties?propertyStatusId=1")
    await expect(page.getByTestId("admin-entity-table-scroll--properties")).toBeVisible({
      timeout: 15_000,
    })
    await expect(rowVisible(page, 1002)).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId(INDICATOR)).toHaveCount(0)

    await shotFocused(page, page.getByTestId("admin-entity-list-card--properties"), SHOT_DIR, "08b-after-search")
    story.addScene({
      title: "08 — Fresh search: removed rows return",
      images: [join(SHOT_DIR, "08a-before-search.png"), join(SHOT_DIR, "08b-after-search.png")],
      seeing:
        "Left: a row removed under the current filter. Right: running a fresh search (new filter) brings " +
        "all rows back and clears the indicator.",
      steps: ["Remove a row", "Change the status filter / run a new search", "Observe removed rows return"],
    })
  })

  // MV-11
  test("ticking the checkbox performs no database write", async ({ page }) => {
    const mutatingCalls: string[] = []
    page.on("request", (req) => {
      const u = req.url()
      if (
        u.includes("/api/admin/properties") &&
        ["POST", "PATCH", "PUT", "DELETE"].includes(req.method())
      ) {
        mutatingCalls.push(`${req.method()} ${u}`)
      }
    })
    await gotoTable(page)
    await checkbox(page, 1002).click()
    await expect(rowAll(page, 1002)).toHaveCount(0)
    expect(mutatingCalls).toEqual([])

    await shotFocused(page, page.getByTestId("admin-entity-list-card--properties"), SHOT_DIR, "09-no-db-write")
    story.addScene({
      title: "09 — No database write",
      images: [join(SHOT_DIR, "09-no-db-write.png")],
      seeing:
        "The row is removed from the view, but a request listener recorded zero POST/PATCH/PUT/DELETE calls " +
        "to /api/admin/properties — the hide never touches the database.",
      steps: ["Listen for mutating property requests", "Tick a row's checkbox", "Confirm no write request fired"],
    })
  })

  // MV-12
  test("the quick-card view shows no hide checkbox and no indicator", async ({ page }) => {
    await page.route("**/api/admin/properties**", async (route) => {
      const url = route.request().url()
      if (route.request().method() !== "GET") {
        await route.continue()
        return
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(url.includes("propertyType=") ? listResponse(THREE_ROWS) : listResponse([])),
      })
    })
    await page.goto(`/admin/properties?propertyType=House`)
    await expect(page.getByTestId("admin-entity-quick-cards-scroll--properties")).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByTestId("admin-entity-table-scroll--properties")).toHaveCount(0)
    await expect(page.getByTestId(checkboxId(1001))).toHaveCount(0)
    await expect(page.getByTestId(INDICATOR)).toHaveCount(0)

    await shotFocused(page, page.getByTestId("admin-entity-quick-cards-scroll--properties"), SHOT_DIR, "10-quick-card-no-checkbox")
    story.addScene({
      title: "10 — Quick-card view: no hide checkbox",
      images: [join(SHOT_DIR, "10-quick-card-no-checkbox.png")],
      seeing:
        "With a property-type filter active the list renders as quick cards. No hide checkbox and no removed " +
        "indicator appear here — the feature is scoped to the table view only.",
      steps: ["Apply a property-type filter", "Observe the quick-card layout has no hide checkbox"],
    })
  })

  // MV-13
  test("the delete action stays separate from the hide checkbox", async ({ page }) => {
    await gotoTable(page)
    await expect(
      page.getByTestId("admin-entity-row-delete--properties--1001").first(),
    ).toBeVisible()
    await expect(checkbox(page, 1001)).toBeVisible()
    // they are different elements at different positions
    const deleteBox = await page
      .getByTestId("admin-entity-row-delete--properties--1001")
      .first()
      .boundingBox()
    const cbBox = await checkbox(page, 1001).boundingBox()
    expect(deleteBox).not.toBeNull()
    expect(cbBox).not.toBeNull()
    expect(deleteBox!.x).not.toBe(cbBox!.x)

    await shotFocused(page, rowVisible(page, 1001), SHOT_DIR, "11-delete-distinct")
    story.addScene({
      title: "11 — Hide checkbox is distinct from the red Delete action",
      images: [join(SHOT_DIR, "11-delete-distinct.png")],
      seeing:
        "The hide checkbox sits at the start of the action-icon cluster; the destructive red trash/Delete " +
        "button remains separate at the end — the two are visually and positionally distinct.",
      steps: ["Open /admin/properties", "Compare the leading hide checkbox with the trailing Delete button"],
    })
  })

  // MV-14
  test("hiding every visible row leaves an empty table but keeps Reset available", async ({
    page,
  }) => {
    await gotoTable(page)
    await shotFocused(page, page.getByTestId("admin-entity-list-card--properties"), SHOT_DIR, "12a-before-hide-all")
    await checkbox(page, 1001).click()
    await checkbox(page, 1002).click()
    await checkbox(page, 1003).click()
    await expect(rowAll(page, 1001)).toHaveCount(0)
    await expect(rowAll(page, 1002)).toHaveCount(0)
    await expect(rowAll(page, 1003)).toHaveCount(0)
    await expect(page.getByTestId(INDICATOR).first()).toContainText("3 removed from view")
    await expect(page.getByTestId(RESET).first()).toBeVisible()

    await shotFocused(page, page.getByTestId("admin-entity-list-card--properties"), SHOT_DIR, "12b-after-hide-all")
    story.addScene({
      title: "12 — Hide all rows: empty table, Reset still available",
      images: [join(SHOT_DIR, "12a-before-hide-all.png"), join(SHOT_DIR, "12b-after-hide-all.png")],
      seeing:
        "Left: three rows. Right: after ticking all three, the table body is empty while the " +
        "'3 removed from view — Reset' indicator stays, so the rows can be recovered in one click.",
      steps: ["Tick every row's checkbox", "Observe the empty table", "Confirm the Reset link is still shown"],
    })
  })
})
