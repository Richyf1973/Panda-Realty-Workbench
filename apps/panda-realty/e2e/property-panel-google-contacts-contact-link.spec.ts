import { expect, test } from "@playwright/test"

import { requirePandaE2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import {
  EMPTY_LIST,
  GOOGLE_CONTACTS_WARNING,
  LINKED_CONTACT_ROW,
  PROPERTY_LIST_ID,
  SEARCH_CONTACT_RESULT,
  mountPropertyRoutes,
  openPropertyDialog,
} from "./helpers/property-fixtures"

test.describe("Panda Realty — Google Contacts sync on buyer/contact link", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaE2eAdminCredentials()
    await signInAsAdmin(page)
  })

  test("linking existing contact fires POST property-entities and shows Google Contacts warning", async ({
    page,
  }) => {
    await mountPropertyRoutes(page)

    let contactLinked = false

    await page.route("**/api/admin/properties/1001/contacts**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: contactLinked ? [LINKED_CONTACT_ROW] : [] }),
      })
    })

    await page.route("**/api/admin/properties/1001/buyers**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_LIST) })
    })

    await page.route("**/api/admin/contact-categories**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_LIST) })
    })

    await page.route(/\/api\/admin\/entities(\?|$)/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(SEARCH_CONTACT_RESULT),
      })
    })

    await page.route(/\/api\/admin\/property-entities(\?|$)/, async (route) => {
      if (route.request().method() === "POST") {
        contactLinked = true
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            propertyEntityId: 99,
            entityId: 55,
            propertyListId: PROPERTY_LIST_ID,
            googleContactsWarnings: [GOOGLE_CONTACTS_WARNING],
          }),
        })
        return
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: [], totalCount: 0, limit: 20 }),
      })
    })

    await openPropertyDialog(page)

    await page.getByTestId("panda-properties-form-tab-trigger--contacts").click()
    await expect(page.getByTestId("panda-properties-form-tab--contacts")).toBeVisible()

    const searchInput = page.getByTestId("property-contacts-search")
    await expect(searchInput).toBeVisible()
    await searchInput.focus()

    const mcauleyBtn = page.locator("button").filter({ hasText: "McAuley Law" })
    await expect(mcauleyBtn).toBeVisible({ timeout: 8_000 })

    const [postResponse] = await Promise.all([
      page.waitForResponse(
        (res) =>
          /\/api\/admin\/property-entities(\?|$)/.test(res.url()) &&
          res.request().method() === "POST",
      ),
      mcauleyBtn.click(),
    ])
    expect(postResponse.status()).toBe(201)

    const banner = page.getByTestId("panda-google-contacts-warning-banner")
    await expect(banner).toBeVisible({ timeout: 5_000 })
    await expect(banner.getByText(GOOGLE_CONTACTS_WARNING)).toBeVisible()

    await expect(
      page.locator('[data-testid^="property-contact-row--"]').filter({ hasText: "McAuley Law" }),
    ).toBeVisible()

    await banner.getByTestId("panda-google-contacts-warning-banner-dismiss").click()
    await expect(banner).toHaveCount(0)
  })

  test("adding new contact via panel dialog fires POST property-entities and shows Google Contacts warning", async ({
    page,
  }) => {
    await mountPropertyRoutes(page)

    let contactCreated = false

    await page.route("**/api/admin/properties/1001/contacts**", async (route) => {
      const row = {
        ...LINKED_CONTACT_ROW,
        entityId: 56,
        entityName: "Blanche Ricci",
        emailAddress: "blanchecarolina@outlook.it",
        phoneNumber: "+614892854005",
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: contactCreated ? [row] : [] }),
      })
    })

    await page.route("**/api/admin/properties/1001/buyers**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_LIST) })
    })

    await page.route("**/api/admin/contact-categories**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_LIST) })
    })

    await page.route(/\/api\/admin\/entities(\?|$)/, async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({ entityId: 56, entityName: "Blanche Ricci" }),
        })
        return
      }
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_LIST) })
    })

    await page.route(/\/api\/admin\/property-entities(\?|$)/, async (route) => {
      if (route.request().method() === "POST") {
        contactCreated = true
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            propertyEntityId: 99,
            entityId: 56,
            propertyListId: PROPERTY_LIST_ID,
            googleContactsWarnings: [GOOGLE_CONTACTS_WARNING],
          }),
        })
        return
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: [], totalCount: 0, limit: 20 }),
      })
    })

    await openPropertyDialog(page)

    await page.getByTestId("panda-properties-form-tab-trigger--contacts").click()
    await expect(page.getByTestId("panda-properties-form-tab--contacts")).toBeVisible()

    await page.getByTestId("property-contacts-add-new").click()
    const contactDialog = page.getByTestId("property-contact-dialog")
    await expect(contactDialog).toBeVisible()

    await contactDialog.getByTestId("property-contact-dialog-name").fill("Blanche Ricci")
    await contactDialog.getByTestId("property-contact-dialog-email").fill("blanchecarolina@outlook.it")

    const [postPropEntityRes] = await Promise.all([
      page.waitForResponse(
        (res) =>
          /\/api\/admin\/property-entities(\?|$)/.test(res.url()) &&
          res.request().method() === "POST",
      ),
      contactDialog.getByTestId("property-contact-dialog-save").click(),
    ])
    expect(postPropEntityRes.status()).toBe(201)

    const banner = page.getByTestId("panda-google-contacts-warning-banner")
    await expect(banner).toBeVisible({ timeout: 5_000 })
    await expect(banner.getByText(GOOGLE_CONTACTS_WARNING)).toBeVisible()

    await expect(
      page.locator('[data-testid^="property-contact-row--"]').filter({ hasText: "Blanche Ricci" }),
    ).toBeVisible()
  })

  test("no warning banner when POST property-entities succeeds without warnings", async ({
    page,
  }) => {
    await mountPropertyRoutes(page)

    let contactLinked = false

    await page.route("**/api/admin/properties/1001/contacts**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: contactLinked ? [LINKED_CONTACT_ROW] : [] }),
      })
    })

    await page.route("**/api/admin/properties/1001/buyers**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_LIST) })
    })

    await page.route("**/api/admin/contact-categories**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_LIST) })
    })

    await page.route(/\/api\/admin\/entities(\?|$)/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(SEARCH_CONTACT_RESULT),
      })
    })

    await page.route(/\/api\/admin\/property-entities(\?|$)/, async (route) => {
      if (route.request().method() === "POST") {
        contactLinked = true
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            propertyEntityId: 99,
            entityId: 55,
            propertyListId: PROPERTY_LIST_ID,
          }),
        })
        return
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: [], totalCount: 0, limit: 20 }),
      })
    })

    await openPropertyDialog(page)

    await page.getByTestId("panda-properties-form-tab-trigger--contacts").click()
    await expect(page.getByTestId("panda-properties-form-tab--contacts")).toBeVisible()

    const searchInput = page.getByTestId("property-contacts-search")
    await searchInput.focus()
    const mcauleyBtn = page.locator("button").filter({ hasText: "McAuley Law" })
    await expect(mcauleyBtn).toBeVisible({ timeout: 8_000 })

    await Promise.all([
      page.waitForResponse(
        (res) =>
          /\/api\/admin\/property-entities(\?|$)/.test(res.url()) &&
          res.request().method() === "POST",
      ),
      mcauleyBtn.click(),
    ])

    await expect(
      page.locator('[data-testid^="property-contact-row--"]').filter({ hasText: "McAuley Law" }),
    ).toBeVisible()

    await expect(page.getByTestId("panda-google-contacts-warning-banner")).toHaveCount(0)
  })
})
