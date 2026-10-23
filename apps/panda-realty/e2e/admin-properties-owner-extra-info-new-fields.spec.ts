import { expect, test } from "@playwright/test"

import { signInAsAdmin } from "./helpers/admin-auth"
import { STATUS_LIST_RESPONSE } from "./helpers/admin-properties-mocks"
import {
  BASE_PROPERTY,
  PROPERTY_ONE_OWNER,
  PROPERTY_THREE_OWNERS,
  PROPERTY_TWO_OWNERS,
  makeListResponse,
  openPropertyEditDialog,
  registerPropertyRoutes,
} from "./helpers/panda-properties-owners-helpers"

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const PROPERTY_OWNER1_EXTRA_FIELDS = {
  ...PROPERTY_ONE_OWNER,
  propertyListId: 1001,
  owner1nameLine2: "Trading As JS Holdings",
  owner1acn: "123 456 789",
  owner1gstRegistered: "Yes",
  owner1address2: "Unit 5",
  owner1fax: "0700000001",
  owner1mobile: "0411000000",
  owner1abn: "12 345 678 901",
}

const PROPERTY_OWNER2_EXTRA_FIELDS = {
  ...PROPERTY_TWO_OWNERS,
  propertyListId: 1001,
  owner2nameLine2: "Co-owner Holdings",
  owner2acn: "987 654 321",
  owner2gstRegistered: "No",
  owner2address2: "Level 3",
  owner2fax: "0700000002",
  owner2mobile: "0422000000",
  owner2abn: "98 765 432 100",
}

const PROPERTY_OWNER3_EXTRA_FIELDS = {
  ...PROPERTY_THREE_OWNERS,
  propertyListId: 1001,
  owner3nameLine2: "Third Owner Name 2",
  owner3acn: "111 222 333",
  owner3gstRegistered: "No",
  owner3address2: "Suite 1",
  owner3fax: "0700000003",
  owner3mobile: "0433000000",
  owner3abn: "11 222 333 444",
}

async function openOwnerExtraInfoDialog(page: Parameters<typeof openPropertyEditDialog>[0], ownerNum: 1 | 2 | 3) {
  await page.getByTestId(`property-owner-more-info--${ownerNum}`).click()
  await expect(page.getByRole("dialog", { name: `Owner ${ownerNum}` })).toBeVisible()
}

async function setupOwnerDialogRoutes({ page }: { page: Parameters<typeof signInAsAdmin>[0] }) {
  await signInAsAdmin(page)
  await page.route("**/api/admin/property-status**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(STATUS_LIST_RESPONSE) })
  })
  await page.route("**/api/admin/properties/1001/buyers**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [] }) })
  })
  await page.route("**/api/admin/properties/1001/contacts**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [] }) })
  })
  await page.route("**/api/admin/properties/1001/tenants**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [] }) })
  })
}

// ─── Owner 1 dialog new fields ────────────────────────────────────────────────

test.describe("Owner extra-info dialog — owner 1 new fields", () => {
  test.beforeEach(setupOwnerDialogRoutes)

  test("Name (line 2) field visible in owner 1 dialog", async ({ page }) => {
    await openPropertyEditDialog(page, PROPERTY_OWNER1_EXTRA_FIELDS as typeof BASE_PROPERTY)
    await openOwnerExtraInfoDialog(page, 1)
    await expect(page.getByTestId("panda-properties-form-field--owner1nameLine2")).toBeVisible()
  })

  test("ACN field visible in owner 1 dialog", async ({ page }) => {
    await openPropertyEditDialog(page, PROPERTY_OWNER1_EXTRA_FIELDS as typeof BASE_PROPERTY)
    await openOwnerExtraInfoDialog(page, 1)
    await expect(page.getByTestId("panda-properties-form-field--owner1acn")).toBeVisible()
  })

  test("GST registered field visible in owner 1 dialog", async ({ page }) => {
    await openPropertyEditDialog(page, PROPERTY_OWNER1_EXTRA_FIELDS as typeof BASE_PROPERTY)
    await openOwnerExtraInfoDialog(page, 1)
    await expect(page.getByTestId("panda-properties-form-field--owner1gstRegistered")).toBeVisible()
  })

  test("Address (line 2) field visible in owner 1 dialog", async ({ page }) => {
    await openPropertyEditDialog(page, PROPERTY_OWNER1_EXTRA_FIELDS as typeof BASE_PROPERTY)
    await openOwnerExtraInfoDialog(page, 1)
    await expect(page.getByTestId("panda-properties-form-field--owner1address2")).toBeVisible()
  })

  test("Fax field visible in owner 1 dialog", async ({ page }) => {
    await openPropertyEditDialog(page, PROPERTY_OWNER1_EXTRA_FIELDS as typeof BASE_PROPERTY)
    await openOwnerExtraInfoDialog(page, 1)
    await expect(page.getByTestId("panda-properties-form-field--owner1fax")).toBeVisible()
  })

  test("Owner 1 dialog pre-populates all new fields from property data", async ({ page }) => {
    await openPropertyEditDialog(page, PROPERTY_OWNER1_EXTRA_FIELDS as typeof BASE_PROPERTY)
    await openOwnerExtraInfoDialog(page, 1)
    await expect(page.getByTestId("panda-properties-form-field--owner1nameLine2").locator("input")).toHaveValue("Trading As JS Holdings")
    await expect(page.getByTestId("panda-properties-form-field--owner1acn").locator("input")).toHaveValue("123 456 789")
    await expect(page.getByTestId("panda-properties-form-field--owner1address2").locator("input")).toHaveValue("Unit 5")
    await expect(page.getByTestId("panda-properties-form-field--owner1fax").locator("input")).toHaveValue("0700000001")
  })
})

// ─── Owner 2 dialog — ABN now shown ──────────────────────────────────────────

test.describe("Owner extra-info dialog — owner 2 ABN now visible", () => {
  test.beforeEach(setupOwnerDialogRoutes)

  test("ABN field visible in owner 2 dialog", async ({ page }) => {
    await openPropertyEditDialog(page, PROPERTY_OWNER2_EXTRA_FIELDS as typeof BASE_PROPERTY)
    await openOwnerExtraInfoDialog(page, 2)
    await expect(page.getByTestId("panda-properties-form-field--owner2abn")).toBeVisible()
  })

  test("Owner 2 dialog shows all new extra fields", async ({ page }) => {
    await openPropertyEditDialog(page, PROPERTY_OWNER2_EXTRA_FIELDS as typeof BASE_PROPERTY)
    await openOwnerExtraInfoDialog(page, 2)
    await expect(page.getByTestId("panda-properties-form-field--owner2nameLine2")).toBeVisible()
    await expect(page.getByTestId("panda-properties-form-field--owner2acn")).toBeVisible()
    await expect(page.getByTestId("panda-properties-form-field--owner2fax")).toBeVisible()
  })

  test("Owner 2 new fields pre-populated from property data", async ({ page }) => {
    await openPropertyEditDialog(page, PROPERTY_OWNER2_EXTRA_FIELDS as typeof BASE_PROPERTY)
    await openOwnerExtraInfoDialog(page, 2)
    await expect(page.getByTestId("panda-properties-form-field--owner2acn").locator("input")).toHaveValue("987 654 321")
    await expect(page.getByTestId("panda-properties-form-field--owner2fax").locator("input")).toHaveValue("0700000002")
    await expect(page.getByTestId("panda-properties-form-field--owner2abn").locator("input")).toHaveValue("98 765 432 100")
  })
})

// ─── Owner 3 dialog ───────────────────────────────────────────────────────────

test.describe("Owner extra-info dialog — owner 3 new fields", () => {
  test.beforeEach(setupOwnerDialogRoutes)

  test("Owner 3 dialog shows all 7 fields (including new ones)", async ({ page }) => {
    await openPropertyEditDialog(page, PROPERTY_OWNER3_EXTRA_FIELDS as typeof BASE_PROPERTY)
    await openOwnerExtraInfoDialog(page, 3)
    await expect(page.getByTestId("panda-properties-form-field--owner3nameLine2")).toBeVisible()
    await expect(page.getByTestId("panda-properties-form-field--owner3acn")).toBeVisible()
    await expect(page.getByTestId("panda-properties-form-field--owner3abn")).toBeVisible()
    await expect(page.getByTestId("panda-properties-form-field--owner3mobile")).toBeVisible()
    await expect(page.getByTestId("panda-properties-form-field--owner3fax")).toBeVisible()
  })

  test("Owner 3 new fields pre-populated", async ({ page }) => {
    await openPropertyEditDialog(page, PROPERTY_OWNER3_EXTRA_FIELDS as typeof BASE_PROPERTY)
    await openOwnerExtraInfoDialog(page, 3)
    await expect(page.getByTestId("panda-properties-form-field--owner3acn").locator("input")).toHaveValue("111 222 333")
    await expect(page.getByTestId("panda-properties-form-field--owner3abn").locator("input")).toHaveValue("11 222 333 444")
    await expect(page.getByTestId("panda-properties-form-field--owner3mobile").locator("input")).toHaveValue("0433000000")
  })
})
