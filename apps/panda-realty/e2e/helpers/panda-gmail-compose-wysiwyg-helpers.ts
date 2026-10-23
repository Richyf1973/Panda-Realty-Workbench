import { expect, type Page, type Route } from "@playwright/test"

import { signInAsAdmin } from "./admin-auth"
import { routePandaPropertiesListDetailAndBuyerOffers } from "./panda-properties-dialog-mocks"
import { parseFormDataBody } from "./panda-properties-gmail-helpers"
import {
  BUYER_WITH_EMAIL,
  CONTACT_WITH_EMAIL,
  EMPTY_PANEL_RESPONSE,
  ENTITY_EMAILS_ALL,
  makeSignature,
  STATUS_MIN,
  THREAD_BODY_RESPONSE,
  THREAD_LIST_RESPONSE,
  type ComposeSignature,
} from "./panda-gmail-compose-fixtures"

export * from "./panda-gmail-compose-fixtures"
export * from "./panda-gmail-compose-editor-helpers"

export async function setupComposePage(
  page: Page,
  options: {
    signatures?: ComposeSignature[]
    uploadShouldFail?: boolean
    sendStatus?: number
    sendBody?: unknown
    replyStatus?: number
    replyBody?: unknown
    threadBody?: object
    onSendPost?: (body: unknown) => void
    onReplyPost?: (body: unknown) => void
    signIn?: boolean
  } = {},
) {
  const signatures = options.signatures ?? [
    makeSignature(),
    makeSignature({
      id: 2,
      name: "Richard promo",
      isDefault: false,
      htmlContent:
        `<p>Kind regards,</p><p>Richard Falzon</p><p><img src="https://example.com/richard-signature.png" alt="Richard promo signature"></p>`,
      renderedHtml:
        `<p>Kind regards,</p><p>Richard Falzon</p><p><img src="https://example.com/richard-signature.png" alt="Richard promo signature"></p>`,
    }),
  ]

  await page.route("**/api/admin/property-status**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(STATUS_MIN) })
  })
  await page.route("**/api/admin/property-entities**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        items: [],
        totalCount: 0,
        limit: 20,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
        startCursor: null,
        endCursor: null,
      }),
    })
  })
  await page.route("**/api/admin/email-signatures**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items: signatures }),
    })
  })
  await page.route("**/api/admin/email-signatures/upload**", async (route: Route) => {
    if (options.uploadShouldFail) {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Upload failed." }),
      })
      return
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        fileUrl:
          "https://supabase.example/storage/v1/object/public/email-signatures/compose/inline-compose-image.png",
        previewUrl:
          "https://supabase.example/storage/v1/object/public/email-signatures/compose/inline-compose-image.png",
      }),
    })
  })

  await routePandaPropertiesListDetailAndBuyerOffers(page)
  await page.route("**/api/admin/properties/*/entity-emails**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(ENTITY_EMAILS_ALL),
    })
  })
  await page.route("**/api/admin/properties/1001/buyers**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(BUYER_WITH_EMAIL) })
  })
  await page.route("**/api/admin/properties/1001/contacts**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(CONTACT_WITH_EMAIL),
    })
  })
  await page.route("**/api/admin/properties/1001/tenants**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_PANEL_RESPONSE) })
  })
  await page.route("**/api/admin/gmail/threads?email=**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(THREAD_LIST_RESPONSE),
    })
  })
  await page.route("**/api/admin/gmail/threads/body?threadId=**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(options.threadBody ?? THREAD_BODY_RESPONSE),
    })
  })
  await page.route("**/api/admin/gmail/send**", async (route) => {
    options.onSendPost?.(await parseFormDataBody(route))
    await route.fulfill({
      status: options.sendStatus ?? 200,
      contentType: "application/json",
      body: JSON.stringify(options.sendBody ?? { ok: true }),
    })
  })
  await page.route("**/api/admin/gmail/reply**", async (route) => {
    options.onReplyPost?.(await parseFormDataBody(route))
    await route.fulfill({
      status: options.replyStatus ?? 200,
      contentType: "application/json",
      body: JSON.stringify(options.replyBody ?? { ok: true }),
    })
  })

  if (options.signIn !== false) {
    await signInAsAdmin(page)
  }

  return { signatures }
}

export async function openBuyerCompose(page: Page) {
  await page.goto("/admin/properties")
  await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible()
  await page.getByTestId("admin-entity-row--properties--1001").click()
  await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible()
  await page.getByTestId("panda-properties-form-tab-trigger--buyers").click()
  await page.getByTestId("property-buyer-panel-quick-email--501").click()
  await expect(page.getByTestId("property-gmail-compose-dialog")).toBeVisible()
}

export async function openContactReplyCompose(page: Page) {
  await page.goto("/admin/properties")
  await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible()
  await page.getByTestId("admin-entity-row--properties--1001").click()
  await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible()
  await page.getByTestId("panda-properties-form-tab-trigger--contacts").click()
  await page.getByTestId("property-contact-inbox--601").click()
  await expect(page.getByTestId("entity-threads-panel")).toBeVisible()
  await page.getByTestId("gmail-thread-row").click()
  await expect(page.getByTestId("gmail-thread-message--msg-contact-1")).toBeVisible()
  await page.getByTestId("gmail-thread-reply--msg-contact-1").click()
  await expect(page.getByTestId("property-gmail-compose-dialog")).toBeVisible()
}
