/**
 * Shared fixtures and route helpers for buyer offers panel E2E tests.
 * Used by admin-entities-buyer-offers-panel-crud.spec.ts and
 * admin-entities-buyer-offers-panel-display.spec.ts.
 */

import { expect, type Page } from "@playwright/test"

import {
  BUYER_ENTITY_DETAIL,
  BUYER_ENTITY_ROW,
  EMPTY_LIST,
} from "./buyer-offers-edit-mocks"

export const MOCK_PE_ID = 501
export const MOCK_PROPERTY_LIST_ID = 1001

export const MOCK_BUYER_OFFERS_RESPONSE = {
  propertyListId: MOCK_PROPERTY_LIST_ID,
  contractDate: "2026-03-20",
  offers: [
    {
      buyerOfferId: 9001,
      offer: "805000",
      isAccepted: true,
      dateOffered: "2026-03-09",
      isCashOffer: false,
      noConditions: false,
      coolingOffDays: null,
      financeDays: 14,
      buildingPestDays: null,
      dueDiligenceDays: null,
      subjectToSaleDays: null,
      subjectToSaleStage: null,
      saleOfPropertyDays: null,
      unconditionalContractDays: null,
      depositInitial: null,
      depositBalance: null,
      otherConditions: null,
      customConditions: null,
      conditionNotes: null,
      settlementCalendarEventId: null,
      coolingOffCalendarEventId: null,
      financeCalendarEventId: null,
      buildingPestCalendarEventId: null,
    },
    {
      buyerOfferId: 9002,
      offer: "790000",
      isAccepted: false,
      dateOffered: "2026-03-05",
      isCashOffer: false,
      noConditions: false,
      coolingOffDays: null,
      financeDays: null,
      buildingPestDays: null,
      dueDiligenceDays: null,
      subjectToSaleDays: null,
      subjectToSaleStage: null,
      saleOfPropertyDays: null,
      unconditionalContractDays: null,
      depositInitial: null,
      depositBalance: null,
      otherConditions: null,
      customConditions: null,
      conditionNotes: null,
      settlementCalendarEventId: null,
      coolingOffCalendarEventId: null,
      financeCalendarEventId: null,
      buildingPestCalendarEventId: null,
    },
  ],
}

export const CONNECTION_501 = {
  propertyEntityId: MOCK_PE_ID,
  entityId: 201,
  propertyListId: MOCK_PROPERTY_LIST_ID,
  propertyEntityNote: null,
  buyerPipelineStatusId: null,
  isOriginalOwner: false,
  buyerPipelineStatus: null,
  propertyRef: { streetAddress: "45 Test Street", state: "QLD", postcode: "4505" },
  entityMembers: [],
  propertyEntityFiles: [],
  propertyEntityNotes: [],
}

type BuyerOffersResponse = {
  propertyListId: number
  contractDate: string | null
  offerFormToken?: string | null
  offers: Record<string, unknown>[]
}

export async function installBaseRoutes(
  page: Page,
  buyerOffersResponse: BuyerOffersResponse = MOCK_BUYER_OFFERS_RESPONSE,
) {
  await page.route("**/api/admin/entities**", async (route) => {
    if (route.request().method() !== "GET") {
      await route.continue()
      return
    }
    const url = route.request().url()
    if (url.match(/\/api\/admin\/entities\/201(\?|$)/)) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(BUYER_ENTITY_DETAIL),
      })
      return
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ...EMPTY_LIST, items: [BUYER_ENTITY_ROW], totalCount: 1, totalPages: 1 }),
    })
  })

  await page.route("**/api/admin/property-entities**", async (route) => {
    const url = route.request().url()
    const method = route.request().method()
    if (method !== "GET") {
      await route.continue()
      return
    }
    if (url.match(/\/property-entities\/\d+\/buyer-offers/)) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(buyerOffersResponse),
      })
      return
    }
    const detailMatch = url.match(/\/property-entities\/(\d+)/)
    if (detailMatch) {
      const id = Number(detailMatch[1])
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(id === MOCK_PE_ID ? CONNECTION_501 : {}),
      })
      return
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items: [CONNECTION_501] }),
    })
  })

  for (const pattern of [
    "**/api/admin/entity-members**",
    "**/api/admin/buyer-status**",
    "**/api/admin/property-status**",
    "**/api/admin/buyer-pipeline-status**",
    "**/api/admin/entity-categories**",
    "**/api/admin/lead-sources**",
    "**/api/admin/contact-categories**",
  ]) {
    await page.route(pattern, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(EMPTY_LIST),
      })
    })
  }
}

export async function openOffersTab(page: Page) {
  await page.goto(
    "/admin/entities?limit=25&page=1&sortKey=entityName&sortDir=asc&entityCategoryId=1&listLayout=grid",
  )
  await page.waitForLoadState("domcontentloaded")

  await page.getByTestId(/^admin-entity-row-edit--entities--/).first().click()

  const dialog = page.getByTestId("admin-entity-crud-dialog--entities")
  await expect(dialog).toBeVisible()

  const dialogForm = dialog.getByTestId("panda-entities-dialog-form")
  await dialogForm.evaluate((el) => el.scrollTo(0, el.scrollHeight))

  const connections = dialog.getByTestId("panda-entities-property-connections")
  await expect(connections).toBeVisible({ timeout: 10_000 })

  const peTabs = connections.getByTestId("admin-entity-crud-related-tabs--property-entities")
  await expect(peTabs.getByRole("tab", { name: /^offers$/i })).toBeVisible({ timeout: 10_000 })
  await peTabs.getByRole("tab", { name: /^offers$/i }).click()

  const panel = connections.getByTestId(
    "admin-entity-crud-related-panel--property-entities--buyer-offers-tab",
  )
  await expect(panel).toBeVisible({ timeout: 10_000 })

  return { dialog, connections, panel }
}
