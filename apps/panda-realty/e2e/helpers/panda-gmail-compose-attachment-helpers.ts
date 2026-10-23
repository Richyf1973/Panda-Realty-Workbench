import type { Page } from "@playwright/test"
import { expect } from "@playwright/test"

import { STATUS_LIST_RESPONSE, EMPTY_PROPERTY_ENTITIES_RESPONSE } from "./admin-properties-mocks"
import { routePandaPropertiesListDetailAndBuyerOffers } from "./panda-properties-dialog-mocks"
import {
  BUYER_WITH_EMAIL,
  EMPTY_PANEL,
  LIST_WITH_OWNER_EMAIL,
} from "./panda-gmail-compose-attachment-fixtures"

export async function mockCommonRoutes(page: Page) {
  await page.route("**/api/admin/property-status**", async (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(STATUS_LIST_RESPONSE) }),
  )
  await page.route("**/api/admin/property-entities**", async (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_PROPERTY_ENTITIES_RESPONSE) }),
  )
  await page.route("**/api/admin/email-signatures**", async (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [] }) }),
  )
}

export async function openComposeFromListRow(page: Page) {
  await page.route("**/api/admin/properties**", async (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(LIST_WITH_OWNER_EMAIL) }),
  )
  await page.goto("/admin/properties")
  await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible()
  await page.getByTestId("property-list-email-button--1001").first().click()
  await expect(page.getByTestId("property-gmail-compose-dialog")).toBeVisible()
}

export async function openComposeFromBuyerRow(page: Page) {
  await routePandaPropertiesListDetailAndBuyerOffers(page)
  await page.route("**/api/admin/properties/1001/buyers**", async (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(BUYER_WITH_EMAIL) }),
  )
  await page.route("**/api/admin/properties/1001/contacts**", async (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_PANEL) }),
  )
  await page.route("**/api/admin/properties/1001/tenants**", async (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_PANEL) }),
  )
  await page.goto("/admin/properties")
  await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible()
  await page.getByTestId("admin-entity-row--properties--1001").click()
  await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible()
  await page.getByTestId("panda-properties-form-tab-trigger--buyers").click()
  await page.getByTestId("property-buyer-panel-quick-email--501").click()
  await expect(page.getByTestId("property-gmail-compose-dialog")).toBeVisible()
}

export async function attachFiles(
  page: Page,
  files: { name: string; mimeType: string; buffer: Buffer }[],
) {
  const fileChooserPromise = page.waitForEvent("filechooser")
  await page.getByTestId("property-gmail-compose-attach-button").click()
  const fileChooser = await fileChooserPromise
  await fileChooser.setFiles(files)
}
