/**
 * E2E: Buyer requirements — inline value editing
 *
 * Success factors:
 * 1. Clicking a requirement pill enters inline edit mode (input replaces button)
 * 2. Input is auto-focused when edit mode is entered
 * 3. Typing a value and pressing Enter saves it; pill displays "Name: value"
 * 4. Clicking the pill again re-enters edit mode with the value pre-filled
 * 5. Clearing the value and pressing Enter removes the value suffix
 * 6. Pressing Escape cancels without saving
 */

import { expect, test, type Page } from "@playwright/test"

import { e2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"

test.describe("Buyer requirements — inline value editing", () => {
  // ── Setup: sign in and navigate to any buyer's Profile tab ──────────────────

  test.beforeEach(async ({ page }) => {
    test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")

    await signInAsAdmin(page)
    await page.goto("/admin/pipeline?pipeline=buyers")

    // Wait for at least one buyer card to appear
    const firstCard = page.getByTestId(/^kanban-buyer-card--/).first()
    await firstCard.waitFor({ timeout: 20_000 })
    await firstCard.click()

    // Switch to Profile tab
    await page.getByTestId("buyer-panel-tab--profile").click()

    // Ensure the requirements section is visible
    await expect(
      page.getByText("Buyer Requirements", { exact: false }),
    ).toBeVisible({ timeout: 10_000 })
  })

  // ── Helper: ensure at least one requirement is assigned ─────────────────────

  async function ensureRequirement(page: Page) {
    const pills = page.getByTestId(/^buyer-req-pill--/)
    if ((await pills.count()) === 0) {
      // Open the add-requirement popover and pick the first option
      const addTrigger = page.getByTestId("buyer-req-add-trigger")
      await expect(addTrigger).toBeVisible({ timeout: 5_000 })
      await addTrigger.click()

      const firstOption = page.getByTestId(/^buyer-req-add-option--/).first()
      await firstOption.waitFor({ timeout: 5_000 })
      await firstOption.click()

      // Wait for the pill to appear
      await pills.first().waitFor({ timeout: 5_000 })
    }
  }

  // ── Helper: get the entityBuyerRequirementId from the first pill ─────────────

  async function getFirstReqId(page: Page) {
    const pillTestId = await page
      .getByTestId(/^buyer-req-pill--/)
      .first()
      .getAttribute("data-testid")
    return pillTestId?.replace("buyer-req-pill--", "") ?? ""
  }

  // ── Tests ───────────────────────────────────────────────────────────────────

  test("clicking a requirement pill shows the inline input (success factor 1 & 2)", async ({
    page,
  }) => {
    await ensureRequirement(page)
    const reqId = await getFirstReqId(page)

    // Click the value button — edit mode should activate
    await page.getByTestId(`buyer-req-value-btn--${reqId}`).click()

    const input = page.getByTestId(`buyer-req-value-input--${reqId}`)
    await expect(input).toBeVisible()
    await expect(input).toBeFocused()
  })

  test("Enter saves value and pill shows 'Name: value' format (success factors 3 & 4)", async ({
    page,
  }) => {
    await ensureRequirement(page)
    const reqId = await getFirstReqId(page)

    const valueBtn = page.getByTestId(`buyer-req-value-btn--${reqId}`)

    // Record requirement name (strip any pre-existing ": value" suffix)
    const btnText = (await valueBtn.textContent()) ?? ""
    const reqName = btnText.split(":")[0]!.trim()

    // Enter test value and save
    await valueBtn.click()
    const input = page.getByTestId(`buyer-req-value-input--${reqId}`)
    await input.fill("E2E_VAL")
    await input.press("Enter")

    // Input is replaced by the button again
    await expect(input).not.toBeAttached()
    await expect(valueBtn).toBeVisible()
    await expect(valueBtn).toHaveText(`${reqName}: E2E_VAL`)

    // Click again — input should be pre-filled with "E2E_VAL" (success factor 4)
    await valueBtn.click()
    await expect(input).toBeVisible()
    await expect(input).toHaveValue("E2E_VAL")

    // Cleanup: clear the value
    await input.fill("")
    await input.press("Enter")
    await expect(input).not.toBeAttached()
    await expect(valueBtn).toHaveText(reqName)
  })

  test("clearing value removes the suffix (success factor 5)", async ({ page }) => {
    await ensureRequirement(page)
    const reqId = await getFirstReqId(page)
    const valueBtn = page.getByTestId(`buyer-req-value-btn--${reqId}`)

    // First set a value
    await valueBtn.click()
    const input = page.getByTestId(`buyer-req-value-input--${reqId}`)
    await input.fill("TEMP")
    await input.press("Enter")

    const btnText = (await valueBtn.textContent()) ?? ""
    const reqName = btnText.split(":")[0]!.trim()

    // Now clear it
    await valueBtn.click()
    await input.fill("")
    await input.press("Enter")

    await expect(input).not.toBeAttached()
    // Pill shows name only (no ": ...")
    await expect(valueBtn).toHaveText(reqName)
  })

  test("Escape cancels without saving (success factor 6)", async ({ page }) => {
    await ensureRequirement(page)
    const reqId = await getFirstReqId(page)
    const valueBtn = page.getByTestId(`buyer-req-value-btn--${reqId}`)

    const originalText = (await valueBtn.textContent()) ?? ""

    // Enter edit mode and type something
    await valueBtn.click()
    const input = page.getByTestId(`buyer-req-value-input--${reqId}`)
    await input.fill("SHOULD_NOT_SAVE")

    // Press Escape — should cancel
    await input.press("Escape")

    // Button is back with original text
    await expect(input).not.toBeAttached()
    await expect(valueBtn).toHaveText(originalText)
  })
})
