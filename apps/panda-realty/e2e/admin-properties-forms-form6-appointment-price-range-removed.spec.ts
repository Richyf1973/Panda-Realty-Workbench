import { expect, test } from "@playwright/test"

import { requirePandaE2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import {
  EMPTY_ENTITIES,
  FORMS_LIST_FORM6,
  PREFILL_DATA_FULL,
  RECIPIENTS_WITH_EMAIL,
  openForm6SendDialog,
  setupCommonRoutes,
} from "./helpers/panda-form6-send-mocks"

test.describe("Form 6 — Part 4 Appointment: Range $ field removed from Section 3 Price", () => {
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

  test("Range $ label is not present in Section 3 Price", async ({ page }) => {
    await openForm6SendDialog(page)
    await page.getByTestId("form6-tab-trigger--4").click()
    await expect(page.getByText("Range $")).not.toBeVisible()
  })

  test("$ amount and Search criteria $ fields are both visible", async ({ page }) => {
    await openForm6SendDialog(page)
    await page.getByTestId("form6-tab-trigger--4").click()
    await expect(page.getByTestId("form6-part4-price-amount")).toBeVisible()
    await expect(page.getByTestId("form6-part4-price-search-criteria")).toBeVisible()
  })

  test("$ amount field accepts input normally", async ({ page }) => {
    await openForm6SendDialog(page)
    await page.getByTestId("form6-tab-trigger--4").click()
    await page.getByTestId("form6-part4-price-amount").fill("500000")
    await expect(page.getByTestId("form6-part4-price-amount")).toHaveValue("500000")
  })

  test("Search criteria $ field accepts input normally", async ({ page }) => {
    await openForm6SendDialog(page)
    await page.getByTestId("form6-tab-trigger--4").click()
    await page.getByTestId("form6-part4-price-search-criteria").fill("450000")
    await expect(page.getByTestId("form6-part4-price-search-criteria")).toHaveValue("450000")
  })

  test("Section 3 Price grid has exactly two input fields", async ({ page }) => {
    await openForm6SendDialog(page)
    await page.getByTestId("form6-tab-trigger--4").click()
    // Locate the price grid by its two known testid inputs — no third sibling input
    const amountInput = page.getByTestId("form6-part4-price-amount")
    const criteriaInput = page.getByTestId("form6-part4-price-search-criteria")
    await expect(amountInput).toBeVisible()
    await expect(criteriaInput).toBeVisible()
    // Confirm the grid wrapper contains exactly 2 F6Field children (2 inputs, no Range)
    const priceGrid = page.locator("[data-testid='form6-part4-price-amount']").locator("xpath=ancestor::div[contains(@class,'grid')][1]")
    await expect(priceGrid.locator("input")).toHaveCount(2)
  })
})
