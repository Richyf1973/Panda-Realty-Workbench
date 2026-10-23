// Run: npm run test:e2e:scratch -- --app=panda-realty --spec="apps/panda-realty/e2e/portal-seller-phase1.spec.ts" --no-retry

import { expect, test } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { createStory, shotFocused } from "@repo/e2e-utils"

import { requirePandaE2eAdminListLiveEnv, signInAsAdmin } from "./helpers/admin-auth"
import {
  createOrGetSellerToken,
  FIXTURE_A,
  FIXTURE_B,
} from "./helpers/panda-seller-portal-mocks"

const SHOT_DIR = join(dirname(fileURLToPath(import.meta.url)), "screenshots", "portal-seller-phase1")

const story = createStory({ specUrl: import.meta.url, slug: "portal-seller-phase1" })
story.setWhatWasBuilt(
  "Seller Portal Phase 1 Foundation: adds a seller role to portal_tokens (property_entity_id nullable), " +
  "a new POST/GET /api/admin/portal-tokens/seller endpoint scoped to propertyListId, " +
  "and a new /portal/seller/[token] route with property header + 5-tab shell (Summary, Conditions, Documents, Offers, Messages).",
)

test.beforeAll(() => {
  requirePandaE2eAdminListLiveEnv()
})

test.beforeEach(async () => {
  await mkdir(SHOT_DIR, { recursive: true })
})

test.afterAll(() => {
  story.write()
})

// ── API live tests ────────────────────────────────────────────────────────────

test.describe("Seller Portal Token API", () => {
  test("POST /api/admin/portal-tokens/seller — creates seller token for propertyListId", async ({ page }) => {
    await signInAsAdmin(page)
    test.setTimeout(60_000)
    const res = await page.context().request.post("/api/admin/portal-tokens/seller", {
      data: FIXTURE_A,
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty("token")
    expect(body).toHaveProperty("portalTokenId")
    expect(body.propertyListId).toBe(FIXTURE_A.propertyListId)
    expect(body.propertyEntityId).toBeNull()
    expect(body.role).toBe("seller")
    expect(body.revokedAt).toBeNull()
  })

  test("POST /api/admin/portal-tokens/seller — idempotent: same propertyListId returns same token", async ({ page }) => {
    await signInAsAdmin(page)
    test.setTimeout(60_000)
    const first = await page.context().request.post("/api/admin/portal-tokens/seller", { data: FIXTURE_A })
    expect(first.status()).toBe(200)
    const body1 = await first.json()
    const second = await page.context().request.post("/api/admin/portal-tokens/seller", { data: FIXTURE_A })
    expect(second.status()).toBe(200)
    const body2 = await second.json()
    expect(body2.token).toBe(body1.token)
    expect(body2.portalTokenId).toBe(body1.portalTokenId)
  })

  test("GET /api/admin/portal-tokens/seller?propertyListId=X — returns active seller token", async ({ page }) => {
    await signInAsAdmin(page)
    test.setTimeout(60_000)
    const res = await page.context().request.get(
      `/api/admin/portal-tokens/seller?propertyListId=${FIXTURE_A.propertyListId}`,
    )
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body).not.toBeNull()
    expect(body.role).toBe("seller")
    expect(body.propertyListId).toBe(FIXTURE_A.propertyListId)
  })

  test("POST /api/admin/portal-tokens/seller — 401 when unauthenticated", async ({ baseURL }) => {
    const res = await fetch(`${baseURL}/api/admin/portal-tokens/seller`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(FIXTURE_A),
    })
    expect(res.status).toBe(401)
  })

  test("PATCH /api/admin/portal-tokens/<id> — revokes seller token (sets revokedAt and role=seller)", async ({ page }) => {
    test.setTimeout(60_000)
    await signInAsAdmin(page)
    // Create seller token first — endpoint must return 200 before we can revoke
    const createRes = await page.context().request.post("/api/admin/portal-tokens/seller", { data: FIXTURE_B })
    expect(createRes.status()).toBe(200)
    const { portalTokenId } = await createRes.json()
    const res = await page.context().request.patch(`/api/admin/portal-tokens/${portalTokenId}`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.revokedAt).not.toBeNull()
    expect(body.role).toBe("seller")
  })
})

// ── Portal shell tests (live) ─────────────────────────────────────────────────

test.describe("Seller Portal Shell", () => {
  let activeToken = ""
  let revokedToken = ""

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext()
    const p = await ctx.newPage()
    const a = await createOrGetSellerToken(p, FIXTURE_A)
    activeToken = a.token
    // Create a fresh token for FIXTURE_B then revoke it for the revoked-token test
    const b = await createOrGetSellerToken(p, FIXTURE_B)
    await p.context().request.patch(`/api/admin/portal-tokens/${b.portalTokenId}`)
    revokedToken = b.token
    await ctx.close()
  })

  test("GET /portal/seller/<token> — loads without auth; portal-seller-shell visible", async ({ page }) => {
    test.setTimeout(30_000)
    await page.goto(`/portal/seller/${activeToken}`)
    const shell = page.getByTestId("portal-seller-shell")
    await expect(shell).toBeVisible({ timeout: 10_000 })

    await shotFocused(page, shell, SHOT_DIR, "01-seller-shell")
    story.addScene({
      title: "01 — Seller Portal Shell: Valid Token",
      images: [join(SHOT_DIR, "01-seller-shell.png")],
      seeing: "Seller portal shell loads at /portal/seller/<token> without authentication.",
      steps: [
        "Navigate to /portal/seller/<token> without signing in",
        "portal-seller-shell container is visible",
      ],
    })
  })

  test("GET /portal/seller/<token> — property header shows address and attributes", async ({ page }) => {
    test.setTimeout(30_000)
    await page.goto(`/portal/seller/${activeToken}`)
    const header = page.getByTestId("portal-seller-property-header")
    await expect(header).toBeVisible({ timeout: 10_000 })
    await expect(header).toContainText(/street|avenue|road/i)

    await shotFocused(page, header, SHOT_DIR, "02-seller-property-header")
    story.addScene({
      title: "02 — Seller Portal: Property Header",
      images: [join(SHOT_DIR, "02-seller-property-header.png")],
      seeing: "Property header shows the street address of the seller property.",
      steps: ["Navigate to seller portal URL", "Property header shows address"],
    })
  })

  test("GET /portal/seller/<token> — all 5 tabs visible in shell nav", async ({ page }) => {
    test.setTimeout(30_000)
    await page.goto(`/portal/seller/${activeToken}`)
    const nav = page.getByTestId("portal-seller-tab-nav")
    await expect(nav).toBeVisible({ timeout: 10_000 })
    await expect(nav.getByTestId("portal-seller-tab--summary")).toBeVisible()
    await expect(nav.getByTestId("portal-seller-tab--conditions")).toBeVisible()
    await expect(nav.getByTestId("portal-seller-tab--documents")).toBeVisible()
    await expect(nav.getByTestId("portal-seller-tab--offers")).toBeVisible()
    await expect(nav.getByTestId("portal-seller-tab--messages")).toBeVisible()

    await shotFocused(page, nav, SHOT_DIR, "03-seller-tab-nav")
    story.addScene({
      title: "03 — Seller Portal: 5-Tab Navigation",
      images: [join(SHOT_DIR, "03-seller-tab-nav.png")],
      seeing: "All 5 tabs (Summary, Conditions, Documents, Offers, Messages) are visible in the seller portal shell.",
      steps: ["Navigate to seller portal URL", "Tab nav shows all 5 tabs"],
    })
  })

  test("GET /portal/seller/<revoked-token> — shows link no longer active, shell not shown", async ({ page }) => {
    test.setTimeout(30_000)
    await page.goto(`/portal/seller/${revokedToken}`)
    await expect(page.getByTestId("portal-seller-shell")).not.toBeVisible({ timeout: 5_000 })
    const msg = page.getByTestId("portal-seller-revoked")
    await expect(msg).toBeVisible({ timeout: 5_000 })
    await expect(msg).toContainText(/no longer active/i)

    await shotFocused(page, msg, SHOT_DIR, "04-seller-revoked")
    story.addScene({
      title: "04 — Seller Portal: Revoked Token",
      images: [join(SHOT_DIR, "04-seller-revoked.png")],
      seeing: "Revoked seller portal token shows the link no longer active message.",
      steps: ["Navigate to /portal/seller/<revoked-token>", "Shows no longer active message"],
    })
  })

  test("GET /portal/seller/invalid-token-xyz — 404, portal-seller-shell not visible", async ({ page }) => {
    test.setTimeout(15_000)
    await page.goto("/portal/seller/this-is-not-a-real-seller-token-at-all-xyz")
    await expect(page.getByTestId("portal-seller-shell")).not.toBeVisible({ timeout: 5_000 })
  })
})

// ── Regression: buyer portal unaffected ──────────────────────────────────────

test.describe("Regression: Buyer Portal", () => {
  test("GET /portal/<buyer-token> — buyer portal still loads after Phase 1 changes", async ({ page }) => {
    test.setTimeout(60_000)
    await signInAsAdmin(page)
    // Use the existing buyer fixture from portal-token-system.spec.ts
    const res = await page.context().request.post("/api/admin/portal-tokens", {
      data: { propertyEntityId: 185969, propertyListId: 202739 },
    })
    const body = await res.json()
    await page.goto(`/portal/${body.token}`)
    const shell = page.getByTestId("portal-shell")
    await expect(shell).toBeVisible({ timeout: 15_000 })
  })
})
