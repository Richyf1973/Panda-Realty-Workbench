/**
 * Run (from repo root):
 *   npx playwright test apps/panda-realty/e2e/admin-properties-gmail-signatures.spec.ts --config=apps/panda-realty/playwright.config.ts
 * Or via workspace script:
 *   npm run test:e2e -w panda-realty -- apps/panda-realty/e2e/admin-properties-gmail-signatures.spec.ts
 */
import { expect, test, type Page } from "@playwright/test"

import { requirePandaE2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import { routePandaPropertiesListDetailAndBuyerOffers } from "./helpers/panda-properties-dialog-mocks"
import { parseFormDataBody } from "./helpers/panda-properties-gmail-helpers"

const STATUS_MIN = {
  items: [{ propertyStatusId: 1, propertyStatusCode: "ACTIVE", propertyStatus: "Active" }],
  totalCount: 1,
  limit: 100,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false,
  startCursor: null,
  endCursor: null,
}

const BUYER_WITH_EMAIL = {
  items: [
    {
      propertyEntityId: 501,
      entityId: 201,
      entityName: "Ash D",
      phoneNumber: "0475770513",
      emailAddress: "dhungelashok33@gmail.com",
      address: null,
      esuburb: null,
      estate: null,
      epostcode: null,
      notes: null,
      buyerPipelineStatusId: null,
      pipelineStatusLabel: "Active Buyers",
    },
  ],
}

const EMPTY_PANEL_RESPONSE = { items: [] }

const DEFAULT_SIGNATURE = {
  id: 1,
  name: "Office default",
  isDefault: true,
  htmlContent:
    "<p>Regards</p><p>Richard Falzon</p><p><img src=\"https://example.com/default-signature.png\" alt=\"Office default signature\"></p>",
  renderedHtml:
    "<p>Regards</p><p>Richard Falzon</p><p><img src=\"https://example.com/default-signature.png\" alt=\"Office default signature\"></p>",
}

const ALT_SIGNATURE = {
  id: 2,
  name: "Richard promo",
  isDefault: false,
  htmlContent:
    "<p>Kind regards</p><p>Richard Falzon</p><p><img src=\"https://example.com/richard-signature.png\" alt=\"Richard promo signature\"></p>",
  renderedHtml:
    "<p>Kind regards</p><p>Richard Falzon</p><p><img src=\"https://example.com/richard-signature.png\" alt=\"Richard promo signature\"></p>",
}

interface ComposeSendPayload {
  bodyHtml: string
  signatureHtml?: string
}

async function setupAndOpenCompose(page: Page) {
  await page.route("**/api/admin/property-status**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(STATUS_MIN) })
  })
  await page.route("**/api/admin/property-entities**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items: [], totalCount: 0, limit: 20, totalPages: 0, hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null }),
    })
  })

  await page.route("**/api/admin/email-signatures**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items: [DEFAULT_SIGNATURE, ALT_SIGNATURE] }),
    })
  })

  await routePandaPropertiesListDetailAndBuyerOffers(page)
  await page.route("**/api/admin/properties/1001/buyers**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(BUYER_WITH_EMAIL) })
  })
  await page.route("**/api/admin/properties/1001/contacts**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_PANEL_RESPONSE) })
  })
  await page.route("**/api/admin/properties/1001/tenants**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_PANEL_RESPONSE) })
  })

  await page.goto("/admin/properties")
  await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible()
  await page.getByTestId("admin-entity-row--properties--1001").click()
  await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible()
  await page.getByTestId("panda-properties-form-tab-trigger--buyers").click()
  const [, signaturesResponse] = await Promise.all([
    page.getByTestId("property-buyer-panel-quick-email--501").click(),
    page.waitForResponse((response) => response.url().includes("/api/admin/email-signatures") && response.status() === 200),
  ])
  const signaturesJson = (await signaturesResponse.json()) as { items?: Array<{ id: number }> }
  expect(signaturesJson.items?.length).toBe(2)
  await expect(page.getByTestId("property-gmail-compose-dialog")).toBeVisible()
}

test.describe("Panda Realty - compose signatures inside the draft body", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaE2eAdminCredentials()
    await signInAsAdmin(page)
  })

  test("compose dialog shows the rich editor with include-signature enabled by default", async ({ page }) => {
    await setupAndOpenCompose(page)

    await expect(page.getByTestId("property-gmail-compose-to")).toHaveValue("dhungelashok33@gmail.com")
    await expect(page.getByTestId("property-gmail-compose-subject")).toHaveValue("12 Test Street, Testville")
    await expect(page.getByTestId("property-gmail-compose-editor")).toContainText("Dear Ash D,")
    await expect(page.getByTestId("property-gmail-compose-include-signature")).toBeChecked()
    await expect(page.getByTestId("property-gmail-compose-signature-select")).toContainText("Office default")
    await expect(page.getByTestId("property-gmail-compose-editor")).toContainText("Regards")
  })

  test("send posts visible draft bodyHtml with the selected signature already embedded", async ({ page }) => {
    const sentBodies: ComposeSendPayload[] = []
    await page.route("**/api/admin/gmail/send**", async (route) => {
      sentBodies.push((await parseFormDataBody(route)) as unknown as ComposeSendPayload)
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) })
    })

    await setupAndOpenCompose(page)
    await page.getByTestId("property-gmail-compose-signature-select").click()
    await page.getByRole("option", { name: /richard promo/i }).click()
    await page.getByTestId("property-gmail-compose-send").evaluate((button) => {
      ;(button as HTMLButtonElement).click()
    })

    const payload = sentBodies[0]
    if (payload == null) {
      throw new Error("Expected a Gmail send payload.")
    }

    expect(payload.bodyHtml).toContain("Dear Ash D")
    expect(payload.bodyHtml).toContain("richard-signature.png")
    expect(payload.signatureHtml).toBeUndefined()
  })

  test("disabling include signature removes the signature block but keeps send available", async ({ page }) => {
    const sentBodies: ComposeSendPayload[] = []
    await page.route("**/api/admin/gmail/send**", async (route) => {
      sentBodies.push((await parseFormDataBody(route)) as unknown as ComposeSendPayload)
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) })
    })

    await setupAndOpenCompose(page)
    await page.getByTestId("property-gmail-compose-include-signature").uncheck()
    await expect(page.getByTestId("property-gmail-compose-editor")).not.toContainText("Regards")
    await page.getByTestId("property-gmail-compose-send").evaluate((button) => {
      ;(button as HTMLButtonElement).click()
    })

    const payload = sentBodies[0]
    if (payload == null) {
      throw new Error("Expected a Gmail send payload.")
    }

    expect(payload.bodyHtml).not.toContain("default-signature.png")
    expect(payload.signatureHtml).toBeUndefined()
  })

  test("the last selected signature is remembered in localStorage for the same browser session", async ({ page }) => {
    await setupAndOpenCompose(page)

    await page.getByTestId("property-gmail-compose-signature-select").click()
    await page.getByRole("option", { name: /richard promo/i }).click()
    await page.getByTestId("property-gmail-compose-cancel").click()

    await page.getByTestId("property-buyer-panel-quick-email--501").click()
    await expect(page.getByTestId("property-gmail-compose-signature-select")).toContainText("Richard promo")
    await expect(page.getByTestId("property-gmail-compose-editor")).toContainText("Kind regards")
  })

  test("a fresh browser session falls back to the office default when no local preference exists", async ({ browser }) => {
    const page = await browser.newPage()
    await signInAsAdmin(page)
    await setupAndOpenCompose(page)

    await expect(page.getByTestId("property-gmail-compose-signature-select")).toContainText("Office default")
    await expect(page.getByTestId("property-gmail-compose-include-signature")).toBeChecked()
  })

  test("the old external email-client handoff is no longer rendered", async ({ page }) => {
    await setupAndOpenCompose(page)

    await expect(page.getByTestId("property-gmail-compose-open-client")).toHaveCount(0)
  })

  test("gmail-not-connected errors still surface inline with the new signature controls present", async ({ page }) => {
    await page.route("**/api/admin/gmail/send**", async (route) => {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: "Gmail is not connected. Please connect your Google account." }),
      })
    })

    await setupAndOpenCompose(page)

    await expect(page.getByTestId("property-gmail-compose-include-signature")).toBeChecked()
    await page.getByTestId("property-gmail-compose-send").evaluate((button) => {
      ;(button as HTMLButtonElement).click()
    })

    await expect(page.getByTestId("property-gmail-compose-error")).toContainText(/not connected/i)
  })
})
