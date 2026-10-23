/**
 * E2E: Buyer notes — agent assignment
 *
 * Success factors:
 * 1. "Assign to agent:" label and dropdown are visible on the buyer Notes tab
 * 2. Selecting an agent from the dropdown shows the agent name in the trigger button
 * 3. Selecting "None" reverts the trigger label back to "None"
 * 4. Submitting a note with an agent assigned shows the agent name on the saved note row
 * 5. Submitting a note with no agent assigned still works (no agent badge on the note row)
 * 6. Ctrl+Enter keyboard shortcut submits the note
 */

import { expect, test, type Page } from "@playwright/test"

import { e2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"

const NOTE_PREFIX = "[E2E-agent-assign]"

test.describe("Buyer notes — agent assignment", () => {
  // ── Setup: sign in and open any buyer's Notes tab ──────────────────────────

  test.beforeEach(async ({ page }) => {
    test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")

    await signInAsAdmin(page)
    await page.goto("/admin/pipeline?pipeline=buyers")

    const firstCard = page.getByTestId(/^kanban-buyer-card--/).first()
    await firstCard.waitFor({ timeout: 20_000 })
    await firstCard.click()

    await page.getByTestId("buyer-panel-tab--notes").click()
    await page.getByTestId("panel-content-ready").waitFor({ timeout: 10_000 })
  })

  // ── Helper: skip if no agents are configured ───────────────────────────────

  async function skipIfNoAgents(page: Page) {
    const trigger = page.getByTestId("buyer-notes-assignee-trigger")
    const visible = await trigger.isVisible()
    if (!visible) test.skip(true, "No agents configured — assign dropdown not rendered")
  }

  // ── Helper: get the first agent option id from the open popover ────────────

  async function getFirstAgentOption(page: Page) {
    const firstOption = page.getByTestId(/^buyer-notes-assignee-option--(?!none$)/).first()
    await firstOption.waitFor({ timeout: 5_000 })
    return { element: firstOption, label: (await firstOption.textContent())?.trim() ?? "" }
  }

  // ── Tests ──────────────────────────────────────────────────────────────────

  test("assign dropdown and label are visible (success factor 1)", async ({ page }) => {
    await skipIfNoAgents(page)

    await expect(page.getByText("Assign to agent:", { exact: true })).toBeVisible()
    await expect(page.getByTestId("buyer-notes-assignee-trigger")).toBeVisible()
  })

  test("selecting an agent updates the trigger label (success factor 2)", async ({ page }) => {
    await skipIfNoAgents(page)

    await page.getByTestId("buyer-notes-assignee-trigger").click()
    const { element: firstOption, label: agentName } = await getFirstAgentOption(page)
    await firstOption.click()

    await expect(page.getByTestId("buyer-notes-assignee-trigger")).toHaveText(agentName)
  })

  test("selecting None reverts the trigger label (success factor 3)", async ({ page }) => {
    await skipIfNoAgents(page)

    // Select an agent first
    await page.getByTestId("buyer-notes-assignee-trigger").click()
    const { element: firstOption } = await getFirstAgentOption(page)
    await firstOption.click()

    // Now revert to None
    await page.getByTestId("buyer-notes-assignee-trigger").click()
    await page.getByTestId("buyer-notes-assignee-option--none").click()

    await expect(page.getByTestId("buyer-notes-assignee-trigger")).toHaveText("None")
  })

  test("note saved with agent shows agent name on row (success factor 4)", async ({ page }) => {
    await skipIfNoAgents(page)

    // Select an agent
    await page.getByTestId("buyer-notes-assignee-trigger").click()
    const { element: firstOption, label: agentName } = await getFirstAgentOption(page)
    await firstOption.click()

    // Type and submit a note
    const noteText = `${NOTE_PREFIX} with agent ${Date.now()}`
    await page.getByTestId("buyer-notes-textarea").fill(noteText)
    await page.getByTestId("buyer-notes-submit").click()

    // Wait for the new note row to appear
    const newRow = page.locator(`[data-testid^="buyer-note-row--"]`).filter({ hasText: noteText })
    await newRow.waitFor({ timeout: 10_000 })

    // Agent name badge is visible within that row
    const agentBadge = newRow.locator(`[data-testid^="buyer-note-agent--"]`)
    await expect(agentBadge).toBeVisible()
    await expect(agentBadge).toContainText(agentName)
  })

  test("note saved without agent has no agent badge (success factor 5)", async ({ page }) => {
    const textarea = page.getByTestId("buyer-notes-textarea")
    const noteText = `${NOTE_PREFIX} no-agent ${Date.now()}`
    await textarea.fill(noteText)
    await page.getByTestId("buyer-notes-submit").click()

    const newRow = page.locator(`[data-testid^="buyer-note-row--"]`).filter({ hasText: noteText })
    await newRow.waitFor({ timeout: 10_000 })

    // No agent badge inside this row
    await expect(newRow.locator(`[data-testid^="buyer-note-agent--"]`)).not.toBeAttached()
  })

  test("Ctrl+Enter submits the note (success factor 6)", async ({ page }) => {
    const textarea = page.getByTestId("buyer-notes-textarea")
    const noteText = `${NOTE_PREFIX} ctrl-enter ${Date.now()}`
    await textarea.fill(noteText)
    await textarea.press("Control+Enter")

    const newRow = page.locator(`[data-testid^="buyer-note-row--"]`).filter({ hasText: noteText })
    await newRow.waitFor({ timeout: 10_000 })
    await expect(newRow).toBeVisible()
  })
})
