// Run: npm run test:e2e:scratch -- --app=panda-realty --spec="apps/panda-realty/e2e/admin-properties-forms-form6-no-legal-banner.spec.ts" --workers=1

import { expect, test } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { createStory, shotFocused } from "@repo/e2e-utils"

import { requirePandaE2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import {
  EMPTY_ENTITIES,
  FORMS_LIST_FORM6,
  PREFILL_DATA_FULL,
  openForm6SendDialog,
  setupCommonRoutes,
} from "./helpers/panda-form6-send-mocks"

const SHOT_DIR = join(dirname(fileURLToPath(import.meta.url)), "screenshots", "form6-no-legal-banner")

const story = createStory({ specUrl: import.meta.url, slug: "form6-no-legal-banner" })

story.setWhatWasBuilt(
  "Removed the amber 'CLIENT IS ADVISED TO SEEK INDEPENDENT LEGAL ADVICE' banner from the " +
    "Form 6 Send Form dialog (Tab 9 Signatures). The banner remains on the physical PDF template. " +
    "Changed file: apps/panda-realty/components/admin/form6-part9-signatures.tsx.",
)

test.beforeEach(async ({ page }) => {
  requirePandaE2eAdminCredentials()
  await setupCommonRoutes(page, FORMS_LIST_FORM6)
  await page.route("**/api/admin/property-forms/prefill-data**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(PREFILL_DATA_FULL) })
  })
  await page.route("**/api/admin/property-forms/template**", async (route) => {
    if (route.request().method() !== "GET") { await route.fallback(); return }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ templateValues: null }) })
  })
  await page.route("**/api/admin/properties/1001/buyers**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_ENTITIES) })
  })
  await page.route("**/api/admin/properties/1001/contacts**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_ENTITIES) })
  })
  await page.route("**/api/admin/properties/1001/tenants**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_ENTITIES) })
  })
  await signInAsAdmin(page)
  await mkdir(SHOT_DIR, { recursive: true })
})

test.afterAll(() => {
  story.write()
})

// ─── Happy path ───────────────────────────────────────────────────────────────

test("Tab 9 Signatures — amber legal advice banner is absent from dialog", async ({ page }) => {
  await openForm6SendDialog(page)
  await page.getByTestId("form6-tab-trigger--9").click()

  const tab9 = page.getByTestId("form6-fill-step")
  await expect(tab9).toBeVisible({ timeout: 10_000 })

  const banner = tab9.getByText("THE CLIENT IS ADVISED TO SEEK INDEPENDENT LEGAL ADVICE BEFORE SIGNING THIS APPOINTMENT.")
  // This assertion FAILS before implementation (banner is still rendered)
  await expect(banner).not.toBeVisible({ timeout: 5_000 })

  await shotFocused(page, tab9, SHOT_DIR, "01-tab9-no-banner")
  story.addScene({
    title: "01 — Tab 9 Signatures: Legal advice banner absent",
    images: [join(SHOT_DIR, "01-tab9-no-banner.png")],
    seeing: "The Signatures tab shows signature blocks and the reference caption, but no amber legal advice banner.",
    steps: [
      "Open Send Form dialog for Form 6",
      "Click tab '9 Signatures'",
      "Observe: no amber banner reading 'THE CLIENT IS ADVISED TO SEEK INDEPENDENT LEGAL ADVICE...'",
    ],
  })
})

test("Tab 9 Signatures — reference caption is still visible", async ({ page }) => {
  await openForm6SendDialog(page)
  await page.getByTestId("form6-tab-trigger--9").click()

  const caption = page.getByText("Signatures are applied on the printed form")
  await expect(caption).toBeVisible({ timeout: 10_000 })

  await shotFocused(page, caption, SHOT_DIR, "02-tab9-caption")
  story.addScene({
    title: "02 — Tab 9 Signatures: Reference caption present",
    images: [join(SHOT_DIR, "02-tab9-caption.png")],
    seeing: "The explanatory caption about signatures being applied on the printed form remains visible.",
    steps: [
      "Open Send Form dialog for Form 6",
      "Click tab '9 Signatures'",
      "Observe: caption 'Signatures are applied on the printed form…' is present",
    ],
  })
})

test("Tab 9 Signatures — Client 1 signature block full name fields are visible", async ({ page }) => {
  await openForm6SendDialog(page)
  await page.getByTestId("form6-tab-trigger--9").click()

  const client1Name1 = page.getByTestId("form6-part9-client1-fullname1")
  await expect(client1Name1).toBeVisible({ timeout: 10_000 })

  const client1Name2 = page.getByTestId("form6-part9-client1-fullname2")
  await expect(client1Name2).toBeVisible()

  await shotFocused(page, client1Name1, SHOT_DIR, "03-tab9-client1-block")
  story.addScene({
    title: "03 — Tab 9 Signatures: Client 1 block intact",
    images: [join(SHOT_DIR, "03-tab9-client1-block.png")],
    seeing: "Client 1 full name fields are present and editable after banner removal.",
    steps: [
      "Open Send Form dialog for Form 6",
      "Click tab '9 Signatures'",
      "Observe: Client 1 Full name (line 1) and (line 2) inputs are visible",
    ],
  })
})

test("Tab 9 Signatures — Client 2 and Agent/Licensee signature blocks are visible", async ({ page }) => {
  await openForm6SendDialog(page)
  await page.getByTestId("form6-tab-trigger--9").click()

  const client2Name1 = page.getByTestId("form6-part9-client2-fullname1")
  await expect(client2Name1).toBeVisible({ timeout: 10_000 })

  const agentName1 = page.getByTestId("form6-part9-agent-fullname1")
  await expect(agentName1).toBeVisible()

  await shotFocused(page, client2Name1, SHOT_DIR, "04-tab9-client2-agent-blocks")
  story.addScene({
    title: "04 — Tab 9 Signatures: Client 2 and Agent blocks intact",
    images: [join(SHOT_DIR, "04-tab9-client2-agent-blocks.png")],
    seeing: "Client 2 and Agent/Licensee signature blocks remain fully functional after banner removal.",
    steps: [
      "Open Send Form dialog for Form 6",
      "Click tab '9 Signatures'",
      "Observe: Client 2 and Agent/Licensee name inputs are visible",
    ],
  })
})

// ─── Edge cases ───────────────────────────────────────────────────────────────

test("Other tabs do not render the legal advice banner", async ({ page }) => {
  await openForm6SendDialog(page)
  const banner = page.getByText("THE CLIENT IS ADVISED TO SEEK INDEPENDENT LEGAL ADVICE BEFORE SIGNING THIS APPOINTMENT.")

  for (const tabN of [1, 2, 3, 4, 6, 7, 8, 10]) {
    await page.getByTestId(`form6-tab-trigger--${tabN}`).click()
    await expect(banner).not.toBeVisible({ timeout: 5_000 })
  }
})
