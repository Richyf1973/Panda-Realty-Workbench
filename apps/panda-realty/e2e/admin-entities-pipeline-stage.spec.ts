import { expect, test } from "@playwright/test"

import {
  e2eAdminCredentials,
  e2ePandaAdminListApiConfigured,
  signInAsAdmin,
} from "./helpers/admin-auth"
import {
  MOCK_PE_ID_A,
  MOCK_PE_ID_B,
  MOCK_STAGE_NAME,
  MOCK_STAGE_NAME_B,
  PROPERTY_A_DETAIL,
  PROPERTY_A_DETAIL_NO_STAGE,
  PROPERTY_B_DETAIL,
  stubPipelineStages,
  stubPropertyConnections,
} from "./helpers/admin-entities-pipeline-stage-mocks"

// ---------------------------------------------------------------------------
// Navigation helpers
// ---------------------------------------------------------------------------

async function openFirstBuyerEditDialog(page: Parameters<typeof signInAsAdmin>[0]) {
  await page.goto(
    "/admin/entities?limit=25&page=1&sortKey=entityName&sortDir=asc&entityCategoryId=1&listLayout=grid",
  )
  await page.waitForLoadState("networkidle")

  await page.getByTestId(/^admin-entity-row-edit--entities--/).first().click()
  await expect(page.getByTestId("admin-entity-crud-dialog--entities")).toBeVisible({
    timeout: 10_000,
  })
  await expect(page.getByTestId("panda-entities-dialog-form")).toBeVisible()
}

async function scrollToConnections(page: Parameters<typeof signInAsAdmin>[0]) {
  const dialogForm = page.getByTestId("panda-entities-dialog-form")
  await dialogForm.evaluate((el) => el.scrollTo(0, el.scrollHeight))
  const connections = page.getByTestId("panda-entities-property-connections")
  await expect(connections).toBeVisible({ timeout: 10_000 })
  return connections
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe("Edit Buyer dialog — Pipeline stage dropdown", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")
    test.skip(
      !e2ePandaAdminListApiConfigured,
      "DATABASE_URL not set — admin list uses live APIs",
    )

    await stubPipelineStages(page)
    await signInAsAdmin(page)
  })

  test("shows the correct pipeline stage name when buyerPipelineStatusId is set", async ({
    page,
  }) => {
    await stubPropertyConnections(page, [PROPERTY_A_DETAIL], { [MOCK_PE_ID_A]: PROPERTY_A_DETAIL })

    await openFirstBuyerEditDialog(page)
    const connections = await scrollToConnections(page)

    const pipelineSelect = connections.getByTestId(
      "panda-entities-property-connections--pipeline-select",
    )
    await expect(pipelineSelect).toBeVisible({ timeout: 8_000 })
    await expect(pipelineSelect).toContainText(MOCK_STAGE_NAME)
    await expect(pipelineSelect).not.toContainText("Not on pipeline")
  })

  test("shows Not on pipeline when buyerPipelineStatusId is null", async ({ page }) => {
    await stubPropertyConnections(
      page,
      [PROPERTY_A_DETAIL_NO_STAGE],
      { [MOCK_PE_ID_A]: PROPERTY_A_DETAIL_NO_STAGE },
    )

    await openFirstBuyerEditDialog(page)
    const connections = await scrollToConnections(page)

    const pipelineSelect = connections.getByTestId(
      "panda-entities-property-connections--pipeline-select",
    )
    await expect(pipelineSelect).toBeVisible({ timeout: 8_000 })
    await expect(pipelineSelect).toContainText("Not on pipeline")
  })

  test("changing pipeline stage updates the dropdown immediately", async ({ page }) => {
    const patchedIds: number[] = []
    await stubPropertyConnections(
      page,
      [PROPERTY_A_DETAIL_NO_STAGE],
      { [MOCK_PE_ID_A]: PROPERTY_A_DETAIL_NO_STAGE },
      (id) => patchedIds.push(id),
    )

    await openFirstBuyerEditDialog(page)
    const connections = await scrollToConnections(page)

    const pipelineSelect = connections.getByTestId(
      "panda-entities-property-connections--pipeline-select",
    )
    await expect(pipelineSelect).toBeVisible({ timeout: 8_000 })
    await expect(pipelineSelect).toContainText("Not on pipeline")

    await pipelineSelect.click()
    await page.getByRole("option", { name: MOCK_STAGE_NAME }).click()

    await expect(pipelineSelect).toContainText(MOCK_STAGE_NAME)
    await expect(pipelineSelect).not.toContainText("Not on pipeline")
    expect(patchedIds).toContain(MOCK_PE_ID_A)
  })

  test("pipeline stage does not revert after switching to another connection and back", async ({
    page,
  }) => {
    await stubPropertyConnections(
      page,
      [PROPERTY_A_DETAIL_NO_STAGE, PROPERTY_B_DETAIL],
      {
        [MOCK_PE_ID_A]: PROPERTY_A_DETAIL_NO_STAGE,
        [MOCK_PE_ID_B]: PROPERTY_B_DETAIL,
      },
    )

    await openFirstBuyerEditDialog(page)
    const connections = await scrollToConnections(page)

    // Auto-selects highest ID (MOCK_PE_ID_B = 5002) initially; switch to A
    const connectionSelect = connections.getByTestId(
      "panda-entities-property-connections--select",
    )
    await connectionSelect.click()
    await page.getByRole("option", { name: /Valley Drive/i }).click()

    const pipelineSelect = connections.getByTestId(
      "panda-entities-property-connections--pipeline-select",
    )
    await expect(pipelineSelect).toBeVisible({ timeout: 8_000 })
    await expect(pipelineSelect).toContainText("Not on pipeline")

    await pipelineSelect.click()
    await page.getByRole("option", { name: MOCK_STAGE_NAME }).click()
    await expect(pipelineSelect).toContainText(MOCK_STAGE_NAME)

    await connectionSelect.click()
    await page.getByRole("option", { name: /Elm Street/i }).click()
    await expect(pipelineSelect).toContainText(MOCK_STAGE_NAME_B)

    // Switch back — stage must NOT revert to "Not on pipeline"
    await connectionSelect.click()
    await page.getByRole("option", { name: /Valley Drive/i }).click()
    await expect(pipelineSelect).toContainText(MOCK_STAGE_NAME)
    await expect(pipelineSelect).not.toContainText("Not on pipeline")
  })
})
