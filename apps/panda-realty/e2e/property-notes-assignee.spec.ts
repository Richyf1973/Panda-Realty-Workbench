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
  openNotesTab,
} from "./helpers/agent-note-helpers"

test.beforeEach(async ({ page }) => {
  test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")
  test.skip(
    !e2ePandaAdminListApiConfigured,
    "DATABASE_URL not set — admin list uses live APIs (see apps/panda-realty/.env.example)",
  )
  await signInAsAdmin(page)
})

test.describe("Panda Realty admin — property notes assign-to combobox", () => {
  test.afterAll(async ({ browser }) => {
    if (!e2eAdminCredentials) return
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    try {
      await signInAsAdmin(page)
      await deleteAllTestAgents(page, ["NoteAgent-", "GroupAgent-", "ViaEmailAgent-"])
    } finally {
      await ctx.close()
    }
  })

  test("Notes tab shows 'Assign to:' label when agents exist", async ({ page }) => {
    const agentName = `NoteAgent-${Date.now()}`
    await createAgent(page, agentName)

    const panel = await openNotesTab(page)
    await expect(panel.getByText("Assign to:")).toBeVisible({ timeout: 5_000 })

    await deleteAgentByName(page, agentName)
  })

  test("Assign-to dropdown lists agents under an Agents group heading", async ({ page }) => {
    const agentName = `GroupAgent-${Date.now()}`
    await createAgent(page, agentName)

    const panel = await openNotesTab(page)

    // Open the Assign to combobox
    await panel.getByRole("combobox").filter({ hasText: "None" }).click()
    await expect(page.getByPlaceholder("Search…")).toBeVisible({ timeout: 5_000 })

    // Agents group heading should be visible
    await expect(page.locator("[cmdk-group-heading]").filter({ hasText: "Agents" })).toBeVisible()

    // Our agent should appear as an option
    await expect(page.getByRole("option", { name: agentName })).toBeVisible()

    await page.keyboard.press("Escape")
    await deleteAgentByName(page, agentName)
  })

  test("adding a note with agent assigned shows agent email in 'via' field", async ({ page }) => {
    const agentName = `ViaEmailAgent-${Date.now()}`
    const agentEmail = `viaemail-${Date.now()}@example.com`
    const noteText = `Agent email test ${Date.now()}`
    await createAgent(page, agentName, agentEmail)

    const panel = await openNotesTab(page)

    await expect(panel.getByText("Assign to:")).toBeVisible({ timeout: 5_000 })

    // Select our agent
    await panel.getByRole("combobox").filter({ hasText: "None" }).click()
    await expect(page.getByPlaceholder("Search…")).toBeVisible()
    await page.getByPlaceholder("Search…").fill(agentName)
    await page.getByRole("option", { name: agentName }).click()

    // Submit note
    await panel.locator('textarea[placeholder="Type a note…"]').fill(noteText)
    await panel.getByRole("button", { name: "Add Note" }).click()

    // Note text appears
    await expect.poll(
      () => panel.locator(`text=${noteText}`).count(),
      { timeout: 10_000 },
    ).toBeGreaterThan(0)

    // Agent name shown in header
    await expect(panel.locator(`text=${agentName}`).first()).toBeVisible()

    // Agent email shown in "via" field (not admin email)
    await expect(panel.locator(`text=via ${agentEmail}`).first()).toBeVisible()

    await deleteAgentByName(page, agentName)
  })

  test("adding a note with no selection shows note without agent or buyer label", async ({ page }) => {
    const noteText = `No-assign note ${Date.now()}`
    const panel = await openNotesTab(page)

    await panel.locator('textarea[placeholder="Type a note…"]').fill(noteText)
    await panel.getByRole("button", { name: "Add Note" }).click()

    await expect.poll(
      () => panel.locator(`text=${noteText}`).count(),
      { timeout: 10_000 },
    ).toBeGreaterThan(0)
  })
})
