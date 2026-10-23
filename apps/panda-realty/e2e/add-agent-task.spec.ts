/**
 * E2E: Condition Calendar — Add Task for Agent dialog
 *
 * Success factors:
 * 1. "Add Task for Agent" button is visible in the heading row alongside "Add Calendar Event".
 * 2. Button is disabled when Gmail/Google Calendar is not connected; tooltip says "Connect Gmail to add tasks".
 * 3. Clicking the button opens the "Add Task for Agent" dialog.
 * 4. Dialog contains: Agent selector (required), Task title (required), Due date (optional), Notes (optional).
 * 5. Selecting an agent with no email shows a ⚠ warning below the selector.
 * 6. Submitting a valid form POSTs to /api/admin/calendar/agent-tasks and shows success message in dialog.
 * 7. After success the calendar task events are refetched (a new request to agent-tasks is fired).
 * 8. A failed POST shows an inline error message in the dialog; dialog stays open.
 *
 * Google/Gmail API calls and agent-tasks API are mocked — no live token required.
 * Requires: E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD + DATABASE_URL (for SSR page render).
 */

import { expect, test, type Page } from "@playwright/test"

import { signInAsAdmin } from "./helpers/admin-auth"
import { requirePandaLiveE2eEnv } from "./helpers/require-panda-live-e2e-env"

const MOCK_AGENTS = [
  { agentId: 1, agentName: "Alice Smith", email: "alice@example.com" },
  { agentId: 2, agentName: "Bob Jones", email: null },
]

async function mockConnectedCalendar(page: Page) {
  await page.route("**/api/admin/calendar/google-events**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ connected: true, events: [] }),
    })
  })
}

async function mockAgents(page: Page) {
  await page.route("**/api/admin/agents**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_AGENTS),
    })
  })
}

async function mockAgentTasks(page: Page, tasks = []) {
  await page.route("**/api/admin/calendar/agent-tasks**", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(tasks),
      })
    } else {
      await route.continue()
    }
  })
}

async function gotoCalendarPage(page: Page) {
  await page.goto("/admin/calendar")
  await page.waitForLoadState("networkidle")
  await expect(page.getByTestId("condition-calendar-view")).toBeVisible({ timeout: 15_000 })
}

test.describe("Add Task for Agent", () => {
  test.beforeAll(() => {
    requirePandaLiveE2eEnv()
  })

  test.beforeEach(async ({ page }) => {
    await signInAsAdmin(page)
  })

  // ── 1. Button visible in heading row ──────────────────────────────────────────

  test("Add Task for Agent button is visible when Gmail connected", async ({ page }) => {
    await mockConnectedCalendar(page)
    await mockAgents(page)
    await mockAgentTasks(page)

    await gotoCalendarPage(page)

    const button = page.getByTestId("add-agent-task-button")
    await expect(button).toBeVisible()
    await expect(button).toBeEnabled()
    await expect(page.getByTestId("add-calendar-event-button")).toBeVisible()
  })

  // ── 2. Button disabled when not connected ──────────────────────────────────────

  test("button is disabled when Gmail is not connected", async ({ page }) => {
    await page.route("**/api/admin/calendar/google-events**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ connected: false, events: [] }),
      })
    })
    await mockAgents(page)
    await mockAgentTasks(page)

    await gotoCalendarPage(page)

    const button = page.getByTestId("add-agent-task-button")
    await expect(button).toBeDisabled()
  })

  // ── 3 & 4. Dialog opens with correct fields ───────────────────────────────────

  test("clicking button opens dialog with expected fields", async ({ page }) => {
    await mockConnectedCalendar(page)
    await mockAgents(page)
    await mockAgentTasks(page)

    await gotoCalendarPage(page)
    await page.getByTestId("add-agent-task-button").click()

    const dialog = page.getByTestId("add-agent-task-dialog")
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole("heading", { name: "Add Task for Agent" })).toBeVisible()
    await expect(page.getByTestId("add-agent-task-agent")).toBeVisible()
    await expect(page.getByTestId("add-agent-task-title")).toBeVisible()
    await expect(page.getByTestId("add-agent-task-due-date")).toBeVisible()
    await expect(page.getByTestId("add-agent-task-notes")).toBeVisible()
    await expect(page.getByTestId("add-agent-task-submit")).toBeVisible()
  })

  // ── 5. Agent without email shows warning ──────────────────────────────────────

  test("selecting agent without email shows no-email warning", async ({ page }) => {
    await mockConnectedCalendar(page)
    await mockAgents(page)
    await mockAgentTasks(page)

    await gotoCalendarPage(page)
    await page.getByTestId("add-agent-task-button").click()

    // Select Bob Jones (no email)
    await page.getByTestId("add-agent-task-agent").click()
    await page.getByRole("option", { name: "Bob Jones" }).click()

    await expect(page.getByTestId("add-agent-task-no-email-warning")).toBeVisible()
    await expect(page.getByTestId("add-agent-task-no-email-warning")).toContainText(
      "no email",
    )

    // Selecting Alice Smith (has email) — warning should disappear
    await page.getByTestId("add-agent-task-agent").click()
    await page.getByRole("option", { name: "Alice Smith" }).click()
    await expect(page.getByTestId("add-agent-task-no-email-warning")).not.toBeVisible()
  })

  // ── 6 & 7. Successful task creation ──────────────────────────────────────────

  test("submitting valid form shows success and refetches agent tasks", async ({ page }) => {
    let agentTasksGetCount = 0
    await mockConnectedCalendar(page)
    await mockAgents(page)

    await page.route("**/api/admin/calendar/agent-tasks**", async (route) => {
      if (route.request().method() === "GET") {
        agentTasksGetCount++
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([]),
        })
      } else if (route.request().method() === "POST") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ id: 42 }),
        })
      } else {
        await route.continue()
      }
    })

    await gotoCalendarPage(page)
    const initialGetCount = agentTasksGetCount

    await page.getByTestId("add-agent-task-button").click()
    await expect(page.getByTestId("add-agent-task-dialog")).toBeVisible()

    // Select agent
    await page.getByTestId("add-agent-task-agent").click()
    await page.getByRole("option", { name: "Alice Smith" }).click()

    await page.getByTestId("add-agent-task-title").fill("E2E Task Test")
    await page.getByTestId("add-agent-task-due-date").fill("2026-06-15")
    await page.getByTestId("add-agent-task-submit").click()

    await expect(page.getByTestId("add-agent-task-success")).toBeVisible({ timeout: 5_000 })
    await expect(page.getByTestId("add-agent-task-success")).toContainText("Task created")

    // Task list should have been refetched
    await expect
      .poll(() => agentTasksGetCount, { timeout: 5_000 })
      .toBeGreaterThan(initialGetCount)
  })

  // ── 8. Failed POST shows inline error ────────────────────────────────────────

  test("failed POST shows inline error in dialog, dialog stays open", async ({ page }) => {
    await mockConnectedCalendar(page)
    await mockAgents(page)

    await page.route("**/api/admin/calendar/agent-tasks**", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([]),
        })
      } else if (route.request().method() === "POST") {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "Database error" }),
        })
      } else {
        await route.continue()
      }
    })

    await gotoCalendarPage(page)
    await page.getByTestId("add-agent-task-button").click()

    await page.getByTestId("add-agent-task-agent").click()
    await page.getByRole("option", { name: "Alice Smith" }).click()
    await page.getByTestId("add-agent-task-title").fill("Error Test Task")
    await page.getByTestId("add-agent-task-submit").click()

    await expect(page.getByTestId("add-agent-task-error")).toBeVisible({ timeout: 5_000 })
    await expect(page.getByTestId("add-agent-task-error")).toContainText("Database error")
    await expect(page.getByTestId("add-agent-task-dialog")).toBeVisible()
  })
})
