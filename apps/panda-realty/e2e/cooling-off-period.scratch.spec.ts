/**
 * E2E (user-run scratch): Cooling-off period resolved line on the offer submission panel.
 *
 * The resolved number of cooling-off days = f(propertyType, waiveCoolingOff):
 *   Manufactured Home → 21 (not waived) / 7 (waived)
 *   anything else     → 5  (not waived) / 0 (waived)
 * It is computed server-side in the offer-form-status route and surfaced on the
 * submission panel as a "Cooling Off - <days>" line (the line Richard circled).
 *
 * Uses mocked APIs — no live DB required. The resolver itself is unit-tested in
 * apps/panda-realty/lib/cooling-off-days.test.ts; this spec asserts the panel renders
 * the resolved value the route provides.
 *
 * Run (user, after `npm run dev:panda-realty`):
 *   npm run test:e2e:scratch -- --app=panda-realty --spec="apps/panda-realty/e2e/cooling-off-period.scratch.spec.ts" --no-bail
 *
 * Requires: E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD
 */

import { expect, test, type Route } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { createStory, shotFocused } from "@repo/e2e-utils"

import { e2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import {
  BUYER_PANEL_ITEMS_RESPONSE_1001,
  EMPTY_PROPERTY_ENTITIES_RESPONSE,
  PROPERTY_EDIT_WITH_BUYER,
  SINGLE_PROPERTY_RESPONSE,
  STATUS_LIST_RESPONSE,
} from "./helpers/admin-properties-mocks"
import {
  BUYER_OFFERS_EMPTY,
  OFFER_FORM_SUBMISSION_WITH_DATES,
} from "./helpers/offer-form-section-mocks"

const SHOT_DIR = join(dirname(fileURLToPath(import.meta.url)), "screenshots", "cooling-off-period")

const story = createStory({ specUrl: import.meta.url, slug: "cooling-off-period" })
story.setWhatWasBuilt(
  "Cooling-off days are resolved from property type + the offer waive answer " +
    "(Manufactured Home → 21/7, anything else → 5/0) and shown as a 'Cooling Off - <days>' " +
    "line on the admin offer submission panel. Files: lib/cooling-off-days.ts (resolver), " +
    "the offer-form-status route (computes the value), and buyer-offer-submission-panel.tsx (renders it).",
)

test.beforeEach(async () => {
  await mkdir(SHOT_DIR, { recursive: true })
})

test.afterAll(() => {
  story.write()
})

/** Build an offer-form-status payload with a resolved coolingOffDays value. */
function statusWithCoolingOff(coolingOffDays: number, waiveCoolingOff: boolean) {
  return {
    token: "abc123token",
    formUrl: "http://localhost:3004/offer-form/abc123token",
    submission: {
      ...OFFER_FORM_SUBMISSION_WITH_DATES,
      isSubjectToSale: false,
      isSubjectToFinance: false,
      waiveCoolingOff,
      coolingOffDays,
    },
  }
}

async function openSubmissionPanel(page: Parameters<typeof signInAsAdmin>[0]) {
  await page.route("**/api/admin/property-status**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(STATUS_LIST_RESPONSE) })
  })
  await page.route("**/api/admin/buyer-status**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [] }) })
  })
  await page.route("**/api/admin/properties**", async (route: Route) => {
    const url = route.request().url()
    if (url.match(/\/api\/admin\/properties\/1001\/buyers(\?|$)/)) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(BUYER_PANEL_ITEMS_RESPONSE_1001) })
      return
    }
    if (url.match(/\/api\/admin\/properties\/1001(\?|$)/)) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(PROPERTY_EDIT_WITH_BUYER) })
      return
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ...SINGLE_PROPERTY_RESPONSE, items: [{ ...PROPERTY_EDIT_WITH_BUYER }] }),
    })
  })
  await page.route("**/api/admin/property-entities*", async (route: Route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_PROPERTY_ENTITIES_RESPONSE) })
  })
  await page.route("**/api/admin/property-entities/501/buyer-offers**", async (route: Route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(BUYER_OFFERS_EMPTY) })
  })

  // Short, explicit timeouts everywhere so a wrong locator fails in ~10s, not at the 60s
  // test timeout. The scratch flow is fully mocked, so nothing here should take long.
  const T = 10_000
  await page.goto("/admin/properties")
  await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible({ timeout: T })
  await page.getByTestId("admin-entity-row--properties--1001").click({ timeout: T })
  await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible({ timeout: T })
  await page.getByTestId("panda-properties-form-tab-trigger--buyers").click({ timeout: T })
  // The buyers panel now renders only under the Buyers tab (the inline copy above the
  // tabs was removed), so scope to the tab content. NOTE: the per-buyer offers button
  // testid is `property-buyer-owner-row-offers--<id>` (prefix `property-buyer-owner-row`,
  // set in property-buyer-owner-row.tsx) — NOT the stale `property-buyer-panel-offers--<id>`
  // that old specs use and that no longer exists.
  const buyersSection = page.getByTestId("panda-properties-form-tab--buyers")
  await expect(buyersSection.getByTestId("property-buyers-panel-add-new")).toBeEnabled({ timeout: T })
  await buyersSection.getByTestId("property-buyer-owner-row-offers--501").click({ timeout: T })
  await expect(page.getByTestId("property-buyer-panel-offers-dialog")).toBeVisible({ timeout: T })

  const dialog = page.getByTestId("property-buyer-panel-offers-dialog")
  await dialog.getByTestId("buyer-offer-form-view-submission--501").click({ timeout: T })
  await expect(dialog.getByTestId("buyer-offer-form-submission-panel--501")).toBeVisible({ timeout: T })
  return dialog.getByTestId("buyer-offer-form-submission-panel--501")
}

test.describe("Offer submission panel — resolved cooling-off line", () => {
  // Cap each test so a hang fails fast (the flow is mocked; ~30s is plenty) instead of 60s.
  test.describe.configure({ timeout: 30_000 })

  test.beforeEach(async ({ page }) => {
    test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")
    await signInAsAdmin(page)
  })

  test("Manufactured Home, not waived → Cooling Off - 21", async ({ page }) => {
    await page.route("**/api/admin/property-entities/501/offer-form-status**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(statusWithCoolingOff(21, false)) })
    })
    const panel = await openSubmissionPanel(page)
    await expect(panel.getByTestId("submission-cooling-off-resolved")).toHaveText(/Cooling Off\s*21\s*Days/)
    await shotFocused(page, panel, SHOT_DIR, "01-manufactured-21")
    story.addScene({
      title: "01 — Manufactured Home, not waived → Cooling Off - 21",
      images: [join(SHOT_DIR, "01-manufactured-21.png")],
      seeing: "Submission panel showing the resolved line 'Cooling Off - 21' for a manufactured home with the waiver declined.",
      steps: ["Open a Manufactured Home property's buyer offer", "Waiver = No", "View Submission", "Read the Cooling Off line"],
    })
  })

  test("Manufactured Home, waived → Cooling Off - 7", async ({ page }) => {
    await page.route("**/api/admin/property-entities/501/offer-form-status**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(statusWithCoolingOff(7, true)) })
    })
    const panel = await openSubmissionPanel(page)
    await expect(panel.getByTestId("submission-cooling-off-resolved")).toHaveText(/Cooling Off\s*7\s*Days/)
    await shotFocused(page, panel, SHOT_DIR, "02-manufactured-7")
    story.addScene({
      title: "02 — Manufactured Home, waived → Cooling Off - 7",
      images: [join(SHOT_DIR, "02-manufactured-7.png")],
      seeing: "Submission panel showing 'Cooling Off - 7' for a manufactured home where the buyer waived (21 reduced to the minimum 7).",
      steps: ["Open a Manufactured Home property's buyer offer", "Waiver = Yes", "View Submission", "Read the Cooling Off line"],
    })
  })

  test("Residential house, not waived → Cooling Off - 5", async ({ page }) => {
    await page.route("**/api/admin/property-entities/501/offer-form-status**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(statusWithCoolingOff(5, false)) })
    })
    const panel = await openSubmissionPanel(page)
    await expect(panel.getByTestId("submission-cooling-off-resolved")).toHaveText(/Cooling Off\s*5\s*Days/)
    await shotFocused(page, panel, SHOT_DIR, "03-house-5")
    story.addScene({
      title: "03 — Residential house, not waived → Cooling Off - 5",
      images: [join(SHOT_DIR, "03-house-5.png")],
      seeing: "Submission panel showing 'Cooling Off - 5' for a non-manufactured property with the waiver declined.",
      steps: ["Open a House property's buyer offer", "Waiver = No", "View Submission", "Read the Cooling Off line"],
    })
  })

  test("Residential house, waived → Cooling Off - 0", async ({ page }) => {
    await page.route("**/api/admin/property-entities/501/offer-form-status**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(statusWithCoolingOff(0, true)) })
    })
    const panel = await openSubmissionPanel(page)
    await expect(panel.getByTestId("submission-cooling-off-resolved")).toHaveText(/Cooling Off\s*0\s*Days/)
    await shotFocused(page, panel, SHOT_DIR, "04-house-0")
    story.addScene({
      title: "04 — Residential house, waived → Cooling Off - 0",
      images: [join(SHOT_DIR, "04-house-0.png")],
      seeing: "Submission panel showing 'Cooling Off - 0' for a non-manufactured property where the buyer waived the period.",
      steps: ["Open a House property's buyer offer", "Waiver = Yes", "View Submission", "Read the Cooling Off line"],
    })
  })
})
