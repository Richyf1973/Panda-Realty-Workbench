import { expect } from "@playwright/test"

// ─── success factors ──────────────────────────────────────────────────────────
//
// 1. /admin/agents page loads with the entity list card visible.
// 2. An agent can be created with name, email, and phone — new row appears.
// 3. Created agent shows name, email, phone columns in the list.
// 4. The agent can be deleted — row disappears.
// 5. Property Notes tab shows an "Assign to:" combobox when agents or buyers exist.
// 6. The combobox lists agents under an "Agents" group heading.
// 7. Selecting an agent + adding a note shows agent email in the "via …" field.
// 8. Adding a note with no selection works (no agent/buyer label shown).
// 9. The combobox lists buyers under a "Buyers" group heading (when property has buyers).
// 10. Selecting a buyer + adding a note shows that buyer's name in the note header.
// 11. A buyer-linked note appears in the "Filter by buyer" dropdown for that buyer.
// 12. Selecting the buyer filter hides notes not linked to that buyer.

/** Create an agent and wait for the row to appear. Uses "Create & Close" so dialog closes. */
export async function createAgent(
  page: import("@playwright/test").Page,
  name: string,
  email = "",
  phone = "",
) {
  await page.goto("/admin/agents")
  await page.waitForLoadState("networkidle")
  await page.getByTestId("admin-entity-list-add-new--agents").click()
  const dialog = page.getByTestId("admin-entity-crud-dialog--agents")
  await expect(dialog).toBeVisible()

  await dialog
    .getByTestId("admin-entity-create-field--agents--agentName")
    .locator("input")
    .fill(name)

  if (email) {
    await dialog
      .getByTestId("admin-entity-create-field--agents--email")
      .locator("input")
      .fill(email)
  }
  if (phone) {
    await dialog
      .getByTestId("admin-entity-create-field--agents--phone")
      .locator("input")
      .fill(phone)
  }

  await dialog.getByTestId("admin-entity-create-and-close--agents").click()
  await expect(dialog).not.toBeVisible()
  await expect.poll(
    () => page.locator(`text=${name}`).count(),
    { timeout: 10_000 },
  ).toBeGreaterThan(0)
}

/** Delete all agents whose row text includes `nameFragment`. */
export async function deleteAgentByName(
  page: import("@playwright/test").Page,
  nameFragment: string,
) {
  await page.goto("/admin/agents")
  await page.waitForLoadState("networkidle")
  const allDeleteBtns = page.getByTestId(/^admin-entity-row-delete--agents--/)
  const count = await allDeleteBtns.count()
  for (let i = 0; i < count; i++) {
    const btn = allDeleteBtns.nth(i)
    // Extract the row ID from the delete button's testid, then locate the row directly.
    // admin-entity-row-delete--agents--<rowId>  →  admin-entity-row--agents--<rowId>
    const btnTestId = await btn.getAttribute("data-testid")
    const rowId = btnTestId?.replace("admin-entity-row-delete--agents--", "")
    if (!rowId) continue
    const row = page.getByTestId(`admin-entity-row--agents--${rowId}`)
    const rowText = await row.textContent()
    if (rowText?.includes(nameFragment)) {
      await btn.click()
      const cells = page.getByTestId(/^admin-entity-row-cell--agents--/)
      await expect.poll(
        async () => {
          const texts = await cells.allTextContents()
          return texts.some((t) => t.includes(nameFragment))
        },
        { timeout: 15_000 },
      ).toBe(false)
      return
    }
  }
}

/** Delete every agent whose row text starts with any of the given prefixes. Navigates once. */
export async function deleteAllTestAgents(
  page: import("@playwright/test").Page,
  prefixes: string | string[],
) {
  const list = Array.isArray(prefixes) ? prefixes : [prefixes]
  await page.goto("/admin/agents")
  await page.waitForLoadState("networkidle")
  let found = true
  while (found) {
    found = false
    const allDeleteBtns = page.getByTestId(/^admin-entity-row-delete--agents--/)
    const count = await allDeleteBtns.count()
    for (let i = 0; i < count; i++) {
      const btn = allDeleteBtns.nth(i)
      const btnTestId = await btn.getAttribute("data-testid")
      const rowId = btnTestId?.replace("admin-entity-row-delete--agents--", "")
      if (!rowId) continue
      const row = page.getByTestId(`admin-entity-row--agents--${rowId}`)
      const rowText = await row.textContent()
      if (list.some((p) => rowText?.includes(p))) {
        await btn.click()
        await page.waitForLoadState("networkidle")
        found = true
        break
      }
    }
  }
}

/** Navigate to the pipeline board, open the first property panel, and click the Notes tab. */
export async function openNotesTab(page: import("@playwright/test").Page) {
  await page.goto("/admin/pipeline")
  await page.waitForLoadState("networkidle")

  const firstCard = page.getByTestId(/^kanban-card--/).first()
  await expect(firstCard).toBeVisible({ timeout: 15_000 })
  await firstCard.click()

  const panel = page.locator('[aria-label="Property details"]')
  await expect(panel).toBeVisible({ timeout: 10_000 })

  await panel.getByRole("button", { name: "Notes" }).click()

  await expect(
    panel.locator('textarea[placeholder="Type a note…"], [data-testid*="empty-state"]').first(),
  ).toBeVisible({ timeout: 8_000 })

  return panel
}
