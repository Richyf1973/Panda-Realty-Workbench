import { expect, test } from "@playwright/test"

import { requirePandaE2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import { routePandaPropertiesListDetailAndBuyerOffers } from "./helpers/panda-properties-dialog-mocks"

const EMPTY_ENTITIES = { items: [] }

const FORMS_LIST = {
  items: [
    {
      propertyFormId: 1,
      formName: "PRO FORMA CONTRACT 2026",
      category: "Contract",
      description: "Pro forma contract sent to enquirers",
      isActive: true,
      fileLink: "https://drive.google.com/view?id=abc123",
      fileName: "PRO FORMA CONTRACT 2026.pdf",
      fileSize: 231936,
      googleDriveFileId: "abc123",
      createdAt: "2026-04-25T10:00:00.000Z",
      updatedAt: null,
    },
  ],
  totalCount: 1,
  limit: 25,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false,
  startCursor: null,
  endCursor: null,
}

const PRO_FORMA_2026_FORMS_LIST = {
  ...FORMS_LIST,
  items: [
    {
      ...FORMS_LIST.items[0],
      prefillStrategy: "pro-forma-2026",
    },
  ],
}

const PRO_FORMA_2026_BUYERS = {
  items: [
    { entityId: 201, entityName: "Trevor Clarke", emailAddress: "buyer@example.com" },
    { entityId: 202, entityName: "No Email Buyer", emailAddress: null },
  ],
}

const SEND_HISTORY = {
  items: [
    {
      propertyFormSendId: 1,
      propertyFormId: 1,
      formName: "PRO FORMA CONTRACT 2026",
      fileLink: "https://drive.google.com/view?id=abc123",
      recipientEmail: "buyer@example.com",
      recipientName: "Trevor Clarke",
      messageSent: "Please review the attached contract.",
      sentAt: "2026-04-25T11:00:00.000Z",
    },
  ],
}

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

async function installBasePropertyRoutes(
  page: import("@playwright/test").Page,
  opts: {
    formsList?: unknown
    buyersList?: unknown
    withBuyerOffers?: boolean
  } = {},
) {
  const formsList = opts.formsList ?? FORMS_LIST
  const buyersList = opts.buyersList ?? BUYERS_WITH_EMAIL

  await page.route("**/api/admin/property-status**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(STATUS_MIN) })
  })

  await page.route("**/api/admin/property-entities**", async (route) => {
    const url = route.request().url()
    if (opts.withBuyerOffers && url.match(/\/property-entities\/501\/buyer-offers/)) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(BUYER_ENTITY_OFFERS_501) })
      return
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_PROPERTY_ENTITIES) })
  })

  await page.route("**/api/admin/property-forms**", async (route) => {
    if (route.request().url().includes("/upload") || route.request().url().includes("/send")) {
      await route.continue()
      return
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(formsList) })
  })

  await page.route("**/api/admin/property-form-sends**", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SEND_HISTORY) })
      return
    }
    await route.continue()
  })

  await page.route("**/api/admin/properties/1001/buyers**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(buyersList) })
  })

  await page.route("**/api/admin/properties/1001/contacts**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_ENTITIES) })
  })

  await page.route("**/api/admin/properties/1001/tenants**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_ENTITIES) })
  })
}

test.describe("Panda Realty admin — property dialog Forms tab (mocked APIs)", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaE2eAdminCredentials()
    await installBasePropertyRoutes(page)
    await signInAsAdmin(page)
  })

  test("Forms tab trigger is visible on a favourite property", async ({ page }) => {
    await routePandaPropertiesListDetailAndBuyerOffers(page)
    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible()
    await page.getByTestId("admin-entity-row--properties--1001").click()
    await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible()
    await expect(page.getByTestId("panda-properties-form-tab-trigger--forms")).toBeVisible()
  })

  test("Forms tab shows active forms list", async ({ page }) => {
    await routePandaPropertiesListDetailAndBuyerOffers(page)
    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible()
    await page.getByTestId("admin-entity-row--properties--1001").click()
    await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible()

    await page.getByTestId("panda-properties-form-tab-trigger--forms").click()
    await expect(page.getByTestId("panda-properties-form-tab--forms")).toBeVisible()
    await expect(page.getByTestId("property-forms-list")).toBeVisible()
    await expect(page.getByTestId("property-forms-row--1")).toContainText("PRO FORMA CONTRACT 2026")
    await expect(page.getByTestId("property-forms-row--1")).toContainText("Contract")
  })

  test("Forms tab shows send history", async ({ page }) => {
    await routePandaPropertiesListDetailAndBuyerOffers(page)
    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible()
    await page.getByTestId("admin-entity-row--properties--1001").click()
    await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible()

    await page.getByTestId("panda-properties-form-tab-trigger--forms").click()
    await expect(page.getByTestId("property-forms-history-list")).toBeVisible()
    await expect(page.getByTestId("property-forms-history-row--1")).toContainText("PRO FORMA CONTRACT 2026")
    await expect(page.getByTestId("property-forms-history-row--1")).toContainText("buyer@example.com")
  })

  test("Send button opens dialog with entity recipients", async ({ page }) => {
    await routePandaPropertiesListDetailAndBuyerOffers(page)
    // Register sub-route mocks AFTER routePandaPropertiesListDetailAndBuyerOffers so they
    // take precedence (Playwright checks routes in LIFO order).
    await page.route("**/api/admin/properties/1001/buyers**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(BUYERS_WITH_EMAIL) })
    })
    await page.route("**/api/admin/properties/1001/contacts**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_ENTITIES) })
    })
    await page.route("**/api/admin/properties/1001/tenants**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_ENTITIES) })
    })
    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible()
    await page.getByTestId("admin-entity-row--properties--1001").click()
    await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible()

    await page.getByTestId("panda-properties-form-tab-trigger--forms").click()
    await page.getByTestId("property-forms-send--1").click()

    await expect(page.getByTestId("property-form-send-dialog")).toBeVisible()
    await expect(page.getByTestId("property-form-send-recipients")).toContainText("Trevor Clarke")
    await expect(page.getByTestId("property-form-send-recipients")).toContainText("buyer@example.com")
  })

  test("Send button is disabled when no recipients checked", async ({ page }) => {
    await routePandaPropertiesListDetailAndBuyerOffers(page)
    // Register sub-route mocks AFTER routePandaPropertiesListDetailAndBuyerOffers so they
    // take precedence (Playwright checks routes in LIFO order).
    await page.route("**/api/admin/properties/1001/buyers**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(BUYERS_WITH_EMAIL) })
    })
    await page.route("**/api/admin/properties/1001/contacts**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_ENTITIES) })
    })
    await page.route("**/api/admin/properties/1001/tenants**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_ENTITIES) })
    })
    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible()
    await page.getByTestId("admin-entity-row--properties--1001").click()
    await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible()

    await page.getByTestId("panda-properties-form-tab-trigger--forms").click()
    await page.getByTestId("property-forms-send--1").click()
    await expect(page.getByTestId("property-form-send-dialog")).toBeVisible()
    await expect(page.getByTestId("property-form-send-submit")).toBeDisabled()
  })
})

test.describe("Panda Realty admin — pro-forma-2026 send-link flow (mocked)", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaE2eAdminCredentials()
    await installBasePropertyRoutes(page, { formsList: PRO_FORMA_2026_FORMS_LIST, buyersList: PRO_FORMA_2026_BUYERS })
    await signInAsAdmin(page)
  })

  async function openFormsTab(page: import("@playwright/test").Page) {
    await routePandaPropertiesListDetailAndBuyerOffers(page)
    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible()
    await page.getByTestId("admin-entity-row--properties--1001").click()
    await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible()
    await page.getByTestId("panda-properties-form-tab-trigger--forms").click()
    await expect(page.getByTestId("panda-properties-form-tab--forms")).toBeVisible()
  }

  test("View button is NOT shown for pro-forma-2026 form", async ({ page }) => {
    await openFormsTab(page)
    await expect(page.getByTestId("property-forms-row--1")).toBeVisible()
    await expect(page.getByTestId("property-forms-link--1")).not.toBeVisible()
  })

  test("Send button opens send-link dialog (not the old send dialog)", async ({ page }) => {
    await openFormsTab(page)
    await page.getByTestId("property-forms-send--1").click()
    await expect(page.getByTestId("property-form-send-link-dialog")).toBeVisible()
    await expect(page.getByTestId("property-form-send-dialog")).not.toBeVisible()
  })

  test("Send-link dialog shows buyers with email and greyed-out buyer without email", async ({ page }) => {
    await openFormsTab(page)
    await page.getByTestId("property-forms-send--1").click()
    await expect(page.getByTestId("property-form-send-link-dialog")).toBeVisible()
    await expect(page.getByTestId("send-link-buyer--201")).toContainText("Trevor Clarke")
    await expect(page.getByTestId("send-link-buyer--202")).toContainText("No Email Buyer")
    await expect(page.getByTestId("send-link-buyer--202")).toContainText("No email on file")
  })

  test("Send button in dialog is disabled until a buyer is selected", async ({ page }) => {
    await openFormsTab(page)
    await page.getByTestId("property-forms-send--1").click()
    await expect(page.getByTestId("property-form-send-link-dialog")).toBeVisible()
    await expect(page.getByTestId("send-link-submit")).toBeDisabled()
    await page.getByTestId("send-link-no-offer--201").click()
    await expect(page.getByTestId("send-link-submit")).toBeEnabled()
  })
})

// ── TDD: pro-forma send-link dialog with per-offer selection ─────────────────

const PRO_FORMA_2026_BUYERS_WITH_PE = {
  items: [
    { entityId: 201, entityName: "Trevor Clarke", emailAddress: "buyer@example.com", propertyEntityId: 501 },
    { entityId: 202, entityName: "No Email Buyer", emailAddress: null, propertyEntityId: 502 },
  ],
}

const BUYER_ENTITY_OFFERS_501 = {
  propertyListId: 1001,
  contractDate: null,
  offerFormToken: "test-token-abc",
  offers: [
    {
      buyerOfferId: 9001,
      offer: "1200000",
      isAccepted: false,
      dateOffered: "2026-05-22",
      settlementPeriod: "38 Days",
    },
    {
      buyerOfferId: 9002,
      offer: "950000",
      isAccepted: false,
      dateOffered: "2026-05-15",
      settlementPeriod: "42 Days",
    },
  ],
}

test.describe("Panda Realty admin — pro-forma send-link dialog with offer selection (TDD)", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaE2eAdminCredentials()
    await installBasePropertyRoutes(page, {
      formsList: PRO_FORMA_2026_FORMS_LIST,
      buyersList: PRO_FORMA_2026_BUYERS_WITH_PE,
      withBuyerOffers: true,
    })
    await signInAsAdmin(page)
  })

  async function openSendLinkDialog(page: import("@playwright/test").Page) {
    await routePandaPropertiesListDetailAndBuyerOffers(page)
    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible()
    await page.getByTestId("admin-entity-row--properties--1001").click()
    await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible()
    await page.getByTestId("panda-properties-form-tab-trigger--forms").click()
    await expect(page.getByTestId("panda-properties-form-tab--forms")).toBeVisible()
    await page.getByTestId("property-forms-send--1").click()
    await expect(page.getByTestId("property-form-send-link-dialog")).toBeVisible()
  }

  test("SF1 — dialog shows offers under buyer Trevor Clarke", async ({ page }) => {
    await openSendLinkDialog(page)

    await expect(page.getByTestId("send-link-buyer--201")).toBeVisible()
    await expect(page.getByTestId("send-link-offer--9001")).toBeVisible()
    await expect(page.getByTestId("send-link-offer--9001")).toContainText("1,200,000")
    await expect(page.getByTestId("send-link-offer--9002")).toBeVisible()
    await expect(page.getByTestId("send-link-offer--9002")).toContainText("950,000")
  })

  test("SF2 — submit disabled until an offer is selected", async ({ page }) => {
    await openSendLinkDialog(page)

    await expect(page.getByTestId("send-link-submit")).toBeDisabled()
    await page.getByTestId("send-link-offer--9001").click()
    await expect(page.getByTestId("send-link-submit")).toBeEnabled()
  })

  test("SF3 — No specific offer option also enables submit", async ({ page }) => {
    await openSendLinkDialog(page)

    await expect(page.getByTestId("send-link-submit")).toBeDisabled()
    await page.getByTestId("send-link-no-offer--201").click()
    await expect(page.getByTestId("send-link-submit")).toBeEnabled()
  })

  test("SF4 — selecting an offer and sending includes offerId in the sent link", async ({ page }) => {
    let sentBody: Record<string, unknown> = {}

    await page.route("**/api/admin/property-forms/send-link**", async (route) => {
      if (route.request().method() === "POST") {
        const raw = route.request().postData()
        sentBody = raw ? (JSON.parse(raw) as Record<string, unknown>) : {}
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) })
        return
      }
      await route.continue()
    })

    await openSendLinkDialog(page)
    await page.getByTestId("send-link-offer--9001").click()
    await expect(page.getByTestId("send-link-submit")).toBeEnabled()
    await page.getByTestId("send-link-submit").click()

    expect(sentBody).toMatchObject({ buyerOfferIds: { 501: 9001 } })
    expect(sentBody).not.toHaveProperty("buyerOfferId")
  })

  test("SF5 — no specific offer sends without buyerOfferId in request", async ({ page }) => {
    let sentBody: Record<string, unknown> = {}

    await page.route("**/api/admin/property-forms/send-link**", async (route) => {
      if (route.request().method() === "POST") {
        const raw = route.request().postData()
        sentBody = raw ? (JSON.parse(raw) as Record<string, unknown>) : {}
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) })
        return
      }
      await route.continue()
    })

    await openSendLinkDialog(page)
    await page.getByTestId("send-link-no-offer--201").click()
    await page.getByTestId("send-link-submit").click()

    expect(sentBody).not.toHaveProperty("buyerOfferIds")
    expect(sentBody).not.toHaveProperty("buyerOfferId")
  })
})

test.describe("Panda Realty admin — Forms tab hidden on non-favourite property", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaE2eAdminCredentials()

    const NON_FAVOURITE_PROPERTY = {
      propertyListId: 2001,
      streetAddress: "99 Non Fave Street",
      suburb: "Testville",
      state: "QLD",
      postcode: "4000",
      propertyType: "House",
      bed: 3,
      bath: 2,
      car: 1,
      propertyStatusId: 1,
      isFavorite: false,
      priceUndisclosed: false,
      excludeFromReport: false,
      saleDate: null,
      updatedAt: "2026-01-01T00:00:00Z",
      propertyEntities: [],
      propertyBuyers: [],
      propertyContacts: [],
      propertyTenants: [],
    }

    await page.route("**/api/admin/properties**", async (route) => {
      const url = route.request().url()
      if (url.match(/\/api\/admin\/properties\/2001(\?|$)/)) {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(NON_FAVOURITE_PROPERTY) })
        return
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: [NON_FAVOURITE_PROPERTY],
          totalCount: 1, limit: 25, totalPages: 1, hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null,
        }),
      })
    })

    await page.route("**/api/admin/property-status**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(STATUS_MIN) })
    })

    await page.route("**/api/admin/property-entities**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_PROPERTY_ENTITIES) })
    })

    await signInAsAdmin(page)
  })

  test("Forms tab NOT visible on a non-favourite property", async ({ page }) => {
    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible()
    await page.getByTestId("admin-entity-row--properties--2001").click()
    await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible()
    await expect(page.getByTestId("panda-properties-form-tab-trigger--forms")).not.toBeVisible()
  })
})
