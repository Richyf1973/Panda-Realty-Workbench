import { expect, test } from "@playwright/test"

import { requirePandaE2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import {
  openPropertyEditDialog,
  PROPERTY_TWO_OWNERS,
  STATUS_LIST_RESPONSE,
  EMPTY_PROPERTY_ENTITIES_RESPONSE,
} from "./helpers/panda-properties-owners-helpers"

const EXPECTED_COMPOSE_SUBJECT = "12 Test Street, Testville"

test.describe("Panda Realty — owner compose dialog (mocked APIs)", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaE2eAdminCredentials()

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

  test("compose button opens GmailComposeDialog pre-filled with owner email and property address", async ({ page }) => {
    await openPropertyEditDialog(page, PROPERTY_TWO_OWNERS)

    await page.getByTestId("property-owner-compose--1").click()

    await expect(page.getByTestId("property-gmail-compose-dialog")).toBeVisible()
    await expect(page.getByTestId("property-gmail-compose-to")).toHaveValue("john@example.com")
    await expect(page.getByTestId("property-gmail-compose-subject")).toHaveValue(EXPECTED_COMPOSE_SUBJECT)
    await expect(page.getByTestId("property-gmail-compose-editor")).toContainText("Dear Smith, John,")
  })

  test("cancelling the compose dialog closes it without affecting the form", async ({ page }) => {
    await openPropertyEditDialog(page, PROPERTY_TWO_OWNERS)

    await page.getByTestId("property-owner-compose--1").click()
    await expect(page.getByTestId("property-gmail-compose-dialog")).toBeVisible()

    await page.getByTestId("property-gmail-compose-cancel").click()

    await expect(page.getByTestId("property-gmail-compose-dialog")).not.toBeVisible()
    await expect(page.getByTestId("panda-properties-dialog-form")).toBeVisible()
  })
})
