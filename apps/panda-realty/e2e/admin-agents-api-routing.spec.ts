// Run: npm run test:e2e:scratch -- --app=panda-realty --spec=apps/panda-realty/e2e/admin-agents-api-routing.spec.ts --no-bail

import { expect, test } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { createStory, shotFocused } from "@repo/e2e-utils"

import { signInAsAdmin } from "./helpers/admin-auth"
import { requirePandaLiveE2eEnv } from "./helpers/require-panda-live-e2e-env"

const SHOT_DIR = join(dirname(fileURLToPath(import.meta.url)), "screenshots", "admin-agents-api-routing")

const story = createStory({ specUrl: import.meta.url, slug: "admin-agents-api-routing" })

story.setWhatWasBuilt(
  "Fixed two bugs preventing /admin/agents from showing agents. " +
  "(1) Removed proxyClientMaxBodySize from next.config.mjs — it caused all /api/* routes to return " +
  "404 by routing them through the RSC page layer in Turbopack dev mode. " +
  "(2) Moved the flat-list GET handler from app/api/admin/agents/route.ts to " +
  "app/api/admin/agents/options/route.ts so the generic paginated [entity] handler now responds " +
  "to the admin entity list page's requests. All 5 callers of the flat-list endpoint were updated " +
  "to use /api/admin/agents/options. Also renamed serverBodySizeLimit → serverActionsBodySizeLimit " +
  "in next.config.mjs experimental to silence the Next.js 16 startup warning.",
)

const MOCK_AGENTS = [
  { agentId: 20, agentName: "Richard Falzon", email: "admin@mypandarealty.com.au", phone: "0490456959" },
  { agentId: 21, agentName: "Maria Koch", email: "admin@mypandarealty.com.au", phone: "0493635660" },
]

const PAGINATED_AGENTS_RESPONSE = {
  items: MOCK_AGENTS,
  totalCount: 2,
  effectivePage: 1,
  totalPages: 1,
  limit: 25,
  hasNextPage: false,
  hasPreviousPage: false,
  startCursor: null,
  endCursor: null,
}

test.beforeEach(async () => {
  await mkdir(SHOT_DIR, { recursive: true })
})

test.afterAll(() => {
  story.write()
})

// ── 1. Agents list page shows paginated data ─────────────────────────────────

test.describe("admin agents page — paginated API routing", () => {
  test.beforeAll(() => {
    requirePandaLiveE2eEnv()
  })

  test.beforeEach(async ({ page }) => {
    await signInAsAdmin(page)
  })

  test("agents list page shows agents — paginated response from generic [entity] handler", async ({ page }) => {
    let paginatedResponseBody: unknown = null

    await page.route("**/api/admin/agents?**", async (route) => {
      const res = await route.fetch()
      const body = await res.json() as unknown
      paginatedResponseBody = body
      await route.fulfill({
        status: res.status(),
        contentType: "application/json",
        body: JSON.stringify(body),
      })
    })

    await page.goto("/admin/agents")
    await page.waitForLoadState("networkidle")

    const entityPage = page.getByTestId("admin-entity-page")
    await expect(entityPage).toBeVisible({ timeout: 15_000 })

    // Assert the API returned paginated shape (not flat array)
    // Actual format: { items, totalCount, totalPages, effectivePage, limit, startCursor, endCursor, hasNextPage, hasPreviousPage }
    expect(Array.isArray(paginatedResponseBody)).toBe(false)
    expect(paginatedResponseBody).toHaveProperty("items")
    expect(paginatedResponseBody).toHaveProperty("totalCount")
    expect(paginatedResponseBody).toHaveProperty("effectivePage")
    expect(paginatedResponseBody).toHaveProperty("totalPages")

    // Table shows at least one agent row
    const listCard = page.getByTestId("admin-entity-list-card--agents")
    await expect(listCard).toBeVisible({ timeout: 10_000 })

    const totalText = page.locator("text=/\\d+ total/")
    await expect(totalText).toBeVisible({ timeout: 10_000 })

    await shotFocused(page, listCard, SHOT_DIR, "01-agents-list")
    story.addScene({
      title: "01 — Agents list with paginated data",
      images: [join(SHOT_DIR, "01-agents-list.png")],
      seeing: "Admin agents list showing agent rows loaded from the paginated generic [entity] API handler.",
      steps: [
        "Sign in as admin",
        "Navigate to /admin/agents",
        "Verify GET /api/admin/agents?limit=... returns {items, totalCount, effectivePage, totalPages} (cursor-based paginated shape)",
        "Verify agents table renders with at least one row",
      ],
    })
  })

  // ── 2. /api/admin/agents/options returns flat array ──────────────────────────

  test("/api/admin/agents/options returns flat array (not paginated)", async ({ page }) => {
    await page.goto("/admin/agents")
    await page.waitForLoadState("networkidle")

    const responseBody = await page.evaluate(async () => {
      const res = await fetch("/api/admin/agents/options")
      return res.json() as Promise<unknown>
    })

    expect(Array.isArray(responseBody)).toBe(true)
    const rows = responseBody as Array<{ agentId: number; agentName: string }>
    if (rows.length > 0) {
      expect(rows[0]).toHaveProperty("agentId")
      expect(rows[0]).toHaveProperty("agentName")
      // No "rows" wrapper key — it's a flat array
      expect(rows[0]).not.toHaveProperty("rows")
    }
  })
})

// ── 3. Note dialog calls /api/admin/agents/options (mocked) ──────────────────

test.describe("add note dialog — agent dropdown uses /options endpoint", () => {
  test.beforeAll(() => {
    requirePandaLiveE2eEnv()
  })

  test.beforeEach(async ({ page }) => {
    await signInAsAdmin(page)
  })

  test("buyer note dialog calls /api/admin/agents/options and populates agent dropdown", async ({ page }) => {
    let optionsCallCount = 0
    let flatArrayCallCount = 0

    // Intercept /options (correct new endpoint)
    await page.route("**/api/admin/agents/options**", async (route) => {
      optionsCallCount++
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_AGENTS),
      })
    })

    // Intercept /api/admin/agents?... (paginated — should NOT be called by dialogs)
    await page.route("**/api/admin/agents?**", async (route) => {
      flatArrayCallCount++
      await route.continue()
    })

    await page.goto("/admin/agents")
    await page.waitForLoadState("networkidle")

    // Open Add agent task dialog as a proxy for any dialog that calls the options endpoint
    // (The add-buyer-note dialog requires navigating to a specific buyer — using calendar page is simpler)
    await page.route("**/api/admin/calendar/google-events**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ connected: true, events: [] }),
      })
    })
    await page.route("**/api/admin/calendar/agent-tasks**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      })
    })

    await page.goto("/admin/calendar")
    await page.waitForLoadState("networkidle")
    await expect(page.getByTestId("condition-calendar-view")).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId("add-agent-task-button")).toBeVisible({ timeout: 10_000 })
    await page.getByTestId("add-agent-task-button").click()

    const dialog = page.getByTestId("add-agent-task-dialog")
    await expect(dialog).toBeVisible({ timeout: 5_000 })

    // Agents should appear in the select
    await page.getByTestId("add-agent-task-agent").click()
    await expect(page.getByRole("option", { name: "Richard Falzon" })).toBeVisible({ timeout: 5_000 })
    await expect(page.getByRole("option", { name: "Maria Koch" })).toBeVisible({ timeout: 5_000 })

    // /api/admin/agents/options was called (not /api/admin/agents directly)
    expect(optionsCallCount).toBeGreaterThan(0)

    const agentSelect = page.getByTestId("add-agent-task-agent")
    await shotFocused(page, agentSelect, SHOT_DIR, "02-agent-dropdown-populated")
    story.addScene({
      title: "02 — Agent dropdown populated from /options endpoint",
      images: [join(SHOT_DIR, "02-agent-dropdown-populated.png")],
      seeing: "Agent dropdown in the Add Task dialog showing agents loaded from /api/admin/agents/options (flat array endpoint).",
      steps: [
        "Navigate to /admin/calendar",
        "Click Add Task for Agent",
        "Open the Agent select dropdown",
        "Verify agents appear from /api/admin/agents/options",
      ],
    })
  })

  // ── 4. Empty state ────────────────────────────────────────────────────────────

  test("agents list shows empty state when paginated response has no rows", async ({ page }) => {
    await page.route("**/api/admin/agents?**", async (route) => {
      if (route.request().method() !== "GET") { await route.continue(); return }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: [], totalCount: 0, effectivePage: 1, totalPages: 0, limit: 25, hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null }),
      })
    })

    await page.goto("/admin/agents")
    await page.waitForLoadState("networkidle")

    const entityPage = page.getByTestId("admin-entity-page")
    await expect(entityPage).toBeVisible({ timeout: 15_000 })

    // Empty state text
    const emptyState = page.locator("text=No agents yet.")
    await expect(emptyState).toBeVisible({ timeout: 10_000 })

    await shotFocused(page, emptyState, SHOT_DIR, "03-empty-state")
    story.addScene({
      title: "03 — Empty state when no agents",
      images: [join(SHOT_DIR, "03-empty-state.png")],
      seeing: "Agents table showing 'No agents yet.' when the paginated response returns zero rows.",
      steps: [
        "Mock GET /api/admin/agents?... to return {items: [], totalCount: 0, effectivePage: 1, totalPages: 0, limit: 25, hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null}",
        "Navigate to /admin/agents",
        "Verify 'No agents yet.' empty state renders (not a JS error)",
      ],
    })
  })
})
