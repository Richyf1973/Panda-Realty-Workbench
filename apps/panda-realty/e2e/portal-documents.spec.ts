// Run: npm run test:e2e:scratch -- --app=panda-realty --spec="apps/panda-realty/e2e/portal-documents.spec.ts" --no-bail

import { expect, test } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { createStory, shotFocused } from "@repo/e2e-utils"

import { requirePandaE2eAdminListLiveEnv, signInAsAdmin } from "./helpers/admin-auth"
import { routePandaPropertiesListDetailAndBuyerOffers } from "./helpers/panda-properties-dialog-mocks"
import {
  gotoSellersPipeline,
  openPropertyPanel,
  PANDA_PIPELINE_SEED_CARD_ADDRESS_SNIPPET,
  sellersCardByAddressSnippet,
} from "./helpers/panda-pipeline-panels"

const SHOT_DIR = join(dirname(fileURLToPath(import.meta.url)), "screenshots", "portal-documents")

const story = createStory({ specUrl: import.meta.url, slug: "portal-documents" })
story.setWhatWasBuilt(
  "Portal Documents section for Panda Realty: adds a sharedWithPortal boolean column to " +
  "property_entity_files and property_list_files tables; admin can toggle per-file sharing via a " +
  "Switch in both the property dialog Files tab and the board panel Files tab; the portal page " +
  "renders a PortalDocuments card listing shared files with View and Download buttons; files are " +
  "served through /api/portal/[token]/files/[kind]/[fileId] proxy so Drive URLs never reach the client.",
)

// Fixture with entity files (Sales Contract.pdf — propertyEntityFileId: 9)
const FIXTURE_ENTITY = { propertyEntityId: 185638, propertyListId: 186833 }
// Fixture with property list files (OFFER Clark.jpg etc — propertyListId: 223439)
const FIXTURE_PROPERTY = { propertyEntityId: 185926, propertyListId: 223439 }
// Fixture with no files (used for empty state)
const FIXTURE_NO_FILES = { propertyEntityId: 185969, propertyListId: 202739 }

async function createPortalToken(
  page: Parameters<typeof signInAsAdmin>[0],
  fixture: typeof FIXTURE_ENTITY,
): Promise<{ token: string; portalTokenId: number }> {
  await signInAsAdmin(page)
  const res = await page.context().request.post("/api/admin/portal-tokens", { data: fixture })
  const body = await res.json()
  return { token: body.token, portalTokenId: body.portalTokenId }
}

// ── Mocked data for admin dialog tests ────────────────────────────────────────

const AGGREGATE_FILES_WITH_SHARED = {
  items: [
    {
      kind: "property" as const,
      id: 10,
      propertyListFileId: 10,
      fileName: "contract-e2e.pdf",
      fileType: "application/pdf",
      fileSize: 2048,
      fileLink: "https://example.com/view",
      googleDriveFileId: "drive-abc",
      source: "google_drive",
      createdAt: "2026-05-20T00:00:00.000Z",
      sourceLabel: "Property",
      sharedWithPortal: false,
    },
    {
      kind: "entity" as const,
      id: 20,
      propertyEntityFileId: 20,
      propertyEntityId: 501,
      fileName: "offer-scan-e2e.png",
      fileType: "image/png",
      fileSize: 4096,
      fileLink: "https://example.com/offer",
      googleDriveFileId: "drive-xyz",
      source: "google_drive",
      createdAt: "2026-05-19T00:00:00.000Z",
      sourceLabel: "Buyer — Test Entity",
      sharedWithPortal: true,
    },
  ],
}

const STATUS_MIN = {
  items: [{ propertyStatusId: 1, propertyStatusCode: "ACTIVE", propertyStatus: "Active" }],
  totalCount: 1, limit: 100, totalPages: 1,
  hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null,
}

const EMPTY_ENTITIES_LIST = {
  items: [], totalCount: 0, limit: 20, totalPages: 0,
  hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null,
}

// ─────────────────────────────────────────────────────────────────────────────

test.beforeAll(() => {
  requirePandaE2eAdminListLiveEnv()
})

test.describe("Portal Documents — admin dialog Files tab toggle", () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(120_000)
    await mkdir(SHOT_DIR, { recursive: true })

    await page.route("**/api/admin/property-status**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(STATUS_MIN) })
    })
    await page.route("**/api/admin/property-entities**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_ENTITIES_LIST) })
    })
    await signInAsAdmin(page)
  })

  test("admin dialog Files tab — Share switch appears on each file row", async ({ page }) => {
    await routePandaPropertiesListDetailAndBuyerOffers(page)
    await page.route("**/api/admin/property-list-files?**", async (route) => {
      if (route.request().method() !== "GET") { await route.continue(); return }
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(AGGREGATE_FILES_WITH_SHARED) })
    })

    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible({ timeout: 20_000 })
    await page.getByTestId("admin-entity-row--properties--1001").click()

    const dialog = page.getByTestId("admin-entity-crud-dialog--properties")
    await expect(dialog).toBeVisible()
    await page.getByTestId("panda-properties-form-tab-trigger--files").click()
    await expect(page.getByTestId("panda-properties-form-tab--files-content")).toBeVisible()

    // Each file row must have a "Share with client" switch
    const rows = page.getByTestId("panda-properties-form-files-row")
    await expect(rows.first()).toBeVisible({ timeout: 10_000 })

    const shareSwitch = rows.first().getByRole("switch", { name: /share/i })
    await expect(shareSwitch).toBeVisible()

    await shotFocused(page, shareSwitch, SHOT_DIR, "01-admin-dialog-share-switch")
    story.addScene({
      title: "01 — Admin Dialog Files Tab: Share Switch Visible",
      images: [join(SHOT_DIR, "01-admin-dialog-share-switch.png")],
      seeing: "Each file row in the property dialog Files tab shows a Share switch on the right side.",
      steps: [
        "Open admin properties dialog",
        "Click the Files tab",
        "Observe each file row has a Share switch",
      ],
    })
  })

  test("admin dialog Files tab — toggling switch on calls PATCH with sharedWithPortal=true", async ({ page }) => {
    await routePandaPropertiesListDetailAndBuyerOffers(page)
    await page.route("**/api/admin/property-list-files?**", async (route) => {
      if (route.request().method() !== "GET") { await route.continue(); return }
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(AGGREGATE_FILES_WITH_SHARED) })
    })

    let patchBody: unknown = null
    await page.route("**/api/admin/property-list-files/10**", async (route) => {
      if (route.request().method() !== "PATCH") { await route.continue(); return }
      patchBody = JSON.parse(route.request().postData() ?? "{}")
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) })
    })
    await page.route("**/api/admin/property-entity-files/20**", async (route) => {
      if (route.request().method() !== "PATCH") { await route.continue(); return }
      patchBody = JSON.parse(route.request().postData() ?? "{}")
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) })
    })

    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible({ timeout: 20_000 })
    await page.getByTestId("admin-entity-row--properties--1001").click()

    const dialog = page.getByTestId("admin-entity-crud-dialog--properties")
    await expect(dialog).toBeVisible()
    await page.getByTestId("panda-properties-form-tab-trigger--files").click()
    await expect(page.getByTestId("panda-properties-form-tab--files-content")).toBeVisible()

    // Toggle the first file's switch (currently off)
    const rows = page.getByTestId("panda-properties-form-files-row")
    await expect(rows.first()).toBeVisible({ timeout: 10_000 })
    const shareSwitch = rows.first().getByRole("switch", { name: /share/i })
    await expect(shareSwitch).toBeVisible()

    const switchBefore = shareSwitch
    await shotFocused(page, switchBefore, SHOT_DIR, "02a-switch-off")

    await shareSwitch.click()
    await expect(shareSwitch).toHaveAttribute("aria-checked", "true")

    await shotFocused(page, shareSwitch, SHOT_DIR, "02b-switch-on")
    story.addScene({
      title: "02 — Admin Dialog Files Tab: Share Switch Toggle",
      images: [join(SHOT_DIR, "02a-switch-off.png"), join(SHOT_DIR, "02b-switch-on.png")],
      seeing: "Left: switch is off (unshared). Right: after click — switch is on, PATCH sent with sharedWithPortal: true.",
      steps: [
        "Open admin properties dialog → Files tab",
        "Click Share switch on first file row",
        "Switch moves to on state; PATCH request includes sharedWithPortal: true",
      ],
    })

    expect(patchBody).toMatchObject({ sharedWithPortal: true })
  })
})

test.describe("Portal Documents — board panel Files tab toggle", () => {
  test.beforeEach(async () => {
    test.setTimeout(120_000)
    await mkdir(SHOT_DIR, { recursive: true })
  })

  test("board panel Files tab — Share switch appears on each file row", async ({ page }) => {
    await signInAsAdmin(page)
    await gotoSellersPipeline(page)

    // Use the seeded property card (223319 has a file: blank.txt)
    const card = sellersCardByAddressSnippet(page, PANDA_PIPELINE_SEED_CARD_ADDRESS_SNIPPET).first()
    const panel = await openPropertyPanel(page, card)

    // Click the Files tab in the side panel
    await panel.getByTestId("property-panel-tab--files").click()
    await expect(panel.getByTestId("panel-content-ready")).toBeVisible({ timeout: 10_000 })

    // Each file row must have a Share switch
    const fileRow = panel.locator("[data-testid^='pipeline-property-file-row']").first()
    await expect(fileRow).toBeVisible({ timeout: 10_000 })

    const shareSwitch = fileRow.getByRole("switch", { name: /share/i })
    await expect(shareSwitch).toBeVisible()

    await shotFocused(page, shareSwitch, SHOT_DIR, "03-board-panel-share-switch")
    story.addScene({
      title: "03 — Board Panel Files Tab: Share Switch Visible",
      images: [join(SHOT_DIR, "03-board-panel-share-switch.png")],
      seeing: "Each file row in the kanban board panel Files tab shows a Share switch.",
      steps: [
        "Open a property in the kanban board side panel",
        "Click the Files tab",
        "Observe each file row has a Share switch",
      ],
    })
  })
})

test.describe("Portal Documents — portal page", () => {
  test.beforeEach(async () => {
    test.setTimeout(120_000)
    await mkdir(SHOT_DIR, { recursive: true })
  })

  test.afterAll(() => {
    story.write()
  })

  // ── Happy path: shared files appear in Documents section ──────────────────

  test("portal Documents section is visible with shared files", async ({ page }) => {
    // First: share a file via admin API
    await signInAsAdmin(page)
    await page.context().request.patch(`/api/admin/property-entity-files/9`, {
      data: { sharedWithPortal: true },
    })

    const { token } = await createPortalToken(page, FIXTURE_ENTITY)
    await page.goto(`/portal/${token}`)

    const documents = page.getByTestId("portal-documents")
    await expect(documents).toBeVisible({ timeout: 15_000 })

    await shotFocused(page, documents, SHOT_DIR, "04-portal-documents-section")
    story.addScene({
      title: "04 — Portal: Documents Section Visible",
      images: [join(SHOT_DIR, "04-portal-documents-section.png")],
      seeing: "The portal Documents section card appears below the condition timeline with the shared file listed.",
      steps: [
        "Admin shares entity file via PATCH /api/admin/property-entity-files/9",
        "Navigate to /portal/<token>",
        "portal-documents card is visible",
      ],
    })
  })

  test("portal Documents section — shared file row shows filename, type, size, and date", async ({ page }) => {
    await signInAsAdmin(page)
    await page.context().request.patch(`/api/admin/property-entity-files/9`, {
      data: { sharedWithPortal: true },
    })

    const { token } = await createPortalToken(page, FIXTURE_ENTITY)
    await page.goto(`/portal/${token}`)

    const documents = page.getByTestId("portal-documents")
    await expect(documents).toBeVisible({ timeout: 15_000 })

    // File row: filename visible (data-testid now includes Drive ID as suffix)
    const fileRow = documents.locator("[data-testid^='portal-document-row']").first()
    await expect(fileRow).toBeVisible({ timeout: 10_000 })
    await expect(fileRow).toContainText("Sales Contract.pdf")

    // File row: size visible (human readable)
    const sizeBadge = fileRow.getByTestId("portal-document-size")
    await expect(sizeBadge).toBeVisible()

    // File row: date added visible
    const dateBadge = fileRow.getByTestId("portal-document-date")
    await expect(dateBadge).toBeVisible()

    await shotFocused(page, fileRow, SHOT_DIR, "05-portal-document-row")
    story.addScene({
      title: "05 — Portal: Document Row Details",
      images: [join(SHOT_DIR, "05-portal-document-row.png")],
      seeing: "A shared file row shows the filename, human-readable file size, and date added.",
      steps: [
        "Navigate to /portal/<token> with a shared file",
        "Document row shows filename, size, and date",
      ],
    })
  })

  test("portal Documents section — View button uses proxy URL (not Drive URL)", async ({ page }) => {
    await signInAsAdmin(page)
    await page.context().request.patch(`/api/admin/property-entity-files/9`, {
      data: { sharedWithPortal: true },
    })

    const { token } = await createPortalToken(page, FIXTURE_ENTITY)
    await page.goto(`/portal/${token}`)

    const documents = page.getByTestId("portal-documents")
    await expect(documents).toBeVisible({ timeout: 15_000 })

    const viewBtn = documents.getByTestId("portal-document-view").first()
    await expect(viewBtn).toBeVisible()

    // The href must use the proxy path, not Drive
    const href = await viewBtn.getAttribute("href")
    expect(href).toMatch(/\/api\/portal\/.+\/files\//)
    expect(href).not.toMatch(/drive\.google\.com/)
    expect(href).not.toMatch(/googleapis\.com/)

    await shotFocused(page, viewBtn, SHOT_DIR, "06-portal-view-button")
    story.addScene({
      title: "06 — Portal: View Button Uses Proxy URL",
      images: [join(SHOT_DIR, "06-portal-view-button.png")],
      seeing: "The View button href points to the server-side proxy route, not a Google Drive URL.",
      steps: [
        "Navigate to /portal/<token>",
        "Inspect View button href — must match /api/portal/<token>/files/...",
        "Must not contain drive.google.com or googleapis.com",
      ],
    })
  })

  test("portal Documents section — Download button href uses proxy with attachment param", async ({ page }) => {
    await signInAsAdmin(page)
    await page.context().request.patch(`/api/admin/property-entity-files/9`, {
      data: { sharedWithPortal: true },
    })

    const { token } = await createPortalToken(page, FIXTURE_ENTITY)
    await page.goto(`/portal/${token}`)

    const documents = page.getByTestId("portal-documents")
    await expect(documents).toBeVisible({ timeout: 15_000 })

    const downloadBtn = documents.getByTestId("portal-document-download").first()
    await expect(downloadBtn).toBeVisible()

    const href = await downloadBtn.getAttribute("href")
    expect(href).toMatch(/\/api\/portal\/.+\/files\//)
    expect(href).toMatch(/download=1|dl=1|disposition=attachment/)

    await shotFocused(page, downloadBtn, SHOT_DIR, "07-portal-download-button")
    story.addScene({
      title: "07 — Portal: Download Button Uses Proxy URL",
      images: [join(SHOT_DIR, "07-portal-download-button.png")],
      seeing: "The Download button href points to the server-side proxy route with a download/attachment query param.",
      steps: [
        "Navigate to /portal/<token>",
        "Inspect Download button href — proxy URL with attachment param",
      ],
    })
  })

  // ── Edge case: empty state ────────────────────────────────────────────────

  test("portal Documents section — empty state when no files shared", async ({ page }) => {
    const { token } = await createPortalToken(page, FIXTURE_NO_FILES)
    await page.goto(`/portal/${token}`)

    const documents = page.getByTestId("portal-documents")
    await expect(documents).toBeVisible({ timeout: 15_000 })

    const empty = documents.getByTestId("portal-documents-empty")
    await expect(empty).toBeVisible()
    await expect(empty).toContainText("No documents have been shared yet")

    await shotFocused(page, documents, SHOT_DIR, "08-portal-documents-empty")
    story.addScene({
      title: "08 — Portal: Documents Empty State",
      images: [join(SHOT_DIR, "08-portal-documents-empty.png")],
      seeing: "When no files are shared with the client, the Documents section shows 'No documents have been shared yet'.",
      steps: [
        "Navigate to /portal/<token> (no shared files)",
        "Documents section shows empty state message",
      ],
    })
  })

  test("portal Documents section — unshared file not visible after toggle off", async ({ page }) => {
    // Share, then unshare
    await signInAsAdmin(page)
    await page.context().request.patch(`/api/admin/property-entity-files/9`, {
      data: { sharedWithPortal: true },
    })
    const { token } = await createPortalToken(page, FIXTURE_ENTITY)
    // Now unshare
    await page.context().request.patch(`/api/admin/property-entity-files/9`, {
      data: { sharedWithPortal: false },
    })

    await page.goto(`/portal/${token}`)
    const documents = page.getByTestId("portal-documents")
    await expect(documents).toBeVisible({ timeout: 15_000 })

    // File should NOT appear — empty state or absent from list
    await expect(documents.getByText("Sales Contract.pdf")).not.toBeVisible()

    await shotFocused(page, documents, SHOT_DIR, "09-portal-unshared-file-absent")
    story.addScene({
      title: "09 — Portal: Unshared File Not Visible",
      images: [join(SHOT_DIR, "09-portal-unshared-file-absent.png")],
      seeing: "After toggling a file to unshared, it no longer appears in the portal Documents section.",
      steps: [
        "Share file via admin PATCH",
        "Unshare via admin PATCH (sharedWithPortal: false)",
        "Navigate to portal — file is absent",
      ],
    })
  })

  // ── Security: proxy route validation ─────────────────────────────────────

  test("proxy returns 404 for invalid token", async ({ page }) => {
    await signInAsAdmin(page)
    const res = await page.context().request.get("/api/portal/invalid-token-xyz/files/entity/9")
    expect(res.status()).toBe(404)
  })

  test("proxy returns 403 for unshared file", async ({ page }) => {
    // Ensure file is unshared
    await signInAsAdmin(page)
    await page.context().request.patch(`/api/admin/property-entity-files/9`, {
      data: { sharedWithPortal: false },
    })
    const { token } = await createPortalToken(page, FIXTURE_ENTITY)

    const res = await page.context().request.get(`/api/portal/${token}/files/entity/9`)
    expect(res.status()).toBe(403)
  })
})
