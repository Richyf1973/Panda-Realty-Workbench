import { expect, test } from "@playwright/test"

import { requirePandaE2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import {
  EMPTY_ENTITIES,
  FORMS_LIST_FORM6,
  FORMS_LIST_PRO_FORMA,
  PREFILL_DATA_FULL,
  RECIPIENTS_WITH_EMAIL,
  TEMPLATE_RESPONSE_EMPTY,
  TEMPLATE_VALUES_SAVED,
  TEMPLATE_VALUES_WITH_AGENT,
  openForm6SendDialog,
  openFormsTab,
  routeTemplateGet,
  routeTemplatePost,
  setupCommonRoutes,
} from "./helpers/panda-form6-send-mocks"

test.describe("Form 6 — Save as Template", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaE2eAdminCredentials()
    await setupCommonRoutes(page, FORMS_LIST_FORM6)
    await page.route("**/api/admin/property-forms/prefill-data**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(PREFILL_DATA_FULL) })
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
  })

  // ─── Button presence ────────────────────────────────────────────────────────

  test("Save as Template button is visible in Form 6 prefill step footer", async ({ page }) => {
    await routeTemplateGet(page, TEMPLATE_RESPONSE_EMPTY)
    await openForm6SendDialog(page)
    await expect(page.getByTestId("form6-save-template-btn")).toBeVisible()
  })

  test("Save as Template button is NOT visible in Step 2 (send step)", async ({ page }) => {
    await routeTemplateGet(page, TEMPLATE_RESPONSE_EMPTY)
    await openForm6SendDialog(page)
    await page.getByTestId("property-form-prefill-next").click()
    await expect(page.getByTestId("form6-fill-step")).not.toBeVisible()
    await expect(page.getByTestId("form6-save-template-btn")).not.toBeVisible()
  })

  test("Save as Template button is NOT visible for Pro Forma 2026 form", async ({ page }) => {
    // Override forms list with Pro Forma (non-Form-6 prefill strategy)
    await setupCommonRoutes(page, FORMS_LIST_PRO_FORMA)
    await page.route("**/api/admin/property-forms/prefill-data**", async (route) => {
      await route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify({
          buyers: [], solicitor: null,
        }),
      })
    })
    await openFormsTab(page)
    await page.getByTestId("property-forms-send--2").click()
    await expect(page.getByTestId("property-form-send-dialog")).toBeVisible()
    await expect(page.getByTestId("form6-save-template-btn")).not.toBeVisible()
  })

  // ─── Save behaviour ─────────────────────────────────────────────────────────

  test("Clicking Save as Template calls POST template API with all current values", async ({ page }) => {
    await routeTemplateGet(page, TEMPLATE_RESPONSE_EMPTY)
    let capturedBody: Record<string, unknown> | null = null
    await routeTemplatePost(page, {
      onRequest: (body) => { capturedBody = body as Record<string, unknown> },
    })

    await openForm6SendDialog(page)
    // Wait for DB prefill to settle (fires after template load completes)
    await expect(page.getByTestId("form6-part1-client1-name")).toHaveValue("John Smith")
    await page.getByTestId("form6-tab-trigger--7").click()
    await page.getByTestId("form6-part7-commission").fill("2.75% of sale price")
    await page.getByTestId("form6-save-template-btn").click()

    await expect(page.getByTestId("form6-save-template-btn")).toBeEnabled()
    expect(capturedBody).not.toBeNull()
    const body = capturedBody as unknown as Record<string, unknown>
    expect(body.propertyFormId).toBe(3)
    const saved = body.templateValues as Record<string, string>
    expect(saved).toBeDefined()
    expect(saved.commission).toBe("2.75% of sale price")
    // DB-prefilled seller field should also be captured in the save payload
    expect(saved.seller1Name).toBe("John Smith")
  })

  test("Toast 'Template saved' appears after successful save", async ({ page }) => {
    await routeTemplateGet(page, TEMPLATE_RESPONSE_EMPTY)
    await routeTemplatePost(page)

    await openForm6SendDialog(page)
    await page.getByTestId("form6-save-template-btn").click()

    await expect(page.getByText("Template saved")).toBeVisible()
  })

  test("Dialog stays on Step 1 after saving template", async ({ page }) => {
    await routeTemplateGet(page, TEMPLATE_RESPONSE_EMPTY)
    await routeTemplatePost(page)

    await openForm6SendDialog(page)
    await page.getByTestId("form6-save-template-btn").click()

    await expect(page.getByTestId("form6-fill-step")).toBeVisible()
    await expect(page.getByTestId("property-form-send-dialog")).toContainText("Step 1 of 2")
  })

  test("Save button is disabled during the save request", async ({ page }) => {
    await routeTemplateGet(page, TEMPLATE_RESPONSE_EMPTY)
    let resolveRoute!: () => void
    await page.route("**/api/admin/property-forms/template**", async (route) => {
      if (route.request().method() !== "POST") { await route.fallback(); return }
      await new Promise<void>((resolve) => { resolveRoute = resolve })
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) })
    })

    await openForm6SendDialog(page)
    await page.getByTestId("form6-save-template-btn").click()
    await expect(page.getByTestId("form6-save-template-btn")).toBeDisabled()
    resolveRoute()
    await expect(page.getByTestId("form6-save-template-btn")).toBeEnabled()
  })

  // ─── Template pre-population on open ────────────────────────────────────────

  test("Opening Form 6 loads saved template values for non-DB fields", async ({ page }) => {
    await routeTemplateGet(page, TEMPLATE_VALUES_SAVED)
    await routeTemplatePost(page)

    await openForm6SendDialog(page)
    // Wait for DB prefill to settle — confirms template + DB merge is complete
    await expect(page.getByTestId("form6-part1-client1-name")).toHaveValue("John Smith")

    // Agency type from template (DB never sets this)
    await page.getByTestId("form6-tab-trigger--6").click()
    await expect(page.getByTestId("form6-part6-agency-exclusive")).toBeChecked()

    // Advertising text from template (DB never sets this)
    await page.getByTestId("form6-tab-trigger--8").click()
    await expect(page.getByTestId("form6-part8-advertising-text")).toHaveValue("Domain + REA standard package")
  })

  test("Template commission wins over DB commissionRate when template has a value", async ({ page }) => {
    await routeTemplateGet(page, TEMPLATE_VALUES_SAVED)

    await openForm6SendDialog(page)

    // Template has "2.75% of sale price" and DB has commissionRate "3.3" → template wins
    await page.getByTestId("form6-tab-trigger--7").click()
    await expect(page.getByTestId("form6-part7-commission")).toHaveValue("2.75% of sale price")
  })

  test("DB prefill overrides template for seller/property fields", async ({ page }) => {
    await routeTemplateGet(page, TEMPLATE_VALUES_SAVED)

    await openForm6SendDialog(page)

    // Template has "Stale Template Seller" but DB prefill has "John Smith" — DB wins
    await expect(page.getByTestId("form6-part1-client1-name")).toHaveValue("John Smith")
    await expect(page.getByTestId("form6-part1-client1-email")).toHaveValue("john@example.com")

    // Template has "999 Stale Template Street" but DB has "42 Oak Street" — DB wins
    await page.getByTestId("form6-tab-trigger--3").click()
    await expect(page.getByTestId("form6-part3-description1")).toHaveValue("42 Oak Street")
  })

  test("Template fees fields pre-populate from saved template", async ({ page }) => {
    await routeTemplateGet(page, TEMPLATE_VALUES_SAVED)

    await openForm6SendDialog(page)
    await page.getByTestId("form6-tab-trigger--8").click()
    await expect(page.getByTestId("form6-part8-advertising-text")).toHaveValue("Domain + REA standard package")
    await expect(page.getByTestId("form6-part8-advertising-amount")).toHaveValue("3500")
    await expect(page.getByTestId("form6-part8-other-fee1-desc")).toHaveValue("Photography")
    await expect(page.getByTestId("form6-part8-other-fee1-amount")).toHaveValue("450")
  })

  // ─── Licensee / Part 2 template fields ──────────────────────────────────────

  test("Template agent/licensee fields survive auto-select — not overwritten by first agent", async ({ page }) => {
    await routeTemplateGet(page, TEMPLATE_VALUES_WITH_AGENT)

    await openForm6SendDialog(page)

    // Wait for DB + template merge to settle
    await expect(page.getByTestId("form6-part1-client1-name")).toHaveValue("John Smith")

    await page.getByTestId("form6-tab-trigger--2").click()

    // These must come from the template, not from AGENTS_LIST[0] (My Panda Realty / 12345 / 12 345 678 901)
    await expect(page.getByTestId("form6-part2-trading-name")).toHaveValue("Template Custom Agency")
    await expect(page.getByTestId("form6-part2-licence-number")).toHaveValue("SAVED-999")
    await expect(page.getByTestId("form6-part2-abn")).toHaveValue("99 999 999 999")
  })

  // ─── No template saved ──────────────────────────────────────────────────────

  test("No saved template — form opens normally with DB prefill only, no errors", async ({ page }) => {
    await routeTemplateGet(page, TEMPLATE_RESPONSE_EMPTY)

    await openForm6SendDialog(page)

    // DB-sourced fields still present
    await expect(page.getByTestId("form6-part1-client1-name")).toHaveValue("John Smith")
    // Commission falls back to DB-derived rate when no template
    await page.getByTestId("form6-tab-trigger--7").click()
    await expect(page.getByTestId("form6-part7-commission")).toHaveValue(/3\.3/)
    // No error shown
    await expect(page.getByTestId("form6-fill-step")).toBeVisible()
  })

  // ─── Error handling ─────────────────────────────────────────────────────────

  test("Save API error — error message shown near button, dialog stays on Step 1", async ({ page }) => {
    await routeTemplateGet(page, TEMPLATE_RESPONSE_EMPTY)
    await routeTemplatePost(page, { status: 500 })

    await openForm6SendDialog(page)
    await page.getByTestId("form6-save-template-btn").click()

    await expect(page.getByTestId("form6-save-template-error")).toBeVisible()
    await expect(page.getByTestId("form6-fill-step")).toBeVisible()
  })
})
