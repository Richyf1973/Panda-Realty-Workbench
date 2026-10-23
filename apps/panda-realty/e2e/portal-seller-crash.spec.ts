// Run: npm run test:e2e:scratch -- --app=panda-realty --spec="apps/panda-realty/e2e/portal-seller-crash.spec.ts" --no-retry

import { expect, test } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { createStory, shotFocused } from "@repo/e2e-utils"

import { requirePandaE2eAdminCredentials } from "./helpers/admin-auth"
import {
  MOCK_SELLER_TOKEN_ACTIVE,
  navigateToPropertyDialog,
} from "./helpers/panda-seller-portal-mocks"
import {
  MOCK_NEW_SELLER_TOKEN,
  setupCrashPage,
} from "./helpers/portal-seller-crash-setup"

const SHOT_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "screenshots",
  "portal-seller-crash",
)

const story = createStory({ specUrl: import.meta.url, slug: "portal-seller-crash" })
story.setWhatWasBuilt(
  "Seller Portal Phase 4 — Contract Crash: a Contract Crash button in the Seller portal access panel " +
  "that atomically revokes the buyer portal token, un-accepts the accepted offer, resets all buyer file " +
  "share flags, revokes the old seller token, creates a new seller token, and resets the deal pipeline " +
  "stage — all in one DB transaction. Files affected: property-seller-portal-panel.tsx, " +
  "POST /api/admin/properties/[id]/contract-crash.",
)

// ── Lifecycle ─────────────────────────────────────────────────────────────────

test.beforeAll(() => {
  requirePandaE2eAdminCredentials()
})

test.beforeEach(async () => {
  await mkdir(SHOT_DIR, { recursive: true })
})

test.afterAll(() => {
  story.write()
})

// ── Happy Path ────────────────────────────────────────────────────────────────

test.describe("Contract Crash happy path (mocked)", () => {
  test.beforeEach(() => { test.setTimeout(90_000) })

  test("Contract Crash button visible in seller portal panel", async ({ page }) => {
    await setupCrashPage(page, { sellerToken: MOCK_SELLER_TOKEN_ACTIVE })
    const dialog = await navigateToPropertyDialog(page)
    const panel = dialog.getByTestId("portal-seller-access-panel")
    await expect(panel).toBeVisible({ timeout: 15_000 })

    const crashBtn = panel.getByTestId("portal-seller-crash-btn")
    await expect(crashBtn).toBeVisible({ timeout: 5_000 })

    await shotFocused(page, panel, SHOT_DIR, "01-crash-btn")
    story.addScene({
      title: "01 — Contract Crash: Button Visible in Seller Portal Panel",
      images: [join(SHOT_DIR, "01-crash-btn.png")],
      seeing: "Contract Crash button is visible below the active seller portal link in the panel.",
      steps: [
        "Open property edit dialog",
        "Seller portal access panel loaded with an active token",
        "Contract Crash button is visible",
      ],
    })
  })

  test("clicking Contract Crash opens confirmation dialog with all 6 action bullets", async ({ page }) => {
    await setupCrashPage(page, { sellerToken: MOCK_SELLER_TOKEN_ACTIVE })
    const dialog = await navigateToPropertyDialog(page)
    const panel = dialog.getByTestId("portal-seller-access-panel")
    await expect(panel).toBeVisible({ timeout: 15_000 })

    const crashBtn = panel.getByTestId("portal-seller-crash-btn")
    await expect(crashBtn).toBeVisible({ timeout: 5_000 })
    await crashBtn.click()

    const crashDialog = page.getByTestId("portal-seller-crash-dialog")
    await expect(crashDialog).toBeVisible({ timeout: 5_000 })

    await expect(crashDialog).toContainText(/Revoke the current buyer.*portal access/i)
    await expect(crashDialog).toContainText(/Un-accept the current accepted offer/i)
    await expect(crashDialog).toContainText(/Reset all.*Share with buyer.*file toggles/i)
    await expect(crashDialog).toContainText(/Revoke the current seller portal link/i)
    await expect(crashDialog).toContainText(/Generate a new seller portal link/i)
    await expect(crashDialog).toContainText(/Reset the deal pipeline stage/i)

    const cancelBtn = crashDialog.getByTestId("portal-seller-crash-cancel-btn")
    const confirmBtn = crashDialog.getByTestId("portal-seller-crash-confirm-btn")
    await expect(cancelBtn).toBeVisible()
    await expect(confirmBtn).toBeVisible()

    await shotFocused(page, crashDialog, SHOT_DIR, "02-crash-dialog")
    story.addScene({
      title: "02 — Contract Crash: Confirmation Dialog",
      images: [join(SHOT_DIR, "02-crash-dialog.png")],
      seeing:
        "Clicking Contract Crash opens a confirmation dialog listing all 6 consequences " +
        "with Cancel and Confirm Contract Crash buttons.",
      steps: [
        "Click Contract Crash button",
        "Confirmation dialog opens listing all 6 actions",
        "Both Cancel and Confirm buttons are visible",
      ],
    })
  })

  test("Cancel closes dialog and leaves seller link unchanged", async ({ page }) => {
    await setupCrashPage(page, { sellerToken: MOCK_SELLER_TOKEN_ACTIVE })
    const dialog = await navigateToPropertyDialog(page)
    const panel = dialog.getByTestId("portal-seller-access-panel")
    await expect(panel).toBeVisible({ timeout: 15_000 })

    const urlDisplay = panel.getByTestId("portal-seller-url-display")
    await expect(urlDisplay).toBeVisible({ timeout: 5_000 })
    const originalUrl = await urlDisplay.innerText()

    // Capture before state
    await shotFocused(page, panel, SHOT_DIR, "03a-before-cancel")

    const crashBtn = panel.getByTestId("portal-seller-crash-btn")
    await expect(crashBtn).toBeVisible({ timeout: 5_000 })
    await crashBtn.click()
    const crashDialog = page.getByTestId("portal-seller-crash-dialog")
    await expect(crashDialog).toBeVisible({ timeout: 5_000 })

    await crashDialog.getByTestId("portal-seller-crash-cancel-btn").click()
    await expect(crashDialog).not.toBeVisible({ timeout: 3_000 })

    // Original link must be unchanged
    await expect(urlDisplay).toContainText(originalUrl)

    await shotFocused(page, panel, SHOT_DIR, "03b-after-cancel")
    story.addScene({
      title: "03 — Contract Crash: Cancel Leaves Panel Unchanged",
      images: [
        join(SHOT_DIR, "03a-before-cancel.png"),
        join(SHOT_DIR, "03b-after-cancel.png"),
      ],
      seeing:
        "Left: panel before opening dialog. " +
        "Right: after clicking Cancel — dialog dismissed, original seller link still displayed.",
      steps: [
        "Click Contract Crash to open dialog",
        "Click Cancel",
        "Dialog closes",
        "Seller portal panel still shows the original link URL",
      ],
    })
  })

  test("Confirm Contract Crash calls API and panel shows new seller link", async ({ page }) => {
    await setupCrashPage(page, {
      sellerToken: MOCK_SELLER_TOKEN_ACTIVE,
      crashStatus: 200,
      crashBody: { sellerToken: MOCK_NEW_SELLER_TOKEN },
    })
    const dialog = await navigateToPropertyDialog(page)
    const panel = dialog.getByTestId("portal-seller-access-panel")
    await expect(panel).toBeVisible({ timeout: 15_000 })

    const urlDisplay = panel.getByTestId("portal-seller-url-display")
    await expect(urlDisplay).toBeVisible({ timeout: 5_000 })
    const originalUrlText = await urlDisplay.innerText()

    const crashBtn = panel.getByTestId("portal-seller-crash-btn")
    await expect(crashBtn).toBeVisible({ timeout: 5_000 })
    await crashBtn.click()
    const crashDialog = page.getByTestId("portal-seller-crash-dialog")
    await expect(crashDialog).toBeVisible({ timeout: 5_000 })

    await shotFocused(page, crashDialog, SHOT_DIR, "04a-confirm-dialog-open")

    await crashDialog.getByTestId("portal-seller-crash-confirm-btn").click()

    // Dialog closes, new link appears
    await expect(crashDialog).not.toBeVisible({ timeout: 10_000 })
    await expect(urlDisplay).toBeVisible({ timeout: 10_000 })
    await expect(urlDisplay).toContainText(MOCK_NEW_SELLER_TOKEN.token)

    // New link must differ from original
    const newUrlText = await urlDisplay.innerText()
    expect(newUrlText).not.toBe(originalUrlText)

    await shotFocused(page, panel, SHOT_DIR, "04b-new-link-shown")
    story.addScene({
      title: "04 — Contract Crash: Confirm Executes Crash and Shows New Link",
      images: [
        join(SHOT_DIR, "04a-confirm-dialog-open.png"),
        join(SHOT_DIR, "04b-new-link-shown.png"),
      ],
      seeing:
        "Left: confirmation dialog open before confirming. " +
        "Right: after confirm — dialog dismissed, panel shows updated URL with new seller token.",
      steps: [
        "Click Contract Crash, click Confirm Contract Crash",
        "POST /api/admin/properties/{id}/contract-crash called",
        "Dialog closes",
        "Panel URL display shows new token (different from original)",
      ],
    })
  })
})

// ── Edge Cases ────────────────────────────────────────────────────────────────

test.describe("Contract Crash edge cases (mocked)", () => {
  test.beforeEach(() => { test.setTimeout(90_000) })

  test("no accepted offer returns 409 and error message shown", async ({ page }) => {
    const NO_OFFER_MSG = "No accepted offer found. Accept a buyer offer before triggering a contract crash."
    await setupCrashPage(page, {
      sellerToken: MOCK_SELLER_TOKEN_ACTIVE,
      crashStatus: 409,
      crashBody: { error: NO_OFFER_MSG },
    })
    const dialog = await navigateToPropertyDialog(page)
    const panel = dialog.getByTestId("portal-seller-access-panel")
    await expect(panel).toBeVisible({ timeout: 15_000 })

    const urlDisplay = panel.getByTestId("portal-seller-url-display")
    await expect(urlDisplay).toBeVisible({ timeout: 5_000 })

    const crashBtn = panel.getByTestId("portal-seller-crash-btn")
    await expect(crashBtn).toBeVisible({ timeout: 5_000 })
    await crashBtn.click()

    const crashDialog = page.getByTestId("portal-seller-crash-dialog")
    await expect(crashDialog).toBeVisible({ timeout: 5_000 })
    await crashDialog.getByTestId("portal-seller-crash-confirm-btn").click()

    const errorMsg = page.getByTestId("portal-seller-crash-error")
    await expect(errorMsg).toBeVisible({ timeout: 5_000 })
    await expect(errorMsg).toContainText(/No accepted offer found/i)

    // Original link must still be present
    await expect(urlDisplay).toContainText(MOCK_SELLER_TOKEN_ACTIVE.token)

    await shotFocused(page, crashDialog, SHOT_DIR, "05-no-offer-error")
    story.addScene({
      title: "05 — Contract Crash: Error When No Accepted Offer",
      images: [join(SHOT_DIR, "05-no-offer-error.png")],
      seeing: "When crash API returns 409, an error message is shown inside the open dialog and the original seller link is preserved.",
      steps: [
        "Click Contract Crash (API mocked to return 409)",
        "Error message displayed: No accepted offer found",
        "Original panel link unchanged",
      ],
    })
  })

  test("network failure - error shown and original link preserved", async ({ page }) => {
    await setupCrashPage(page, {
      sellerToken: MOCK_SELLER_TOKEN_ACTIVE,
      crashStatus: 500,
      crashBody: { error: "Internal server error" },
    })
    const dialog = await navigateToPropertyDialog(page)
    const panel = dialog.getByTestId("portal-seller-access-panel")
    await expect(panel).toBeVisible({ timeout: 15_000 })

    const urlDisplay = panel.getByTestId("portal-seller-url-display")
    await expect(urlDisplay).toBeVisible({ timeout: 5_000 })
    const originalUrl = await urlDisplay.innerText()

    const crashBtn = panel.getByTestId("portal-seller-crash-btn")
    await expect(crashBtn).toBeVisible({ timeout: 5_000 })
    await crashBtn.click()

    const crashDialog = page.getByTestId("portal-seller-crash-dialog")
    await expect(crashDialog).toBeVisible({ timeout: 5_000 })
    await crashDialog.getByTestId("portal-seller-crash-confirm-btn").click()

    const errorMsg = page.getByTestId("portal-seller-crash-error")
    await expect(errorMsg).toBeVisible({ timeout: 5_000 })

    // Original link must still be present
    await expect(urlDisplay).toContainText(originalUrl)

    await shotFocused(page, crashDialog, SHOT_DIR, "06-network-error")
    story.addScene({
      title: "06 — Contract Crash: Network Failure Shows Error",
      images: [join(SHOT_DIR, "06-network-error.png")],
      seeing: "When crash API returns 500, an error is shown inside the open dialog and the original seller link is preserved.",
      steps: [
        "Click Contract Crash (API mocked to return 500)",
        "Error message displayed",
        "Original panel link unchanged",
      ],
    })
  })
})
