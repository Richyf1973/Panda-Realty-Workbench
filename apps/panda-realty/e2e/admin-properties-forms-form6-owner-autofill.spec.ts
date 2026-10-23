import { expect, test } from "@playwright/test"

import {
  PREFILL_DATA_FULL,
  PREFILL_DATA_NO_OWNERS,
  PREFILL_DATA_ONE_OWNER,
  makeForm6Prefill,
  openForm6SendDialog,
} from "./helpers/panda-form6-send-mocks"

// PREFILL_DATA_FULL: seller1 = "John Smith", seller2 = "Jane Smith"
// AGENTS_LIST[0] = "Richard Falzon" (auto-selected), AGENTS_LIST[1] = "Maria Koch"

const setupPrefill = makeForm6Prefill

// ─── Tab 6: Client name from owner1 ──────────────────────────────────────────

test.describe("Form 6 owner autofill — Tab 6 Agency client name", () => {
  test.beforeEach(setupPrefill(PREFILL_DATA_FULL))

  test("Client name pre-filled from owner1 on modal open", async ({ page }) => {
    await openForm6SendDialog(page)
    await page.getByTestId("form6-tab-trigger--6").click()
    await expect(page.getByTestId("form6-part6-client-name")).toHaveValue("John Smith")
  })

  test("Client name shows owner1 only when two owners exist", async ({ page }) => {
    await openForm6SendDialog(page)
    await page.getByTestId("form6-tab-trigger--6").click()
    // Must NOT contain "Jane Smith" — only owner1
    const value = await page.getByTestId("form6-part6-client-name").inputValue()
    expect(value).toBe("John Smith")
    expect(value).not.toContain("Jane Smith")
  })

  test("Client name field is editable after pre-fill", async ({ page }) => {
    await openForm6SendDialog(page)
    await page.getByTestId("form6-tab-trigger--6").click()
    await page.getByTestId("form6-part6-client-name").fill("Custom Client Name")
    await expect(page.getByTestId("form6-part6-client-name")).toHaveValue("Custom Client Name")
  })
})

test.describe("Form 6 owner autofill — Tab 6 Agency client name blank when no owner", () => {
  test.beforeEach(setupPrefill(PREFILL_DATA_NO_OWNERS))

  test("Client name is blank when owner1name is null", async ({ page }) => {
    await openForm6SendDialog(page)
    await page.getByTestId("form6-tab-trigger--6").click()
    await expect(page.getByTestId("form6-part6-client-name")).toHaveValue("")
  })
})

// ─── Tab 6: Agent name from selected agent ────────────────────────────────────

test.describe("Form 6 owner autofill — Tab 6 Agency agent name", () => {
  test.beforeEach(setupPrefill(PREFILL_DATA_FULL))

  test("Agent name pre-filled from auto-selected agent on modal open", async ({ page }) => {
    await openForm6SendDialog(page)
    await page.getByTestId("form6-tab-trigger--6").click()
    // Richard Falzon is auto-selected (first agent)
    await expect(page.getByTestId("form6-part6-agent-name")).toHaveValue("Richard Falzon")
  })

  test("Agent name updates when agent is changed in Tab 2", async ({ page }) => {
    await openForm6SendDialog(page)
    // Switch to Maria Koch in Tab 2
    await page.getByTestId("form6-tab-trigger--2").click()
    await page.getByTestId("form6-part2-agent-select").click()
    await page.getByRole("option", { name: "Maria Koch" }).click()
    // Verify Tab 6 agent name updates
    await page.getByTestId("form6-tab-trigger--6").click()
    await expect(page.getByTestId("form6-part6-agent-name")).toHaveValue("Maria Koch")
  })

  test("Agent name field is editable after pre-fill", async ({ page }) => {
    await openForm6SendDialog(page)
    await page.getByTestId("form6-tab-trigger--6").click()
    await page.getByTestId("form6-part6-agent-name").fill("Custom Agent Name")
    await expect(page.getByTestId("form6-part6-agent-name")).toHaveValue("Custom Agent Name")
  })
})

// ─── Tab 9: Client 1 signature block from owner1 ─────────────────────────────

test.describe("Form 6 owner autofill — Tab 9 Client 1 signature block", () => {
  test.beforeEach(setupPrefill(PREFILL_DATA_FULL))

  test("Client 1 Full name (line 1) pre-filled from owner1 on modal open", async ({ page }) => {
    await openForm6SendDialog(page)
    await page.getByTestId("form6-tab-trigger--9").click()
    await expect(page.getByTestId("form6-part9-client1-fullname1")).toHaveValue("John Smith")
  })

  test("Client 1 Full name (line 2) is blank", async ({ page }) => {
    await openForm6SendDialog(page)
    await page.getByTestId("form6-tab-trigger--9").click()
    await expect(page.getByTestId("form6-part9-client1-fullname2")).toHaveValue("")
  })

  test("Client 1 Full name (line 1) field is editable after pre-fill", async ({ page }) => {
    await openForm6SendDialog(page)
    await page.getByTestId("form6-tab-trigger--9").click()
    await page.getByTestId("form6-part9-client1-fullname1").fill("Edited Name")
    await expect(page.getByTestId("form6-part9-client1-fullname1")).toHaveValue("Edited Name")
  })
})

test.describe("Form 6 owner autofill — Tab 9 Client 1 blank when no owner", () => {
  test.beforeEach(setupPrefill(PREFILL_DATA_NO_OWNERS))

  test("Client 1 Full name (line 1) is blank when owner1name is null", async ({ page }) => {
    await openForm6SendDialog(page)
    await page.getByTestId("form6-tab-trigger--9").click()
    await expect(page.getByTestId("form6-part9-client1-fullname1")).toHaveValue("")
  })
})

// ─── Tab 9: Client 2 signature block from owner2 ─────────────────────────────

test.describe("Form 6 owner autofill — Tab 9 Client 2 signature block with two owners", () => {
  test.beforeEach(setupPrefill(PREFILL_DATA_FULL))

  test("Client 2 Full name (line 1) pre-filled from owner2 when two owners exist", async ({ page }) => {
    await openForm6SendDialog(page)
    await page.getByTestId("form6-tab-trigger--9").click()
    await expect(page.getByTestId("form6-part9-client2-fullname1")).toHaveValue("Jane Smith")
  })
})

test.describe("Form 6 owner autofill — Tab 9 Client 2 blank when only one owner", () => {
  test.beforeEach(setupPrefill(PREFILL_DATA_ONE_OWNER))

  test("Client 2 Full name (line 1) is blank when no owner2", async ({ page }) => {
    await openForm6SendDialog(page)
    await page.getByTestId("form6-tab-trigger--9").click()
    await expect(page.getByTestId("form6-part9-client2-fullname1")).toHaveValue("")
  })
})

// ─── Tab 9: Agent signature block from selected agent ────────────────────────

test.describe("Form 6 owner autofill — Tab 9 Agent signature block", () => {
  test.beforeEach(setupPrefill(PREFILL_DATA_FULL))

  test("Agent Full name (line 1) pre-filled from auto-selected agent on modal open", async ({ page }) => {
    await openForm6SendDialog(page)
    await page.getByTestId("form6-tab-trigger--9").click()
    await expect(page.getByTestId("form6-part9-agent-fullname1")).toHaveValue("Richard Falzon")
  })

  test("Agent Full name (line 1) updates when agent is changed in Tab 2", async ({ page }) => {
    await openForm6SendDialog(page)
    // Switch to Maria Koch in Tab 2
    await page.getByTestId("form6-tab-trigger--2").click()
    await page.getByTestId("form6-part2-agent-select").click()
    await page.getByRole("option", { name: "Maria Koch" }).click()
    // Verify Tab 9 agent name updates
    await page.getByTestId("form6-tab-trigger--9").click()
    await expect(page.getByTestId("form6-part9-agent-fullname1")).toHaveValue("Maria Koch")
  })
})

// ─── Tab navigation preserves pre-filled values ───────────────────────────────

test.describe("Form 6 owner autofill — pre-filled values survive tab navigation", () => {
  test.beforeEach(setupPrefill(PREFILL_DATA_FULL))

  test("Tab 6 client name persists after navigating away and back", async ({ page }) => {
    await openForm6SendDialog(page)
    await page.getByTestId("form6-tab-trigger--6").click()
    await expect(page.getByTestId("form6-part6-client-name")).toHaveValue("John Smith")
    // Navigate away to Tab 1 and back
    await page.getByTestId("form6-tab-trigger--1").click()
    await page.getByTestId("form6-tab-trigger--6").click()
    await expect(page.getByTestId("form6-part6-client-name")).toHaveValue("John Smith")
  })

  test("Tab 9 client1 name persists after navigating away and back", async ({ page }) => {
    await openForm6SendDialog(page)
    await page.getByTestId("form6-tab-trigger--9").click()
    await expect(page.getByTestId("form6-part9-client1-fullname1")).toHaveValue("John Smith")
    // Navigate away to Tab 3 and back
    await page.getByTestId("form6-tab-trigger--3").click()
    await page.getByTestId("form6-tab-trigger--9").click()
    await expect(page.getByTestId("form6-part9-client1-fullname1")).toHaveValue("John Smith")
  })
})
