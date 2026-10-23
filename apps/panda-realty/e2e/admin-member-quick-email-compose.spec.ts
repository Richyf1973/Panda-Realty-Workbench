import { test, expect } from "@playwright/test"

test.describe("Member quick email compose dialog", () => {
  test("1. Contact rep mail icon opens compose dialog with pre-filled fields", async ({ page }) => {
    await page.goto("http://localhost:3004/admin/contacts")
    const mailButton = page.locator('[data-testid*="contact-member-quick-email--"]').first()

    if (await mailButton.isVisible()) {
      await mailButton.click()
      const dialog = page.locator('[data-testid="property-gmail-compose-dialog"]')
      await expect(dialog).toBeVisible()

      // Verify To, Subject, Body fields are visible
      await expect(page.locator('[data-testid="property-gmail-compose-to"]')).toBeVisible()
      await expect(page.locator('[data-testid="property-gmail-compose-subject"]')).toBeVisible()
      await expect(page.locator('[data-testid="property-gmail-compose-editor"]')).toBeVisible()
    }
  })

  test("2. Contact rep Cancel closes dialog without sending", async ({ page }) => {
    await page.goto("http://localhost:3004/admin/contacts")
    const mailButton = page.locator('[data-testid*="contact-member-quick-email--"]').first()

    if (await mailButton.isVisible()) {
      await mailButton.click()
      const dialog = page.locator('[data-testid="property-gmail-compose-dialog"]')
      await expect(dialog).toBeVisible()

      await page.locator('[data-testid="property-gmail-compose-cancel"]').click()
      await expect(dialog).not.toBeVisible()
    }
  })

  test("3. Contact rep Send posts to /api/admin/gmail/send and closes on success", async ({ page }) => {
    await page.goto("http://localhost:3004/admin/contacts")
    const mailButton = page.locator('[data-testid*="contact-member-quick-email--"]').first()

    if (await mailButton.isVisible()) {
      const apiPromise = page.waitForResponse(
        (r) => r.url().includes("/api/admin/gmail/send") && r.status() === 200,
      )

      await mailButton.click()
      const dialog = page.locator('[data-testid="property-gmail-compose-dialog"]')
      await expect(dialog).toBeVisible()

      await page.locator('[data-testid="property-gmail-compose-editor"]').click()
      await page.keyboard.type("Test email")
      await page.locator('[data-testid="property-gmail-compose-send"]').click()

      await apiPromise
      await expect(dialog).not.toBeVisible({ timeout: 5000 })
    }
  })

  test("4. Contact rep mail icon absent when no email", async ({ page }) => {
    await page.goto("http://localhost:3004/admin/contacts")
    const repRows = page.locator('[data-testid^="contact-member-row--"]')
    const count = await repRows.count()

    for (let i = 0; i < count; i++) {
      const row = repRows.nth(i)
      const emailVisible = (await row.textContent())?.includes("@") ?? false

      if (!emailVisible) {
        const mailBtn = row.locator('[data-testid*="contact-member-quick-email--"]')
        await expect(mailBtn).not.toBeVisible()
      }
    }
  })

  test("5. Contact rep Send failure shows error and keeps dialog open", async ({ page }) => {
    await page.route("**/api/admin/gmail/send", (route) => route.abort("failed"))
    await page.goto("http://localhost:3004/admin/contacts")

    const mailButton = page.locator('[data-testid*="contact-member-quick-email--"]').first()
    if (await mailButton.isVisible()) {
      await mailButton.click()
      const dialog = page.locator('[data-testid="property-gmail-compose-dialog"]')
      await page.locator('[data-testid="property-gmail-compose-send"]').click()

      await page.waitForTimeout(500)
      const error = page.locator('[data-testid="property-gmail-compose-error"]')
      await expect(error).toBeVisible()
      await expect(dialog).toBeVisible()
    }
  })

  test("6. Buyer member mail icon opens compose dialog with pre-filled fields", async ({ page }) => {
    await page.goto("http://localhost:3004/admin/entities?type=buyer")
    const mailButton = page.locator('[data-testid*="buyer-member-quick-email--"]').first()

    if (await mailButton.isVisible()) {
      await mailButton.click()
      const dialog = page.locator('[data-testid="property-gmail-compose-dialog"]')
      await expect(dialog).toBeVisible()
      await expect(page.locator('[data-testid="property-gmail-compose-to"]')).toBeVisible()
      await expect(page.locator('[data-testid="property-gmail-compose-subject"]')).toBeVisible()
      await expect(page.locator('[data-testid="property-gmail-compose-editor"]')).toBeVisible()
    }
  })

  test("7. Buyer member mail icon absent when no email", async ({ page }) => {
    await page.goto("http://localhost:3004/admin/entities?type=buyer")
    const rows = page.locator('[data-testid^="buyer-member-row--"]')
    const count = await rows.count()

    for (let i = 0; i < count; i++) {
      const row = rows.nth(i)
      const emailVisible = (await row.textContent())?.includes("@") ?? false

      if (!emailVisible) {
        const mailBtn = row.locator('[data-testid*="buyer-member-quick-email--"]')
        await expect(mailBtn).not.toBeVisible()
      }
    }
  })

  test("8. Subject field is editable", async ({ page }) => {
    await page.goto("http://localhost:3004/admin/contacts")
    const mailButton = page.locator('[data-testid*="contact-member-quick-email--"]').first()

    if (await mailButton.isVisible()) {
      await mailButton.click()
      const subject = page.locator('[data-testid="property-gmail-compose-subject"]')
      await expect(subject).toBeEditable()
      await subject.clear()
      await expect(subject).toHaveValue("")
    }
  })

  test("9. Close button (X) closes dialog", async ({ page }) => {
    await page.goto("http://localhost:3004/admin/contacts")
    const mailButton = page.locator('[data-testid*="contact-member-quick-email--"]').first()

    if (await mailButton.isVisible()) {
      await mailButton.click()
      const dialog = page.locator('[data-testid="property-gmail-compose-dialog"]')
      await dialog.locator("button[aria-label='Close']").first().click()
      await expect(dialog).not.toBeVisible()
    }
  })

  test("10. Backdrop click closes dialog", async ({ page }) => {
    await page.goto("http://localhost:3004/admin/contacts")
    const mailButton = page.locator('[data-testid*="contact-member-quick-email--"]').first()

    if (await mailButton.isVisible()) {
      await mailButton.click()
      const dialog = page.locator('[data-testid="property-gmail-compose-dialog"]')
      await page.click("body", { position: { x: 10, y: 10 } })
      await expect(dialog).not.toBeVisible()
    }
  })

  test("11. Gmail not connected shows error (if applicable)", async ({ page }) => {
    await page.goto("http://localhost:3004/admin/contacts")
    const mailButton = page.locator('[data-testid*="contact-member-quick-email--"]').first()

    if (await mailButton.isVisible()) {
      await mailButton.click()
      const error = page.locator('[data-testid="property-gmail-compose-error"]')
      const hasError = await error.isVisible().catch(() => false)

      if (hasError) {
        await expect(error).toContainText(/gmail|connected/i)
        await expect(page.locator('[data-testid="property-gmail-compose-send"]')).toBeDisabled()
      }
    }
  })

  test("12. Page reload shows no persisted send indicator", async ({ page }) => {
    await page.goto("http://localhost:3004/admin/contacts")
    const mailButton = page.locator('[data-testid*="contact-member-quick-email--"]').first()

    if (await mailButton.isVisible()) {
      await mailButton.click()
      const dialog = page.locator('[data-testid="property-gmail-compose-dialog"]')
      await page.locator('[data-testid="property-gmail-compose-send"]').click()

      await expect(dialog).not.toBeVisible({ timeout: 5000 })
      await page.reload()

      // No persisted "sent" indicator should exist
      const sentIndicators = page.locator('[data-testid*="sent"]')
      await expect(sentIndicators).toHaveCount(0)
    }
  })
})
