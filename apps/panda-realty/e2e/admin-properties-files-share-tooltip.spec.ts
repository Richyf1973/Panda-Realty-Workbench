// Run: npm run test:e2e:scratch -- --app=panda-realty --spec="apps/panda-realty/e2e/admin-properties-files-share-tooltip.spec.ts" --no-bail --workers=1

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
  "files-share-tooltip",
)

const story = createStory({ specUrl: import.meta.url, slug: "files-share-tooltip" })
story.setWhatWasBuilt(
  "The property Documents tab now shows two labelled toggle switches per file row: " +
    "'Buyer' (formerly 'Share with client portal') and 'Seller' (new). " +
    "Each switch has a tooltip matching its label. " +
    "Implemented in both the property dialog files tab (property-files-list.tsx) and " +
    "the pipeline panel files tab (panel-files-tab.tsx).",
)

test.beforeEach(async () => {
  await mkdir(SHOT_DIR, { recursive: true })
})

test.afterAll(async () => {
  story.write()
})

// ── Fixtures ─────────────────────────────────────────────────────────────────

const STATUS_MIN = {
  items: [{ propertyStatusId: 1, propertyStatusCode: "ACTIVE", propertyStatus: "Active" }],
  totalCount: 1,
  limit: 100,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false,
  startCursor: null,
  endCursor: null,
}

const EMPTY_PROPERTY_ENTITIES_LIST = {
  items: [],
  totalCount: 0,
  limit: 20,
  totalPages: 0,
  hasNextPage: false,
  hasPreviousPage: false,
  startCursor: null,
  endCursor: null,
}

const AGGREGATE_FILES = {
  items: [
    {
      kind: "property" as const,
      id: 10,
      propertyListFileId: 10,
      fileName: "floorplan-e2e.pdf",
      fileType: "application/pdf",
      fileSize: 2048,
      fileLink: "https://example.com/view-floorplan",
      googleDriveFileId: "drive-floor",
      source: "google_drive",
      createdAt: "2026-01-10T00:00:00.000Z",
      sourceLabel: "Property",
      sharedWithPortal: false,
      sharedWithSeller: false,
    },
    {
      kind: "property" as const,
      id: 11,
      propertyListFileId: 11,
      fileName: "contract-signed.pdf",
      fileType: "application/pdf",
      fileSize: 1024,
      fileLink: "https://example.com/view-contract",
      googleDriveFileId: null,
      source: null,
      createdAt: "2026-01-11T00:00:00.000Z",
      sourceLabel: "Property",
      sharedWithPortal: true,
      sharedWithSeller: false,
    },
  ],
}

// ── Dialog view (mocked APIs) ─────────────────────────────────────────────────

test.describe("Share switch tooltip — property dialog files tab (mocked)", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaE2eAdminCredentials()
    await page.route("**/api/admin/property-status**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(STATUS_MIN),
      })
    })
    await page.route("**/api/admin/property-entities**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(EMPTY_PROPERTY_ENTITIES_LIST),
      })
    })
    await page.route("**/api/admin/property-list-files?**", async (route) => {
      if (route.request().method() !== "GET") {
        await route.fallback()
        return
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(AGGREGATE_FILES),
      })
    })
    await signInAsAdmin(page)
  })

  test("hovering buyer switch (off) shows Buyer tooltip", async ({ page }) => {
    await routePandaPropertiesListDetailAndBuyerOffers(page)
    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible()
    await page.getByTestId("admin-entity-row--properties--1001").click()

    const dialog = page.getByTestId("admin-entity-crud-dialog--properties")
    await expect(dialog).toBeVisible()
    await page.getByTestId("panda-properties-form-tab-trigger--files").click()
    await expect(page.getByTestId("panda-properties-form-tab--files-content")).toBeVisible()
    await expect(page.getByText("floorplan-e2e.pdf")).toBeVisible()

    const rows = page.getByTestId("panda-properties-form-files-row")
    const firstRow = rows.first()
    const buyerSwitch = firstRow.getByRole("switch", { name: /share with buyer/i })
    await expect(buyerSwitch).toBeVisible({ timeout: 10_000 })

    await shotFocused(page, buyerSwitch, SHOT_DIR, "01a-dialog-switch-before-hover")

    await buyerSwitch.hover()
    const tooltip = page.getByRole("tooltip")
    await expect(tooltip).toBeVisible({ timeout: 5_000 })
    await expect(tooltip).toContainText("Buyer")

    await shotFocused(page, tooltip, SHOT_DIR, "01b-dialog-switch-tooltip-off")

    story.addScene({
      title: "01 — Dialog Files Tab: Buyer Switch Tooltip (off state)",
      images: [
        join(SHOT_DIR, "01a-dialog-switch-before-hover.png"),
        join(SHOT_DIR, "01b-dialog-switch-tooltip-off.png"),
      ],
      seeing:
        "Left: Buyer switch before hover — no tooltip visible. " +
        "Right: after hover — tooltip reads 'Buyer'.",
      steps: [
        "Open any property's edit dialog",
        "Switch to the Files tab",
        "Hover over the Buyer toggle (currently off)",
        "Tooltip appears: 'Buyer'",
      ],
    })
  })

  test("hovering buyer switch (on) also shows the tooltip", async ({ page }) => {
    await routePandaPropertiesListDetailAndBuyerOffers(page)
    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible()
    await page.getByTestId("admin-entity-row--properties--1001").click()

    const dialog = page.getByTestId("admin-entity-crud-dialog--properties")
    await expect(dialog).toBeVisible()
    await page.getByTestId("panda-properties-form-tab-trigger--files").click()
    await expect(page.getByTestId("panda-properties-form-tab--files-content")).toBeVisible()

    // Second row has sharedWithPortal: true
    const rows = page.getByTestId("panda-properties-form-files-row")
    const secondRow = rows.nth(1)
    const buyerSwitch = secondRow.getByRole("switch", { name: /share with buyer/i })
    await expect(buyerSwitch).toBeVisible({ timeout: 10_000 })

    await buyerSwitch.hover()
    const tooltip = page.getByRole("tooltip")
    await expect(tooltip).toBeVisible({ timeout: 5_000 })
    await expect(tooltip).toContainText("Buyer")

    await shotFocused(page, tooltip, SHOT_DIR, "02-dialog-switch-tooltip-on")

    story.addScene({
      title: "02 — Dialog Files Tab: Buyer Switch Tooltip (on state)",
      images: [join(SHOT_DIR, "02-dialog-switch-tooltip-on.png")],
      seeing: "Tooltip appears even when the Buyer switch is in the ON (shared) state.",
      steps: [
        "Open any property's edit dialog → Files tab",
        "Hover the Buyer switch on a row that is already shared",
        "Tooltip still reads 'Buyer'",
      ],
    })
  })
})

// ── Pipeline panel view (live DB) ─────────────────────────────────────────────

test.describe("Share switch tooltip — pipeline panel files tab (live)", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaLiveE2eEnv()
    await signInAsAdmin(page)
    await gotoSellersPipeline(page)
  })

  test("hovering buyer switch in panel files tab shows Buyer tooltip", async ({
    page,
  }) => {
    const card = sellersCardByAddressSnippet(page, PANDA_PIPELINE_SEED_CARD_ADDRESS_SNIPPET).first()
    await expect(card).toBeVisible({ timeout: 20_000 })
    const panel = await openPropertyPanel(page, card)

    await panel.getByTestId("property-panel-tab--files").click()

    const buyerSwitch = panel.getByRole("switch", { name: /share with buyer/i }).first()
    await expect(buyerSwitch).toBeVisible({ timeout: 10_000 })

    await shotFocused(page, buyerSwitch, SHOT_DIR, "03a-panel-switch-before-hover")

    await buyerSwitch.hover()
    const tooltip = page.getByRole("tooltip")
    await expect(tooltip).toBeVisible({ timeout: 5_000 })
    await expect(tooltip).toContainText("Buyer")

    await shotFocused(page, tooltip, SHOT_DIR, "03b-panel-switch-tooltip")

    story.addScene({
      title: "03 — Pipeline Panel Files Tab: Buyer Switch Tooltip",
      images: [
        join(SHOT_DIR, "03a-panel-switch-before-hover.png"),
        join(SHOT_DIR, "03b-panel-switch-tooltip.png"),
      ],
      seeing:
        "Left: Buyer switch before hover — no tooltip. " +
        "Right: after hover — tooltip reads 'Buyer'.",
      steps: [
        "Open the pipeline kanban and click a property card",
        "Switch to the Files tab in the detail panel",
        "Hover over the Buyer toggle switch",
        "Tooltip appears: 'Buyer'",
      ],
    })
  })
})
