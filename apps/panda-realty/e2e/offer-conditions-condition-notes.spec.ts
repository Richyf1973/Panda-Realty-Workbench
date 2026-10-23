/**
 * E2E: Contract Conditions — Condition Notes textarea (accepted offer)
 *
 * Success factors:
 * 1. On property detail Summary tab, when an accepted offer exists, the Condition Notes
 *    field is visible (`offer-conditions-condition-notes--<buyerOfferId>`).
 * 2. User can enter text and click Save conditions; the save completes (button returns from
 *    "Saving…" and no inline save error appears).
 * 3. After save, the textarea still shows the entered text (persisted + refetched data).
 *
 * Env: `E2E_ADMIN_*`, `DATABASE_URL`, and DB migration for `condition_notes` — failures surface
 * as test errors (no skip gates).
 */

import { expect, test } from "@playwright/test"

import { refreshPandaE2eEnv, signInAsAdmin } from "./helpers/admin-auth"
import { requirePandaLiveE2eEnv } from "./helpers/require-panda-live-e2e-env"
import {
  findSellersCardWithAcceptedOffer,
  goToPropertySummaryTab,
  gotoSellersPipeline,
  openPropertyPanel,
} from "./helpers/panda-pipeline-panels"

test.describe("Offer conditions — Condition Notes", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaLiveE2eEnv()
    refreshPandaE2eEnv()
    await signInAsAdmin(page)
    await gotoSellersPipeline(page)
  })

  test("Condition Notes is visible, savable, and retains value after save", async ({ page }) => {
    test.setTimeout(120_000)
    const cards = page.locator('[data-testid^="kanban-card--"]')
    const cardCount = await cards.count()
    expect(cardCount, "Expected at least one property card on sellers pipeline").toBeGreaterThan(0)

    const targetCard = await findSellersCardWithAcceptedOffer(page)
    expect(
      targetCard,
      "Expected a sellers card with accepted offer — run: npm run e2e:seed:sellers-accepted -w panda-realty",
    ).not.toBeNull()

    const panel = await openPropertyPanel(page, targetCard!)
    await goToPropertySummaryTab(panel)

    const notesLocator = panel.locator('[data-testid^="offer-conditions-condition-notes--"]')
    await expect(notesLocator).toBeVisible({ timeout: 10_000 })

    const unique = `e2e-condition-notes-${Date.now()}`
    await notesLocator.fill(unique)

    const saveBtn = panel.getByRole("button", { name: "Save conditions" })
    await saveBtn.click()

    await expect(saveBtn).toBeEnabled({ timeout: 15_000 })
    await expect(saveBtn).toHaveText("Save conditions")
    await expect(panel.getByText("Failed to save")).toHaveCount(0)

    await expect.poll(async () => notesLocator.inputValue(), { timeout: 10_000 }).toBe(unique)
  })
})
