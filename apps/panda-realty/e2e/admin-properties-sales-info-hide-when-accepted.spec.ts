/**
 * E2E: Sales Information tab — hide fields when buyer offer is accepted
 *
 * When a property has an accepted offer, the Sales tab must hide:
 *   Appraised Amount, Successful Buyer, Contract Price, Commission Rate,
 *   Commission Amount, and the Latest Buyer Offers section.
 * The AcceptedOfferSubmissionPanel (contract conditions) must remain visible.
 *
 * Run: npm run test:e2e:scratch -- --app=panda-realty --spec=apps/panda-realty/e2e/admin-properties-sales-info-hide-when-accepted.spec.ts
 * Spec: specs/panda-realty-sales-info-hide-when-accepted.md
 */

import { expect, test, type Page } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { createStory, shotFocused } from "@repo/e2e-utils"

import { requirePandaE2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import { PREFILL_BASE } from "./helpers/buyer-offer-native-view-mocks"
import { ACCEPTED_OFFER, OFFER_TOKEN } from "./helpers/offers-rework-fixtures"
import { MOCK_PROPERTY_ID } from "./helpers/panda-properties-dialog-mocks"
import { setupSalesTabMockRoutes } from "./helpers/sales-tab-mock-routes"

const SHOT_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "screenshots",
  "sales-info-hide-when-accepted",
)

const story = createStory({
  specUrl: import.meta.url,
  slug: "sales-info-hide-when-accepted",
})

story.setWhatWasBuilt(
  "The Sales Information tab is now completely hidden when no offer has been accepted — " +
    "the tab trigger does not appear in the tab bar and Buyers becomes the first visible tab. " +
    "When a buyer offer IS accepted the Sales tab reappears, but the fields grid (Appraised Amount, " +
    "Successful Buyer, Contract Price, Commission Rate, Commission Amount) and the Latest Buyer " +
    "Offers section remain hidden; only the AcceptedOfferSubmissionPanel (contract conditions) is shown. " +
    "Files changed: panda-properties-form-favorite-tabs.tsx (tab visibility) and " +
    "panda-properties-dialog-form.tsx (section reordering, inline Buyers section).",
)

// ── Route helpers ─────────────────────────────────────────────────────────────

async function setupRoutesWithOffers(page: Page, offers: unknown[]): Promise<void> {
  await setupSalesTabMockRoutes(page, offers, OFFER_TOKEN, PREFILL_BASE)
  await page.route("**/api/admin/property-entities/**/offer-form-status**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ submission: null }),
    })
  })
  await page.route("**/api/admin/portal-tokens/**", async (route) => {
    await route.fulfill({ status: 404 })
  })
}

async function openPropertyDialog(page: Page): Promise<void> {
  await page.goto("/admin/properties")
  await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible({
    timeout: 15_000,
  })
  await page.getByTestId(`admin-entity-row--properties--${MOCK_PROPERTY_ID}`).click()
  await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible({
    timeout: 15_000,
  })
}

async function openSalesTab(page: Page): Promise<void> {
  await openPropertyDialog(page)
  await page.getByTestId("panda-properties-form-tab-trigger--sales").click()
  await expect(page.getByTestId("panda-properties-form-tab--sales")).toBeVisible()
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe("Sales tab — hide fields when offer is accepted (mocked)", () => {
  test.beforeEach(async () => {
    requirePandaE2eAdminCredentials()
  })

  test.beforeEach(async ({ page }) => {
    await mkdir(SHOT_DIR, { recursive: true })
    await signInAsAdmin(page)
  })

  test.afterAll(() => {
    story.write()
  })

  test("accepted offer: sales fields and Latest Buyer Offers section are hidden", async ({
    page,
  }) => {
    await setupRoutesWithOffers(page, [ACCEPTED_OFFER])
    await openSalesTab(page)

    const salesTab = page.getByTestId("panda-properties-form-tab--sales")

    // These fields must NOT be visible when an offer is accepted
    await expect(
      salesTab.getByTestId("panda-properties-form-field--appraisedAmount"),
    ).not.toBeVisible()
    await expect(
      salesTab.getByTestId("panda-properties-sales-field--successfulBuyer"),
    ).not.toBeVisible()
    await expect(
      salesTab.getByTestId("panda-properties-sales-field--contractPrice"),
    ).not.toBeVisible()
    await expect(
      salesTab.getByTestId("panda-properties-form-field--commissionRate"),
    ).not.toBeVisible()
    await expect(
      salesTab.getByTestId("panda-properties-form-field--commissionAmount"),
    ).not.toBeVisible()

    // Latest Buyer Offers section must NOT be visible
    await expect(
      salesTab.getByTestId("panda-properties-form-section--buyer-offers"),
    ).not.toBeVisible()

    // Contract conditions panel must still be visible
    const conditionsSection = salesTab.getByTestId(
      "panda-properties-sales-accepted-offer-section",
    )
    await expect(conditionsSection).toBeVisible({ timeout: 10_000 })

    await shotFocused(page, salesTab, SHOT_DIR, "01-accepted-offer-fields-hidden")
    story.addScene({
      title: "01 — Accepted Offer: Sales fields and buyer offers section hidden",
      images: [join(SHOT_DIR, "01-accepted-offer-fields-hidden.png")],
      seeing:
        "Sales Information tab with an accepted offer: Appraised Amount, Successful Buyer, " +
        "Contract Price, Commission Rate, Commission Amount, and Latest Buyer Offers are all absent. " +
        "Only the contract conditions panel is visible.",
      steps: [
        "Open a property that has an accepted buyer offer",
        "Click the Sales Information tab",
        "Verify the sales fields grid and buyer offers section are hidden",
        "Verify the contract conditions panel is still present",
      ],
    })
  })

  test("no accepted offer: Sales Information tab is hidden", async ({
    page,
  }) => {
    await setupRoutesWithOffers(page, [])
    await openPropertyDialog(page)

    await expect(
      page.getByTestId("panda-properties-form-tab-trigger--sales"),
    ).toHaveCount(0)
    await expect(
      page.getByTestId("panda-properties-form-tab-trigger--buyers"),
    ).toBeVisible({ timeout: 10_000 })

    const tabList = page.getByTestId("panda-properties-form-bottom-tabs").locator('[role="tablist"]')
    await shotFocused(page, tabList, SHOT_DIR, "02-no-offer-sales-tab-hidden")
    story.addScene({
      title: "02 — No Accepted Offer: Sales Information tab is hidden",
      images: [join(SHOT_DIR, "02-no-offer-sales-tab-hidden.png")],
      seeing:
        "Property dialog with no accepted offer: Sales Information tab is absent from the tab bar. " +
        "Buyers tab is the first visible tab.",
      steps: [
        "Open a property with no accepted buyer offer",
        "Verify Sales Information tab trigger is not present in the tab bar",
        "Verify Buyers tab is visible",
      ],
    })
  })

  test("non-accepted offer present: Sales Information tab is hidden", async ({
    page,
  }) => {
    const nonAcceptedOffer = { ...ACCEPTED_OFFER, isAccepted: false, buyerOfferId: 999 }
    await setupRoutesWithOffers(page, [nonAcceptedOffer])
    await openPropertyDialog(page)

    await expect(
      page.getByTestId("panda-properties-form-tab-trigger--sales"),
    ).toHaveCount(0)
    await expect(
      page.getByTestId("panda-properties-form-tab-trigger--buyers"),
    ).toBeVisible({ timeout: 10_000 })

    const tabList = page.getByTestId("panda-properties-form-bottom-tabs").locator('[role="tablist"]')
    await shotFocused(page, tabList, SHOT_DIR, "03-non-accepted-offer-sales-tab-hidden")
    story.addScene({
      title: "03 — Non-Accepted Offer: Sales Information tab is hidden",
      images: [join(SHOT_DIR, "03-non-accepted-offer-sales-tab-hidden.png")],
      seeing:
        "Property dialog with a non-accepted offer: Sales Information tab is absent from the tab bar. " +
        "Buyers tab is the first visible tab.",
      steps: [
        "Open a property with a buyer offer that is not accepted",
        "Verify Sales Information tab trigger is not present in the tab bar",
        "Verify Buyers tab is visible",
      ],
    })
  })
})
