import { expect, test } from "@playwright/test"

import {
  e2eAdminCredentials,
  e2ePandaAdminListApiConfigured,
  signInAsAdmin,
} from "./helpers/admin-auth"

test.describe("Panda Realty — Master List: People links (Sellers / Buyers / Contacts / Tenants)", () => {
  // Sellers page compiles on first request in dev mode — allow extra time
  test.describe.configure({ timeout: 120_000 })

  test.beforeEach(async ({ page }) => {
    test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")
    await signInAsAdmin(page)
    // Pre-warm the sellers page so first-request Next.js compilation doesn't timeout individual tests
    await page.goto("/admin/sellers", { timeout: 90_000 })
    await page.goto("/admin")
    // Expand the Master List if it is collapsed
    const toggle = page.getByTestId("admin-sidebar-master-list-toggle")
    const expanded = await toggle.getAttribute("aria-expanded")
    if (expanded !== "true") {
      await toggle.click()
    }
  })

  // ── Happy path: People section presence ────────────────────────────────────

  test("Master List shows a People group label and divider", async ({ page }) => {
    await expect(page.getByTestId("admin-sidebar-people-section")).toBeVisible()
  })

  test("Master List shows Sellers link", async ({ page }) => {
    await expect(page.getByTestId("admin-layout-nav-link--sellers")).toBeVisible()
    await expect(page.getByTestId("admin-layout-nav-link--sellers")).toContainText("Sellers")
  })

  test("Master List shows Buyers link", async ({ page }) => {
    await expect(page.getByTestId("admin-layout-nav-link--buyers")).toBeVisible()
    await expect(page.getByTestId("admin-layout-nav-link--buyers")).toContainText("Buyers")
  })

  test("Master List shows Contacts link", async ({ page }) => {
    await expect(page.getByTestId("admin-layout-nav-link--contacts")).toBeVisible()
    await expect(page.getByTestId("admin-layout-nav-link--contacts")).toContainText("Contacts")
  })

  test("Master List shows Tenants link", async ({ page }) => {
    await expect(page.getByTestId("admin-layout-nav-link--tenants")).toBeVisible()
    await expect(page.getByTestId("admin-layout-nav-link--tenants")).toContainText("Tenants")
  })

  // ── Happy path: Navigation targets ─────────────────────────────────────────

  test("Sellers link navigates to /admin/sellers", async ({ page }) => {
    await page.getByTestId("admin-layout-nav-link--sellers").click()
    await expect(page).toHaveURL("/admin/sellers", { timeout: 60_000 })
    await expect(page.getByTestId("admin-sellers-page")).toBeVisible()
  })

  test("Sellers page shows owner table with expected columns", async ({ page }) => {
    test.skip(
      !e2ePandaAdminListApiConfigured,
      "DATABASE_URL not set — sellers page uses live API",
    )
    await page.goto("/admin/sellers", { timeout: 60_000 })
    await expect(page.getByTestId("admin-sellers-page")).toBeVisible()
    // Column headers must be present
    await expect(page.getByTestId("admin-sellers-col-name")).toBeVisible()
    await expect(page.getByTestId("admin-sellers-col-address")).toBeVisible()
    await expect(page.getByTestId("admin-sellers-col-phone")).toBeVisible()
    await expect(page.getByTestId("admin-sellers-col-email")).toBeVisible()
    await expect(page.getByTestId("admin-sellers-col-property")).toHaveCount(0)
  })

  test("Buyers link navigates to /admin/entities with entityCategoryId=1", async ({ page }) => {
    await page.getByTestId("admin-layout-nav-link--buyers").click()
    await expect(page).toHaveURL(/\/admin\/entities.*entityCategoryId=1/)
  })

  test("Contacts link navigates to the dedicated /admin/contacts page", async ({ page }) => {
    await page.getByTestId("admin-layout-nav-link--contacts").click()
    await expect(page).toHaveURL(/\/admin\/contacts/)
  })

  test("Tenants link navigates to /admin/entities with entityCategoryId=3", async ({ page }) => {
    await page.getByTestId("admin-layout-nav-link--tenants").click()
    await expect(page).toHaveURL(/\/admin\/entities.*entityCategoryId=3/)
  })

  // ── Active state ────────────────────────────────────────────────────────────

  test("Sellers link is highlighted as active when on /admin/sellers", async ({ page }) => {
    await page.goto("/admin/sellers", { timeout: 60_000 })
    const toggle = page.getByTestId("admin-sidebar-master-list-toggle")
    const expanded = await toggle.getAttribute("aria-expanded")
    if (expanded !== "true") await toggle.click()
    await expect(page.getByTestId("admin-layout-nav-link--sellers")).toHaveAttribute(
      "aria-current",
      "page",
    )
  })

  test("Buyers link is highlighted as active when on /admin/entities?entityCategoryId=1", async ({ page }) => {
    await page.goto("/admin/entities?entityCategoryId=1")
    const toggle = page.getByTestId("admin-sidebar-master-list-toggle")
    const expanded = await toggle.getAttribute("aria-expanded")
    if (expanded !== "true") await toggle.click()
    await expect(page.getByTestId("admin-layout-nav-link--buyers")).toHaveAttribute(
      "aria-current",
      "page",
    )
  })

  test("Contacts link is highlighted as active when on /admin/contacts", async ({ page }) => {
    await page.goto("/admin/contacts")
    const toggle = page.getByTestId("admin-sidebar-master-list-toggle")
    const expanded = await toggle.getAttribute("aria-expanded")
    if (expanded !== "true") await toggle.click()
    await expect(page.getByTestId("admin-layout-nav-link--contacts")).toHaveAttribute(
      "aria-current",
      "page",
    )
  })

  test("Tenants link is highlighted as active when on /admin/entities?entityCategoryId=3", async ({ page }) => {
    await page.goto("/admin/entities?entityCategoryId=3")
    const toggle = page.getByTestId("admin-sidebar-master-list-toggle")
    const expanded = await toggle.getAttribute("aria-expanded")
    if (expanded !== "true") await toggle.click()
    await expect(page.getByTestId("admin-layout-nav-link--tenants")).toHaveAttribute(
      "aria-current",
      "page",
    )
  })

  // ── Master List auto-opens when navigating directly to a people URL ─────────

  test("Master List auto-expands when navigating directly to /admin/sellers", async ({ page }) => {
    // Navigate without going through the sidebar (simulates direct URL entry)
    await page.goto("/admin/sellers", { timeout: 60_000 })
    await expect(
      page.getByTestId("admin-sidebar-master-list-toggle"),
    ).toHaveAttribute("aria-expanded", "true")
  })

  test("Master List auto-expands when navigating directly to /admin/entities?entityCategoryId=1", async ({ page }) => {
    await page.goto("/admin/entities?entityCategoryId=1")
    await expect(
      page.getByTestId("admin-sidebar-master-list-toggle"),
    ).toHaveAttribute("aria-expanded", "true")
  })

  // ── Edge case: empty state on sellers page ──────────────────────────────────

  test("Sellers page renders without error when there are no owner records", async ({ page }) => {
    test.skip(
      !e2ePandaAdminListApiConfigured,
      "DATABASE_URL not set — sellers page uses live API",
    )
    await page.goto("/admin/sellers", { timeout: 60_000 })
    await expect(page.getByTestId("admin-sellers-page")).toBeVisible()
    // No JS errors
    const errors: string[] = []
    page.on("pageerror", (e) => errors.push(e.message))
    await page.waitForLoadState("networkidle")
    expect(errors).toHaveLength(0)
  })
})
