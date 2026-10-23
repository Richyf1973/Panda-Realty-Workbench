/**
 * Layout, prefill, signature, and image tests.
 *
 * Run (from repo root):
 *   npx playwright test apps/panda-realty/e2e/admin-properties-gmail-compose-wysiwyg.spec.ts --config=apps/panda-realty/playwright.config.ts
 * Or via workspace script:
 *   npm run test:e2e -w panda-realty -- apps/panda-realty/e2e/admin-properties-gmail-compose-wysiwyg.spec.ts
 */
import { expect, test } from "@playwright/test"

import { requirePandaE2eAdminCredentials } from "./helpers/admin-auth"
import {
  composeEditorHtml,
  composeEditorText,
  PROPERTY_SUBJECT,
  openBuyerCompose,
  pasteImageIntoComposeEditor,
  selectTextInComposeEditor,
  setComposeEditorHtml,
  setupComposePage,
} from "./helpers/panda-gmail-compose-wysiwyg-helpers"

test.describe("Panda Realty - gmail compose dialog wysiwyg", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaE2eAdminCredentials()
    await setupComposePage(page)
  })

  test("brand-new compose opens as a wider richer dialog with signature controls and no external client handoff", async ({ page }) => {
    await openBuyerCompose(page)

    const dialog = page.getByTestId("property-gmail-compose-dialog")
    const box = await dialog.boundingBox()
    expect(box?.width ?? 0).toBeGreaterThan(900)
    expect(box?.height ?? 0).toBeGreaterThan(650)

    await expect(page.getByTestId("property-gmail-compose-include-signature")).toBeChecked()
    await expect(page.getByTestId("property-gmail-compose-signature-select")).toContainText("Office default")
    await expect(page.getByTestId("property-gmail-compose-open-client")).toHaveCount(0)
  })

  test("compose keeps the editor inside the taller dialog body on shorter viewports", async ({ page }) => {
    await page.setViewportSize({ width: 1365, height: 800 })
    await openBuyerCompose(page)

    const dialogBox = await page.getByTestId("property-gmail-compose-dialog").boundingBox()
    const editorBox = await page.getByTestId("property-gmail-compose-editor").boundingBox()
    const sendButtonBox = await page.getByTestId("property-gmail-compose-send").boundingBox()

    expect(dialogBox).not.toBeNull()
    expect(editorBox).not.toBeNull()
    expect(sendButtonBox).not.toBeNull()

    expect(dialogBox!.height).toBeGreaterThan(740)
    expect(editorBox!.y + editorBox!.height).toBeLessThan(sendButtonBox!.y - 8)
  })

  test("signature dropdown stays anchored to the select inside the compose dialog", async ({ page }) => {
    await openBuyerCompose(page)

    const trigger = page.getByTestId("property-gmail-compose-signature-select")
    await trigger.click()

    const triggerBox = await trigger.boundingBox()
    const contentBox = await page.getByRole("listbox").boundingBox()

    expect(triggerBox).not.toBeNull()
    expect(contentBox).not.toBeNull()

    expect(contentBox!.x).toBeGreaterThan(triggerBox!.x - 24)
    expect(contentBox!.x).toBeLessThan(triggerBox!.x + 24)
    expect(contentBox!.y).toBeGreaterThan(triggerBox!.y - 24)
    expect(contentBox!.y).toBeLessThan(triggerBox!.y + triggerBox!.height + 24)
  })

  test("brand-new compose preserves recipient subject and greeting prefill inside the rich editor", async ({ page }) => {
    await openBuyerCompose(page)

    await expect(page.getByTestId("property-gmail-compose-to")).toHaveValue("dhungelashok33@gmail.com")
    await expect(page.getByTestId("property-gmail-compose-subject")).toHaveValue(PROPERTY_SUBJECT)
    await expect(page.getByTestId("property-gmail-compose-editor")).toContainText("Dear Ash D,")
  })

  test("include signature starts enabled and injects the current signature into the editor body", async ({ page }) => {
    await openBuyerCompose(page)

    await expect(page.getByTestId("property-gmail-compose-editor")).toContainText("Regards,")
    await expect(page.getByTestId("property-gmail-compose-editor").locator("img")).toHaveAttribute(
      "src",
      /default-signature\.png/i,
    )
  })

  test("toolbar formatting updates the visible draft body directly", async ({ page }) => {
    await openBuyerCompose(page)

    await page.getByTestId("property-gmail-compose-editor").click()
    await page.keyboard.press("End")
    await page.keyboard.type("\nImportant update")
    await page.getByTestId("property-gmail-compose-toolbar-bold").click()
    await page.keyboard.type(" Bold follow-up")

    const html = await composeEditorHtml(page)
    expect(html).toContain("Important update")
    expect(html).toMatch(/<(strong|b)>/i)
  })

  test("compose editor applies common font size and highlight color to selected draft text", async ({ page }) => {
    await openBuyerCompose(page)

    await setComposeEditorHtml(page, "<p>Format me please</p>")
    await selectTextInComposeEditor(page, "Format me")
    await page.getByTestId("property-gmail-compose-font-size").click()
    await page.getByRole("option", { name: "24" }).click()
    await selectTextInComposeEditor(page, "Format me")
    await page.getByTestId("property-gmail-compose-highlight").click()
    await page.getByRole("option", { name: "Blue" }).click()

    const html = await composeEditorHtml(page)
    expect(html).toMatch(/font-size:\s*24px/i)
    expect(html).toMatch(/background-color:\s*(#bfdbfe|rgb\(191,\s*219,\s*254\))/i)
  })

  test("compose editor removes highlight fill without removing the selected draft text", async ({ page }) => {
    await openBuyerCompose(page)

    await setComposeEditorHtml(page, "<p>Remove my highlight</p>")
    await selectTextInComposeEditor(page, "Remove my")
    await page.getByTestId("property-gmail-compose-highlight").click()
    await page.getByRole("option", { name: "Green" }).click()

    let html = await composeEditorHtml(page)
    expect(html).toMatch(/background-color:\s*(#bbf7d0|rgb\(187,\s*247,\s*208\))/i)

    await selectTextInComposeEditor(page, "Remove my")
    await page.getByTestId("property-gmail-compose-highlight").click()
    await page.getByRole("option", { name: "None" }).click()

    html = await composeEditorHtml(page)
    expect(await composeEditorText(page)).toContain("Remove my highlight")
    expect(html).not.toMatch(/background-color:\s*(#bbf7d0|rgb\(187,\s*247,\s*208\))/i)
  })

  test("disabling include signature removes only the signature block from the draft", async ({ page }) => {
    await openBuyerCompose(page)

    await page.getByTestId("property-gmail-compose-editor").click()
    await page.keyboard.press("End")
    await page.keyboard.type("\nKeep this paragraph")
    await page.getByTestId("property-gmail-compose-include-signature").uncheck()

    await expect(page.getByTestId("property-gmail-compose-editor")).toContainText("Keep this paragraph")
    await expect(page.getByTestId("property-gmail-compose-editor")).not.toContainText("Regards,")
  })

  test("re-enabling include signature reinserts the selected template without clearing the rest of the draft", async ({ page }) => {
    await openBuyerCompose(page)

    await page.getByTestId("property-gmail-compose-editor").click()
    await page.keyboard.press("End")
    await page.keyboard.type("\nNeed docs by Friday")
    await page.getByTestId("property-gmail-compose-include-signature").uncheck()
    await page.getByTestId("property-gmail-compose-include-signature").check()

    await expect(page.getByTestId("property-gmail-compose-editor")).toContainText("Need docs by Friday")
    await expect(page.getByTestId("property-gmail-compose-editor")).toContainText("Regards,")
  })

  test("toolbar image upload button is absent from the compose dialog", async ({ page }) => {
    await openBuyerCompose(page)

    await expect(page.getByTestId("property-gmail-compose-image-upload")).not.toBeVisible()
    await expect(page.getByTestId("property-gmail-compose-image-input")).not.toBeVisible()
  })

  test("pasting an image into the editor inserts it inline into the body", async ({ page }) => {
    await openBuyerCompose(page)

    await pasteImageIntoComposeEditor(page)

    await expect(page.getByTestId("property-gmail-compose-editor").locator("img").first()).toHaveAttribute(
      "src",
      /inline-compose-image\.png/i,
    )
  })
})
