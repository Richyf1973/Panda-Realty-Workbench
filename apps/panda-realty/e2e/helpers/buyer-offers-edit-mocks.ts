/**
 * Shared mock payloads and route installers for Edit Buyer → Offers E2E specs
 * (buyer-entity-offers-grid, buyer-offers-persistence-investigation).
 */

import { expect, type Locator, type Page } from "@playwright/test"

export const BUYER_ENTITY_ROW = {
  entityId: 201,
  entityName: "Test Buyer LLC",
  entityCategoryId: 1,
  emailAddress: "buyer@test.com",
  phoneNumber: "0400 111 222",
  address: "1 Buyer Rd",
}

export const BUYER_ENTITY_DETAIL = {
  entityId: 201,
  entityName: "Test Buyer LLC",
  entityCategoryId: 1,
  emailAddress: "buyer@test.com",
  phoneNumber: "0400 111 222",
  mobile: null,
  website: null,
  contact: null,
  address: "1 Buyer Rd",
  esuburb: null,
  estate: null,
  epostcode: null,
  notes: null,
  association: null,
  entityBuyerStatuses: [],
}

export const CONNECTION_501_DETAIL = {
  propertyEntityId: 501,
  entityId: 201,
  propertyListId: 1001,
  propertyEntityNote: null,
  buyerPipelineStatusId: null,
  isOriginalOwner: false,
  buyerPipelineStatus: null,
  propertyRef: { streetAddress: "45 Test Street", state: "QLD", postcode: "4505" },
  buyerOffers: [
    {
      buyerOfferId: 9001,
      propertyEntityId: 501,
      offer: "1240000",
      isAccepted: true,
      dateOffered: "2026-03-09",
    },
  ],
  entityMembers: [],
  propertyEntityFiles: [],
  propertyEntityNotes: [],
}

export const EMPTY_LIST = {
  items: [] as unknown[],
  totalCount: 0,
  limit: 20,
  totalPages: 0,
  hasNextPage: false,
  hasPreviousPage: false,
  startCursor: null,
  endCursor: null,
}

export function parseJsonBody(route: { postData: () => string | null }): Record<string, unknown> {
  const raw = route.postData()
  if (raw == null || raw === "") return {}
  try {
    return JSON.parse(raw) as Record<string, unknown>
  } catch {
    return {}
  }
}

export type EditBuyerRouteCaptures = {
  entitiesPatches: Record<string, unknown>[]
  propertyEntityPatches: Record<string, unknown>[]
}

/** Install GET mocks for Edit Buyer + connections; record PATCH bodies for analysis. */
export async function installEditBuyerInvestigationRoutes(
  page: Page,
  captures: EditBuyerRouteCaptures,
): Promise<void> {
  await page.route("**/api/admin/entities**", async (route) => {
    const req = route.request()
    const method = req.method()
    if (method === "PATCH") {
      const body = parseJsonBody(req)
      captures.entitiesPatches.push(body)
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(BUYER_ENTITY_DETAIL),
      })
      return
    }
    if (method !== "GET") {
      await route.continue()
      return
    }
    const url = req.url()
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
      body: JSON.stringify({
        ...EMPTY_LIST,
        items: [BUYER_ENTITY_ROW],
        totalCount: 1,
        totalPages: 1,
      }),
    })
  })

  await page.route("**/api/admin/property-entities**", async (route) => {
    const req = route.request()
    const method = req.method()
    if (method === "PATCH") {
      const body = parseJsonBody(req)
      captures.propertyEntityPatches.push(body)
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ...CONNECTION_501_DETAIL, ok: true }),
      })
      return
    }
    if (method !== "GET") {
      await route.continue()
      return
    }
    const url = req.url()
    const detailMatch = url.match(/\/property-entities\/(\d+)/)
    if (detailMatch) {
      const id = Number(detailMatch[1])
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(id === 501 ? CONNECTION_501_DETAIL : {}),
      })
      return
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items: [CONNECTION_501_DETAIL] }),
    })
  })

  for (const pattern of [
    "**/api/admin/entity-members**",
    "**/api/admin/buyer-status**",
    "**/api/admin/property-status**",
    "**/api/admin/buyer-pipeline-status**",
    "**/api/admin/entity-categories**",
    "**/api/admin/lead-sources**",
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

/** Prefer over role/name — survives copy tweaks and matches admin-entity-edit-crud-form. */
export function entitiesSaveAndCloseButton(dialog: Locator): Locator {
  return dialog.getByTestId("admin-entity-edit-save-and-close--entities")
}

// ── Buyer profile accept-offer helpers ────────────────────────────────────────

const BASE_OFFER = {
  isCashOffer: false,
  noConditions: false,
  coolingOffDays: null,
  financeDays: null,
  buildingPestDays: null,
  dueDiligenceDays: null,
  subjectToSaleDays: null,
  depositInitial: null,
  depositBalance: null,
  otherConditions: null,
  conditionNotes: null,
  settlementCalendarEventId: null,
  coolingOffCalendarEventId: null,
  financeCalendarEventId: null,
  buildingPestCalendarEventId: null,
}

export const NON_ACCEPTED_OFFER = {
  ...BASE_OFFER,
  buyerOfferId: 9002,
  offer: "950000",
  isAccepted: false,
  dateOffered: "2026-05-19",
}

export const ACCEPTED_OFFER = {
  ...BASE_OFFER,
  buyerOfferId: 9001,
  offer: "1240000",
  isAccepted: true,
  dateOffered: "2026-03-09",
}

export function buyerOffersResponse(offers: typeof NON_ACCEPTED_OFFER[]) {
  return { propertyListId: 1001, contractDate: null, offers }
}

export async function installBuyerProfileOffersBaseRoutes(page: Page): Promise<void> {
  await page.route("**/api/admin/entities**", async (route) => {
    const req = route.request()
    if (req.method() !== "GET") { await route.continue(); return }
    const url = req.url()
    if (url.match(/\/api\/admin\/entities\/201(\?|$)/)) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(BUYER_ENTITY_DETAIL) })
      return
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ...EMPTY_LIST, items: [BUYER_ENTITY_ROW], totalCount: 1, totalPages: 1 }),
    })
  })

  await page.route("**/api/admin/property-entities**", async (route) => {
    const req = route.request()
    if (req.method() !== "GET") { await route.continue(); return }
    const url = req.url()
    if (url.match(/\/property-entities\/\d+\/buyer-offers/)) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(buyerOffersResponse([NON_ACCEPTED_OFFER])) })
      return
    }
    const detailMatch = url.match(/\/property-entities\/(\d+)/)
    if (detailMatch) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(Number(detailMatch[1]) === 501 ? CONNECTION_501_DETAIL : {}) })
      return
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [CONNECTION_501_DETAIL] }) })
  })

  for (const pattern of [
    "**/api/admin/entity-members**",
    "**/api/admin/buyer-status**",
    "**/api/admin/property-status**",
    "**/api/admin/buyer-pipeline-status**",
    "**/api/admin/entity-categories**",
    "**/api/admin/lead-sources**",
  ]) {
    await page.route(pattern, async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_LIST) })
    })
  }
}

export async function openBuyerOffersPanel(page: Page): Promise<{
  dialog: Locator
  connections: Locator
  peTabs: Locator
  panel: Locator
}> {
  await page.goto("/admin/entities?limit=25&page=1&sortKey=entityName&sortDir=asc&entityCategoryId=1&listLayout=grid")
  await page.waitForLoadState("domcontentloaded")

  await page.getByTestId(/^admin-entity-row-edit--entities--/).first().click()

  const dialog = page.getByTestId("admin-entity-crud-dialog--entities")
  await expect(dialog).toBeVisible()

  const dialogForm = dialog.getByTestId("panda-entities-dialog-form")
  await dialogForm.evaluate((el) => el.scrollTo(0, el.scrollHeight))

  const connections = dialog.getByTestId("panda-entities-property-connections")
  await expect(connections).toBeVisible({ timeout: 10_000 })

  const peTabs = connections.getByTestId("admin-entity-crud-related-tabs--property-entities")
  const offersTab = peTabs.getByRole("tab", { name: /^offers$/i })
  await expect(offersTab).toBeVisible({ timeout: 30_000 })
  await offersTab.click()

  const panel = connections.getByTestId("admin-entity-crud-related-panel--property-entities--buyer-offers-tab")
  await expect(panel).toBeVisible({ timeout: 10_000 })
  await expect(panel.getByTestId("offers-tab-table")).toBeVisible({ timeout: 8_000 })

  return { dialog, connections, peTabs, panel }
}
