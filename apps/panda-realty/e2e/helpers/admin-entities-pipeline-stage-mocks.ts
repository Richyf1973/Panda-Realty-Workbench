import type { Page } from "@playwright/test"

// ---------------------------------------------------------------------------
// Mock IDs & names
// ---------------------------------------------------------------------------

export const MOCK_PE_ID_A = 5001
export const MOCK_PE_ID_B = 5002
export const MOCK_PROPERTY_ID_A = 9001
export const MOCK_PROPERTY_ID_B = 9002
export const MOCK_STAGE_ID = 3
export const MOCK_STAGE_NAME = "Active"
export const MOCK_STAGE_ID_B = 7
export const MOCK_STAGE_NAME_B = "Conditional"

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

function makePe(
  propertyEntityId: number,
  propertyListId: number,
  buyerPipelineStatusId: number | null,
  stageName: string | null,
) {
  return {
    propertyEntityId,
    entityId: 1,
    propertyListId,
    propertyEntityNote: null,
    buyerPipelineStatusId,
    isOriginalOwner: false,
    buyerPipelineStatus: stageName ? { propertyStatus: stageName } : null,
  }
}

function makeDetail(
  propertyEntityId: number,
  propertyListId: number,
  streetAddress: string,
  buyerPipelineStatusId: number | null,
  stageName: string | null,
) {
  return {
    ...makePe(propertyEntityId, propertyListId, buyerPipelineStatusId, stageName),
    propertyRef: { streetAddress, state: "QLD", postcode: "4510" },
  }
}

// ---------------------------------------------------------------------------
// Fixture data
// ---------------------------------------------------------------------------

export const PROPERTY_A_DETAIL = makeDetail(
  MOCK_PE_ID_A,
  MOCK_PROPERTY_ID_A,
  "54 Valley Drive",
  MOCK_STAGE_ID,
  MOCK_STAGE_NAME,
)

export const PROPERTY_A_DETAIL_NO_STAGE = makeDetail(
  MOCK_PE_ID_A,
  MOCK_PROPERTY_ID_A,
  "54 Valley Drive",
  null,
  null,
)

export const PROPERTY_B_DETAIL = makeDetail(
  MOCK_PE_ID_B,
  MOCK_PROPERTY_ID_B,
  "12 Elm Street",
  MOCK_STAGE_ID_B,
  MOCK_STAGE_NAME_B,
)

export const MOCK_PIPELINE_STAGES = {
  items: [
    { propertyStatusId: MOCK_STAGE_ID, propertyStatus: MOCK_STAGE_NAME, pipeline: "buyers" },
    { propertyStatusId: MOCK_STAGE_ID_B, propertyStatus: MOCK_STAGE_NAME_B, pipeline: "buyers" },
    { propertyStatusId: 10, propertyStatus: "Settled", pipeline: "buyers" },
  ],
}

// ---------------------------------------------------------------------------
// Route stubs
// ---------------------------------------------------------------------------

export async function stubPropertyConnections(
  page: Page,
  listItems: object[],
  detailMap: Record<number, object>,
  patchCallback?: (id: number, body: object) => void,
) {
  await page.route("**/api/admin/property-entities**", async (route) => {
    const url = route.request().url()
    const method = route.request().method()

    if (method === "PATCH") {
      const match = url.match(/\/property-entities\/(\d+)/)
      const id = match ? Number(match[1]) : -1
      const body = route.request().postDataJSON() as object
      patchCallback?.(id, body)
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      })
      return
    }

    const detailMatch = url.match(/\/property-entities\/(\d+)/)
    if (detailMatch) {
      const id = Number(detailMatch[1])
      const detail = detailMap[id]
      if (detail) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(detail),
        })
      } else {
        await route.fulfill({ status: 404, body: "{}" })
      }
      return
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items: listItems }),
    })
  })

  for (const [, detail] of Object.entries(detailMap)) {
    const d = detail as {
      propertyListId?: number
      propertyRef?: { streetAddress?: string; state?: string; postcode?: string }
    }
    if (d.propertyListId) {
      const propListId = d.propertyListId
      await page.route(
        (url) =>
          url.pathname.endsWith(`/api/admin/properties/${propListId}`) &&
          url.searchParams.get("fields") === "address",
        async (route) => {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(d.propertyRef ?? {}),
          })
        },
      )
    }
  }
}

export async function stubPipelineStages(page: Page) {
  await page.route("**/api/admin/property-status**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_PIPELINE_STAGES),
    })
  })
}
