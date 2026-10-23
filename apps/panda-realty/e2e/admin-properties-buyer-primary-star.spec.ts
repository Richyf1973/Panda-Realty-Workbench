/**
 * E2E: Properties — Buyer Primary Contact Star — Edit dialog + list row
 *
 * Run: npm run test:e2e:scratch -- --app=panda-realty --spec="apps/panda-realty/e2e/admin-properties-buyer-primary-star.spec.ts" --no-bail
 *
 * Covers:
 * A. Star icons on buyer phone/email fields — reflect primary state.
 * B. Clicking a star transfers primary (radio behaviour, phone and email independent).
 * C. Successful-buyer section star pre-filled when single buyer.
 * D. Property list-row buyer call + email buttons appear, using primary buyer contact.
 * E. PATCH body includes primaryPhoneBuyerPropertyEntityId after star click.
 *
 * All tests are mocked — no live DB required.
 */

import { expect, test } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { createStory, shotFocused } from "@repo/e2e-utils"

import { requirePandaE2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import {
  BASE_PROPERTY,
  makeListResponse,
  registerPropertyRoutes,
} from "./helpers/panda-properties-owners-helpers"

// ---------------------------------------------------------------------------
// Screenshot dir + story
// ---------------------------------------------------------------------------

const SHOT_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "screenshots",
  "buyer-primary-star",
)

const story = createStory({ specUrl: import.meta.url, slug: "buyer-primary-star" })

story.setWhatWasBuilt(
  "Buyer Primary Contact Star: added primaryPhoneBuyerPropertyEntityId and primaryEmailBuyerPropertyEntityId " +
    "to panda_properties. Star icons on buyer phone/email input fields let agents designate each primary " +
    "buyer independently. First buyer auto-selected when no primary set. Property list row gains buyer " +
    "call and email quick-action buttons using the primary buyer contact.",
)

test.beforeEach(async () => {
  requirePandaE2eAdminCredentials()
  await mkdir(SHOT_DIR, { recursive: true })
})

test.afterAll(() => {
  story.write()
})

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const PROP_ID = 1001
const BUYER_ONE_PE_ID = 201
const BUYER_TWO_PE_ID = 202

const PROPERTY_WITH_BUYERS = {
  ...BASE_PROPERTY,
  propertyListId: PROP_ID,
  streetAddress: "77 Buyer Star Street",
  suburb: "Starville",
  isFavorite: true,
  primaryPhoneBuyerPropertyEntityId: BUYER_ONE_PE_ID,
  primaryEmailBuyerPropertyEntityId: BUYER_ONE_PE_ID,
}

const PROPERTY_NO_PRIMARY_SET = {
  ...BASE_PROPERTY,
  propertyListId: PROP_ID,
  streetAddress: "77 Buyer Star Street",
  suburb: "Starville",
  isFavorite: true,
  primaryPhoneBuyerPropertyEntityId: null,
  primaryEmailBuyerPropertyEntityId: null,
}

const BUYER_ONE = {
  propertyEntityId: BUYER_ONE_PE_ID,
  entityId: 101,
  entityName: "Buyer One",
  phoneNumber: "0411111111",
  emailAddress: "buyer1@example.com",
  address: "1 Test St",
  esuburb: null,
  estate: null,
  epostcode: null,
  notes: null,
  buyerPipelineStatusId: null,
  pipelineStatusLabel: null,
  hasOfferFormSubmission: false,
  isPrimaryPhone: true,
  isPrimaryEmail: true,
}

const BUYER_TWO = {
  propertyEntityId: BUYER_TWO_PE_ID,
  entityId: 102,
  entityName: "Buyer Two",
  phoneNumber: "0422222222",
  emailAddress: "buyer2@example.com",
  address: "2 Test St",
  esuburb: null,
  estate: null,
  epostcode: null,
  notes: null,
  buyerPipelineStatusId: null,
  pipelineStatusLabel: null,
  hasOfferFormSubmission: false,
  isPrimaryPhone: false,
  isPrimaryEmail: false,
}

const ACCEPTED_MEMBER_ID = 901
const ACCEPTED_OFFER = {
  buyerOfferId: 501,
  propertyEntityId: BUYER_ONE_PE_ID,
  entityId: 101,
  entityName: "Accepted Buyer",
  phoneNumber: "0411111111",
  emailAddress: "accepted@example.com",
  members: [
    {
      entityMemberId: ACCEPTED_MEMBER_ID,
      memberName: "Accepted Buyer",
      memberAddress: null,
      memberPhoneNumber: "0411111111",
      memberEmailAddress: "accepted@example.com",
      isBuyersRepresentative: false,
    },
  ],
  primaryPhoneMemberId: null,
  primaryEmailMemberId: null,
  offerAmount: 800000,
  isAccepted: true,
  isCancelled: false,
  cashBuyer: false,
  totalDeposit: null,
  initialPayment: null,
  secondaryPayment: null,
  settlementDays: null,
  settlementDate: null,
  buildingAndPest: null,
}

// ---------------------------------------------------------------------------
// Setup helpers
// ---------------------------------------------------------------------------

async function setupCommonRoutes(page: import("@playwright/test").Page): Promise<void> {
  await page.route("**/api/admin/property-status**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        items: [{ propertyStatusId: 1, propertyStatusCode: "ACTIVE", propertyStatus: "Active" }],
        totalCount: 1,
        limit: 100,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
        startCursor: null,
        endCursor: null,
      }),
    })
  })
  await page.route("**/api/admin/agents**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) })
  })
  await page.route("**/api/admin/gmail/**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({}) })
  })
  await page.route("**/api/admin/calendar/status**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ connected: false }),
    })
  })
  await page.route("**/api/admin/property-types/options**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ options: [{ value: "House", label: "House" }] }),
    })
  })
}

/**
 * Opens the edit dialog for a property with an accepted offer, scrolling to the successful-buyer section.
 * Registers the accepted buyer-offers route AFTER registerPropertyRoutes so it takes priority.
 */
async function openEditDialogSuccessfulBuyer(
  page: import("@playwright/test").Page,
): Promise<import("@playwright/test").Locator> {
  await setupCommonRoutes(page)
  await registerPropertyRoutes(page, PROPERTY_WITH_BUYERS as unknown as typeof BASE_PROPERTY)
  // Register sub-routes AFTER broad catch-all to take priority (LIFO)
  await page.route(`**/api/admin/properties/*/buyer-offers**`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([ACCEPTED_OFFER]),
    })
  })

  await page.goto("/admin/properties")
  await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible({
    timeout: 20_000,
  })
  await page.getByTestId(`admin-entity-row--properties--${PROP_ID}`).click()
  await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible({
    timeout: 15_000,
  })
  const successfulBuyerSection = page.getByTestId("panda-properties-form-section--successful-buyer")
  await expect(successfulBuyerSection).toBeVisible({ timeout: 10_000 })
  await successfulBuyerSection.scrollIntoViewIfNeeded()
  return successfulBuyerSection
}

/**
 * Opens the edit dialog and scrolls to the inline Buyers section.
 * Registers buyers and buyer-offers routes AFTER registerPropertyRoutes so they take
 * priority (Playwright processes routes LIFO — last registered wins).
 */
async function openEditDialogScrollToBuyers(
  page: import("@playwright/test").Page,
  propertyDetail: typeof BASE_PROPERTY & Record<string, unknown>,
  buyers: (typeof BUYER_ONE)[] = [BUYER_ONE, BUYER_TWO],
): Promise<import("@playwright/test").Locator> {
  await setupCommonRoutes(page)
  await registerPropertyRoutes(page, propertyDetail as unknown as typeof BASE_PROPERTY)

  // Register specific sub-routes AFTER the broad catch-all so they take priority
  await page.route(`**/api/admin/properties/*/buyers**`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items: buyers }),
    })
  })
  await page.route(`**/api/admin/properties/*/buyer-offers**`, async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) })
  })

  await page.goto("/admin/properties")
  await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible({
    timeout: 20_000,
  })
  await page.getByTestId(`admin-entity-row--properties--${PROP_ID}`).click()
  await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible({
    timeout: 15_000,
  })
  await expect(page.getByTestId("panda-properties-dialog-form")).toBeVisible({ timeout: 10_000 })

  const buyersSection = page.getByTestId("panda-properties-form-tab--buyers")
  await expect(buyersSection).toBeVisible({ timeout: 10_000 })
  await buyersSection.scrollIntoViewIfNeeded()
  return buyersSection
}

// ---------------------------------------------------------------------------
// A+B. Buyers panel — star icons on phone/email fields
// ---------------------------------------------------------------------------

test.describe("Buyer primary star — edit dialog buyers panel (mocked)", () => {
  test("first buyer phone star is active when first buyer is primary phone", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await signInAsAdmin(page)
    const buyersSection = await openEditDialogScrollToBuyers(page, PROPERTY_WITH_BUYERS)

    const phoneStar1 = buyersSection.getByTestId(`panda-buyer-phone-primary-star--${BUYER_ONE_PE_ID}`)
    await expect(phoneStar1).toBeVisible({ timeout: 10_000 })
    await expect(phoneStar1).toHaveAttribute("aria-pressed", "true")

    await shotFocused(page, buyersSection, SHOT_DIR, "01-buyer1-phone-star-active")
    story.addScene({
      title: "01 — Buyer 1 phone star active when primaryPhoneBuyerPropertyEntityId is buyer 1",
      images: [join(SHOT_DIR, "01-buyer1-phone-star-active.png")],
      seeing:
        "Buyers section showing two buyer rows. Buyer One phone field has an amber star (aria-pressed=true); Buyer Two phone star is inactive.",
      steps: [
        "Open edit dialog for property with primaryPhoneBuyerPropertyEntityId = 201",
        "Scroll to Buyers section",
        "Assert buyer 1 phone star is visible with aria-pressed=true",
      ],
    })
  })

  test("first buyer email star is active when first buyer is primary email", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await signInAsAdmin(page)
    const buyersSection = await openEditDialogScrollToBuyers(page, PROPERTY_WITH_BUYERS)

    const emailStar1 = buyersSection.getByTestId(`panda-buyer-email-primary-star--${BUYER_ONE_PE_ID}`)
    await expect(emailStar1).toBeVisible({ timeout: 10_000 })
    await expect(emailStar1).toHaveAttribute("aria-pressed", "true")
  })

  test("second buyer phone star is inactive when first buyer is primary phone", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await signInAsAdmin(page)
    const buyersSection = await openEditDialogScrollToBuyers(page, PROPERTY_WITH_BUYERS)

    const phoneStar2 = buyersSection.getByTestId(`panda-buyer-phone-primary-star--${BUYER_TWO_PE_ID}`)
    await expect(phoneStar2).toBeVisible({ timeout: 10_000 })
    await expect(phoneStar2).toHaveAttribute("aria-pressed", "false")
  })

  test("clicking second buyer phone star makes it active and first buyer phone star inactive", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await signInAsAdmin(page)

    const buyersSection = await openEditDialogScrollToBuyers(page, PROPERTY_WITH_BUYERS)

    // Register AFTER openEditDialogScrollToBuyers so it takes priority (LIFO)
    let patchedBody: Record<string, unknown> | null = null
    await page.route(`**/api/admin/properties/${PROP_ID}**`, async (route) => {
      if (route.request().method() === "PATCH") {
        try { patchedBody = route.request().postDataJSON() as Record<string, unknown> } catch { /* ignore */ }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ...PROPERTY_WITH_BUYERS, primaryPhoneBuyerPropertyEntityId: BUYER_TWO_PE_ID }),
        })
        return
      }
      await route.continue()
    })

    const phoneStar1 = buyersSection.getByTestId(`panda-buyer-phone-primary-star--${BUYER_ONE_PE_ID}`)
    const phoneStar2 = buyersSection.getByTestId(`panda-buyer-phone-primary-star--${BUYER_TWO_PE_ID}`)

    await expect(phoneStar1).toBeVisible({ timeout: 10_000 })
    await shotFocused(page, buyersSection, SHOT_DIR, "02a-before-buyer1-phone-active")

    await phoneStar2.click()

    await expect(phoneStar2).toHaveAttribute("aria-pressed", "true")
    await expect(phoneStar1).toHaveAttribute("aria-pressed", "false")

    await shotFocused(page, buyersSection, SHOT_DIR, "02b-after-buyer2-phone-active")
    story.addScene({
      title: "02 — Phone primary transfers from buyer 1 to buyer 2 on star click",
      images: [
        join(SHOT_DIR, "02a-before-buyer1-phone-active.png"),
        join(SHOT_DIR, "02b-after-buyer2-phone-active.png"),
      ],
      seeing:
        "Left: Buyers section — buyer 1 phone star is active (amber). " +
        "Right: after clicking buyer 2 phone star — buyer 2 phone star is active, buyer 1 phone star is inactive.",
      steps: [
        "Open edit dialog (primaryPhoneBuyerPropertyEntityId = buyer 1)",
        "Observe buyer 1 phone star is active (screenshot 1)",
        "Click buyer 2 phone star",
        "Observe buyer 2 phone star active, buyer 1 inactive (screenshot 2)",
      ],
    })
  })

  test("phone and email primaries are independent — different buyers can hold each", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await signInAsAdmin(page)
    const buyersSection = await openEditDialogScrollToBuyers(page, PROPERTY_WITH_BUYERS)

    const phoneStar1 = buyersSection.getByTestId(`panda-buyer-phone-primary-star--${BUYER_ONE_PE_ID}`)
    const phoneStar2 = buyersSection.getByTestId(`panda-buyer-phone-primary-star--${BUYER_TWO_PE_ID}`)
    const emailStar1 = buyersSection.getByTestId(`panda-buyer-email-primary-star--${BUYER_ONE_PE_ID}`)
    const emailStar2 = buyersSection.getByTestId(`panda-buyer-email-primary-star--${BUYER_TWO_PE_ID}`)

    await expect(phoneStar1).toBeVisible({ timeout: 10_000 })
    await expect(emailStar1).toBeVisible({ timeout: 10_000 })

    // Transfer email primary to buyer 2, leave phone primary on buyer 1
    await emailStar2.click()

    await expect(phoneStar1).toHaveAttribute("aria-pressed", "true")
    await expect(phoneStar2).toHaveAttribute("aria-pressed", "false")
    await expect(emailStar2).toHaveAttribute("aria-pressed", "true")
    await expect(emailStar1).toHaveAttribute("aria-pressed", "false")

    await shotFocused(page, buyersSection, SHOT_DIR, "03-phone-email-independent")
    story.addScene({
      title: "03 — Phone and email primaries are independent of each other",
      images: [join(SHOT_DIR, "03-phone-email-independent.png")],
      seeing:
        "Buyers section — buyer 1 phone star is active AND buyer 2 email star is active simultaneously, demonstrating that phone and email primaries are tracked independently.",
      steps: [
        "Open edit dialog (both primaries on buyer 1)",
        "Click buyer 2 email star to transfer email primary",
        "Assert buyer 1 phone star = active, buyer 2 email star = active",
      ],
    })
  })

  test("clicking already-active phone star does nothing (radio behaviour)", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await signInAsAdmin(page)
    const buyersSection = await openEditDialogScrollToBuyers(page, PROPERTY_WITH_BUYERS)

    const phoneStar1 = buyersSection.getByTestId(`panda-buyer-phone-primary-star--${BUYER_ONE_PE_ID}`)
    await expect(phoneStar1).toBeVisible({ timeout: 10_000 })
    await expect(phoneStar1).toHaveAttribute("aria-pressed", "true")

    await phoneStar1.click()
    await expect(phoneStar1).toHaveAttribute("aria-pressed", "true")
  })
})

// ---------------------------------------------------------------------------
// Edge: no primary set in DB — auto-default to first buyer
// ---------------------------------------------------------------------------

test.describe("Buyer primary star — auto-default when no primary set (mocked)", () => {
  test("first buyer phone star defaults to active when no primary set in DB", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await signInAsAdmin(page)

    const buyersNoPrimary = [
      { ...BUYER_ONE, isPrimaryPhone: false, isPrimaryEmail: false },
      { ...BUYER_TWO, isPrimaryPhone: false, isPrimaryEmail: false },
    ]
    const buyersSection = await openEditDialogScrollToBuyers(page, PROPERTY_NO_PRIMARY_SET, buyersNoPrimary)

    const phoneStar1 = buyersSection.getByTestId(`panda-buyer-phone-primary-star--${BUYER_ONE_PE_ID}`)
    await expect(phoneStar1).toBeVisible({ timeout: 10_000 })
    await expect(phoneStar1).toHaveAttribute("aria-pressed", "true")

    await shotFocused(page, buyersSection, SHOT_DIR, "04-no-primary-defaults-to-first")
    story.addScene({
      title: "04 — No primary set: auto-defaults to first buyer",
      images: [join(SHOT_DIR, "04-no-primary-defaults-to-first.png")],
      seeing:
        "Buyers section with two buyers, no primary set in DB. Buyer 1 phone star is amber (active) because the UI auto-defaults to the first buyer when no primary is explicitly set.",
      steps: [
        "Open edit dialog with null primaryPhoneBuyerPropertyEntityId",
        "Assert buyer 1 phone star is active despite null DB value",
      ],
    })
  })

  test("first buyer email star defaults to active when no primary set in DB", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await signInAsAdmin(page)

    const buyersNoPrimary = [
      { ...BUYER_ONE, isPrimaryPhone: false, isPrimaryEmail: false },
      { ...BUYER_TWO, isPrimaryPhone: false, isPrimaryEmail: false },
    ]
    const buyersSection2 = await openEditDialogScrollToBuyers(page, PROPERTY_NO_PRIMARY_SET, buyersNoPrimary)

    const emailStar1 = buyersSection2.getByTestId(`panda-buyer-email-primary-star--${BUYER_ONE_PE_ID}`)
    await expect(emailStar1).toBeVisible({ timeout: 10_000 })
    await expect(emailStar1).toHaveAttribute("aria-pressed", "true")
  })
})

// ---------------------------------------------------------------------------
// C. Successful buyer section — star pre-filled
// ---------------------------------------------------------------------------

test.describe("Buyer primary star — successful buyer section (accepted offer, mocked)", () => {
  test("accepted buyer phone star is pre-filled active", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await signInAsAdmin(page)
    const successfulBuyerSection = await openEditDialogSuccessfulBuyer(page)

    const phoneStar = page.getByTestId(
      `panda-properties-form-successful-buyer-member-phone-primary--${ACCEPTED_MEMBER_ID}`,
    )
    await expect(phoneStar).toBeVisible({ timeout: 10_000 })
    await expect(phoneStar).toHaveAttribute("aria-pressed", "true")

    await shotFocused(page, successfulBuyerSection, SHOT_DIR, "05-successful-buyer-phone-star-active")
    story.addScene({
      title: "05 — Successful buyer section: phone star pre-filled active",
      images: [join(SHOT_DIR, "05-successful-buyer-phone-star-active.png")],
      seeing:
        "Successful buyer section (after offer accepted) — phone field has an amber star pre-filled, since there is only one buyer and they are the primary by default.",
      steps: [
        "Open edit dialog for property with accepted offer",
        "Scroll to Buyers section (successful-buyer variant)",
        "Assert phone star is visible with aria-pressed=true",
      ],
    })
  })

  test("accepted buyer email star is pre-filled active", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await signInAsAdmin(page)
    await openEditDialogSuccessfulBuyer(page)

    const emailStar = page.getByTestId(
      `panda-properties-form-successful-buyer-member-email-primary--${ACCEPTED_MEMBER_ID}`,
    )
    await expect(emailStar).toBeVisible({ timeout: 10_000 })
    await expect(emailStar).toHaveAttribute("aria-pressed", "true")
  })
})

// ---------------------------------------------------------------------------
// D. Property list row — buyer call + email buttons
// ---------------------------------------------------------------------------

test.describe("Buyer primary star — property list row buyer quick-action buttons (mocked)", () => {
  test("property list row shows buyer call button", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await signInAsAdmin(page)
    await setupCommonRoutes(page)

    // Mock list returning property with primary buyer data
    await page.route("**/api/admin/properties**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          makeListResponse({
            ...PROPERTY_WITH_BUYERS,
            primaryBuyerPhone: "0411111111",
            primaryBuyerEmail: "buyer1@example.com",
            primaryBuyerName: "Buyer One",
          } as unknown as typeof BASE_PROPERTY),
        ),
      })
    })

    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible({
      timeout: 20_000,
    })

    const row = page.getByTestId(`admin-entity-row--properties--${PROP_ID}`)
    await expect(row).toBeVisible({ timeout: 10_000 })
    await row.hover()

    const buyerCallBtn = page.getByTestId(`panda-property-list-row-buyer-call--${PROP_ID}`).first()
    await expect(buyerCallBtn).toBeVisible({ timeout: 10_000 })

    await shotFocused(page, row, SHOT_DIR, "06-list-row-buyer-call-button")
    story.addScene({
      title: "06 — Property list row: buyer call button visible on hover",
      images: [join(SHOT_DIR, "06-list-row-buyer-call-button.png")],
      seeing:
        "Property list row on hover — a buyer call button appears alongside the existing owner call/email buttons. Uses the primary buyer phone number.",
      steps: [
        "Navigate to properties list",
        "Hover the property row",
        "Assert buyer call button is visible",
      ],
    })
  })

  test("property list row shows buyer email button", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await signInAsAdmin(page)
    await setupCommonRoutes(page)

    await page.route("**/api/admin/properties**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          makeListResponse({
            ...PROPERTY_WITH_BUYERS,
            primaryBuyerPhone: "0411111111",
            primaryBuyerEmail: "buyer1@example.com",
            primaryBuyerName: "Buyer One",
          } as unknown as typeof BASE_PROPERTY),
        ),
      })
    })

    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible({
      timeout: 20_000,
    })

    const row = page.getByTestId(`admin-entity-row--properties--${PROP_ID}`)
    await row.hover()

    const buyerEmailBtn = page.getByTestId(`panda-property-list-row-buyer-email--${PROP_ID}`).first()
    await expect(buyerEmailBtn).toBeVisible({ timeout: 10_000 })
  })
})

// ---------------------------------------------------------------------------
// E. Persistence — PATCH body includes primaryPhoneBuyerPropertyEntityId
// ---------------------------------------------------------------------------

test.describe("Buyer primary star — PATCH body includes primary buyer IDs (mocked)", () => {
  test("PATCH body includes primaryPhoneBuyerPropertyEntityId after clicking buyer 2 phone star and saving", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await signInAsAdmin(page)

    const buyersSection = await openEditDialogScrollToBuyers(page, PROPERTY_WITH_BUYERS)

    // Register AFTER openEditDialogScrollToBuyers so it takes priority (LIFO)
    let capturedPatchBody: Record<string, unknown> | null = null
    await page.route(`**/api/admin/properties/${PROP_ID}**`, async (route) => {
      if (route.request().method() === "PATCH") {
        try {
          capturedPatchBody = route.request().postDataJSON() as Record<string, unknown>
        } catch { /* ignore */ }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ...PROPERTY_WITH_BUYERS,
            primaryPhoneBuyerPropertyEntityId: BUYER_TWO_PE_ID,
          }),
        })
        return
      }
      await route.continue()
    })

    const phoneStar2 = buyersSection.getByTestId(`panda-buyer-phone-primary-star--${BUYER_TWO_PE_ID}`)
    await expect(phoneStar2).toBeVisible({ timeout: 10_000 })

    // Star click immediately PATCHes the property (no form save needed)
    const patchPromise = page.waitForRequest(
      (req) => req.url().includes(`/api/admin/properties/${PROP_ID}`) && req.method() === "PATCH",
      { timeout: 5_000 },
    )
    await phoneStar2.click()
    await patchPromise

    await expect(phoneStar2).toHaveAttribute("aria-pressed", "true")

    expect(capturedPatchBody).not.toBeNull()
    expect(capturedPatchBody!["primaryPhoneBuyerPropertyEntityId"]).toBe(String(BUYER_TWO_PE_ID))
  })
})
