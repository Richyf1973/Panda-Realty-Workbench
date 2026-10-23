// Run: npm run test:e2e:scratch -- --app=panda-realty --spec="apps/panda-realty/e2e/portal-sale-price-property-desc.spec.ts" --no-bail

import { expect, test } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { createStory, shotFocused } from "@repo/e2e-utils"

import { requirePandaE2eAdminListLiveEnv, signInAsAdmin } from "./helpers/admin-auth"
import { createOrGetSellerToken } from "./helpers/panda-seller-portal-mocks"

const SHOT_DIR = join(dirname(fileURLToPath(import.meta.url)), "screenshots", "portal-sale-price-property-desc")

const story = createStory({ specUrl: import.meta.url, slug: "portal-sale-price-property-desc" })
story.setWhatWasBuilt(
  "Portal sale contract price and property description cleanup: " +
  "Both buyer and seller portal feed cards now show Sale Price from the accepted buyerOffers.offer " +
  "(not pandaProperties.salePrice). The property description line (House · N bed · N bath · N car) " +
  "is removed from all portal locations — buyer portal summary card, seller portal header card, " +
  "and seller portal Summary tab body. Buyer portal shows a Sale price not yet confirmed fallback " +
  "when no accepted offer exists.",
)

// Fixture A — has accepted offer of $1,055,000; sale_price in DB is $395,000 (different — confirms correct source)
const FIXTURE_WITH_OFFER = { propertyEntityId: 185800, propertyListId: 190675 }

// Fixture B — no accepted offer exists for this buyer/property pair
const FIXTURE_NO_OFFER = { propertyEntityId: 185823, propertyListId: 223323 }

async function createBuyerToken(
  page: Parameters<typeof signInAsAdmin>[0],
  fixture: { propertyEntityId: number; propertyListId: number },
): Promise<string> {
  await signInAsAdmin(page)
  const res = await page.context().request.post("/api/admin/portal-tokens", { data: fixture })
  const body = await res.json()
  return body.token
}

test.beforeAll(() => {
  requirePandaE2eAdminListLiveEnv()
})

test.beforeEach(async () => {
  await mkdir(SHOT_DIR, { recursive: true })
})

test.afterAll(() => {
  story.write()
})

// ── Buyer portal — happy path ─────────────────────────────────────────────────

test.describe("Buyer portal — accepted offer", () => {
  test("buyer portal — property description line is absent", async ({ page }) => {
    test.setTimeout(60_000)
    const token = await createBuyerToken(page, FIXTURE_WITH_OFFER)
    await page.goto(`/portal/${token}`)
    const card = page.getByTestId("portal-property-summary")
    await expect(card).toBeVisible({ timeout: 15_000 })

    const attrs = card.getByTestId("portal-property-attributes")
    await expect(attrs).not.toBeVisible()

    await shotFocused(page, card, SHOT_DIR, "01-buyer-no-description")
    story.addScene({
      title: "01 — Buyer Portal: Property Description Line Absent",
      images: [join(SHOT_DIR, "01-buyer-no-description.png")],
      seeing: "Buyer portal summary card with no property type/bed/bath/car description line.",
      steps: [
        "Open buyer portal URL",
        "Confirm portal-property-attributes element is not visible",
      ],
    })
  })

  test("buyer portal — shows sale price from accepted offer", async ({ page }) => {
    test.setTimeout(60_000)
    const token = await createBuyerToken(page, FIXTURE_WITH_OFFER)
    await page.goto(`/portal/${token}`)
    const card = page.getByTestId("portal-property-summary")
    await expect(card).toBeVisible({ timeout: 15_000 })

    const priceEl = card.getByTestId("portal-buyer-sale-price")
    await expect(priceEl).toBeVisible()
    // Must show accepted offer $1,055,000 — NOT the old salePrice $395,000
    await expect(priceEl).toContainText("1,055,000")

    await shotFocused(page, priceEl, SHOT_DIR, "02-buyer-sale-price")
    story.addScene({
      title: "02 — Buyer Portal: Sale Price from Accepted Offer",
      images: [join(SHOT_DIR, "02-buyer-sale-price.png")],
      seeing: "Buyer portal shows Sale Price: $1,055,000 (the accepted offer amount, not the old salePrice field).",
      steps: [
        "Open buyer portal URL",
        "Confirm sale price element shows $1,055,000",
      ],
    })
  })

  test("buyer portal — contract and settlement date boxes still present", async ({ page }) => {
    test.setTimeout(60_000)
    const token = await createBuyerToken(page, FIXTURE_WITH_OFFER)
    await page.goto(`/portal/${token}`)
    const card = page.getByTestId("portal-property-summary")
    await expect(card).toBeVisible({ timeout: 15_000 })

    await expect(card.getByTestId("portal-contract-date")).toBeVisible()
    await expect(card.getByTestId("portal-settlement-date")).toBeVisible()
  })
})

// ── Seller portal — happy path ────────────────────────────────────────────────

test.describe("Seller portal — accepted offer", () => {
  test("seller portal — property description line absent in header card", async ({ page }) => {
    test.setTimeout(60_000)
    const { token } = await createOrGetSellerToken(page, { propertyListId: FIXTURE_WITH_OFFER.propertyListId })
    await page.goto(`/portal/seller/${token}`)
    const header = page.getByTestId("portal-seller-property-header")
    await expect(header).toBeVisible({ timeout: 15_000 })

    // The description line "House · N bed · N bath · N car" must not appear in the header
    await expect(header.getByText(/\d+ bed/)).not.toBeVisible()

    await shotFocused(page, header, SHOT_DIR, "03-seller-header-no-description")
    story.addScene({
      title: "03 — Seller Portal: Header Card — No Description Line",
      images: [join(SHOT_DIR, "03-seller-header-no-description.png")],
      seeing: "Seller portal header card shows address and sale price; no bed/bath/car line.",
      steps: [
        "Open seller portal URL",
        "Confirm bed/bath/car description is absent from header card",
      ],
    })
  })

  test("seller portal — shows sale price from accepted offer in header card", async ({ page }) => {
    test.setTimeout(60_000)
    const { token } = await createOrGetSellerToken(page, { propertyListId: FIXTURE_WITH_OFFER.propertyListId })
    await page.goto(`/portal/seller/${token}`)
    const header = page.getByTestId("portal-seller-property-header")
    await expect(header).toBeVisible({ timeout: 15_000 })

    const priceEl = header.getByTestId("portal-seller-sale-price")
    await expect(priceEl).toBeVisible()
    await expect(priceEl).toContainText("1,055,000")

    await shotFocused(page, priceEl, SHOT_DIR, "04-seller-header-sale-price")
    story.addScene({
      title: "04 — Seller Portal: Header Shows Accepted Offer Price",
      images: [join(SHOT_DIR, "04-seller-header-sale-price.png")],
      seeing: "Seller portal header card shows Sale Price: $1,055,000 (accepted offer amount).",
      steps: [
        "Open seller portal URL",
        "Confirm sale price element shows $1,055,000",
      ],
    })
  })

  test("seller portal — property description line absent in Summary tab body", async ({ page }) => {
    test.setTimeout(60_000)
    const { token } = await createOrGetSellerToken(page, { propertyListId: FIXTURE_WITH_OFFER.propertyListId })
    await page.goto(`/portal/seller/${token}`)
    const summaryTab = page.getByTestId("portal-seller-summary-tab")
    await expect(summaryTab).toBeVisible({ timeout: 15_000 })

    // The description line must not appear inside the Summary tab body
    await expect(summaryTab.getByText(/\d+ bed/)).not.toBeVisible()

    await shotFocused(page, summaryTab, SHOT_DIR, "05-seller-summary-tab-no-description")
    story.addScene({
      title: "05 — Seller Portal: Summary Tab — No Description Line",
      images: [join(SHOT_DIR, "05-seller-summary-tab-no-description.png")],
      seeing: "Seller portal Summary tab body shows only date boxes; no bed/bath/car description.",
      steps: [
        "Open seller portal URL",
        "Observe Summary tab body has no description line",
      ],
    })
  })

  test("seller portal — sale price NOT repeated inside Summary tab body", async ({ page }) => {
    test.setTimeout(60_000)
    const { token } = await createOrGetSellerToken(page, { propertyListId: FIXTURE_WITH_OFFER.propertyListId })
    await page.goto(`/portal/seller/${token}`)
    const summaryTab = page.getByTestId("portal-seller-summary-tab")
    await expect(summaryTab).toBeVisible({ timeout: 15_000 })

    // Sale price must NOT appear inside the tab body (only in header)
    await expect(summaryTab.getByTestId("portal-seller-sale-price")).not.toBeVisible()
  })
})

// ── Buyer portal — no accepted offer edge case ────────────────────────────────

test.describe("Buyer portal — no accepted offer", () => {
  test("buyer portal (no offer) — shows Sale price not yet confirmed fallback", async ({ page }) => {
    test.setTimeout(60_000)
    const token = await createBuyerToken(page, FIXTURE_NO_OFFER)
    await page.goto(`/portal/${token}`)
    const card = page.getByTestId("portal-property-summary")
    await expect(card).toBeVisible({ timeout: 15_000 })

    const fallback = card.getByTestId("portal-buyer-sale-price-pending")
    await expect(fallback).toBeVisible()
    await expect(fallback).toContainText("Sale price not yet confirmed")

    await shotFocused(page, fallback, SHOT_DIR, "06-buyer-no-offer-fallback")
    story.addScene({
      title: "06 — Buyer Portal: No Accepted Offer — Fallback Message",
      images: [join(SHOT_DIR, "06-buyer-no-offer-fallback.png")],
      seeing: "Buyer portal shows Sale price not yet confirmed when no accepted offer exists.",
      steps: [
        "Open buyer portal with no accepted offer",
        "Confirm fallback message is visible",
      ],
    })
  })

  test("buyer portal (no offer) — no dollar amount shown", async ({ page }) => {
    test.setTimeout(60_000)
    const token = await createBuyerToken(page, FIXTURE_NO_OFFER)
    await page.goto(`/portal/${token}`)
    const card = page.getByTestId("portal-property-summary")
    await expect(card).toBeVisible({ timeout: 15_000 })

    // No formatted dollar amount should appear
    await expect(card.getByTestId("portal-buyer-sale-price")).not.toBeVisible()
  })
})
