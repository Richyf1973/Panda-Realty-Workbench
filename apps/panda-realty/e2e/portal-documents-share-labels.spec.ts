// Run: npm run test:e2e:scratch -- --app=panda-realty --spec="apps/panda-realty/e2e/portal-documents-share-labels.spec.ts" --no-bail --workers=1

import { expect, test } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { createStory, shotFocused } from "@repo/e2e-utils"

import {
  requirePandaE2eAdminCredentials,
  requirePandaE2eAdminListLiveEnv,
  signInAsAdmin,
} from "./helpers/admin-auth"
import {
  gotoSellersPipeline,
  openPropertyPanel,
  PANDA_PIPELINE_SEED_CARD_ADDRESS_SNIPPET,
  sellersCardByAddressSnippet,
} from "./helpers/panda-pipeline-panels"
import { routePandaPropertiesListDetailAndBuyerOffers } from "./helpers/panda-properties-dialog-mocks"
import { createOrGetSellerToken } from "./helpers/panda-seller-portal-mocks"
import { requirePandaLiveE2eEnv } from "./helpers/require-panda-live-e2e-env"

// Live seed (seller path): 99 E2E Seed Street (propertyListId 223319) has a seller-capable token and
// property-list file 1 ("blank.txt"). Seller fixtures need owner data, which this seeded property has.
const SELLER_FIXTURE = { propertyListId: 223319 }
const LIST_FILE_ID = 1
const LIST_FILE_NAME = "blank.txt"

// Buyer path uses the SAME seeded property (223319): a buyer token needs a propertyEntityId,
// and entity 185819 ("E2E Seed Member") belongs to it. The buyer portal lists property-list files
// for the token's propertyListId, so sharing list file 1 with the buyer surfaces it there too.
const BUYER_FIXTURE = { propertyEntityId: 185819, propertyListId: 223319 }

async function patchListFileShare(
  page: Parameters<typeof signInAsAdmin>[0],
  body: { sharedWithPortal?: boolean; sharedWithSeller?: boolean },
) {
  await page.context().request.patch(`/api/admin/property-list-files/${LIST_FILE_ID}`, {
    data: body,
  })
}

const SHOT_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "screenshots",
  "portal-documents-share-labels",
)

const story = createStory({ specUrl: import.meta.url, slug: "portal-documents-share-labels" })
story.setWhatWasBuilt(
  "Fix for portal documents not showing when shared: the two per-file share switches " +
    "(Buyer = sharedWithPortal, Seller = sharedWithSeller) were visually identical with only " +
    "hover tooltips, so users toggled the wrong one. Each switch now carries a visible inline " +
    "text label ('Buyer' / 'Seller') in both the property dialog Files list (property-files-list.tsx) " +
    "and the board panel Files tab (panel-files-tab.tsx), and toggling shows a confirmation toast " +
    "naming the audience and new state (e.g. 'Shared with buyer portal').",
)

test.beforeEach(async () => {
  await mkdir(SHOT_DIR, { recursive: true })
})

test.afterAll(() => {
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

// Row 0: nothing shared. Row 1: buyer shared, seller not.
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

async function routeDialogBaseApis(page: Parameters<typeof signInAsAdmin>[0]) {
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
}

async function openDialogFilesTab(page: Parameters<typeof signInAsAdmin>[0]) {
  await routePandaPropertiesListDetailAndBuyerOffers(page)
  await page.goto("/admin/properties")
  await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible()
  await page.getByTestId("admin-entity-row--properties--1001").click()
  const dialog = page.getByTestId("admin-entity-crud-dialog--properties")
  await expect(dialog).toBeVisible()
  await page.getByTestId("panda-properties-form-tab-trigger--files").click()
  await expect(page.getByTestId("panda-properties-form-tab--files-content")).toBeVisible()
  await expect(page.getByText("floorplan-e2e.pdf")).toBeVisible()
}

// ── MV-1: visible Buyer/Seller labels in the dialog Files list (mocked) ────────

test.describe("Share switch labels — property dialog files list (mocked)", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaE2eAdminCredentials()
    await routeDialogBaseApis(page)
    await signInAsAdmin(page)
  })

  test("MV-1 each file row shows a visible Buyer label beside the buyer switch", async ({
    page,
  }) => {
    await openDialogFilesTab(page)

    const rows = page.getByTestId("panda-properties-form-files-row")
    const firstRow = rows.first()

    const buyerLabel = firstRow.getByTestId("files-buyer-share-label")
    await expect(buyerLabel).toBeVisible({ timeout: 10_000 })
    await expect(buyerLabel).toHaveText("Buyer")

    await shotFocused(page, firstRow, SHOT_DIR, "01-dialog-row-labels")
    story.addScene({
      title: "01 — Dialog Files List: visible Buyer / Seller labels",
      images: [join(SHOT_DIR, "01-dialog-row-labels.png")],
      seeing:
        "Each file row now shows the text 'Buyer' and 'Seller' next to their respective " +
        "switches, so the audience of each toggle is unambiguous without hovering.",
      steps: [
        "Open a property dialog → Files tab",
        "Observe each row has a labelled Buyer switch and a labelled Seller switch",
      ],
    })
  })

  test("MV-1 each file row shows a visible Seller label beside the seller switch", async ({
    page,
  }) => {
    await openDialogFilesTab(page)

    const firstRow = page.getByTestId("panda-properties-form-files-row").first()
    const sellerLabel = firstRow.getByTestId("files-seller-share-label")
    await expect(sellerLabel).toBeVisible({ timeout: 10_000 })
    await expect(sellerLabel).toHaveText("Seller")
  })
})

// ── MV-3: confirmation toast on toggle (mocked) ───────────────────────────────

test.describe("Share switch toast — property dialog files list (mocked)", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaE2eAdminCredentials()
    await routeDialogBaseApis(page)
    // PATCH for both file kinds succeeds.
    await page.route("**/api/admin/property-list-files/*", async (route) => {
      if (route.request().method() !== "PATCH") {
        await route.fallback()
        return
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      })
    })
    await signInAsAdmin(page)
  })

  test("MV-3 toggling Buyer on shows a buyer portal shared toast", async ({ page }) => {
    await openDialogFilesTab(page)

    // Row 0 starts unshared → turning Buyer on.
    const firstRow = page.getByTestId("panda-properties-form-files-row").first()
    const buyerSwitch = firstRow.getByRole("switch", { name: /share with buyer/i })
    await expect(buyerSwitch).toBeVisible({ timeout: 10_000 })

    await buyerSwitch.click()

    const toast = page.getByText(/shared with buyer portal/i)
    await expect(toast).toBeVisible({ timeout: 5_000 })

    await shotFocused(page, firstRow, SHOT_DIR, "02-buyer-toast")
    story.addScene({
      title: "02 — Toggle Buyer on: confirmation toast",
      images: [join(SHOT_DIR, "02-buyer-toast.png")],
      seeing: "Turning the Buyer switch on surfaces a toast confirming the buyer portal was shared.",
      steps: [
        "Open dialog Files tab",
        "Turn a row's Buyer switch on",
        "Observe the 'Shared with buyer portal' toast",
      ],
    })
  })

  test("MV-3 toggling Buyer off on an already-shared row shows a removed toast", async ({
    page,
  }) => {
    await openDialogFilesTab(page)

    // Row 1 has sharedWithPortal: true → turning Buyer off.
    const secondRow = page.getByTestId("panda-properties-form-files-row").nth(1)
    const buyerSwitch = secondRow.getByRole("switch", { name: /share with buyer/i })
    await expect(buyerSwitch).toBeVisible({ timeout: 10_000 })

    await buyerSwitch.click()

    await expect(page.getByText(/removed from buyer portal/i)).toBeVisible({ timeout: 5_000 })
  })

  test("MV-3 toggling Seller on shows a seller portal shared toast", async ({ page }) => {
    await openDialogFilesTab(page)

    const firstRow = page.getByTestId("panda-properties-form-files-row").first()
    const sellerSwitch = firstRow.getByRole("switch", { name: /share with seller/i })
    await expect(sellerSwitch).toBeVisible({ timeout: 10_000 })

    await sellerSwitch.click()

    await expect(page.getByText(/shared with seller portal/i)).toBeVisible({ timeout: 5_000 })
  })
})

// ── MV-3.4: failed PATCH does not flip switch and shows no success toast ───────

test.describe("Share switch error handling — property dialog files list (mocked)", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaE2eAdminCredentials()
    await routeDialogBaseApis(page)
    await page.route("**/api/admin/property-list-files/*", async (route) => {
      if (route.request().method() !== "PATCH") {
        await route.fallback()
        return
      }
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "boom" }),
      })
    })
    await signInAsAdmin(page)
  })

  test("MV-3.4 a failed buyer PATCH leaves the switch off and shows no success toast", async ({
    page,
  }) => {
    await openDialogFilesTab(page)

    const firstRow = page.getByTestId("panda-properties-form-files-row").first()
    const buyerSwitch = firstRow.getByRole("switch", { name: /share with buyer/i })
    await expect(buyerSwitch).toHaveAttribute("aria-checked", "false")

    await buyerSwitch.click()

    // An error toast is surfaced…
    await expect(page.getByText(/could not update sharing/i)).toBeVisible({ timeout: 5_000 })
    // …no false success toast…
    await expect(page.getByText(/shared with buyer portal/i)).toHaveCount(0)
    // …and the switch did not flip on.
    await expect(buyerSwitch).toHaveAttribute("aria-checked", "false")
  })
})

// ── MV-2: visible labels in the board panel Files tab (live DB) ────────────────

test.describe("Share switch labels — pipeline panel files tab (live)", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaLiveE2eEnv()
    await signInAsAdmin(page)
    await gotoSellersPipeline(page)
  })

  test("MV-2 panel files tab shows visible Buyer and Seller labels per row", async ({ page }) => {
    const card = sellersCardByAddressSnippet(page, PANDA_PIPELINE_SEED_CARD_ADDRESS_SNIPPET).first()
    await expect(card).toBeVisible({ timeout: 20_000 })
    const panel = await openPropertyPanel(page, card)

    await panel.getByTestId("property-panel-tab--files").click()

    const buyerLabel = panel.getByTestId("pipeline-property-file-buyer-label").first()
    const sellerLabel = panel.getByTestId("pipeline-property-file-seller-label").first()
    await expect(buyerLabel).toBeVisible({ timeout: 10_000 })
    await expect(buyerLabel).toHaveText("Buyer")
    await expect(sellerLabel).toBeVisible({ timeout: 10_000 })
    await expect(sellerLabel).toHaveText("Seller")

    await shotFocused(page, buyerLabel, SHOT_DIR, "03-panel-row-labels")
    story.addScene({
      title: "03 — Pipeline Panel Files Tab: visible Buyer / Seller labels",
      images: [join(SHOT_DIR, "03-panel-row-labels.png")],
      seeing: "The board panel Files tab shows the same labelled Buyer and Seller switches.",
      steps: [
        "Open the pipeline kanban and click a property card",
        "Switch to the Files tab in the detail panel",
        "Observe labelled Buyer and Seller switches",
      ],
    })
  })
})

// ── MV-5: the Seller switch actually surfaces a file in the SELLER portal (live, end-to-end) ──
// This is the regression that started this work and was previously untested — the seller portal
// only had an empty-state test. (The buyer positive path is covered by portal-documents.spec.ts
// "portal Documents section is visible with shared files".)

test.describe("Share-to-portal end-to-end (live)", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaE2eAdminListLiveEnv()
    await signInAsAdmin(page)
  })

  test.afterEach(async ({ page }) => {
    // Leave seed state clean so other specs see the file as unshared.
    await patchListFileShare(page, { sharedWithPortal: false, sharedWithSeller: false })
  })

  test("MV-5 a file shared with the Seller appears in the seller portal Documents tab", async ({
    page,
  }) => {
    await patchListFileShare(page, { sharedWithSeller: true })

    const { token } = await createOrGetSellerToken(page, SELLER_FIXTURE)
    await page.goto(`/portal/seller/${token}?tab=documents`)
    await expect(page.getByTestId("portal-seller-shell")).toBeVisible({ timeout: 15_000 })

    const documents = page.getByTestId("portal-documents")
    await expect(documents).toBeVisible({ timeout: 10_000 })
    const fileRow = documents.locator("[data-testid^='portal-document-row']").first()
    await expect(fileRow).toBeVisible({ timeout: 10_000 })
    await expect(fileRow).toContainText(LIST_FILE_NAME)

    await shotFocused(page, documents, SHOT_DIR, "04-seller-portal-shared-doc")
    story.addScene({
      title: "04 — Seller Portal: file shared with Seller is visible in Documents",
      images: [join(SHOT_DIR, "04-seller-portal-shared-doc.png")],
      seeing:
        "After turning the Seller switch on, the file appears in the seller portal Documents tab — " +
        "confirming the Seller toggle drives the seller portal (the original bug was flipping Buyer instead).",
      steps: [
        "Admin shares a property file with the Seller (sharedWithSeller = true)",
        "Open the seller portal Documents tab",
        "The shared file row is listed",
      ],
    })
  })

  test("MV-5 a file shared with only the Buyer is NOT visible in the seller portal", async ({
    page,
  }) => {
    // Buyer on, Seller off → must be absent from the seller portal (the exact reported bug).
    await patchListFileShare(page, { sharedWithPortal: true, sharedWithSeller: false })

    const { token } = await createOrGetSellerToken(page, SELLER_FIXTURE)
    await page.goto(`/portal/seller/${token}?tab=documents`)
    await expect(page.getByTestId("portal-seller-shell")).toBeVisible({ timeout: 15_000 })

    await expect(page.getByTestId("portal-documents-empty")).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(LIST_FILE_NAME)).toHaveCount(0)
  })

  test("MV-4 a file shared with the Buyer appears in the buyer portal Documents", async ({
    page,
  }) => {
    await patchListFileShare(page, { sharedWithPortal: true })

    // POST is idempotent (returns existing non-revoked token, else creates one).
    const res = await page.context().request.post("/api/admin/portal-tokens", {
      data: BUYER_FIXTURE,
    })
    const body = await res.json()
    if (!body?.token) {
      throw new Error(
        `Buyer token creation failed (status ${res.status()}): ${JSON.stringify(body)}`,
      )
    }
    await page.goto(`/portal/${body.token}`)

    const documents = page.getByTestId("portal-documents")
    await expect(documents).toBeVisible({ timeout: 15_000 })
    const fileRow = documents.locator("[data-testid^='portal-document-row']").first()
    await expect(fileRow).toBeVisible({ timeout: 10_000 })
    await expect(fileRow).toContainText(LIST_FILE_NAME)

    await shotFocused(page, documents, SHOT_DIR, "05-buyer-portal-shared-doc")
    story.addScene({
      title: "05 — Buyer Portal: file shared with Buyer is visible in Documents",
      images: [join(SHOT_DIR, "05-buyer-portal-shared-doc.png")],
      seeing:
        "After turning the Buyer switch on, the file appears in the buyer portal Documents section — " +
        "confirming the Buyer toggle drives the buyer portal, the mirror of the seller path.",
      steps: [
        "Admin shares a property file with the Buyer (sharedWithPortal = true)",
        "Open the buyer portal",
        "The shared file row is listed in the Documents section",
      ],
    })
  })
})
