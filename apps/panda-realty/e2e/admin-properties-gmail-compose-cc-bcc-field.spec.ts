import { expect, test } from "@playwright/test"

import { requirePandaE2eAdminCredentials } from "./helpers/admin-auth"
import {
  ENTITY_EMAILS_ALL,
  openBuyerCompose,
  setupComposePage,
} from "./helpers/panda-gmail-compose-wysiwyg-helpers"

// ── Fixtures ─────────────────────────────────────────────────────────────────

const ENTITY_EMAILS_OWNER_ONLY = {
  items: [{ type: "owner", entityName: "Smith, John", emailAddress: "john@example.com" }],
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function setupWithEntityEmails(
  page: Parameters<typeof setupComposePage>[0],
  opts: Parameters<typeof setupComposePage>[1] & {
    entityEmails?: object
    entityEmailsStatus?: number
    signIn?: boolean
  } = {},
) {
  const { entityEmails, entityEmailsStatus, ...composeOpts } = opts
  await setupComposePage(page, composeOpts)
  await page.route("**/api/admin/properties/1001/entity-emails**", async (route) => {
    const status = entityEmailsStatus ?? 200
    await route.fulfill({
      status,
      contentType: "application/json",
      body:
        status === 200
          ? JSON.stringify(entityEmails ?? ENTITY_EMAILS_ALL)
          : JSON.stringify({ error: "Internal error" }),
    })
  })
}

test.describe("Panda Realty — gmail compose CC / BCC autocomplete", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaE2eAdminCredentials()
    await setupWithEntityEmails(page)
  })

  // ── CC autocomplete dropdown ──────────────────────────────────────────────

  test("CC text input shows entity autocomplete dropdown on click", async ({ page }) => {
    await openBuyerCompose(page)

    await page.getByTestId("property-gmail-compose-cc-bcc-toggle").click()
    await page.getByTestId("property-gmail-compose-cc-text-input").click()

    await expect(page.getByTestId("property-gmail-compose-cc-dropdown")).toBeVisible()
    await expect(page.getByTestId("property-gmail-compose-cc-group--owner")).toBeVisible()
    await expect(page.getByTestId("property-gmail-compose-cc-group--buyer")).toBeVisible()
    await expect(page.getByTestId("property-gmail-compose-cc-group--contact")).toBeVisible()
    await expect(page.getByTestId("property-gmail-compose-cc-group--tenant")).toBeVisible()
    await expect(page.getByTestId("property-gmail-compose-cc-group--member")).toBeVisible()
  })

  test("selecting entity from CC dropdown adds chip to CC field", async ({ page }) => {
    await openBuyerCompose(page)

    await page.getByTestId("property-gmail-compose-cc-bcc-toggle").click()
    await page.getByTestId("property-gmail-compose-cc-text-input").click()
    await page.getByTestId("property-gmail-compose-cc-option--jane@example.com").click()

    await expect(page.getByTestId("property-gmail-compose-cc-chip").first()).toContainText(
      "jane@example.com",
    )
    await expect(page.getByTestId("property-gmail-compose-cc-dropdown")).not.toBeVisible()
    await expect(page.getByTestId("property-gmail-compose-cc-text-input")).toHaveValue("")
  })

  test("CC dropdown filters by typing", async ({ page }) => {
    await openBuyerCompose(page)

    await page.getByTestId("property-gmail-compose-cc-bcc-toggle").click()
    await page.getByTestId("property-gmail-compose-cc-text-input").fill("Smith")

    await expect(page.getByTestId("property-gmail-compose-cc-option--john@example.com")).toBeVisible()
    await expect(page.getByTestId("property-gmail-compose-cc-option--jane@example.com")).toBeVisible()
    await expect(page.getByTestId("property-gmail-compose-cc-option--bob@tenant.com")).not.toBeVisible()
  })

  // ── BCC autocomplete dropdown ─────────────────────────────────────────────

  test("BCC text input shows entity autocomplete dropdown on click", async ({ page }) => {
    await openBuyerCompose(page)

    await page.getByTestId("property-gmail-compose-cc-bcc-toggle").click()
    await page.getByTestId("property-gmail-compose-bcc-text-input").click()

    await expect(page.getByTestId("property-gmail-compose-bcc-dropdown")).toBeVisible()
    await expect(page.getByTestId("property-gmail-compose-bcc-group--owner")).toBeVisible()
  })

  test("selecting entity from BCC dropdown adds chip to BCC field", async ({ page }) => {
    await openBuyerCompose(page)

    await page.getByTestId("property-gmail-compose-cc-bcc-toggle").click()
    await page.getByTestId("property-gmail-compose-bcc-text-input").click()
    await page.getByTestId("property-gmail-compose-bcc-option--bob@tenant.com").click()

    await expect(page.getByTestId("property-gmail-compose-bcc-chip").first()).toContainText(
      "bob@tenant.com",
    )
    await expect(page.getByTestId("property-gmail-compose-bcc-dropdown")).not.toBeVisible()
  })

  // ── Only groups with members shown ────────────────────────────────────────

  test("empty entity type groups are hidden from To dropdown", async ({ page }) => {
    await setupWithEntityEmails(page, { entityEmails: ENTITY_EMAILS_OWNER_ONLY, signIn: false })
    await openBuyerCompose(page)

    await page.getByTestId("property-gmail-compose-to-text-input").click()

    await expect(page.getByTestId("property-gmail-compose-to-group--owner")).toBeVisible()
    await expect(page.getByTestId("property-gmail-compose-to-group--buyer")).not.toBeVisible()
    await expect(page.getByTestId("property-gmail-compose-to-group--contact")).not.toBeVisible()
    await expect(page.getByTestId("property-gmail-compose-to-group--tenant")).not.toBeVisible()
    await expect(page.getByTestId("property-gmail-compose-to-group--member")).not.toBeVisible()
  })

  // ── entity-emails endpoint failure ────────────────────────────────────────

  test("compose is functional when entity-emails endpoint returns 500", async ({ page }) => {
    await setupWithEntityEmails(page, { entityEmailsStatus: 500, signIn: false })
    await openBuyerCompose(page)

    await expect(page.getByTestId("property-gmail-compose-dialog")).toBeVisible()
    await expect(page.getByTestId("property-gmail-compose-to-chip").first()).toContainText(
      "dhungelashok33@gmail.com",
    )
    await expect(page.getByTestId("property-gmail-compose-send")).toBeEnabled()
    await page.getByTestId("property-gmail-compose-to-text-input").click()
    await expect(page.getByTestId("property-gmail-compose-dialog")).toBeVisible()
  })
})
