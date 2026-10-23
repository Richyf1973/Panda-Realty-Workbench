import { expect } from "@playwright/test"

import {
  registerPropertyRoutes,
  PROPERTY_ONE_OWNER,
  STATUS_LIST_RESPONSE,
  EMPTY_PROPERTY_ENTITIES_RESPONSE,
} from "./panda-properties-owners-helpers"

export const PROPERTY_ID = 1001

export type AllNote = {
  noteId: number
  propertyEntityId: number | null
  note: string
  createdBy: string | null
  createdAt: string
  entityName: string | null
  source: "property" | "entity"
  agentId: number | null
  agentName: string | null
  agentEmail: string | null
  ownerNum: number | null
  entityCategoryId: number | null
  association: string | null
}

export const BUYER_NOTE: AllNote = {
  noteId: 1,
  propertyEntityId: 501,
  note: "Follow up call scheduled for Monday",
  createdBy: "agent@example.com",
  createdAt: "2026-05-25T10:00:00Z",
  entityName: "Test Buyer LLC",
  source: "entity",
  agentId: null,
  agentName: null,
  agentEmail: null,
  ownerNum: null,
  entityCategoryId: 1,
  association: null,
}

export const OWNER_NOTE: AllNote = {
  noteId: 2,
  propertyEntityId: null,
  note: "Prefers phone contact on Tuesdays",
  createdBy: "test@yahoo.com",
  createdAt: "2026-05-24T09:00:00Z",
  entityName: null,
  source: "property",
  agentId: 1,
  agentName: "Agent Smith",
  agentEmail: "agent@example.com",
  ownerNum: 2,
  entityCategoryId: null,
  association: null,
}

export const UNTAGGED_NOTE: AllNote = {
  noteId: 3,
  propertyEntityId: null,
  note: "Vendor motivated — price negotiable",
  createdBy: "jet_pradas@yahoo.com",
  createdAt: "2026-05-20T08:00:00Z",
  entityName: null,
  source: "property",
  agentId: null,
  agentName: null,
  agentEmail: null,
  ownerNum: null,
  entityCategoryId: null,
  association: null,
}

export const ALL_NOTES: AllNote[] = [BUYER_NOTE, OWNER_NOTE, UNTAGGED_NOTE]

export const FAVOURITE_PROPERTY = { ...PROPERTY_ONE_OWNER, isFavorite: true }
export const NON_FAVOURITE_PROPERTY = { ...PROPERTY_ONE_OWNER, isFavorite: false }

export async function setupAndOpenDialog(
  page: import("@playwright/test").Page,
  opts: {
    property?: typeof FAVOURITE_PROPERTY
    notes?: AllNote[]
  } = {},
) {
  const property = opts.property ?? FAVOURITE_PROPERTY
  const notes = opts.notes ?? ALL_NOTES

  await page.route("**/api/admin/property-status**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(STATUS_LIST_RESPONSE),
    })
  })
  await page.route("**/api/admin/property-entities**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(EMPTY_PROPERTY_ENTITIES_RESPONSE),
    })
  })
  await page.route("**/api/admin/calendar/status**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ connected: false }),
    })
  })

  await registerPropertyRoutes(page, property)

  await page.route(`**/api/admin/properties/${PROPERTY_ID}/all-notes**`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(notes),
    })
  })

  await page.goto("/admin/properties")
  await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible()
  await page.getByTestId(`admin-entity-row--properties--${PROPERTY_ID}`).click()
  await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible()
  await expect(page.getByTestId("panda-properties-dialog-form")).toBeVisible()
}

export async function openNotesTab(page: import("@playwright/test").Page) {
  await page.getByTestId("panda-properties-form-tab-trigger--notes").click()
  await expect(page.getByTestId("panda-properties-form-tab--notes")).toBeVisible()
}
