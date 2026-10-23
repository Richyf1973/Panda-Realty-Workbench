import { expect, test } from "@playwright/test"

import { requirePandaE2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import { routePandaPropertiesListDetailAndBuyerOffers } from "./helpers/panda-properties-dialog-mocks"
import {
  BUYERS_WITH_EMAIL,
  EMPTY_ENTITIES,
  FORMS_LIST_PREFILL,
  PREFILL_DATA,
} from "./helpers/panda-proforma-mock-data"
import { makeProFormaPrefill, openFormsTab, setupCommonRoutes } from "./helpers/panda-proforma-send-mocks"

test.describe("Pro Forma Contract 2026 — pre-fill two-step wizard (mocked APIs)", () => {
  test.beforeEach(makeProFormaPrefill(PREFILL_DATA))

  test("Send on prefill form opens Step 1 wizard with heading", async ({ page }) => {
    await openFormsTab(page)
    await page.getByTestId("property-forms-send--1").click()
    await expect(page.getByTestId("property-form-send-dialog")).toBeVisible()
    await expect(page.getByTestId("property-form-prefill-step")).toBeVisible()
    await expect(page.getByTestId("property-form-prefill-step")).toContainText("Step 1")
    await expect(page.getByTestId("property-form-prefill-step")).toContainText("Pre-fill buyer details")
  })

  test("Step 1 pre-populates buyer fields from prefill-data API", async ({ page }) => {
    await openFormsTab(page)
    await page.getByTestId("property-forms-send--1").click()
    await expect(page.getByTestId("property-form-prefill-step")).toBeVisible()

    await expect(page.getByTestId("property-form-prefill-buyer1-name")).toHaveValue("John Smith")
    await expect(page.getByTestId("property-form-prefill-buyer2-name")).toHaveValue("Jane Smith")
    await expect(page.getByTestId("property-form-prefill-buyer-address")).toHaveValue("10 Main St, Brisbane")
    await expect(page.getByTestId("property-form-prefill-buyer-phone")).toHaveValue("0400111111")
    await expect(page.getByTestId("property-form-prefill-buyer-email")).toHaveValue("john@example.com")
  })

  test("Step 1 pre-populates solicitor fields from prefill-data API", async ({ page }) => {
    await openFormsTab(page)
    await page.getByTestId("property-forms-send--1").click()
    await expect(page.getByTestId("property-form-prefill-step")).toBeVisible()

    await expect(page.getByTestId("property-form-prefill-solicitor-name")).toHaveValue("Smith Legal")
    await expect(page.getByTestId("property-form-prefill-solicitor-phone")).toHaveValue("07 3000 0000")
    await expect(page.getByTestId("property-form-prefill-solicitor-address")).toHaveValue("Level 1, 10 Law St")
    await expect(page.getByTestId("property-form-prefill-solicitor-email")).toHaveValue("sol@smithlegal.com.au")
  })

  test("Step 1 shows property address as read-only from property data", async ({ page }) => {
    await openFormsTab(page)
    await page.getByTestId("property-forms-send--1").click()
    await expect(page.getByTestId("property-form-prefill-step")).toBeVisible()
    // Property comes from mock: streetAddress "12 Test Street", suburb "Testville"
    await expect(page.getByTestId("property-form-prefill-property-address")).toContainText("12 Test Street")
  })

  test("Step 1 fields are editable — edited value is accepted", async ({ page }) => {
    await openFormsTab(page)
    await page.getByTestId("property-forms-send--1").click()
    await expect(page.getByTestId("property-form-prefill-step")).toBeVisible()

    await page.getByTestId("property-form-prefill-buyer1-name").fill("Edited Buyer Name")
    await expect(page.getByTestId("property-form-prefill-buyer1-name")).toHaveValue("Edited Buyer Name")
  })

  test("Next advances to Step 2 showing recipients", async ({ page }) => {
    await openFormsTab(page)
    await page.getByTestId("property-forms-send--1").click()
    await expect(page.getByTestId("property-form-prefill-step")).toBeVisible()

    await page.getByTestId("property-form-prefill-next").click()

    await expect(page.getByTestId("property-form-prefill-step")).not.toBeVisible()
    await expect(page.getByTestId("property-form-send-recipients")).toBeVisible()
    await expect(page.getByTestId("property-form-send-dialog")).toContainText("Step 2")
  })

  test("Step 2 shows pre-fill notice to agent", async ({ page }) => {
    await openFormsTab(page)
    await page.getByTestId("property-forms-send--1").click()
    await page.getByTestId("property-form-prefill-next").click()

    await expect(page.getByTestId("property-form-send-dialog")).toContainText("pre-filled PDF")
  })

  test("Back from Step 2 returns to Step 1 with edits preserved", async ({ page }) => {
    await openFormsTab(page)
    await page.getByTestId("property-forms-send--1").click()
    await expect(page.getByTestId("property-form-prefill-step")).toBeVisible()

    await page.getByTestId("property-form-prefill-buyer1-name").fill("Edited Name")
    await page.getByTestId("property-form-prefill-next").click()
    await expect(page.getByTestId("property-form-prefill-step")).not.toBeVisible()

    await page.getByTestId("property-form-send-back").click()

    await expect(page.getByTestId("property-form-prefill-step")).toBeVisible()
    await expect(page.getByTestId("property-form-prefill-buyer1-name")).toHaveValue("Edited Name")
  })

  test("Full wizard flow — Next, select recipients, Send calls the send API", async ({ page }) => {
    let capturedBody: unknown = null
    await page.route("**/api/admin/property-forms/send", async (route) => {
      capturedBody = JSON.parse(route.request().postData() ?? "{}")
      await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ sentCount: 1, ids: [99], failedEmails: [] }) })
    })

    await openFormsTab(page)
    // Re-register sub-routes AFTER openFormsTab (LIFO route ordering)
    await page.route("**/api/admin/properties/1001/buyers**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(BUYERS_WITH_EMAIL) })
    })
    await page.route("**/api/admin/properties/1001/contacts**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_ENTITIES) })
    })
    await page.route("**/api/admin/properties/1001/tenants**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_ENTITIES) })
    })

    await page.getByTestId("property-forms-send--1").click()
    await page.getByTestId("property-form-prefill-next").click()

    // Select John Smith (entityId 201)
    await page.getByTestId("property-form-send-recipient--201").click()
    await expect(page.getByTestId("property-form-send-submit")).toBeEnabled()
    await page.getByTestId("property-form-send-submit").click()

    await expect(page.getByTestId("property-form-send-dialog")).not.toBeVisible()
    expect(capturedBody).toMatchObject({
      propertyFormId: 1,
      propertyListId: 1001,
      recipientEntityIds: [201],
    })
    expect(capturedBody).toHaveProperty("prefillValues")
  })

  test("Cancel from Step 1 closes the dialog", async ({ page }) => {
    await openFormsTab(page)
    await page.getByTestId("property-forms-send--1").click()
    await expect(page.getByTestId("property-form-prefill-step")).toBeVisible()

    await page.getByTestId("property-form-send-cancel").click()
    await expect(page.getByTestId("property-form-send-dialog")).not.toBeVisible()
  })

  test("Cancel from Step 2 closes the dialog", async ({ page }) => {
    await openFormsTab(page)
    await page.getByTestId("property-forms-send--1").click()
    await page.getByTestId("property-form-prefill-next").click()

    await page.getByTestId("property-form-send-cancel").click()
    await expect(page.getByTestId("property-form-send-dialog")).not.toBeVisible()
  })
})
