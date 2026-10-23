import { expect, test } from "@playwright/test"

import {
  e2eAdminCredentials,
  e2ePandaAdminListApiConfigured,
  signInAsAdmin,
} from "./helpers/admin-auth"
import {
  createAgent,
  deleteAgentByName,
  deleteAllTestAgents,
} from "./helpers/agent-note-helpers"

const UNIQUE_SUFFIX = `e2e-${Date.now()}`
const AGENT_NAME = `Test Agent ${UNIQUE_SUFFIX}`
const AGENT_EMAIL = `agent-${UNIQUE_SUFFIX}@example.com`
const AGENT_PHONE = "0400 000 001"

test.beforeEach(async ({ page }) => {
  test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")
  test.skip(
    !e2ePandaAdminListApiConfigured,
    "DATABASE_URL not set — admin list uses live APIs (see apps/panda-realty/.env.example)",
  )
  await signInAsAdmin(page)
})

test.describe("Panda Realty admin — agents CRUD", () => {
  test.afterAll(async ({ browser }) => {
    if (!e2eAdminCredentials) return
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    try {
      await signInAsAdmin(page)
      await deleteAllTestAgents(page, ["DeleteMe-", "Test Agent e2e-"])
    } finally {
      await ctx.close()
    }
  })

  test("agents admin page loads", async ({ page }) => {
    await page.goto("/admin/agents")
    await expect(page.getByTestId("admin-entity-page")).toBeVisible()
    await expect(page.getByTestId("admin-entity-list-card--agents")).toBeVisible()
  })

  test("create agent — row appears in list with name, email, phone", async ({ page }) => {
    await createAgent(page, AGENT_NAME, AGENT_EMAIL, AGENT_PHONE)

    await expect(page.locator(`text=${AGENT_NAME}`).first()).toBeVisible()
    await expect(page.locator(`text=${AGENT_EMAIL}`).first()).toBeVisible()
    await expect(page.locator(`text=${AGENT_PHONE}`).first()).toBeVisible()

    await deleteAgentByName(page, AGENT_NAME)
  })

  test("delete agent — row is removed from list", async ({ page }) => {
    const name = `DeleteMe-${Date.now()}`
    await createAgent(page, name)
    await deleteAgentByName(page, name)
  })
})
