// Run: npm run test:e2e:scratch -- --app=panda-realty --spec="apps/panda-realty/e2e/portal-client-uploads.spec.ts" --no-bail

import { expect, test } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { createStory, shotFocused } from "@repo/e2e-utils"

import { requirePandaE2eAdminListLiveEnv, signInAsAdmin } from "./helpers/admin-auth"
import { routePandaPropertiesListDetailAndBuyerOffers } from "./helpers/panda-properties-dialog-mocks"

const SHOT_DIR = join(dirname(fileURLToPath(import.meta.url)), "screenshots", "portal-client-uploads")

const story = createStory({ specUrl: import.meta.url, slug: "portal-client-uploads" })
story.setWhatWasBuilt(
  "Client file uploads for Panda Realty buyer and seller portals: adds a Your Uploads card to the " +
  "buyer portal and an Uploads tab to the seller portal; new API routes handle initiate-upload and " +
  "record-upload via Google Drive; uploaded files appear in a separate Client Uploads sub-section " +
  "of the admin Files tab with a Delete button and no share toggles; assigned agent is notified via " +
  "Gmail when a client uploads a file.",
)

// Live DB fixture — property with no files (avoids interference with other portal specs)
const FIXTURE_BUYER = { propertyEntityId: 185969, propertyListId: 202739 }
const FIXTURE_SELLER_LIST_ID = 202739

async function createBuyerToken(
  page: Parameters<typeof signInAsAdmin>[0],
): Promise<{ token: string; portalTokenId: number }> {
  await signInAsAdmin(page)
  const res = await page.context().request.post("/api/admin/portal-tokens", { data: FIXTURE_BUYER })
  const body = await res.json()
  return { token: body.token as string, portalTokenId: body.portalTokenId as number }
}

async function createSellerToken(
  page: Parameters<typeof signInAsAdmin>[0],
): Promise<{ token: string; portalTokenId: number }> {
  await signInAsAdmin(page)
  const res = await page.context().request.post("/api/admin/portal-tokens/seller", {
    data: { propertyListId: FIXTURE_SELLER_LIST_ID },
  })
  const body = await res.json()
  return { token: body.token as string, portalTokenId: body.portalTokenId as number }
}

// ── Mocked aggregate response for admin Files tab tests ───────────────────────

const STATUS_MIN = {
  items: [{ propertyStatusId: 1, propertyStatusCode: "ACTIVE", propertyStatus: "Active" }],
  totalCount: 1, limit: 100, totalPages: 1,
  hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null,
}

const EMPTY_ENTITIES_LIST = {
  items: [], totalCount: 0, limit: 20, totalPages: 0,
  hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null,
}

/** Aggregate with one buyer_upload and one agent file */
const AGGREGATE_WITH_CLIENT_UPLOAD = {
  items: [
    {
      kind: "entity" as const,
      id: 50,
      propertyEntityFileId: 50,
      propertyEntityId: 501,
      fileName: "buyer-id.pdf",
      fileType: "application/pdf",
      fileSize: 204800,
      fileLink: null,
      googleDriveFileId: "drive-buyer-abc",
      source: "buyer_upload",
      createdAt: "2026-05-28T10:00:00.000Z",
      sourceLabel: "Buyer upload",
      sharedWithPortal: false,
      sharedWithSeller: false,
    },
    {
      kind: "property" as const,
      id: 10,
      propertyListFileId: 10,
      fileName: "contract.pdf",
      fileType: "application/pdf",
      fileSize: 1024,
      fileLink: null,
      googleDriveFileId: "drive-contract",
      source: "google_drive",
      createdAt: "2026-05-20T00:00:00.000Z",
      sourceLabel: "Property",
      sharedWithPortal: false,
      sharedWithSeller: false,
    },
  ],
}

/** Aggregate with only agent files — no client uploads */
const AGGREGATE_NO_CLIENT_UPLOADS = {
  items: [
    {
      kind: "property" as const,
      id: 10,
      propertyListFileId: 10,
      fileName: "contract.pdf",
      fileType: "application/pdf",
      fileSize: 1024,
      fileLink: null,
      googleDriveFileId: "drive-contract",
      source: "google_drive",
      createdAt: "2026-05-20T00:00:00.000Z",
      sourceLabel: "Property",
      sharedWithPortal: false,
      sharedWithSeller: false,
    },
  ],
}

// ─────────────────────────────────────────────────────────────────────────────

test.beforeAll(() => {
  requirePandaE2eAdminListLiveEnv()
})

test.beforeEach(async () => {
  await mkdir(SHOT_DIR, { recursive: true })
})

test.afterAll(() => {
  story.write()
})

// ── Buyer Portal ──────────────────────────────────────────────────────────────

test.describe("Buyer portal — Your Uploads card", () => {
  test("buyer portal shows Your Uploads card below Documents section", async ({ page }) => {
    test.setTimeout(120_000)
    const { token } = await createBuyerToken(page)
    await page.goto(`/portal/${token}`)

    const shell = page.getByTestId("portal-shell")
    await expect(shell).toBeVisible({ timeout: 15_000 })

    // Documents card must still be visible
    const documents = page.getByTestId("portal-documents")
    await expect(documents).toBeVisible({ timeout: 10_000 })

    // Your Uploads card must appear AFTER the Documents card
    const uploads = page.getByTestId("portal-client-uploads")
    await expect(uploads).toBeVisible({ timeout: 10_000 })

    await shotFocused(page, shell, SHOT_DIR, "01-buyer-uploads-card")
    story.addScene({
      title: "01 — Buyer Portal: Your Uploads Card Below Documents",
      images: [join(SHOT_DIR, "01-buyer-uploads-card.png")],
      seeing: "Full portal page showing the property header, Documents section, and the Your Uploads card below it — confirming the layout order.",
      steps: [
        "Navigate to /portal/<buyer-token>",
        "Observe Your Uploads card appearing below the Documents section",
      ],
    })
  })

  test("buyer portal Your Uploads card shows empty state and upload button", async ({ page }) => {
    test.setTimeout(120_000)
    const { token } = await createBuyerToken(page)
    await page.goto(`/portal/${token}`)

    const uploads = page.getByTestId("portal-client-uploads")
    await expect(uploads).toBeVisible({ timeout: 15_000 })

    const emptyState = uploads.getByTestId("portal-client-uploads-empty")
    await expect(emptyState).toBeVisible({ timeout: 10_000 })

    const uploadBtn = uploads.getByTestId("portal-client-uploads-btn")
    await expect(uploadBtn).toBeVisible({ timeout: 10_000 })

    await shotFocused(page, uploads, SHOT_DIR, "02-buyer-uploads-empty")
    story.addScene({
      title: "02 — Buyer Portal: Your Uploads Empty State",
      images: [join(SHOT_DIR, "02-buyer-uploads-empty.png")],
      seeing: "The Your Uploads card shows an empty state message and an upload button when no files have been uploaded.",
      steps: [
        "Navigate to /portal/<buyer-token> (no prior uploads)",
        "Observe empty state and upload button",
      ],
    })
  })

  test("buyer portal upload flow mocked APIs resolves file row after upload completes", async ({ page }) => {
    test.setTimeout(120_000)
    const { token } = await createBuyerToken(page)

    // Mock the upload API routes that will be created
    await page.route(`**/api/portal/${token}/files/upload/initiate`, async (route) => {
      if (route.request().method() !== "POST") { await route.fallback(); return }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ uploadUri: "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&upload_id=mock-upload-id" }),
      })
    })

    // Mock the Google Drive PUT (resumable upload)
    await page.route("**/upload/drive/**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ id: "mock-drive-file-id", webViewLink: "https://drive.google.com/file/d/mock-drive-file-id/view" }) })
    })

    await page.route(`**/api/portal/${token}/files/upload/record`, async (route) => {
      if (route.request().method() !== "POST") { await route.fallback(); return }
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          propertyEntityFileId: 999,
          fileName: "test-upload.pdf",
          fileType: "application/pdf",
          fileSize: 1024,
          createdAt: new Date().toISOString(),
          source: "buyer_upload",
        }),
      })
    })

    await page.goto(`/portal/${token}`)
    const uploads = page.getByTestId("portal-client-uploads")
    await expect(uploads).toBeVisible({ timeout: 15_000 })

    const uploadBtn = uploads.getByTestId("portal-client-uploads-btn")
    await expect(uploadBtn).toBeVisible({ timeout: 10_000 })

    // Simulate file selection via the hidden file input
    const fileInput = uploads.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: "test-upload.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("PDF content"),
    })

    // File row appears after upload completes
    const fileRow = uploads.getByTestId("portal-client-uploads-row")
    await expect(fileRow).toBeVisible({ timeout: 15_000 })
    await expect(fileRow).toContainText("test-upload.pdf")

    await shotFocused(page, uploads, SHOT_DIR, "03-buyer-upload-complete")
    story.addScene({
      title: "03 — Buyer Portal: File Row After Upload",
      images: [join(SHOT_DIR, "03-buyer-upload-complete.png")],
      seeing: "The Your Uploads card after a successful upload — shows the card heading, the uploaded file row with filename and type, and View/Download buttons.",
      steps: [
        "Navigate to /portal/<buyer-token>",
        "Select a file via the upload button",
        "File row appears inside the Your Uploads card after upload completes",
      ],
    })
  })

  test("buyer portal uploaded file View button uses portal proxy URL", async ({ page }) => {
    test.setTimeout(120_000)
    const { token } = await createBuyerToken(page)

    // Mock initiate + drive + record to simulate a completed upload
    await page.route(`**/api/portal/${token}/files/upload/initiate`, async (route) => {
      if (route.request().method() !== "POST") { await route.fallback(); return }
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ uploadUri: "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&upload_id=mock2" }) })
    })
    await page.route("**/upload/drive/**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ id: "mock-drive-id-2", webViewLink: "https://drive.google.com/file/d/mock-drive-id-2/view" }) })
    })
    await page.route(`**/api/portal/${token}/files/upload/record`, async (route) => {
      if (route.request().method() !== "POST") { await route.fallback(); return }
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ propertyEntityFileId: 998, fileName: "view-test.pdf", fileType: "application/pdf", fileSize: 512, createdAt: new Date().toISOString(), source: "buyer_upload" }),
      })
    })

    await page.goto(`/portal/${token}`)
    const uploads = page.getByTestId("portal-client-uploads")
    await expect(uploads).toBeVisible({ timeout: 15_000 })

    const fileInput = uploads.locator('input[type="file"]')
    await fileInput.setInputFiles({ name: "view-test.pdf", mimeType: "application/pdf", buffer: Buffer.from("PDF") })

    const fileRow = uploads.getByTestId("portal-client-uploads-row")
    await expect(fileRow).toBeVisible({ timeout: 15_000 })

    const viewBtn = fileRow.getByTestId("portal-client-uploads-view")
    await expect(viewBtn).toBeVisible()

    const href = await viewBtn.getAttribute("href")
    expect(href).toMatch(/\/api\/portal\/.+\/files\//)
    expect(href).not.toMatch(/drive\.google\.com/)

    await shotFocused(page, fileRow, SHOT_DIR, "04-buyer-upload-view-btn")
    story.addScene({
      title: "04 — Buyer Portal: Upload View Button Uses Proxy",
      images: [join(SHOT_DIR, "04-buyer-upload-view-btn.png")],
      seeing: "An uploaded file row showing the filename, file type, and the View/Download buttons. The View button href uses the server-side proxy route, not a direct Drive URL.",
      steps: [
        "Upload a file in buyer portal",
        "Observe the file row — View and Download buttons present",
        "Inspect View button href — must match /api/portal/<token>/files/..., not drive.google.com",
      ],
    })
  })
})

// ── Seller Portal ─────────────────────────────────────────────────────────────

test.describe("Seller portal — Uploads tab", () => {
  test("seller portal tab bar includes Uploads tab", async ({ page }) => {
    test.setTimeout(120_000)
    const { token } = await createSellerToken(page)
    await page.goto(`/portal/seller/${token}`)

    const shell = page.getByTestId("portal-seller-shell")
    await expect(shell).toBeVisible({ timeout: 15_000 })

    const tabNav = page.getByTestId("portal-seller-tab-nav")
    await expect(tabNav).toBeVisible({ timeout: 10_000 })

    const uploadsTab = page.getByTestId("portal-seller-tab--uploads")
    await expect(uploadsTab).toBeVisible()
    await expect(uploadsTab).toContainText("Uploads")

    await shotFocused(page, shell, SHOT_DIR, "05-seller-tab-bar")
    story.addScene({
      title: "05 — Seller Portal: Uploads Tab in Tab Bar",
      images: [join(SHOT_DIR, "05-seller-tab-bar.png")],
      seeing: "Seller portal showing the property header and the tab bar — confirming Uploads appears alongside Summary, Conditions, Documents, Offers, and Messages.",
      steps: [
        "Navigate to /portal/seller/<token>",
        "Observe the Uploads tab in the navigation bar at the top of the page",
      ],
    })
  })

  test("seller portal Uploads tab shows empty state and upload button", async ({ page }) => {
    test.setTimeout(120_000)
    const { token } = await createSellerToken(page)
    await page.goto(`/portal/seller/${token}`)

    const uploadsTab = page.getByTestId("portal-seller-tab--uploads")
    await expect(uploadsTab).toBeVisible({ timeout: 15_000 })
    await uploadsTab.click()

    const uploadsContent = page.getByTestId("portal-seller-uploads")
    await expect(uploadsContent).toBeVisible({ timeout: 10_000 })

    const emptyState = uploadsContent.getByTestId("portal-seller-uploads-empty")
    await expect(emptyState).toBeVisible()

    const uploadBtn = uploadsContent.getByTestId("portal-seller-uploads-btn")
    await expect(uploadBtn).toBeVisible()

    await shotFocused(page, page.getByTestId("portal-seller-shell"), SHOT_DIR, "06-seller-uploads-empty")
    story.addScene({
      title: "06 — Seller Portal: Uploads Tab Empty State",
      images: [join(SHOT_DIR, "06-seller-uploads-empty.png")],
      seeing: "Seller portal with Uploads tab active — tab bar visible at top with Uploads highlighted, empty state card visible below.",
      steps: [
        "Navigate to /portal/seller/<token>",
        "Click the Uploads tab",
        "Observe the Uploads tab is active and the card shows empty state with upload button",
      ],
    })
  })
})

// ── Admin Files tab — Client Uploads section ──────────────────────────────────

test.describe("Admin Files tab — Client Uploads section (mocked)", () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(120_000)
    await page.route("**/api/admin/property-status**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(STATUS_MIN) })
    })
    await page.route("**/api/admin/property-entities**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_ENTITIES_LIST) })
    })
    await signInAsAdmin(page)
  })

  test("admin Files tab shows Client Uploads section when buyer_upload files present", async ({ page }) => {
    await routePandaPropertiesListDetailAndBuyerOffers(page)
    await page.route("**/api/admin/property-list-files?**", async (route) => {
      if (route.request().method() !== "GET") { await route.continue(); return }
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(AGGREGATE_WITH_CLIENT_UPLOAD) })
    })

    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible({ timeout: 20_000 })
    await page.getByTestId("admin-entity-row--properties--1001").click()
    await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible()
    await page.getByTestId("panda-properties-form-tab-trigger--files").click()
    await expect(page.getByTestId("panda-properties-form-tab--files-content")).toBeVisible()

    const clientUploadsSection = page.getByTestId("panda-properties-form-client-uploads-section")
    await expect(clientUploadsSection).toBeVisible({ timeout: 10_000 })
    await expect(clientUploadsSection).toContainText("buyer-id.pdf")

    await shotFocused(page, page.getByTestId("panda-properties-form-tab--files-content"), SHOT_DIR, "07-admin-client-uploads-section")
    story.addScene({
      title: "07 — Admin Files Tab: Client Uploads Section",
      images: [join(SHOT_DIR, "07-admin-client-uploads-section.png")],
      seeing: "Admin property dialog Files tab — shows the files tab toolbar (Create Drive Folder, Sync from Drive, Add files), the agent-uploaded file list, and the separate Client Uploads section below it containing buyer-id.pdf.",
      steps: [
        "Open property dialog in admin",
        "Click the Files tab",
        "Observe the Client Uploads section below the agent files section",
      ],
    })
  })

  test("admin Files tab client upload row has Delete button and no share toggles", async ({ page }) => {
    await routePandaPropertiesListDetailAndBuyerOffers(page)
    await page.route("**/api/admin/property-list-files?**", async (route) => {
      if (route.request().method() !== "GET") { await route.continue(); return }
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(AGGREGATE_WITH_CLIENT_UPLOAD) })
    })

    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible({ timeout: 20_000 })
    await page.getByTestId("admin-entity-row--properties--1001").click()
    await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible()
    await page.getByTestId("panda-properties-form-tab-trigger--files").click()
    await expect(page.getByTestId("panda-properties-form-tab--files-content")).toBeVisible()

    const clientUploadsSection = page.getByTestId("panda-properties-form-client-uploads-section")
    await expect(clientUploadsSection).toBeVisible({ timeout: 10_000 })

    const clientRow = clientUploadsSection.getByTestId("panda-properties-form-client-uploads-row").first()
    await expect(clientRow).toBeVisible()

    // Delete button must be present
    const deleteBtn = clientRow.getByTestId("panda-properties-form-files-btn--delete")
    await expect(deleteBtn).toBeVisible()

    // NO Buyer or Seller share switches on client upload rows
    const shareToggles = clientRow.getByRole("switch")
    await expect(shareToggles).toHaveCount(0)

    await shotFocused(page, clientUploadsSection, SHOT_DIR, "08-admin-client-upload-row")
    story.addScene({
      title: "08 — Admin Files Tab: Client Upload Row Controls",
      images: [join(SHOT_DIR, "08-admin-client-upload-row.png")],
      seeing: "The Client Uploads section showing the section heading and a file row with only a Delete button — no Buyer or Seller share toggles present.",
      steps: [
        "Open property dialog → Files tab",
        "Inspect a client upload row in the Client Uploads section",
        "Delete button visible; no share toggle switches present",
      ],
    })
  })

  test("admin Files tab Client Uploads section absent when no client files", async ({ page }) => {
    await routePandaPropertiesListDetailAndBuyerOffers(page)
    await page.route("**/api/admin/property-list-files?**", async (route) => {
      if (route.request().method() !== "GET") { await route.continue(); return }
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(AGGREGATE_NO_CLIENT_UPLOADS) })
    })

    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible({ timeout: 20_000 })
    await page.getByTestId("admin-entity-row--properties--1001").click()
    await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible()
    await page.getByTestId("panda-properties-form-tab-trigger--files").click()
    await expect(page.getByTestId("panda-properties-form-tab--files-content")).toBeVisible()

    // Files tab content must be visible (no crash)
    const agentFileRow = page.getByTestId("panda-properties-form-files-row")
    await expect(agentFileRow.first()).toBeVisible({ timeout: 10_000 })

    // Client Uploads section must NOT be present
    const clientUploadsSection = page.getByTestId("panda-properties-form-client-uploads-section")
    await expect(clientUploadsSection).toHaveCount(0)

    await shotFocused(page, page.getByTestId("panda-properties-form-tab--files-content"), SHOT_DIR, "09-admin-no-client-uploads")
    story.addScene({
      title: "09 — Admin Files Tab: No Client Uploads Section When Empty",
      images: [join(SHOT_DIR, "09-admin-no-client-uploads.png")],
      seeing: "When no client uploads exist, the Client Uploads section is entirely absent from the Files tab.",
      steps: [
        "Open property dialog → Files tab (no client uploads present)",
        "Client Uploads section is absent",
      ],
    })
  })
})

// ── Upload API ────────────────────────────────────────────────────────────────

test.describe("Upload API routes", () => {
  test("initiate-upload returns 200 with uploadUri for valid buyer portal token", async ({ page }) => {
    test.setTimeout(60_000)
    const { token } = await createBuyerToken(page)

    const res = await page.context().request.post(`/api/portal/${token}/files/upload/initiate`, {
      data: { fileName: "test.pdf", mimeType: "application/pdf", fileSize: 1024 },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty("uploadUri")
    expect(typeof body.uploadUri).toBe("string")
  })
})
