import { expect, test, type Page } from "@playwright/test"

import { requirePandaE2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import {
  EMPTY_ENTITIES,
  FORMS_LIST_FORM6,
  RECIPIENTS_WITH_EMAIL,
  TEMPLATE_RESPONSE_EMPTY,
  openForm6SendDialog,
  routeTemplateGet,
  routeTemplatePost,
  setupCommonRoutes,
} from "./helpers/panda-form6-send-mocks"
import { PREFILL_DATA_WITH_EXTRA_CLIENT_FIELDS } from "./helpers/panda-form6-mock-data"

// ─── Common beforeEach ────────────────────────────────────────────────────────

async function setupSyncBackRoutes({ page }: { page: Parameters<typeof signInAsAdmin>[0] }) {
  requirePandaE2eAdminCredentials()
  await setupCommonRoutes(page, FORMS_LIST_FORM6)
  await page.route("**/api/admin/property-forms/prefill-data**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(PREFILL_DATA_WITH_EXTRA_CLIENT_FIELDS),
    })
  })
  await page.route("**/api/admin/properties/1001/buyers**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_ENTITIES) })
  })
  await page.route("**/api/admin/properties/1001/contacts**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_ENTITIES) })
  })
  await page.route("**/api/admin/properties/1001/tenants**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(RECIPIENTS_WITH_EMAIL) })
  })
  await signInAsAdmin(page)
}

// Helper: open the dialog, click Save as Template, return the captured templateValues
async function captureTemplateValues(page: Page): Promise<Record<string, string>> {
  await routeTemplateGet(page, TEMPLATE_RESPONSE_EMPTY)
  let capturedBody: Record<string, unknown> | null = null
  await routeTemplatePost(page, { onRequest: (body) => { capturedBody = body as Record<string, unknown> } })
  await openForm6SendDialog(page)
  await page.getByTestId("form6-save-template-btn").click()
  await expect(page.getByTestId("form6-save-template-btn")).toBeEnabled()
  return (capturedBody as unknown as { templateValues: Record<string, string> }).templateValues
}

// ─── Save as Template includes new client field values ────────────────────────

test.describe("Form 6 sync-back — Save as Template captures new client fields", () => {
  test.beforeEach(setupSyncBackRoutes)

  test("POST body includes seller1NameLine2", async ({ page }) => {
    const values = await captureTemplateValues(page)
    expect(values.seller1NameLine2).toBe("Trading As JS Holdings")
  })

  test("POST body includes seller1Acn", async ({ page }) => {
    const values = await captureTemplateValues(page)
    expect(values.seller1Acn).toBe("123 456 789")
  })

  test("POST body includes seller1Address2", async ({ page }) => {
    const values = await captureTemplateValues(page)
    expect(values.seller1Address2).toBe("Unit 5")
  })

  test("POST body includes seller1Fax", async ({ page }) => {
    const values = await captureTemplateValues(page)
    expect(values.seller1Fax).toBe("0700000001")
  })

  test("POST body includes seller1GstRegistered", async ({ page }) => {
    const values = await captureTemplateValues(page)
    expect(values.seller1GstRegistered).toBe("Yes")
  })

  test("Edited Form 6 nameLine2 is reflected in Save as Template POST body", async ({ page }) => {
    await routeTemplateGet(page, TEMPLATE_RESPONSE_EMPTY)
    let capturedBody: Record<string, unknown> | null = null
    await routeTemplatePost(page, { onRequest: (body) => { capturedBody = body as Record<string, unknown> } })

    await openForm6SendDialog(page)
    await page.getByTestId("form6-part1-client1-nameline2").fill("EDITED NAME 2")
    await page.getByTestId("form6-save-template-btn").click()

    const values = (capturedBody as unknown as { templateValues: Record<string, string> }).templateValues
    expect(values.seller1NameLine2).toBe("EDITED NAME 2")
  })
})

// ─── Send includes new client field values in prefillValues ──────────────────

test.describe("Form 6 sync-back — Send request includes new client fields", () => {
  test.beforeEach(setupSyncBackRoutes)

  test("Send POST body prefillValues includes seller1NameLine2 and seller1Acn", async ({ page }) => {
    await routeTemplateGet(page, TEMPLATE_RESPONSE_EMPTY)

    let capturedSendBody: Record<string, unknown> | null = null
    await page.route("**/api/admin/property-forms/send**", async (route) => {
      capturedSendBody = JSON.parse(route.request().postData() ?? "{}") as Record<string, unknown>
      await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ ok: true }) })
    })

    await openForm6SendDialog(page)
    await page.getByTestId("property-form-prefill-next").click()
    await expect(page.getByTestId("property-form-send-recipients")).toBeVisible()
    await page.getByTestId("property-form-send-recipient--201").click()
    await page.getByTestId("property-form-send-submit").click()

    expect(capturedSendBody).not.toBeNull()
    const prefillValues = (capturedSendBody as unknown as { prefillValues: Record<string, string> }).prefillValues
    expect(prefillValues.seller1NameLine2).toBe("Trading As JS Holdings")
    expect(prefillValues.seller1Acn).toBe("123 456 789")
    expect(prefillValues.seller1Fax).toBe("0700000001")
    expect(prefillValues.seller1Address2).toBe("Unit 5")
    expect(prefillValues.seller1GstRegistered).toBe("Yes")
  })
})
