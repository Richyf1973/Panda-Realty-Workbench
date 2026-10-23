/**
 * Reply, send, error, and persistence tests.
 *
 * Run (from repo root):
 *   npx playwright test apps/panda-realty/e2e/admin-properties-gmail-compose-wysiwyg-send.spec.ts --config=apps/panda-realty/playwright.config.ts
 * Or via workspace script:
 *   npm run test:e2e -w panda-realty -- apps/panda-realty/e2e/admin-properties-gmail-compose-wysiwyg-send.spec.ts
 */
import { expect, test } from "@playwright/test"

import { requirePandaE2eAdminCredentials } from "./helpers/admin-auth"
import {
  CONTACT_EMAIL,
  openBuyerCompose,
  openContactReplyCompose,
  setupComposePage,
} from "./helpers/panda-gmail-compose-wysiwyg-helpers"

test.describe("Panda Realty - gmail compose dialog wysiwyg (reply / send / error / persistence)", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaE2eAdminCredentials()
    await setupComposePage(page)
  })

  test("switching signature templates replaces only the current signature block", async ({ page }) => {
    await openBuyerCompose(page)

    await page.getByTestId("property-gmail-compose-editor").click()
    await page.keyboard.press("End")
    await page.keyboard.type("\nDraft stays here")
    await page.getByTestId("property-gmail-compose-signature-select").click()
    await page.getByRole("option", { name: "Richard promo" }).click()

    await expect(page.getByTestId("property-gmail-compose-editor")).toContainText("Draft stays here")
    await expect(page.getByTestId("property-gmail-compose-editor")).toContainText("Kind regards,")
    await expect(page.getByTestId("property-gmail-compose-editor")).not.toContainText("Office default signature")
  })

  test("the selected signature is remembered when reopening compose in the same browser session", async ({ page }) => {
    await openBuyerCompose(page)

    await page.getByTestId("property-gmail-compose-signature-select").click()
    await page.getByRole("option", { name: "Richard promo" }).click()
    await page.getByTestId("property-gmail-compose-cancel").click()

    await page.getByTestId("property-buyer-panel-quick-email--501").click()
    await expect(page.getByTestId("property-gmail-compose-signature-select")).toContainText("Richard promo")
    await expect(page.getByTestId("property-gmail-compose-editor")).toContainText("Kind regards,")
  })

  test("reply mode opens the same rich compose dialog with reply prefill and signature enabled", async ({ page }) => {
    await openContactReplyCompose(page)

    await expect(page.getByTestId("property-gmail-compose-to")).toHaveValue(CONTACT_EMAIL)
    await expect(page.getByTestId("property-gmail-compose-subject")).toHaveValue(
      "Re: Welcome Pack Request For 12/176 Torrens Rd",
    )
    await expect(page.getByTestId("property-gmail-compose-include-signature")).toBeChecked()
    await expect(page.getByTestId("property-gmail-compose-editor")).toContainText(
      "Dear Vantage Caboolture Riverfront,",
    )
    await expect(page.getByTestId("property-gmail-compose-editor")).toContainText("Regards,")
  })

  test("sending a reply closes the dialog and posts the visible rich body html without a duplicate signature append contract", async ({ page }) => {
    let replyPayload: unknown = null
    await setupComposePage(page, {
      signIn: false,
      onReplyPost: (body) => {
        replyPayload = body
      },
    })

    await openContactReplyCompose(page)
    await page.getByTestId("property-gmail-compose-editor").click()
    await page.keyboard.press("End")
    await page.keyboard.type("\nThanks for the update.")
    await page.getByTestId("property-gmail-compose-send").evaluate((button) => {
      ;(button as HTMLButtonElement).click()
    })

    await expect(page.getByTestId("property-gmail-compose-dialog")).not.toBeVisible()
    expect(replyPayload).toMatchObject({
      threadId: "thread-1",
      messageId: "msg-contact-1",
      to: CONTACT_EMAIL,
      subject: "Re: Welcome Pack Request For 12/176 Torrens Rd",
    })

    const payload = replyPayload as Record<string, unknown>
    expect(typeof payload.bodyHtml).toBe("string")
    expect(String(payload.bodyHtml)).toContain("Thanks for the update.")
    expect(String(payload.bodyHtml)).toContain("default-signature.png")
    expect((String(payload.bodyHtml).match(/default-signature\.png/gi) ?? []).length).toBe(1)
    expect("signatureHtml" in payload).toBe(false)
  })

  test("gmail connection failures still surface inline in the rich compose dialog", async ({ page }) => {
    await setupComposePage(page, {
      signIn: false,
      sendStatus: 503,
      sendBody: { error: "Gmail is not connected. Please connect your Google account." },
    })

    await openBuyerCompose(page)
    await page.getByTestId("property-gmail-compose-send").evaluate((button) => {
      ;(button as HTMLButtonElement).click()
    })

    await expect(page.getByTestId("property-gmail-compose-error")).toContainText(
      "Gmail is not connected. Please connect your Google account.",
    )
    await expect(page.getByTestId("property-gmail-compose-dialog")).toBeVisible()
  })

  test("compose dialog does not show inline image upload error (image upload is disabled)", async ({ page }) => {
    await setupComposePage(page, { signIn: false })

    await openBuyerCompose(page)

    // Image upload is removed from compose; no upload error should ever appear
    await expect(page.getByTestId("property-gmail-compose-upload-error")).not.toBeVisible()
    // Editor still accepts keyboard input
    await page.getByTestId("property-gmail-compose-editor").click()
    await page.keyboard.type("Still editable")
    await expect(page.getByTestId("property-gmail-compose-editor")).toContainText("Still editable")
  })

  test("reopening compose after a signature template update uses the latest saved signature html", async ({ page }) => {
    const { signatures } = await setupComposePage(page, { signIn: false })

    await openBuyerCompose(page)
    await page.getByTestId("property-gmail-compose-cancel").click()

    signatures[0] = {
      ...signatures[0]!,
      htmlContent: `<p>Regards,</p><p>Richard Falzon</p><p>Updated office footer</p>`,
      renderedHtml: `<p>Regards,</p><p>Richard Falzon</p><p>Updated office footer</p>`,
    }

    await page.getByTestId("property-buyer-panel-quick-email--501").click()
    await expect(page.getByTestId("property-gmail-compose-editor")).toContainText("Updated office footer")
  })
})
