import { expect, test } from "@playwright/test"

import { requirePandaE2eAdminCredentials } from "./helpers/admin-auth"
import {
  openBuyerCompose,
  setupComposePage,
} from "./helpers/panda-gmail-compose-wysiwyg-helpers"

// ── Fixtures ─────────────────────────────────────────────────────────────────

const ENTITY_EMAILS_WITH_MEMBERS = {
  items: [
    { type: "owner", entityName: "Smith, John", emailAddress: "john@example.com" },
    { type: "buyer", entityName: "Ash D", emailAddress: "dhungelashok33@gmail.com" },
    { type: "contact", entityName: "Jane Smith", emailAddress: "jane@example.com" },
    { type: "tenant", entityName: "Bob Tenant", emailAddress: "bob@tenant.com" },
    { type: "member", entityName: "Chris Matthews", emailAddress: "chris@matthews.com" },
    { type: "member", entityName: "Merilyn Matthews", emailAddress: "merilyn@matthews.com" },
  ],
}

const ENTITY_EMAILS_MEMBERS_ONLY = {
  items: [
    { type: "member", entityName: "Chris Matthews", emailAddress: "chris@matthews.com" },
  ],
}

const ENTITY_EMAILS_NO_MEMBERS = {
  items: [
    { type: "owner", entityName: "Smith, John", emailAddress: "john@example.com" },
  ],
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function setupWithMembers(
  page: Parameters<typeof setupComposePage>[0],
  opts: Parameters<typeof setupComposePage>[1] & {
    entityEmails?: object
    entityEmailsStatus?: number
    signIn?: boolean
  } = {},
) {
  const { entityEmails, entityEmailsStatus, ...composeOpts } = opts
  await setupComposePage(page, composeOpts)
  // Register after setupComposePage (LIFO) so our fixture wins
  await page.route("**/api/admin/properties/1001/entity-emails**", async (route) => {
    const status = entityEmailsStatus ?? 200
    await route.fulfill({
      status,
      contentType: "application/json",
      body:
        status === 200
          ? JSON.stringify(entityEmails ?? ENTITY_EMAILS_WITH_MEMBERS)
          : JSON.stringify({ error: "Internal error" }),
    })
  })
}

test.describe("Panda Realty — gmail compose member recipients", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaE2eAdminCredentials()
    await setupWithMembers(page)
  })

  // ── Member group in To dropdown ───────────────────────────────────────────

  test("To dropdown shows MEMBER group alongside existing groups", async ({ page }) => {
    await openBuyerCompose(page)

    await page.getByTestId("property-gmail-compose-to-text-input").click()

    await expect(page.getByTestId("property-gmail-compose-to-dropdown")).toBeVisible()
    await expect(page.getByTestId("property-gmail-compose-to-group--owner")).toBeVisible()
    await expect(page.getByTestId("property-gmail-compose-to-group--buyer")).toBeVisible()
    await expect(page.getByTestId("property-gmail-compose-to-group--contact")).toBeVisible()
    await expect(page.getByTestId("property-gmail-compose-to-group--tenant")).toBeVisible()
    await expect(page.getByTestId("property-gmail-compose-to-group--member")).toBeVisible()
  })

  test("To dropdown lists member options with name and email", async ({ page }) => {
    await openBuyerCompose(page)

    await page.getByTestId("property-gmail-compose-to-text-input").click()

    await expect(
      page.getByTestId("property-gmail-compose-to-option--chris@matthews.com"),
    ).toBeVisible()
    await expect(
      page.getByTestId("property-gmail-compose-to-option--merilyn@matthews.com"),
    ).toBeVisible()
  })

  test("selecting a member from To dropdown adds their email as a chip", async ({ page }) => {
    await openBuyerCompose(page)

    await page.getByTestId("property-gmail-compose-to-text-input").click()
    await page.getByTestId("property-gmail-compose-to-option--chris@matthews.com").click()

    const chips = page.getByTestId("property-gmail-compose-to-chip")
    await expect(chips).toHaveCount(2)
    await expect(chips.nth(1)).toContainText("chris@matthews.com")
    await expect(page.getByTestId("property-gmail-compose-to-dropdown")).not.toBeVisible()
  })

  // ── Member group in CC / BCC dropdowns ────────────────────────────────────

  test("CC dropdown shows MEMBER group", async ({ page }) => {
    await openBuyerCompose(page)

    await page.getByTestId("property-gmail-compose-cc-bcc-toggle").click()
    await page.getByTestId("property-gmail-compose-cc-text-input").click()

    await expect(page.getByTestId("property-gmail-compose-cc-dropdown")).toBeVisible()
    await expect(page.getByTestId("property-gmail-compose-cc-group--member")).toBeVisible()
    await expect(
      page.getByTestId("property-gmail-compose-cc-option--chris@matthews.com"),
    ).toBeVisible()
  })

  test("selecting a member from CC dropdown adds chip to CC", async ({ page }) => {
    await openBuyerCompose(page)

    await page.getByTestId("property-gmail-compose-cc-bcc-toggle").click()
    await page.getByTestId("property-gmail-compose-cc-text-input").click()
    await page.getByTestId("property-gmail-compose-cc-option--merilyn@matthews.com").click()

    await expect(page.getByTestId("property-gmail-compose-cc-chip").first()).toContainText(
      "merilyn@matthews.com",
    )
    await expect(page.getByTestId("property-gmail-compose-cc-dropdown")).not.toBeVisible()
  })

  test("BCC dropdown shows MEMBER group", async ({ page }) => {
    await openBuyerCompose(page)

    await page.getByTestId("property-gmail-compose-cc-bcc-toggle").click()
    await page.getByTestId("property-gmail-compose-bcc-text-input").click()

    await expect(page.getByTestId("property-gmail-compose-bcc-dropdown")).toBeVisible()
    await expect(page.getByTestId("property-gmail-compose-bcc-group--member")).toBeVisible()
  })

  test("selecting a member from BCC dropdown adds chip to BCC", async ({ page }) => {
    await openBuyerCompose(page)

    await page.getByTestId("property-gmail-compose-cc-bcc-toggle").click()
    await page.getByTestId("property-gmail-compose-bcc-text-input").click()
    await page.getByTestId("property-gmail-compose-bcc-option--chris@matthews.com").click()

    await expect(page.getByTestId("property-gmail-compose-bcc-chip").first()).toContainText(
      "chris@matthews.com",
    )
    await expect(page.getByTestId("property-gmail-compose-bcc-dropdown")).not.toBeVisible()
  })

  // ── Filtering ─────────────────────────────────────────────────────────────

  test("typing a member name substring narrows MEMBER group in To dropdown", async ({ page }) => {
    await openBuyerCompose(page)

    await page.getByTestId("property-gmail-compose-to-text-input").fill("Chris")

    await expect(
      page.getByTestId("property-gmail-compose-to-option--chris@matthews.com"),
    ).toBeVisible()
    await expect(
      page.getByTestId("property-gmail-compose-to-option--merilyn@matthews.com"),
    ).not.toBeVisible()
    // Non-member entries also filtered
    await expect(
      page.getByTestId("property-gmail-compose-to-option--john@example.com"),
    ).not.toBeVisible()
  })

  test("typing a member email substring narrows MEMBER group in To dropdown", async ({ page }) => {
    await openBuyerCompose(page)

    await page.getByTestId("property-gmail-compose-to-text-input").fill("merilyn@")

    await expect(
      page.getByTestId("property-gmail-compose-to-option--merilyn@matthews.com"),
    ).toBeVisible()
    await expect(
      page.getByTestId("property-gmail-compose-to-option--chris@matthews.com"),
    ).not.toBeVisible()
  })

  // ── Empty MEMBER group hidden ─────────────────────────────────────────────

  test("MEMBER group absent from To dropdown when no members have emails", async ({ page }) => {
    await setupWithMembers(page, { entityEmails: ENTITY_EMAILS_NO_MEMBERS, signIn: false })
    await openBuyerCompose(page)

    await page.getByTestId("property-gmail-compose-to-text-input").click()

    await expect(page.getByTestId("property-gmail-compose-to-group--owner")).toBeVisible()
    await expect(
      page.getByTestId("property-gmail-compose-to-group--member"),
    ).not.toBeVisible()
  })

  test("MEMBER group is the only group shown when only member emails exist", async ({ page }) => {
    await setupWithMembers(page, { entityEmails: ENTITY_EMAILS_MEMBERS_ONLY, signIn: false })
    await openBuyerCompose(page)

    await page.getByTestId("property-gmail-compose-to-text-input").click()

    await expect(page.getByTestId("property-gmail-compose-to-group--member")).toBeVisible()
    await expect(
      page.getByTestId("property-gmail-compose-to-group--owner"),
    ).not.toBeVisible()
    await expect(
      page.getByTestId("property-gmail-compose-to-group--buyer"),
    ).not.toBeVisible()
  })

  // ── Endpoint failure ──────────────────────────────────────────────────────

  test("compose remains functional when entity-emails returns 500 (no MEMBER group)", async ({
    page,
  }) => {
    await setupWithMembers(page, { entityEmailsStatus: 500, signIn: false })
    await openBuyerCompose(page)

    await expect(page.getByTestId("property-gmail-compose-dialog")).toBeVisible()
    await expect(page.getByTestId("property-gmail-compose-to-chip").first()).toContainText(
      "dhungelashok33@gmail.com",
    )
    await expect(page.getByTestId("property-gmail-compose-send")).toBeEnabled()
    // clicking text input doesn't crash
    await page.getByTestId("property-gmail-compose-to-text-input").click()
    await expect(page.getByTestId("property-gmail-compose-dialog")).toBeVisible()
    // no MEMBER group in dropdown (no options at all)
    await expect(
      page.getByTestId("property-gmail-compose-to-group--member"),
    ).not.toBeVisible()
  })
})
