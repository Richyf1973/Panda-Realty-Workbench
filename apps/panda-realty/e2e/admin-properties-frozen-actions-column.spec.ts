import { expect, test, type Page } from "@playwright/test"

import {
  requirePandaE2eAdminCredentials,
  signInAsAdmin,
} from "./helpers/admin-auth"

/**
 * Run (from repo root):
 *   npx playwright test apps/panda-realty/e2e/admin-properties-frozen-actions-column.spec.ts --config=apps/panda-realty/playwright.config.ts
 * Or via workspace script:
 *   npm run test:e2e -w panda-realty -- apps/panda-realty/e2e/admin-properties-frozen-actions-column.spec.ts
 */

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
      propertyListId: 9001,
      streetAddress: "99 E2E Frozen Actions Column Street",
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
      buyerName: null,
      buyerId: null,
      owner1name: "ALEXANDRIA VERY LONG OWNER NAME",
      owner2name: "CHRISTOPHER EXTREMELY LONG SECOND OWNER",
      owner3name: "MARGARET WIDE TABLE THIRD OWNER",
      combinedOwner:
        "ALEXANDRIA VERY LONG OWNER NAME / CHRISTOPHER EXTREMELY LONG SECOND OWNER / MARGARET WIDE TABLE THIRD OWNER",
      isFavorite: false,
      priceUndisclosed: false,
      excludeFromReport: false,
      saleDate: "2021-06-01",
      updatedAt: "2026-01-01T00:00:00Z",
    },
  ],
  totalCount: 1,
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

function getFirstRowActionCell(page: Page) {
  return page
    .locator('[data-testid^="admin-entity-row--properties--"]')
    .first()
    .locator("td")
    .last()
}

test.describe("Panda Realty properties table frozen actions column", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaE2eAdminCredentials()
    await page.setViewportSize({ width: 1024, height: 800 })
    await mockPropertiesList(page)
    await signInAsAdmin(page)
    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-table-scroll--properties")).toBeVisible()
    await expect(
      page.locator('[data-testid^="admin-entity-row--properties--"]').first(),
    ).toBeVisible()
  })

  test("actions header stays pinned on the right and the table overflows horizontally", async ({
    page,
  }) => {
    const scroll = page.getByTestId("admin-entity-table-scroll--properties")
    const header = page.getByTestId(
      "admin-entity-col-header--properties--actions",
    )

    const metrics = await scroll.evaluate((el) => ({
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
    }))
    expect(metrics.scrollWidth).toBeGreaterThan(metrics.clientWidth)

    await expect(header).toBeVisible()
    expect(
      await header.evaluate((el) => getComputedStyle(el).position),
    ).toBe("sticky")
  })

  test("horizontal scrolling keeps a visible frozen-column seam on the actions header", async ({
    page,
  }) => {
    const scroll = page.getByTestId("admin-entity-table-scroll--properties")
    const header = page.getByTestId(
      "admin-entity-col-header--properties--actions",
    )

    await scroll.evaluate((el) => {
      el.scrollLeft = el.scrollWidth
      el.dispatchEvent(new Event("scroll"))
    })

    expect(await header.evaluate((el) => getComputedStyle(el).boxShadow)).not.toBe("none")
  })

  test("body action cells use the same frozen-column seam treatment as the header", async ({
    page,
  }) => {
    const header = page.getByTestId(
      "admin-entity-col-header--properties--actions",
    )
    const actionCell = getFirstRowActionCell(page)

    const headerStyles = await header.evaluate((el) => ({
      position: getComputedStyle(el).position,
      boxShadow: getComputedStyle(el).boxShadow,
    }))
    const cellStyles = await actionCell.evaluate((el) => ({
      position: getComputedStyle(el).position,
      boxShadow: getComputedStyle(el).boxShadow,
    }))

    expect(cellStyles.position).toBe("sticky")
    expect(cellStyles.boxShadow).not.toBe("none")
    expect(cellStyles.boxShadow).toBe(headerStyles.boxShadow)
  })

  test("hovering a row keeps the frozen seam while the sticky actions cell still follows row hover styling", async ({
    page,
  }) => {
    const row = page.locator('[data-testid^="admin-entity-row--properties--"]').first()
    const actionCell = getFirstRowActionCell(page)

    const beforeHover = await actionCell.evaluate((el) => ({
      backgroundColor: getComputedStyle(el).backgroundColor,
      boxShadow: getComputedStyle(el).boxShadow,
    }))

    await row.hover()

    const afterHover = await actionCell.evaluate((el) => ({
      backgroundColor: getComputedStyle(el).backgroundColor,
      boxShadow: getComputedStyle(el).boxShadow,
    }))

    expect(afterHover.boxShadow).toBe(beforeHover.boxShadow)
    expect(afterHover.boxShadow).not.toBe("none")
    expect(afterHover.backgroundColor).not.toBe(beforeHover.backgroundColor)
  })

  test("the frozen-column seam is present at the default scroll position and after reload", async ({
    page,
  }) => {
    const scroll = page.getByTestId("admin-entity-table-scroll--properties")
    const header = page.getByTestId(
      "admin-entity-col-header--properties--actions",
    )

    expect(await scroll.evaluate((el) => el.scrollLeft)).toBe(0)
    expect(await header.evaluate((el) => getComputedStyle(el).boxShadow)).not.toBe("none")

    await page.reload()
    await expect(scroll).toBeVisible()
    await expect(header).toBeVisible()
    expect(await scroll.evaluate((el) => el.scrollLeft)).toBe(0)
    expect(await header.evaluate((el) => getComputedStyle(el).boxShadow)).not.toBe("none")
  })
})
