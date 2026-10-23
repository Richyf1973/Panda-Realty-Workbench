/**
 * TDD spec: Sellers page must only show owners from properties where isFavorite = true.
 * Manual verification: specs/panda-realty-sellers-from-all-properties.md
 */

import { expect, test } from "@playwright/test"

import { requirePandaE2eAdminListLiveEnv, signInAsAdmin } from "./helpers/admin-auth"
import { deleteSellerProperty, seedSellerProperty } from "./helpers/sellers-db"

test.describe("Panda Realty — Sellers page: isFavorite filter", () => {
  test.describe.configure({ timeout: 120_000 })

  let favPropertyId: number
  let nonFavPropertyId: number

  const FAV_OWNER = `E2E Seller Fav ${Date.now()}`
  const NON_FAV_OWNER = `E2E Seller NonFav ${Date.now()}`

  test.beforeAll(async () => {
    requirePandaE2eAdminListLiveEnv()
    favPropertyId = await seedSellerProperty({
      streetAddress: "1 Fav Test Street",
      owner1name: FAV_OWNER,
      isFavorite: true,
    })
    nonFavPropertyId = await seedSellerProperty({
      streetAddress: "2 NonFav Test Street",
      owner1name: NON_FAV_OWNER,
      isFavorite: false,
    })
  })

  test.afterAll(async () => {
    await deleteSellerProperty(favPropertyId)
    await deleteSellerProperty(nonFavPropertyId)
  })

  test.beforeEach(async ({ page }) => {
    await signInAsAdmin(page)
    await page.goto("/admin/sellers", { timeout: 90_000 })
    await expect(page.getByTestId("admin-sellers-page")).toBeVisible()
  })

  // ── Happy path ───────────────────────────────────────────────────────────────

  test("owner from a favorite property appears in the Sellers table", async ({ page }) => {
    await expect(page.getByText(FAV_OWNER)).toBeVisible()
  })

  // ── Exclusion ────────────────────────────────────────────────────────────────

  test("owner from a non-favorite property does NOT appear in the Sellers table", async ({ page }) => {
    await expect(page.getByText(NON_FAV_OWNER)).not.toBeVisible()
  })

  // ── Persistence check ────────────────────────────────────────────────────────

  test("result survives a hard reload — filter is server-side", async ({ page }) => {
    await page.reload()
    await expect(page.getByTestId("admin-sellers-page")).toBeVisible()
    await expect(page.getByText(FAV_OWNER)).toBeVisible()
    await expect(page.getByText(NON_FAV_OWNER)).not.toBeVisible()
  })

  // ── Table structure ──────────────────────────────────────────────────────────

  test("Sellers table renders Name, Address, Phone, Email columns — no Property column", async ({ page }) => {
    await expect(page.getByTestId("admin-sellers-col-name")).toBeVisible()
    await expect(page.getByTestId("admin-sellers-col-address")).toBeVisible()
    await expect(page.getByTestId("admin-sellers-col-phone")).toBeVisible()
    await expect(page.getByTestId("admin-sellers-col-email")).toBeVisible()
    await expect(page.getByTestId("admin-sellers-col-property")).toHaveCount(0)
  })
})
