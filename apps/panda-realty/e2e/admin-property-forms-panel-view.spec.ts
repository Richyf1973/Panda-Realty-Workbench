import { expect, test } from "@playwright/test"

import { requirePandaE2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"

/**
 * Property Forms admin — always renders as quick-card panel on desktop.
 *
 * Success factors:
 * 1. `/admin/property-forms` on desktop shows `admin-entity-quick-cards-scroll--property-forms`,
 *    never `admin-entity-table-scroll--property-forms`.
 * 2. Each form row renders as `admin-entity-quick-card--property-forms--<id>` with
 *    formName, isActive badge, category (if present), fileName + fileLink (if present).
 * 3. On compact viewport the quick-card layout is NOT shown.
 */

const FORMS_LIST = {
  items: [
    {
      propertyFormId: 1,
      formName: "PRO FORMA CONTRACT 2026",
      category: "Contract",
      description: "Pro forma contract",
      isActive: true,
      fileLink: "https://drive.google.com/file/d/abc123/view",
      fileName: "pro-forma-contract-2026.pdf",
      fileSize: 231936,
      googleDriveFileId: "abc123",
      createdAt: "2026-04-25T10:00:00.000Z",
      updatedAt: null,
    },
    {
      propertyFormId: 2,
      formName: "RENTAL AGREEMENT",
      category: null,
      description: null,
      isActive: false,
      fileLink: null,
      fileName: null,
      fileSize: null,
      googleDriveFileId: null,
      createdAt: "2026-04-25T11:00:00.000Z",
      updatedAt: null,
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

test.describe("Property Forms admin — quick-card panel view (desktop)", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaE2eAdminCredentials()
    await page.setViewportSize({ width: 1280, height: 800 })

    await page.route("**/api/admin/property-forms**", async (route) => {
      const url = route.request().url()
      if (url.includes("/upload") || url.includes("/send") || url.includes("/pre-upload")) {
        await route.continue()
        return
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(FORMS_LIST),
      })
    })

    await signInAsAdmin(page)
  })

  test("shows quick-card scroll, not table scroll, on desktop", async ({ page }) => {
    await page.goto("/admin/property-forms")
    await expect(page.getByTestId("admin-entity-list-card--property-forms")).toBeVisible()

    await expect(page.getByTestId("admin-entity-quick-cards-scroll--property-forms")).toBeVisible()
    await expect(page.getByTestId("admin-entity-table-scroll--property-forms")).toHaveCount(0)
  })

  test("each form renders as a quick card with correct testid", async ({ page }) => {
    await page.goto("/admin/property-forms")
    await expect(page.getByTestId("admin-entity-quick-cards-scroll--property-forms")).toBeVisible()

    await expect(page.getByTestId("admin-entity-quick-card--property-forms--1")).toBeVisible()
    await expect(page.getByTestId("admin-entity-quick-card--property-forms--2")).toBeVisible()
  })

  test("card shows form name and isActive badge", async ({ page }) => {
    await page.goto("/admin/property-forms")
    await expect(page.getByTestId("admin-entity-quick-cards-scroll--property-forms")).toBeVisible()

    const card1 = page.getByTestId("admin-entity-quick-card--property-forms--1")
    await expect(
      card1.getByTestId("admin-entity-quick-card-field--property-forms--formName"),
    ).toContainText("PRO FORMA CONTRACT 2026")
    await expect(
      card1.getByTestId("admin-entity-quick-card-field--property-forms--isActive"),
    ).toBeVisible()
  })

  test("card shows category when present, omits when null", async ({ page }) => {
    await page.goto("/admin/property-forms")
    await expect(page.getByTestId("admin-entity-quick-cards-scroll--property-forms")).toBeVisible()

    // Form 1 has category
    await expect(
      page.getByTestId("admin-entity-quick-card-field--property-forms--category"),
    ).toBeVisible()
    const card1 = page.getByTestId("admin-entity-quick-card--property-forms--1")
    await expect(
      card1.getByTestId("admin-entity-quick-card-field--property-forms--category"),
    ).toContainText("Contract")

    // Form 2 has no category — field element must not appear on that card
    const card2 = page.getByTestId("admin-entity-quick-card--property-forms--2")
    await expect(
      card2.getByTestId("admin-entity-quick-card-field--property-forms--category"),
    ).toHaveCount(0)
  })

  test("card shows fileName when present, omits when null", async ({ page }) => {
    await page.goto("/admin/property-forms")
    await expect(page.getByTestId("admin-entity-quick-cards-scroll--property-forms")).toBeVisible()

    const card1 = page.getByTestId("admin-entity-quick-card--property-forms--1")
    await expect(
      card1.getByTestId("admin-entity-quick-card-field--property-forms--fileName"),
    ).toContainText("pro-forma-contract-2026.pdf")

    const card2 = page.getByTestId("admin-entity-quick-card--property-forms--2")
    await expect(
      card2.getByTestId("admin-entity-quick-card-field--property-forms--fileName"),
    ).toHaveCount(0)
  })

  test("each card has Edit and Delete action buttons", async ({ page }) => {
    await page.goto("/admin/property-forms")
    await expect(page.getByTestId("admin-entity-quick-cards-scroll--property-forms")).toBeVisible()

    const actions1 = page.getByTestId("admin-entity-quick-card-actions--property-forms--1")
    await expect(actions1).toBeVisible()
    await expect(actions1.getByTestId("admin-entity-row-edit--property-forms--1")).toBeVisible()
    await expect(actions1.getByTestId("admin-entity-row-delete--property-forms--1")).toBeVisible()
  })
})

test.describe("Property Forms admin — compact viewport falls back to table", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaE2eAdminCredentials()
    await page.setViewportSize({ width: 375, height: 812 })

    await page.route("**/api/admin/property-forms**", async (route) => {
      const url = route.request().url()
      if (url.includes("/upload") || url.includes("/send") || url.includes("/pre-upload")) {
        await route.continue()
        return
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(FORMS_LIST),
      })
    })

    await signInAsAdmin(page)
  })

  test("quick-card layout NOT shown on compact viewport", async ({ page }) => {
    await page.goto("/admin/property-forms")
    await expect(page.getByTestId("admin-entity-list-card--property-forms")).toBeVisible()

    await expect(page.getByTestId("admin-entity-quick-cards-scroll--property-forms")).toHaveCount(0)
  })
})
