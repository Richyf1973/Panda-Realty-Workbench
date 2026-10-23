// Run: npm run test:e2e:scratch -- --app=panda-realty --spec="apps/panda-realty/e2e/portal-seller-admin.spec.ts" --no-retry

import { expect, test } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { createStory, shotFocused } from "@repo/e2e-utils"

import { requirePandaE2eAdminListLiveEnv } from "./helpers/admin-auth"
import {
  MOCK_PROPERTY_ID,
  MOCK_SELLER_TOKEN_ACTIVE,
  navigateToPropertyDialog,
  setupMockedPropertyWithSellerPortal,
  setupMockedSellersPage,
} from "./helpers/panda-seller-portal-mocks"

const SHOT_DIR = join(dirname(fileURLToPath(import.meta.url)), "screenshots", "portal-seller-admin")

const story = createStory({ specUrl: import.meta.url, slug: "portal-seller-admin" })
story.setWhatWasBuilt(
  "Seller Portal Phase 1 Admin UI: a Seller Portal inline column on /admin/sellers with " +
  "per-row Generate/Copy controls, and a Seller Portal access panel in the property edit dialog " +
  "with generate, copy, revoke, and revoked-state flows.",
)

test.beforeAll(() => {
  requirePandaE2eAdminListLiveEnv()
})

test.beforeEach(async () => {
  await mkdir(SHOT_DIR, { recursive: true })
})

test.afterAll(() => {
  story.write()
})

// ── Admin sellers page — inline Portal column (mocked) ────────────────────────

test.describe("Sellers Admin Page — Portal Column", () => {
  test.beforeEach(async () => {
    test.setTimeout(90_000)
  })

  test("Sellers page — Portal column header is visible", async ({ page }) => {
    await setupMockedSellersPage(page, null)
    await page.goto("/admin/sellers")
    await expect(page.getByTestId("admin-sellers-page")).toBeVisible({ timeout: 20_000 })
    const colHeader = page.getByTestId("admin-sellers-col-portal")
    await expect(colHeader).toBeVisible({ timeout: 10_000 })

    await shotFocused(page, colHeader, SHOT_DIR, "01-sellers-portal-col")
    story.addScene({
      title: "01 — Sellers Admin: Portal Column",
      images: [join(SHOT_DIR, "01-sellers-portal-col.png")],
      seeing: "Portal column header is visible in the sellers admin table.",
      steps: ["Navigate to /admin/sellers", "Portal column header visible in table"],
    })
  })

  test("Sellers page — Generate link button visible per row", async ({ page }) => {
    await setupMockedSellersPage(page, null)
    await page.goto("/admin/sellers")
    await expect(page.getByTestId("admin-sellers-page")).toBeVisible({ timeout: 20_000 })
    const generateBtn = page.getByTestId(`admin-sellers-portal-generate-btn--${MOCK_PROPERTY_ID}`)
    await expect(generateBtn).toBeVisible({ timeout: 10_000 })

    await shotFocused(page, generateBtn, SHOT_DIR, "02-sellers-generate-btn")
    story.addScene({
      title: "02 — Sellers Admin: Generate Link Button",
      images: [join(SHOT_DIR, "02-sellers-generate-btn.png")],
      seeing: "Generate link button is visible per row in the Portal column when no token exists.",
      steps: ["Navigate to /admin/sellers", "Each seller row shows a Generate link button in the Portal column"],
    })
  })

  test("Sellers page — after generate: URL shown inline with Copy button", async ({ page }) => {
    await setupMockedSellersPage(page, null)
    await page.goto("/admin/sellers")
    await expect(page.getByTestId("admin-sellers-page")).toBeVisible({ timeout: 20_000 })
    await page.getByTestId(`admin-sellers-portal-generate-btn--${MOCK_PROPERTY_ID}`).click()
    const urlDisplay = page.getByTestId(`admin-sellers-portal-url--${MOCK_PROPERTY_ID}`)
    await expect(urlDisplay).toBeVisible({ timeout: 10_000 })
    await expect(urlDisplay).toContainText("/portal/seller/")
    const copyBtn = page.getByTestId(`admin-sellers-portal-copy-btn--${MOCK_PROPERTY_ID}`)
    await expect(copyBtn).toBeVisible()

    await shotFocused(page, page.getByTestId(`admin-sellers-portal-cell--${MOCK_PROPERTY_ID}`), SHOT_DIR, "03-sellers-url-shown")
    story.addScene({
      title: "03 — Sellers Admin: URL Shown After Generate",
      images: [join(SHOT_DIR, "03-sellers-url-shown.png")],
      seeing: "After clicking Generate, the seller portal URL appears inline with a Copy button.",
      steps: ["Click Generate link", "URL appears inline in the Portal cell with Copy button"],
    })
  })

  test("Sellers page — active token shows URL without generating", async ({ page }) => {
    await setupMockedSellersPage(page, MOCK_SELLER_TOKEN_ACTIVE)
    await page.goto("/admin/sellers")
    await expect(page.getByTestId("admin-sellers-page")).toBeVisible({ timeout: 20_000 })
    const urlDisplay = page.getByTestId(`admin-sellers-portal-url--${MOCK_PROPERTY_ID}`)
    await expect(urlDisplay).toBeVisible({ timeout: 10_000 })
    await expect(urlDisplay).toContainText("/portal/seller/")
  })
})

// ── Property page — Seller Portal section (mocked) ───────────────────────────

test.describe("Property Page — Seller Portal Panel", () => {
  test.beforeEach(async () => {
    test.setTimeout(120_000)
  })

  test("Property edit dialog — Seller Portal access panel visible in owners section", async ({ page }) => {
    await setupMockedPropertyWithSellerPortal(page, null)
    const dialog = await navigateToPropertyDialog(page)
    const panel = dialog.getByTestId("portal-seller-access-panel")
    await expect(panel).toBeVisible({ timeout: 15_000 })

    await shotFocused(page, panel, SHOT_DIR, "04-property-seller-panel")
    story.addScene({
      title: "04 — Property Page: Seller Portal Access Panel",
      images: [join(SHOT_DIR, "04-property-seller-panel.png")],
      seeing: "Seller Portal access panel is visible inside the property edit dialog.",
      steps: ["Open property edit dialog", "Seller Portal access panel visible in owners section"],
    })
  })

  test("Property page — no-token state shows Generate seller link button", async ({ page }) => {
    await setupMockedPropertyWithSellerPortal(page, null)
    const dialog = await navigateToPropertyDialog(page)
    const panel = dialog.getByTestId("portal-seller-access-panel")
    await expect(panel).toBeVisible({ timeout: 15_000 })
    const generateBtn = panel.getByTestId("portal-seller-generate-btn")
    await expect(generateBtn).toBeVisible({ timeout: 5_000 })

    await shotFocused(page, generateBtn, SHOT_DIR, "05-property-seller-generate")
    story.addScene({
      title: "05 — Property Page: Seller Portal Generate Button",
      images: [join(SHOT_DIR, "05-property-seller-generate.png")],
      seeing: "Generate seller link button is visible when no seller token exists.",
      steps: ["Open property edit dialog", "Seller Portal panel shows no-token state with Generate button"],
    })
  })

  test("Property page — generate shows URL with Copy and Revoke; Last visited: never opened", async ({ page }) => {
    await setupMockedPropertyWithSellerPortal(page, null)
    const dialog = await navigateToPropertyDialog(page)
    const panel = dialog.getByTestId("portal-seller-access-panel")
    await expect(panel).toBeVisible({ timeout: 15_000 })
    await panel.getByTestId("portal-seller-generate-btn").click()
    const urlDisplay = panel.getByTestId("portal-seller-url-display")
    await expect(urlDisplay).toBeVisible({ timeout: 10_000 })
    await expect(urlDisplay).toContainText("/portal/seller/")
    await expect(panel.getByTestId("portal-seller-copy-btn")).toBeVisible()
    await expect(panel.getByTestId("portal-seller-revoke-btn")).toBeVisible()
    const lastVisited = panel.getByTestId("portal-seller-last-visited")
    await expect(lastVisited).toBeVisible()
    await expect(lastVisited).toContainText(/never opened/i)

    await shotFocused(page, panel, SHOT_DIR, "06-property-seller-active")
    story.addScene({
      title: "06 — Property Page: Seller Portal Active Token",
      images: [join(SHOT_DIR, "06-property-seller-active.png")],
      seeing: "After generating, URL appears with Copy and Revoke buttons; Last visited shows never opened.",
      steps: ["Click Generate seller link", "URL, Copy, Revoke, and last-visited all visible"],
    })
  })

  test("Property page — Revoke opens confirmation dialog", async ({ page }) => {
    await setupMockedPropertyWithSellerPortal(page, MOCK_SELLER_TOKEN_ACTIVE)
    const dialog = await navigateToPropertyDialog(page)
    const panel = dialog.getByTestId("portal-seller-access-panel")
    await expect(panel).toBeVisible({ timeout: 15_000 })
    const revokeBtn = panel.getByTestId("portal-seller-revoke-btn")
    await expect(revokeBtn).toBeVisible({ timeout: 5_000 })
    await revokeBtn.click()
    const revokeDialog = page.getByTestId("portal-seller-revoke-dialog")
    await expect(revokeDialog).toBeVisible({ timeout: 5_000 })

    await shotFocused(page, revokeDialog, SHOT_DIR, "07-seller-revoke-dialog")
    story.addScene({
      title: "07 — Property Page: Seller Portal Revoke Dialog",
      images: [join(SHOT_DIR, "07-seller-revoke-dialog.png")],
      seeing: "Clicking Revoke opens a confirmation dialog before revoking the seller link.",
      steps: ["Click Revoke access in Seller Portal panel", "Confirmation dialog appears"],
    })
  })

  test("Property page — confirm revoke shows revoked state with Generate new link", async ({ page }) => {
    await setupMockedPropertyWithSellerPortal(page, MOCK_SELLER_TOKEN_ACTIVE)
    const dialog = await navigateToPropertyDialog(page)
    const panel = dialog.getByTestId("portal-seller-access-panel")
    await expect(panel).toBeVisible({ timeout: 15_000 })
    await panel.getByTestId("portal-seller-revoke-btn").click()
    const revokeDialog = page.getByTestId("portal-seller-revoke-dialog")
    await expect(revokeDialog).toBeVisible({ timeout: 5_000 })
    await revokeDialog.getByTestId("portal-seller-revoke-confirm-btn").click()
    const revokedStatus = panel.getByTestId("portal-seller-revoked-status")
    await expect(revokedStatus).toBeVisible({ timeout: 10_000 })
    await expect(revokedStatus).toContainText(/revoked/i)
    await expect(panel.getByTestId("portal-seller-regen-btn")).toBeVisible()

    await shotFocused(page, panel, SHOT_DIR, "08-seller-revoked-state")
    story.addScene({
      title: "08 — Property Page: Seller Portal Revoked State",
      images: [join(SHOT_DIR, "08-seller-revoked-state.png")],
      seeing: "After confirming revocation, panel shows revoked status with Generate new link button.",
      steps: ["Click Revoke → Confirm", "Panel shows revoked state with date and regen button"],
    })
  })
})
