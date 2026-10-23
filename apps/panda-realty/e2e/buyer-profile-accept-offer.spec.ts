/**
 * E2E: Accept button on PropertyEntityBuyerOffersPanel (buyer profile / entity edit dialog)
 *
 * Covers the Manual Verification checklist from:
 *   specs/panda-realty-buyer-profile-accept-offer.md
 *
 * Surface under test:
 *   Admin → Entities → edit buyer → property connections → Offers tab
 *   (renders PropertyEntityBuyerOffersPanel via panda-registry-custom-panels)
 *
 * All API calls are mocked — no live DB required.
 * Requires: E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD
 */

import { expect, test } from "@playwright/test"

import { requirePandaE2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import {
  CONNECTION_501_DETAIL,
  NON_ACCEPTED_OFFER,
  ACCEPTED_OFFER,
  buyerOffersResponse,
  installBuyerProfileOffersBaseRoutes,
  openBuyerOffersPanel,
} from "./helpers/buyer-offers-edit-mocks"

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe.configure({ mode: "serial" })

test.describe("Accept button on buyer profile page Offers tab (PropertyEntityBuyerOffersPanel)", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaE2eAdminCredentials()
    await installBuyerProfileOffersBaseRoutes(page)
    await signInAsAdmin(page)
  })

  // ── 1. Accept button appears on non-accepted rows ─────────────────────────

  test("Accept button is visible on non-accepted offer row, absent on accepted row", async ({ page }) => {
    const { panel } = await openBuyerOffersPanel(page)

    const row = panel.getByTestId(`offers-row--${NON_ACCEPTED_OFFER.buyerOfferId}`)
    await expect(row).toBeVisible()
    await expect(row).toContainText("950,000")

    const acceptBtn = panel.getByTestId(`offers-row-accept-btn--${NON_ACCEPTED_OFFER.buyerOfferId}`)
    await expect(acceptBtn).toBeVisible()
    await expect(acceptBtn).toContainText("Accept")
  })

  // ── 2. Clicking Accept shows green Accepted badge ─────────────────────────

  test("clicking Accept marks the offer accepted and shows green badge", async ({ page }) => {
    // After PATCH succeeds, GET refetch returns the offer as accepted
    await page.route("**/api/admin/buyer-offers/9002", async (route) => {
      if (route.request().method() === "PATCH") {
        // Override the buyer-offers refetch to return accepted
        await page.route("**/api/admin/property-entities**", async (r) => {
          const url = r.request().url()
          if (url.match(/\/property-entities\/\d+\/buyer-offers/)) {
            await r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(buyerOffersResponse([{ ...NON_ACCEPTED_OFFER, isAccepted: true }])) })
            return
          }
          await r.continue()
        }, { times: 1 })
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) })
        return
      }
      await route.continue()
    })

    const { panel } = await openBuyerOffersPanel(page)

    const acceptBtn = panel.getByTestId(`offers-row-accept-btn--${NON_ACCEPTED_OFFER.buyerOfferId}`)
    await expect(acceptBtn).toBeVisible()
    await acceptBtn.click()

    // Button gone, Accepted badge appears
    await expect(acceptBtn).not.toBeVisible({ timeout: 8_000 })
    await expect(panel.getByTestId("offers-tab-table")).toContainText("Accepted")
    // No inline error
    await expect(panel.getByTestId(`offers-row-accept-error--${NON_ACCEPTED_OFFER.buyerOfferId}`)).not.toBeVisible()
  })

  // ── 3. Already-accepted row shows no Accept button ────────────────────────

  test("accepted offer row shows no Accept button", async ({ page }) => {
    // Override to return an already-accepted offer
    await page.route("**/api/admin/property-entities**", async (route) => {
      const req = route.request()
      if (req.method() !== "GET") { await route.continue(); return }
      const url = req.url()
      if (url.match(/\/property-entities\/\d+\/buyer-offers/)) {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(buyerOffersResponse([ACCEPTED_OFFER])) })
        return
      }
      const detailMatch = url.match(/\/property-entities\/(\d+)/)
      if (detailMatch) {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(Number(detailMatch[1]) === 501 ? CONNECTION_501_DETAIL : {}) })
        return
      }
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [CONNECTION_501_DETAIL] }) })
    })

    const { panel } = await openBuyerOffersPanel(page)

    await expect(panel.getByTestId("offers-tab-table")).toContainText("Accepted")
    await expect(panel.getByTestId(`offers-row-accept-btn--${ACCEPTED_OFFER.buyerOfferId}`)).not.toBeVisible()
  })

  // ── 4. Badge persists after closing and reopening the dialog ─────────────

  test("Accepted badge persists after dialog close and reopen", async ({ page }) => {
    let accepted = false

    await page.route("**/api/admin/buyer-offers/9002", async (route) => {
      if (route.request().method() === "PATCH") {
        accepted = true
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) })
        return
      }
      await route.continue()
    })

    await page.route("**/api/admin/property-entities**", async (route) => {
      const req = route.request()
      if (req.method() !== "GET") { await route.continue(); return }
      const url = req.url()
      if (url.match(/\/property-entities\/\d+\/buyer-offers/)) {
        const offers = accepted
          ? [{ ...NON_ACCEPTED_OFFER, isAccepted: true }]
          : [NON_ACCEPTED_OFFER]
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(buyerOffersResponse(offers)) })
        return
      }
      const detailMatch = url.match(/\/property-entities\/(\d+)/)
      if (detailMatch) {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(Number(detailMatch[1]) === 501 ? CONNECTION_501_DETAIL : {}) })
        return
      }
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [CONNECTION_501_DETAIL] }) })
    })

    const { panel, dialog } = await openBuyerOffersPanel(page)

    const acceptBtn = panel.getByTestId(`offers-row-accept-btn--${NON_ACCEPTED_OFFER.buyerOfferId}`)
    await expect(acceptBtn).toBeVisible()
    await acceptBtn.click()
    await expect(acceptBtn).not.toBeVisible({ timeout: 8_000 })
    await expect(panel.getByTestId("offers-tab-table")).toContainText("Accepted")

    // Close the dialog
    const closeBtn = dialog.locator("button[aria-label='Close'], button:has([data-testid='dialog-close'])").first()
    if (await closeBtn.isVisible()) {
      await closeBtn.click()
    } else {
      await page.keyboard.press("Escape")
    }
    await expect(dialog).not.toBeVisible({ timeout: 5_000 })

    // Reopen
    await page.getByTestId(/^admin-entity-row-edit--entities--/).first().click()
    await expect(dialog).toBeVisible()
    const dialogForm2 = dialog.getByTestId("panda-entities-dialog-form")
    await dialogForm2.evaluate((el) => el.scrollTo(0, el.scrollHeight))
    const connections2 = dialog.getByTestId("panda-entities-property-connections")
    await expect(connections2).toBeVisible({ timeout: 10_000 })
    const peTabs2 = connections2.getByTestId("admin-entity-crud-related-tabs--property-entities")
    await expect(peTabs2.getByRole("tab", { name: /^offers$/i })).toBeVisible({ timeout: 30_000 })
    await peTabs2.getByRole("tab", { name: /^offers$/i }).click()
    const panel2 = connections2.getByTestId("admin-entity-crud-related-panel--property-entities--buyer-offers-tab")
    await expect(panel2.getByTestId("offers-tab-table")).toBeVisible({ timeout: 8_000 })

    // Badge must still be there; no Accept button
    await expect(panel2.getByTestId("offers-tab-table")).toContainText("Accepted")
    await expect(panel2.getByTestId(`offers-row-accept-btn--${NON_ACCEPTED_OFFER.buyerOfferId}`)).not.toBeVisible()
  })

  // ── 5. Conflict: another offer already accepted → inline error ────────────

  test("Accept is blocked with inline error when another offer is already accepted", async ({ page }) => {
    // Seed: one accepted offer already exists, one non-accepted
    await page.route("**/api/admin/property-entities**", async (route) => {
      const req = route.request()
      if (req.method() !== "GET") { await route.continue(); return }
      const url = req.url()
      if (url.match(/\/property-entities\/\d+\/buyer-offers/)) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(buyerOffersResponse([ACCEPTED_OFFER, NON_ACCEPTED_OFFER])),
        })
        return
      }
      const detailMatch = url.match(/\/property-entities\/(\d+)/)
      if (detailMatch) {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(Number(detailMatch[1]) === 501 ? CONNECTION_501_DETAIL : {}) })
        return
      }
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [CONNECTION_501_DETAIL] }) })
    })

    // PATCH returns 409 conflict
    await page.route("**/api/admin/buyer-offers/9002", async (route) => {
      if (route.request().method() === "PATCH") {
        await route.fulfill({
          status: 409,
          contentType: "application/json",
          body: JSON.stringify({ error: "Another offer is already accepted" }),
        })
        return
      }
      await route.continue()
    })

    const { panel } = await openBuyerOffersPanel(page)

    const acceptBtn = panel.getByTestId(`offers-row-accept-btn--${NON_ACCEPTED_OFFER.buyerOfferId}`)
    await expect(acceptBtn).toBeVisible()
    await acceptBtn.click()

    // Button stays visible (accept was rejected)
    await expect(acceptBtn).toBeVisible({ timeout: 8_000 })
    // Inline error appears
    const inlineError = panel.getByTestId(`offers-row-accept-error--${NON_ACCEPTED_OFFER.buyerOfferId}`)
    await expect(inlineError).toBeVisible({ timeout: 8_000 })
    await expect(inlineError).toContainText("already accepted")

    // The original accepted offer is unchanged
    await expect(panel.getByTestId("offers-tab-table")).toContainText("1,240,000")
    await expect(panel.getByTestId("offers-tab-table")).toContainText("Accepted")
  })
})
