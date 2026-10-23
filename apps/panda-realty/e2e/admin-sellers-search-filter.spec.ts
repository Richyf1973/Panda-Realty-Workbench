/**
 * TDD spec: Sellers page search filter (Name, Address, Phone, Email) + Property column removed.
 * Manual verification: specs/panda-realty-sellers-search-filter.md
 */

import { expect, test } from "@playwright/test"

import { requirePandaE2eAdminListLiveEnv, signInAsAdmin } from "./helpers/admin-auth"
import { deleteSellerProperty, seedSellerProperty } from "./helpers/sellers-db"

test.describe("Panda Realty — Sellers page: search filter + column changes", () => {
  test.describe.configure({ timeout: 120_000 })

  const TS = Date.now()
  const SELLER_NAME = `E2E Search Seller ${TS}`
  const SELLER_ADDR = `SR${TS} Test Lane`
  const SELLER_PHONE = `040${String(TS).slice(-7)}`
  const SELLER_EMAIL = `e2e-search-${TS}@test.local`
  const OTHER_NAME = `E2E Other Seller ${TS}`

  let sellerId: number
  let otherId: number

  test.beforeAll(async () => {
    requirePandaE2eAdminListLiveEnv()
    sellerId = await seedSellerProperty({
      streetAddress: "1 Filter Test Street",
      owner1name: SELLER_NAME,
      owner1address: SELLER_ADDR,
      owner1phone: SELLER_PHONE,
      owner1email: SELLER_EMAIL,
      isFavorite: true,
    })
    otherId = await seedSellerProperty({
      streetAddress: "2 Filter Other Street",
      owner1name: OTHER_NAME,
      isFavorite: true,
    })
  })

  test.afterAll(async () => {
    await deleteSellerProperty(sellerId)
    await deleteSellerProperty(otherId)
  })

  test.beforeEach(async ({ page }) => {
    await signInAsAdmin(page)
    await page.goto("/admin/sellers", { timeout: 90_000 })
    await expect(page.getByTestId("admin-sellers-page")).toBeVisible()
  })

  // ── Column structure ──────────────────────────────────────────────────────────

  test("table has exactly 4 columns: Name, Address, Phone, Email — no Property column", async ({ page }) => {
    await expect(page.getByTestId("admin-sellers-col-name")).toBeVisible()
    await expect(page.getByTestId("admin-sellers-col-address")).toBeVisible()
    await expect(page.getByTestId("admin-sellers-col-phone")).toBeVisible()
    await expect(page.getByTestId("admin-sellers-col-email")).toBeVisible()
    await expect(page.getByTestId("admin-sellers-col-property")).toHaveCount(0)
  })

  // ── Search input presence ─────────────────────────────────────────────────────

  test("search input is visible on page load", async ({ page }) => {
    await expect(page.getByTestId("admin-sellers-search-input")).toBeVisible()
  })

  // ── Search by name ────────────────────────────────────────────────────────────

  test("typing a partial name filters to matching rows only", async ({ page }) => {
    const input = page.getByTestId("admin-sellers-search-input")
    await input.fill(SELLER_NAME.slice(0, 12))
    await expect(page).toHaveURL(/[?&]q=/, { timeout: 2_000 })
    await expect(page.getByText(SELLER_NAME)).toBeVisible()
    await expect(page.getByText(OTHER_NAME)).not.toBeVisible()
  })

  // ── Search by address ─────────────────────────────────────────────────────────

  test("typing a partial address filters to matching rows", async ({ page }) => {
    const input = page.getByTestId("admin-sellers-search-input")
    await input.fill(SELLER_ADDR.slice(0, 6))
    await expect(page).toHaveURL(/[?&]q=/, { timeout: 2_000 })
    await expect(page.getByText(SELLER_NAME)).toBeVisible()
    await expect(page.getByText(OTHER_NAME)).not.toBeVisible()
  })

  // ── Search by phone ───────────────────────────────────────────────────────────

  test("typing a partial phone filters to matching rows", async ({ page }) => {
    const input = page.getByTestId("admin-sellers-search-input")
    await input.fill(SELLER_PHONE.slice(0, 6))
    await expect(page).toHaveURL(/[?&]q=/, { timeout: 2_000 })
    await expect(page.getByText(SELLER_NAME)).toBeVisible()
    await expect(page.getByText(OTHER_NAME)).not.toBeVisible()
  })

  // ── Search by email ───────────────────────────────────────────────────────────

  test("typing a partial email filters to matching rows", async ({ page }) => {
    const input = page.getByTestId("admin-sellers-search-input")
    await input.fill(SELLER_EMAIL.slice(0, 14))
    await expect(page).toHaveURL(/[?&]q=/, { timeout: 2_000 })
    await expect(page.getByText(SELLER_NAME)).toBeVisible()
    await expect(page.getByText(OTHER_NAME)).not.toBeVisible()
  })

  // ── No-match state ────────────────────────────────────────────────────────────

  test("search with no matching results shows empty state message", async ({ page }) => {
    const input = page.getByTestId("admin-sellers-search-input")
    await input.fill("zzzzzz-nomatch-zzzzzz")
    await expect(page).toHaveURL(/[?&]q=/, { timeout: 2_000 })
    await expect(page.getByText("No seller records found.")).toBeVisible()
  })

  // ── Clearing search restores full list ────────────────────────────────────────

  test("clearing the search input restores the full list", async ({ page }) => {
    const input = page.getByTestId("admin-sellers-search-input")
    await input.fill(SELLER_NAME.slice(0, 12))
    await expect(page).toHaveURL(/[?&]q=/, { timeout: 2_000 })
    await input.clear()
    await expect(page).not.toHaveURL(/[?&]q=[^&]/, { timeout: 2_000 })
    await expect(page.getByText(SELLER_NAME)).toBeVisible()
    await expect(page.getByText(OTHER_NAME)).toBeVisible()
  })

  // ── URL reflects query / page resets ─────────────────────────────────────────

  test("URL updates to include q param when typing", async ({ page }) => {
    const input = page.getByTestId("admin-sellers-search-input")
    await input.fill("test")
    await expect(page).toHaveURL(/[?&]q=test/, { timeout: 2_000 })
  })

  // ── Persistence — server-side rendering ──────────────────────────────────────

  test("navigating directly to URL with q param pre-fills input and filters results", async ({ page }) => {
    await page.goto(`/admin/sellers?q=${encodeURIComponent(SELLER_NAME.slice(0, 12))}`, { timeout: 90_000 })
    await expect(page.getByTestId("admin-sellers-page")).toBeVisible()
    await expect(page.getByTestId("admin-sellers-search-input")).toHaveValue(SELLER_NAME.slice(0, 12))
    await expect(page.getByText(SELLER_NAME)).toBeVisible()
    await expect(page.getByText(OTHER_NAME)).not.toBeVisible()
  })
})
