import { expect, test } from "@playwright/test"

import { requirePandaE2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import {
  EMPTY_ENTITIES,
  FORMS_LIST_PREFILL,
  PREFILL_DATA_EMPTY,
  PREFILL_DATA_NO_SOLICITOR,
} from "./helpers/panda-proforma-mock-data"
import { openFormsTab, setupCommonRoutes } from "./helpers/panda-proforma-send-mocks"

test.describe("Pre-fill wizard edge cases", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaE2eAdminCredentials()
    await setupCommonRoutes(page, FORMS_LIST_PREFILL)
    await page.route("**/api/admin/properties/1001/buyers**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_ENTITIES) })
    })
    await page.route("**/api/admin/properties/1001/contacts**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_ENTITIES) })
    })
    await page.route("**/api/admin/properties/1001/tenants**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_ENTITIES) })
    })
    await signInAsAdmin(page)
  })

  test("No buyers → Step 1 buyer fields are empty, no error shown", async ({ page }) => {
    await page.route("**/api/admin/property-forms/prefill-data**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(PREFILL_DATA_EMPTY) })
    })

    await openFormsTab(page)
    await page.getByTestId("property-forms-send--1").click()
    await expect(page.getByTestId("property-form-prefill-step")).toBeVisible()

    await expect(page.getByTestId("property-form-prefill-buyer1-name")).toHaveValue("")
    await expect(page.getByTestId("property-form-prefill-buyer2-name")).toHaveValue("")
    await expect(page.getByTestId("property-form-prefill-buyer-address")).toHaveValue("")
    await expect(page.getByTestId("property-form-send-error")).not.toBeVisible()
  })

  test("No solicitor → solicitor fields are empty, Next still works", async ({ page }) => {
    await page.route("**/api/admin/property-forms/prefill-data**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(PREFILL_DATA_NO_SOLICITOR) })
    })

    await openFormsTab(page)
    await page.getByTestId("property-forms-send--1").click()
    await expect(page.getByTestId("property-form-prefill-step")).toBeVisible()

    await expect(page.getByTestId("property-form-prefill-solicitor-name")).toHaveValue("")
    await expect(page.getByTestId("property-form-prefill-solicitor-phone")).toHaveValue("")

    await page.getByTestId("property-form-prefill-next").click()
    await expect(page.getByTestId("property-form-prefill-step")).not.toBeVisible()
    await expect(page.getByTestId("property-form-send-dialog")).toBeVisible()
  })
})
