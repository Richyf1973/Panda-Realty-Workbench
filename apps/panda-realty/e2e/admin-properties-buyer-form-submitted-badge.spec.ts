import { expect, test, type Route } from "@playwright/test"

import { e2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import {
  BUYER_PANEL_ITEMS_RESPONSE_1001,
  EMPTY_PROPERTY_ENTITIES_RESPONSE,
  PROPERTY_EDIT_WITH_BUYER,
  SINGLE_PROPERTY_RESPONSE,
  STATUS_LIST_RESPONSE,
} from "./helpers/admin-properties-mocks"

test.describe("Buyer panel — Form Submitted badge on buyer row (mocked APIs)", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")
    await page.route("**/api/admin/property-status**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(STATUS_LIST_RESPONSE) })
    })
    await page.route("**/api/admin/buyer-status**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [] }) })
    })
    await signInAsAdmin(page)
  })

  async function openBuyersTab(page: Parameters<typeof signInAsAdmin>[0]) {
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
    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible()
    await page.getByTestId("admin-entity-row--properties--1001").click()
    await page.getByTestId("panda-properties-form-tab-trigger--buyers").click()
    await expect(page.getByTestId("property-buyers-panel-add-new")).toBeEnabled({ timeout: 10_000 })
  }

  test("buyer row shows Form Submitted badge when submission exists", async ({ page }) => {
    const BUYERS_WITH_SUBMISSION = {
      items: [{ ...BUYER_PANEL_ITEMS_RESPONSE_1001.items[0], hasOfferFormSubmission: true }],
    }
    await page.route("**/api/admin/properties**", async (route: Route) => {
      const url = route.request().url()
      if (url.match(/\/api\/admin\/properties\/1001\/buyers(\?|$)/)) {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(BUYERS_WITH_SUBMISSION) })
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

    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible()
    await page.getByTestId("admin-entity-row--properties--1001").click()
    await page.getByTestId("panda-properties-form-tab-trigger--buyers").click()
    await expect(page.getByTestId("property-buyers-panel-add-new")).toBeEnabled({ timeout: 10_000 })

    await expect(page.getByTestId("property-buyer-panel-form-submitted-badge--501")).toBeVisible()
  })

  test("buyer row does not show Form Submitted badge when no submission", async ({ page }) => {
    await openBuyersTab(page)
    await expect(page.getByTestId("property-buyer-panel-form-submitted-badge--501")).not.toBeVisible()
  })

  test("Form Submitted badge is inline next to status badge, not full-width", async ({ page }) => {
    const BUYERS_WITH_SUBMISSION_AND_STATUS = {
      items: [{
        ...BUYER_PANEL_ITEMS_RESPONSE_1001.items[0],
        hasOfferFormSubmission: true,
        pipelineStatusLabel: "Offer Made",
      }],
    }
    await page.route("**/api/admin/properties**", async (route: Route) => {
      const url = route.request().url()
      if (url.match(/\/api\/admin\/properties\/1001\/buyers(\?|$)/)) {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(BUYERS_WITH_SUBMISSION_AND_STATUS) })
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

    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible()
    await page.getByTestId("admin-entity-row--properties--1001").click()
    await page.getByTestId("panda-properties-form-tab-trigger--buyers").click()
    await expect(page.getByTestId("property-buyers-panel-add-new")).toBeEnabled({ timeout: 10_000 })

    const badge = page.getByTestId("property-buyer-panel-form-submitted-badge--501")
    const statusBadge = page.getByTestId("property-buyer-panel-status--501")

    await expect(badge).toBeVisible()
    await expect(statusBadge).toBeVisible()

    // Badge must be narrower than the row — not stretching full width
    const { badgeWidth, rowWidth } = await page.evaluate(() => {
      const b = document.querySelector('[data-testid="property-buyer-panel-form-submitted-badge--501"]')
      const r = document.querySelector('[data-testid="property-buyer-panel-row--501"]')
      if (!b || !r) return { badgeWidth: 0, rowWidth: 0 }
      return {
        badgeWidth: b.getBoundingClientRect().width,
        rowWidth: r.getBoundingClientRect().width,
      }
    })
    expect(badgeWidth).toBeGreaterThan(0)
    expect(badgeWidth).toBeLessThan(rowWidth * 0.5)

    // Badge must be on the same vertical line as the status badge (inline, not below)
    const badgeBox = await badge.boundingBox()
    const statusBox = await statusBadge.boundingBox()
    expect(badgeBox).not.toBeNull()
    expect(statusBox).not.toBeNull()
    expect(Math.abs(badgeBox!.y - statusBox!.y)).toBeLessThan(8)
  })
})
