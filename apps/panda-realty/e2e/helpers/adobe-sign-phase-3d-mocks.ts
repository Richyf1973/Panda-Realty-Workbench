import { expect } from "@playwright/test"

import { signInAsAdmin } from "./admin-auth"
import {
  MOCK_PROPERTY_ID,
  routePandaPropertiesListDetailAndBuyerOffers,
} from "./panda-properties-dialog-mocks"

export { MOCK_PROPERTY_ID }

export const MOCK_PE_ID = 185969
export const MOCK_ENTITY_ID = 99999
export const MOCK_PORTAL_TOKEN_ID = 1
export const MOCK_DRIVE_FILE_ID = "drive-file-contract-abc123"
export const MOCK_DRIVE_FILE_ID_2 = "drive-file-disclosure-def456"

const STATUS_MIN = {
  items: [{ propertyStatusId: 1, propertyStatusCode: "ACTIVE", propertyStatus: "Active" }],
  totalCount: 1, limit: 100, totalPages: 1,
  hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null,
}

const EMPTY_LIST = {
  items: [], totalCount: 0, limit: 20, totalPages: 0,
  hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null,
}

export const MOCK_ENTITY_DETAIL = {
  entityId: MOCK_ENTITY_ID,
  entityName: "E2E Sign Buyer",
  entityCategoryId: 1,
  phoneNumber: null,
  emailAddress: "buyer@example.com",
  address: null,
  esuburb: null,
  estate: null,
  epostcode: null,
  notes: null,
  contactCategoryId: null,
  isVip: false,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
}

export const MOCK_ENTITY_DETAIL_NO_EMAIL = {
  ...MOCK_ENTITY_DETAIL,
  emailAddress: null as string | null,
}

const BUYER_PANEL_ITEM = {
  propertyEntityId: MOCK_PE_ID,
  entityId: MOCK_ENTITY_ID,
  entityName: "E2E Sign Buyer",
  phoneNumber: null,
  emailAddress: "buyer@example.com",
  address: null,
  esuburb: null,
  estate: null,
  epostcode: null,
  notes: null,
  buyerPipelineStatusId: null,
  pipelineStatusLabel: null,
  hasOfferFormSubmission: false,
}

const BUYERS_PANEL_RESPONSE = { items: [BUYER_PANEL_ITEM] }

const MOCK_BUYER_ENTITY = {
  propertyEntityId: MOCK_PE_ID,
  entityId: MOCK_ENTITY_ID,
  propertyListId: MOCK_PROPERTY_ID,
  propertyEntityNote: null,
  buyerPipelineStatusId: null,
  isOriginalOwner: false,
  contactCategoryId: null,
  association: "Buyer",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  propertyEntity: { entityId: MOCK_ENTITY_ID, entityCategoryId: 1, entityName: "E2E Sign Buyer" },
  propertyRef: { streetAddress: "12 Test Street", state: "QLD", postcode: "4000" },
  buyerPipelineStatus: null,
  contactCategory: null,
}

const BUYER_ENTITIES_LIST = {
  items: [MOCK_BUYER_ENTITY],
  totalCount: 1, limit: 20, totalPages: 1,
  hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null,
}

export const MOCK_ACTIVE_TOKEN = {
  portalTokenId: MOCK_PORTAL_TOKEN_ID,
  token: "e2e-sign-test-token-abc",
  propertyEntityId: MOCK_PE_ID,
  propertyListId: MOCK_PROPERTY_ID,
  revokedAt: null,
  lastAccessedAt: null,
  createdAt: "2026-05-29T09:00:00.000Z",
}

export const MOCK_REVOKED_TOKEN = {
  ...MOCK_ACTIVE_TOKEN,
  revokedAt: "2026-05-29T10:00:00.000Z",
}

export const MOCK_PENDING_REQUEST_ID = 42

export const MOCK_SHARED_FILES_TWO = [
  { driveFileId: MOCK_DRIVE_FILE_ID, fileName: "Contract of Sale.pdf", signatureStatus: null, signRequestId: null, signedAt: null },
  { driveFileId: MOCK_DRIVE_FILE_ID_2, fileName: "Disclosure Statement.pdf", signatureStatus: "pending", signRequestId: MOCK_PENDING_REQUEST_ID, signedAt: null },
]

export const MOCK_SHARED_FILES_ONE = [
  { driveFileId: MOCK_DRIVE_FILE_ID, fileName: "Contract of Sale.pdf", signatureStatus: null, signRequestId: null, signedAt: null },
]

export const MOCK_SHARED_FILES_EMPTY: typeof MOCK_SHARED_FILES_ONE = []

export const MOCK_SIGN_REQUEST_CREATED = {
  id: MOCK_PENDING_REQUEST_ID,
  adobeSignAgreementId: `TEST-AGR-${MOCK_DRIVE_FILE_ID}`,
  signatureStatus: "pending",
  signerEmail: "buyer@example.com",
}

export type SetupOptions = {
  portalTokenResponse: typeof MOCK_ACTIVE_TOKEN | typeof MOCK_REVOKED_TOKEN | null
  sharedFiles: Array<Record<string, unknown>>
  signRequestResponse?: { status: number; body: unknown }
  entityDetail?: typeof MOCK_ENTITY_DETAIL | typeof MOCK_ENTITY_DETAIL_NO_EMAIL
}

export async function setupMocked(
  page: Parameters<typeof signInAsAdmin>[0],
  {
    portalTokenResponse,
    sharedFiles,
    signRequestResponse = { status: 200, body: MOCK_SIGN_REQUEST_CREATED },
    entityDetail = MOCK_ENTITY_DETAIL,
  }: SetupOptions,
) {
  await page.route("**/api/admin/property-status**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(STATUS_MIN) })
  })

  await page.route("**/api/admin/property-entities**", async (route) => {
    const url = route.request().url()
    const method = route.request().method()
    if (url.match(/\/property-entities\/\d+/) && method === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_BUYER_ENTITY) })
      return
    }
    if (method === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(BUYER_ENTITIES_LIST) })
      return
    }
    await route.continue()
  })

  await page.route("**/api/admin/portal-tokens**", async (route) => {
    const url = route.request().url()
    const method = route.request().method()

    if (method === "GET" && url.match(/\/portal-tokens\/\d+\/shared-files/)) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(sharedFiles) })
      return
    }

    if (method === "POST" && url.match(/\/portal-tokens\/\d+\/sign-request/)) {
      await route.fulfill({
        status: signRequestResponse.status,
        contentType: "application/json",
        body: JSON.stringify(signRequestResponse.body),
      })
      return
    }

    if (method === "GET" && !url.match(/\/portal-tokens\/\d+\//)) {
      await route.fulfill({ status: portalTokenResponse ? 200 : 404, contentType: "application/json", body: JSON.stringify(portalTokenResponse) })
      return
    }

    if (method === "POST" && !url.match(/\/portal-tokens\/\d+\//)) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_ACTIVE_TOKEN) })
      return
    }

    if (method === "PATCH") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_REVOKED_TOKEN) })
      return
    }

    await route.continue()
  })

  await page.route("**/api/admin/entities**", async (route) => {
    const url = route.request().url()
    const method = route.request().method()
    if (method === "GET" && url.match(/\/entities\/\d+/)) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(entityDetail) })
      return
    }
    if (method === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_LIST) })
      return
    }
    await route.continue()
  })

  await page.route("**/api/admin/properties**/buyers", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(BUYERS_PANEL_RESPONSE) })
  })

  await routePandaPropertiesListDetailAndBuyerOffers(page)
  await signInAsAdmin(page)
}

export async function navigateToBuyerPortalTab(page: Parameters<typeof signInAsAdmin>[0]) {
  await page.goto("/admin/properties")
  await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible({ timeout: 20_000 })

  await page.getByTestId(`admin-entity-row--properties--${MOCK_PROPERTY_ID}`).click()
  const propertiesDialog = page.getByTestId("admin-entity-crud-dialog--properties")
  await expect(propertiesDialog).toBeVisible({ timeout: 10_000 })

  await propertiesDialog.getByTestId("panda-properties-form-tab-trigger--buyers").click()

  const openProfileBtn = propertiesDialog
    .getByTestId("panda-properties-form-tab--buyers")
    .getByTestId(`property-buyer-owner-row-open-profile--${MOCK_PE_ID}`)
  await expect(openProfileBtn).toBeVisible({ timeout: 15_000 })
  await openProfileBtn.click()

  const buyerWorkspace = page.getByTestId("admin-entity-crud-dialog--entities")
  await expect(buyerWorkspace).toBeVisible({ timeout: 15_000 })

  await buyerWorkspace
    .getByTestId("admin-entity-crud-related-tab--property-entities--portal-tab")
    .click()

  const panel = buyerWorkspace.getByTestId("portal-access-panel")
  await expect(panel).toBeVisible({ timeout: 10_000 })

  await expect(
    panel.getByTestId("portal-access-panel-url-display")
      .or(panel.getByTestId("portal-access-panel-generate-btn"))
      .or(panel.getByTestId("portal-access-panel-revoked-status")),
  ).toBeVisible({ timeout: 10_000 })

  return { buyerWorkspace, panel }
}
