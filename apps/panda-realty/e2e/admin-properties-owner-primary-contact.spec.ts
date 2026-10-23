/**
 * E2E: Properties — Owner Primary Contact Flag — Edit/Create form + Persistence
 *
 * Run: npm run test:e2e:scratch -- --app=panda-realty --spec="apps/panda-realty/e2e/admin-properties-owner-primary-contact.spec.ts" --no-bail
 *
 * Covers:
 * C. Edit form star icons reflect primary state; clicking transfers primary (radio behaviour).
 * C. Create form pre-selects owner 1 as primary for both phone and email.
 * D. PATCH request body includes updated primaryPhoneOwnerNum / primaryEmailOwnerNum.
 *
 * All tests are mocked — no live DB required.
 * List routing tests live in admin-properties-owner-primary-contact-list.spec.ts.
 */

import { expect, test } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { createStory, shotFocused } from "@repo/e2e-utils"

import { requirePandaE2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import {
  BASE_PROPERTY,
  registerPropertyRoutes,
} from "./helpers/panda-properties-owners-helpers"

// ---------------------------------------------------------------------------
// Screenshot dir + story
// ---------------------------------------------------------------------------

const SHOT_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "screenshots",
  "owner-primary-contact",
)

const story = createStory({ specUrl: import.meta.url, slug: "owner-primary-contact" })

story.setWhatWasBuilt(
  "Owner Primary Contact Flag: added primaryPhoneOwnerNum and primaryEmailOwnerNum integer fields to " +
    "panda_properties. Star icons inside Phone/Email input fields in the edit form allow agents to " +
    "designate each primary owner independently. Owner 1 is auto-selected on create. The value is " +
    "included in the PATCH body when the form is saved.",
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

const EDIT_FIXTURE_TWO_OWNERS = {
  ...BASE_PROPERTY,
  propertyListId: 1001,
  streetAddress: "42 Star Test Street",
  suburb: "Startown",
  owner1name: "First Owner",
  owner1phone: "0411111111",
  owner1email: "first@example.com",
  owner2name: "Second Owner",
  owner2phone: "0422222222",
  owner2email: "second@example.com",
  owner3name: null,
  owner3phone: null,
  owner3email: null,
  primaryPhoneOwnerNum: 1,
  primaryEmailOwnerNum: 1,
}

const EDIT_FIXTURE_SINGLE_OWNER = {
  ...BASE_PROPERTY,
  propertyListId: 1001,
  streetAddress: "43 Star Test Street",
  suburb: "Startown",
  owner1name: "Only Owner",
  owner1phone: "0411111111",
  owner1email: "only@example.com",
  owner2name: null,
  owner2phone: null,
  owner2email: null,
  owner3name: null,
  owner3phone: null,
  owner3email: null,
  primaryPhoneOwnerNum: 1,
  primaryEmailOwnerNum: 1,
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function setupFormTestRoutes(
  page: import("@playwright/test").Page,
  propertyDetail: typeof BASE_PROPERTY,
): Promise<void> {
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
  await registerPropertyRoutes(page, propertyDetail)
}

async function openEditDialogScrollToOwners(
  page: import("@playwright/test").Page,
  propertyDetail: typeof BASE_PROPERTY,
): Promise<void> {
  await setupFormTestRoutes(page, propertyDetail)
  await page.goto("/admin/properties")
  await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible({
    timeout: 20_000,
  })
  await page.getByTestId("admin-entity-row--properties--1001").click()
  await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible({
    timeout: 15_000,
  })
  await expect(page.getByTestId("panda-properties-dialog-form")).toBeVisible({ timeout: 10_000 })
  const ownersSection = page.getByTestId("panda-properties-form-section--owners")
  await expect(ownersSection).toBeVisible({ timeout: 10_000 })
  await ownersSection.scrollIntoViewIfNeeded()
}

async function openCreateDialogScrollToOwners(
  page: import("@playwright/test").Page,
): Promise<void> {
  await page.route("**/api/admin/property-status**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        items: [],
        totalCount: 0,
        limit: 100,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
        startCursor: null,
        endCursor: null,
      }),
    })
  })
  await page.route("**/api/admin/properties**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        items: [],
        totalCount: 0,
        limit: 25,
        totalPages: 0,
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
  await page.goto("/admin/properties")
  const addBtn = page.getByTestId("admin-entity-list-add-new--properties")
  await expect(addBtn).toBeVisible({ timeout: 15_000 })
  await addBtn.click()
  await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible({
    timeout: 10_000,
  })
  const ownersSection = page.getByTestId("panda-properties-form-section--owners")
  await expect(ownersSection).toBeVisible({ timeout: 10_000 })
  await ownersSection.scrollIntoViewIfNeeded()
}

// ---------------------------------------------------------------------------
// C. Form UI — star icons on phone/email fields (edit dialog)
// ---------------------------------------------------------------------------

test.describe("Properties edit form — star icons show primary state (mocked)", () => {
  test("owner 1 phone field has active star when primaryPhoneOwnerNum is 1", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await signInAsAdmin(page)
    await openEditDialogScrollToOwners(page, EDIT_FIXTURE_TWO_OWNERS)

    const phoneStar1 = page.getByTestId("panda-owner-phone-primary-star--1")
    await expect(phoneStar1).toBeVisible({ timeout: 10_000 })
    await expect(phoneStar1).toHaveAttribute("aria-pressed", "true")

    const ownersSection = page.getByTestId("panda-properties-form-section--owners")
    await shotFocused(page, ownersSection, SHOT_DIR, "04a-phone-star-owner1-active")
    story.addScene({
      title: "04 — Edit form: owner 1 phone star active when primaryPhoneOwnerNum is 1",
      images: [join(SHOT_DIR, "04a-phone-star-owner1-active.png")],
      seeing:
        "Owner Information section showing two owner rows. Owner 1 phone field has an amber star (aria-pressed=true); owner 2 phone star is inactive.",
      steps: [
        "Open edit dialog for property with primaryPhoneOwnerNum: 1",
        "Scroll to Owner Information section",
        "Assert owner 1 phone star exists with aria-pressed=true",
      ],
    })
  })

  test("owner 1 email field has active star when primaryEmailOwnerNum is 1", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await signInAsAdmin(page)
    await openEditDialogScrollToOwners(page, EDIT_FIXTURE_TWO_OWNERS)

    const emailStar1 = page.getByTestId("panda-owner-email-primary-star--1")
    await expect(emailStar1).toBeVisible({ timeout: 10_000 })
    await expect(emailStar1).toHaveAttribute("aria-pressed", "true")
  })

  test("owner 2 phone field has inactive star when primaryPhoneOwnerNum is 1", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await signInAsAdmin(page)
    await openEditDialogScrollToOwners(page, EDIT_FIXTURE_TWO_OWNERS)

    const phoneStar2 = page.getByTestId("panda-owner-phone-primary-star--2")
    await expect(phoneStar2).toBeVisible({ timeout: 10_000 })
    await expect(phoneStar2).toHaveAttribute("aria-pressed", "false")
  })

  test("clicking owner 2 phone star makes it active and deactivates owner 1 phone star", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await signInAsAdmin(page)
    await openEditDialogScrollToOwners(page, EDIT_FIXTURE_TWO_OWNERS)

    const phoneStar1 = page.getByTestId("panda-owner-phone-primary-star--1")
    const phoneStar2 = page.getByTestId("panda-owner-phone-primary-star--2")
    const ownersSection = page.getByTestId("panda-properties-form-section--owners")

    await expect(phoneStar1).toBeVisible({ timeout: 10_000 })
    await expect(phoneStar2).toBeVisible({ timeout: 10_000 })

    await shotFocused(page, ownersSection, SHOT_DIR, "05a-before-owner1-phone-active")

    await phoneStar2.click()

    await expect(phoneStar2).toHaveAttribute("aria-pressed", "true")
    await expect(phoneStar1).toHaveAttribute("aria-pressed", "false")

    await shotFocused(page, ownersSection, SHOT_DIR, "05b-after-owner2-phone-active")
    story.addScene({
      title: "05 — Phone primary transfers from owner 1 to owner 2 on star click",
      images: [
        join(SHOT_DIR, "05a-before-owner1-phone-active.png"),
        join(SHOT_DIR, "05b-after-owner2-phone-active.png"),
      ],
      seeing:
        "Left: Owner Information section — owner 1 phone star is active (amber). " +
        "Right: after clicking owner 2 phone star — owner 2 phone star is active, owner 1 phone star is inactive. Both are shown in context.",
      steps: [
        "Open edit dialog with two owners (primaryPhoneOwnerNum: 1)",
        "Observe owner 1 phone star is active (screenshot 1)",
        "Click owner 2 phone star",
        "Observe owner 2 phone star is active, owner 1 is inactive (screenshot 2)",
      ],
    })
  })

  test("phone and email primaries are independent — different owners can hold each", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await signInAsAdmin(page)
    await openEditDialogScrollToOwners(page, EDIT_FIXTURE_TWO_OWNERS)

    const phoneStar1 = page.getByTestId("panda-owner-phone-primary-star--1")
    const phoneStar2 = page.getByTestId("panda-owner-phone-primary-star--2")
    const emailStar1 = page.getByTestId("panda-owner-email-primary-star--1")
    const emailStar2 = page.getByTestId("panda-owner-email-primary-star--2")
    const ownersSection = page.getByTestId("panda-properties-form-section--owners")

    await expect(phoneStar1).toBeVisible({ timeout: 10_000 })
    await expect(emailStar1).toBeVisible({ timeout: 10_000 })

    await emailStar2.click()

    await expect(phoneStar1).toHaveAttribute("aria-pressed", "true")
    await expect(phoneStar2).toHaveAttribute("aria-pressed", "false")
    await expect(emailStar2).toHaveAttribute("aria-pressed", "true")
    await expect(emailStar1).toHaveAttribute("aria-pressed", "false")

    await shotFocused(page, ownersSection, SHOT_DIR, "06-phone-email-independent")
    story.addScene({
      title: "06 — Phone and email primaries are independent of each other",
      images: [join(SHOT_DIR, "06-phone-email-independent.png")],
      seeing:
        "Owner Information section — owner 1 phone star is active AND owner 2 email star is active simultaneously, demonstrating that phone and email primaries are tracked independently.",
      steps: [
        "Open edit dialog (both primaries default to owner 1)",
        "Click owner 2 email star to transfer email primary",
        "Assert owner 1 phone star = active, owner 2 email star = active, owner 1 email star = inactive",
      ],
    })
  })

  test("single owner phone star stays active when clicked again", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await signInAsAdmin(page)
    await openEditDialogScrollToOwners(page, EDIT_FIXTURE_SINGLE_OWNER)

    const phoneStar1 = page.getByTestId("panda-owner-phone-primary-star--1")
    await expect(phoneStar1).toBeVisible({ timeout: 10_000 })
    await expect(phoneStar1).toHaveAttribute("aria-pressed", "true")

    await phoneStar1.click()
    await expect(phoneStar1).toHaveAttribute("aria-pressed", "true")
  })
})

// ---------------------------------------------------------------------------
// C. Form UI — create dialog pre-selects owner 1
// ---------------------------------------------------------------------------

test.describe("Properties create form — owner 1 pre-selected as primary (mocked)", () => {
  test("owner 1 phone star is active pre-filled on create form", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await signInAsAdmin(page)
    await openCreateDialogScrollToOwners(page)

    const phoneStar1 = page.getByTestId("panda-owner-phone-primary-star--1")
    await expect(phoneStar1).toBeVisible({ timeout: 10_000 })
    await expect(phoneStar1).toHaveAttribute("aria-pressed", "true")

    const ownersSection = page.getByTestId("panda-properties-form-section--owners")
    await shotFocused(page, ownersSection, SHOT_DIR, "07-create-form-owner1-phone-active")
    story.addScene({
      title: "07 — Create form: owner 1 phone star pre-selected as primary by default",
      images: [join(SHOT_DIR, "07-create-form-owner1-phone-active.png")],
      seeing:
        "Owner Information section on a fresh create form — owner 1 phone star is active (aria-pressed=true) by default, so new properties always have a primary phone contact set.",
      steps: [
        "Navigate to /admin/properties",
        "Click add new property button",
        "Scroll to Owner Information section",
        "Assert owner 1 phone star is visible with aria-pressed=true",
      ],
    })
  })

  test("owner 1 email star is active pre-filled on create form", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await signInAsAdmin(page)
    await openCreateDialogScrollToOwners(page)

    const emailStar1 = page.getByTestId("panda-owner-email-primary-star--1")
    await expect(emailStar1).toBeVisible({ timeout: 10_000 })
    await expect(emailStar1).toHaveAttribute("aria-pressed", "true")
  })
})

// ---------------------------------------------------------------------------
// D. Persistence — PATCH includes updated primary flag values
// ---------------------------------------------------------------------------

test.describe("Properties save — PATCH body includes updated primary flag values (mocked)", () => {
  test("PATCH body includes primaryPhoneOwnerNum 2 after clicking owner 2 phone star before save", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await signInAsAdmin(page)

    // Open dialog first so that registerPropertyRoutes (called inside) is registered before our
    // PATCH interceptor. LIFO means our interceptor — registered last — gets priority over it.
    await openEditDialogScrollToOwners(page, EDIT_FIXTURE_TWO_OWNERS)

    // Register PATCH capture AFTER openEditDialogScrollToOwners so LIFO gives it higher priority
    let capturedPatchBody: Record<string, unknown> | null = null
    await page.route("**/api/admin/properties/1001**", async (route) => {
      if (route.request().method() === "PATCH") {
        try {
          capturedPatchBody = route.request().postDataJSON() as Record<string, unknown>
        } catch { /* ignore */ }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ...EDIT_FIXTURE_TWO_OWNERS, primaryPhoneOwnerNum: 2 }),
        })
        return
      }
      await route.continue()
    })

    const phoneStar2 = page.getByTestId("panda-owner-phone-primary-star--2")
    await expect(phoneStar2).toBeVisible({ timeout: 10_000 })
    await phoneStar2.click()
    await expect(phoneStar2).toHaveAttribute("aria-pressed", "true")

    await page.getByTestId("admin-entity-edit-save-and-close--properties").click()

    // Wait for dialog to close — confirms save completed
    await expect(page.getByTestId("admin-entity-crud-dialog--properties")).not.toBeVisible({
      timeout: 15_000,
    })

    expect(capturedPatchBody).not.toBeNull()
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(capturedPatchBody!["primaryPhoneOwnerNum"]).toBe("2")
  })
})
