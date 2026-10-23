import { expect, test } from "@playwright/test"

import { requirePandaE2eAdminCredentials } from "./helpers/admin-auth"
import {
  openBuyerCompose,
  openContactReplyCompose,
  setupComposePage,
} from "./helpers/panda-gmail-compose-wysiwyg-helpers"

test.describe("Panda Realty — gmail compose dialog CC/BCC", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaE2eAdminCredentials()
    await setupComposePage(page)
  })

  // ── Happy path ────────────────────────────────────────────────────────────

  test("CC/BCC fields are hidden by default; 'Add CC/BCC' toggle is visible", async ({ page }) => {
    await openBuyerCompose(page)

    await expect(page.getByTestId("property-gmail-compose-cc-field")).not.toBeVisible()
    await expect(page.getByTestId("property-gmail-compose-bcc-field")).not.toBeVisible()
    await expect(page.getByTestId("property-gmail-compose-cc-bcc-toggle")).toBeVisible()
  })

  test("clicking 'Add CC/BCC' reveals CC and BCC input fields", async ({ page }) => {
    await openBuyerCompose(page)

    await page.getByTestId("property-gmail-compose-cc-bcc-toggle").click()

    await expect(page.getByTestId("property-gmail-compose-cc-field")).toBeVisible()
    await expect(page.getByTestId("property-gmail-compose-bcc-field")).toBeVisible()
  })

  test("typing an email and pressing Enter creates a CC chip and clears the input", async ({ page }) => {
    await openBuyerCompose(page)

    await page.getByTestId("property-gmail-compose-cc-bcc-toggle").click()
    await page.getByTestId("property-gmail-compose-cc-text-input").fill("alice@example.com")
    await page.getByTestId("property-gmail-compose-cc-text-input").press("Enter")

    await expect(page.getByTestId("property-gmail-compose-cc-chip").first()).toContainText("alice@example.com")
    await expect(page.getByTestId("property-gmail-compose-cc-text-input")).toHaveValue("")
  })

  test("typing an email and pressing comma creates a CC chip", async ({ page }) => {
    await openBuyerCompose(page)

    await page.getByTestId("property-gmail-compose-cc-bcc-toggle").click()
    await page.getByTestId("property-gmail-compose-cc-text-input").fill("bob@example.com")
    await page.keyboard.press(",")

    await expect(page.getByTestId("property-gmail-compose-cc-chip").first()).toContainText("bob@example.com")
  })

  test("clicking × on a CC chip removes that chip", async ({ page }) => {
    await openBuyerCompose(page)

    await page.getByTestId("property-gmail-compose-cc-bcc-toggle").click()
    await page.getByTestId("property-gmail-compose-cc-text-input").fill("alice@example.com")
    await page.keyboard.press("Enter")
    await page.getByTestId("property-gmail-compose-cc-text-input").fill("bob@example.com")
    await page.keyboard.press("Enter")

    await expect(page.getByTestId("property-gmail-compose-cc-chip")).toHaveCount(2)

    await page.getByTestId("property-gmail-compose-cc-chip").first().getByRole("button").click()

    await expect(page.getByTestId("property-gmail-compose-cc-chip")).toHaveCount(1)
    await expect(page.getByTestId("property-gmail-compose-cc-chip").first()).toContainText("bob@example.com")
  })

  test("CC and BCC chips are included as comma-separated values in the send FormData", async ({ page }) => {
    let sentBody: Record<string, string | undefined> | null = null
    await setupComposePage(page, {
      signIn: false,
      onSendPost: (body) => {
        sentBody = body as Record<string, string | undefined>
      },
    })

    await openBuyerCompose(page)
    await page.getByTestId("property-gmail-compose-cc-bcc-toggle").click()

    await page.getByTestId("property-gmail-compose-cc-text-input").fill("cc1@example.com")
    await page.keyboard.press("Enter")
    await page.getByTestId("property-gmail-compose-cc-text-input").fill("cc2@example.com")
    await page.keyboard.press("Enter")
    await page.getByTestId("property-gmail-compose-bcc-text-input").fill("bcc@example.com")
    await page.keyboard.press("Enter")

    await page.getByTestId("property-gmail-compose-send").evaluate((b) => (b as HTMLButtonElement).click())
    await expect(page.getByTestId("property-gmail-compose-status-success")).toBeVisible()

    expect(sentBody).not.toBeNull()
    expect(sentBody!.cc).toBe("cc1@example.com,cc2@example.com")
    expect(sentBody!.bcc).toBe("bcc@example.com")
  })

  test("closing and reopening the dialog resets CC/BCC to collapsed with no stale chips", async ({ page }) => {
    await openBuyerCompose(page)

    await page.getByTestId("property-gmail-compose-cc-bcc-toggle").click()
    await page.getByTestId("property-gmail-compose-cc-text-input").fill("alice@example.com")
    await page.keyboard.press("Enter")
    await page.getByTestId("property-gmail-compose-cancel").click()

    await page.getByTestId("property-buyer-panel-quick-email--501").click()
    await expect(page.getByTestId("property-gmail-compose-dialog")).toBeVisible()

    await expect(page.getByTestId("property-gmail-compose-cc-field")).not.toBeVisible()
    await expect(page.getByTestId("property-gmail-compose-bcc-field")).not.toBeVisible()
    await expect(page.getByTestId("property-gmail-compose-cc-bcc-toggle")).toBeVisible()
    await expect(page.getByTestId("property-gmail-compose-cc-chip")).toHaveCount(0)
  })

  // ── Reply mode ────────────────────────────────────────────────────────────

  test("reply mode shows the 'Add CC/BCC' toggle", async ({ page }) => {
    await openContactReplyCompose(page)

    await expect(page.getByTestId("property-gmail-compose-cc-bcc-toggle")).toBeVisible()
    await expect(page.getByTestId("property-gmail-compose-cc-field")).not.toBeVisible()
  })

  test("CC chip in reply mode is included in the reply FormData", async ({ page }) => {
    let replyPayload: Record<string, string | undefined> | null = null
    await setupComposePage(page, {
      signIn: false,
      onReplyPost: (body) => {
        replyPayload = body as Record<string, string | undefined>
      },
    })

    await openContactReplyCompose(page)
    await page.getByTestId("property-gmail-compose-cc-bcc-toggle").click()
    await page.getByTestId("property-gmail-compose-cc-text-input").fill("cc@example.com")
    await page.keyboard.press("Enter")

    await page.getByTestId("property-gmail-compose-send").evaluate((b) => (b as HTMLButtonElement).click())
    await expect(page.getByTestId("property-gmail-compose-status-success")).toBeVisible()

    expect(replyPayload).not.toBeNull()
    expect(replyPayload!.cc).toBe("cc@example.com")
  })

  // ── Edge cases ────────────────────────────────────────────────────────────

  test("expanding CC/BCC but leaving fields empty does not add cc/bcc keys to FormData", async ({ page }) => {
    let sentBody: Record<string, string | undefined> | null = null
    await setupComposePage(page, {
      signIn: false,
      onSendPost: (body) => {
        sentBody = body as Record<string, string | undefined>
      },
    })

    await openBuyerCompose(page)
    await page.getByTestId("property-gmail-compose-cc-bcc-toggle").click()

    await page.getByTestId("property-gmail-compose-send").evaluate((b) => (b as HTMLButtonElement).click())
    await expect(page.getByTestId("property-gmail-compose-status-success")).toBeVisible()

    expect(sentBody).not.toBeNull()
    const cc = sentBody!.cc
    const bcc = sentBody!.bcc
    expect(!cc || cc === "").toBe(true)
    expect(!bcc || bcc === "").toBe(true)
  })

  // ── Error / rejection states ──────────────────────────────────────────────

  test("invalid email chip is marked invalid and Send is disabled", async ({ page }) => {
    await openBuyerCompose(page)

    await page.getByTestId("property-gmail-compose-cc-bcc-toggle").click()
    await page.getByTestId("property-gmail-compose-cc-text-input").fill("not-an-email")
    await page.keyboard.press("Enter")

    await expect(page.getByTestId("property-gmail-compose-cc-chip").first()).toBeVisible()
    await expect(page.getByTestId("property-gmail-compose-cc-chip").first()).toHaveAttribute("data-invalid", "true")
    await expect(page.getByTestId("property-gmail-compose-send")).toBeDisabled()
  })

  test("removing an invalid CC chip re-enables Send", async ({ page }) => {
    await openBuyerCompose(page)

    await page.getByTestId("property-gmail-compose-cc-bcc-toggle").click()
    await page.getByTestId("property-gmail-compose-cc-text-input").fill("not-an-email")
    await page.keyboard.press("Enter")

    await expect(page.getByTestId("property-gmail-compose-send")).toBeDisabled()

    await page.getByTestId("property-gmail-compose-cc-chip").first().getByRole("button").click()

    await expect(page.getByTestId("property-gmail-compose-send")).toBeEnabled()
  })

  test("invalid BCC chip blocks Send even when all CC chips are valid", async ({ page }) => {
    await openBuyerCompose(page)

    await page.getByTestId("property-gmail-compose-cc-bcc-toggle").click()

    await page.getByTestId("property-gmail-compose-cc-text-input").fill("valid@example.com")
    await page.keyboard.press("Enter")

    await page.getByTestId("property-gmail-compose-bcc-text-input").fill("bad-bcc")
    await page.keyboard.press("Enter")

    await expect(page.getByTestId("property-gmail-compose-send")).toBeDisabled()
  })
})
