import { expect } from "@playwright/test"

import { routePandaPropertiesListDetailAndBuyerOffers } from "./panda-properties-dialog-mocks"

export const FORMS_TAB_STATUS_MIN = {
  items: [{ propertyStatusId: 1, propertyStatusCode: "ACTIVE", propertyStatus: "Active" }],
  totalCount: 1, limit: 100, totalPages: 1, hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null,
}
export const FORMS_TAB_EMPTY_PROPERTY_ENTITIES = {
  items: [], totalCount: 0, limit: 20, totalPages: 0, hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null,
}
export const FORMS_TAB_EMPTY_ENTITIES = { items: [] }
export const FORMS_TAB_SEND_HISTORY_EMPTY = { items: [] }

export function makeFormsTabFormsList(prefillStrategy: string | null, formId = 1) {
  return {
    items: [
      {
        propertyFormId: formId,
        formName: "Test Form",
        category: null,
        description: null,
        isActive: true,
        prefillStrategy,
        fileLink: "https://drive.google.com/view?id=abc123",
        fileName: "test-form.pdf",
        fileSize: 100_000,
        googleDriveFileId: "abc123",
        createdAt: "2026-05-01T00:00:00.000Z",
        updatedAt: null,
      },
    ],
    totalCount: 1, limit: 25, totalPages: 1, hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null,
  }
}

export async function installFormsTabRoutes(
  page: import("@playwright/test").Page,
  formsList: unknown,
) {
  await page.route("**/api/admin/property-status**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(FORMS_TAB_STATUS_MIN) })
  })
  await page.route("**/api/admin/property-entities**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(FORMS_TAB_EMPTY_PROPERTY_ENTITIES) })
  })
  await page.route("**/api/admin/property-forms**", async (route) => {
    if (route.request().url().includes("/upload") || route.request().url().includes("/send")) {
      await route.continue()
      return
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(formsList) })
  })
  await page.route("**/api/admin/property-form-sends**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(FORMS_TAB_SEND_HISTORY_EMPTY) })
  })
  await page.route("**/api/admin/properties/1001/buyers**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(FORMS_TAB_EMPTY_ENTITIES) })
  })
  await page.route("**/api/admin/properties/1001/contacts**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(FORMS_TAB_EMPTY_ENTITIES) })
  })
  await page.route("**/api/admin/properties/1001/tenants**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(FORMS_TAB_EMPTY_ENTITIES) })
  })
}

export async function openFormsTab(page: import("@playwright/test").Page) {
  await routePandaPropertiesListDetailAndBuyerOffers(page)
  await page.goto("/admin/properties")
  await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible({ timeout: 10_000 })
  await page.getByTestId("admin-entity-row--properties--1001").click()
  await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible()
  await page.getByTestId("panda-properties-form-tab-trigger--forms").click()
  await expect(page.getByTestId("panda-properties-form-tab--forms")).toBeVisible()
  await expect(page.getByTestId("property-forms-list")).toBeVisible({ timeout: 10_000 })
}
