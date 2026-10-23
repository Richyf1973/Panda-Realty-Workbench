/**
 * Automation to answer persistence questions for Edit Buyer → Offers:
 *
 * Q1 — After typing an offer amount, does the draft cell show that value (not stuck at 0.00)?
 * Q2 — Does PATCH /api/admin/property-entities/:id include buyerOffers when saving from
 *      Edit Buyer? (Logs entities vs property-entities PATCH bodies.)
 *      For the **property → Buyers → nested buyer workspace** path, reuse the existing regression
 *      `e2e/admin-properties.spec.ts` — test title **"buyer-offers is not re-fetched when buyer workspace opens; refetches after nested save"**
 *      (mocked routes + nested `PATCH` there).
 * Q3 — On cancel vs **Save & Close** on Edit Buyer, does a property-entities PATCH with buyerOffers fire?
 *      (Use **Save & Close**, not **Save changes** — the latter keeps the dialog open by design.)
 *
 * Run (from repo root):
 *   npm run e2e:investigate:buyer-offers -w panda-realty
 * Property workspace nested-save PATCH (Q2 complement):
 *   npm run e2e:investigate:buyer-offers-property-workspace -w panda-realty
 *
 * Requires E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD (see apps/panda-realty/.env.example).
 * Uses mocked GETs + captured PATCH bodies (no live DB required for conclusions).
 */

import { expect, test, type Locator, type Page } from "@playwright/test"

import { requirePandaE2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import {
  entitiesSaveAndCloseButton,
  installEditBuyerInvestigationRoutes,
  type EditBuyerRouteCaptures,
} from "./helpers/buyer-offers-edit-mocks"

/** Appended to **Address** — `notes` is not in `entitiesEntity.formColumnOrder`, so it may be omitted from PATCH; address is sent. */
const ADDRESS_TOUCH_PREFIX = "e2e-touch"

async function openEditBuyerOffersTab(page: Page): Promise<{
  dialog: ReturnType<Page["getByTestId"]>
  connections: ReturnType<Page["getByTestId"]>
}> {
  await page.goto(
    "/admin/entities?limit=25&page=1&sortKey=entityName&sortDir=asc&entityCategoryId=1&listLayout=grid",
  )
  await page.waitForLoadState("networkidle")
  await page.getByTestId(/^admin-entity-row-edit--entities--/).first().click()
  const dialog = page.getByTestId("admin-entity-crud-dialog--entities")
  await expect(dialog).toBeVisible()
  const dialogForm = dialog.getByTestId("panda-entities-dialog-form")
  await dialogForm.evaluate((el) => el.scrollTo(0, el.scrollHeight))
  const connections = dialog.getByTestId("panda-entities-property-connections")
  await expect(connections).toBeVisible({ timeout: 30_000 })
  const offersTab = connections
    .getByTestId("admin-entity-crud-related-tabs--property-entities")
    .getByRole("tab", { name: /^offers$/i })
  await expect(offersTab).toBeVisible({ timeout: 30_000 })
  await offersTab.click()
  return { dialog, connections }
}

function logInvestigation(title: string, payload: unknown): void {
  console.log(`[buyer-offers-investigation] ${title}: ${JSON.stringify(payload, null, 2)}`)
}

/** Draft rows use `data-testid="...--buyerOffers--draft--<uuid>"` on the `<tr>`; currency cells use `--offer--<clientKey>` (UUID), not `--offer--draft--`. */
function draftOfferCurrencyInput(connections: Locator) {
  return connections
    .locator(
      '[data-testid^="admin-entity-crud-related-row--property-entities--buyerOffers--draft--"]',
    )
    .locator('[data-testid^="admin-entity-crud-related-currency--property-entities--buyerOffers--offer--"]')
}

/**
 * If only nested (isolated-registry) fields change, the entities PATCH payload can be empty and the
 * dialog may not close — touch a field that is included in the entities PATCH (see `formColumnOrder`
 * in `lib/admin/entities/entities.ts`; **notes** is not listed there, so we touch **address**).
 */
async function touchEntitiesMainFieldSoPatchNonEmpty(dialog: Locator): Promise<void> {
  const form = dialog.getByTestId("panda-entities-dialog-form")
  await form.evaluate((el) => el.scrollTo(0, 0))
  const address = dialog.getByTestId("panda-entities-form-field--address")
  await expect(address).toBeVisible({ timeout: 15_000 })
  const cur = await address.inputValue()
  await address.fill(`${cur} · ${ADDRESS_TOUCH_PREFIX} ${Date.now()}`)
}

function assertEntitiesPatchIncludesAddressTouch(captures: EditBuyerRouteCaptures): void {
  const touched = captures.entitiesPatches.some(
    (b) => typeof b.address === "string" && b.address.includes(ADDRESS_TOUCH_PREFIX),
  )
  expect(
    touched,
    "entities PATCH should include address after touchEntitiesMainFieldSoPatchNonEmpty",
  ).toBe(true)
}

function assertPropertyEntitiesPatchIncludesBuyerOffers(captures: EditBuyerRouteCaptures): void {
  const ok = captures.propertyEntityPatches.some(
    (b) => Object.hasOwn(b, "buyerOffers") && Array.isArray(b.buyerOffers),
  )
  expect(
    ok,
    "PATCH /api/admin/property-entities should include a buyerOffers array (isolated extras follow-up)",
  ).toBe(true)
}

// ---------------------------------------------------------------------------
// Q1 — Draft offer input reflects typed amount before save
// ---------------------------------------------------------------------------

test.describe("Buyer offers persistence — investigation (automated)", () => {
  test.describe.configure({ timeout: 120_000 })

  test.beforeEach(async ({ page }) => {
    requirePandaE2eAdminCredentials()
    await signInAsAdmin(page)
  })

  test("Q1 — draft offer currency input shows typed amount after fill+blur (before Save)", async ({
    page,
  }) => {
    const captures: EditBuyerRouteCaptures = {
      entitiesPatches: [],
      propertyEntityPatches: [],
    }
    await installEditBuyerInvestigationRoutes(page, captures)

    const { connections } = await openEditBuyerOffersTab(page)

    const draftOfferInput = draftOfferCurrencyInput(connections).first()

    await expect(draftOfferInput).toBeVisible({ timeout: 20_000 })
    await draftOfferInput.click()
    await draftOfferInput.fill("")
    await draftOfferInput.fill("850000")
    await draftOfferInput.blur()

    const raw = await draftOfferInput.inputValue()
    logInvestigation("Q1 raw input value after fill+blur (before any Save)", raw)

    const normalized = raw.replace(/[,\s]/g, "")
    expect(
      normalized.includes("850000"),
      `Expected input to contain 850000; got "${raw}" (normalized: "${normalized}")`,
    ).toBe(true)
  })

  // ---------------------------------------------------------------------------
  // Q2 — Compare property-entities PATCH payloads (Edit Buyer vs property workspace)
  // ---------------------------------------------------------------------------

  test("Q2 — Edit Buyer Save: record entities PATCH vs property-entities PATCH (buyerOffers)", async ({
    page,
  }) => {
    const captures: EditBuyerRouteCaptures = {
      entitiesPatches: [],
      propertyEntityPatches: [],
    }
    await installEditBuyerInvestigationRoutes(page, captures)

    const { dialog, connections } = await openEditBuyerOffersTab(page)

    const draftOfferInput = draftOfferCurrencyInput(connections).first()
    await expect(draftOfferInput).toBeVisible({ timeout: 20_000 })
    await draftOfferInput.fill("777000")
    await draftOfferInput.blur()

    await touchEntitiesMainFieldSoPatchNonEmpty(dialog)

    // "Save changes" keeps the dialog open (afterSuccess keepOpen); use "Save & Close" to finish.
    await entitiesSaveAndCloseButton(dialog).click()
    await expect(dialog).toBeHidden({ timeout: 20_000 })

    logInvestigation("Q2a Edit Buyer — PATCH /api/admin/entities bodies", captures.entitiesPatches)
    logInvestigation(
      "Q2a Edit Buyer — PATCH /api/admin/property-entities bodies",
      captures.propertyEntityPatches,
    )

    const entitiesHasOffers = captures.entitiesPatches.some((b) => Object.hasOwn(b, "buyerOffers"))
    const peHasOffers = captures.propertyEntityPatches.some((b) => Object.hasOwn(b, "buyerOffers"))
    logInvestigation("Q2a summary — entities PATCH includes buyerOffers key?", entitiesHasOffers)
    logInvestigation("Q2a summary — property-entities PATCH includes buyerOffers key?", peHasOffers)

    assertEntitiesPatchIncludesAddressTouch(captures)
    assertPropertyEntitiesPatchIncludesBuyerOffers(captures)
    expect(entitiesHasOffers, "buyerOffers should not be duplicated on entities PATCH").toBe(false)
  })

  // ---------------------------------------------------------------------------
  // Q3 — Cancel vs Save on Edit Buyer
  // ---------------------------------------------------------------------------

  test("Q3 — Cancel after typing offer: no property-entities PATCH with buyerOffers", async ({
    page,
  }) => {
    const captures: EditBuyerRouteCaptures = {
      entitiesPatches: [],
      propertyEntityPatches: [],
    }
    await installEditBuyerInvestigationRoutes(page, captures)

    const { dialog, connections } = await openEditBuyerOffersTab(page)

    const draftOfferInput = draftOfferCurrencyInput(connections).first()
    await expect(draftOfferInput).toBeVisible({ timeout: 20_000 })
    await draftOfferInput.fill("333000")
    await draftOfferInput.blur()

    await dialog.getByTestId("admin-entity-crud-dialog-cancel--entities").click()
    await expect(dialog).toBeHidden({ timeout: 15_000 })

    logInvestigation("Q3 Cancel — property-entities PATCH bodies", captures.propertyEntityPatches)
    const peWithOffers = captures.propertyEntityPatches.filter((b) => Object.hasOwn(b, "buyerOffers"))
    expect(peWithOffers.length, "Cancel should not persist offers via property-entities PATCH").toBe(0)
  })

  test("Q3 — Save after typing offer: whether property-entities PATCH includes buyerOffers (recorded)", async ({
    page,
  }) => {
    const captures: EditBuyerRouteCaptures = {
      entitiesPatches: [],
      propertyEntityPatches: [],
    }
    await installEditBuyerInvestigationRoutes(page, captures)

    const { dialog, connections } = await openEditBuyerOffersTab(page)

    const draftOfferInput = draftOfferCurrencyInput(connections).first()
    await expect(draftOfferInput).toBeVisible({ timeout: 20_000 })
    await draftOfferInput.fill("444000")
    await draftOfferInput.blur()

    await touchEntitiesMainFieldSoPatchNonEmpty(dialog)

    await entitiesSaveAndCloseButton(dialog).click()
    await expect(dialog).toBeHidden({ timeout: 20_000 })

    logInvestigation("Q3 Save — entities PATCH bodies", captures.entitiesPatches)
    logInvestigation("Q3 Save — property-entities PATCH bodies", captures.propertyEntityPatches)

    const peWithOffers = captures.propertyEntityPatches.filter((b) => Object.hasOwn(b, "buyerOffers"))
    logInvestigation(
      "Q3 Save summary — count of property-entities PATCH bodies that include buyerOffers",
      peWithOffers.length,
    )

    assertEntitiesPatchIncludesAddressTouch(captures)
    assertPropertyEntitiesPatchIncludesBuyerOffers(captures)
    expect(peWithOffers.length).toBeGreaterThanOrEqual(1)
  })
})
