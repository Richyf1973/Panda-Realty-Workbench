import { expect, test } from "@playwright/test"

import { requirePandaE2eAdminCredentials } from "./helpers/admin-auth"
import {
  ENTITY_EMAILS_ALL,
  openBuyerCompose,
  setupComposePage,
} from "./helpers/panda-gmail-compose-wysiwyg-helpers"
import { parseFormDataBody } from "./helpers/panda-properties-gmail-helpers"

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
  // setupComposePage registers a wildcard entity-emails route; register our specific
  // override AFTER so LIFO gives our handler priority over the helper's default.
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

test.describe("Panda Realty — gmail compose multi-recipient To / CC / BCC", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaE2eAdminCredentials()
    await setupWithEntityEmails(page)
  })

  // ── To field: chip-based input ────────────────────────────────────────────

  test("compose opens with seed entity shown as a chip in To, not as input value", async ({ page }) => {
    await openBuyerCompose(page)

    await expect(page.getByTestId("property-gmail-compose-to-chip").first()).toContainText(
      "dhungelashok33@gmail.com",
    )
    await expect(page.getByTestId("property-gmail-compose-to-text-input")).toHaveValue("")
  })

  test("clicking To text input shows entity autocomplete dropdown", async ({ page }) => {
    await openBuyerCompose(page)

    await page.getByTestId("property-gmail-compose-to-text-input").click()

    await expect(page.getByTestId("property-gmail-compose-to-dropdown")).toBeVisible()
    await expect(page.getByTestId("property-gmail-compose-to-group--owner")).toBeVisible()
    await expect(page.getByTestId("property-gmail-compose-to-group--buyer")).toBeVisible()
    await expect(page.getByTestId("property-gmail-compose-to-group--contact")).toBeVisible()
    await expect(page.getByTestId("property-gmail-compose-to-group--tenant")).toBeVisible()
    await expect(page.getByTestId("property-gmail-compose-to-group--member")).toBeVisible()
  })

  test("selecting entity from To dropdown adds a second chip, keeping the first", async ({ page }) => {
    await openBuyerCompose(page)

    await page.getByTestId("property-gmail-compose-to-text-input").click()
    await page.getByTestId("property-gmail-compose-to-option--john@example.com").click()

    const chips = page.getByTestId("property-gmail-compose-to-chip")
    await expect(chips).toHaveCount(2)
    await expect(chips.nth(0)).toContainText("dhungelashok33@gmail.com")
    await expect(chips.nth(1)).toContainText("john@example.com")
    await expect(page.getByTestId("property-gmail-compose-to-dropdown")).not.toBeVisible()
  })

  test("typing custom email in To and pressing Enter adds it as a chip", async ({ page }) => {
    await openBuyerCompose(page)

    await page.getByTestId("property-gmail-compose-to-text-input").fill("external@example.com")
    await page.getByTestId("property-gmail-compose-to-text-input").press("Enter")

    await expect(page.getByTestId("property-gmail-compose-to-chip")).toHaveCount(2)
    await expect(page.getByTestId("property-gmail-compose-to-chip").nth(1)).toContainText(
      "external@example.com",
    )
    await expect(page.getByTestId("property-gmail-compose-to-text-input")).toHaveValue("")
  })

  test("clicking × on a To chip removes it", async ({ page }) => {
    await openBuyerCompose(page)

    // Add second chip so we can remove the first without emptying To entirely
    await page.getByTestId("property-gmail-compose-to-text-input").click()
    await page.getByTestId("property-gmail-compose-to-option--john@example.com").click()
    await expect(page.getByTestId("property-gmail-compose-to-chip")).toHaveCount(2)

    await page.getByTestId("property-gmail-compose-to-chip").first().getByRole("button").click()

    await expect(page.getByTestId("property-gmail-compose-to-chip")).toHaveCount(1)
    await expect(page.getByTestId("property-gmail-compose-to-chip").first()).toContainText(
      "john@example.com",
    )
  })

  test("To dropdown filters by typed name substring", async ({ page }) => {
    await openBuyerCompose(page)

    await page.getByTestId("property-gmail-compose-to-text-input").fill("Jane")

    await expect(page.getByTestId("property-gmail-compose-to-option--jane@example.com")).toBeVisible()
    await expect(page.getByTestId("property-gmail-compose-to-option--john@example.com")).not.toBeVisible()
    await expect(page.getByTestId("property-gmail-compose-to-option--dhungelashok33@gmail.com")).not.toBeVisible()
  })

  test("To dropdown filters by typed email substring", async ({ page }) => {
    await openBuyerCompose(page)

    await page.getByTestId("property-gmail-compose-to-text-input").fill("bob@")

    await expect(page.getByTestId("property-gmail-compose-to-option--bob@tenant.com")).toBeVisible()
    await expect(page.getByTestId("property-gmail-compose-to-option--jane@example.com")).not.toBeVisible()
  })

  // ── Empty To disables Send ────────────────────────────────────────────────

  test("removing all To chips disables Send", async ({ page }) => {
    await openBuyerCompose(page)

    // seed chip is already there; remove it
    await page.getByTestId("property-gmail-compose-to-chip").first().getByRole("button").click()
    await expect(page.getByTestId("property-gmail-compose-to-chip")).toHaveCount(0)

    await expect(page.getByTestId("property-gmail-compose-send")).toBeDisabled()
  })

  test("adding a chip back to empty To re-enables Send", async ({ page }) => {
    await openBuyerCompose(page)

    await page.getByTestId("property-gmail-compose-to-chip").first().getByRole("button").click()
    await expect(page.getByTestId("property-gmail-compose-send")).toBeDisabled()

    await page.getByTestId("property-gmail-compose-to-text-input").fill("re@added.com")
    await page.getByTestId("property-gmail-compose-to-text-input").press("Enter")

    await expect(page.getByTestId("property-gmail-compose-send")).toBeEnabled()
  })

  // ── Invalid To chip disables Send ─────────────────────────────────────────

  test("invalid email chip in To is marked invalid and disables Send", async ({ page }) => {
    await openBuyerCompose(page)

    await page.getByTestId("property-gmail-compose-to-text-input").fill("not-an-email")
    await page.getByTestId("property-gmail-compose-to-text-input").press("Enter")

    await expect(
      page.getByTestId("property-gmail-compose-to-chip").filter({ hasText: "not-an-email" }),
    ).toHaveAttribute("data-invalid", "true")
    await expect(page.getByTestId("property-gmail-compose-send")).toBeDisabled()
  })

  // ── Multiple To chips in send FormData ────────────────────────────────────

  test("multiple To chips are sent as comma-separated value in FormData", async ({ page }) => {
    let sentTo = ""
    await setupWithEntityEmails(page, {
      signIn: false,
      onSendPost: (body) => {
        sentTo = (body as Record<string, string>).to ?? ""
      },
    })

    await openBuyerCompose(page)

    await page.getByTestId("property-gmail-compose-to-text-input").click()
    await page.getByTestId("property-gmail-compose-to-option--john@example.com").click()

    await page.getByTestId("property-gmail-compose-send").click()
    await expect(page.getByTestId("property-gmail-compose-dialog")).not.toBeVisible()

    expect(sentTo).toBe("dhungelashok33@gmail.com,john@example.com")
  })

  // ── Reset on close ────────────────────────────────────────────────────────

  test("closing and reopening dialog resets To to only the seed chip", async ({ page }) => {
    await openBuyerCompose(page)

    // Add a second chip
    await page.getByTestId("property-gmail-compose-to-text-input").click()
    await page.getByTestId("property-gmail-compose-to-option--john@example.com").click()
    await expect(page.getByTestId("property-gmail-compose-to-chip")).toHaveCount(2)

    await page.getByTestId("property-gmail-compose-cancel").click()

    // Re-open compose via buyer row
    await page.getByTestId("property-buyer-panel-quick-email--501").click()
    await expect(page.getByTestId("property-gmail-compose-dialog")).toBeVisible()

    await expect(page.getByTestId("property-gmail-compose-to-chip")).toHaveCount(1)
    await expect(page.getByTestId("property-gmail-compose-to-chip").first()).toContainText(
      "dhungelashok33@gmail.com",
    )
  })

})
