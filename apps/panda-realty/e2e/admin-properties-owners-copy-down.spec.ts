import { expect, test } from "@playwright/test"

import { e2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import {
  openPropertyEditDialog,
  PROPERTY_TWO_OWNERS,
  PROPERTY_THREE_OWNERS,
  PROPERTY_ONE_OWNER,
  STATUS_LIST_RESPONSE,
  EMPTY_PROPERTY_ENTITIES_RESPONSE,
} from "./helpers/panda-properties-owners-helpers"

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe("Panda Realty — owner copy-down button (mocked APIs)", () => {
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

  test("copy-down button is visible when owner 2 is shown", async ({ page }) => {
    await openPropertyEditDialog(page, PROPERTY_TWO_OWNERS)

    await expect(
      page.getByTestId("panda-properties-form-owners-copy-down"),
    ).toBeVisible()
  })

  test("copy-down button is absent when only owner 1 is present", async ({ page }) => {
    await openPropertyEditDialog(page, PROPERTY_ONE_OWNER)

    await expect(
      page.getByTestId("panda-properties-form-owners-copy-down"),
    ).toHaveCount(0)
  })

  test("clicking copy-down copies address, phone, and email to owner 2", async ({ page }) => {
    await openPropertyEditDialog(page, PROPERTY_TWO_OWNERS)

    // Confirm owner2 fields are initially empty
    const owner2Address = page
      .getByTestId("panda-properties-form-field--owner2address")
      .locator("input")
    const owner2Phone = page
      .getByTestId("panda-properties-form-field--owner2phone")
      .locator("input")
    const owner2Email = page
      .getByTestId("panda-properties-form-field--owner2email")
      .locator("input")

    await expect(owner2Address).toHaveValue("")
    await expect(owner2Phone).toHaveValue("")
    await expect(owner2Email).toHaveValue("")

    // Click copy-down
    await page.getByTestId("panda-properties-form-owners-copy-down").click()

    // Owner2 fields should now match owner1
    await expect(owner2Address).toHaveValue("182 AMY STREET MORAYFIELD")
    await expect(owner2Phone).toHaveValue("0412345678")
    await expect(owner2Email).toHaveValue("john@example.com")

    // Owner1 name and owner2 name should be unchanged
    await expect(
      page.getByTestId("panda-properties-form-field--owner1name").locator("input"),
    ).toHaveValue("Smith, John")
    await expect(
      page.getByTestId("panda-properties-form-field--owner2name").locator("input"),
    ).toHaveValue("Jane Smith")
  })

  test("clicking copy-down copies address, phone, and email to both owner 2 and owner 3", async ({
    page,
  }) => {
    await openPropertyEditDialog(page, PROPERTY_THREE_OWNERS)

    // Click copy-down
    await page.getByTestId("panda-properties-form-owners-copy-down").click()

    // Owner2 fields match owner1
    await expect(
      page.getByTestId("panda-properties-form-field--owner2address").locator("input"),
    ).toHaveValue("182 AMY STREET MORAYFIELD")
    await expect(
      page.getByTestId("panda-properties-form-field--owner2phone").locator("input"),
    ).toHaveValue("0412345678")
    await expect(
      page.getByTestId("panda-properties-form-field--owner2email").locator("input"),
    ).toHaveValue("john@example.com")

    // Owner3 fields match owner1
    await expect(
      page.getByTestId("panda-properties-form-field--owner3address").locator("input"),
    ).toHaveValue("182 AMY STREET MORAYFIELD")
    await expect(
      page.getByTestId("panda-properties-form-field--owner3phone").locator("input"),
    ).toHaveValue("0412345678")
    await expect(
      page.getByTestId("panda-properties-form-field--owner3email").locator("input"),
    ).toHaveValue("john@example.com")

    // Names are untouched
    await expect(
      page.getByTestId("panda-properties-form-field--owner2name").locator("input"),
    ).toHaveValue("Jane Smith")
    await expect(
      page.getByTestId("panda-properties-form-field--owner3name").locator("input"),
    ).toHaveValue("Bob Smith")
  })
})
