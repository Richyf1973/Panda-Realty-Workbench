import { expect, test } from "@playwright/test"

import { e2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import {
  openPropertyEditDialog,
  PROPERTY_TWO_OWNERS,
  PROPERTY_THREE_OWNERS,
  STATUS_LIST_RESPONSE,
  EMPTY_PROPERTY_ENTITIES_RESPONSE,
} from "./helpers/panda-properties-owners-helpers"

test.describe("Panda Realty — owner email threads (mocked APIs)", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")

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

    await signInAsAdmin(page)
  })

  // ── Button visibility ────────────────────────────────────────────────────

  test("inbox and compose buttons appear below owner 1 row when email is set", async ({ page }) => {
    await openPropertyEditDialog(page, PROPERTY_TWO_OWNERS)

    await expect(page.getByTestId("property-owner-inbox--1")).toBeVisible()
    await expect(page.getByTestId("property-owner-compose--1")).toBeVisible()
  })

  test("inbox and compose buttons are absent for owner 2 when email is blank", async ({ page }) => {
    await openPropertyEditDialog(page, PROPERTY_TWO_OWNERS)

    await expect(page.getByTestId("property-owner-inbox--2")).toHaveCount(0)
    await expect(page.getByTestId("property-owner-compose--2")).toHaveCount(0)
  })

  test("owner 3 with email also gets inbox and compose buttons", async ({ page }) => {
    const threeOwnersWithOwner3Email = {
      ...PROPERTY_THREE_OWNERS,
      owner3email: "bob@example.com",
    }
    await openPropertyEditDialog(page, threeOwnersWithOwner3Email)

    await expect(page.getByTestId("property-owner-inbox--1")).toBeVisible()
    await expect(page.getByTestId("property-owner-inbox--3")).toBeVisible()
    await expect(page.getByTestId("property-owner-inbox--2")).toHaveCount(0)
  })

  // ── Add event + notes buttons ────────────────────────────────────────────

  test("owner 1 row also shows add event and add note buttons in the edit dialog", async ({ page }) => {
    await page.route("**/api/admin/calendar/status**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ connected: true }),
      })
    })

    await openPropertyEditDialog(page, PROPERTY_TWO_OWNERS)

    await expect(page.getByTestId("property-owner-add-event--1")).toBeVisible()
    await expect(page.getByTestId("property-owner-notes--1")).toBeVisible()
  })

  test("owner add event and owner notes open their dialogs from the edit dialog", async ({ page }) => {
    await page.route("**/api/admin/calendar/status**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ connected: true }),
      })
    })

    await openPropertyEditDialog(page, PROPERTY_TWO_OWNERS)

    // notes route must be stubbed AFTER openPropertyEditDialog (last-registered route wins)
    await page.route("**/api/admin/properties/1001/notes**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) })
    })

    await page.getByTestId("property-owner-add-event--1").click()
    await expect(page.getByTestId("add-meeting-dialog")).toBeVisible()
    await expect(page.getByTestId("meeting-title-input")).toHaveValue("Meeting with Smith, John")

    await page.keyboard.press("Escape")
    await expect(page.getByTestId("add-meeting-dialog")).not.toBeVisible()

    await page.getByTestId("property-owner-notes--1").click()
    await expect(page.getByTestId("property-owner-notes-dialog")).toBeVisible()
  })

  // ── Edge case — reactive email field ────────────────────────────────────

  test("typing an email into owner 2 field reactively reveals inbox and compose buttons", async ({ page }) => {
    await openPropertyEditDialog(page, PROPERTY_TWO_OWNERS)

    await expect(page.getByTestId("property-owner-inbox--2")).toHaveCount(0)

    await page.getByTestId("panda-properties-form-field--owner2email").locator("input").fill("jane@example.com")

    await expect(page.getByTestId("property-owner-inbox--2")).toBeVisible()
    await expect(page.getByTestId("property-owner-compose--2")).toBeVisible()

    await page.getByTestId("panda-properties-form-field--owner2email").locator("input").fill("")
    await expect(page.getByTestId("property-owner-inbox--2")).toHaveCount(0)
  })

  // ── Regression — copy-down still works ──────────────────────────────────

  test("copy-down button still copies address phone email to owner 2 (regression)", async ({ page }) => {
    await openPropertyEditDialog(page, PROPERTY_TWO_OWNERS)

    const owner2Address = page.getByTestId("panda-properties-form-field--owner2address").locator("input")
    const owner2Phone = page.getByTestId("panda-properties-form-field--owner2phone").locator("input")
    const owner2Email = page.getByTestId("panda-properties-form-field--owner2email").locator("input")

    await expect(owner2Address).toHaveValue("")
    await expect(owner2Phone).toHaveValue("")
    await expect(owner2Email).toHaveValue("")

    await page.getByTestId("panda-properties-form-owners-copy-down").click()

    await expect(owner2Address).toHaveValue("182 AMY STREET MORAYFIELD")
    await expect(owner2Phone).toHaveValue("0412345678")
    await expect(owner2Email).toHaveValue("john@example.com")
  })
})
