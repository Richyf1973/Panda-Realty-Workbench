// Run: npm run test:e2e:scratch -- --app=panda-realty --spec="apps/panda-realty/e2e/adobe-sign-phase-3g.spec.ts" --no-bail

import { expect, test } from "@playwright/test"
import { execFileSync } from "node:child_process"
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { createStory, shotFocused } from "@repo/e2e-utils"

const SHOT_DIR = join(dirname(fileURLToPath(import.meta.url)), "screenshots", "adobe-sign-phase-3g")
const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../..")

const story = createStory({ specUrl: import.meta.url, slug: "adobe-sign-phase-3g" })
story.setWhatWasBuilt(
  "Adobe Sign Phase 3g: buyer portal client UI — Sign required badge and Sign document button " +
  "on portal document rows for pending-signature files; Signed badge with signedAt date for " +
  "completed agreements; Signing cancelled notice for cancelled agreements. " +
  "GET /api/portal/[token]/sign-url/[driveFileId] route that fetches the Adobe Sign signing URL " +
  "and returns it for the client to open in a new tab.",
)

// ── Test data ─────────────────────────────────────────────────────────────────

const E2E_TOKEN = "e2e-3g-portal-sign-test-v1"
const E2E_TOKEN_REVOKED = "e2e-3g-portal-revoked-v1"
const E2E_DRIVE_PENDING = "e2e-3g-drive-pending"
const E2E_DRIVE_SIGNED = "e2e-3g-drive-signed"
const E2E_DRIVE_CANCELLED = "e2e-3g-drive-cancelled"
const E2E_DRIVE_NO_SIGN = "e2e-3g-drive-no-sign"
const E2E_SIGNED_AT = "2026-05-30T09:00:00.000Z"
// property_list_id 223319 exists in the real DB — confirmed via run-sql
const E2E_PROPERTY_LIST_ID = 223319

// ── DB seed helpers ───────────────────────────────────────────────────────────

function runSql(sql: string, { destructive = false } = {}): { rows: Record<string, unknown>[] } {
  const args = ["tools/run-sql.mjs", "--app=panda-realty"]
  if (destructive) args.push("--confirm-destructive")
  args.push(sql)
  const output = execFileSync("node", args, {
    cwd: REPO_ROOT,
    stdio: "pipe",
  }).toString()
  const jsonLine = output.split("\n").find((l) => l.startsWith("{"))
  if (!jsonLine) throw new Error(`run-sql produced no JSON. Output:\n${output}`)
  return JSON.parse(jsonLine) as { rows: Record<string, unknown>[] }
}

function seedTestData() {
  // Clean up any leftover data from previous runs (cascades to sign requests)
  runSql(`DELETE FROM panda_realty.portal_tokens WHERE token IN ('${E2E_TOKEN}', '${E2E_TOKEN_REVOKED}')`, { destructive: true })
  runSql(`DELETE FROM panda_realty.property_list_files WHERE google_drive_file_id LIKE 'e2e-3g-%'`, { destructive: true })

  // Active portal token
  const activeResult = runSql(
    `INSERT INTO panda_realty.portal_tokens (token, role, property_list_id)
     VALUES ('${E2E_TOKEN}', 'buyer', ${E2E_PROPERTY_LIST_ID})
     RETURNING portal_token_id`,
  )
  const portalTokenId = Number(activeResult.rows[0].portal_token_id)

  // Revoked portal token (for error-state tests)
  runSql(
    `INSERT INTO panda_realty.portal_tokens (token, role, property_list_id, revoked_at)
     VALUES ('${E2E_TOKEN_REVOKED}', 'buyer', ${E2E_PROPERTY_LIST_ID}, NOW())`,
  )

  // 4 test files: pending, signed, cancelled, no sign request
  runSql(
    `INSERT INTO panda_realty.property_list_files
       (property_list_id, file_name, google_drive_file_id, shared_with_portal)
     VALUES
       (${E2E_PROPERTY_LIST_ID}, 'E2E Contract Pending.pdf',   '${E2E_DRIVE_PENDING}',   true),
       (${E2E_PROPERTY_LIST_ID}, 'E2E Form 6 Signed.pdf',      '${E2E_DRIVE_SIGNED}',    true),
       (${E2E_PROPERTY_LIST_ID}, 'E2E Transfer Cancelled.pdf', '${E2E_DRIVE_CANCELLED}', true),
       (${E2E_PROPERTY_LIST_ID}, 'E2E No Sign.pdf',            '${E2E_DRIVE_NO_SIGN}',   true)`,
  )

  // Sign requests: pending, signed, cancelled
  runSql(
    `INSERT INTO panda_realty.portal_file_sign_requests
       (portal_token_id, file_id, adobe_sign_agreement_id, signature_status, signer_email, signed_at)
     VALUES
       (${portalTokenId}, '${E2E_DRIVE_PENDING}',   'TEST-AGR-e2e-3g-pending',   'pending',   'buyer@example.com', NULL),
       (${portalTokenId}, '${E2E_DRIVE_SIGNED}',    'TEST-AGR-e2e-3g-signed',    'signed',    'buyer@example.com', '${E2E_SIGNED_AT}'),
       (${portalTokenId}, '${E2E_DRIVE_CANCELLED}', 'TEST-AGR-e2e-3g-cancelled', 'cancelled', 'buyer@example.com', NULL)`,
  )
}

function cleanupTestData() {
  try {
    runSql(`DELETE FROM panda_realty.portal_tokens WHERE token IN ('${E2E_TOKEN}', '${E2E_TOKEN_REVOKED}')`, { destructive: true })
    runSql(`DELETE FROM panda_realty.property_list_files WHERE google_drive_file_id LIKE 'e2e-3g-%'`, { destructive: true })
  } catch {
    // Ignore cleanup errors — test data may already be gone
  }
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

test.beforeAll(() => {
  seedTestData()
})

test.beforeEach(async () => {
  await mkdir(SHOT_DIR, { recursive: true })
  test.setTimeout(60_000)
})

test.afterAll(() => {
  cleanupTestData()
  story.write()
})

// ── Happy path: portal page badge rendering ───────────────────────────────────

test.describe("Adobe Sign 3g — Portal page badge rendering", () => {
  test("pending file shows Sign document button", async ({ page }) => {
    await page.goto(`/portal/${E2E_TOKEN}`)
    const docs = page.getByTestId("portal-documents")
    await expect(docs).toBeVisible({ timeout: 15_000 })

    const btn = docs.getByTestId(`portal-sign-document-btn--${E2E_DRIVE_PENDING}`)
    await expect(btn).toBeVisible({ timeout: 5_000 })
    await expect(btn).toBeEnabled()

    await shotFocused(page, docs, SHOT_DIR, "01-pending-sign-btn")
    story.addScene({
      title: "01 — Pending file shows Sign document button",
      images: [join(SHOT_DIR, "01-pending-sign-btn.png")],
      seeing: "Portal document row for a pending-signature file shows a Sign document button alongside View and Download.",
      steps: [
        "Navigate to buyer portal page",
        "Observe pending file row shows Sign document button",
      ],
    })
  })

  test("pending file shows Sign required badge", async ({ page }) => {
    await page.goto(`/portal/${E2E_TOKEN}`)
    const docs = page.getByTestId("portal-documents")
    await expect(docs).toBeVisible({ timeout: 15_000 })

    const badge = docs.getByTestId(`portal-sign-required-badge--${E2E_DRIVE_PENDING}`)
    await expect(badge).toBeVisible({ timeout: 5_000 })
  })

  test("signed file shows Signed badge", async ({ page }) => {
    await page.goto(`/portal/${E2E_TOKEN}`)
    const docs = page.getByTestId("portal-documents")
    await expect(docs).toBeVisible({ timeout: 15_000 })

    const badge = docs.getByTestId(`portal-signed-badge--${E2E_DRIVE_SIGNED}`)
    await expect(badge).toBeVisible({ timeout: 5_000 })
    await expect(badge).toContainText("Signed")

    await shotFocused(page, docs, SHOT_DIR, "02-signed-badge")
    story.addScene({
      title: "02 — Signed file shows Signed badge",
      images: [join(SHOT_DIR, "02-signed-badge.png")],
      seeing: "Portal document row for a signed file shows a green Signed badge with the date.",
      steps: [
        "Navigate to buyer portal page",
        "Observe signed file row shows Signed badge",
      ],
    })
  })

  test("signed file shows signedAt date formatted en-AU", async ({ page }) => {
    await page.goto(`/portal/${E2E_TOKEN}`)
    const docs = page.getByTestId("portal-documents")
    await expect(docs).toBeVisible({ timeout: 15_000 })

    const dateEl = docs.getByTestId(`portal-signed-at--${E2E_DRIVE_SIGNED}`)
    await expect(dateEl).toBeVisible({ timeout: 5_000 })
    await expect(dateEl).toContainText("30 May 2026")
  })

  test("cancelled file shows Signing cancelled text", async ({ page }) => {
    await page.goto(`/portal/${E2E_TOKEN}`)
    const docs = page.getByTestId("portal-documents")
    await expect(docs).toBeVisible({ timeout: 15_000 })

    const row = docs.getByTestId(`portal-document-row--${E2E_DRIVE_CANCELLED}`)
    await expect(row).toBeVisible({ timeout: 5_000 })
    await expect(row).toContainText("contact your agent")

    await shotFocused(page, docs, SHOT_DIR, "03-cancelled")
    story.addScene({
      title: "03 — Cancelled file shows contact-agent notice",
      images: [join(SHOT_DIR, "03-cancelled.png")],
      seeing: "Portal document row for a cancelled-signature file shows Signing cancelled — contact your agent.",
      steps: [
        "Navigate to buyer portal page",
        "Observe cancelled file row shows cancelled notice",
      ],
    })
  })

  test("file with no sign request shows only View and Download, no sign button", async ({ page }) => {
    await page.goto(`/portal/${E2E_TOKEN}`)
    const docs = page.getByTestId("portal-documents")
    await expect(docs).toBeVisible({ timeout: 15_000 })

    // Wait for a known row to render before absence check
    await expect(docs.getByTestId(`portal-document-row--${E2E_DRIVE_NO_SIGN}`)).toBeVisible({ timeout: 5_000 })

    await expect(docs.getByTestId(`portal-sign-document-btn--${E2E_DRIVE_NO_SIGN}`)).not.toBeVisible()
    await expect(docs.getByTestId(`portal-sign-required-badge--${E2E_DRIVE_NO_SIGN}`)).not.toBeVisible()
  })

  test("View and Download remain visible on signed row", async ({ page }) => {
    await page.goto(`/portal/${E2E_TOKEN}`)
    const docs = page.getByTestId("portal-documents")
    await expect(docs).toBeVisible({ timeout: 15_000 })

    const row = docs.getByTestId(`portal-document-row--${E2E_DRIVE_SIGNED}`)
    await expect(row).toBeVisible({ timeout: 5_000 })
    await expect(row.getByTestId("portal-document-view")).toBeVisible()
    await expect(row.getByTestId("portal-document-download")).toBeVisible()
  })

  test("View and Download remain visible on cancelled row", async ({ page }) => {
    await page.goto(`/portal/${E2E_TOKEN}`)
    const docs = page.getByTestId("portal-documents")
    await expect(docs).toBeVisible({ timeout: 15_000 })

    const row = docs.getByTestId(`portal-document-row--${E2E_DRIVE_CANCELLED}`)
    await expect(row).toBeVisible({ timeout: 5_000 })
    await expect(row.getByTestId("portal-document-view")).toBeVisible()
    await expect(row.getByTestId("portal-document-download")).toBeVisible()
  })
})

// ── Sign document button interaction ─────────────────────────────────────────

test.describe("Adobe Sign 3g — Sign document button", () => {
  test("clicking Sign document opens new tab with signing URL", async ({ page }) => {
    // Mock the sign-url route so it returns a predictable URL (no real Adobe Sign needed)
    await page.route(`**/api/portal/${E2E_TOKEN}/sign-url/${E2E_DRIVE_PENDING}**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ url: "/test/fake-signing-page" }),
      })
    })

    await page.goto(`/portal/${E2E_TOKEN}`)
    const docs = page.getByTestId("portal-documents")
    await expect(docs).toBeVisible({ timeout: 15_000 })

    const btn = docs.getByTestId(`portal-sign-document-btn--${E2E_DRIVE_PENDING}`)
    await expect(btn).toBeEnabled({ timeout: 5_000 })

    const newPagePromise = page.context().waitForEvent("page")
    await btn.click()
    const newPage = await newPagePromise
    await newPage.waitForLoadState("domcontentloaded")
    expect(newPage.url()).toContain("fake-signing-page")

    await shotFocused(page, docs, SHOT_DIR, "04a-sign-btn-before-click")
    story.addScene({
      title: "04 — Sign document button opens new tab",
      images: [join(SHOT_DIR, "04a-sign-btn-before-click.png")],
      seeing: "Clicking Sign document on a pending file opens the Adobe Sign signing page in a new tab.",
      steps: [
        "Navigate to buyer portal page",
        "Click Sign document on the pending file row",
        "Observe signing page opens in a new tab",
      ],
    })
  })

  test("Sign document button shows error when sign-url route fails", async ({ page }) => {
    await page.route(`**/api/portal/${E2E_TOKEN}/sign-url/${E2E_DRIVE_PENDING}**`, async (route) => {
      await route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "Adobe Sign unavailable" }) })
    })

    await page.goto(`/portal/${E2E_TOKEN}`)
    const docs = page.getByTestId("portal-documents")
    await expect(docs).toBeVisible({ timeout: 15_000 })

    const btn = docs.getByTestId(`portal-sign-document-btn--${E2E_DRIVE_PENDING}`)
    await expect(btn).toBeEnabled({ timeout: 5_000 })
    await btn.click()

    const errMsg = docs.getByTestId(`portal-sign-error--${E2E_DRIVE_PENDING}`)
    await expect(errMsg).toBeVisible({ timeout: 8_000 })
    await expect(errMsg).toContainText("Couldn't load signing link")

    await shotFocused(page, docs, SHOT_DIR, "05-sign-error")
    story.addScene({
      title: "05 — Sign document error shows inline message",
      images: [join(SHOT_DIR, "05-sign-error.png")],
      seeing: "When the sign-url route fails, an inline error appears below the button: Couldn't load signing link, try again.",
      steps: [
        "Navigate to buyer portal page",
        "Click Sign document (API mocked to return 500)",
        "Observe inline error message below the button",
      ],
    })
  })
})

// ── Edge cases ────────────────────────────────────────────────────────────────

test.describe("Adobe Sign 3g — Edge cases", () => {
  test("revoked portal token shows revoked message, not document rows", async ({ page }) => {
    await page.goto(`/portal/${E2E_TOKEN_REVOKED}`)
    await expect(page.getByTestId("portal-revoked")).toBeVisible({ timeout: 10_000 })
    await expect(page.getByTestId("portal-documents")).not.toBeVisible()
  })
})

// ── API-level tests for sign-url route ────────────────────────────────────────

test.describe("Adobe Sign 3g — sign-url API route", () => {
  test("sign-url route returns 200 with URL for valid token and pending request", async ({ baseURL }) => {
    const res = await fetch(`${baseURL}/api/portal/${E2E_TOKEN}/sign-url/${E2E_DRIVE_PENDING}`)
    expect(res.status).toBe(200)
    const data = (await res.json()) as { url: string }
    expect(typeof data.url).toBe("string")
    expect(data.url.length).toBeGreaterThan(0)
  })

  test("sign-url route returns 403 for revoked token", async ({ baseURL }) => {
    const res = await fetch(`${baseURL}/api/portal/${E2E_TOKEN_REVOKED}/sign-url/${E2E_DRIVE_PENDING}`)
    expect(res.status).toBe(403)
  })

  test("sign-url route returns 404 for unknown token", async ({ baseURL }) => {
    const res = await fetch(`${baseURL}/api/portal/this-token-does-not-exist/sign-url/${E2E_DRIVE_PENDING}`)
    expect(res.status).toBe(404)
  })

  test("sign-url route returns 404 when no pending sign request exists for the file", async ({ baseURL }) => {
    const res = await fetch(`${baseURL}/api/portal/${E2E_TOKEN}/sign-url/${E2E_DRIVE_NO_SIGN}`)
    expect(res.status).toBe(404)
  })
})
