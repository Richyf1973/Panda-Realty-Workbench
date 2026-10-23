// Run: npm run test:e2e:scratch -- --app=panda-realty --spec="apps/panda-realty/e2e/admin-properties-files-switch-dark-mode.spec.ts" --no-bail --workers=1

import { expect, test } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { createStory, shotFocused } from "@repo/e2e-utils"

import { requirePandaE2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import {
  gotoSellersPipeline,
  openPropertyPanel,
  PANDA_PIPELINE_SEED_CARD_ADDRESS_SNIPPET,
  sellersCardByAddressSnippet,
} from "./helpers/panda-pipeline-panels"
import { routePandaPropertiesListDetailAndBuyerOffers } from "./helpers/panda-properties-dialog-mocks"
import { requirePandaLiveE2eEnv } from "./helpers/require-panda-live-e2e-env"

const SHOT_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "screenshots",
  "files-switch-dark-mode",
)

const story = createStory({ specUrl: import.meta.url, slug: "files-switch-dark-mode" })
story.setWhatWasBuilt(
  "Fixed the share-with-client toggle switch track in dark mode. Root cause: the switch is wrapped " +
    "in TooltipTrigger asChild, which merges data-state=closed onto the Switch button element, " +
    "overwriting data-state=unchecked/checked. Both bg-primary and bg-input were conditioned on " +
    "data-[state=...] selectors that never fired, leaving the track with no background. " +
    "Fix: replaced data-[state=unchecked]:bg-input and data-[state=checked]:bg-primary with " +
    "unconditional bg-input dark:bg-white/30 plus aria-checked:bg-primary. aria-checked is set by " +
    "Switch and is not overwritten by TooltipTrigger. File: packages/ui/src/switch.tsx.",
)

test.beforeEach(async () => {
  await mkdir(SHOT_DIR, { recursive: true })
})

test.afterAll(() => {
  story.write()
})

// ── Mocked dialog view ────────────────────────────────────────────────────────

const AGGREGATE_FILES_MOCK = {
  items: [
    {
      kind: "property" as const,
      id: 10,
      propertyListFileId: 10,
      fileName: "dark-mode-test-file.pdf",
      fileType: "application/pdf",
      fileSize: 2048,
      fileLink: "https://example.com/view-test",
      googleDriveFileId: null,
      source: null,
      createdAt: "2026-01-10T00:00:00.000Z",
      sourceLabel: "Property",
      sharedWithPortal: false,
      sharedWithSeller: false,
    },
    {
      kind: "property" as const,
      id: 11,
      propertyListFileId: 11,
      fileName: "dark-mode-shared-file.pdf",
      fileType: "application/pdf",
      fileSize: 1024,
      fileLink: "https://example.com/view-shared",
      googleDriveFileId: null,
      source: null,
      createdAt: "2026-01-11T00:00:00.000Z",
      sourceLabel: "Property",
      sharedWithPortal: true,
      sharedWithSeller: false,
    },
  ],
}

const STATUS_MOCK = {
  items: [{ propertyStatusId: 1, propertyStatusCode: "ACTIVE", propertyStatus: "Active" }],
  totalCount: 1,
  limit: 100,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false,
  startCursor: null,
  endCursor: null,
}

const EMPTY_ENTITIES_MOCK = {
  items: [],
  totalCount: 0,
  limit: 20,
  totalPages: 0,
  hasNextPage: false,
  hasPreviousPage: false,
  startCursor: null,
  endCursor: null,
}

test.describe("Switch dark mode — property dialog Files tab (mocked)", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaE2eAdminCredentials()
    await page.route("**/api/admin/property-status**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(STATUS_MOCK) })
    })
    await page.route("**/api/admin/property-entities**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_ENTITIES_MOCK) })
    })
    await page.route("**/api/admin/property-list-files?**", async (route) => {
      if (route.request().method() !== "GET") { await route.fallback(); return }
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(AGGREGATE_FILES_MOCK) })
    })
    await signInAsAdmin(page)
    await routePandaPropertiesListDetailAndBuyerOffers(page)
    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible()
    await page.getByTestId("admin-entity-row--properties--1001").click()
    await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible()
    await page.getByTestId("panda-properties-form-tab-trigger--files").click()
  })

  test("unchecked switch uses unconditional dark:bg-white/30 track (tooltip asChild fix)", async ({ page }) => {
    await expect(page.getByTestId("panda-properties-form-tab--files-content")).toBeVisible()
    await expect(page.getByText("dark-mode-test-file.pdf")).toBeVisible()

    // First row: sharedWithPortal=false → unchecked state
    const rows = page.getByTestId("panda-properties-form-files-row")
    const firstRow = rows.first()
    const shareSwitch = firstRow.getByRole("switch", { name: /share with client/i })
    await expect(shareSwitch).toBeVisible({ timeout: 10_000 })

    // The fix: unconditional dark:bg-white/30 track (not data-state conditional, which tooltip asChild overwrites)
    const switchClass = await shareSwitch.evaluate((el) => el.className)
    expect(switchClass).toContain("dark:bg-white/30")
    expect(switchClass).toContain("aria-checked:bg-primary")
    expect(switchClass).not.toContain("dark:data-[state=unchecked]:bg-input/80")
    expect(switchClass).not.toContain("data-[state=unchecked]:bg-input")

    // Enable dark mode and capture screenshot
    await page.evaluate(() => document.documentElement.classList.add("dark"))
    await shotFocused(page, shareSwitch, SHOT_DIR, "01-dialog-switch-unchecked-dark")

    story.addScene({
      title: "01 — Dialog Files Tab: Unchecked Switch Track Visible in Dark Mode",
      images: [join(SHOT_DIR, "01-dialog-switch-unchecked-dark.png")],
      seeing:
        "The share-with-client toggle in OFF state in dark mode. The switch uses bg-muted for the " +
        "track background (visible dark gray pill) instead of the old near-transparent bg-input/80.",
      steps: [
        "Open any property edit dialog",
        "Switch to the Files tab",
        "Enable dark mode",
        "Observe the share toggle OFF state — track shows as a visible dark gray pill",
      ],
    })
  })

  test("checked switch still has the correct class in dark mode", async ({ page }) => {
    await expect(page.getByText("dark-mode-shared-file.pdf")).toBeVisible()

    // Second row: sharedWithPortal=true → checked state
    const rows = page.getByTestId("panda-properties-form-files-row")
    const secondRow = rows.nth(1)
    const shareSwitch = secondRow.getByRole("switch", { name: /share with client/i })
    await expect(shareSwitch).toBeVisible({ timeout: 10_000 })

    // aria-checked:bg-primary handles checked state; dark:bg-white/30 is the unconditional unchecked default
    const switchClass = await shareSwitch.evaluate((el) => el.className)
    expect(switchClass).toContain("aria-checked:bg-primary")
    expect(switchClass).toContain("dark:bg-white/30")

    await page.evaluate(() => document.documentElement.classList.add("dark"))
    await shotFocused(page, shareSwitch, SHOT_DIR, "02-dialog-switch-checked-dark")

    story.addScene({
      title: "02 — Dialog Files Tab: Checked Switch in Dark Mode (no regression)",
      images: [join(SHOT_DIR, "02-dialog-switch-checked-dark.png")],
      seeing:
        "The share-with-client toggle in ON state in dark mode. Uses bg-primary (near-white track " +
        "with dark thumb) — unchanged by the dark mode fix.",
      steps: [
        "Open property edit dialog",
        "Switch to Files tab",
        "Enable dark mode",
        "Observe the share toggle ON state — near-white track with dark circle thumb",
      ],
    })
  })
})

// ── Live pipeline panel view ──────────────────────────────────────────────────

test.describe("Switch dark mode — pipeline panel Files tab (live)", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaLiveE2eEnv()
    await signInAsAdmin(page)
    await gotoSellersPipeline(page)
  })

  test("unchecked switch in panel Files tab uses dark:bg-white/30 (unconditional track fix)", async ({ page }) => {
    const card = sellersCardByAddressSnippet(page, PANDA_PIPELINE_SEED_CARD_ADDRESS_SNIPPET).first()
    await expect(card).toBeVisible({ timeout: 20_000 })
    const panel = await openPropertyPanel(page, card)

    await panel.getByTestId("property-panel-tab--files").click()

    const shareSwitch = panel.getByRole("switch", { name: /share with client/i }).first()
    await expect(shareSwitch).toBeVisible({ timeout: 10_000 })

    // Verify the switch has the fixed CSS classes
    const switchClass = await shareSwitch.evaluate((el) => el.className)
    expect(switchClass).toContain("dark:bg-white/30")
    expect(switchClass).toContain("aria-checked:bg-primary")
    expect(switchClass).not.toContain("dark:data-[state=unchecked]:bg-input/80")

    await page.evaluate(() => document.documentElement.classList.add("dark"))
    await shotFocused(page, shareSwitch, SHOT_DIR, "03-panel-switch-dark")

    story.addScene({
      title: "03 — Pipeline Panel Files Tab: Unchecked Switch in Dark Mode",
      images: [join(SHOT_DIR, "03-panel-switch-dark.png")],
      seeing:
        "The share-with-client switch in the pipeline panel Files tab in dark mode. " +
        "The track background is a visible dark gray pill, not just a floating white circle.",
      steps: [
        "Open the pipeline kanban in dark mode",
        "Click the seeded property card (99 E2E Seed Street)",
        "Switch to the Files tab",
        "Observe the share toggle has a visible dark gray track",
      ],
    })
  })
})
