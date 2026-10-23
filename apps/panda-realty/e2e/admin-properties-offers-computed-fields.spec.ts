import { expect, test } from "@playwright/test"

import { e2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import {
  BUYER_OFFER_ACCEPTED,
  BUYER_OFFER_NOT_ACCEPTED,
  EMPTY_LIST_RESPONSE,
  EMPTY_PROPERTY_ENTITIES_RESPONSE,
  setupPropertyWithBuyerOffers,
  STATUS_LIST_RESPONSE,
} from "./helpers/admin-properties-mocks"

test.describe("Panda Realty admin — properties buyer offers computed fields (mocked APIs)", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")
    await page.route("**/api/admin/properties**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(EMPTY_LIST_RESPONSE),
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
    await signInAsAdmin(page)
  })

  test("sales info fields and buyer offers section are hidden when offer is accepted", async ({
    page,
  }) => {
    await setupPropertyWithBuyerOffers(page, [BUYER_OFFER_ACCEPTED, BUYER_OFFER_NOT_ACCEPTED], {
      contractDate: "2026-03-20T00:00:00.000Z",
    })

    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible()
    await page.getByTestId("admin-entity-row--properties--1001").click()
    await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible()

    await page.getByTestId("panda-properties-form-tab-trigger--sales").click()

    // Fields grid and Latest Buyer Offers are hidden when an offer is accepted
    await expect(
      page.getByTestId("panda-properties-sales-field--successfulBuyer"),
    ).not.toBeVisible()
    await expect(
      page.getByTestId("panda-properties-sales-field--contractPrice"),
    ).not.toBeVisible()
    await expect(page.getByTestId("panda-properties-form-field--appraisedAmount")).not.toBeVisible()
    await expect(page.getByTestId("panda-properties-form-field--commissionRate")).not.toBeVisible()
    await expect(page.getByTestId("panda-properties-form-section--buyer-offers")).not.toBeVisible()

    // Contract conditions section wrapper is still visible
    await expect(page.getByTestId("panda-properties-sales-accepted-offer-section")).toBeVisible()
  })

  test("sales info computed fields show dash when no offer is accepted", async ({
    page,
  }) => {
    await setupPropertyWithBuyerOffers(page, [BUYER_OFFER_NOT_ACCEPTED])

    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible()
    await page.getByTestId("admin-entity-row--properties--1001").click()
    await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible()

    await page.getByTestId("panda-properties-form-tab-trigger--sales").click()

    await expect(
      page.getByTestId("panda-properties-sales-field--successfulBuyer"),
    ).toContainText("—")
    await expect(
      page.getByTestId("panda-properties-sales-field--contractPrice"),
    ).toContainText("—")
    await expect(page.locator("#pp-contractDate")).toHaveValue("")
  })
})
