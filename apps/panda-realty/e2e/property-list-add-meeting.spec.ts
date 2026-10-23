/**
 * E2E: Property list quick action uses Add Meeting
 *
 * Run (from repo root):
 *   npx playwright test apps/panda-realty/e2e/property-list-add-meeting.spec.ts --config=apps/panda-realty/playwright.config.ts
 * Or via workspace script:
 *   npm run test:e2e -w panda-realty -- apps/panda-realty/e2e/property-list-add-meeting.spec.ts
 *
 * Scope:
 * - Property-list quick action stays visible before edit/delete.
 * - The action opens Add Meeting, not Add Calendar Event.
 * - The meeting title is prefilled from the property label.
 * - The old calendar-event-only controls are absent.
 * - Cancel + reopen resets the title back to the property default.
 */

import { expect, test } from "@playwright/test"

import { requirePandaE2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import {
  EMPTY_PROPERTY_ENTITIES_RESPONSE,
  SINGLE_PROPERTY_RESPONSE,
  STATUS_LIST_RESPONSE,
} from "./helpers/admin-properties-mocks"

const MOCK_PROPERTY = SINGLE_PROPERTY_RESPONSE.items[0]
const EXPECTED_TITLE_PREFILL = `${MOCK_PROPERTY.streetAddress} \u00B7 ${MOCK_PROPERTY.suburb}`

async function setupMocks(page: import("@playwright/test").Page) {
  await page.route("**/api/admin/properties**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(SINGLE_PROPERTY_RESPONSE),
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
}

async function gotoPropertiesAndWaitForRow(page: import("@playwright/test").Page) {
  await page.goto("/admin/properties")
  await expect(page.getByTestId("admin-entity-row--properties--1001")).toBeVisible({
    timeout: 15_000,
  })
}

test.describe("Property list quick action uses Add Meeting", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaE2eAdminCredentials()
    await setupMocks(page)
    await signInAsAdmin(page)
  })

  test("property-list quick action stays visible before the edit button", async ({ page }) => {
    await gotoPropertiesAndWaitForRow(page)

    const meetingButton = page.getByTestId("property-list-add-calendar-event-button--1001").first()
    const editButton = page.getByTestId("admin-entity-row-edit--properties--1001").first()

    await expect(meetingButton).toBeVisible()
    await expect(editButton).toBeVisible()

    const meetingBox = await meetingButton.boundingBox()
    const editBox = await editButton.boundingBox()
    expect(meetingBox).not.toBeNull()
    expect(editBox).not.toBeNull()
    expect(meetingBox!.x).toBeLessThan(editBox!.x)
  })

  test("property-list quick action opens Add Meeting instead of Add Calendar Event", async ({ page }) => {
    await gotoPropertiesAndWaitForRow(page)

    await page.getByTestId("property-list-add-calendar-event-button--1001").first().click()

    await expect(page.getByTestId("add-meeting-dialog")).toBeVisible()
    await expect(page.getByRole("heading", { name: "Add Meeting" })).toBeVisible()
    await expect(page.getByTestId("meeting-title-input")).toBeVisible()
    await expect(page.getByTestId("meeting-date-input")).toBeVisible()
    await expect(page.getByTestId("meeting-duration-input")).toBeVisible()
    await expect(page.getByTestId("meeting-notes-input")).toBeVisible()
    await expect(page.getByTestId("add-calendar-event-dialog")).toHaveCount(0)
  })

  test("property-list meeting dialog prefills the property label and drops event-only controls", async ({ page }) => {
    await gotoPropertiesAndWaitForRow(page)

    await page.getByTestId("property-list-add-calendar-event-button--1001").first().click()

    await expect(page.getByTestId("meeting-title-input")).toHaveValue(EXPECTED_TITLE_PREFILL)
    await expect(page.getByTestId("add-calendar-event-type-all-day")).toHaveCount(0)
    await expect(page.getByTestId("add-calendar-event-type-timed")).toHaveCount(0)
    await expect(page.getByTestId("add-calendar-event-start-time")).toHaveCount(0)
    await expect(page.getByTestId("add-calendar-event-duration")).toHaveCount(0)
  })

  test("property-list meeting dialog cancel + reopen resets the property-derived title", async ({ page }) => {
    await gotoPropertiesAndWaitForRow(page)

    const trigger = page.getByTestId("property-list-add-calendar-event-button--1001").first()

    await trigger.click()
    await expect(page.getByTestId("add-meeting-dialog")).toBeVisible()

    const titleInput = page.getByTestId("meeting-title-input")
    await titleInput.clear()
    await titleInput.fill("Custom temporary title")

    await page.getByRole("button", { name: "Cancel" }).click()
    await expect(page.getByTestId("add-meeting-dialog")).toBeHidden()

    await trigger.click()
    await expect(page.getByTestId("meeting-title-input")).toHaveValue(EXPECTED_TITLE_PREFILL)
  })
})
