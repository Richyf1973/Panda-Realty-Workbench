// Run: npm run test:e2e:scratch -- --app=panda-realty --spec="apps/panda-realty/e2e/property-tabs-loading-skeleton.spec.ts" --no-bail

import { expect, test } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { createStory, shotFocused } from "@repo/e2e-utils"

import { requirePandaE2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import { routePandaPropertiesListDetailAndBuyerOffers } from "./helpers/panda-properties-dialog-mocks"

const SHOT_DIR = join(dirname(fileURLToPath(import.meta.url)), "screenshots", "property-tabs-loading-skeleton")

const story = createStory({ specUrl: import.meta.url, slug: "property-tabs-loading-skeleton" })

story.setWhatWasBuilt(
  "Property detail tabs (Buyers, Contacts, Tenants, Files, Forms) in the panda-realty admin edit dialog " +
  "now show a skeleton loader while their data is being fetched, instead of showing an empty/no-data state " +
  "prematurely. The Files tab count header also correctly shows 'Loading…' during the fetch rather than '0 files'. " +
  "Affected files: property-buyers-panel.tsx, property-contacts-panel.tsx, property-tenants-panel.tsx, " +
  "panda-properties-form-files-tab.tsx, panda-properties-form-forms-tab.tsx.",
)

const EMPTY_ITEMS = { items: [] }
const STATUS_MIN = {
  items: [{ propertyStatusId: 1, propertyStatusCode: "ACTIVE", propertyStatus: "Active" }],
  totalCount: 1, limit: 100, totalPages: 1, hasNextPage: false, hasPreviousPage: false,
  startCursor: null, endCursor: null,
}
const EMPTY_PROPERTY_ENTITIES = {
  items: [], totalCount: 0, limit: 20, totalPages: 0, hasNextPage: false, hasPreviousPage: false,
  startCursor: null, endCursor: null,
}

test.beforeEach(async ({ page }) => {
  requirePandaE2eAdminCredentials()
  await mkdir(SHOT_DIR, { recursive: true })
  await page.route("**/api/admin/property-status**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(STATUS_MIN) })
  })
  await page.route("**/api/admin/property-entities**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_PROPERTY_ENTITIES) })
  })
  await signInAsAdmin(page)
})

test.afterAll(() => {
  story.write()
})

async function openDialogBuyersTab(page: import("@playwright/test").Page) {
  await page.setViewportSize({ width: 1400, height: 900 })
  await page.goto("/admin/properties")
  await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible({ timeout: 20_000 })
  await page.getByTestId("admin-entity-row--properties--1001").click()
  await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible({ timeout: 15_000 })
}

// ─── Buyers tab ───────────────────────────────────────────────────────────────

test("buyers tab shows skeleton while loading", async ({ page }) => {
  let resolveRoute!: () => void
  const gate = new Promise<void>((res) => { resolveRoute = res })

  // Register base routes FIRST (lower priority) — handles list, detail, buyer-offers
  await routePandaPropertiesListDetailAndBuyerOffers(page)

  // Register gated buyers route LAST (highest priority — fires before the base /properties** handler)
  await page.route("**/api/admin/properties/1001/buyers**", async (route) => {
    await gate
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_ITEMS) })
  })

  await openDialogBuyersTab(page)
  await page.getByTestId("panda-properties-form-tab-trigger--buyers").click()

  const buyersTab = page.getByTestId("panda-properties-form-tab--buyers")
  const skeleton = buyersTab.locator('[data-slot="skeleton"]').first()
  await expect(skeleton).toBeVisible({ timeout: 5_000 })
  await shotFocused(page, skeleton, SHOT_DIR, "01a-buyers-skeleton")
  story.addScene({
    title: "01a — Buyers Tab: Skeleton During Load",
    images: [join(SHOT_DIR, "01a-buyers-skeleton.png")],
    seeing: "Skeleton bars visible in the Buyers tab while the API request is in-flight.",
    steps: ["Open property edit dialog", "Click Buyers tab", "Before API responds, skeleton bars appear"],
  })

  resolveRoute()
  await expect(buyersTab.getByText(/No buyers added yet/i)).toBeVisible({ timeout: 10_000 })
  await expect(buyersTab.locator('[data-slot="skeleton"]')).toHaveCount(0)
  await shotFocused(page, buyersTab.getByText(/No buyers added yet/i), SHOT_DIR, "01b-buyers-loaded")
  story.addScene({
    title: "01b — Buyers Tab: Empty State After Load",
    images: [join(SHOT_DIR, "01b-buyers-loaded.png")],
    seeing: "Skeleton is gone; empty state renders after load completes.",
    steps: ["API responds", "Skeleton disappears", "Empty state visible"],
  })
})

// ─── Contacts tab ─────────────────────────────────────────────────────────────

test("contacts tab shows skeleton while loading", async ({ page }) => {
  let resolveRoute!: () => void
  const gate = new Promise<void>((res) => { resolveRoute = res })

  // Register base routes FIRST (lower priority)
  await routePandaPropertiesListDetailAndBuyerOffers(page)

  // Register gated contacts route LAST (highest priority)
  await page.route("**/api/admin/properties/1001/contacts**", async (route) => {
    await gate
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_ITEMS) })
  })

  await openDialogBuyersTab(page)
  await page.getByTestId("panda-properties-form-tab-trigger--contacts").click()

  const contactsTab = page.getByTestId("panda-properties-form-tab--contacts")
  const skeleton = contactsTab.locator('[data-slot="skeleton"]').first()
  await expect(skeleton).toBeVisible({ timeout: 5_000 })
  await shotFocused(page, skeleton, SHOT_DIR, "02a-contacts-skeleton")
  story.addScene({
    title: "02a — Contacts Tab: Skeleton During Load",
    images: [join(SHOT_DIR, "02a-contacts-skeleton.png")],
    seeing: "Skeleton bars visible in Contacts tab while in-flight.",
    steps: ["Open property edit dialog", "Click Contacts tab", "Skeleton appears before API responds"],
  })

  resolveRoute()
  await expect(contactsTab.getByText(/No contacts added yet/i)).toBeVisible({ timeout: 10_000 })
  await expect(contactsTab.locator('[data-slot="skeleton"]')).toHaveCount(0)
})

// ─── Tenants tab ──────────────────────────────────────────────────────────────

test("tenants tab shows skeleton while loading", async ({ page }) => {
  let resolveRoute!: () => void
  const gate = new Promise<void>((res) => { resolveRoute = res })

  // Register base routes FIRST (lower priority)
  await routePandaPropertiesListDetailAndBuyerOffers(page)

  // Register gated tenants route LAST (highest priority)
  await page.route("**/api/admin/properties/1001/tenants**", async (route) => {
    await gate
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_ITEMS) })
  })

  await openDialogBuyersTab(page)
  await page.getByTestId("panda-properties-form-tab-trigger--tenants").click()

  const tenantsTab = page.getByTestId("panda-properties-form-tab--tenants")
  const skeleton = tenantsTab.locator('[data-slot="skeleton"]').first()
  await expect(skeleton).toBeVisible({ timeout: 5_000 })
  await shotFocused(page, skeleton, SHOT_DIR, "03a-tenants-skeleton")
  story.addScene({
    title: "03a — Tenants Tab: Skeleton During Load",
    images: [join(SHOT_DIR, "03a-tenants-skeleton.png")],
    seeing: "Skeleton bars visible in Tenants tab while in-flight.",
    steps: ["Open property edit dialog", "Click Tenants tab", "Skeleton appears before API responds"],
  })

  resolveRoute()
  await expect(tenantsTab.getByText(/No tenants added yet/i)).toBeVisible({ timeout: 10_000 })
  await expect(tenantsTab.locator('[data-slot="skeleton"]')).toHaveCount(0)
})

// ─── Files tab ────────────────────────────────────────────────────────────────

test("files tab shows skeleton and 'Loading…' count while loading", async ({ page }) => {
  let resolveRoute!: () => void
  const gate = new Promise<void>((res) => { resolveRoute = res })

  // Register base routes FIRST (lower priority)
  await routePandaPropertiesListDetailAndBuyerOffers(page)

  // Files API path doesn't overlap with /api/admin/properties — register in any order
  await page.route("**/api/admin/property-list-files**", async (route) => {
    if (route.request().method() !== "GET") { await route.continue(); return }
    await gate
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_ITEMS) })
  })

  await openDialogBuyersTab(page)
  await page.getByTestId("panda-properties-form-tab-trigger--files").click()

  const filesContent = page.getByTestId("panda-properties-form-tab--files-content")
  const countEl = page.getByTestId("panda-properties-form-files-count")

  // Count header must show "Loading…" not "0 files" while request is in-flight
  await expect(countEl).toHaveText("Loading…", { timeout: 5_000 })
  await shotFocused(page, countEl, SHOT_DIR, "04a-files-loading-count")
  story.addScene({
    title: "04a — Files Tab: 'Loading…' Count During Fetch",
    images: [join(SHOT_DIR, "04a-files-loading-count.png")],
    seeing: "Count header shows 'Loading…' while the files API is in-flight (not '0 files').",
    steps: ["Open property edit dialog", "Click Files tab", "Count header reads 'Loading…'"],
  })

  const skeleton = filesContent.locator('[data-slot="skeleton"]').first()
  await expect(skeleton).toBeVisible({ timeout: 5_000 })

  resolveRoute()
  await expect(countEl).not.toHaveText("Loading…", { timeout: 10_000 })
  await expect(filesContent.locator('[data-slot="skeleton"]')).toHaveCount(0)
  await shotFocused(page, filesContent, SHOT_DIR, "04b-files-loaded")
  story.addScene({
    title: "04b — Files Tab: Empty State After Load",
    images: [join(SHOT_DIR, "04b-files-loaded.png")],
    seeing: "Skeleton gone; count and empty state visible after load.",
    steps: ["API responds", "Skeleton disappears", "Empty state renders"],
  })
})

// ─── Forms tab ────────────────────────────────────────────────────────────────

test("forms tab shows skeleton in forms list and send history while loading", async ({ page }) => {
  let resolveFormsRoute!: () => void
  let resolveHistoryRoute!: () => void
  const formsGate = new Promise<void>((res) => { resolveFormsRoute = res })
  const historyGate = new Promise<void>((res) => { resolveHistoryRoute = res })

  // Register base routes FIRST (lower priority)
  await routePandaPropertiesListDetailAndBuyerOffers(page)

  // Forms/history API paths don't overlap with /api/admin/properties — register in any order
  await page.route("**/api/admin/property-forms**", async (route) => {
    if (route.request().url().includes("/upload") || route.request().url().includes("/send")) {
      await route.continue(); return
    }
    await formsGate
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_ITEMS) })
  })
  await page.route("**/api/admin/property-form-sends**", async (route) => {
    if (route.request().method() !== "GET") { await route.continue(); return }
    await historyGate
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_ITEMS) })
  })

  await openDialogBuyersTab(page)
  await page.getByTestId("panda-properties-form-tab-trigger--forms").click()

  const formsTabContent = page.getByTestId("panda-properties-form-forms-tab")
  const skeleton = formsTabContent.locator('[data-slot="skeleton"]').first()
  await expect(skeleton).toBeVisible({ timeout: 5_000 })
  await shotFocused(page, skeleton, SHOT_DIR, "05a-forms-skeleton")
  story.addScene({
    title: "05a — Forms Tab: Skeleton During Load",
    images: [join(SHOT_DIR, "05a-forms-skeleton.png")],
    seeing: "Skeleton bars visible in both Forms list and Send History sections while both APIs are in-flight.",
    steps: ["Open property edit dialog", "Click Forms tab", "Skeleton appears before either API responds"],
  })

  resolveFormsRoute()
  resolveHistoryRoute()
  await expect(page.getByTestId("property-forms-empty")).toBeVisible({ timeout: 10_000 })
  await expect(formsTabContent.locator('[data-slot="skeleton"]')).toHaveCount(0)
  await shotFocused(page, page.getByTestId("property-forms-empty"), SHOT_DIR, "05b-forms-loaded")
  story.addScene({
    title: "05b — Forms Tab: Empty State After Load",
    images: [join(SHOT_DIR, "05b-forms-loaded.png")],
    seeing: "Skeleton gone; empty state visible after load completes.",
    steps: ["Both APIs respond", "Skeleton disappears", "Empty states render"],
  })
})
