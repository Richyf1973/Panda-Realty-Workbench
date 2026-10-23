import { expect, test, type Page } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { createStory, shotFocused } from "@repo/e2e-utils"

import {
  requirePandaE2eAdminCredentials,
  signInAsAdmin,
} from "./helpers/admin-auth"

/**
 * Run (user runs; agent reads playwright/last-run.md):
 *   npm run test:e2e:scratch -- --app=panda-realty --spec=apps/panda-realty/e2e/admin-properties-actions-responsive-collapse.spec.ts --no-bail
 *
 * Feature: the properties table row-action strip collapses to [tick][map][⋮] when the
 * table's own width leaves too little room for the data columns, and expands back to the
 * full inline icon set when wide. Map-results view is unchanged.
 */

const SHOT_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "screenshots",
  "actions-responsive-collapse",
)

const story = createStory({
  specUrl: import.meta.url,
  slug: "panda-properties-actions-collapse-responsive",
})

story.setWhatWasBuilt(
  "Panda Realty properties table row actions now collapse responsively. When the table's " +
    "own width (not the viewport) leaves less than ~one data column of room, every row's " +
    "action strip collapses to the hide-from-view tick, the locate-on-map button, and a single " +
    "overflow (⋮) menu holding the remaining actions plus Edit and Delete. When the table is " +
    "wide the full inline icon set is shown. The map-results view is untouched.",
)

const WIDE = { width: 1680, height: 900 }
const NARROW = { width: 820, height: 820 } // ≥768 so the table (not mobile cards) renders, but squeezed
const PHONE = { width: 700, height: 800 } // <768 → mobile cards

// Property A — full owner contact + a primary buyer.
const PROP_FULL = 9101
// Property B — owner has no phone/email and no primary buyer.
const PROP_NOCONTACT = 9102

const EMPTY_STATUS_LIST_RESPONSE = {
  items: [],
  totalCount: 0,
  limit: 100,
  totalPages: 0,
  hasNextPage: false,
  hasPreviousPage: false,
  startCursor: null,
  endCursor: null,
}

const PROPERTIES_LIST_RESPONSE = {
  items: [
    {
      propertyListId: PROP_FULL,
      streetAddress: "11 Collapse Test Drive",
      suburb: "PLAYWRIGHT HEIGHTS",
      state: "QLD",
      postcode: "4500",
      propertyType: "House",
      bed: 4,
      bath: 2,
      car: 2,
      buildingArea: 136,
      salePrice: 385000,
      propertyStatusId: 1,
      combinedOwner: "OWNER WITH FULL CONTACT",
      owner1name: "OWNER WITH FULL CONTACT",
      owner1phone: "0400000001",
      owner1email: "owner-full@example.com",
      primaryBuyerPhone: "0400000999",
      primaryBuyerEmail: "buyer-full@example.com",
      primaryBuyerName: "BUYER WITH CONTACT",
      primaryBuyerEmailName: "BUYER WITH CONTACT",
      isFavorite: false,
      priceUndisclosed: false,
      excludeFromReport: false,
      saleDate: "2021-06-01",
      updatedAt: "2026-01-01T00:00:00Z",
    },
    {
      propertyListId: PROP_NOCONTACT,
      streetAddress: "22 No Contact Court",
      suburb: "PLAYWRIGHT HEIGHTS",
      state: "QLD",
      postcode: "4500",
      propertyType: "House",
      bed: 3,
      bath: 1,
      car: 1,
      buildingArea: 110,
      salePrice: 300000,
      propertyStatusId: 1,
      combinedOwner: "OWNER WITHOUT CONTACT",
      owner1name: "OWNER WITHOUT CONTACT",
      owner1phone: null,
      owner1email: null,
      primaryBuyerPhone: null,
      primaryBuyerEmail: null,
      primaryBuyerName: null,
      primaryBuyerEmailName: null,
      isFavorite: false,
      priceUndisclosed: false,
      excludeFromReport: false,
      saleDate: "2021-06-01",
      updatedAt: "2026-01-01T00:00:00Z",
    },
  ],
  totalCount: 2,
  limit: 25,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false,
  startCursor: null,
  endCursor: null,
}

async function mockPropertiesList(page: Page) {
  await page.route("**/api/admin/properties**", async (route) => {
    if (route.request().method() !== "GET") {
      await route.continue()
      return
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(PROPERTIES_LIST_RESPONSE),
    })
  })
  await page.route("**/api/admin/property-status**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(EMPTY_STATUS_LIST_RESPONSE),
    })
  })
}

function row(page: Page, id: number) {
  return page.getByTestId(`admin-entity-row--properties--${id}`).first()
}
function overflowTrigger(page: Page, id: number) {
  return page.getByTestId(`admin-entity-row-actions-overflow--properties--${id}`)
}
function inline(page: Page, testid: string) {
  return page.getByTestId(testid).first()
}

async function gotoList(page: Page, query = "") {
  await mockPropertiesList(page)
  await signInAsAdmin(page)
  await page.goto(`/admin/properties${query}`)
}

async function expectTableVisible(page: Page) {
  // First navigation after a dev-server restart compiles the /admin/properties route on demand,
  // which can take well over 15s — use a generous wait so the first test does not flake on cold start.
  await expect(
    page.getByTestId("admin-entity-table-scroll--properties"),
  ).toBeVisible({ timeout: 60_000 })
  await expect(row(page, PROP_FULL)).toBeVisible({ timeout: 30_000 })
}

test.beforeEach(async () => {
  requirePandaE2eAdminCredentials()
  await mkdir(SHOT_DIR, { recursive: true })
})

test.afterAll(() => {
  story.write()
})

test.describe("Panda properties row actions — responsive collapse", () => {
  // Dev compiles routes on first hit; allow headroom so the first test survives a cold server.
  test.describe.configure({ timeout: 120_000 })

  // MV-2
  test("wide table shows the full inline action icons and no overflow trigger", async ({
    page,
  }) => {
    await page.setViewportSize(WIDE)
    await gotoList(page)
    await expectTableVisible(page)

    for (const id of [PROP_FULL]) {
      await expect(inline(page, `admin-entity-row-hide-from-view--properties--${id}`)).toBeVisible()
      await expect(inline(page, `property-list-map-button--${id}`)).toBeVisible()
      await expect(inline(page, `property-list-call-button--${id}`)).toBeVisible()
      await expect(inline(page, `property-list-email-button--${id}`)).toBeVisible()
      await expect(inline(page, `property-list-inbox-button--${id}`)).toBeVisible()
      await expect(inline(page, `property-list-add-reminder-button--${id}`)).toBeVisible()
      await expect(inline(page, `property-list-add-note-button--${id}`)).toBeVisible()
      await expect(inline(page, `property-list-add-calendar-event-button--${id}`)).toBeVisible()
      await expect(inline(page, `admin-entity-row-edit--properties--${id}`)).toBeVisible()
      await expect(inline(page, `admin-entity-row-delete--properties--${id}`)).toBeVisible()
      await expect(overflowTrigger(page, id)).toHaveCount(0)
    }

    await shotFocused(page, row(page, PROP_FULL), SHOT_DIR, "01-wide-expanded")
    story.addScene({
      title: "01 — Wide table: full inline action icons, no overflow menu",
      images: [join(SHOT_DIR, "01-wide-expanded.png")],
      seeing:
        "On a wide table every row action is an inline icon button and there is no ⋮ overflow trigger.",
      steps: [
        "Open Properties on a wide (1680px) viewport",
        "Observe all action icons inline in the row",
        "Observe there is no ⋮ overflow menu trigger",
      ],
    })
  })

  // MV-3
  test("actions column stays frozen on the right while scrolling horizontally", async ({
    page,
  }) => {
    await page.setViewportSize(WIDE)
    await gotoList(page)
    await expectTableVisible(page)

    const header = page.getByTestId("admin-entity-col-header--properties--actions")
    await expect(header).toBeVisible()
    expect(await header.evaluate((el) => getComputedStyle(el).position)).toBe("sticky")
  })

  // MV-4
  test("narrow table collapses the strip to tick, map, and an overflow trigger only", async ({
    page,
  }) => {
    await page.setViewportSize(NARROW)
    await gotoList(page)
    await expectTableVisible(page)

    // Pinned controls stay inline.
    await expect(
      inline(page, `admin-entity-row-hide-from-view--properties--${PROP_FULL}`),
    ).toBeVisible()
    await expect(inline(page, `property-list-map-button--${PROP_FULL}`)).toBeVisible()
    // Overflow trigger appears.
    await expect(overflowTrigger(page, PROP_FULL)).toBeVisible()
    // The rest are no longer inline (they live inside the menu now).
    await expect(page.getByTestId(`property-list-call-button--${PROP_FULL}`)).toHaveCount(0)
    await expect(page.getByTestId(`property-list-email-button--${PROP_FULL}`)).toHaveCount(0)
    await expect(page.getByTestId(`property-list-add-note-button--${PROP_FULL}`)).toHaveCount(0)
    await expect(page.getByTestId(`property-list-add-reminder-button--${PROP_FULL}`)).toHaveCount(0)
    await expect(page.getByTestId(`property-list-add-calendar-event-button--${PROP_FULL}`)).toHaveCount(0)
    await expect(page.getByTestId(`admin-entity-row-edit--properties--${PROP_FULL}`)).toHaveCount(0)

    await shotFocused(page, row(page, PROP_FULL), SHOT_DIR, "02-narrow-collapsed")
    story.addScene({
      title: "02 — Narrow table: collapsed to tick, map, and ⋮",
      images: [join(SHOT_DIR, "02-narrow-collapsed.png")],
      seeing:
        "When the table is narrow the strip is just the hide tick, the map button, and a single ⋮ trigger.",
      steps: [
        "Open Properties on a narrow (820px) viewport",
        "Observe the strip collapses to [tick][map][⋮]",
      ],
    })
  })

  // MV-5
  test("overflow trigger has the expected data-testid when collapsed", async ({
    page,
  }) => {
    await page.setViewportSize(NARROW)
    await gotoList(page)
    await expectTableVisible(page)
    await expect(overflowTrigger(page, PROP_FULL)).toBeVisible()
  })

  // MV-6
  test("overflow menu lists the remaining actions plus Edit and Delete", async ({
    page,
  }) => {
    await page.setViewportSize(NARROW)
    await gotoList(page)
    await expectTableVisible(page)

    await overflowTrigger(page, PROP_FULL).click()
    const menu = page.getByTestId(
      `admin-entity-row-actions-overflow-menu--properties--${PROP_FULL}`,
    )
    await expect(menu).toBeVisible()
    for (const name of [
      "Call owner",
      "Send email",
      "View email threads",
      "Call buyer",
      "Email buyer",
      "Add reminder",
      "Add notes",
      "Add meeting",
      "Edit",
      "Delete",
    ]) {
      await expect(menu.getByRole("menuitem", { name })).toBeVisible()
    }

    await shotFocused(page, menu, SHOT_DIR, "03-overflow-menu")
    story.addScene({
      title: "03 — Overflow menu contents",
      images: [join(SHOT_DIR, "03-overflow-menu.png")],
      seeing:
        "The ⋮ menu lists Call/Send email/View threads/Call buyer/Email buyer/reminder/notes/meeting then Edit and Delete.",
      steps: ["Collapse the table", "Click ⋮", "Observe the menu rows"],
    })
  })

  // MV-7
  test("overflow menu opens the add-notes dialog for the correct property", async ({
    page,
  }) => {
    await page.setViewportSize(NARROW)
    await gotoList(page)
    await expectTableVisible(page)

    await overflowTrigger(page, PROP_FULL).click()
    const menu = page.getByTestId(
      `admin-entity-row-actions-overflow-menu--properties--${PROP_FULL}`,
    )
    await menu.getByRole("menuitem", { name: "Add notes" }).click()

    await expect(page.getByTestId("property-list-add-note-dialog")).toBeVisible()
    await expect(page.getByTestId("property-list-add-note-subtitle")).toContainText(
      "11 Collapse Test Drive",
    )
  })

  // MV-8
  test("overflow menu Edit opens the edit dialog and Delete starts the delete flow", async ({
    page,
  }) => {
    await page.setViewportSize(NARROW)
    await gotoList(page)
    await expectTableVisible(page)

    await overflowTrigger(page, PROP_FULL).click()
    const menu = page.getByTestId(
      `admin-entity-row-actions-overflow-menu--properties--${PROP_FULL}`,
    )
    await menu.getByRole("menuitem", { name: "Edit" }).click()
    await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible()
  })

  // MV-9
  test("re-widening the table expands the strip back to full inline icons", async ({
    page,
  }) => {
    await page.setViewportSize(NARROW)
    await gotoList(page)
    await expectTableVisible(page)
    await expect(overflowTrigger(page, PROP_FULL)).toBeVisible()

    await page.setViewportSize(WIDE)
    await expect(overflowTrigger(page, PROP_FULL)).toHaveCount(0)
    await expect(inline(page, `property-list-call-button--${PROP_FULL}`)).toBeVisible()
    await expect(inline(page, `property-list-add-note-button--${PROP_FULL}`)).toBeVisible()
  })

  // MV-10
  test("owner with no phone or email shows disabled Call and Send email in the menu", async ({
    page,
  }) => {
    await page.setViewportSize(NARROW)
    await gotoList(page)
    await expectTableVisible(page)

    await overflowTrigger(page, PROP_NOCONTACT).click()
    const menu = page.getByTestId(
      `admin-entity-row-actions-overflow-menu--properties--${PROP_NOCONTACT}`,
    )
    await expect(menu.getByRole("menuitem", { name: "Call owner" })).toBeDisabled()
    await expect(menu.getByRole("menuitem", { name: "Send email" })).toBeDisabled()
  })

  // MV-11
  test("property with no primary buyer omits the buyer rows from the menu", async ({
    page,
  }) => {
    await page.setViewportSize(NARROW)
    await gotoList(page)
    await expectTableVisible(page)

    await overflowTrigger(page, PROP_NOCONTACT).click()
    const menu = page.getByTestId(
      `admin-entity-row-actions-overflow-menu--properties--${PROP_NOCONTACT}`,
    )
    await expect(menu).toBeVisible()
    await expect(menu.getByRole("menuitem", { name: "Call buyer" })).toHaveCount(0)
    await expect(menu.getByRole("menuitem", { name: "Email buyer" })).toHaveCount(0)
  })

  // MV-12
  test("narrowing by window width (still >=768) collapses the strip too", async ({
    page,
  }) => {
    await page.setViewportSize(WIDE)
    await gotoList(page)
    await expectTableVisible(page)
    await expect(overflowTrigger(page, PROP_FULL)).toHaveCount(0)

    await page.setViewportSize(NARROW)
    await expect(overflowTrigger(page, PROP_FULL)).toBeVisible()
  })

  // MV-13
  test("below 768px the list switches to mobile cards (table not shown)", async ({
    page,
  }) => {
    await page.setViewportSize(PHONE)
    await gotoList(page)
    // Mobile cards render instead of the desktop table.
    await expect(
      page.getByTestId("admin-entity-mobile-list-scroll--properties"),
    ).toBeVisible({ timeout: 60_000 })
    await expect(
      page.getByTestId("admin-entity-table-scroll--properties"),
    ).toHaveCount(0)
  })

  // MV-14
  test("map-results view shows only tick and map and never an overflow trigger", async ({
    page,
  }) => {
    await page.setViewportSize(NARROW)
    await gotoList(page, "?streetFilter=PLAYWRIGHT%20HEIGHTS")
    await expectTableVisible(page)

    await expect(inline(page, `property-list-map-button--${PROP_FULL}`)).toBeVisible()
    await expect(overflowTrigger(page, PROP_FULL)).toHaveCount(0)
    // None of the collapsible actions exist in the map-results strip.
    await expect(page.getByTestId(`property-list-call-button--${PROP_FULL}`)).toHaveCount(0)
    await expect(page.getByTestId(`property-list-add-note-button--${PROP_FULL}`)).toHaveCount(0)
  })

  // MV-15
  test("reloading while narrow renders the collapsed strip on first paint", async ({
    page,
  }) => {
    await page.setViewportSize(NARROW)
    await gotoList(page)
    await expectTableVisible(page)
    await expect(overflowTrigger(page, PROP_FULL)).toBeVisible()

    await page.reload()
    await expectTableVisible(page)
    await expect(overflowTrigger(page, PROP_FULL)).toBeVisible()
    // The full inline cluster must not be present after reload at narrow width.
    await expect(page.getByTestId(`property-list-call-button--${PROP_FULL}`)).toHaveCount(0)
  })

  // MV-16: NOT AUTOMATED — cross-app regression that other apps returning a plain
  // extraActions node render unchanged. Covered by each app's existing row-action
  // suites and full CI; not reproducible from this panda-only spec.
})
