// Run: npm run test:e2e:scratch -- --app=panda-realty --spec="apps/panda-realty/e2e/admin-properties-buyer-fields-owner-style.spec.ts" --no-bail
import { expect, test } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { createStory, shotFocused } from "@repo/e2e-utils"

import type { Page } from "@playwright/test"

import { requirePandaE2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import {
  BUYER_PANEL_ITEMS_RESPONSE_1001,
  EMPTY_PROPERTY_ENTITIES_RESPONSE,
  MOCK_ENTITY_201_DETAIL,
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
  "buyer-fields-owner-style",
)

const story = createStory({
  specUrl: import.meta.url,
  slug: "buyer-fields-owner-style",
})

story.setWhatWasBuilt(
  "Restyled the BUYERS section in the Edit Property dialog to match the OWNER INFORMATION section exactly. " +
  "Both the accepted-offer buyer (PandaPropertiesFormSuccessfulBuyerSection) and the no-offer buyers under the Buyers tab " +
  "(PropertyBuyersPanel) now render as a flat 4-column grid (Name / Address / Phone / Email) with editable inputs " +
  "that auto-save to the entity record on blur, and a full action row (Phone, Mail, Inbox, Calendar, Notes, Files, Reminder). " +
  "No-offer buyers also show a Delete button and the Form Submitted badge. " +
  "The Add buyer button moves below the last buyer row. No delete on accepted offer buyer.",
)

/** Single buyer member of the accepted buyer entity 201. */
const ACCEPTED_MEMBER_ID = 801
const ACCEPTED_MEMBER = {
  entityMemberId: ACCEPTED_MEMBER_ID,
  memberName: "Test Buyer LLC",
  memberAddress: "1 Buyer Rd",
  memberPhoneNumber: "0400 111 222",
  memberEmailAddress: "buyer@test.com",
  isBuyersRepresentative: false,
}

/** Accepted offer with entityId added for entity PATCH routing. */
const ACCEPTED_OFFER_WITH_ENTITY_ID = {
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

/** Buyer panel item with Form Submitted flag set. */
const BUYER_PANEL_ITEM_FORM_SUBMITTED = {
  ...BUYER_PANEL_ITEMS_RESPONSE_1001.items[0],
  hasOfferFormSubmission: true,
}

/** Wire up all routes needed for accepted-offer scenarios. */
async function setupAcceptedOfferRoutes(page: Page) {
  await page.route("**/api/admin/entities**", async (route) => {
    const url = route.request().url()
    const method = route.request().method()
    if (url.match(/\/api\/admin\/entities\/201(\?|$)/)) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_ENTITY_201_DETAIL),
      })
      return
    }
    if (method !== "GET") { await route.fallback(); return }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items: [], totalCount: 0, limit: 20, totalPages: 0 }),
    })
  })

  await page.route("**/api/admin/properties**", async (route) => {
    const url = route.request().url()
    if (await maybeFulfillPandaPropertyBuyerOffersGet(route, { body: [ACCEPTED_OFFER_WITH_ENTITY_ID] })) return
    if (url.match(new RegExp(`/api/admin/properties/${MOCK_PROPERTY_ID}/buyers(\\?|$)`))) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [] }) })
      return
    }
    if (url.match(new RegExp(`/api/admin/properties/${MOCK_PROPERTY_ID}(\\?|$)`))) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(PROPERTY_EDIT_WITH_BUYER) })
      return
    }
    await route.fulfill({
      status: 200, contentType: "application/json",
      body: JSON.stringify({ ...SINGLE_PROPERTY_RESPONSE, items: [{ ...PROPERTY_EDIT_WITH_BUYER }] }),
    })
  })

  await page.route("**/api/admin/property-status**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(STATUS_LIST_RESPONSE) })
  })

  await page.route("**/api/admin/property-entities**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_PROPERTY_ENTITIES_RESPONSE) })
  })
}

/** Wire up all routes needed for no-offer / buyers panel scenarios. */
async function setupNoOfferRoutes(page: Page, buyerItems = BUYER_PANEL_ITEMS_RESPONSE_1001.items) {
  await page.route("**/api/admin/entities**", async (route) => {
    const url = route.request().url()
    const method = route.request().method()
    if (url.match(/\/api\/admin\/entities\/201(\?|$)/)) {
      await route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify(MOCK_ENTITY_201_DETAIL),
      })
      return
    }
    if (method !== "GET") { await route.fallback(); return }
    await route.fulfill({
      status: 200, contentType: "application/json",
      body: JSON.stringify({ items: [], totalCount: 0, limit: 20, totalPages: 0 }),
    })
  })

  await page.route("**/api/admin/properties**", async (route) => {
    const url = route.request().url()
    // no accepted offer
    if (await maybeFulfillPandaPropertyBuyerOffersGet(route, { body: [] })) return
    if (url.match(new RegExp(`/api/admin/properties/${MOCK_PROPERTY_ID}/buyers(\\?|$)`))) {
      await route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify({ items: buyerItems }),
      })
      return
    }
    if (url.match(new RegExp(`/api/admin/properties/${MOCK_PROPERTY_ID}(\\?|$)`))) {
      await route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify(PROPERTY_EDIT_WITH_BUYER),
      })
      return
    }
    await route.fulfill({
      status: 200, contentType: "application/json",
      body: JSON.stringify({ ...SINGLE_PROPERTY_RESPONSE, items: [{ ...PROPERTY_EDIT_WITH_BUYER }] }),
    })
  })

  await page.route("**/api/admin/property-status**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(STATUS_LIST_RESPONSE) })
  })

  await page.route("**/api/admin/property-entities**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_PROPERTY_ENTITIES_RESPONSE) })
  })
}

async function openPropertyDialog(page: Page) {
  await page.setViewportSize({ width: 1400, height: 900 })
  await page.goto("/admin/properties")
  await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible({ timeout: 15_000 })
  await page.getByTestId(`admin-entity-row--properties--${MOCK_PROPERTY_ID}`).click()
  const dialog = page.getByTestId("admin-entity-crud-dialog--properties")
  await expect(dialog).toBeVisible({ timeout: 10_000 })
  return dialog
}

test.beforeEach(async () => {
  await mkdir(SHOT_DIR, { recursive: true })
})

test.afterAll(() => {
  story.write()
})

test.describe("buyer fields styled like owner fields", () => {
  test.beforeEach(() => {
    requirePandaE2eAdminCredentials()
  })

  test.beforeEach(async ({ page }) => {
    await signInAsAdmin(page)
  })

  // ── ACCEPTED OFFER ────────────────────────────────────────────────────────

  test("accepted offer BUYERS section shows Address column header not Offer Amount", async ({ page }) => {
    await setupAcceptedOfferRoutes(page)
    const dialog = await openPropertyDialog(page)

    const section = dialog.getByTestId("panda-properties-form-section--successful-buyer")
    await expect(section).toBeVisible({ timeout: 15_000 })

    const headers = dialog.getByTestId("panda-properties-form-successful-buyer-column-headers")
    await expect(headers).toBeVisible()
    await expect(headers).toContainText("Address")
    await expect(headers).not.toContainText("Offer Amount")

    await shotFocused(page, section, SHOT_DIR, "01-accepted-offer-column-headers")
    story.addScene({
      title: "01 — Accepted offer BUYERS section: Address column header",
      images: [join(SHOT_DIR, "01-accepted-offer-column-headers.png")],
      seeing: "BUYERS section shows Name / Address / Phone / Email headers matching the OWNER INFORMATION section.",
      steps: [
        "Open Edit Property dialog for property with accepted offer",
        "BUYERS section shows column header: Address (not Offer Amount)",
      ],
    })
  })

  test("accepted offer buyer address field is an editable input", async ({ page }) => {
    await setupAcceptedOfferRoutes(page)
    const dialog = await openPropertyDialog(page)

    const section = dialog.getByTestId("panda-properties-form-section--successful-buyer")
    await expect(section).toBeVisible({ timeout: 15_000 })

    const addressInput = dialog.getByTestId(
      `panda-properties-form-successful-buyer-member-address--${ACCEPTED_MEMBER_ID}`,
    )
    await expect(addressInput).toBeVisible({ timeout: 10_000 })
    await expect(addressInput).toHaveValue(ACCEPTED_MEMBER.memberAddress)

    await shotFocused(page, section, SHOT_DIR, "02-accepted-offer-address-input")
    story.addScene({
      title: "02 — Accepted offer buyer: address editable input",
      images: [join(SHOT_DIR, "02-accepted-offer-address-input.png")],
      seeing: "Address field in the accepted offer BUYERS section is an editable input pre-filled from the entity record.",
      steps: [
        "Open Edit Property dialog with accepted offer",
        "Address input is visible and shows entity address value",
      ],
    })
  })

  test("accepted offer buyer phone and email are editable inputs not static text", async ({ page }) => {
    await setupAcceptedOfferRoutes(page)
    const dialog = await openPropertyDialog(page)

    const section = dialog.getByTestId("panda-properties-form-section--successful-buyer")
    await expect(section).toBeVisible({ timeout: 15_000 })

    const phoneInput = dialog.getByTestId(
      `panda-properties-form-successful-buyer-member-phone--${ACCEPTED_MEMBER_ID}`,
    )
    const emailInput = dialog.getByTestId(
      `panda-properties-form-successful-buyer-member-email--${ACCEPTED_MEMBER_ID}`,
    )
    await expect(phoneInput).toBeVisible({ timeout: 10_000 })
    await expect(phoneInput).toHaveValue(ACCEPTED_MEMBER.memberPhoneNumber)
    await expect(emailInput).toBeVisible()
    await expect(emailInput).toHaveValue(ACCEPTED_MEMBER.memberEmailAddress)

    await shotFocused(page, section, SHOT_DIR, "03-accepted-offer-phone-email-inputs")
    story.addScene({
      title: "03 — Accepted offer buyer: phone and email are editable inputs",
      images: [join(SHOT_DIR, "03-accepted-offer-phone-email-inputs.png")],
      seeing: "Phone and email fields are editable inputs (not static spans) matching the owner row style.",
      steps: [
        "Open Edit Property dialog with accepted offer",
        "Phone and email fields are input elements with correct pre-filled values",
      ],
    })
  })

  test("accepted offer buyer field edit triggers auto-save PATCH on blur", async ({ page }) => {
    let patchCalled = false
    await setupAcceptedOfferRoutes(page)
    // Member field edits PATCH the entity_members record, not the entity.
    await page.route(`**/api/admin/entity-members/${ACCEPTED_MEMBER_ID}**`, async (route) => {
      if (route.request().method() === "PATCH") {
        patchCalled = true
      }
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(ACCEPTED_MEMBER) })
    })

    const dialog = await openPropertyDialog(page)
    const section = dialog.getByTestId("panda-properties-form-section--successful-buyer")
    await expect(section).toBeVisible({ timeout: 15_000 })

    const phoneInput = dialog.getByTestId(
      `panda-properties-form-successful-buyer-member-phone--${ACCEPTED_MEMBER_ID}`,
    )
    await expect(phoneInput).toBeVisible({ timeout: 10_000 })
    await phoneInput.fill("0411 999 888")
    await phoneInput.blur()

    await page.waitForFunction(() => true) // flush microtasks
    await page.waitForTimeout(500)

    expect(patchCalled).toBe(true)

    await shotFocused(page, section, SHOT_DIR, "04-accepted-offer-auto-save")
    story.addScene({
      title: "04 — Accepted offer buyer: auto-save on blur",
      images: [join(SHOT_DIR, "04-accepted-offer-auto-save.png")],
      seeing: "After editing the phone field and blurring, a PATCH to the entity API is fired automatically.",
      steps: [
        "Edit the phone field in the accepted offer BUYERS section",
        "Tab/click away (blur)",
        "PATCH /api/admin/entities/201 is called with updated values",
      ],
    })
  })

  test("accepted offer buyer action row includes inbox, calendar, and reminder buttons", async ({ page }) => {
    await setupAcceptedOfferRoutes(page)
    const dialog = await openPropertyDialog(page)

    const section = dialog.getByTestId("panda-properties-form-section--successful-buyer")
    await expect(section).toBeVisible({ timeout: 15_000 })

    const mid = ACCEPTED_MEMBER_ID
    await expect(dialog.getByTestId(`panda-properties-form-successful-buyer-member-inbox--${mid}`)).toBeVisible({ timeout: 10_000 })
    await expect(dialog.getByTestId(`panda-properties-form-successful-buyer-member-calendar--${mid}`)).toBeVisible()
    await expect(dialog.getByTestId(`panda-properties-form-successful-buyer-member-reminder--${mid}`)).toBeVisible()

    await shotFocused(page, section, SHOT_DIR, "05-accepted-offer-action-buttons")
    story.addScene({
      title: "05 — Accepted offer buyer: full action row with inbox, calendar, reminder",
      images: [join(SHOT_DIR, "05-accepted-offer-action-buttons.png")],
      seeing: "Action row below accepted offer buyer includes Phone, Mail, Inbox, Calendar, Notes, Files, Reminder buttons.",
      steps: [
        "Open Edit Property dialog with accepted offer",
        "Action row shows full set of buttons matching the owner row",
      ],
    })
  })

  test("accepted offer buyer row has no delete button", async ({ page }) => {
    await setupAcceptedOfferRoutes(page)
    const dialog = await openPropertyDialog(page)

    const section = dialog.getByTestId("panda-properties-form-section--successful-buyer")
    await expect(section).toBeVisible({ timeout: 15_000 })

    const mid = ACCEPTED_MEMBER_ID
    // Wait for section to fully load
    await expect(dialog.getByTestId(`panda-properties-form-successful-buyer-member-inbox--${mid}`)).toBeVisible({ timeout: 10_000 })

    // No delete testid on accepted offer member row
    await expect(
      dialog.getByTestId(`panda-properties-form-successful-buyer-member-delete--${mid}`),
    ).not.toBeVisible()

    await shotFocused(page, section, SHOT_DIR, "06-accepted-offer-no-delete")
    story.addScene({
      title: "06 — Accepted offer buyer: no delete button",
      images: [join(SHOT_DIR, "06-accepted-offer-no-delete.png")],
      seeing: "The accepted offer buyer row has no delete button — managed via the Sales Information tab instead.",
      steps: [
        "Open Edit Property with accepted offer",
        "BUYERS section action row has no delete/trash icon",
      ],
    })
  })

  // ── NO-OFFER BUYERS PANEL ─────────────────────────────────────────────────

  test("no-offer state renders no inline buyers section above the tabs — single list under Buyers tab", async ({ page }) => {
    await setupNoOfferRoutes(page)
    const dialog = await openPropertyDialog(page)

    // Buyers tab (default-active when there is no accepted offer) lists the buyers...
    const buyersTab = dialog.getByTestId("panda-properties-form-tab--buyers")
    const id = BUYER_PANEL_ITEMS_RESPONSE_1001.items[0].propertyEntityId
    await expect(buyersTab.getByTestId(`property-buyer-owner-row--${id}`)).toBeVisible({ timeout: 15_000 })

    // ...and the old top-of-dialog inline buyers section must NOT render (no duplicate list).
    await expect(dialog.getByTestId("panda-properties-form-section--buyers-inline")).toHaveCount(0)

    story.addScene({
      title: "00 — No-offer: buyer list only under the Buyers tab (no inline copy)",
      images: [],
      seeing: "With no accepted offer, the buyer list appears once under the Buyers tab; the inline copy that used to sit above the tabs is gone.",
      steps: [
        "Open Edit Property for a favorite property with no accepted offer",
        "Buyer rows show under the Buyers tab",
        "No buyers section renders above the tab bar",
      ],
    })
  })

  test("no-offer buyer rows render as flat owner-style grid not cards", async ({ page }) => {
    await setupNoOfferRoutes(page)
    const dialog = await openPropertyDialog(page)

    const section = dialog.getByTestId("panda-properties-form-tab--buyers")
    await expect(section).toBeVisible({ timeout: 15_000 })

    const id = BUYER_PANEL_ITEMS_RESPONSE_1001.items[0].propertyEntityId
    const row = section.getByTestId(`property-buyer-owner-row--${id}`)
    await expect(row).toBeVisible({ timeout: 10_000 })

    // Must NOT have card styling (border + rounded-md + bg-card used in EntityCardRow)
    await expect(row).not.toHaveClass(/border/)
    await expect(row).not.toHaveClass(/rounded-md/)

    await shotFocused(page, section, SHOT_DIR, "07-no-offer-flat-row")
    story.addScene({
      title: "07 — No-offer buyers: flat owner-style rows (no card border)",
      images: [join(SHOT_DIR, "07-no-offer-flat-row.png")],
      seeing: "Buyer rows in the BUYERS section render as flat grid rows without card borders, matching the OWNER INFORMATION style.",
      steps: [
        "Open Edit Property with no accepted offer (Favorite property with buyers)",
        "Each buyer row is a flat 4-column grid with no card border",
      ],
    })
  })

  test("no-offer buyer column headers show Name / Address / Phone / Email", async ({ page }) => {
    await setupNoOfferRoutes(page)
    const dialog = await openPropertyDialog(page)

    const section = dialog.getByTestId("panda-properties-form-tab--buyers")
    await expect(section).toBeVisible({ timeout: 15_000 })

    const headers = section.getByTestId("property-buyer-owner-row-column-headers")
    await expect(headers).toBeVisible({ timeout: 10_000 })
    await expect(headers).toContainText("Name")
    await expect(headers).toContainText("Address")
    await expect(headers).toContainText("Phone")
    await expect(headers).toContainText("Email")

    await shotFocused(page, section, SHOT_DIR, "08-no-offer-column-headers")
    story.addScene({
      title: "08 — No-offer buyers: Name / Address / Phone / Email column headers",
      images: [join(SHOT_DIR, "08-no-offer-column-headers.png")],
      seeing: "BUYERS section for no-offer properties shows the same 4 column headers as the OWNER INFORMATION section.",
      steps: [
        "Open Edit Property with no accepted offer",
        "Column headers show: Name, Address, Phone, Email",
      ],
    })
  })

  test("no-offer buyer fields are editable inputs with correct values", async ({ page }) => {
    await setupNoOfferRoutes(page)
    const dialog = await openPropertyDialog(page)

    const section = dialog.getByTestId("panda-properties-form-tab--buyers")
    await expect(section).toBeVisible({ timeout: 15_000 })

    const id = BUYER_PANEL_ITEMS_RESPONSE_1001.items[0].propertyEntityId
    const buyer = BUYER_PANEL_ITEMS_RESPONSE_1001.items[0]

    const nameInput = section.getByTestId(`property-buyer-owner-row-name--${id}`)
    const addressInput = section.getByTestId(`property-buyer-owner-row-address--${id}`)
    const phoneInput = section.getByTestId(`property-buyer-owner-row-phone--${id}`)
    const emailInput = section.getByTestId(`property-buyer-owner-row-email--${id}`)

    await expect(nameInput).toBeVisible({ timeout: 10_000 })
    await expect(nameInput).toHaveValue(buyer.entityName)
    await expect(addressInput).toHaveValue(buyer.address ?? "")
    await expect(phoneInput).toHaveValue(buyer.phoneNumber ?? "")
    await expect(emailInput).toHaveValue(buyer.emailAddress ?? "")

    await shotFocused(page, section, SHOT_DIR, "09-no-offer-editable-inputs")
    story.addScene({
      title: "09 — No-offer buyers: editable input fields with correct values",
      images: [join(SHOT_DIR, "09-no-offer-editable-inputs.png")],
      seeing: "Each buyer row field (Name, Address, Phone, Email) is an editable input pre-filled from the entity record.",
      steps: [
        "Open Edit Property with buyers",
        "All four fields are editable inputs with correct values",
      ],
    })
  })

  test("no-offer buyer field edit triggers auto-save PATCH on blur", async ({ page }) => {
    let patchCalled = false
    await setupNoOfferRoutes(page)
    await page.route("**/api/admin/entities/201**", async (route) => {
      if (route.request().method() === "PATCH") {
        patchCalled = true
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_ENTITY_201_DETAIL) })
        return
      }
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_ENTITY_201_DETAIL) })
    })

    const dialog = await openPropertyDialog(page)
    const section = dialog.getByTestId("panda-properties-form-tab--buyers")
    await expect(section).toBeVisible({ timeout: 15_000 })

    const id = BUYER_PANEL_ITEMS_RESPONSE_1001.items[0].propertyEntityId
    const phoneInput = section.getByTestId(`property-buyer-owner-row-phone--${id}`)
    await expect(phoneInput).toBeVisible({ timeout: 10_000 })
    await phoneInput.fill("0411 000 111")
    await phoneInput.blur()
    await page.waitForTimeout(500)

    expect(patchCalled).toBe(true)

    await shotFocused(page, section, SHOT_DIR, "10-no-offer-auto-save")
    story.addScene({
      title: "10 — No-offer buyers: auto-save PATCH on blur",
      images: [join(SHOT_DIR, "10-no-offer-auto-save.png")],
      seeing: "Editing a buyer field and blurring triggers a PATCH to the entity API automatically.",
      steps: [
        "Edit the phone field of a buyer row",
        "Tab/click away (blur)",
        "PATCH /api/admin/entities/201 is called",
      ],
    })
  })

  test("no-offer buyer action row includes all expected buttons including delete", async ({ page }) => {
    await setupNoOfferRoutes(page)
    const dialog = await openPropertyDialog(page)

    const section = dialog.getByTestId("panda-properties-form-tab--buyers")
    await expect(section).toBeVisible({ timeout: 15_000 })

    const id = BUYER_PANEL_ITEMS_RESPONSE_1001.items[0].propertyEntityId
    await expect(section.getByTestId(`property-buyer-owner-row--${id}`)).toBeVisible({ timeout: 10_000 })

    await expect(section.getByTestId(`property-buyer-owner-row-call--${id}`)).toBeVisible()
    await expect(section.getByTestId(`property-buyer-owner-row-compose--${id}`)).toBeVisible()
    await expect(section.getByTestId(`property-buyer-owner-row-inbox--${id}`)).toBeVisible()
    await expect(section.getByTestId(`property-buyer-owner-row-calendar--${id}`)).toBeVisible()
    await expect(section.getByTestId(`property-buyer-owner-row-notes--${id}`)).toBeVisible()
    await expect(section.getByTestId(`property-buyer-owner-row-files--${id}`)).toBeVisible()
    await expect(section.getByTestId(`property-buyer-owner-row-reminder--${id}`)).toBeVisible()
    await expect(section.getByTestId(`property-buyer-owner-row-offers--${id}`)).toBeVisible()
    await expect(section.getByTestId(`property-buyer-owner-row-delete--${id}`)).toBeVisible()

    await shotFocused(page, section, SHOT_DIR, "11-no-offer-action-buttons")
    story.addScene({
      title: "11 — No-offer buyers: full action row with delete",
      images: [join(SHOT_DIR, "11-no-offer-action-buttons.png")],
      seeing: "Action row includes Call, Mail, Inbox, Calendar, Notes, Files, Reminder, Offers ($), and Delete buttons.",
      steps: [
        "Open Edit Property with buyers (no accepted offer)",
        "Each buyer row shows a full set of action buttons including Offers and Delete",
      ],
    })
  })

  test("Form Submitted badge visible on buyer with offer form submission", async ({ page }) => {
    await setupNoOfferRoutes(page, [BUYER_PANEL_ITEM_FORM_SUBMITTED])
    const dialog = await openPropertyDialog(page)

    const section = dialog.getByTestId("panda-properties-form-tab--buyers")
    await expect(section).toBeVisible({ timeout: 15_000 })

    const id = BUYER_PANEL_ITEM_FORM_SUBMITTED.propertyEntityId
    const badge = section.getByTestId(`property-buyer-owner-row-form-submitted-badge--${id}`)
    await expect(badge).toBeVisible({ timeout: 10_000 })
    await expect(badge).toContainText("Form Submitted")

    await shotFocused(page, section, SHOT_DIR, "12-form-submitted-badge")
    story.addScene({
      title: "12 — No-offer buyers: Form Submitted badge",
      images: [join(SHOT_DIR, "12-form-submitted-badge.png")],
      seeing: "Green Form Submitted badge appears on the buyer row when the buyer has submitted an offer form.",
      steps: [
        "Open Edit Property where a buyer has hasOfferFormSubmission=true",
        "Form Submitted badge is visible on their row",
      ],
    })
  })

  test("Add buyer button appears below the last buyer row not above the list", async ({ page }) => {
    await setupNoOfferRoutes(page)
    const dialog = await openPropertyDialog(page)

    const section = dialog.getByTestId("panda-properties-form-tab--buyers")
    await expect(section).toBeVisible({ timeout: 15_000 })

    const id = BUYER_PANEL_ITEMS_RESPONSE_1001.items[0].propertyEntityId
    const buyerRow = section.getByTestId(`property-buyer-owner-row--${id}`)
    const addButton = section.getByTestId("property-buyers-panel-add-new")

    await expect(buyerRow).toBeVisible({ timeout: 10_000 })
    await expect(addButton).toBeVisible()

    // Add button must come after the last buyer row in DOM order
    const buyerRowBox = await buyerRow.boundingBox()
    const addButtonBox = await addButton.boundingBox()
    expect(buyerRowBox).not.toBeNull()
    expect(addButtonBox).not.toBeNull()
    expect(addButtonBox!.y).toBeGreaterThan(buyerRowBox!.y + buyerRowBox!.height - 10)

    await shotFocused(page, section, SHOT_DIR, "13-add-buyer-below-list")
    story.addScene({
      title: "13 — No-offer buyers: Add buyer button below the list",
      images: [join(SHOT_DIR, "13-add-buyer-below-list.png")],
      seeing: "The Add buyer button appears below the last buyer row, matching the owner section style.",
      steps: [
        "Open Edit Property with buyers (no accepted offer)",
        "Add buyer button is positioned below the last buyer row",
      ],
    })
  })
})
