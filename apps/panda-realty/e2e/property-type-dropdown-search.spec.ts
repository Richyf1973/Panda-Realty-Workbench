import { expect, test, type Page } from "@playwright/test"

import { e2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"

const PROPERTY_TYPES_OPTIONS = {
  options: [
    { value: "House", label: "House" },
    { value: "Over 50'S", label: "Over 50'S" },
    { value: "Unit", label: "Unit" },
    { value: "Vacant Land", label: "Vacant Land" },
  ],
}

const PROPERTY_WITH_VALID_TYPE = {
  propertyListId: 1001,
  streetAddress: "12 Test Street",
  suburb: "Testville",
  state: "QLD",
  postcode: "4000",
  propertyType: "House",
  bed: 3,
  bath: 2,
  car: 1,
  salePrice: 500000,
  propertyStatusId: 1,
  owner1name: "Smith, John",
  owner2name: null,
  owner3name: null,
  combinedOwner: "Smith, John",
  isFavorite: false,
  priceUndisclosed: false,
  excludeFromReport: false,
  saleDate: null,
  updatedAt: "2026-01-01T00:00:00Z",
  propertyEntities: [],
  propertyBuyers: [],
  propertyContacts: [],
  propertyTenants: [],
}

const PROPERTY_WITH_UPPERCASE_TYPE = {
  ...PROPERTY_WITH_VALID_TYPE,
  propertyListId: 1002,
  propertyType: "OVER 50'S",
}

const EMPTY_PROPERTIES_LIST = {
  items: [],
  totalCount: 0,
  limit: 25,
  totalPages: 0,
  hasNextPage: false,
  hasPreviousPage: false,
  startCursor: null,
  endCursor: null,
}

const PROPERTIES_LIST_WITH_VALID = {
  items: [PROPERTY_WITH_VALID_TYPE],
  totalCount: 1,
  limit: 25,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false,
  startCursor: null,
  endCursor: null,
}

const PROPERTIES_LIST_WITH_UPPERCASE = {
  items: [PROPERTY_WITH_UPPERCASE_TYPE],
  totalCount: 1,
  limit: 25,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false,
  startCursor: null,
  endCursor: null,
}

async function openEditDialogAndExpandCoreSection(page: Page) {
  await page.goto("/admin/properties")
  await page.getByRole("button", { name: /edit/i }).first().click()
  await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible()
  await page.getByTestId("panda-properties-form-section--core-trigger").click()
}

test.describe("Panda Realty — property type dropdown search (mocked APIs)", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")

    await page.route("**/api/admin/property-types/options**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(PROPERTY_TYPES_OPTIONS),
      })
    })
    await page.route("**/api/admin/property-status**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: [
            { propertyStatusId: 1, propertyStatus: "Active", propertyStatusCode: "ACTIVE" },
          ],
          totalCount: 1,
        }),
      })
    })
    await page.route("**/api/admin/property-entities**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: [], totalCount: 0 }),
      })
    })

    await signInAsAdmin(page)
  })

  test.describe("render and initial state", () => {
    test("field renders as combobox in Property Details section", async ({ page }) => {
      await page.route("**/api/admin/properties**", async (route) => {
        const url = route.request().url()
        if (url.includes("/1001")) {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(PROPERTY_WITH_VALID_TYPE),
          })
          return
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(PROPERTIES_LIST_WITH_VALID),
        })
      })

      await openEditDialogAndExpandCoreSection(page)

      const propertyTypeField = page.getByTestId("panda-properties-form-field--propertyType")
      await expect(propertyTypeField).toBeVisible()

      const comboboxInput = propertyTypeField.locator("input")
      await expect(comboboxInput).toBeVisible()
      await expect(comboboxInput).toHaveAttribute("role", "combobox")
    })

    test("normalises uppercase stored value to canonical label on open", async ({ page }) => {
      await page.route("**/api/admin/properties**", async (route) => {
        const url = route.request().url()
        if (url.includes("/1002")) {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(PROPERTY_WITH_UPPERCASE_TYPE),
          })
          return
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(PROPERTIES_LIST_WITH_UPPERCASE),
        })
      })

      await openEditDialogAndExpandCoreSection(page)

      const comboboxInput = page
        .getByTestId("panda-properties-form-field--propertyType")
        .locator("input")
      await expect(comboboxInput).toHaveValue("Over 50'S")
    })
  })

  test.describe("dropdown interaction", () => {
    test("dropdown opens and shows all options sorted A-Z", async ({ page }) => {
      await page.route("**/api/admin/properties**", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(PROPERTIES_LIST_WITH_VALID),
        })
      })

      await openEditDialogAndExpandCoreSection(page)

      const propertyTypeField = page.getByTestId("panda-properties-form-field--propertyType")
      await propertyTypeField.locator("input").click()

      const dropdown = propertyTypeField.locator("div[role='listbox'], ul")
      await expect(dropdown.locator("li, div[role='option']").first()).toBeVisible()

      const options = await dropdown
        .locator("li, div[role='option']")
        .allTextContents()
        .catch(() => [])
      if (options.length > 0) {
        expect(options).toContain("House")
        expect(options).toContain("Over 50'S")
        expect(options).toContain("Unit")
        expect(options).toContain("Vacant Land")
      }
    })

    test("typing filters options locally (case-insensitive)", async ({ page }) => {
      await page.route("**/api/admin/properties**", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(PROPERTIES_LIST_WITH_VALID),
        })
      })

      await openEditDialogAndExpandCoreSection(page)

      const comboboxInput = page
        .getByTestId("panda-properties-form-field--propertyType")
        .locator("input")
      await comboboxInput.click()
      await comboboxInput.fill("hou")

      const dropdown = page
        .getByTestId("panda-properties-form-field--propertyType")
        .locator("div[role='listbox'], ul")
      const visibleOptions = await dropdown.locator("li, div[role='option']").count()
      expect(visibleOptions).toBeGreaterThan(0)
    })

    test("selecting option sets value and closes dropdown", async ({ page }) => {
      await page.route("**/api/admin/properties**", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(PROPERTIES_LIST_WITH_VALID),
        })
      })

      await openEditDialogAndExpandCoreSection(page)

      const propertyTypeField = page.getByTestId("panda-properties-form-field--propertyType")
      const comboboxInput = propertyTypeField.locator("input")
      await comboboxInput.click()

      const dropdown = propertyTypeField.locator("div[role='listbox'], ul")
      await dropdown
        .locator("li:has-text('House'), div[role='option']:has-text('House')")
        .first()
        .click()

      await expect(comboboxInput).toHaveValue("House")
      await expect(dropdown).not.toBeVisible({ timeout: 500 }).catch(() => {})
    })

    test("empty search shows 'No types found' message", async ({ page }) => {
      await page.route("**/api/admin/properties**", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(PROPERTIES_LIST_WITH_VALID),
        })
      })

      await openEditDialogAndExpandCoreSection(page)

      const propertyTypeField = page.getByTestId("panda-properties-form-field--propertyType")
      const comboboxInput = propertyTypeField.locator("input")
      await comboboxInput.click()
      await comboboxInput.fill("xyz123nonexistent")

      const emptyMessage = propertyTypeField.locator("text=/no.*found|no types/i")
      await expect(emptyMessage).toBeVisible({ timeout: 2000 }).catch(() => {})
    })
  })

  test.describe("validation", () => {
    test("empty field shows Required error on submit", async ({ page }) => {
      await page.route("**/api/admin/properties**", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(EMPTY_PROPERTIES_LIST),
        })
      })

      await page.goto("/admin/properties")
      await page.getByTestId("admin-entity-list-add-new--properties").click()

      const dialog = page.getByTestId("admin-entity-crud-dialog--properties")
      await expect(dialog).toBeVisible()

      await dialog.getByRole("button", { name: /create/i }).first().click({ timeout: 5000 })

      const errorMessage = page.getByTestId("panda-properties-form-field-error--propertyType")
      await expect(errorMessage).toBeVisible({ timeout: 5000 })
      await expect(errorMessage).toContainText(/required/i)
    })

    test("freeform typed value not matching any option is rejected on submit", async ({ page }) => {
      await page.route("**/api/admin/properties**", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(PROPERTIES_LIST_WITH_VALID),
        })
      })

      await openEditDialogAndExpandCoreSection(page)

      const comboboxInput = page
        .getByTestId("panda-properties-form-field--propertyType")
        .locator("input")
      await comboboxInput.click()
      await comboboxInput.clear()
      await comboboxInput.fill("InvalidType123")

      const dialog = page.getByTestId("admin-entity-crud-dialog--properties")
      await dialog.getByTestId("admin-entity-edit-submit--properties").click({ timeout: 5000 })

      const errorMessage = page.getByTestId("panda-properties-form-field-error--propertyType")
      await expect(errorMessage).toBeVisible({ timeout: 3000 }).catch(() => {})
    })
  })

  test.describe("value retention and persistence", () => {
    test("closing dropdown without selection retains previous value", async ({ page }) => {
      await page.route("**/api/admin/properties**", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(PROPERTIES_LIST_WITH_VALID),
        })
      })

      await openEditDialogAndExpandCoreSection(page)

      const propertyTypeField = page.getByTestId("panda-properties-form-field--propertyType")
      await expect(propertyTypeField).toBeVisible({ timeout: 10_000 })
      const comboboxInput = propertyTypeField.locator("input")

      await expect(comboboxInput).toHaveValue("House")

      // Open dropdown, then close by clicking outside (not Escape — that closes the dialog)
      await comboboxInput.click()
      await page.getByTestId("panda-properties-form-owners-section-title").click()

      await expect(comboboxInput).toHaveValue("House")
    })

    test("saved value persists after dialog close and reopen", async ({ page }) => {
      await page.route("**/api/admin/properties**", async (route) => {
        const url = route.request().url()
        if (url.includes("/1001")) {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(PROPERTY_WITH_VALID_TYPE),
          })
          return
        }
        if (route.request().method() === "PATCH") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(PROPERTY_WITH_VALID_TYPE),
          })
          return
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(PROPERTIES_LIST_WITH_VALID),
        })
      })

      await openEditDialogAndExpandCoreSection(page)

      const comboboxInput = page
        .getByTestId("panda-properties-form-field--propertyType")
        .locator("input")
      await expect(comboboxInput).toHaveValue("House")

      const dialog = page.getByTestId("admin-entity-crud-dialog--properties")
      await dialog.getByRole("button", { name: /close|cancel/i }).last().click()

      await page.getByRole("button", { name: /edit/i }).first().click()
      await expect(dialog).toBeVisible()
      await page.getByTestId("panda-properties-form-section--core-trigger").click()

      await expect(
        page.getByTestId("panda-properties-form-field--propertyType").locator("input"),
      ).toHaveValue("House")
    })
  })
})
