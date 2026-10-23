import { expect, test, type Route } from "@playwright/test"

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
  BUYER_PANEL_TWO_BUYERS,
  OFFER_FORM_STATUS_NOT_SUBMITTED,
  OFFER_FORM_STATUS_SUBMITTED,
  OFFER_FORM_TOKEN_REUSE_RESPONSE,
} from "./helpers/offer-form-section-mocks"

test.describe("Buyer panel — Offer Form section in Offers dialog (mocked APIs)", () => {
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

  async function openOffersDialog(page: Parameters<typeof signInAsAdmin>[0], propertyEntityId = 501) {
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
    await page.route(`**/api/admin/property-entities/${propertyEntityId}/buyer-offers**`, async (route: Route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(BUYER_OFFERS_EMPTY) })
    })

    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible()
    await page.getByTestId("admin-entity-row--properties--1001").click()
    await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible()
    await page.getByTestId("panda-properties-form-tab-trigger--buyers").click()
    await expect(page.getByTestId("panda-properties-form-tab--buyers")).toBeVisible()
    await expect(page.getByTestId("property-buyers-panel-add-new")).toBeEnabled({ timeout: 10_000 })
    await page.getByTestId(`property-buyer-owner-row-offers--${propertyEntityId}`).click()
    await expect(page.getByTestId("property-buyer-panel-offers-dialog")).toBeVisible()
  }

  // ── Happy path ────────────────────────────────────────────────────────────

  test("Offers dialog shows Offer Form section with URL and Send button when no prior token", async ({ page }) => {
    await page.route("**/api/admin/property-entities/501/offer-form-status**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(OFFER_FORM_STATUS_NOT_SUBMITTED) })
    })

    await openOffersDialog(page)

    const dialog = page.getByTestId("property-buyer-panel-offers-dialog")
    await expect(dialog.getByTestId("buyer-offer-form-section--501")).toBeVisible()
    await expect(dialog.getByTestId("buyer-offer-form-url--501")).toBeVisible()
    await expect(dialog.getByTestId("buyer-offer-form-url--501")).toHaveValue(/^https?:\/\/.+\/offer-form\//)
    await expect(dialog.getByTestId("buyer-offer-form-copy--501")).toBeEnabled()
    await expect(dialog.getByTestId("buyer-offer-form-send--501")).toBeEnabled()
    await expect(dialog.getByTestId("buyer-offer-form-status--501")).toContainText(/not yet submitted/i)
  })

  test("clicking Send calls the send API and shows success feedback", async ({ page }) => {
    let sendCalled = false

    await page.route("**/api/admin/property-entities/501/offer-form-status**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(OFFER_FORM_STATUS_NOT_SUBMITTED) })
    })
    await page.route("**/api/admin/property-entities/501/offer-form-send**", async (route) => {
      if (route.request().method() === "POST") {
        sendCalled = true
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) })
        return
      }
      await route.continue()
    })

    await openOffersDialog(page)

    const dialog = page.getByTestId("property-buyer-panel-offers-dialog")
    await dialog.getByTestId("buyer-offer-form-send--501").click()

    expect(sendCalled).toBe(true)
    // feedback: button shows sending state then resolves
    await expect(dialog.getByTestId("buyer-offer-form-send--501")).toBeEnabled({ timeout: 5_000 })
  })

  test("Offer Form section shows Submitted status and View Submission when submission exists", async ({ page }) => {
    await page.route("**/api/admin/property-entities/501/offer-form-status**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(OFFER_FORM_STATUS_SUBMITTED) })
    })

    await openOffersDialog(page)

    const dialog = page.getByTestId("property-buyer-panel-offers-dialog")
    await expect(dialog.getByTestId("buyer-offer-form-status--501")).toContainText(/submitted/i)
    await expect(dialog.getByTestId("buyer-offer-form-view-submission--501")).toBeVisible()
  })

  test("expanding View Submission shows submitted buyer and offer details", async ({ page }) => {
    await page.route("**/api/admin/property-entities/501/offer-form-status**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(OFFER_FORM_STATUS_SUBMITTED) })
    })

    await openOffersDialog(page)

    const dialog = page.getByTestId("property-buyer-panel-offers-dialog")
    await dialog.getByTestId("buyer-offer-form-view-submission--501").click()

    await expect(dialog.getByTestId("buyer-offer-form-submission-panel--501")).toBeVisible()
    await expect(dialog.getByTestId("buyer-offer-form-submission-panel--501")).toContainText("Test Buyer LLC")
    await expect(dialog.getByTestId("buyer-offer-form-submission-panel--501")).toContainText("650000")
    await expect(dialog.getByTestId("buyer-offer-form-submission-panel--501")).toContainText("ANZ")
  })

  // ── Edge cases ───────────────────────────────────────────────────────────

  test("Send button is disabled for buyer with no email address", async ({ page }) => {
    await page.route("**/api/admin/properties**", async (route: Route) => {
      const url = route.request().url()
      if (url.match(/\/api\/admin\/properties\/1001\/buyers(\?|$)/)) {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(BUYER_PANEL_TWO_BUYERS) })
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
    await page.route("**/api/admin/property-entities/502/buyer-offers**", async (route: Route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(BUYER_OFFERS_EMPTY) })
    })
    await page.route("**/api/admin/property-entities/502/offer-form-status**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ token: null, formUrl: null, submission: null }) })
    })

    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible()
    await page.getByTestId("admin-entity-row--properties--1001").click()
    await page.getByTestId("panda-properties-form-tab-trigger--buyers").click()
    await expect(page.getByTestId("property-buyers-panel-add-new")).toBeEnabled({ timeout: 10_000 })
    await page.getByTestId("property-buyer-owner-row-offers--502").click()

    const dialog = page.getByTestId("property-buyer-panel-offers-dialog")
    await expect(dialog).toBeVisible()
    await expect(dialog.getByTestId("buyer-offer-form-send--502")).toBeDisabled()
  })

  test("re-sending uses the same token URL (token reuse, not regenerated)", async ({ page }) => {
    const urls: string[] = []

    await page.route("**/api/admin/property-entities/501/offer-form-status**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(OFFER_FORM_STATUS_NOT_SUBMITTED) })
    })
    await page.route("**/api/admin/property-entities/501/offer-form-send**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(OFFER_FORM_TOKEN_REUSE_RESPONSE) })
    })

    await openOffersDialog(page)

    const dialog = page.getByTestId("property-buyer-panel-offers-dialog")
    const urlInput = dialog.getByTestId("buyer-offer-form-url--501")
    const firstUrl = await urlInput.inputValue()
    urls.push(firstUrl)

    await dialog.getByTestId("buyer-offer-form-send--501").click()
    await page.waitForTimeout(300)

    const secondUrl = await urlInput.inputValue()
    urls.push(secondUrl)

    expect(firstUrl).toBe(secondUrl)
    expect(firstUrl).toMatch(/^https?:\/\/.+\/offer-form\//)
  })
})
