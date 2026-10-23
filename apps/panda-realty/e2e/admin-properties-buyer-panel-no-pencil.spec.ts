import { expect, test, type Page } from "@playwright/test"

import { e2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import {
  BUYER_PANEL_ITEMS_RESPONSE_1001,
  EMPTY_PROPERTY_ENTITIES_RESPONSE,
  PROPERTY_EDIT_WITH_BUYER,
  SINGLE_PROPERTY_RESPONSE,
  STATUS_LIST_RESPONSE,
} from "./helpers/admin-properties-mocks"

const BUYER_NO_CONTACT_INFO = {
  items: [
    {
      propertyEntityId: 502,
      entityId: 202,
      entityName: "No Contact Buyer",
      phoneNumber: null,
      emailAddress: null,
      address: null,
      esuburb: null,
      estate: null,
      epostcode: null,
      notes: null,
      buyerPipelineStatusId: null,
      pipelineStatusLabel: null,
    },
  ],
}

async function openPropertyBuyersTab(page: Page, buyersResponse: { items: unknown[] } = BUYER_PANEL_ITEMS_RESPONSE_1001) {
  await page.route("**/api/admin/properties**", async (route) => {
    const url = route.request().url()
    if (url.match(/\/api\/admin\/properties\/1001\/buyers(\?|$)/)) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(buyersResponse),
      })
      return
    }
    if (url.match(/\/api\/admin\/properties\/1001(\?|$)/)) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(PROPERTY_EDIT_WITH_BUYER),
      })
      return
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ...SINGLE_PROPERTY_RESPONSE, items: [PROPERTY_EDIT_WITH_BUYER] }),
    })
  })

  await page.goto("/admin/properties")
  await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible()
  await page.getByTestId("admin-entity-row--properties--1001").click()
  await page.getByTestId("panda-properties-form-tab-trigger--buyers").click()
  await expect(page.getByTestId("property-buyers-panel-add-new")).toBeEnabled({ timeout: 10_000 })
}

test.describe("Panda Realty — buyer panel: pencil icon removed (mocked APIs)", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")
    await page.route("**/api/admin/property-status**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(STATUS_LIST_RESPONSE),
      })
    })
    await page.route("**/api/admin/property-entities**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(EMPTY_PROPERTY_ENTITIES_RESPONSE),
      })
    })
    await signInAsAdmin(page)
  })

  // ── Pencil absence ───────────────────────────────────────────────────────

  test("buyer row has no pencil (edit) button", async ({ page }) => {
    await openPropertyBuyersTab(page)
    await expect(page.getByTestId("property-buyer-panel-edit--501")).toHaveCount(0)
  })

  // ── Remaining buttons still present ─────────────────────────────────────

  test("buyer row still has delete, add-note, and add-reminder buttons", async ({ page }) => {
    await openPropertyBuyersTab(page)
    await expect(page.getByTestId("property-buyer-panel-delete--501")).toBeVisible()
    await expect(page.getByTestId("property-buyer-panel-add-note--501")).toBeVisible()
    await expect(page.getByTestId("property-buyer-panel-add-reminder--501")).toBeVisible()
  })

  test("buyer row with phone number shows quick-call button", async ({ page }) => {
    await openPropertyBuyersTab(page)
    await expect(page.getByTestId("property-buyer-panel-quick-call--501")).toBeVisible()
  })

  test("buyer row with email shows quick-email and inbox buttons", async ({ page }) => {
    await openPropertyBuyersTab(page)
    await expect(page.getByTestId("property-buyer-panel-quick-email--501")).toBeVisible()
    await expect(page.getByTestId("property-buyer-panel-inbox--501")).toBeVisible()
  })

  // ── Edge case: buyer with no contact info ────────────────────────────────

  test("buyer row with no phone or email shows no call, email, or inbox buttons — and no pencil", async ({
    page,
  }) => {
    await openPropertyBuyersTab(page, BUYER_NO_CONTACT_INFO)
    await expect(page.getByTestId("property-buyer-panel-quick-call--502")).toHaveCount(0)
    await expect(page.getByTestId("property-buyer-panel-quick-email--502")).toHaveCount(0)
    await expect(page.getByTestId("property-buyer-panel-inbox--502")).toHaveCount(0)
    await expect(page.getByTestId("property-buyer-panel-edit--502")).toHaveCount(0)
    await expect(page.getByTestId("property-buyer-panel-delete--502")).toBeVisible()
  })
})
