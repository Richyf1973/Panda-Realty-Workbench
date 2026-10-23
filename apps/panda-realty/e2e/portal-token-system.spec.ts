// Run: npm run test:e2e:scratch -- --app=panda-realty --spec="apps/panda-realty/e2e/portal-token-system.spec.ts" --no-bail

import { expect, test } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { createStory, shotFocused } from "@repo/e2e-utils"

import { requirePandaE2eAdminListLiveEnv, signInAsAdmin } from "./helpers/admin-auth"

const SHOT_DIR = join(dirname(fileURLToPath(import.meta.url)), "screenshots", "portal-token-system")

const story = createStory({ specUrl: import.meta.url, slug: "portal-token-system" })
story.setWhatWasBuilt(
  "New portal token system for Panda Realty: a dedicated portal_tokens table separate from " +
  "offer_form_tokens. Includes admin APIs to generate (POST /api/admin/portal-tokens) and revoke " +
  "(PATCH /api/admin/portal-tokens/:id) tokens, a public portal page at /portal/[token] that shows " +
  "a placeholder when the token is valid and 'This link is no longer active' when revoked, " +
  "and a public portal API at /api/portal/[token] returning entity+property data (200) or 410 Gone when revoked.",
)

// Real property entity pairs from the live DB used as test fixtures.
// Pair A — used for valid-token tests (POST is idempotent, always returns same token).
const FIXTURE_A = { propertyEntityId: 185969, propertyListId: 202739 }
// Pair B — used for revocation tests so Pair A's token stays alive between runs.
const FIXTURE_B = { propertyEntityId: 185926, propertyListId: 223439 }

/** Helper: POST admin portal-tokens with an authenticated page context */
async function createOrGetToken(
  page: Parameters<typeof signInAsAdmin>[0],
  fixture: typeof FIXTURE_A,
): Promise<{ token: string; portalTokenId: number }> {
  await signInAsAdmin(page)
  const res = await page.context().request.post("/api/admin/portal-tokens", { data: fixture })
  const body = await res.json()
  return { token: body.token, portalTokenId: body.portalTokenId }
}

test.beforeAll(() => {
  requirePandaE2eAdminListLiveEnv()
})

test.describe("Portal Token System", () => {
  test.describe.configure({ mode: "serial" })

  test.beforeEach(async () => {
    await mkdir(SHOT_DIR, { recursive: true })
  })

  test.afterAll(() => {
    story.write()
  })

  // ── Admin API — token generation ────────────────────────────────────────

  test("POST /api/admin/portal-tokens — creates a new portal token", async ({ page }) => {
    await signInAsAdmin(page)
    const res = await page.context().request.post("/api/admin/portal-tokens", {
      data: FIXTURE_A,
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty("token")
    expect(body).toHaveProperty("portalTokenId")
    expect(body.propertyEntityId).toBe(FIXTURE_A.propertyEntityId)
    expect(body.propertyListId).toBe(FIXTURE_A.propertyListId)
    expect(body.revokedAt).toBeNull()
  })

  test("POST /api/admin/portal-tokens — idempotent, returns same token for same pair", async ({ page }) => {
    await signInAsAdmin(page)
    const req = { data: FIXTURE_A }
    const first = await page.context().request.post("/api/admin/portal-tokens", req)
    const body1 = await first.json()
    const second = await page.context().request.post("/api/admin/portal-tokens", req)
    const body2 = await second.json()
    expect(second.status()).toBe(200)
    expect(body2.token).toBe(body1.token)
    expect(body2.portalTokenId).toBe(body1.portalTokenId)
  })

  // ── Public portal page — valid token ────────────────────────────────────

  test("GET /portal/<token> — page loads without auth and shows property summary", async ({ page }) => {
    const { token } = await createOrGetToken(page, FIXTURE_A)
    await page.goto(`/portal/${token}`)
    const summary = page.getByTestId("portal-property-summary")
    await expect(summary).toBeVisible({ timeout: 15_000 })

    await shotFocused(page, summary, SHOT_DIR, "01-portal-summary")
    story.addScene({
      title: "01 — Portal Page: Valid Token — Property Summary",
      images: [join(SHOT_DIR, "01-portal-summary.png")],
      seeing: "The portal page loads without auth for a valid token and shows the PortalPropertySummary card.",
      steps: [
        "Navigate to /portal/<valid-token> without signing in",
        "Page renders portal-property-summary card with address, sale price, and date boxes",
      ],
    })
  })

  // ── Public portal API — valid token ─────────────────────────────────────

  test("GET /api/portal/<token> — returns 200 with entity + property data", async ({ page, request }) => {
    const { token } = await createOrGetToken(page, FIXTURE_A)
    const res = await request.get(`/api/portal/${token}`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty("entityName")
    expect(body).toHaveProperty("propertyAddress")
  })

  test("GET /api/portal/<token> — does not return an error field after access", async ({ page, request }) => {
    const { token } = await createOrGetToken(page, FIXTURE_A)
    const res = await request.get(`/api/portal/${token}`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body).not.toHaveProperty("error")
  })

  // ── Revocation (uses Pair B to keep Pair A valid) ───────────────────────

  test("PATCH /api/admin/portal-tokens/<id> — revokes the token (sets revokedAt)", async ({ page }) => {
    const { portalTokenId } = await createOrGetToken(page, FIXTURE_B)
    const res = await page.context().request.patch(`/api/admin/portal-tokens/${portalTokenId}`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.revokedAt).not.toBeNull()
  })

  test("GET /portal/<revoked-token> — shows 'This link is no longer active'", async ({ page }) => {
    const { token, portalTokenId } = await createOrGetToken(page, FIXTURE_B)
    await page.context().request.patch(`/api/admin/portal-tokens/${portalTokenId}`)
    await page.goto(`/portal/${token}`)
    const msg = page.getByTestId("portal-revoked").getByText(/no longer active/i)
    await expect(msg).toBeVisible({ timeout: 15_000 })

    await shotFocused(page, msg, SHOT_DIR, "02-revoked-portal")
    story.addScene({
      title: "02 — Portal Page: Revoked Token — Link No Longer Active",
      images: [join(SHOT_DIR, "02-revoked-portal.png")],
      seeing: "The portal page shows 'This link is no longer active' for a revoked token.",
      steps: [
        "Revoke a portal token via PATCH /api/admin/portal-tokens/<id>",
        "Navigate to /portal/<revoked-token>",
        "Page shows 'This link is no longer active' message",
      ],
    })
  })

  test("GET /api/portal/<revoked-token> — returns 410 Gone", async ({ page, request }) => {
    const { token, portalTokenId } = await createOrGetToken(page, FIXTURE_B)
    await page.context().request.patch(`/api/admin/portal-tokens/${portalTokenId}`)
    const res = await request.get(`/api/portal/${token}`)
    expect(res.status()).toBe(410)
  })

  // ── Error states — unknown token ─────────────────────────────────────────

  test("GET /portal/fake-token — shows 404, not the portal placeholder", async ({ page }) => {
    await page.goto("/portal/this-is-not-a-real-token-at-all-xyz")
    await expect(page.getByTestId("portal-shell")).not.toBeVisible({ timeout: 5_000 })
  })

  test("GET /api/portal/fake-token — returns 404", async ({ request }) => {
    const res = await request.get("/api/portal/this-is-not-a-real-token-at-all-xyz")
    expect(res.status()).toBe(404)
  })

  // ── Auth guards ───────────────────────────────────────────────────────────
  // Use native fetch (no cookies) to verify the auth guard returns 401.

  test("POST /api/admin/portal-tokens — 401 when unauthenticated", async ({ baseURL }) => {
    const res = await fetch(`${baseURL}/api/admin/portal-tokens`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(FIXTURE_A),
    })
    expect(res.status).toBe(401)
  })

  test("PATCH /api/admin/portal-tokens/<id> — 401 when unauthenticated", async ({ baseURL }) => {
    const res = await fetch(`${baseURL}/api/admin/portal-tokens/1`, {
      method: "PATCH",
    })
    expect(res.status).toBe(401)
  })
})
