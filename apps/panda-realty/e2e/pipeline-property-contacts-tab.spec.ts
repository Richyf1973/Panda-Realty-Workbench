/**
 * E2E: Sellers pipeline board — property detail panel Contacts tab
 *
 * Verifies that a seeded contact (entityCategoryId=4) appears in the Contacts
 * tab of the property-detail-panel side panel on the pipeline board.
 *
 * Uses live DB — `globalSetup` seeds fixtures when DATABASE_URL is set.
 */

import { expect, test } from "@playwright/test"

import { signInAsAdmin } from "./helpers/admin-auth"
import {
  gotoSellersPipeline,
  openPropertyPanel,
  PANDA_PIPELINE_SEED_CARD_ADDRESS_SNIPPET,
  sellersCardByAddressSnippet,
} from "./helpers/panda-pipeline-panels"
import { requirePandaLiveE2eEnv } from "./helpers/require-panda-live-e2e-env"

const SEED_CONTACT_NAME = "E2E Seed Contact (Playwright)"
const SEED_CONTACT_ASSOCIATION = "Buyer"

test(
  "seeded contact (entityCategoryId=4) appears in the pipeline property detail panel Contacts tab",
  async ({ page }) => {
    requirePandaLiveE2eEnv()

    await signInAsAdmin(page)
    await gotoSellersPipeline(page)

    const card = sellersCardByAddressSnippet(page, PANDA_PIPELINE_SEED_CARD_ADDRESS_SNIPPET).first()
    await expect(card).toBeVisible({ timeout: 20_000 })

    const panel = await openPropertyPanel(page, card)

    // Switch to the Contacts tab
    await panel.getByTestId("property-panel-tab--contacts").click()

    // Wait for content to be ready (panel is already loaded; tab switch is synchronous)
    await expect(panel.locator('[data-testid="panel-content-ready"]')).toBeVisible()

    // The seeded contact card must be visible
    const contactCards = panel.locator('[data-testid^="pipeline-contact-card--"]')
    await expect(contactCards.first()).toBeVisible({ timeout: 10_000 })

    // Verify the contact name
    await expect(panel.getByText(SEED_CONTACT_NAME)).toBeVisible()

    // Empty-state message must NOT be shown
    await expect(panel.getByText("No contacts linked yet.")).toHaveCount(0)
  },
)

test(
  "seeded contact with association=Buyer shows a Buyer badge in the Contacts tab",
  async ({ page }) => {
    requirePandaLiveE2eEnv()

    await signInAsAdmin(page)
    await gotoSellersPipeline(page)

    const card = sellersCardByAddressSnippet(page, PANDA_PIPELINE_SEED_CARD_ADDRESS_SNIPPET).first()
    await expect(card).toBeVisible({ timeout: 20_000 })

    const panel = await openPropertyPanel(page, card)

    await panel.getByTestId("property-panel-tab--contacts").click()
    await expect(panel.locator('[data-testid="panel-content-ready"]')).toBeVisible()

    // Find the contact card for the seeded contact
    const contactCard = panel
      .locator('[data-testid^="pipeline-contact-card--"]')
      .filter({ hasText: SEED_CONTACT_NAME })
    await expect(contactCard).toBeVisible({ timeout: 10_000 })

    // Association badge must be visible within the card
    await expect(contactCard.locator('[data-testid^="pipeline-contact-association--"]')).toBeVisible()
    await expect(contactCard.locator('[data-testid^="pipeline-contact-association--"]')).toHaveText(SEED_CONTACT_ASSOCIATION)
  },
)
