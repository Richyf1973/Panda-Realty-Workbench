import { expect, test } from "@playwright/test"

import { requirePandaE2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import {
  EMPTY_LIST,
  ENTITY_CATEGORIES_RESPONSE,
  GOOGLE_CONTACTS_WARNING,
} from "./helpers/property-fixtures"

test.describe("Panda Realty — Google Contacts sync on standalone entity create", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaE2eAdminCredentials()
    await signInAsAdmin(page)
  })

  test("creating entity from admin CRUD form shows Google Contacts warning", async ({ page }) => {
    await page.route(/\/api\/admin\/entities(\?|$)/, async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            entityId: 57,
            entityName: "Orphan Contact",
            emailAddress: "orphan@test.com",
            entityCategoryId: 4,
            googleContactsWarnings: [GOOGLE_CONTACTS_WARNING],
          }),
        })
        return
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: [],
          totalCount: 0,
          limit: 25,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: null,
          endCursor: null,
        }),
      })
    })

    await page.route("**/api/admin/entity-categories**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(ENTITY_CATEGORIES_RESPONSE),
      })
    })

    await page.route("**/api/admin/contact-categories**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_LIST) })
    })
    await page.route("**/api/admin/lead-sources**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_LIST) })
    })

    await page.goto("/admin/entities")
    const addButton = page.getByTestId("admin-entity-list-add-new--entities")
    await expect(addButton).toBeVisible({ timeout: 10_000 })

    await addButton.click()
    await expect(page.getByTestId("admin-entity-crud-dialog--entities")).toBeVisible()

    await page.getByTestId("panda-entities-form-field--entityName").fill("Orphan Contact")
    await page.getByTestId("panda-entities-form-field--emailAddress").fill("orphan@test.com")

    const categorySelect = page.getByTestId("panda-entities-form-select--entityCategoryId")
    await categorySelect.click()
    await page.getByRole("option", { name: "Contact" }).click()

    const [postRes] = await Promise.all([
      page.waitForResponse(
        (res) =>
          /\/api\/admin\/entities(\?|$)/.test(res.url()) &&
          res.request().method() === "POST",
      ),
      page.getByTestId("admin-entity-create-submit--entities").click(),
    ])
    expect(postRes.status()).toBe(201)

    const banner = page.getByTestId("panda-google-contacts-warning-banner")
    await expect(banner).toBeVisible({ timeout: 5_000 })
    await expect(banner.getByText(GOOGLE_CONTACTS_WARNING)).toBeVisible()
  })
})
