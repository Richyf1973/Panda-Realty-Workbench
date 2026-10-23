import { expect, test } from "@playwright/test"

import { requirePandaE2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import {
  EMPTY_ENTITIES,
  FORMS_LIST_NO_PREFILL,
  RECIPIENTS_WITH_EMAIL,
  openFormsTab,
  setupCommonRoutes,
} from "./helpers/panda-form6-send-mocks"

test.describe("Non-prefill form — single-step dialog unchanged", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaE2eAdminCredentials()
    await setupCommonRoutes(page, FORMS_LIST_NO_PREFILL)
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

  test("Send on non-prefill form shows single-step dialog (no tabs)", async ({ page }) => {
    await openFormsTab(page)
    await page.getByTestId("property-forms-send--2").click()
    await expect(page.getByTestId("property-form-send-dialog")).toBeVisible()
    await expect(page.getByTestId("form6-fill-step")).not.toBeVisible()
    await expect(page.getByTestId("property-form-send-recipients")).toBeVisible()
  })
})
