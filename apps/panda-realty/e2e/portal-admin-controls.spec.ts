// Run: npm run test:e2e:scratch -- --app=panda-realty --spec="apps/panda-realty/e2e/portal-admin-controls.spec.ts" --no-bail

import { expect, test } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { createStory, shotFocused } from "@repo/e2e-utils"

import { requirePandaE2eAdminListLiveEnv, signInAsAdmin } from "./helpers/admin-auth"
import {
  MOCK_PROPERTY_ID,
  PROPERTY_EDIT_FAVORITE,
  routePandaPropertiesListDetailAndBuyerOffers,
} from "./helpers/panda-properties-dialog-mocks"

const SHOT_DIR = join(dirname(fileURLToPath(import.meta.url)), "screenshots", "portal-admin-controls")

const story = createStory({ specUrl: import.meta.url, slug: "portal-admin-controls" })
story.setWhatWasBuilt(
  "Portal Admin Controls for Panda Realty: adds a Portal tab to the buyer workspace dialog " +
  "where Richard can generate a client portal link, copy it to clipboard, see last-accessed time, " +
  "and revoke access with a confirmation dialog. Backed by a new GET /api/admin/portal-tokens " +
  "route and a new PropertyEntityPortalPanel client component registered in panda-registry-custom-panels.",
)

// Live buyer entity fixture (same as portal-token-system.spec.ts FIXTURE_A)
const FIXTURE_PE = { propertyEntityId: 185969, propertyListId: 202739 }

// ── Shared mock data ──────────────────────────────────────────────────────────

const MOCK_PE_ID = 185969
const MOCK_ENTITY_ID = 99999

const STATUS_MIN = {
  items: [{ propertyStatusId: 1, propertyStatusCode: "ACTIVE", propertyStatus: "Active" }],
  totalCount: 1, limit: 100, totalPages: 1,
  hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null,
}

const EMPTY_LIST = {
  items: [], totalCount: 0, limit: 20, totalPages: 0,
  hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null,
}

/** Entity detail for entity 99999 — buyer category (entityCategoryId=1). */
const MOCK_ENTITY_DETAIL = {
  entityId: MOCK_ENTITY_ID,
  entityName: "E2E Buyer",
  entityCategoryId: 1,
  phoneNumber: null,
  emailAddress: null,
  address: null,
  esuburb: null,
  estate: null,
  epostcode: null,
  notes: null,
  contactCategoryId: null,
  isVip: false,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
}

/** Buyer panel item for the buyers panel (from /api/admin/properties/{id}/buyers). */
const BUYER_PANEL_ITEM = {
  propertyEntityId: MOCK_PE_ID,
  entityId: MOCK_ENTITY_ID,
  entityName: "E2E Buyer",
  phoneNumber: null,
  emailAddress: null,
  address: null,
  esuburb: null,
  estate: null,
  epostcode: null,
  notes: null,
  buyerPipelineStatusId: null,
  pipelineStatusLabel: null,
  hasOfferFormSubmission: false,
}

const BUYERS_PANEL_RESPONSE = { items: [BUYER_PANEL_ITEM] }

/** Property entity junction record — used by property connections list. */
const MOCK_BUYER_ENTITY = {
  propertyEntityId: MOCK_PE_ID,
  entityId: MOCK_ENTITY_ID,
  propertyListId: MOCK_PROPERTY_ID,
  propertyEntityNote: null,
  buyerPipelineStatusId: null,
  isOriginalOwner: false,
  contactCategoryId: null,
  association: "Buyer",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  propertyEntity: { entityId: MOCK_ENTITY_ID, entityCategoryId: 1, entityName: "E2E Buyer" },
  propertyRef: { streetAddress: "12 Test Street", state: "QLD", postcode: "4000" },
  buyerPipelineStatus: null,
  contactCategory: null,
}

const BUYER_ENTITIES_LIST = {
  items: [MOCK_BUYER_ENTITY],
  totalCount: 1, limit: 20, totalPages: 1,
  hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null,
}

const MOCK_ACTIVE_TOKEN = {
  portalTokenId: 1,
  token: "e2e-test-token-abc-123",
  propertyEntityId: MOCK_PE_ID,
  propertyListId: MOCK_PROPERTY_ID,
  revokedAt: null,
  lastAccessedAt: null,
  createdAt: "2026-05-22T09:00:00.000Z",
}

const MOCK_REVOKED_TOKEN = {
  ...MOCK_ACTIVE_TOKEN,
  revokedAt: "2026-05-27T08:00:00.000Z",
}

// ── Navigation helper: open buyer workspace Portal tab (mocked) ───────────────
//
// Route: Properties page → click property row → Buyers tab → open-profile button
// → entities dialog (admin-entity-crud-dialog--entities) → portal tab in
// property connections workspace (AdminEntityCrudRelatedCollectionsSection,
// slug="property-entities").

async function setupMockedAdminWithBuyerEntity(
  page: Parameters<typeof signInAsAdmin>[0],
  portalTokenResponse: typeof MOCK_ACTIVE_TOKEN | typeof MOCK_REVOKED_TOKEN | null,
) {
  await page.route("**/api/admin/property-status**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(STATUS_MIN) })
  })
  await page.route("**/api/admin/property-entities**", async (route) => {
    const url = route.request().url()
    const method = route.request().method()
    if (url.match(/\/property-entities\/\d+/) && method === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_BUYER_ENTITY) })
      return
    }
    if (method === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(BUYER_ENTITIES_LIST) })
      return
    }
    await route.continue()
  })
  await page.route("**/api/admin/portal-tokens**", async (route) => {
    const url = route.request().url()
    const method = route.request().method()
    if (method === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(portalTokenResponse) })
      return
    }
    if (method === "POST") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_ACTIVE_TOKEN) })
      return
    }
    if (method === "PATCH") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_REVOKED_TOKEN) })
      return
    }
    await route.continue()
  })
  // Entities list and detail (needed when entities dialog opens for entity MOCK_ENTITY_ID)
  await page.route("**/api/admin/entities**", async (route) => {
    const url = route.request().url()
    const method = route.request().method()
    if (method === "GET" && url.match(/\/entities\/\d+/)) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_ENTITY_DETAIL) })
      return
    }
    if (method === "GET") {
      // Entity categories list and other entity list requests
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_LIST) })
      return
    }
    await route.continue()
  })
  // Buyers panel — /api/admin/properties/{id}/buyers (falls through from routePandaPropertiesListDetailAndBuyerOffers)
  await page.route("**/api/admin/properties**/buyers", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(BUYERS_PANEL_RESPONSE) })
  })
  await routePandaPropertiesListDetailAndBuyerOffers(page)
  await signInAsAdmin(page)
}

async function navigateToBuyerWorkspacePortalTab(page: Parameters<typeof signInAsAdmin>[0]) {
  await page.goto("/admin/properties")
  await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible({ timeout: 20_000 })

  // Open property edit dialog
  await page.getByTestId(`admin-entity-row--properties--${MOCK_PROPERTY_ID}`).click()
  const propertiesDialog = page.getByTestId("admin-entity-crud-dialog--properties")
  await expect(propertiesDialog).toBeVisible({ timeout: 10_000 })

  // Open Buyers tab (custom properties form tab)
  await propertiesDialog.getByTestId("panda-properties-form-tab-trigger--buyers").click()

  // Wait for the buyer card to appear then open the buyer profile
  // (opens admin-entity-crud-dialog--entities with buyer workspace via property connections)
  const openProfileBtn = propertiesDialog
    .getByTestId("panda-properties-form-tab--buyers")
    .getByTestId(`property-buyer-owner-row-open-profile--${MOCK_PE_ID}`)
  await expect(openProfileBtn).toBeVisible({ timeout: 15_000 })
  await openProfileBtn.click()

  // Buyer entities dialog opens — property connections workspace renders portal tab
  const buyerWorkspace = page.getByTestId("admin-entity-crud-dialog--entities")
  await expect(buyerWorkspace).toBeVisible({ timeout: 15_000 })

  return buyerWorkspace
}

// ─────────────────────────────────────────────────────────────────────────────

test.beforeAll(() => {
  requirePandaE2eAdminListLiveEnv()
})

// ── API tests (live) ──────────────────────────────────────────────────────────

test.describe("Portal Admin Controls — GET API", () => {
  test.beforeEach(async () => {
    await mkdir(SHOT_DIR, { recursive: true })
    test.setTimeout(60_000)
  })

  test("GET /api/admin/portal-tokens authenticated returns 200", async ({ page }) => {
    await signInAsAdmin(page)
    const res = await page.context().request.get(
      `/api/admin/portal-tokens?propertyEntityId=${FIXTURE_PE.propertyEntityId}`,
    )
    expect(res.status()).toBe(200)
  })

  test("GET /api/admin/portal-tokens unauthenticated returns 401", async ({ baseURL }) => {
    const res = await fetch(
      `${baseURL}/api/admin/portal-tokens?propertyEntityId=${FIXTURE_PE.propertyEntityId}`,
    )
    expect(res.status).toBe(401)
  })
})

// ── UI tests (mocked admin navigation) ───────────────────────────────────────

test.describe("Portal Admin Controls — buyer workspace Portal tab", () => {
  test.beforeEach(async () => {
    await mkdir(SHOT_DIR, { recursive: true })
    test.setTimeout(120_000)
  })

  test.afterAll(() => {
    story.write()
  })

  test("Portal tab trigger visible in buyer workspace dialog", async ({ page }) => {
    await setupMockedAdminWithBuyerEntity(page, null)
    const buyerWorkspace = await navigateToBuyerWorkspacePortalTab(page)

    const portalTabTrigger = buyerWorkspace.getByTestId(
      "admin-entity-crud-related-tab--property-entities--portal-tab",
    )
    await expect(portalTabTrigger).toBeVisible({ timeout: 10_000 })

    await shotFocused(page, portalTabTrigger, SHOT_DIR, "01-portal-tab-trigger")
    story.addScene({
      title: "01 — Buyer Workspace: Portal Tab Visible",
      images: [join(SHOT_DIR, "01-portal-tab-trigger.png")],
      seeing: "Portal tab trigger appears in the buyer workspace dialog alongside Offers, Files, Notes tabs.",
      steps: [
        "Open admin properties",
        "Edit buyer property entity",
        "Portal tab visible in buyer workspace dialog",
      ],
    })
  })

  test("Portal tab — no-token state shows generate button and empty message", async ({ page }) => {
    await setupMockedAdminWithBuyerEntity(page, null)
    const buyerWorkspace = await navigateToBuyerWorkspacePortalTab(page)

    // Click Portal tab
    await buyerWorkspace
      .getByTestId("admin-entity-crud-related-tab--property-entities--portal-tab")
      .click()

    const panel = buyerWorkspace.getByTestId("portal-access-panel")
    await expect(panel).toBeVisible({ timeout: 10_000 })

    const emptyMsg = panel.getByText(/no portal link/i)
    await expect(emptyMsg).toBeVisible({ timeout: 5_000 })

    const generateBtn = panel.getByTestId("portal-generate-btn")
    await expect(generateBtn).toBeVisible()

    await shotFocused(page, panel, SHOT_DIR, "02-portal-no-token")
    story.addScene({
      title: "02 — Portal Tab: No-Token State",
      images: [join(SHOT_DIR, "02-portal-no-token.png")],
      seeing: "Portal tab shows empty state with a Generate portal link button when no token exists.",
      steps: ["Open Portal tab", "No token exists — empty message and generate button shown"],
    })
  })

  test("Portal tab — generate link shows URL with Copy and Revoke", async ({ page }) => {
    await setupMockedAdminWithBuyerEntity(page, null)
    const buyerWorkspace = await navigateToBuyerWorkspacePortalTab(page)

    await buyerWorkspace
      .getByTestId("admin-entity-crud-related-tab--property-entities--portal-tab")
      .click()

    const panel = buyerWorkspace.getByTestId("portal-access-panel")
    await expect(panel).toBeVisible({ timeout: 10_000 })

    await panel.getByTestId("portal-generate-btn").click()

    const urlDisplay = panel.getByTestId("portal-url-display")
    await expect(urlDisplay).toBeVisible({ timeout: 10_000 })
    await expect(urlDisplay).toContainText("/portal/")

    await expect(panel.getByTestId("portal-copy-btn")).toBeVisible()
    await expect(panel.getByTestId("portal-revoke-btn")).toBeVisible()
    await expect(panel.getByTestId("portal-generated-at")).toBeVisible()

    await shotFocused(page, panel, SHOT_DIR, "03-portal-active-token")
    story.addScene({
      title: "03 — Portal Tab: Active Token State",
      images: [join(SHOT_DIR, "03-portal-active-token.png")],
      seeing: "After generating, the portal URL appears with Copy and Revoke buttons, plus generated time.",
      steps: ["Click Generate portal link", "URL, Copy, Revoke, and generated time all appear"],
    })
  })

  test("Portal tab — active token shows Last visited text", async ({ page }) => {
    await setupMockedAdminWithBuyerEntity(page, MOCK_ACTIVE_TOKEN)
    const buyerWorkspace = await navigateToBuyerWorkspacePortalTab(page)

    await buyerWorkspace
      .getByTestId("admin-entity-crud-related-tab--property-entities--portal-tab")
      .click()

    const panel = buyerWorkspace.getByTestId("portal-access-panel")
    await expect(panel).toBeVisible({ timeout: 10_000 })

    const lastVisited = panel.getByTestId("portal-last-visited")
    await expect(lastVisited).toBeVisible({ timeout: 5_000 })
    await expect(lastVisited).toContainText(/never opened/i)

    await shotFocused(page, lastVisited, SHOT_DIR, "04-portal-last-visited")
    story.addScene({
      title: "04 — Portal Tab: Last Visited Text",
      images: [join(SHOT_DIR, "04-portal-last-visited.png")],
      seeing: "Portal tab shows Last visited: Never opened when lastAccessedAt is null.",
      steps: ["Open Portal tab with existing active token", "Last visited text shows Never opened"],
    })
  })

  test("Portal tab — Copy link shows Copied! feedback", async ({ page }) => {
    await setupMockedAdminWithBuyerEntity(page, MOCK_ACTIVE_TOKEN)
    const buyerWorkspace = await navigateToBuyerWorkspacePortalTab(page)

    await buyerWorkspace
      .getByTestId("admin-entity-crud-related-tab--property-entities--portal-tab")
      .click()

    const panel = buyerWorkspace.getByTestId("portal-access-panel")
    await expect(panel).toBeVisible({ timeout: 10_000 })

    const copyBtn = panel.getByTestId("portal-copy-btn")
    await expect(copyBtn).toBeVisible({ timeout: 5_000 })

    await shotFocused(page, copyBtn, SHOT_DIR, "05a-copy-before")

    await copyBtn.click()

    await expect(copyBtn).toContainText(/copied/i, { timeout: 3_000 })

    await shotFocused(page, copyBtn, SHOT_DIR, "05b-copy-after")
    story.addScene({
      title: "05 — Portal Tab: Copy Link Feedback",
      images: [join(SHOT_DIR, "05a-copy-before.png"), join(SHOT_DIR, "05b-copy-after.png")],
      seeing: "Left: Copy link button in default state. Right: after click — button briefly shows Copied!",
      steps: ["Click Copy link button", "Button label changes to Copied! for ~2 seconds"],
    })
  })

  test("Portal tab — Revoke opens confirmation dialog", async ({ page }) => {
    await setupMockedAdminWithBuyerEntity(page, MOCK_ACTIVE_TOKEN)
    const buyerWorkspace = await navigateToBuyerWorkspacePortalTab(page)

    await buyerWorkspace
      .getByTestId("admin-entity-crud-related-tab--property-entities--portal-tab")
      .click()

    const panel = buyerWorkspace.getByTestId("portal-access-panel")
    await expect(panel).toBeVisible({ timeout: 10_000 })

    const revokeBtn = panel.getByTestId("portal-revoke-btn")
    await expect(revokeBtn).toBeVisible({ timeout: 5_000 })

    await shotFocused(page, revokeBtn, SHOT_DIR, "06a-revoke-btn")

    await revokeBtn.click()

    const revokeDialog = page.getByTestId("portal-revoke-dialog")
    await expect(revokeDialog).toBeVisible({ timeout: 5_000 })

    await shotFocused(page, revokeDialog, SHOT_DIR, "06b-revoke-dialog")
    story.addScene({
      title: "06 — Portal Tab: Revoke Confirmation Dialog",
      images: [join(SHOT_DIR, "06a-revoke-btn.png"), join(SHOT_DIR, "06b-revoke-dialog.png")],
      seeing: "Left: Revoke access button. Right: confirmation dialog appears before revoking.",
      steps: ["Click Revoke access", "Confirmation dialog appears with Confirm/Cancel buttons"],
    })
  })

  test("Portal tab — confirm revoke shows revoked state with date", async ({ page }) => {
    await setupMockedAdminWithBuyerEntity(page, MOCK_ACTIVE_TOKEN)
    const buyerWorkspace = await navigateToBuyerWorkspacePortalTab(page)

    await buyerWorkspace
      .getByTestId("admin-entity-crud-related-tab--property-entities--portal-tab")
      .click()

    const panel = buyerWorkspace.getByTestId("portal-access-panel")
    await expect(panel).toBeVisible({ timeout: 10_000 })

    await panel.getByTestId("portal-revoke-btn").click()
    const revokeDialog = page.getByTestId("portal-revoke-dialog")
    await expect(revokeDialog).toBeVisible({ timeout: 5_000 })
    await revokeDialog.getByTestId("portal-revoke-confirm-btn").click()

    const revokedStatus = panel.getByTestId("portal-revoked-status")
    await expect(revokedStatus).toBeVisible({ timeout: 10_000 })
    await expect(revokedStatus).toContainText(/revoked/i)

    await shotFocused(page, panel, SHOT_DIR, "07-revoked-state")
    story.addScene({
      title: "07 — Portal Tab: Revoked State",
      images: [join(SHOT_DIR, "07-revoked-state.png")],
      seeing: "After confirming revocation, panel shows revoked status message with date.",
      steps: ["Click Revoke → Confirm", "Panel shows Access revoked on [date] message"],
    })
  })

  test("Portal tab — cancel revoke keeps active state", async ({ page }) => {
    await setupMockedAdminWithBuyerEntity(page, MOCK_ACTIVE_TOKEN)
    const buyerWorkspace = await navigateToBuyerWorkspacePortalTab(page)

    await buyerWorkspace
      .getByTestId("admin-entity-crud-related-tab--property-entities--portal-tab")
      .click()

    const panel = buyerWorkspace.getByTestId("portal-access-panel")
    await expect(panel).toBeVisible({ timeout: 10_000 })

    await panel.getByTestId("portal-revoke-btn").click()
    const revokeDialog = page.getByTestId("portal-revoke-dialog")
    await expect(revokeDialog).toBeVisible({ timeout: 5_000 })
    await revokeDialog.getByTestId("portal-revoke-cancel-btn").click()

    await expect(revokeDialog).not.toBeVisible({ timeout: 3_000 })
    await expect(panel.getByTestId("portal-url-display")).toBeVisible()
  })

  test("Portal tab — Generate new link after revocation opens dialog", async ({ page }) => {
    await setupMockedAdminWithBuyerEntity(page, MOCK_REVOKED_TOKEN)
    const buyerWorkspace = await navigateToBuyerWorkspacePortalTab(page)

    await buyerWorkspace
      .getByTestId("admin-entity-crud-related-tab--property-entities--portal-tab")
      .click()

    const panel = buyerWorkspace.getByTestId("portal-access-panel")
    await expect(panel).toBeVisible({ timeout: 10_000 })

    const regenBtn = panel.getByTestId("portal-regen-btn")
    await expect(regenBtn).toBeVisible({ timeout: 5_000 })

    await shotFocused(page, panel, SHOT_DIR, "08a-revoked-regen-btn")

    await regenBtn.click()

    const regenDialog = page.getByTestId("portal-regen-dialog")
    await expect(regenDialog).toBeVisible({ timeout: 5_000 })

    await shotFocused(page, regenDialog, SHOT_DIR, "08b-regen-dialog")
    story.addScene({
      title: "08 — Portal Tab: Generate New Link Dialog",
      images: [join(SHOT_DIR, "08a-revoked-regen-btn.png"), join(SHOT_DIR, "08b-regen-dialog.png")],
      seeing: "Left: revoked state with Generate new link button. Right: confirmation dialog before generating.",
      steps: ["Click Generate new link (after revocation)", "Confirmation dialog appears"],
    })
  })

  test("Portal tab — confirm new link shows new active token", async ({ page }) => {
    await setupMockedAdminWithBuyerEntity(page, MOCK_REVOKED_TOKEN)
    const buyerWorkspace = await navigateToBuyerWorkspacePortalTab(page)

    await buyerWorkspace
      .getByTestId("admin-entity-crud-related-tab--property-entities--portal-tab")
      .click()

    const panel = buyerWorkspace.getByTestId("portal-access-panel")
    await expect(panel).toBeVisible({ timeout: 10_000 })

    await panel.getByTestId("portal-regen-btn").click()
    const regenDialog = page.getByTestId("portal-regen-dialog")
    await expect(regenDialog).toBeVisible({ timeout: 5_000 })
    await regenDialog.getByTestId("portal-regen-confirm-btn").click()

    const urlDisplay = panel.getByTestId("portal-url-display")
    await expect(urlDisplay).toBeVisible({ timeout: 10_000 })
    await expect(urlDisplay).toContainText("/portal/")

    await shotFocused(page, panel, SHOT_DIR, "09-new-active-token")
    story.addScene({
      title: "09 — Portal Tab: New Active Token After Regeneration",
      images: [join(SHOT_DIR, "09-new-active-token.png")],
      seeing: "After confirming regeneration, panel shows the new active portal URL.",
      steps: ["Click Generate new link → Confirm", "New portal URL appears in active-token state"],
    })
  })

  test("Portal tab — cancel new-link dialog keeps revoked state", async ({ page }) => {
    await setupMockedAdminWithBuyerEntity(page, MOCK_REVOKED_TOKEN)
    const buyerWorkspace = await navigateToBuyerWorkspacePortalTab(page)

    await buyerWorkspace
      .getByTestId("admin-entity-crud-related-tab--property-entities--portal-tab")
      .click()

    const panel = buyerWorkspace.getByTestId("portal-access-panel")
    await expect(panel).toBeVisible({ timeout: 10_000 })

    await panel.getByTestId("portal-regen-btn").click()
    const regenDialog = page.getByTestId("portal-regen-dialog")
    await expect(regenDialog).toBeVisible({ timeout: 5_000 })
    await regenDialog.getByTestId("portal-regen-cancel-btn").click()

    await expect(regenDialog).not.toBeVisible({ timeout: 3_000 })
    await expect(panel.getByTestId("portal-revoked-status")).toBeVisible()
  })
})
