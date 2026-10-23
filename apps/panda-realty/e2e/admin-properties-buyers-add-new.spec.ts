import { expect, test } from "@playwright/test"

import { e2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import {
  emptyList,
  openPropertyAndBuyersTab,
  setupBaseRoutes,
} from "./helpers/admin-properties-add-entity-helpers"

test.describe("Panda Realty admin — Add new buyer", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")
    await signInAsAdmin(page)
  })

  test('Buyers tab shows "Add new" button for a Favorite property', async ({ page }) => {
    await setupBaseRoutes(page, { entityId: 901, entityName: "Dummy" })
    await openPropertyAndBuyersTab(page)
    await expect(page.getByTestId("property-buyers-panel-add-new")).toBeVisible()
  })

  test('"Add new" in Buyers tab opens entity create dialog titled "Add Buyer" and transitions to edit profile', async ({
    page,
  }) => {
    const newEntity = {
      entityId: 999,
      entityName: "E2E New Buyer",
      entityCategoryId: 1,
      emailAddress: null,
      phoneNumber: null,
      address: null,
      entityBuyerStatuses: [],
    }

    await setupBaseRoutes(page, newEntity)

    // Override property-entities to handle the link POST
    await page.route("**/api/admin/property-entities**", async (route) => {
      if (route.request().method() === "POST") {
        const body = route.request().postDataJSON() as Record<string, unknown>
        expect(body).toMatchObject({
          entityId: "999",
          propertyListId: "1001",
          isOriginalOwner: "false",
        })
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({ propertyEntityId: 8001 }),
        })
        return
      }
      await emptyList(route)
    })

    let buyersCallCount = 0
    await page.route("**/api/admin/properties/1001/buyers**", async (route) => {
      buyersCallCount++
      if (buyersCallCount === 1) {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [] }) })
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            items: [
              {
                propertyEntityId: 8001,
                entityId: 999,
                entityName: "E2E New Buyer",
                entityCategoryId: 1,
                address: null,
                emailAddress: null,
                phoneNumber: null,
                esuburb: null,
                estate: null,
                epostcode: null,
                notes: null,
                buyerPipelineStatusId: null,
                pipelineStatusLabel: null,
              },
            ],
          }),
        })
      }
    })

    // Override entities to handle POST and GET /999
    await page.route("**/api/admin/entities**", async (route) => {
      const method = route.request().method()
      const url = route.request().url()
      if (method === "POST") {
        await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify(newEntity) })
        return
      }
      if (url.match(/\/api\/admin\/entities\/999(\?|$)/)) {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(newEntity) })
        return
      }
      await emptyList(route)
    })

    await openPropertyAndBuyersTab(page)
    await page.getByTestId("property-buyers-panel-add-new").click()

    const createDialog = page.getByTestId("admin-entity-crud-dialog--entities")
    await expect(createDialog).toBeVisible({ timeout: 10_000 })
    await expect(createDialog.getByTestId("admin-entity-create-dialog-title--entities")).toContainText("Add Buyer")
    const submitBtn = page.getByTestId("admin-entity-create-submit--entities")
    await expect(submitBtn).toContainText("Create & Edit")

    await createDialog.getByTestId("panda-entities-form-field--entityName").fill("E2E New Buyer")
    await submitBtn.click()

    await expect(createDialog).toBeVisible({ timeout: 15_000 })
    await expect(createDialog).toContainText("Edit entity")
    await expect(createDialog.getByTestId("panda-entities-form-field--entityName")).toHaveValue("E2E New Buyer")

    await createDialog.getByRole("button", { name: /^Close$/i }).click()
    const buyerRows = page.getByTestId(/^property-buyer-panel-row--/)
    await expect(buyerRows.first()).toBeVisible({ timeout: 10_000 })
    await expect(buyerRows.first()).toContainText("E2E New Buyer")
  })
})
