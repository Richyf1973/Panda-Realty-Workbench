/**
 * E2E: Property edit dialog buyer rows use Add Meeting
 *
 * Run (from repo root):
 *   npx playwright test apps/panda-realty/e2e/admin-properties-buyer-row-add-meeting.spec.ts --config=apps/panda-realty/playwright.config.ts
 * Or via workspace script:
 *   npm run test:e2e -w panda-realty -- apps/panda-realty/e2e/admin-properties-buyer-row-add-meeting.spec.ts
 *
 * Scope:
 * - Buyer-row quick action stays visible in the Buyers tab.
 * - The action opens Add Meeting, not Add Calendar Event.
 * - The dialog pre-targets the current buyer.
 * - The action is not disabled when Google Calendar is disconnected.
 */

import { expect, test } from "@playwright/test"

import { requirePandaE2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import { openPropertyAndBuyersTab, setupBaseRoutes } from "./helpers/admin-properties-add-entity-helpers"

const PROPERTY_ENTITY_ID = 5001
const ENTITY_ID = 901
const BUYER_NAME = "TREVOR & NARELLE CLARK"

const MOCK_BUYER = {
  propertyEntityId: PROPERTY_ENTITY_ID,
  entityId: ENTITY_ID,
  entityName: BUYER_NAME,
  entityCategoryId: 1,
  address: null,
  emailAddress: "buyer@example.com",
  phoneNumber: "0400111222",
  esuburb: null,
  estate: null,
  epostcode: null,
  notes: null,
  buyerPipelineStatusId: null,
  pipelineStatusLabel: "Offer Made",
}

async function setupBuyerRow(page: import("@playwright/test").Page, calendarConnected: boolean) {
  await setupBaseRoutes(page, { entityId: ENTITY_ID, entityName: BUYER_NAME })

  await page.route("**/api/admin/properties/1001/buyers**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items: [MOCK_BUYER] }),
    })
  })

  await page.route("**/api/admin/calendar/status**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ connected: calendarConnected }),
    })
  })
}

test.describe("Property edit dialog buyer rows use Add Meeting", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaE2eAdminCredentials()
    await signInAsAdmin(page)
  })

  test("buyer row meeting action stays visible in the Buyers tab", async ({ page }) => {
    await setupBuyerRow(page, true)
    await openPropertyAndBuyersTab(page)

    await expect(page.getByTestId(`property-buyer-panel-add-event--${PROPERTY_ENTITY_ID}`)).toBeVisible()
  })

  test("buyer row action opens Add Meeting instead of Add Calendar Event", async ({ page }) => {
    await setupBuyerRow(page, true)
    await openPropertyAndBuyersTab(page)

    await page.getByTestId(`property-buyer-panel-add-event--${PROPERTY_ENTITY_ID}`).click()

    await expect(page.getByTestId("add-meeting-dialog")).toBeVisible()
    await expect(page.getByRole("heading", { name: "Add Meeting" })).toBeVisible()
    await expect(page.getByTestId("meeting-title-input")).toBeVisible()
    await expect(page.getByTestId("meeting-date-input")).toBeVisible()
    await expect(page.getByTestId("meeting-duration-input")).toBeVisible()
    await expect(page.getByTestId("meeting-notes-input")).toBeVisible()
    await expect(page.getByTestId("add-calendar-event-dialog")).toHaveCount(0)
  })

  test("buyer row meeting dialog is already targeted at the current buyer", async ({ page }) => {
    await setupBuyerRow(page, true)
    await openPropertyAndBuyersTab(page)

    await page.getByTestId(`property-buyer-panel-add-event--${PROPERTY_ENTITY_ID}`).click()

    const dialog = page.getByTestId("add-meeting-dialog")
    await expect(dialog).toBeVisible()

    const buyerSelect = dialog.getByTestId("meeting-buyer-select")
    await expect(buyerSelect).toBeVisible()
    await expect(buyerSelect).toContainText(BUYER_NAME)
    await expect(buyerSelect).not.toContainText("None")
  })

  test("buyer row meeting action still opens when Google Calendar is disconnected", async ({ page }) => {
    await setupBuyerRow(page, false)
    await openPropertyAndBuyersTab(page)

    const button = page.getByTestId(`property-buyer-panel-add-event--${PROPERTY_ENTITY_ID}`)
    await expect(button).toBeEnabled()

    await button.click()
    await expect(page.getByTestId("add-meeting-dialog")).toBeVisible()
    await expect(page.getByTestId("add-calendar-event-dialog")).toHaveCount(0)
  })
})
