/**
 * Regression: entity edit dialog opened via ↗ from a property page must default
 * the Property Connections dropdown to the source property, not the connection with
 * the highest propertyEntityId.
 *
 * Root cause: loadingList and loadingFavorites were initialised as false, so the
 * pre-fill effect fired on first render with empty connections, set
 * initialPrefillDoneRef=true prematurely, and the auto-select then picked the wrong
 * property when multiple connections existed.
 *
 * Run: npm run test:e2e:scratch -- --app=panda-realty --spec="apps/panda-realty/e2e/buyer-entity-dialog-property-connection-default.spec.ts" --no-bail
 */
import { expect, test, type Route } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { createStory, shotFocused } from "@repo/e2e-utils"

import { e2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import {
  BUYER_OFFERS_FOR_PE_501,
  EMPTY_PROPERTY_ENTITIES_RESPONSE,
  TWO_CONNECTIONS_FOR_ENTITY_201,
  openEntityDialogFromProperty1001,
  setupEntityDialogPropertyConnectionRoutes,
} from "./helpers/admin-entity-dialog-property-connection-mocks"

const SHOT_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "screenshots",
  "buyer-entity-dialog-property-connection-default",
)

const story = createStory({
  specUrl: import.meta.url,
  slug: "buyer-entity-dialog-property-connection-default",
})

story.setWhatWasBuilt(
  "Fixed a race condition in usePandaEntitiesPropertyConnectionsList where loadingList " +
    "and loadingFavorites were initialised as false. This caused the pre-fill effect to fire " +
    "on the first render before fetches ran, set initialPrefillDoneRef=true with empty connections, " +
    "and leave the dialog stuck on the auto-selected (highest propertyEntityId) connection. " +
    "Fix: initialise both flags as true so the pre-fill waits for real data.",
)

test.beforeEach(async () => {
  await mkdir(SHOT_DIR, { recursive: true })
})

test.afterAll(() => {
  story.write()
})

test.describe("Entity dialog — property connection defaults to source property (mocked APIs)", () => {
  test.beforeEach(async ({ page }) => {
    if (!e2eAdminCredentials) throw new Error("Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD in apps/panda-realty/.env.local")
    await setupEntityDialogPropertyConnectionRoutes(page)
    await signInAsAdmin(page)
  })

  test("connections dropdown defaults to source property when buyer has two connections", async ({ page }) => {
    const dlg = await openEntityDialogFromProperty1001(page)

    const connections = dlg.getByTestId("panda-entities-property-connections")
    await expect(connections).toBeVisible({ timeout: 20_000 })

    const select = connections.getByTestId("panda-entities-property-connections--select")
    // Must show "12 Test Street" (pe:501, property 1001 — the source)
    // NOT "98 Other Street" (pe:502, property 1002 — higher ID, would be picked by the buggy auto-select)
    await expect(select).not.toContainText(/Select property…/i, { timeout: 10_000 })
    await expect(select).toContainText(/12 Test Street/i, { timeout: 10_000 })

    await shotFocused(page, connections, SHOT_DIR, "01-connections-default-source-property")
    story.addScene({
      title: "01 — Connections dropdown defaults to source property",
      images: [join(SHOT_DIR, "01-connections-default-source-property.png")],
      seeing:
        "Property Connections select shows '12 Test Street' (the property the dialog was opened from), " +
        "not '98 Other Street' (the connection with the higher propertyEntityId).",
      steps: [
        "Open /admin/properties",
        "Click row for property 1001 (12 Test Street)",
        "Click Buyers tab → click ↗ on Test Buyer LLC",
        "Observe Property Connections dropdown defaults to 12 Test Street",
      ],
    })
  })

  test("Offers tab shows source property offers, not No offers recorded yet", async ({ page }) => {
    const dlg = await openEntityDialogFromProperty1001(page)

    const connections = dlg.getByTestId("panda-entities-property-connections")
    await expect(connections).toBeVisible({ timeout: 20_000 })
    await expect(connections.getByTestId("panda-entities-property-connections--select")).toContainText(/12 Test Street/i, { timeout: 15_000 })

    await dlg.getByRole("tab", { name: /^offers$/i }).click()

    await expect(dlg).not.toContainText("No offers recorded yet.", { timeout: 10_000 })
    await expect(dlg).toContainText("500,000", { timeout: 10_000 })

    await shotFocused(page, dlg, SHOT_DIR, "02-offers-tab-shows-source-property-offers")
    story.addScene({
      title: "02 — Offers tab shows source property offers",
      images: [join(SHOT_DIR, "02-offers-tab-shows-source-property-offers.png")],
      seeing:
        "Offers tab shows the $500k offer for 12 Test Street. " +
        "Before the fix, the wrong connection (98 Other Street) was selected and the tab showed 'No offers recorded yet.'",
      steps: [
        "Open entity dialog from property 1001",
        "Wait for Property Connections to default to 12 Test Street",
        "Click Offers tab",
        "Observe offer amount $500,000 is visible",
      ],
    })
  })

  test("single-connection buyer — dropdown shows that one property", async ({ page }) => {
    // Override: only one connection for entity 201
    await page.route("**/api/admin/property-entities**", async (route: Route) => {
      const url = route.request().url()
      const method = route.request().method()
      if (method === "GET" && url.includes("entityId=201") && !url.includes("/property-entities/5")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ...TWO_CONNECTIONS_FOR_ENTITY_201, items: [TWO_CONNECTIONS_FOR_ENTITY_201.items[0]], totalCount: 1 }),
        })
        return
      }
      if (url.includes("/property-entities/501/buyer-offers")) {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(BUYER_OFFERS_FOR_PE_501) })
        return
      }
      if (url.includes("/property-entities/501/offer-form-status")) {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ formUrl: null, entityEmail: null, submission: null }) })
        return
      }
      if (url.match(/\/property-entities\/501(\?|$)/)) {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(TWO_CONNECTIONS_FOR_ENTITY_201.items[0]) })
        return
      }
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_PROPERTY_ENTITIES_RESPONSE) })
    })

    const dlg = await openEntityDialogFromProperty1001(page)
    const connections = dlg.getByTestId("panda-entities-property-connections")
    await expect(connections).toBeVisible({ timeout: 20_000 })
    const select = connections.getByTestId("panda-entities-property-connections--select")
    await expect(select).toContainText(/12 Test Street/i, { timeout: 15_000 })

    await shotFocused(page, connections, SHOT_DIR, "03-single-connection-shows-correctly")
    story.addScene({
      title: "03 — Single-connection buyer shows correctly",
      images: [join(SHOT_DIR, "03-single-connection-shows-correctly.png")],
      seeing: "With only one property connection, the dropdown correctly shows 12 Test Street.",
      steps: ["Open entity dialog for buyer with one connection", "Observe correct property shown"],
    })
  })
})
