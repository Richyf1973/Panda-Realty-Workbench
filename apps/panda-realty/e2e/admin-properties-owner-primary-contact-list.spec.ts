/**
 * E2E: Properties — Owner Primary Contact Flag — List routing
 *
 * Run: npm run test:e2e:scratch -- --app=panda-realty --spec="apps/panda-realty/e2e/admin-properties-owner-primary-contact-list.spec.ts" --no-bail
 *
 * Covers:
 * A. Call/email list buttons route to the flagged primary owner, not always owner 1.
 * B. Named tooltip when the primary owner has no contact info.
 * C. Null primary flags (old data) fall back to first-non-null owner.
 *
 * All tests are mocked — no live DB required.
 */

import { expect, test } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { createStory, shotFocused } from "@repo/e2e-utils"

import { requirePandaE2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import { STATUS_LIST_RESPONSE } from "./helpers/admin-properties-mocks"
import { BASE_PROPERTY } from "./helpers/panda-properties-owners-helpers"

// ---------------------------------------------------------------------------
// Screenshot dir + story
// ---------------------------------------------------------------------------

const SHOT_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "screenshots",
  "owner-primary-contact-list",
)

const story = createStory({ specUrl: import.meta.url, slug: "owner-primary-contact-list" })

story.setWhatWasBuilt(
  "Owner Primary Contact Flag (list view): the property list call/email/inbox buttons now " +
    "route to the owner designated by primaryPhoneOwnerNum / primaryEmailOwnerNum instead of " +
    "always defaulting to owner 1. When the designated primary owner has no contact info, the " +
    "button is disabled with a named tooltip explaining which owner to fix.",
)

test.beforeEach(async () => {
  requirePandaE2eAdminCredentials()
  await mkdir(SHOT_DIR, { recursive: true })
})

test.afterAll(() => {
  story.write()
})

// ---------------------------------------------------------------------------
// Shared list mock data
// ---------------------------------------------------------------------------

const BASE_ITEM = {
  ...BASE_PROPERTY,
  propertyListId: 7001,
  streetAddress: "1 Primary Contact Lane",
  suburb: "CONTACTVILLE",
  state: "QLD",
  postcode: "4000",
  owner1name: "First Owner",
  owner1phone: "0411111111",
  owner1email: "first@example.com",
  owner2name: "Second Owner",
  owner2phone: "0422222222",
  owner2email: "second@example.com",
  owner3name: "Third Owner",
  owner3phone: "0433333333",
  owner3email: "third@example.com",
  primaryPhoneOwnerNum: 1,
  primaryEmailOwnerNum: 1,
}

/** Owner 2 is the primary phone contact. */
const PROP_PRIMARY_PHONE_OWNER2 = {
  ...BASE_ITEM,
  propertyListId: 7001,
  primaryPhoneOwnerNum: 2,
  primaryEmailOwnerNum: 1,
}

/** Owner 2 is the primary email contact. */
const PROP_PRIMARY_EMAIL_OWNER2 = {
  ...BASE_ITEM,
  propertyListId: 7002,
  primaryPhoneOwnerNum: 1,
  primaryEmailOwnerNum: 2,
}

/** Owner 3 is the primary phone contact. */
const PROP_PRIMARY_PHONE_OWNER3 = {
  ...BASE_ITEM,
  propertyListId: 7003,
  primaryPhoneOwnerNum: 3,
  primaryEmailOwnerNum: 1,
}

/** Primary phone owner (owner 2) has no phone number; owner 1 has a phone. */
const PROP_PRIMARY_PHONE_OWNER2_NO_PHONE = {
  ...BASE_ITEM,
  propertyListId: 7004,
  primaryPhoneOwnerNum: 2,
  primaryEmailOwnerNum: 1,
  owner2phone: null,
}

/** Primary email owner (owner 2) has no email; owner 1 has an email. */
const PROP_PRIMARY_EMAIL_OWNER2_NO_EMAIL = {
  ...BASE_ITEM,
  propertyListId: 7005,
  primaryPhoneOwnerNum: 1,
  primaryEmailOwnerNum: 2,
  owner2email: null,
}

/** No primary flags set (old data pre-migration). Falls back to first-non-null. */
const PROP_NO_PRIMARY_FLAGS = {
  ...BASE_ITEM,
  propertyListId: 7006,
  primaryPhoneOwnerNum: null,
  primaryEmailOwnerNum: null,
  owner1phone: null,
  owner1email: null,
  owner2phone: "0422222222",
  owner2email: "second@example.com",
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function setupListMocks(
  page: import("@playwright/test").Page,
  item: Record<string, unknown>,
): Promise<void> {
  await page.route("**/api/admin/property-status**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(STATUS_LIST_RESPONSE),
    })
  })
  await page.route("**/api/admin/properties**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        items: [item],
        totalCount: 1,
        limit: 25,
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
}

async function gotoAndWaitForListRow(
  page: import("@playwright/test").Page,
  item: Record<string, unknown>,
): Promise<void> {
  await setupListMocks(page, item)
  await page.goto("/admin/properties")
  await expect(
    page.getByTestId(`admin-entity-row--properties--${item.propertyListId}`),
  ).toBeVisible({ timeout: 15_000 })
}

// ---------------------------------------------------------------------------
// A. List routing — primary phone owner
// ---------------------------------------------------------------------------

test.describe("Properties list — call button routes to primary phone owner (mocked)", () => {
  test("call button href targets primary phone owner 2 when primaryPhoneOwnerNum is 2", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1600, height: 900 })
    await signInAsAdmin(page)
    await gotoAndWaitForListRow(page, PROP_PRIMARY_PHONE_OWNER2)

    const callBtn = page
      .getByTestId(`property-list-call-button--${PROP_PRIMARY_PHONE_OWNER2.propertyListId}`)
      .first()
    await expect(callBtn).toBeEnabled({ timeout: 10_000 })
    await expect(callBtn).toHaveAttribute("href", `tel:${PROP_PRIMARY_PHONE_OWNER2.owner2phone}`)

    const listRow = page.getByTestId(
      `admin-entity-row--properties--${PROP_PRIMARY_PHONE_OWNER2.propertyListId}`,
    )
    await shotFocused(page, listRow, SHOT_DIR, "01-call-routes-owner2")
    story.addScene({
      title: "01 — Call button routes to primary phone owner 2",
      images: [join(SHOT_DIR, "01-call-routes-owner2.png")],
      seeing:
        "Property list row showing the actions column — call button is enabled and links to owner 2 phone (tel:0422222222) because primaryPhoneOwnerNum is 2.",
      steps: [
        "Navigate to properties list with mocked property (primaryPhoneOwnerNum: 2)",
        "Assert call button href is tel:{owner2phone}",
      ],
    })
  })

  test("call button href targets primary phone owner 3 when primaryPhoneOwnerNum is 3", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1600, height: 900 })
    await signInAsAdmin(page)
    await gotoAndWaitForListRow(page, PROP_PRIMARY_PHONE_OWNER3)

    const callBtn = page
      .getByTestId(`property-list-call-button--${PROP_PRIMARY_PHONE_OWNER3.propertyListId}`)
      .first()
    await expect(callBtn).toBeEnabled({ timeout: 10_000 })
    await expect(callBtn).toHaveAttribute("href", `tel:${PROP_PRIMARY_PHONE_OWNER3.owner3phone}`)
  })
})

// ---------------------------------------------------------------------------
// A. List routing — primary email owner
// ---------------------------------------------------------------------------

test.describe("Properties list — email button routes to primary email owner (mocked)", () => {
  test("email compose to field uses primary email owner 2 when primaryEmailOwnerNum is 2", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1600, height: 900 })
    await signInAsAdmin(page)
    await gotoAndWaitForListRow(page, PROP_PRIMARY_EMAIL_OWNER2)

    const emailBtn = page
      .getByTestId(`property-list-email-button--${PROP_PRIMARY_EMAIL_OWNER2.propertyListId}`)
      .first()
    await expect(emailBtn).toBeEnabled({ timeout: 10_000 })
    await emailBtn.click()

    const dialog = page.getByTestId("property-gmail-compose-dialog")
    await expect(dialog).toBeVisible({ timeout: 10_000 })
    const toChip = page.getByTestId("property-gmail-compose-to-chip").first()
    await expect(toChip).toBeVisible({ timeout: 5_000 })
    await expect(toChip).toContainText(PROP_PRIMARY_EMAIL_OWNER2.owner2email)

    await shotFocused(page, dialog, SHOT_DIR, "02-email-routes-owner2")
    story.addScene({
      title: "02 — Email compose dialog shows primary email owner 2 in To field",
      images: [join(SHOT_DIR, "02-email-routes-owner2.png")],
      seeing:
        "Gmail compose dialog open with owner2email in the To field because primaryEmailOwnerNum is 2.",
      steps: [
        "Navigate to properties list with mocked property (primaryEmailOwnerNum: 2)",
        "Click email button",
        "Assert compose to field chip shows owner2email",
      ],
    })
  })
})

// ---------------------------------------------------------------------------
// B. Named tooltip — primary owner has no contact
// ---------------------------------------------------------------------------

test.describe("Properties list — named tooltip when primary owner has no contact (mocked)", () => {
  test("call button disabled with named tooltip when primary phone owner has no phone number", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1600, height: 900 })
    await signInAsAdmin(page)
    await gotoAndWaitForListRow(page, PROP_PRIMARY_PHONE_OWNER2_NO_PHONE)

    const id = PROP_PRIMARY_PHONE_OWNER2_NO_PHONE.propertyListId
    const callBtn = page.getByTestId(`property-list-call-button--${id}`).first()
    await expect(callBtn).toBeDisabled({ timeout: 10_000 })

    const trigger = page.getByTestId(`property-list-call-trigger--${id}`).first()
    await trigger.hover()

    const expectedName = PROP_PRIMARY_PHONE_OWNER2_NO_PHONE.owner2name
    const tooltip = page.getByRole("tooltip", {
      name: `Primary owner (${expectedName}) has no phone number`,
    })
    await expect(tooltip).toBeVisible({ timeout: 5_000 })

    const listRow3 = page.getByTestId(`admin-entity-row--properties--${id}`)
    await shotFocused(page, listRow3, SHOT_DIR, "03-named-tooltip-no-phone")
    story.addScene({
      title: "03 — Call button disabled with named tooltip when primary owner has no phone",
      images: [join(SHOT_DIR, "03-named-tooltip-no-phone.png")],
      seeing:
        "Property list row — call button is disabled. Hovering shows tooltip: Primary owner (Second Owner) has no phone number.",
      steps: [
        "Navigate with property where primaryPhoneOwnerNum=2 but owner2phone is null",
        "Hover call button trigger",
        "Assert call button is disabled and tooltip names the owner",
      ],
    })
  })

  test("email button disabled with named tooltip when primary email owner has no email address", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1600, height: 900 })
    await signInAsAdmin(page)
    await gotoAndWaitForListRow(page, PROP_PRIMARY_EMAIL_OWNER2_NO_EMAIL)

    const id = PROP_PRIMARY_EMAIL_OWNER2_NO_EMAIL.propertyListId
    const emailBtn = page.getByTestId(`property-list-email-button--${id}`).first()
    await expect(emailBtn).toBeDisabled({ timeout: 10_000 })

    const trigger = page.getByTestId(`property-list-email-trigger--${id}`).first()
    await trigger.hover()

    const expectedName = PROP_PRIMARY_EMAIL_OWNER2_NO_EMAIL.owner2name
    const tooltip = page.getByRole("tooltip", {
      name: `Primary owner (${expectedName}) has no email address`,
    })
    await expect(tooltip).toBeVisible({ timeout: 5_000 })
  })

  test("inbox button disabled with named tooltip when primary email owner has no email address", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1600, height: 900 })
    await signInAsAdmin(page)
    await gotoAndWaitForListRow(page, PROP_PRIMARY_EMAIL_OWNER2_NO_EMAIL)

    const id = PROP_PRIMARY_EMAIL_OWNER2_NO_EMAIL.propertyListId
    const inboxBtn = page.getByTestId(`property-list-inbox-button--${id}`).first()
    await expect(inboxBtn).toBeDisabled({ timeout: 10_000 })

    const trigger = page.getByTestId(`property-list-inbox-trigger--${id}`).first()
    // Move mouse away first so pointer-enter fires fresh (previous test may have left mouse nearby)
    await page.mouse.move(0, 0)
    await trigger.hover()

    const expectedName = PROP_PRIMARY_EMAIL_OWNER2_NO_EMAIL.owner2name
    const tooltip = page.getByRole("tooltip", {
      name: `Primary owner (${expectedName}) has no email address`,
    })
    await expect(tooltip).toBeVisible({ timeout: 8_000 })
  })
})

// ---------------------------------------------------------------------------
// C. Regression — null primary flags fall back to first-non-null
// ---------------------------------------------------------------------------

test.describe("Properties list — null primary flags fall back to first-non-null owner (mocked)", () => {
  test("call button uses owner 2 phone when primaryPhoneOwnerNum is absent and owner 1 has no phone", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1600, height: 900 })
    await signInAsAdmin(page)
    await gotoAndWaitForListRow(page, PROP_NO_PRIMARY_FLAGS)

    const callBtn = page
      .getByTestId(`property-list-call-button--${PROP_NO_PRIMARY_FLAGS.propertyListId}`)
      .first()
    await expect(callBtn).toBeEnabled({ timeout: 10_000 })
    await expect(callBtn).toHaveAttribute("href", `tel:${PROP_NO_PRIMARY_FLAGS.owner2phone}`)
  })
})
