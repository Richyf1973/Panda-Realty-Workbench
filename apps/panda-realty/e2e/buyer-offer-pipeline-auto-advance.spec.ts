/**
 * Edit Buyer — entering a positive offer auto-advances pipeline to Offer Made
 * (null / Enquiry only). See specs/panda-realty-buyer-offer-pipeline-auto-advance.md
 */

import { expect, test } from "@playwright/test"

import { requirePandaE2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import {
  BUYER_ENTITY_DETAIL,
  BUYER_ENTITY_ROW,
  EMPTY_LIST,
  parseJsonBody,
} from "./helpers/buyer-offers-edit-mocks"

const PROPERTY_STATUS_BUYERS = {
  items: [
    {
      propertyStatusId: 10,
      propertyStatus: "Enquiry",
      propertyStatusCode: "Enquiry",
      pipeline: "buyers",
      isShownOnFavorite: true,
    },
    {
      propertyStatusId: 11,
      propertyStatus: "Contact Made",
      propertyStatusCode: "Contact Made",
      pipeline: "buyers",
      isShownOnFavorite: true,
    },
    {
      propertyStatusId: 12,
      propertyStatus: "Offer Made",
      propertyStatusCode: "Offer Made",
      pipeline: "buyers",
      isShownOnFavorite: true,
    },
  ],
  totalCount: 3,
  limit: 100,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false,
  startCursor: null,
  endCursor: null,
}

test.describe("Edit Buyer — offer amount advances pipeline to Offer Made", () => {
  test.describe.configure({ timeout: 120_000 })

  test.beforeEach(async ({ page }) => {
    requirePandaE2eAdminCredentials()

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
        body: JSON.stringify({
          ...EMPTY_LIST,
          items: [BUYER_ENTITY_ROW],
          totalCount: 1,
          totalPages: 1,
        }),
      })
    })

    await page.route("**/api/admin/property-status**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(PROPERTY_STATUS_BUYERS),
      })
    })

    await page.route("**/api/admin/buyer-pipeline-status**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(EMPTY_LIST),
      })
    })

    for (const pattern of [
      "**/api/admin/entity-members**",
      "**/api/admin/buyer-status**",
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

    await signInAsAdmin(page)
  })

  test("typing a positive offer moves pipeline to Offer Made before parent Save", async ({
    page,
  }) => {
    const propertyEntityPatches501: Record<string, unknown>[] = []

    let connectionDetail: Record<string, unknown> = {
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
          offer: "0",
          isAccepted: false,
          dateOffered: "2026-04-20",
        },
      ],
      entityMembers: [],
      propertyEntityFiles: [],
      propertyEntityNotes: [],
    }

    await page.route("**/api/admin/property-entities**", async (route) => {
      const req = route.request()
      const method = req.method()
      const url = req.url()
      const detailMatch = url.match(/\/property-entities\/(\d+)/)
      if (method === "PATCH" && detailMatch && Number(detailMatch[1]) === 501) {
        const body = parseJsonBody(req)
        propertyEntityPatches501.push(body)
        if (
          body.buyerPipelineStatusId === "12" ||
          body.buyerPipelineStatusId === 12
        ) {
          connectionDetail = {
            ...connectionDetail,
            buyerPipelineStatusId: 12,
            buyerPipelineStatus: { propertyStatus: "Offer Made" },
          }
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(connectionDetail),
        })
        return
      }
      if (method !== "GET") {
        await route.continue()
        return
      }
      if (detailMatch) {
        const id = Number(detailMatch[1])
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(id === 501 ? connectionDetail : {}),
        })
        return
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: [connectionDetail] }),
      })
    })

    await page.goto(
      "/admin/entities?limit=25&page=1&sortKey=entityName&sortDir=asc&entityCategoryId=1&listLayout=grid",
    )
    await page.waitForLoadState("domcontentloaded")

    await page.getByTestId(/^admin-entity-row-edit--entities--/).first().click()

    const dialog = page.getByTestId("admin-entity-crud-dialog--entities")
    await expect(dialog).toBeVisible({ timeout: 30_000 })
    const dialogForm = dialog.getByTestId("panda-entities-dialog-form")
    await dialogForm.evaluate((el) => el.scrollTo(0, el.scrollHeight))

    const connections = dialog.getByTestId("panda-entities-property-connections")
    await expect(connections).toBeVisible({ timeout: 10_000 })

    await connections
      .getByTestId("admin-entity-crud-related-tabs--property-entities")
      .getByRole("tab", { name: /^offers$/i })
      .click()

    await expect(
      connections.getByTestId(
        "admin-entity-crud-related-row--property-entities--buyerOffers--saved--9001",
      ),
    ).toBeVisible({ timeout: 15_000 })

    const offerInput = connections.getByTestId(
      "admin-entity-crud-related-currency--property-entities--buyerOffers--offer--saved-9001",
    )
    await expect(offerInput).toBeVisible({ timeout: 10_000 })
    await offerInput.fill("450000")

    const pipelineSelect = connections.getByTestId(
      "panda-entities-property-connections--pipeline-select",
    )
    await expect(pipelineSelect).toContainText("Offer Made", { timeout: 20_000 })

    expect(
      propertyEntityPatches501.some(
        (b) => b.buyerPipelineStatusId === "12" || b.buyerPipelineStatusId === 12,
      ),
    ).toBe(true)
  })

  test("does not auto-advance from Contact Made when a positive offer is entered", async ({
    page,
  }) => {
    const buyerPipelineOnlyPatches: Record<string, unknown>[] = []
    page.on("request", (req) => {
      if (req.method() !== "PATCH") return
      if (!req.url().includes("/api/admin/property-entities/501")) return
      const raw = req.postData()
      if (raw == null || raw === "") return
      try {
        const j = JSON.parse(raw) as Record<string, unknown>
        if (Object.hasOwn(j, "buyerPipelineStatusId")) buyerPipelineOnlyPatches.push(j)
      } catch {
        /* ignore non-JSON */
      }
    })

    const connectionDetail: Record<string, unknown> = {
      propertyEntityId: 501,
      entityId: 201,
      propertyListId: 1001,
      propertyEntityNote: null,
      buyerPipelineStatusId: 11,
      isOriginalOwner: false,
      buyerPipelineStatus: { propertyStatus: "Contact Made" },
      propertyRef: { streetAddress: "45 Test Street", state: "QLD", postcode: "4505" },
      buyerOffers: [
        {
          buyerOfferId: 9001,
          propertyEntityId: 501,
          offer: "0",
          isAccepted: false,
          dateOffered: "2026-04-20",
        },
      ],
      entityMembers: [],
      propertyEntityFiles: [],
      propertyEntityNotes: [],
    }

    await page.route("**/api/admin/property-entities**", async (route) => {
      const method = route.request().method()
      if (method !== "GET") {
        await route.continue()
        return
      }
      const url = route.request().url()
      const detailMatch = url.match(/\/property-entities\/(\d+)/)
      if (detailMatch) {
        const id = Number(detailMatch[1])
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(id === 501 ? connectionDetail : {}),
        })
        return
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: [connectionDetail] }),
      })
    })

    await page.goto(
      "/admin/entities?limit=25&page=1&sortKey=entityName&sortDir=asc&entityCategoryId=1&listLayout=grid",
    )
    await page.waitForLoadState("domcontentloaded")

    await page.getByTestId(/^admin-entity-row-edit--entities--/).first().click()

    const dialog = page.getByTestId("admin-entity-crud-dialog--entities")
    await expect(dialog).toBeVisible({ timeout: 30_000 })
    const dialogForm = dialog.getByTestId("panda-entities-dialog-form")
    await dialogForm.evaluate((el) => el.scrollTo(0, el.scrollHeight))

    const connections = dialog.getByTestId("panda-entities-property-connections")
    await expect(connections).toBeVisible({ timeout: 10_000 })

    const pipelineSelect = connections.getByTestId(
      "panda-entities-property-connections--pipeline-select",
    )
    await expect(pipelineSelect).toContainText("Contact Made", { timeout: 10_000 })

    await connections
      .getByTestId("admin-entity-crud-related-tabs--property-entities")
      .getByRole("tab", { name: /^offers$/i })
      .click()

    await expect(
      connections.getByTestId(
        "admin-entity-crud-related-row--property-entities--buyerOffers--saved--9001",
      ),
    ).toBeVisible({ timeout: 15_000 })

    const offerInput = connections.getByTestId(
      "admin-entity-crud-related-currency--property-entities--buyerOffers--offer--saved-9001",
    )
    await offerInput.fill("450000")

    await expect(async () => {
      const text = await pipelineSelect.textContent()
      return (
        text != null &&
        text.includes("Contact Made") &&
        !text.includes("Offer Made")
      )
    }).toPass({ timeout: 8000 })

    expect(
      buyerPipelineOnlyPatches.filter(
        (b) => b.buyerPipelineStatusId === "12" || b.buyerPipelineStatusId === 12,
      ),
    ).toHaveLength(0)
  })
})
