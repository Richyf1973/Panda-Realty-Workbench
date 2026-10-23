import { expect, test } from "@playwright/test"

import { requirePandaE2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import { routePandaPropertiesListDetailAndBuyerOffers } from "./helpers/panda-properties-dialog-mocks"

const EMPTY_ENTITIES = { items: [] }

const EMPTY_PROPERTY_ENTITIES = {
  items: [],
  totalCount: 0,
  limit: 20,
  totalPages: 0,
  hasNextPage: false,
  hasPreviousPage: false,
  startCursor: null,
  endCursor: null,
}

const STATUS_MIN = {
  items: [{ propertyStatusId: 1, propertyStatusCode: "ACTIVE", propertyStatus: "Active" }],
  totalCount: 1,
  limit: 100,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false,
  startCursor: null,
  endCursor: null,
}

const FORM_WITH_PREFILL = {
  propertyFormId: 1,
  formName: "PRO FORMA CONTRACT 2026",
  category: "Contract",
  description: "Pro forma contract sent to enquirers",
  isActive: true,
  fileLink: "https://drive.google.com/view?id=abc123",
  fileName: "PRO FORMA CONTRACT 2026.pdf",
  fileSize: 231936,
  googleDriveFileId: "abc123",
  prefillStrategy: "pro-forma-2026",
  createdAt: "2026-04-25T10:00:00.000Z",
  updatedAt: null,
}

const FORM_NO_PREFILL = {
  ...FORM_WITH_PREFILL,
  propertyFormId: 2,
  formName: "AGENCY AGREEMENT",
  prefillStrategy: null,
}

const FORMS_LIST_WITH_PREFILL = {
  items: [FORM_WITH_PREFILL],
  totalCount: 1,
  limit: 25,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false,
  startCursor: null,
  endCursor: null,
}

const FORMS_LIST_NO_PREFILL = {
  items: [FORM_NO_PREFILL],
  totalCount: 1,
  limit: 25,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false,
  startCursor: null,
  endCursor: null,
}

const SEND_HISTORY_EMPTY = { items: [] }

const BUYERS_WITH_EMAIL = {
  items: [
    {
      propertyEntityId: 501,
      entityId: 201,
      entityName: "Trevor Clarke",
      phoneNumber: null,
      emailAddress: "buyer@example.com",
      address: null,
      esuburb: null,
      estate: null,
      epostcode: null,
      notes: null,
      buyerPipelineStatusId: null,
      pipelineStatusLabel: null,
    },
  ],
}

const PREFILL_DATA = {
  buyers: [
    {
      entityId: 201,
      entityName: "Trevor Clarke",
      members: [],
      address: "1 Buyer St",
      phoneNumber: "0400000001",
      emailAddress: "buyer@example.com",
    },
  ],
  solicitor: null,
}

const SAVE_TO_DRIVE_RESPONSE = {
  driveFileLink: "https://drive.google.com/file/d/xyz789/view",
  driveFileName: "PRO FORMA CONTRACT 2026 — 12 Test Street, Testville [prefilled 2026-05-14].pdf",
}

/** Navigate to the Forms tab for property 1001, click Send on form row 1, and advance through prefill to step 2. */
async function openSendDialogAtStep2(
  page: Parameters<typeof signInAsAdmin>[0],
  formsListFixture: typeof FORMS_LIST_WITH_PREFILL | typeof FORMS_LIST_NO_PREFILL,
) {
  await routePandaPropertiesListDetailAndBuyerOffers(page)

  await page.route("**/api/admin/property-status**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(STATUS_MIN) })
  })
  await page.route("**/api/admin/property-entities**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_PROPERTY_ENTITIES) })
  })
  await page.route("**/api/admin/property-forms**", async (route) => {
    const url = route.request().url()
    if (url.includes("/upload") || url.includes("/send") || url.includes("/save-to-drive")) {
      await route.continue()
      return
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(formsListFixture) })
  })
  await page.route("**/api/admin/property-form-sends**", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SEND_HISTORY_EMPTY) })
      return
    }
    await route.continue()
  })
  await page.route("**/api/admin/properties/1001/buyers**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(BUYERS_WITH_EMAIL) })
  })
  await page.route("**/api/admin/properties/1001/contacts**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_ENTITIES) })
  })
  await page.route("**/api/admin/properties/1001/tenants**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_ENTITIES) })
  })
  await page.route("**/api/admin/property-forms/prefill-data**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(PREFILL_DATA) })
  })

  await page.goto("/admin/properties")
  await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible()
  await page.getByTestId("admin-entity-row--properties--1001").click()
  await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible()

  await page.getByTestId("panda-properties-form-tab-trigger--forms").click()
  await expect(page.getByTestId("panda-properties-form-tab--forms")).toBeVisible()

  const formRowId = formsListFixture.items[0].propertyFormId
  await page.getByTestId(`property-forms-send--${formRowId}`).click()
  await expect(page.getByTestId("property-form-send-dialog")).toBeVisible()

  // When hasPrefill is true the dialog opens at step 1 — always click Next to advance
  const hasPrefill = formsListFixture.items[0].prefillStrategy !== null
  if (hasPrefill) {
    await page.getByTestId("property-form-prefill-next").click()
  }

  // Wait for step 2 footer button to confirm we are on the send step
  await expect(page.getByTestId("property-form-send-submit")).toBeVisible()
  await page.waitForLoadState("networkidle")
}

test.describe("Send Form — Save to Drive (mocked APIs)", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaE2eAdminCredentials()
    await signInAsAdmin(page)
  })

  test("'Save to Drive' button is visible in Step 2 when form has a prefill strategy", async ({ page }) => {
    await openSendDialogAtStep2(page, FORMS_LIST_WITH_PREFILL)
    await expect(page.getByTestId("property-form-send-save-to-drive")).toBeVisible()
  })

  test("'Save to Drive' button is present alongside 'Send to recipients'", async ({ page }) => {
    await openSendDialogAtStep2(page, FORMS_LIST_WITH_PREFILL)
    await expect(page.getByTestId("property-form-send-save-to-drive")).toBeVisible()
    await expect(page.getByTestId("property-form-send-submit")).toBeVisible()
  })

  test("'Send to recipients' remains disabled when no recipient is checked", async ({ page }) => {
    await openSendDialogAtStep2(page, FORMS_LIST_WITH_PREFILL)
    await expect(page.getByTestId("property-form-send-submit")).toBeDisabled()
  })

  test("'Save to Drive' is NOT present when form has no prefill strategy", async ({ page }) => {
    await openSendDialogAtStep2(page, FORMS_LIST_NO_PREFILL)
    await expect(page.getByTestId("property-form-send-save-to-drive")).not.toBeVisible()
  })

  test("clicking 'Save to Drive' keeps dialog open and shows Drive link inline", async ({ page }) => {
    await openSendDialogAtStep2(page, FORMS_LIST_WITH_PREFILL)

    await page.route("**/api/admin/property-forms/send", async (route) => {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify(SAVE_TO_DRIVE_RESPONSE),
      })
    })

    await page.getByTestId("property-form-send-save-to-drive").click()

    // Dialog must remain open
    await expect(page.getByTestId("property-form-send-dialog")).toBeVisible()

    // Drive link appears inline
    await expect(page.getByTestId("property-form-send-drive-link")).toBeVisible()
    await expect(page.getByTestId("property-form-send-drive-link")).toHaveAttribute(
      "href",
      SAVE_TO_DRIVE_RESPONSE.driveFileLink,
    )
  })

  test("Drive link opens in a new tab", async ({ page }) => {
    await openSendDialogAtStep2(page, FORMS_LIST_WITH_PREFILL)

    await page.route("**/api/admin/property-forms/send", async (route) => {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify(SAVE_TO_DRIVE_RESPONSE),
      })
    })

    await page.getByTestId("property-form-send-save-to-drive").click()
    await expect(page.getByTestId("property-form-send-drive-link")).toHaveAttribute("target", "_blank")
  })

  test("API error on Save to Drive shows error message inline, dialog stays open", async ({ page }) => {
    await openSendDialogAtStep2(page, FORMS_LIST_WITH_PREFILL)

    await page.route("**/api/admin/property-forms/send", async (route) => {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: "Gmail is not connected." }),
      })
    })

    await page.getByTestId("property-form-send-save-to-drive").click()

    // Dialog remains open
    await expect(page.getByTestId("property-form-send-dialog")).toBeVisible()
    // Drive success link must NOT appear
    await expect(page.getByTestId("property-form-send-drive-link")).not.toBeVisible()
    // Error text is shown
    await expect(page.getByTestId("property-form-send-error")).toBeVisible()
  })

  test("Save to Drive POST body includes saveOnly flag and no recipientEntityIds", async ({ page }) => {
    await openSendDialogAtStep2(page, FORMS_LIST_WITH_PREFILL)

    let capturedBody: Record<string, unknown> | null = null
    await page.route("**/api/admin/property-forms/send", async (route) => {
      capturedBody = JSON.parse(route.request().postData() ?? "{}") as Record<string, unknown>
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify(SAVE_TO_DRIVE_RESPONSE),
      })
    })

    await page.getByTestId("property-form-send-save-to-drive").click()
    await expect(page.getByTestId("property-form-send-drive-link")).toBeVisible()

    expect(capturedBody).not.toBeNull()
    expect(capturedBody!.saveOnly).toBe(true)
    expect(capturedBody!.recipientEntityIds).toEqual([])
  })
})
