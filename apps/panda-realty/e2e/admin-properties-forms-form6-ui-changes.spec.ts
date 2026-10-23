import { expect, test } from "@playwright/test"

import { requirePandaE2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import {
  EMPTY_ENTITIES,
  FORMS_LIST_FORM6,
  PREFILL_DATA_FULL,
  PREFILL_DATA_NO_OWNERS,
  RECIPIENTS_WITH_EMAIL,
  openForm6SendDialog,
  setupCommonRoutes,
} from "./helpers/panda-form6-send-mocks"

test.describe("Form 6 — Tab 3 address section, Tab 4 search criteria, Tab 5 removed", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaE2eAdminCredentials()
    await setupCommonRoutes(page, FORMS_LIST_FORM6)
    await page.route("**/api/admin/property-forms/prefill-data**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(PREFILL_DATA_FULL) })
    })
    await page.route("**/api/admin/property-forms/template**", async (route) => {
      if (route.request().method() !== "GET") { await route.fallback(); return }
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ templateValues: null }) })
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

  // ─── Tab 5 removal ────────────────────────────────────────────────────────────

  test("Tab 5 Termination is absent from the tab bar", async ({ page }) => {
    await openForm6SendDialog(page)
    await expect(page.getByTestId("form6-tab-trigger--5")).not.toBeVisible()
  })

  test("Tab bar shows 1–4 and 6–10 with no broken layout", async ({ page }) => {
    await openForm6SendDialog(page)
    for (const n of [1, 2, 3, 4, 6, 7, 8, 9, 10]) {
      await expect(page.getByTestId(`form6-tab-trigger--${n}`)).toBeVisible()
    }
  })

  // ─── Tab 3 — Address section ─────────────────────────────────────────────────

  test("Part 3 tab — Address section shows all four fields", async ({ page }) => {
    await openForm6SendDialog(page)
    await page.getByTestId("form6-tab-trigger--3").click()
    await expect(page.getByTestId("form6-part3-address")).toBeVisible()
    await expect(page.getByTestId("form6-part3-address-suburb")).toBeVisible()
    await expect(page.getByTestId("form6-part3-state")).toBeVisible()
    await expect(page.getByTestId("form6-part3-postcode")).toBeVisible()
  })

  test("Part 3 tab — Address and Suburb pre-filled from property data", async ({ page }) => {
    await openForm6SendDialog(page)
    await page.getByTestId("form6-tab-trigger--3").click()
    await expect(page.getByTestId("form6-part3-address")).toHaveValue("42 Oak Street")
    await expect(page.getByTestId("form6-part3-address-suburb")).toHaveValue("Brisbane City")
  })

  test("Part 3 tab — Address section blank when property has no address data", async ({ page }) => {
    await page.route("**/api/admin/property-forms/prefill-data**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ...PREFILL_DATA_NO_OWNERS, propertyStreetAddress: null, propertySuburb: null }),
      })
    })
    await openForm6SendDialog(page)
    await page.getByTestId("form6-tab-trigger--3").click()
    await expect(page.getByTestId("form6-part3-address")).toHaveValue("")
    await expect(page.getByTestId("form6-part3-address-suburb")).toHaveValue("")
  })

  test("Part 3 tab — Address edits preserved on tab switch", async ({ page }) => {
    await openForm6SendDialog(page)
    await page.getByTestId("form6-tab-trigger--3").click()
    await page.getByTestId("form6-part3-address").fill("Edited Address")
    await page.getByTestId("form6-tab-trigger--4").click()
    await page.getByTestId("form6-tab-trigger--3").click()
    await expect(page.getByTestId("form6-part3-address")).toHaveValue("Edited Address")
  })

  // ─── Tab 4 — Search criteria $ ───────────────────────────────────────────────

  test("Part 4 tab — Search criteria $ field is visible in Section 3 Price", async ({ page }) => {
    await openForm6SendDialog(page)
    await page.getByTestId("form6-tab-trigger--4").click()
    await expect(page.getByTestId("form6-part4-price-search-criteria")).toBeVisible()
  })

  test("Part 4 tab — Search criteria $ accepts input", async ({ page }) => {
    await openForm6SendDialog(page)
    await page.getByTestId("form6-tab-trigger--4").click()
    await page.getByTestId("form6-part4-price-search-criteria").fill("450000")
    await expect(page.getByTestId("form6-part4-price-search-criteria")).toHaveValue("450000")
  })

  test("Part 4 tab — Search criteria value included in prefillValues sent to API", async ({ page }) => {
    let capturedBody: Record<string, unknown> | null = null
    await page.route("**/api/admin/property-forms/send", async (route) => {
      capturedBody = JSON.parse(route.request().postData() ?? "{}") as Record<string, unknown>
      await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ sentCount: 1, ids: [99], failedEmails: [] }) })
    })
    await openForm6SendDialog(page)
    await page.getByTestId("form6-tab-trigger--4").click()
    await page.getByTestId("form6-part4-price-search-criteria").fill("550000")
    await page.getByTestId("property-form-prefill-next").click()
    await page.getByTestId("property-form-send-recipient--201").click()
    await page.getByTestId("property-form-send-submit").click()
    await expect(page.getByTestId("property-form-send-dialog")).not.toBeVisible()
    const prefillVals = (capturedBody as Record<string, unknown> | null)?.["prefillValues"] as Record<string, string> | undefined
    expect(prefillVals?.priceSearchCriteria).toBe("550000")
  })

  test("Part 4 tab — blank search criteria sends no priceSearchCriteria key", async ({ page }) => {
    let capturedBody: Record<string, unknown> | null = null
    await page.route("**/api/admin/property-forms/send", async (route) => {
      capturedBody = JSON.parse(route.request().postData() ?? "{}") as Record<string, unknown>
      await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ sentCount: 1, ids: [99], failedEmails: [] }) })
    })
    await openForm6SendDialog(page)
    await page.getByTestId("property-form-prefill-next").click()
    await page.getByTestId("property-form-send-recipient--201").click()
    await page.getByTestId("property-form-send-submit").click()
    await expect(page.getByTestId("property-form-send-dialog")).not.toBeVisible()
    const prefillVals = (capturedBody as Record<string, unknown> | null)?.["prefillValues"] as Record<string, string> | undefined
    expect(prefillVals?.priceSearchCriteria ?? "").toBe("")
  })

  test("Part 4 tab — search criteria value preserved on tab switch", async ({ page }) => {
    await openForm6SendDialog(page)
    await page.getByTestId("form6-tab-trigger--4").click()
    await page.getByTestId("form6-part4-price-search-criteria").fill("700000")
    await page.getByTestId("form6-tab-trigger--3").click()
    await page.getByTestId("form6-tab-trigger--4").click()
    await expect(page.getByTestId("form6-part4-price-search-criteria")).toHaveValue("700000")
  })
})
