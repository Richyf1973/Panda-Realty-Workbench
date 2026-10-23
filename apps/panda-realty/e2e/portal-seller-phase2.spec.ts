// Run: npm run test:e2e:scratch -- --app=panda-realty --spec="apps/panda-realty/e2e/portal-seller-phase2.spec.ts" --no-retry

import { expect, test } from "@playwright/test"
import { existsSync } from "node:fs"
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { createStory, shotFocused } from "@repo/e2e-utils"

import { requirePandaE2eAdminListLiveEnv } from "./helpers/admin-auth"
import { createOrGetSellerToken, FIXTURE_A } from "./helpers/panda-seller-portal-mocks"

const ADMIN_AUTH_PATH = join(dirname(fileURLToPath(import.meta.url)), ".auth", "admin.json")

// propertyListId 223319 — 99 E2E Seed Street — sale_price $500,000, contract_date 2026-05-16,
// 3 buyer offers (1 accepted to E2E Seed Buyer)
const FIXTURE_C = { propertyListId: 223319 }

const SHOT_DIR = join(dirname(fileURLToPath(import.meta.url)), "screenshots", "portal-seller-phase2")

const story = createStory({ specUrl: import.meta.url, slug: "portal-seller-phase2" })
story.setWhatWasBuilt(
  "Seller Portal Phase 2: wires all 5 tab content sections — Summary (sale price), " +
  "Conditions timeline (buyer offer deadlines via PortalConditionTimeline), " +
  "Documents (sharedWithSeller flag + seller file proxy), " +
  "Offers (all-time property offers with buyer names), " +
  "Messages (separate seller thread). Tabs are interactive with URL persistence (?tab=...).",
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

// All portal content tests share two tokens created in a single beforeAll.
// Tokens live inside the describe closure so they survive across tests.

test.describe("Seller Portal Phase 2 — Content Sections", () => {
  let tokenC = ""
  let tokenA = ""

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(120_000)
    const storageState = existsSync(ADMIN_AUTH_PATH) ? ADMIN_AUTH_PATH : undefined
    const ctx = await browser.newContext(storageState ? { storageState } : {})
    const p = await ctx.newPage()
    const c = await createOrGetSellerToken(p, FIXTURE_C)
    tokenC = c.token
    const a = await createOrGetSellerToken(p, FIXTURE_A)
    tokenA = a.token
    await ctx.close()
  })

  // ── Summary tab ───────────────────────────────────────────────────────────────

  test("sale price is visible in property header", async ({ page }) => {
    test.setTimeout(30_000)
    await page.goto(`/portal/seller/${tokenC}`)
    const shell = page.getByTestId("portal-seller-shell")
    await expect(shell).toBeVisible({ timeout: 10_000 })

    const salePrice = page.getByTestId("portal-seller-sale-price")
    await expect(salePrice).toBeVisible({ timeout: 5_000 })
    await expect(salePrice).toContainText(/500[\s,]?000|\$500/)

    await shotFocused(page, salePrice, SHOT_DIR, "01-sale-price")
    story.addScene({
      title: "01 — Summary Tab: Sale Price in Property Header",
      images: [join(SHOT_DIR, "01-sale-price.png")],
      seeing: "Sale price ($500,000) is displayed in the seller portal property header.",
      steps: [
        "Navigate to seller portal URL for 99 E2E Seed Street",
        "Sale price element visible and shows $500,000",
      ],
    })
  })

  test("Summary tab is active by default and shows real content", async ({ page }) => {
    test.setTimeout(30_000)
    await page.goto(`/portal/seller/${tokenC}`)
    await expect(page.getByTestId("portal-seller-shell")).toBeVisible({ timeout: 10_000 })

    const content = page.getByTestId("portal-seller-summary-tab")
    await expect(content).toBeVisible({ timeout: 5_000 })
    await expect(content).not.toContainText("Content coming soon")

    await shotFocused(page, content, SHOT_DIR, "02-summary-default")
    story.addScene({
      title: "02 — Summary Tab: Default Active Tab",
      images: [join(SHOT_DIR, "02-summary-default.png")],
      seeing: "Summary tab is active by default with real property content (no placeholder text).",
      steps: [
        "Navigate to seller portal URL with no ?tab param",
        "Summary tab content is visible and not placeholder",
      ],
    })
  })

  // ── Conditions tab ────────────────────────────────────────────────────────────

  test("clicking Conditions tab updates URL to ?tab=conditions", async ({ page }) => {
    test.setTimeout(30_000)
    await page.goto(`/portal/seller/${tokenC}`)
    await expect(page.getByTestId("portal-seller-shell")).toBeVisible({ timeout: 10_000 })
    await page.getByTestId("portal-seller-tab--conditions").click()
    await expect(page).toHaveURL(/[?&]tab=conditions/, { timeout: 5_000 })
  })

  test("conditions timeline renders for property with accepted offer and contract date", async ({ page }) => {
    test.setTimeout(30_000)
    await page.goto(`/portal/seller/${tokenC}?tab=conditions`)
    await expect(page.getByTestId("portal-seller-shell")).toBeVisible({ timeout: 10_000 })

    const timeline = page.getByTestId("portal-condition-timeline")
    await expect(timeline).toBeVisible({ timeout: 5_000 })

    await shotFocused(page, timeline, SHOT_DIR, "03-conditions-timeline")
    story.addScene({
      title: "03 — Conditions Tab: Timeline Renders",
      images: [join(SHOT_DIR, "03-conditions-timeline.png")],
      seeing: "Conditions timeline shows condition rows pulled from the accepted buyer offer.",
      steps: [
        "Navigate to seller portal with ?tab=conditions",
        "Conditions timeline is visible with condition rows",
      ],
    })
  })

  test("conditions empty state shown when no contract date (FIXTURE_A)", async ({ page }) => {
    test.setTimeout(30_000)
    await page.goto(`/portal/seller/${tokenA}?tab=conditions`)
    await expect(page.getByTestId("portal-seller-shell")).toBeVisible({ timeout: 10_000 })
    const empty = page.getByTestId("portal-condition-timeline-empty")
    await expect(empty).toBeVisible({ timeout: 5_000 })

    await shotFocused(page, empty, SHOT_DIR, "04-conditions-empty")
    story.addScene({
      title: "04 — Conditions Tab: Empty State (No Contract Date)",
      images: [join(SHOT_DIR, "04-conditions-empty.png")],
      seeing: "Conditions empty state shown when property has no contract date set.",
      steps: [
        "Navigate to FIXTURE_A seller portal with ?tab=conditions (no contract date)",
        "Empty state message is visible",
      ],
    })
  })

  // ── Documents tab ─────────────────────────────────────────────────────────────

  test("clicking Documents tab updates URL to ?tab=documents", async ({ page }) => {
    test.setTimeout(30_000)
    await page.goto(`/portal/seller/${tokenC}`)
    await expect(page.getByTestId("portal-seller-shell")).toBeVisible({ timeout: 10_000 })
    await page.getByTestId("portal-seller-tab--documents").click()
    await expect(page).toHaveURL(/[?&]tab=documents/, { timeout: 5_000 })
  })

  test("documents empty state shown when no seller files shared", async ({ page }) => {
    test.setTimeout(30_000)
    await page.goto(`/portal/seller/${tokenC}?tab=documents`)
    await expect(page.getByTestId("portal-seller-shell")).toBeVisible({ timeout: 10_000 })
    const empty = page.getByTestId("portal-documents-empty")
    await expect(empty).toBeVisible({ timeout: 5_000 })

    await shotFocused(page, empty, SHOT_DIR, "05-documents-empty")
    story.addScene({
      title: "05 — Documents Tab: Empty State",
      images: [join(SHOT_DIR, "05-documents-empty.png")],
      seeing: "Documents empty state shown when no files have been shared with the seller.",
      steps: [
        "Navigate to seller portal with ?tab=documents",
        "No seller files shared — empty state visible",
      ],
    })
  })

  // ── Offers tab ────────────────────────────────────────────────────────────────

  test("clicking Offers tab updates URL to ?tab=offers", async ({ page }) => {
    test.setTimeout(30_000)
    await page.goto(`/portal/seller/${tokenC}`)
    await expect(page.getByTestId("portal-seller-shell")).toBeVisible({ timeout: 10_000 })
    await page.getByTestId("portal-seller-tab--offers").click()
    await expect(page).toHaveURL(/[?&]tab=offers/, { timeout: 5_000 })
  })

  test("all 3 offers are visible with buyer names", async ({ page }) => {
    test.setTimeout(30_000)
    await page.goto(`/portal/seller/${tokenC}?tab=offers`)
    await expect(page.getByTestId("portal-seller-shell")).toBeVisible({ timeout: 10_000 })

    const offers = page.getByTestId("portal-seller-offers")
    await expect(offers).toBeVisible({ timeout: 5_000 })
    await expect(page.getByTestId("portal-seller-offer-row")).toHaveCount(3, { timeout: 5_000 })
    await expect(offers).toContainText(/E2E Seed Buyer/i)

    await shotFocused(page, offers, SHOT_DIR, "06-offers-list")
    story.addScene({
      title: "06 — Offers Tab: All Offers With Buyer Names",
      images: [join(SHOT_DIR, "06-offers-list.png")],
      seeing: "All 3 buyer offers for the property shown with buyer names and amounts.",
      steps: [
        "Navigate to seller portal with ?tab=offers",
        "All 3 offer rows visible; buyer names shown",
      ],
    })
  })

  test("accepted offer has an accepted indicator", async ({ page }) => {
    test.setTimeout(30_000)
    await page.goto(`/portal/seller/${tokenC}?tab=offers`)
    await expect(page.getByTestId("portal-seller-shell")).toBeVisible({ timeout: 10_000 })
    const acceptedBadge = page.getByTestId("portal-seller-offer-accepted").first()
    await expect(acceptedBadge).toBeVisible({ timeout: 5_000 })

    await shotFocused(page, acceptedBadge, SHOT_DIR, "07-offer-accepted-badge")
    story.addScene({
      title: "07 — Offers Tab: Accepted Indicator",
      images: [join(SHOT_DIR, "07-offer-accepted-badge.png")],
      seeing: "The accepted offer has a visible Accepted badge/indicator.",
      steps: [
        "Navigate to seller portal offers tab",
        "Accepted badge visible on the accepted offer row",
      ],
    })
  })

  test("offers empty state shown when no offers (FIXTURE_A)", async ({ page }) => {
    test.setTimeout(30_000)
    await page.goto(`/portal/seller/${tokenA}?tab=offers`)
    await expect(page.getByTestId("portal-seller-shell")).toBeVisible({ timeout: 10_000 })
    const empty = page.getByTestId("portal-seller-offers-empty")
    await expect(empty).toBeVisible({ timeout: 5_000 })

    await shotFocused(page, empty, SHOT_DIR, "08-offers-empty")
    story.addScene({
      title: "08 — Offers Tab: Empty State",
      images: [join(SHOT_DIR, "08-offers-empty.png")],
      seeing: "Offers empty state shown when property has no buyer offers.",
      steps: [
        "Navigate to FIXTURE_A seller portal with ?tab=offers (no offers)",
        "Empty state message is visible",
      ],
    })
  })

  // ── Messages tab ──────────────────────────────────────────────────────────────

  test("clicking Messages tab updates URL to ?tab=messages", async ({ page }) => {
    test.setTimeout(30_000)
    await page.goto(`/portal/seller/${tokenC}`)
    await expect(page.getByTestId("portal-seller-shell")).toBeVisible({ timeout: 10_000 })
    await page.getByTestId("portal-seller-tab--messages").click()
    await expect(page).toHaveURL(/[?&]tab=messages/, { timeout: 5_000 })
  })

  test("messages textarea and send button visible on Messages tab", async ({ page }) => {
    test.setTimeout(30_000)
    await page.goto(`/portal/seller/${tokenC}?tab=messages`)
    await expect(page.getByTestId("portal-seller-shell")).toBeVisible({ timeout: 10_000 })

    const textarea = page.getByTestId("portal-messages-textarea")
    const sendBtn = page.getByTestId("portal-messages-send-btn")
    await expect(textarea).toBeVisible({ timeout: 5_000 })
    await expect(sendBtn).toBeVisible()

    await shotFocused(page, page.getByTestId("portal-messages"), SHOT_DIR, "09-messages-tab")
    story.addScene({
      title: "09 — Messages Tab: Compose Interface",
      images: [join(SHOT_DIR, "09-messages-tab.png")],
      seeing: "Messages tab shows textarea and send button for the separate seller thread.",
      steps: [
        "Navigate to seller portal with ?tab=messages",
        "Textarea and send button visible",
      ],
    })
  })

  // ── Tab URL persistence ───────────────────────────────────────────────────────

  test("navigating to ?tab=offers URL directly loads Offers tab", async ({ page }) => {
    test.setTimeout(30_000)
    await page.goto(`/portal/seller/${tokenC}?tab=offers`)
    await expect(page.getByTestId("portal-seller-shell")).toBeVisible({ timeout: 10_000 })
    await expect(page.getByTestId("portal-seller-offers")).toBeVisible({ timeout: 5_000 })
  })

  test("navigating to ?tab=conditions URL directly loads Conditions tab", async ({ page }) => {
    test.setTimeout(30_000)
    await page.goto(`/portal/seller/${tokenC}?tab=conditions`)
    await expect(page.getByTestId("portal-seller-shell")).toBeVisible({ timeout: 10_000 })
    await expect(page.getByTestId("portal-condition-timeline")).toBeVisible({ timeout: 5_000 })
  })
})
