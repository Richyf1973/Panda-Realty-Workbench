/**
 * Panda Realty — Latest Buyer Offers loading skeleton
 *
 * Run: npm run test:e2e:scratch -- --app=panda-realty --spec=apps/panda-realty/e2e/buyer-offers-loading-skeleton.spec.ts --no-retry
 */

import { expect, test } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { createStory, shotFocused } from "@repo/e2e-utils"

import { e2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import { BUYER_OFFER_ACCEPTED } from "./helpers/admin-properties-mocks"
import {
  MOCK_PROPERTY_ID,
  routePandaPropertiesWithDeferredBuyerOffers,
} from "./helpers/panda-properties-dialog-mocks"

const SHOT_DIR = join(dirname(fileURLToPath(import.meta.url)), "screenshots", "buyer-offers-loading-skeleton")

const story = createStory({ specUrl: import.meta.url, slug: "buyer-offers-loading-skeleton" })

story.setWhatWasBuilt(
  "Replaced the plain-text 'Loading…' message in the Latest Buyer Offers section with a 4-row animated skeleton. " +
  "Also fixed the initial offersLoading state to true when entityRowId is present, preventing a 'No results' flash before the first fetch completes. " +
  "Files changed: panda-properties-buyer-offers-section.tsx (loading branch), panda-properties-buyer-offers-fetch.ts (useState init).",
)

test.beforeEach(async () => {
  await mkdir(SHOT_DIR, { recursive: true })
  if (!e2eAdminCredentials) {
    throw new Error("E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set in apps/panda-realty/.env.local")
  }
})

test.afterAll(() => {
  story.write()
})

async function openPropertyDialog(page: Parameters<typeof signInAsAdmin>[0]) {
  await signInAsAdmin(page)
  await page.goto("/admin/properties")
  await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible({ timeout: 30_000 })
  await page.getByTestId(`admin-entity-row--properties--${MOCK_PROPERTY_ID}`).click()
  return page.getByTestId("admin-entity-crud-dialog--properties")
}

async function setupDeferredOffers(page: Parameters<typeof signInAsAdmin>[0]) {
  let resolveOffers!: (body: unknown) => void
  const deferred = new Promise<unknown>((resolve) => {
    resolveOffers = resolve
  })
  await routePandaPropertiesWithDeferredBuyerOffers(page, () => deferred)
  const dialog = await openPropertyDialog(page)
  await expect(dialog).toBeVisible({ timeout: 30_000 })
  const section = dialog.getByTestId("panda-properties-form-section--buyer-offers")
  await expect(section).toBeVisible({ timeout: 15_000 })
  const skeleton = section.getByTestId("buyer-offers-loading-skeleton")
  return { dialog, section, skeleton, resolveOffers }
}

test("shows skeleton while buyer-offers is loading", async ({ page }) => {
  const { section, skeleton, resolveOffers } = await setupDeferredOffers(page)

  // Skeleton must be visible while fetch is held
  await expect(skeleton).toBeVisible({ timeout: 5_000 })

  await shotFocused(page, skeleton, SHOT_DIR, "01a-skeleton-visible")
  story.addScene({
    title: "01a — Skeleton: Loading state while buyer-offers GET is in-flight",
    images: [join(SHOT_DIR, "01a-skeleton-visible.png")],
    seeing: "The Latest Buyer Offers section shows 4 animated skeleton rows while the fetch is held.",
    steps: [
      "Open the property dialog",
      "The GET /buyer-offers request is held (not yet resolved)",
      "The section shows the 4-row skeleton immediately — no 'No results' flash",
    ],
  })

  // Release the response
  resolveOffers([BUYER_OFFER_ACCEPTED])

  // Skeleton disappears and real offer row appears
  await expect(skeleton).not.toBeVisible({ timeout: 10_000 })
  const offerRow = section.locator('[data-testid^="panda-properties-buyer-offer-row--"]').first()
  await expect(offerRow).toBeVisible({ timeout: 10_000 })

  await shotFocused(page, offerRow, SHOT_DIR, "01b-offers-loaded")
  story.addScene({
    title: "01b — Offers: Data loaded after skeleton resolves",
    images: [join(SHOT_DIR, "01b-offers-loaded.png")],
    seeing: "The skeleton is gone and the real offer row is visible with the buyer name and amount.",
    steps: [
      "Release the deferred GET /buyer-offers response",
      "Skeleton disappears",
      "Offer row appears with buyer name and formatted amount",
    ],
  })
})

test("no flash of 'No results' on initial mount", async ({ page }) => {
  const { section, skeleton, resolveOffers } = await setupDeferredOffers(page)

  // While the fetch is held, "No results" must never appear
  await expect(section).not.toContainText("No results")

  // The skeleton should be visible instead
  await expect(skeleton).toBeVisible({ timeout: 5_000 })

  await shotFocused(page, skeleton, SHOT_DIR, "02-no-results-flash")
  story.addScene({
    title: "02 — No flash: 'No results' absent while loading",
    images: [join(SHOT_DIR, "02-no-results-flash.png")],
    seeing: "The section shows skeleton rows only — 'No results' text is never shown before the fetch completes.",
    steps: [
      "Open dialog with fetch held",
      "Confirm 'No results' text is absent",
      "Confirm skeleton is visible",
    ],
  })

  resolveOffers([])

  // After empty response: "No results" is fine now
  await expect(skeleton).not.toBeVisible({ timeout: 10_000 })
  await expect(section).toContainText("No results")
})

test("old plain-text 'Loading…' is absent during loading", async ({ page }) => {
  const { section, skeleton, resolveOffers } = await setupDeferredOffers(page)

  // The old "Loading…" plain text must not appear
  await expect(section).not.toContainText("Loading…")

  // Skeleton must be visible instead
  await expect(skeleton).toBeVisible({ timeout: 5_000 })

  await shotFocused(page, skeleton, SHOT_DIR, "03-no-loading-text")
  story.addScene({
    title: "03 — No legacy text: 'Loading…' replaced by skeleton",
    images: [join(SHOT_DIR, "03-no-loading-text.png")],
    seeing: "The plain-text 'Loading…' is absent. The section shows animated skeleton bars instead.",
    steps: [
      "Open dialog with fetch held",
      "Confirm 'Loading…' text is absent",
      "Confirm skeleton element is present",
    ],
  })

  resolveOffers([BUYER_OFFER_ACCEPTED])
  await expect(skeleton).not.toBeVisible({ timeout: 10_000 })
})
