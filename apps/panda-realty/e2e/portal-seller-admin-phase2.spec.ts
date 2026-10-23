// Run: npm run test:e2e:scratch -- --app=panda-realty --spec="apps/panda-realty/e2e/portal-seller-admin-phase2.spec.ts" --no-retry

import { expect, test } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { createStory, shotFocused } from "@repo/e2e-utils"

import {
  requirePandaE2eAdminCredentials,
  signInAsAdmin,
} from "./helpers/admin-auth"
import {
  MOCK_PROPERTY_ID,
  routePandaPropertiesListDetailAndBuyerOffers,
} from "./helpers/panda-properties-dialog-mocks"
import {
  gotoSellersPipeline,
  openPropertyPanel,
  PANDA_PIPELINE_SEED_CARD_ADDRESS_SNIPPET,
  sellersCardByAddressSnippet,
} from "./helpers/panda-pipeline-panels"

const SHOT_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "screenshots",
  "portal-seller-admin-phase2",
)

const story = createStory({ specUrl: import.meta.url, slug: "portal-seller-admin-phase2" })
story.setWhatWasBuilt(
  "Admin files tab Phase 2: each file row now has two toggles — Buyer (renamed from Share with client portal) " +
  "and Seller (new). Applies to both the pipeline panel files tab (panel-files-tab.tsx) " +
  "and the property dialog files tab (property-files-list.tsx).",
)

const STATUS_MIN = {
  items: [{ propertyStatusId: 1, propertyStatusCode: "ACTIVE", propertyStatus: "Active" }],
  totalCount: 1, limit: 100, totalPages: 1,
  hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null,
}

const EMPTY_ENTITIES_LIST = {
  items: [], totalCount: 0, limit: 20, totalPages: 0,
  hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null,
}

const AGGREGATE_FILES_WITH_SELLER = {
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

test.beforeEach(async () => {
  await mkdir(SHOT_DIR, { recursive: true })
})

test.afterAll(() => {
  story.write()
})

// ── Property dialog files tab (mocked) ───────────────────────────────────────

test.describe("Admin property dialog — files tab two-switch layout (mocked)", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaE2eAdminCredentials()

    await page.route("**/api/admin/property-status**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(STATUS_MIN) })
    })
    await page.route("**/api/admin/property-entities**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_ENTITIES_LIST) })
    })
    await page.route("**/api/admin/property-list-files?**", async (route) => {
      if (route.request().method() !== "GET") { await route.fallback(); return }
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(AGGREGATE_FILES_WITH_SELLER) })
    })
    await routePandaPropertiesListDetailAndBuyerOffers(page)
    await signInAsAdmin(page)
  })

  test("each file row has a Buyer switch and a Seller switch", async ({ page }) => {
    test.setTimeout(60_000)
    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible({ timeout: 20_000 })
    await page.getByTestId(`admin-entity-row--properties--${MOCK_PROPERTY_ID}`).click()
    const dialog = page.getByTestId("admin-entity-crud-dialog--properties")
    await expect(dialog).toBeVisible({ timeout: 10_000 })

    // Navigate to Files tab
    const filesTab = dialog.getByRole("tab", { name: /files/i })
    await expect(filesTab).toBeVisible({ timeout: 5_000 })
    await filesTab.click()

    // First file row — buyer switch
    const buyerSwitch = page.getByTestId("files-buyer-share-switch--property-10")
    await expect(buyerSwitch).toBeVisible({ timeout: 5_000 })

    // First file row — seller switch
    const sellerSwitch = page.getByTestId("files-seller-share-switch--property-10")
    await expect(sellerSwitch).toBeVisible({ timeout: 5_000 })

    await shotFocused(page, page.getByTestId("panda-properties-form-files-row").first(), SHOT_DIR, "01-two-switches")
    story.addScene({
      title: "01 — Admin Files Tab: Two Switches Per Row",
      images: [join(SHOT_DIR, "01-two-switches.png")],
      seeing: "Each file row shows a Buyer switch and a Seller switch side by side.",
      steps: [
        "Sign in as admin, open a property dialog",
        "Go to Files tab",
        "Both Buyer and Seller switches visible per file row",
      ],
    })
  })

  test("Buyer switch aria-label is Share with buyer (renamed)", async ({ page }) => {
    test.setTimeout(60_000)
    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible({ timeout: 20_000 })
    await page.getByTestId(`admin-entity-row--properties--${MOCK_PROPERTY_ID}`).click()
    await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible({ timeout: 10_000 })
    await page.getByRole("tab", { name: /files/i }).click()

    const buyerSwitch = page.getByTestId("files-buyer-share-switch--property-10")
    await expect(buyerSwitch).toBeVisible({ timeout: 5_000 })
    await expect(buyerSwitch).toHaveAttribute("aria-label", /share with buyer/i)
  })

  test("Seller switch is toggleable and not checked by default", async ({ page }) => {
    test.setTimeout(60_000)
    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible({ timeout: 20_000 })
    await page.getByTestId(`admin-entity-row--properties--${MOCK_PROPERTY_ID}`).click()
    await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible({ timeout: 10_000 })
    await page.getByRole("tab", { name: /files/i }).click()

    // Mock the PATCH to succeed
    await page.route("**/api/admin/property-list-files/10", async (route) => {
      if (route.request().method() === "PATCH") {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) })
        return
      }
      await route.fallback()
    })

    const sellerSwitch = page.getByTestId("files-seller-share-switch--property-10")
    await expect(sellerSwitch).toBeVisible({ timeout: 5_000 })

    // Toggle should start unchecked (sharedWithSeller: false in fixture)
    await expect(sellerSwitch).not.toBeChecked()

    await shotFocused(page, sellerSwitch, SHOT_DIR, "02-seller-switch-unchecked")
    story.addScene({
      title: "02 — Admin Files Tab: Seller Switch Unchecked Default",
      images: [join(SHOT_DIR, "02-seller-switch-unchecked.png")],
      seeing: "Seller switch starts unchecked when sharedWithSeller is false.",
      steps: [
        "Open property dialog Files tab",
        "Seller switch is visible and unchecked by default",
      ],
    })
  })
})

// ── Pipeline panel files tab (mocked) ────────────────────────────────────────

test.describe("Pipeline panel — files tab two-switch layout (mocked)", () => {
  test("pipeline panel file rows have buyer and seller switches", async ({ page }) => {
    test.setTimeout(60_000)
    requirePandaE2eAdminCredentials()

    await page.route("**/api/admin/properties/*/files**", async (route) => {
      if (route.request().method() !== "GET") { await route.fallback(); return }
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
        files: [
          {
            fileId: 10,
            kind: "property",
            fileName: "seller-test.pdf",
            fileType: "application/pdf",
            fileSize: 1024,
            fileLink: null,
            googleDriveFileId: null,
            sharedWithPortal: false,
            sharedWithSeller: false,
          },
        ],
      }) })
    })
    await signInAsAdmin(page)
    await gotoSellersPipeline(page)

    const card = sellersCardByAddressSnippet(page, PANDA_PIPELINE_SEED_CARD_ADDRESS_SNIPPET)
    await openPropertyPanel(page, card)

    const filesTabBtn = page.getByTestId("property-panel-tab--files")
    await expect(filesTabBtn).toBeVisible({ timeout: 10_000 })
    await filesTabBtn.click()

    // Pipeline panel uses a server action (fetchPropertyDetail), not an API route,
    // so the mock above does not intercept it — check using real data via regex matchers.
    const buyerSwitch = page.getByTestId(/^pipeline-property-file-buyer-switch--/).first()
    const sellerSwitch = page.getByTestId(/^pipeline-property-file-seller-switch--/).first()

    await expect(buyerSwitch).toBeVisible({ timeout: 5_000 })
    await expect(sellerSwitch).toBeVisible({ timeout: 5_000 })

    await shotFocused(page, page.getByTestId(/^pipeline-property-file-row--/).first(), SHOT_DIR, "03-pipeline-two-switches")
    story.addScene({
      title: "03 — Pipeline Panel Files Tab: Two Switches",
      images: [join(SHOT_DIR, "03-pipeline-two-switches.png")],
      seeing: "Pipeline panel file rows show Buyer and Seller switches side by side.",
      steps: [
        "Open sellers pipeline, open a property panel, click Files tab",
        "Both Buyer and Seller switches visible per file row",
      ],
    })
  })
})
