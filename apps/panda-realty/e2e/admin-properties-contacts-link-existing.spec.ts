import { expect, test } from "@playwright/test"

import {
  e2eAdminCredentials,
  e2ePandaAdminListApiConfigured,
  signInAsAdmin,
} from "./helpers/admin-auth"
import {
  createPandaPropertyContact,
  createUnlinkedPandaContactEntity,
  deletePandaPropertyContactByName,
  getPandaPropertyContactByName,
} from "./helpers/panda-property-contacts-db"

const SEED_PROPERTY_STREET = "99 E2E Seed Street"

// Isolated entity used for link-existing tests — not linked to the seed property initially
const LINK_CONTACT = {
  name: "E2E Contact Link Existing (Playwright)",
  phone: "0499111222",
  email: "e2e-link-existing@example.com",
} as const

test.describe("Panda Realty admin — property Contacts tab: Link existing contact", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")
    test.skip(!e2ePandaAdminListApiConfigured, "DATABASE_URL not set")
    await deletePandaPropertyContactByName(LINK_CONTACT.name)
    await createUnlinkedPandaContactEntity(LINK_CONTACT.name, LINK_CONTACT.phone, LINK_CONTACT.email)
    await signInAsAdmin(page)
  })

  test.afterEach(async () => {
    await deletePandaPropertyContactByName(LINK_CONTACT.name)
  })

  async function openContactsTab(page: import("@playwright/test").Page) {
    await page.goto(
      `/admin/properties?limit=25&page=1&search=${encodeURIComponent(SEED_PROPERTY_STREET)}&sortKey=updatedAt&sortDir=desc`,
    )
    const editButton = page.getByTestId(/^admin-entity-row-edit--properties--/).first()
    await expect(editButton).toBeVisible({ timeout: 15_000 })
    await editButton.click()
    await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible()
    await page.getByTestId("panda-properties-form-tab-trigger--contacts").click()
    await expect(page.getByTestId("panda-properties-form-tab--contacts")).toBeVisible()
    await expect(page.getByTestId("property-contacts-add-new")).toBeEnabled({ timeout: 10_000 })
  }

  test("search combobox is visible in edit mode", async ({ page }) => {
    await openContactsTab(page)
    await expect(page.getByTestId("property-contacts-search")).toBeVisible()
  })

  test("empty search shows existing contact entities in dropdown", async ({ page }) => {
    await openContactsTab(page)
    const searchInput = page.getByTestId("property-contacts-search")
    await searchInput.focus()
    // Dropdown appears with at least the unlinked contact
    await expect(page.locator("button").filter({ hasText: LINK_CONTACT.name })).toBeVisible({
      timeout: 10_000,
    })
  })

  test("typing filters results to matching contacts", async ({ page }) => {
    await openContactsTab(page)
    const searchInput = page.getByTestId("property-contacts-search")
    await searchInput.fill("E2E Contact Link")
    await expect(page.locator("button").filter({ hasText: LINK_CONTACT.name })).toBeVisible({
      timeout: 10_000,
    })
  })

  test("no-results state shown for unmatched search term", async ({ page }) => {
    await openContactsTab(page)
    const searchInput = page.getByTestId("property-contacts-search")
    await searchInput.fill("zzzzz_no_match_xyz")
    await expect(page.getByText("No contacts found.")).toBeVisible({ timeout: 10_000 })
  })

  test("selecting a result links the contact and shows it as a card", async ({ page }) => {
    await openContactsTab(page)
    const searchInput = page.getByTestId("property-contacts-search")
    await searchInput.fill(LINK_CONTACT.name.slice(0, 15))

    const resultBtn = page.locator("button").filter({ hasText: LINK_CONTACT.name })
    await expect(resultBtn).toBeVisible({ timeout: 10_000 })
    await resultBtn.click()

    // Input clears and card appears
    await expect(searchInput).toHaveValue("")
    await expect(
      page.locator('[data-testid^="property-contact-row--"]').filter({ hasText: LINK_CONTACT.name }),
    ).toBeVisible({ timeout: 10_000 })

    // DB confirms link was created
    const saved = await getPandaPropertyContactByName(SEED_PROPERTY_STREET, LINK_CONTACT.name)
    expect(saved).not.toBeNull()
    expect(saved!.entityName).toBe(LINK_CONTACT.name)
    expect(saved!.phoneNumber).toBe(LINK_CONTACT.phone)
    expect(saved!.emailAddress).toBe(LINK_CONTACT.email)
  })

  test("duplicate guard shows Already added when linking an already-linked contact", async ({ page }) => {
    // Pre-link the contact to the property
    await deletePandaPropertyContactByName(LINK_CONTACT.name)
    await createPandaPropertyContact(SEED_PROPERTY_STREET, {
      name: LINK_CONTACT.name,
      phone: LINK_CONTACT.phone,
      email: LINK_CONTACT.email,
    })

    await openContactsTab(page)
    const searchInput = page.getByTestId("property-contacts-search")
    await searchInput.fill(LINK_CONTACT.name.slice(0, 15))

    const resultBtn = page.locator("button").filter({ hasText: LINK_CONTACT.name })
    await expect(resultBtn).toBeVisible({ timeout: 10_000 })
    await resultBtn.click()

    await expect(page.getByRole("alert")).toContainText("Already added", { timeout: 5_000 })
  })
})

test.describe("Panda Realty admin — property Contacts tab: link loading state", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")
    test.skip(!e2ePandaAdminListApiConfigured, "DATABASE_URL not set")
    await deletePandaPropertyContactByName(LINK_CONTACT.name)
    await createUnlinkedPandaContactEntity(LINK_CONTACT.name, LINK_CONTACT.phone, LINK_CONTACT.email)
    await signInAsAdmin(page)
  })

  test.afterEach(async () => {
    await deletePandaPropertyContactByName(LINK_CONTACT.name)
  })

  async function openContactsTab(page: import("@playwright/test").Page) {
    await page.goto(
      `/admin/properties?limit=25&page=1&search=${encodeURIComponent(SEED_PROPERTY_STREET)}&sortKey=updatedAt&sortDir=desc`,
    )
    const editButton = page.getByTestId(/^admin-entity-row-edit--properties--/).first()
    await expect(editButton).toBeVisible({ timeout: 15_000 })
    await editButton.click()
    await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible()
    await page.getByTestId("panda-properties-form-tab-trigger--contacts").click()
    await expect(page.getByTestId("panda-properties-form-tab--contacts")).toBeVisible()
    await expect(page.getByTestId("property-contacts-add-new")).toBeEnabled({ timeout: 10_000 })
  }

  test("input is disabled and search icon is replaced by spinner while linking", async ({ page }) => {
    // Delay the link POST so we can observe the transient loading state
    let resolveDelay!: () => void
    const delayPromise = new Promise<void>((res) => { resolveDelay = res })
    await page.route("**/api/admin/property-entities", async (route) => {
      if (route.request().method() === "POST") {
        await delayPromise
        await route.continue()
      } else {
        await route.continue()
      }
    })

    await openContactsTab(page)
    const searchInput = page.getByTestId("property-contacts-search")
    await searchInput.fill(LINK_CONTACT.name.slice(0, 15))
    const resultBtn = page.locator("button").filter({ hasText: LINK_CONTACT.name })
    await expect(resultBtn).toBeVisible({ timeout: 10_000 })
    await resultBtn.click()

    // While the request is held: input must be disabled, spinner visible
    await expect(searchInput).toBeDisabled({ timeout: 3_000 })
    await expect(page.locator('[data-testid="property-contacts-search"] ~ * svg.lucide-loader-circle, [data-testid="property-contacts-search"]').first()).toBeTruthy()

    // Release the request
    resolveDelay()

    // After completion: input re-enables, card appears
    await expect(searchInput).toBeEnabled({ timeout: 10_000 })
    await expect(
      page.locator('[data-testid^="property-contact-row--"]').filter({ hasText: LINK_CONTACT.name }),
    ).toBeVisible({ timeout: 10_000 })
  })

  test("result buttons are disabled while linking (no double-submit)", async ({ page }) => {
    let callCount = 0
    let resolveDelay!: () => void
    const delayPromise = new Promise<void>((res) => { resolveDelay = res })
    await page.route("**/api/admin/property-entities", async (route) => {
      if (route.request().method() === "POST") {
        callCount++
        await delayPromise
        await route.continue()
      } else {
        await route.continue()
      }
    })

    await openContactsTab(page)
    const searchInput = page.getByTestId("property-contacts-search")
    await searchInput.fill(LINK_CONTACT.name.slice(0, 15))
    const resultBtn = page.locator("button").filter({ hasText: LINK_CONTACT.name })
    await expect(resultBtn).toBeVisible({ timeout: 10_000 })

    // Click twice rapidly
    await resultBtn.click()
    await expect(searchInput).toBeDisabled({ timeout: 3_000 })
    // Button should now be disabled — a second click should be a no-op
    await resultBtn.dispatchEvent("click")

    resolveDelay()
    await expect(searchInput).toBeEnabled({ timeout: 10_000 })

    // Only one POST should have fired
    expect(callCount).toBe(1)
  })
})

test.describe("Panda Realty admin — property Contacts tab: create variant", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")
    test.skip(!e2ePandaAdminListApiConfigured, "DATABASE_URL not set")
    await signInAsAdmin(page)
  })

  test("search combobox is NOT shown in create variant", async ({ page }) => {
    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-list-add-new--properties")).toBeVisible({
      timeout: 15_000,
    })
    await page.getByTestId("admin-entity-list-add-new--properties").click()
    await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible()
    // Tabs only appear when isFavorite is on — toggle it to show the Contacts tab
    await page.getByTestId("panda-properties-form-switch--isFavorite").click()
    await page.getByTestId("panda-properties-form-tab-trigger--contacts").click()
    await expect(page.getByTestId("panda-properties-form-tab--contacts")).toBeVisible()
    const contactsTab = page.getByTestId("panda-properties-form-tab--contacts")
    await expect(contactsTab.getByTestId("property-contacts-search")).not.toBeVisible()
    await expect(contactsTab.getByText("Save the property first to manage contacts.")).toBeVisible()
  })
})
