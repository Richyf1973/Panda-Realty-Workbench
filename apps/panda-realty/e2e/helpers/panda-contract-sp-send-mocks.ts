import { expect } from "@playwright/test"
import type { Page } from "@playwright/test"

import { requirePandaE2eAdminCredentials, signInAsAdmin } from "./admin-auth"
import { routePandaPropertiesListDetailAndBuyerOffers } from "./panda-properties-dialog-mocks"
import {
  AGENTS_LIST,
  CSP_TEMPLATE_EMPTY,
  EMPTY_ENTITIES,
  FORMS_LIST_CONTRACT_SP,
  SEND_HISTORY_EMPTY,
  STATUS_MIN,
} from "./panda-contract-sp-mock-data"

// ─── Shared beforeEach factory ────────────────────────────────────────────────

export function makeContractSpPrefill(prefillData: unknown) {
  return async ({ page }: { page: Page }) => {
    requirePandaE2eAdminCredentials()
    await page.unrouteAll({ behavior: "ignoreErrors" })
    await setupCommonRoutes(page)
    await page.route("**/api/admin/property-forms/prefill-data**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(prefillData) })
    })
    await page.route("**/api/admin/property-forms/template**", async (route) => {
      if (route.request().method() !== "GET") { await route.fallback(); return }
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(CSP_TEMPLATE_EMPTY) })
    })
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
  }
}

// ─── Route setup ─────────────────────────────────────────────────────────────

export async function setupCommonRoutes(page: Page) {
  await page.route("**/api/admin/property-status**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(STATUS_MIN) })
  })
  await page.route("**/api/admin/property-entities**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [] }) })
  })
  await page.route("**/api/admin/property-forms**", async (route) => {
    const url = route.request().url()
    if (url.includes("/send") || url.includes("/prefill-data") || url.includes("/upload") || url.includes("/initiate") || url.includes("/record") || url.includes("/template")) {
      await route.fallback()
      return
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(FORMS_LIST_CONTRACT_SP) })
  })
  await page.route("**/api/admin/property-form-sends**", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SEND_HISTORY_EMPTY) })
      return
    }
    await route.fallback()
  })
  await page.route("**/api/admin/agents**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(AGENTS_LIST) })
  })
}

// ─── Navigation helpers ───────────────────────────────────────────────────────

export async function openFormsTab(page: Page) {
  await routePandaPropertiesListDetailAndBuyerOffers(page)
  await page.goto("/admin/properties")
  await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible({ timeout: 20_000 })
  await page.getByTestId("admin-entity-row--properties--1001").click()
  await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible({ timeout: 15_000 })
  await page.getByTestId("panda-properties-form-tab-trigger--forms").click()
  await expect(page.getByTestId("panda-properties-form-tab--forms")).toBeVisible({ timeout: 10_000 })
}

export async function openContractSpSendDialog(page: Page) {
  await openFormsTab(page)
  await page.getByTestId("property-forms-send--4").click()
  await expect(page.getByTestId("property-form-send-dialog")).toBeVisible({ timeout: 15_000 })
  await expect(page.getByTestId("contract-sp-fill-step")).toBeVisible({ timeout: 15_000 })
}

// ─── Template route helpers ───────────────────────────────────────────────────

export async function routeTemplateGet(page: Page, response: unknown) {
  await page.route("**/api/admin/property-forms/template**", async (route) => {
    if (route.request().method() !== "GET") { await route.fallback(); return }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(response) })
  })
}

export async function routeTemplatePost(
  page: Page,
  options: { status?: number; onRequest?: (body: unknown) => void } = {},
) {
  await page.route("**/api/admin/property-forms/template**", async (route) => {
    if (route.request().method() !== "POST") { await route.fallback(); return }
    if (options.onRequest) {
      options.onRequest(JSON.parse(route.request().postData() ?? "{}"))
    }
    await route.fulfill({
      status: options.status ?? 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    })
  })
}
