// Run: npm run test:e2e:scratch -- --app=panda-realty --spec="apps/panda-realty/e2e/admin-properties-successful-buyer-section.spec.ts" --no-bail
import { expect, test } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { createStory, shotFocused } from "@repo/e2e-utils"

import type { Page } from "@playwright/test"

import { e2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import {
  BUYER_PANEL_ITEMS_RESPONSE_1001,
  EMPTY_LIST_RESPONSE,
  EMPTY_PROPERTY_ENTITIES_RESPONSE,
  PROPERTY_EDIT_WITH_BUYER,
  SINGLE_PROPERTY_RESPONSE,
  STATUS_LIST_RESPONSE,
} from "./helpers/admin-properties-mocks"
import {
  maybeFulfillPandaPropertyBuyerOffersGet,
  MOCK_PROPERTY_ID,
} from "./helpers/panda-properties-dialog-mocks"

const SHOT_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "screenshots",
  "successful-buyer-section",
)

const story = createStory({
  specUrl: import.meta.url,
  slug: "successful-buyer-section",
})

story.setWhatWasBuilt(
  "Added a BUYERS inline section to the Edit Property dialog that appears between OWNER INFORMATION and PROPERTY DETAILS when a buyer offer has been accepted. " +
  "The section shows the accepted buyer's Name (clickable to open their profile), Offer Amount, Phone, and Email in a 4-column grid, " +
  "with Call, Email, Notes, and Files action buttons. " +
  "The accepted buyer is also excluded from the Buyers tab list (NOT EXISTS filter in buyers route). " +
  "Files modified: apps/panda-realty/app/api/admin/properties/[id]/buyer-offers/route.ts, " +
  "apps/panda-realty/app/api/admin/properties/[id]/buyers/route.ts, " +
  "apps/panda-realty/components/admin/panda-properties-dialog-form-types.ts, " +
  "apps/panda-realty/components/admin/panda-properties-form-successful-buyer-section.tsx, " +
  "apps/panda-realty/components/admin/panda-properties-dialog-form.tsx.",
)

/** Single buyer member of the accepted buyer entity. */
const MEMBER_ID = 701
const ACCEPTED_MEMBER = {
  entityMemberId: MEMBER_ID,
  memberName: "Test Buyer LLC",
  memberAddress: null,
  memberPhoneNumber: "0400 111 222",
  memberEmailAddress: "buyer@test.com",
  isBuyersRepresentative: false,
}

/** Accepted offer mock — matches BuyerOffer shape including members[] + primary pointers. */
const ACCEPTED_OFFER = {
  buyerOfferId: 9002,
  propertyEntityId: 501,
  entityId: 201,
  entityName: "Test Buyer LLC",
  offerFormToken: null,
  phoneNumber: "0400 111 222",
  emailAddress: "buyer@test.com",
  members: [ACCEPTED_MEMBER],
  primaryPhoneMemberId: null,
  primaryEmailMemberId: null,
  offer: "850000.00",
  isAccepted: true,
  dateOffered: "2026-03-20",
  createdAt: "2026-03-20T00:00:00Z",
  isCashOffer: false,
  noConditions: false,
  coolingOffDays: null,
  financeDays: null,
  buildingPestDays: null,
  dueDiligenceDays: null,
  subjectToSaleDays: null,
  subjectToSaleStage: null,
  subjectToSaleAddress: null,
  memberPropertyToSellAddress: null,
  saleOfPropertyDays: null,
  unconditionalContractDays: null,
  depositInitial: null,
  depositBalance: null,
  otherConditions: null,
  customConditions: null,
  conditionNotes: null,
  waiveCoolingOff: null,
  isSubjectToFinance: null,
  financePreApproved: null,
  financeBank: null,
  financeBankContactName: null,
  financeBankContactPhone: null,
  financeBankContactEmail: null,
  suggestBuildingCompanies: null,
  isSubjectToSale: null,
  saleDaysBeforeListingLive: null,
  saleIsUnconditional: null,
  saleUnconditionalDate: null,
  saleBuyerSettlementDate: null,
  saleActiveConditions: null,
  saleFreeAppraisal: null,
  settlementPeriod: null,
}

/** Wires up property list + detail + buyer-offers routes. Buyer-offers body is configurable. */
async function setupPropertyRoutes(
  page: Page,
  options: { buyerOffers: unknown[]; buyersPanelItems?: unknown[] },
) {
  const buyersPanelItems = options.buyersPanelItems ?? []

  await page.route("**/api/admin/properties**", async (route) => {
    const url = route.request().url()
    if (await maybeFulfillPandaPropertyBuyerOffersGet(route, { body: options.buyerOffers })) return
    if (url.match(new RegExp(`/api/admin/properties/${MOCK_PROPERTY_ID}/buyers(\\?|$)`))) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: buyersPanelItems }),
      })
      return
    }
    if (url.match(new RegExp(`/api/admin/properties/${MOCK_PROPERTY_ID}(\\?|$)`))) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(PROPERTY_EDIT_WITH_BUYER),
      })
      return
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ...SINGLE_PROPERTY_RESPONSE,
        items: [{ ...PROPERTY_EDIT_WITH_BUYER }],
      }),
    })
  })

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

  // Entity address fetch on mount for accepted offer buyer
  await page.route("**/api/admin/entities**", async (route) => {
    const method = route.request().method()
    if (method === "GET" || method === "PATCH") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ entityId: 201, entityName: "Test Buyer LLC", address: null }),
      })
      return
    }
    await route.fallback()
  })
}

test.beforeEach(async () => {
  await mkdir(SHOT_DIR, { recursive: true })
})

test.afterAll(() => {
  story.write()
})

test.describe("successful buyer inline section — edit property dialog", () => {
  test.beforeEach(async ({ page }) => {
    if (!e2eAdminCredentials) throw new Error("E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")
    await signInAsAdmin(page)
  })

  test("shows BUYERS section with correct columns and buyer row when offer is accepted", async ({
    page,
  }) => {
    await setupPropertyRoutes(page, { buyerOffers: [ACCEPTED_OFFER] })

    await page.setViewportSize({ width: 1400, height: 900 })
    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible({ timeout: 15_000 })
    await page.getByTestId(`admin-entity-row--properties--${MOCK_PROPERTY_ID}`).click()

    const dialog = page.getByTestId("admin-entity-crud-dialog--properties")
    await expect(dialog).toBeVisible()

    const section = dialog.getByTestId("panda-properties-form-section--successful-buyer")
    await expect(section).toBeVisible({ timeout: 15_000 })

    // Column headers: Name / Address / Phone / Email (Offer Amount no longer shown)
    const headers = dialog.getByTestId("panda-properties-form-successful-buyer-column-headers")
    await expect(headers).toBeVisible()
    await expect(headers).toContainText("Name")
    await expect(headers).toContainText("Address")
    await expect(headers).toContainText("Phone")
    await expect(headers).toContainText("Email")

    // Member name is an editable input
    await expect(
      dialog.getByTestId(`panda-properties-form-successful-buyer-member-name--${MEMBER_ID}`),
    ).toHaveValue("Test Buyer LLC")

    // Member phone is an editable input
    await expect(
      dialog.getByTestId(`panda-properties-form-successful-buyer-member-phone--${MEMBER_ID}`),
    ).toHaveValue("0400 111 222")

    // Member email is an editable input
    await expect(
      dialog.getByTestId(`panda-properties-form-successful-buyer-member-email--${MEMBER_ID}`),
    ).toHaveValue("buyer@test.com")

    await shotFocused(page, section, SHOT_DIR, "01-buyers-section-visible")
    story.addScene({
      title: "01 — BUYERS section visible with accepted offer",
      images: [join(SHOT_DIR, "01-buyers-section-visible.png")],
      seeing:
        "The BUYERS inline section appears below OWNER INFORMATION with the accepted buyer row showing Name, Offer Amount, Phone, and Email columns.",
      steps: [
        "Open Edit Property dialog for property with an accepted buyer offer",
        "BUYERS section is visible between OWNER INFORMATION and PROPERTY DETAILS",
        "Row shows buyer name, formatted offer amount, phone, and email",
      ],
    })
  })

  test("open-profile button opens the entity profile dialog", async ({
    page,
  }) => {
    await setupPropertyRoutes(page, { buyerOffers: [ACCEPTED_OFFER] })

    await page.setViewportSize({ width: 1400, height: 900 })
    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible({ timeout: 15_000 })
    await page.getByTestId(`admin-entity-row--properties--${MOCK_PROPERTY_ID}`).click()

    const dialog = page.getByTestId("admin-entity-crud-dialog--properties")
    const section = dialog.getByTestId("panda-properties-form-section--successful-buyer")
    await expect(section).toBeVisible({ timeout: 15_000 })

    // Profile open button is the ↗ icon next to the name input
    const profileBtn = section.getByRole("button", { name: "Open buyer profile" })
    await expect(profileBtn).toBeVisible({ timeout: 10_000 })

    await shotFocused(page, section, SHOT_DIR, "02a-name-btn-before-click")

    await profileBtn.click()

    const entitiesDlg = page.getByTestId("admin-entity-crud-dialog--entities")
    await expect(entitiesDlg).toBeVisible({ timeout: 10_000 })

    await shotFocused(page, entitiesDlg, SHOT_DIR, "02b-profile-dialog-open")
    story.addScene({
      title: "02 — Buyer name opens entity profile dialog",
      images: [
        join(SHOT_DIR, "02a-name-btn-before-click.png"),
        join(SHOT_DIR, "02b-profile-dialog-open.png"),
      ],
      seeing:
        "Left: BUYERS section with clickable name button. Right: entities profile dialog opens after clicking the buyer name.",
      steps: [
        "Click the buyer name in the BUYERS section",
        "Entity profile dialog opens for that buyer",
      ],
    })
  })

  test("email action button opens Gmail compose dialog", async ({ page }) => {
    await setupPropertyRoutes(page, { buyerOffers: [ACCEPTED_OFFER] })
    await page.route("**/api/admin/gmail**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ threads: [] }) })
    })

    await page.setViewportSize({ width: 1400, height: 900 })
    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible({ timeout: 15_000 })
    await page.getByTestId(`admin-entity-row--properties--${MOCK_PROPERTY_ID}`).click()

    const dialog = page.getByTestId("admin-entity-crud-dialog--properties")
    const emailBtn = dialog.getByTestId(
      `panda-properties-form-successful-buyer-member-compose--${MEMBER_ID}`,
    )
    await expect(emailBtn).toBeVisible({ timeout: 15_000 })

    const section = dialog.getByTestId("panda-properties-form-section--successful-buyer")
    await shotFocused(page, section, SHOT_DIR, "03a-email-btn-before")

    await emailBtn.click()

    const composeDialog = page.getByTestId("property-gmail-compose-dialog")
    await expect(composeDialog).toBeVisible({ timeout: 10_000 })

    await shotFocused(page, composeDialog, SHOT_DIR, "03b-compose-open")
    story.addScene({
      title: "03 — Email button opens Gmail compose dialog",
      images: [
        join(SHOT_DIR, "03a-email-btn-before.png"),
        join(SHOT_DIR, "03b-compose-open.png"),
      ],
      seeing:
        "Left: BUYERS section with email action button. Right: Gmail compose dialog opens pre-addressed to the buyer.",
      steps: [
        "Click the email icon in the action row of the BUYERS section",
        "Gmail compose dialog opens",
      ],
    })
  })

  test("notes action button opens notes dialog", async ({ page }) => {
    await setupPropertyRoutes(page, { buyerOffers: [ACCEPTED_OFFER] })

    await page.setViewportSize({ width: 1400, height: 900 })
    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible({ timeout: 15_000 })
    await page.getByTestId(`admin-entity-row--properties--${MOCK_PROPERTY_ID}`).click()

    const dialog = page.getByTestId("admin-entity-crud-dialog--properties")
    const notesBtn = dialog.getByTestId(
      `panda-properties-form-successful-buyer-notes--${ACCEPTED_OFFER.propertyEntityId}`,
    )
    await expect(notesBtn).toBeVisible({ timeout: 15_000 })
    await notesBtn.click()

    await expect(page.getByTestId("property-entity-notes-dialog")).toBeVisible({ timeout: 10_000 })

    const section = dialog.getByTestId("panda-properties-form-section--successful-buyer")
    await shotFocused(page, page.getByTestId("property-entity-notes-dialog"), SHOT_DIR, "04-notes-dialog-open")
    story.addScene({
      title: "04 — Notes button opens notes dialog",
      images: [join(SHOT_DIR, "04-notes-dialog-open.png")],
      seeing: "Notes dialog opens after clicking the notes action button in the BUYERS section.",
      steps: ["Click the notes icon in the BUYERS section action row", "Notes dialog opens"],
    })
  })

  test("files action button opens files dialog", async ({ page }) => {
    await setupPropertyRoutes(page, { buyerOffers: [ACCEPTED_OFFER] })
    await page.route("**/api/admin/property-entity-files**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) })
    })

    await page.setViewportSize({ width: 1400, height: 900 })
    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible({ timeout: 15_000 })
    await page.getByTestId(`admin-entity-row--properties--${MOCK_PROPERTY_ID}`).click()

    const dialog = page.getByTestId("admin-entity-crud-dialog--properties")
    const filesBtn = dialog.getByTestId(
      `panda-properties-form-successful-buyer-files--${ACCEPTED_OFFER.propertyEntityId}`,
    )
    await expect(filesBtn).toBeVisible({ timeout: 15_000 })
    await filesBtn.click()

    const filesDialog = page.getByTestId("property-entity-files-dialog")
    await expect(filesDialog).toBeVisible({ timeout: 10_000 })

    await shotFocused(page, filesDialog, SHOT_DIR, "05-files-dialog-open")
    story.addScene({
      title: "05 — Files button opens files dialog",
      images: [join(SHOT_DIR, "05-files-dialog-open.png")],
      seeing: "Files dialog opens after clicking the files action button in the BUYERS section.",
      steps: ["Click the files icon in the BUYERS section action row", "Files dialog opens"],
    })
  })

  test("BUYERS section is hidden when no offer is accepted", async ({ page }) => {
    await setupPropertyRoutes(page, {
      buyerOffers: [{ ...ACCEPTED_OFFER, isAccepted: false }],
      buyersPanelItems: BUYER_PANEL_ITEMS_RESPONSE_1001.items,
    })

    await page.setViewportSize({ width: 1400, height: 900 })
    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible({ timeout: 15_000 })
    await page.getByTestId(`admin-entity-row--properties--${MOCK_PROPERTY_ID}`).click()

    const dialog = page.getByTestId("admin-entity-crud-dialog--properties")
    await expect(dialog).toBeVisible()

    // Wait for dialog to fully load (owners section visible)
    await expect(dialog.getByTestId("panda-properties-form-section--owners")).toBeVisible({
      timeout: 10_000,
    })

    await expect(
      dialog.getByTestId("panda-properties-form-section--successful-buyer"),
    ).not.toBeVisible()

    await shotFocused(page, dialog, SHOT_DIR, "06-section-hidden-no-accepted-offer")
    story.addScene({
      title: "06 — BUYERS section hidden when no accepted offer",
      images: [join(SHOT_DIR, "06-section-hidden-no-accepted-offer.png")],
      seeing:
        "Edit Property dialog with pipeline buyers but no accepted offer. The BUYERS inline section does not appear.",
      steps: [
        "Open Edit Property dialog for a property with pipeline buyers but no accepted offer",
        "The BUYERS section is absent — section is completely hidden",
      ],
    })
  })

  test("accepted buyer is excluded from Buyers tab list", async ({ page }) => {
    // Accepted buyer should NOT appear in the buyers tab — the route excludes them via NOT EXISTS
    await setupPropertyRoutes(page, {
      buyerOffers: [ACCEPTED_OFFER],
      buyersPanelItems: [], // accepted buyer excluded from buyers panel
    })

    await page.setViewportSize({ width: 1400, height: 900 })
    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible({ timeout: 15_000 })
    await page.getByTestId(`admin-entity-row--properties--${MOCK_PROPERTY_ID}`).click()

    const dialog = page.getByTestId("admin-entity-crud-dialog--properties")
    await expect(dialog).toBeVisible()

    // BUYERS section is visible (accepted offer present)
    await expect(
      dialog.getByTestId("panda-properties-form-section--successful-buyer"),
    ).toBeVisible({ timeout: 15_000 })

    // Navigate to Buyers tab
    await dialog.getByTestId("panda-properties-form-tab-trigger--buyers").click()
    const buyersTab = dialog.getByTestId("panda-properties-form-tab--buyers")
    await expect(buyersTab).toBeVisible()

    // Accepted buyer not duplicated as a row in the buyers list below.
    // (It legitimately still appears in the Latest Buyer Offers table at the top of this
    //  tab, which lists every offer — so scope the exclusion check to the buyers list.)
    await expect(
      buyersTab.getByTestId(`property-buyer-owner-row--${ACCEPTED_OFFER.propertyEntityId}`),
    ).toHaveCount(0)
    await expect(buyersTab.getByText("No buyers added yet.")).toBeVisible()

    await shotFocused(page, dialog, SHOT_DIR, "07-accepted-buyer-not-in-tab")
    story.addScene({
      title: "07 — Accepted buyer excluded from Buyers tab list",
      images: [join(SHOT_DIR, "07-accepted-buyer-not-in-tab.png")],
      seeing:
        "Buyers tab is open. The accepted buyer appears only in the BUYERS inline section above, not duplicated in the tab list below.",
      steps: [
        "Open Edit Property with an accepted offer",
        "Click the Buyers tab",
        "Accepted buyer does not appear in the tab list",
      ],
    })
  })

  test("offers ($) button is visible in the successful buyer action row", async ({ page }) => {
    await setupPropertyRoutes(page, { buyerOffers: [ACCEPTED_OFFER] })

    await page.setViewportSize({ width: 1400, height: 900 })
    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible({ timeout: 15_000 })
    await page.getByTestId(`admin-entity-row--properties--${MOCK_PROPERTY_ID}`).click()

    const dialog = page.getByTestId("admin-entity-crud-dialog--properties")
    const section = dialog.getByTestId("panda-properties-form-section--successful-buyer")
    await expect(section).toBeVisible({ timeout: 15_000 })

    const offersBtn = dialog.getByTestId(
      `panda-properties-form-successful-buyer-offers--${ACCEPTED_OFFER.propertyEntityId}`,
    )
    await expect(offersBtn).toBeVisible({ timeout: 10_000 })

    await shotFocused(page, section, SHOT_DIR, "09-offers-button-visible")
    story.addScene({
      title: "09 — Offers ($) button visible in successful buyer row",
      images: [join(SHOT_DIR, "09-offers-button-visible.png")],
      seeing:
        "The successful buyer action row now includes the dollar-sign Offers button, matching the buyers in the list.",
      steps: [
        "Open Edit Property dialog for a property with an accepted buyer offer",
        "The successful buyer action row shows the dollar-sign Offers button",
      ],
    })
  })

  test("offers ($) button opens the buyer offers dialog titled with the buyer name", async ({ page }) => {
    await setupPropertyRoutes(page, { buyerOffers: [ACCEPTED_OFFER] })
    // Dialog's offers panel source — registered after setup so this specific route wins.
    await page.route("**/api/admin/property-entities/501/buyer-offers**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ propertyListId: 1001, contractDate: null, offers: [] }),
      })
    })

    await page.setViewportSize({ width: 1400, height: 900 })
    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible({ timeout: 15_000 })
    await page.getByTestId(`admin-entity-row--properties--${MOCK_PROPERTY_ID}`).click()

    const dialog = page.getByTestId("admin-entity-crud-dialog--properties")
    const offersBtn = dialog.getByTestId(
      `panda-properties-form-successful-buyer-offers--${ACCEPTED_OFFER.propertyEntityId}`,
    )
    await expect(offersBtn).toBeVisible({ timeout: 15_000 })
    await offersBtn.click()

    const offersDialog = page.getByTestId("property-buyer-panel-offers-dialog")
    await expect(offersDialog).toBeVisible({ timeout: 10_000 })
    await expect(offersDialog).toContainText("Test Buyer LLC")

    await shotFocused(page, offersDialog, SHOT_DIR, "10-offers-dialog-open")
    story.addScene({
      title: "10 — Offers ($) button opens the buyer's offers dialog",
      images: [join(SHOT_DIR, "10-offers-dialog-open.png")],
      seeing:
        "Clicking the dollar-sign Offers button in the successful buyer row opens the offers dialog titled with the buyer's name, the same dialog the buyers in the list use.",
      steps: [
        "Click the dollar-sign Offers button in the successful buyer action row",
        "The buyer offers dialog opens, titled with the buyer name",
      ],
    })
  })

  test("BUYERS section does not appear in add property (create) variant", async ({ page }) => {
    await page.route("**/api/admin/properties**", async (route) => {
      const url = route.request().url()
      if (url.match(/\/api\/admin\/properties(\?|$)/)) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(EMPTY_LIST_RESPONSE),
        })
        return
      }
      await route.fallback()
    })
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

    await page.setViewportSize({ width: 1400, height: 900 })
    await page.goto("/admin/properties")
    // empty list — table body is hidden; wait for the list card container instead
    await expect(page.getByTestId("admin-entity-list-card--properties")).toBeVisible({ timeout: 15_000 })

    // Open the Add property dialog
    const addBtn = page.getByTestId("admin-entity-list-add-new--properties")
    await expect(addBtn).toBeVisible()
    await addBtn.click()

    const dialog = page.getByTestId("admin-entity-crud-dialog--properties")
    await expect(dialog).toBeVisible()

    // BUYERS section must not be present in create mode
    await expect(
      dialog.getByTestId("panda-properties-form-section--successful-buyer"),
    ).not.toBeVisible()

    await shotFocused(page, dialog, SHOT_DIR, "08-create-dialog-no-buyers-section")
    story.addScene({
      title: "08 — BUYERS section absent in Add Property dialog",
      images: [join(SHOT_DIR, "08-create-dialog-no-buyers-section.png")],
      seeing:
        "Add Property (create) dialog does not show the BUYERS inline section — it is edit-only.",
      steps: [
        "Click Add new property",
        "Create dialog opens",
        "No BUYERS section appears in the form",
      ],
    })
  })
})
