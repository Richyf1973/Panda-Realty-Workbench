/**
 * E2E: Properties quick card — owner phone/email fallback across all owners
 *
 * Tests that the Phone, Email, and Inbox buttons in the property quick-card
 * bottom actions bar resolve from the first non-null value across owner1 →
 * owner2 → owner3, rather than only owner1.
 *
 * Success factors (all mocked, no live DB needed):
 * 1. Phone button enabled when owner1 has no phone but owner2 does — uses owner2 phone.
 * 2. Email button enabled when owner1 has no email but owner2 does — uses owner2 email.
 * 3. Inbox button enabled when owner1 has no email but owner2 does.
 * 4. Gmail compose dialog: email = owner2 email, body starts with "Dear <owner2 name>,".
 * 5. Phone button enabled via owner3 when owner1 + owner2 both have no phone.
 * 6. Email button enabled via owner3 when owner1 + owner2 both have no email.
 * 7. Regression: owner1 with full data — buttons still enabled, owner1 data used.
 * 8. Split-owner case: owner1 has phone (no email), owner2 has email — phone uses owner1, email/inbox use owner2, compose name = owner2.
 * 9. Phone button disabled with "No phone number" when no owner has a phone.
 * 10. Email + Inbox buttons disabled with "No email address" when no owner has an email.
 */

import { expect, test } from "@playwright/test"

import { e2eAdminCredentials, refreshPandaE2eEnv, signInAsAdmin } from "./helpers/admin-auth"
import { gotoPropertiesQuickCards } from "./helpers/panda-properties-quick-cards-nav"

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const BASE_ITEM = {
  streetAddress: "10 FALLBACK TEST ROAD",
  suburb: "TESTVILLE",
  state: "QLD",
  postcode: "4000",
  propertyType: "House",
  bed: 3,
  bath: 2,
  car: 1,
  salePrice: 500000,
  saleDate: null,
  propertyStatusId: null,
  buyerName: null,
  buyerId: null,
  isFavorite: false,
  priceUndisclosed: false,
  excludeFromReport: false,
  updatedAt: "2026-01-01T00:00:00Z",
  owner1name: null,
  owner1phone: null,
  owner1email: null,
  owner2name: null,
  owner2phone: null,
  owner2email: null,
  owner3name: null,
  owner3phone: null,
  owner3email: null,
  primaryPhoneOwnerNum: null,
  primaryEmailOwnerNum: null,
  combinedOwner: null,
  contractPrice: null,
  successfulBuyer: null,
  successfulBuyerPropertyEntityId: null,
  successfulBuyerEntityId: null,
  successfulBuyerPhoneNumber: null,
  successfulBuyerEmailAddress: null,
}

/** owner1 has no contact info; owner2 has both phone and email. */
const PROP_OWNER2_FULL = {
  ...BASE_ITEM,
  propertyListId: 5001,
  combinedOwner: "No Contact Person / Owner Two Person",
  owner1name: "No Contact Person",
  owner1phone: null,
  owner1email: null,
  owner2name: "Owner Two Person",
  owner2phone: "0411111111",
  owner2email: "owner2@example.com",
}

/** owner1 and owner2 have no contact info; owner3 has both. */
const PROP_OWNER3_FULL = {
  ...BASE_ITEM,
  propertyListId: 5002,
  combinedOwner: "Nobody One / Nobody Two / Owner Three Person",
  owner1name: "Nobody One",
  owner1phone: null,
  owner1email: null,
  owner2name: "Nobody Two",
  owner2phone: null,
  owner2email: null,
  owner3name: "Owner Three Person",
  owner3phone: "0422222222",
  owner3email: "owner3@example.com",
}

/** owner1 has phone but NO email; owner2 has email but NO phone. */
const PROP_SPLIT_OWNERS = {
  ...BASE_ITEM,
  propertyListId: 5003,
  combinedOwner: "Phone Only Person / Email Only Person",
  owner1name: "Phone Only Person",
  owner1phone: "0433333333",
  owner1email: null,
  owner2name: "Email Only Person",
  owner2phone: null,
  owner2email: "emailonly@example.com",
}

/** owner1 has full contact info — regression baseline. */
const PROP_OWNER1_FULL = {
  ...BASE_ITEM,
  propertyListId: 5004,
  combinedOwner: "Full Contact One",
  owner1name: "Full Contact One",
  owner1phone: "0444444444",
  owner1email: "owner1full@example.com",
}

/** No owner has any contact info. */
const PROP_NO_CONTACT = {
  ...BASE_ITEM,
  propertyListId: 5005,
  combinedOwner: "No Contact A / No Contact B",
  owner1name: "No Contact A",
  owner1phone: null,
  owner1email: null,
  owner2name: "No Contact B",
  owner2phone: null,
  owner2email: null,
}

function makeQuickListResponse(item: Record<string, unknown>) {
  return {
    items: [item],
    totalCount: 1,
    limit: 25,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
    startCursor: null,
    endCursor: null,
  }
}

// ---------------------------------------------------------------------------
// Setup helpers
// ---------------------------------------------------------------------------

function requireAuth(): void {
  refreshPandaE2eEnv()
  if (!e2eAdminCredentials) {
    throw new Error("Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD (see apps/panda-realty/.env.example).")
  }
}

async function gotoQuickCards(
  page: import("@playwright/test").Page,
  listResponse: object,
): Promise<void> {
  await page.route("**/api/admin/gmail/**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({}) })
  })
  await page.route("**/api/admin/agents**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) })
  })
  await gotoPropertiesQuickCards(page, listResponse, "Fallback Test Road~QLD")
}

// ---------------------------------------------------------------------------
// Tests — owner2 fallback
// ---------------------------------------------------------------------------

test.describe("Properties quick card — phone/email falls back to owner2 (mocked)", () => {
  test.beforeEach(async ({ page }) => {
    requireAuth()
    await page.setViewportSize({ width: 1280, height: 800 })
    await signInAsAdmin(page)
    await gotoQuickCards(page, makeQuickListResponse(PROP_OWNER2_FULL))
  })

  test("Phone button is enabled when owner1 has no phone but owner2 does", async ({ page }) => {
    const callBtn = page.getByTestId("property-list-call-button--5001").first()
    await expect(callBtn).toBeEnabled()
  })

  test("Phone button is a tel: link using owner2's phone number", async ({ page }) => {
    const callBtn = page.getByTestId("property-list-call-button--5001").first()
    await expect(callBtn).toHaveAttribute("href", `tel:${PROP_OWNER2_FULL.owner2phone}`)
  })

  test("Email button is enabled when owner1 has no email but owner2 does", async ({ page }) => {
    const emailBtn = page.getByTestId("property-list-email-button--5001").first()
    await expect(emailBtn).toBeEnabled()
  })

  test("Inbox button is enabled when owner1 has no email but owner2 does", async ({ page }) => {
    const inboxBtn = page.getByTestId("property-list-inbox-button--5001").first()
    await expect(inboxBtn).toBeEnabled()
  })

  test("Gmail compose opens with owner2 email and owner2 name in body", async ({ page }) => {
    await page.getByTestId("property-list-email-button--5001").first().click()

    const dialog = page.getByTestId("property-gmail-compose-dialog")
    await expect(dialog).toBeVisible()
    await expect(page.getByTestId("property-gmail-compose-to")).toHaveValue(PROP_OWNER2_FULL.owner2email!)
    const bodyContent = await dialog.textContent()
    expect(bodyContent).toContain(`Dear ${PROP_OWNER2_FULL.owner2name}`)
  })
})

// ---------------------------------------------------------------------------
// Tests — owner3 fallback (skips owner2)
// ---------------------------------------------------------------------------

test.describe("Properties quick card — phone/email falls back to owner3 (mocked)", () => {
  test.beforeEach(async ({ page }) => {
    requireAuth()
    await page.setViewportSize({ width: 1280, height: 800 })
    await signInAsAdmin(page)
    await gotoQuickCards(page, makeQuickListResponse(PROP_OWNER3_FULL))
  })

  test("Phone button is enabled when owner1+owner2 have no phone but owner3 does", async ({ page }) => {
    const callBtn = page.getByTestId("property-list-call-button--5002").first()
    await expect(callBtn).toBeEnabled()
  })

  test("Phone button is a tel: link using owner3's phone number", async ({ page }) => {
    const callBtn = page.getByTestId("property-list-call-button--5002").first()
    await expect(callBtn).toHaveAttribute("href", `tel:${PROP_OWNER3_FULL.owner3phone}`)
  })

  test("Email button is enabled when owner1+owner2 have no email but owner3 does", async ({ page }) => {
    const emailBtn = page.getByTestId("property-list-email-button--5002").first()
    await expect(emailBtn).toBeEnabled()
  })

  test("Gmail compose body uses owner3 name", async ({ page }) => {
    await page.getByTestId("property-list-email-button--5002").first().click()
    const dialog = page.getByTestId("property-gmail-compose-dialog")
    await expect(dialog).toBeVisible()
    const bodyContent = await dialog.textContent()
    expect(bodyContent).toContain(`Dear ${PROP_OWNER3_FULL.owner3name}`)
  })
})

// ---------------------------------------------------------------------------
// Tests — split-owner (phone from owner1, email from owner2)
// ---------------------------------------------------------------------------

test.describe("Properties quick card — split-owner: phone from owner1, email from owner2 (mocked)", () => {
  test.beforeEach(async ({ page }) => {
    requireAuth()
    await page.setViewportSize({ width: 1280, height: 800 })
    await signInAsAdmin(page)
    await gotoQuickCards(page, makeQuickListResponse(PROP_SPLIT_OWNERS))
  })

  test("Phone button is enabled using owner1's phone", async ({ page }) => {
    const callBtn = page.getByTestId("property-list-call-button--5003").first()
    await expect(callBtn).toBeEnabled()
    await expect(callBtn).toHaveAttribute("href", `tel:${PROP_SPLIT_OWNERS.owner1phone}`)
  })

  test("Email button is enabled using owner2's email", async ({ page }) => {
    const emailBtn = page.getByTestId("property-list-email-button--5003").first()
    await expect(emailBtn).toBeEnabled()
  })

  test("Inbox button is enabled using owner2's email", async ({ page }) => {
    const inboxBtn = page.getByTestId("property-list-inbox-button--5003").first()
    await expect(inboxBtn).toBeEnabled()
  })

  test("Gmail compose uses owner2 email and owner2 name in body (email owner's name)", async ({ page }) => {
    await page.getByTestId("property-list-email-button--5003").first().click()
    const dialog = page.getByTestId("property-gmail-compose-dialog")
    await expect(dialog).toBeVisible()
    await expect(page.getByTestId("property-gmail-compose-to")).toHaveValue(PROP_SPLIT_OWNERS.owner2email!)
    const bodyContent = await dialog.textContent()
    expect(bodyContent).toContain(`Dear ${PROP_SPLIT_OWNERS.owner2name}`)
  })
})

// ---------------------------------------------------------------------------
// Tests — regression (owner1 still works when it has full data)
// ---------------------------------------------------------------------------

test.describe("Properties quick card — regression: owner1 with full data (mocked)", () => {
  test.beforeEach(async ({ page }) => {
    requireAuth()
    await page.setViewportSize({ width: 1280, height: 800 })
    await signInAsAdmin(page)
    await gotoQuickCards(page, makeQuickListResponse(PROP_OWNER1_FULL))
  })

  test("Phone button is enabled and uses owner1 phone (no regression)", async ({ page }) => {
    const callBtn = page.getByTestId("property-list-call-button--5004").first()
    await expect(callBtn).toBeEnabled()
    await expect(callBtn).toHaveAttribute("href", `tel:${PROP_OWNER1_FULL.owner1phone}`)
  })

  test("Email button is enabled using owner1 email (no regression)", async ({ page }) => {
    const emailBtn = page.getByTestId("property-list-email-button--5004").first()
    await expect(emailBtn).toBeEnabled()
  })

  test("Gmail compose body uses owner1 name (no regression)", async ({ page }) => {
    await page.getByTestId("property-list-email-button--5004").first().click()
    const dialog = page.getByTestId("property-gmail-compose-dialog")
    await expect(dialog).toBeVisible()
    const bodyContent = await dialog.textContent()
    expect(bodyContent).toContain(`Dear ${PROP_OWNER1_FULL.owner1name}`)
  })
})

// ---------------------------------------------------------------------------
// Tests — all empty (no owner has contact info)
// ---------------------------------------------------------------------------

test.describe("Properties quick card — all disabled when no owner has contact info (mocked)", () => {
  test.beforeEach(async ({ page }) => {
    requireAuth()
    await page.setViewportSize({ width: 1280, height: 800 })
    await signInAsAdmin(page)
    await gotoQuickCards(page, makeQuickListResponse(PROP_NO_CONTACT))
  })

  test("Phone button is visible but disabled with tooltip 'No phone number'", async ({ page }) => {
    const callBtn = page.getByTestId("property-list-call-button--5005").first()
    await expect(callBtn).toBeDisabled()

    const trigger = page.getByTestId("property-list-call-trigger--5005").first()
    await trigger.hover()
    await expect(page.getByRole("tooltip", { name: "No phone number" })).toBeVisible()
  })

  test("Email button is visible but disabled with tooltip 'No email address'", async ({ page }) => {
    const emailBtn = page.getByTestId("property-list-email-button--5005").first()
    await expect(emailBtn).toBeDisabled()

    const trigger = page.getByTestId("property-list-email-trigger--5005").first()
    await trigger.hover()
    await expect(page.getByRole("tooltip", { name: "No email address" })).toBeVisible()
  })

  test("Inbox button is visible but disabled with tooltip 'No email address'", async ({ page }) => {
    const inboxBtn = page.getByTestId("property-list-inbox-button--5005").first()
    await expect(inboxBtn).toBeDisabled()

    const trigger = page.getByTestId("property-list-inbox-trigger--5005").first()
    await trigger.hover()
    await expect(page.getByRole("tooltip", { name: "No email address" })).toBeVisible()
  })
})
