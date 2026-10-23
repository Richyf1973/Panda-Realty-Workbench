/**
 * E2E: Property list — Add Calendar Event quick-action button
 *
 * Success factors:
 * 1. "Add Calendar Event" icon button is visible on each property row, before the edit/delete icons.
 * 2. Clicking it opens the "Add Calendar Event" dialog showing the property address as a subtitle.
 * 3. The Title field is pre-filled with the property address (street + suburb).
 * 4. Dialog contains: Title, Date, quarter-hour Time selects, Duration, Notes, Reminders.
 *    No "All-day / Timed" radio toggle.
 * 5. Submitting a valid timed form POSTs to /api/admin/calendar/events and shows success; dialog stays open.
 * 6. A failed POST shows an inline error message; dialog stays open.
 * 7. Closing without submitting resets state; re-opening pre-fills the title again.
 *
 * All tests use mocked APIs — no live Google Calendar token required.
 */

import { expect, test } from "@playwright/test"

import { e2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import {
  EMPTY_PROPERTY_ENTITIES_RESPONSE,
  SINGLE_PROPERTY_RESPONSE,
  STATUS_LIST_RESPONSE,
} from "./helpers/admin-properties-mocks"
import { pickQuarterHourTime } from "./helpers/quarter-hour-time"

const MOCK_PROPERTY = SINGLE_PROPERTY_RESPONSE.items[0]
const EXPECTED_TITLE_PREFILL = `${MOCK_PROPERTY.streetAddress} · ${MOCK_PROPERTY.suburb}`

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

test.describe("Property list — Add Calendar Event button", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")
    await setupMocks(page)
    await signInAsAdmin(page)
  })

  // ── 1. Button visible on each row ──────────────────────────────────────────

  test("Add Calendar Event button is visible on each property row before edit/delete icons", async ({
    page,
  }) => {
    await gotoPropertiesAndWaitForRow(page)

    const calBtn = page.getByTestId("property-list-add-calendar-event-button--1001").first()
    const editBtn = page.getByTestId("admin-entity-row-edit--properties--1001").first()

    await expect(calBtn).toBeVisible()
    await expect(editBtn).toBeVisible()

    const calBtnBox = await calBtn.boundingBox()
    const editBtnBox = await editBtn.boundingBox()
    expect(calBtnBox!.x).toBeLessThan(editBtnBox!.x)
  })

  // ── 2. Dialog opens with property address subtitle ─────────────────────────

  test("clicking button opens dialog with property address subtitle", async ({ page }) => {
    await gotoPropertiesAndWaitForRow(page)

    await page.getByTestId("property-list-add-calendar-event-button--1001").first().click()

    const dialog = page.getByTestId("add-calendar-event-dialog")
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole("heading", { name: "Add Calendar Event" })).toBeVisible()
    await expect(page.getByTestId("add-calendar-event-property-subtitle")).toContainText(
      MOCK_PROPERTY.streetAddress,
    )
  })

  // ── 3. Title pre-filled with property address ──────────────────────────────

  test("Title field is pre-filled with the property address", async ({ page }) => {
    await gotoPropertiesAndWaitForRow(page)

    await page.getByTestId("property-list-add-calendar-event-button--1001").first().click()

    await expect(page.getByTestId("add-calendar-event-title")).toHaveValue(EXPECTED_TITLE_PREFILL)
  })

  // ── 4. All expected fields present — no event-type toggle ────────────────

  test("dialog contains Title, Date, quarter-hour Time selects, Duration, Notes, Reminders — no toggle", async ({
    page,
  }) => {
    await gotoPropertiesAndWaitForRow(page)
    await page.getByTestId("property-list-add-calendar-event-button--1001").first().click()

    await expect(page.getByTestId("add-calendar-event-title")).toBeVisible()
    await expect(page.getByTestId("add-calendar-event-date")).toBeVisible()
    await expect(page.getByTestId("add-calendar-event-time-hour-select")).toBeVisible()
    await expect(page.getByTestId("add-calendar-event-time-minute-select")).toBeVisible()
    await expect(page.getByTestId("add-calendar-event-duration")).toBeVisible()
    await expect(page.getByTestId("add-calendar-event-notes")).toBeVisible()
    await expect(page.getByText("Reminders")).toBeVisible()
    await expect(page.getByTestId("add-calendar-event-submit")).toBeVisible()

    // No all-day / timed toggle
    await expect(page.getByTestId("add-calendar-event-type-all-day")).toHaveCount(0)
    await expect(page.getByTestId("add-calendar-event-type-timed")).toHaveCount(0)
  })

  // ── 5. Successful timed event submission ───────────────────────────────────

  test("valid timed form shows success message and keeps dialog open", async ({ page }) => {
    await page.route("**/api/admin/calendar/events", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ id: "mock-event-abc" }),
        })
      } else {
        await route.continue()
      }
    })

    await gotoPropertiesAndWaitForRow(page)
    await page.getByTestId("property-list-add-calendar-event-button--1001").first().click()

    const dialog = page.getByTestId("add-calendar-event-dialog")

    // Title already pre-filled — set date and time
    await page.getByTestId("add-calendar-event-date").fill("2026-06-15")
    await pickQuarterHourTime(
      page,
      dialog,
      "add-calendar-event-time-hour-select",
      "add-calendar-event-time-minute-select",
      "10:00",
    )
    await page.getByTestId("add-calendar-event-submit").click()

    await expect(page.getByTestId("add-calendar-event-success")).toBeVisible({ timeout: 5_000 })
    await expect(page.getByTestId("add-calendar-event-success")).toContainText("Event created")

    // Dialog stays open
    await expect(dialog).toBeVisible()
  })

  // ── 6. Failed POST shows inline error ─────────────────────────────────────

  test("failed POST shows inline error message; dialog stays open", async ({ page }) => {
    await page.route("**/api/admin/calendar/events", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ error: "Google Calendar not connected" }),
        })
      } else {
        await route.continue()
      }
    })

    await gotoPropertiesAndWaitForRow(page)
    await page.getByTestId("property-list-add-calendar-event-button--1001").first().click()

    const dialog = page.getByTestId("add-calendar-event-dialog")
    await page.getByTestId("add-calendar-event-date").fill("2026-06-15")
    await pickQuarterHourTime(
      page,
      dialog,
      "add-calendar-event-time-hour-select",
      "add-calendar-event-time-minute-select",
      "09:00",
    )
    await page.getByTestId("add-calendar-event-submit").click()

    await expect(page.getByTestId("add-calendar-event-error")).toBeVisible({ timeout: 5_000 })
    await expect(page.getByTestId("add-calendar-event-error")).toContainText(
      "Google Calendar not connected",
    )
    await expect(dialog).toBeVisible()
  })

  // ── 7. Closing resets state; re-opening pre-fills again ──────────────────

  test("closing without submitting resets state; re-open pre-fills title again", async ({
    page,
  }) => {
    await gotoPropertiesAndWaitForRow(page)
    await page.getByTestId("property-list-add-calendar-event-button--1001").first().click()

    // Clear the title to simulate editing
    await page.getByTestId("add-calendar-event-title").clear()
    await page.getByTestId("add-calendar-event-title").fill("custom title")

    await page.getByRole("button", { name: "Cancel" }).click()
    await expect(page.getByTestId("add-calendar-event-dialog")).not.toBeVisible()

    // Re-open — title should be the property address again
    await page.getByTestId("property-list-add-calendar-event-button--1001").first().click()
    await expect(page.getByTestId("add-calendar-event-title")).toHaveValue(EXPECTED_TITLE_PREFILL)
  })
})
