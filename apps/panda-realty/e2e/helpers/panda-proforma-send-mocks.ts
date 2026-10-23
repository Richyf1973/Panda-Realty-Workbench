import { expect } from "@playwright/test"
import type { Page } from "@playwright/test"

import { requirePandaE2eAdminCredentials, signInAsAdmin } from "./admin-auth"
import { routePandaPropertiesListDetailAndBuyerOffers } from "./panda-properties-dialog-mocks"
import {
  BUYERS_WITH_EMAIL,
  EMPTY_ENTITIES,
  EMPTY_PROPERTY_ENTITIES,
  FORMS_LIST_PREFILL,
  SEND_HISTORY_EMPTY,
  STATUS_MIN,
} from "./panda-proforma-mock-data"

export async function setupCommonRoutes(page: Page, formsData: unknown) {
  await page.route("**/api/admin/property-status**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(STATUS_MIN) })
  })
  await page.route("**/api/admin/property-entities**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_PROPERTY_ENTITIES) })
  })
  await page.route("**/api/admin/property-forms**", async (route) => {
    const url = route.request().url()
    if (url.includes("/send") || url.includes("/prefill") || url.includes("/upload") || url.includes("/initiate") || url.includes("/record") || url.includes("/prefill-data")) {
      await route.continue()
      return
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(formsData) })
  })
  await page.route("**/api/admin/property-form-sends**", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SEND_HISTORY_EMPTY) })
      return
    }
    await route.continue()
  })
}

export async function openFormsTab(page: Page) {
  await routePandaPropertiesListDetailAndBuyerOffers(page)
  await page.goto("/admin/properties")
  await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible()
  await page.getByTestId("admin-entity-row--properties--1001").click()
  await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible()
  await page.getByTestId("panda-properties-form-tab-trigger--forms").click()
  await expect(page.getByTestId("panda-properties-form-tab--forms")).toBeVisible()
}

export function makeProFormaPrefill(prefillData: unknown) {
  return async ({ page }: { page: Page }) => {
    requirePandaE2eAdminCredentials()
    await setupCommonRoutes(page, FORMS_LIST_PREFILL)
    await page.route("**/api/admin/property-forms/prefill-data**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(prefillData) })
    })
    await page.route("**/api/admin/properties/1001/buyers**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(BUYERS_WITH_EMAIL) })
    })
    await page.route("**/api/admin/properties/1001/contacts**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_ENTITIES) })
    })
    await page.route("**/api/admin/properties/1001/tenants**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_ENTITIES) })
    })
    await signInAsAdmin(page)
  }
}
