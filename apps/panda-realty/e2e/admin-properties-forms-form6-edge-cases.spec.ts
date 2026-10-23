import { expect, test } from "@playwright/test"

import { requirePandaE2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import {
  EMPTY_ENTITIES,
  FORMS_LIST_FORM6,
  PREFILL_DATA_NO_OWNERS,
  PREFILL_DATA_ONE_OWNER,
  openFormsTab,
  setupCommonRoutes,
} from "./helpers/panda-form6-send-mocks"

test.describe("Form 6 fill modal — edge cases", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaE2eAdminCredentials()
    await setupCommonRoutes(page, FORMS_LIST_FORM6)
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

  test("No owners — all Part 1 fields blank, no error", async ({ page }) => {
    await page.route("**/api/admin/property-forms/prefill-data**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(PREFILL_DATA_NO_OWNERS) })
    })
    await openFormsTab(page)
    await page.getByTestId("property-forms-send--3").click()
    await expect(page.getByTestId("form6-fill-step")).toBeVisible()
    await expect(page.getByTestId("form6-part1-client1-name")).toHaveValue("")
    await expect(page.getByTestId("form6-part1-client2-name")).toHaveValue("")
  })

  test("One owner — Client 1 filled, Client 2 blank, Next still works", async ({ page }) => {
    await page.route("**/api/admin/property-forms/prefill-data**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(PREFILL_DATA_ONE_OWNER) })
    })
    await openFormsTab(page)
    await page.getByTestId("property-forms-send--3").click()
    await expect(page.getByTestId("form6-part1-client1-name")).toHaveValue("John Smith")
    await expect(page.getByTestId("form6-part1-client2-name")).toHaveValue("")
    await page.getByTestId("property-form-prefill-next").click()
    await expect(page.getByTestId("form6-fill-step")).not.toBeVisible()
    await expect(page.getByTestId("property-form-send-dialog")).toBeVisible()
  })

  test("No agents — Part 2 shows empty-agents message", async ({ page }) => {
    await page.route("**/api/admin/agents**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) })
    })
    await page.route("**/api/admin/property-forms/prefill-data**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(PREFILL_DATA_NO_OWNERS) })
    })
    await openFormsTab(page)
    await page.getByTestId("property-forms-send--3").click()
    await page.getByTestId("form6-tab-trigger--2").click()
    await expect(page.getByTestId("form6-part2-no-agents-message")).toBeVisible()
  })

  test("Agent with missing new columns — blank fields, no error, Next still works", async ({ page }) => {
    await page.route("**/api/admin/agents**", async (route) => {
      await route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify([{ agentId: 99, agentName: "Bare Agent", email: "bare@eg.com", phone: "0400000000", tradingName: null, licenceNumber: null, abn: null, acn: null, address: null, suburb: null, state: null, postcode: null, fax: null, mobile: null, licenceExpiry: null, licenseeType: null }]),
      })
    })
    await page.route("**/api/admin/property-forms/prefill-data**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(PREFILL_DATA_NO_OWNERS) })
    })
    await openFormsTab(page)
    await page.getByTestId("property-forms-send--3").click()
    await page.getByTestId("form6-tab-trigger--2").click()
    await expect(page.getByTestId("form6-part2-acn")).toHaveValue("")
    await expect(page.getByTestId("form6-part2-address")).toHaveValue("")
    await page.getByTestId("property-form-prefill-next").click()
    await expect(page.getByTestId("form6-fill-step")).not.toBeVisible()
  })
})
