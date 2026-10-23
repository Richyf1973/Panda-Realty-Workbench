import { expect, test, type Locator } from "@playwright/test"

import {
  e2eAdminCredentials,
  e2ePandaAdminListApiConfigured,
  signInAsAdmin,
} from "./helpers/admin-auth"
import { deletePandaBuyerOffersForEntityId } from "./helpers/delete-panda-buyer-offers-for-entity"

/**
 * Live test — **no** `page.route` stubs (same pattern as `admin-properties-entities.spec.ts`).
 *
 * **Latest Buyer Offers** loads `GET /api/admin/properties/[id]/buyer-offers` when the property
 * dialog opens and again **after nested property-entities save** (`notifyAdminPropertyBuyerOffersRefetch`
 * in `@repo/admin`), not on every keystroke in the offer column.
 *
 * Targets fixed dev DB rows. Override IDs via env (optional); defaults match the canonical dev DB.
 *
 * **Env (`apps/panda-realty/.env.local`):** `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD`, `DATABASE_URL`,
 * and optionally:
 * - `E2E_PANDA_LATEST_OFFERS_PROPERTY_ID` — property list row id
 * - `E2E_PANDA_LATEST_OFFERS_BUYER_JUNCTION_ID` — saved propertyBuyers junction row id
 * - `E2E_PANDA_LATEST_OFFERS_CLEANUP_ENTITY_ID` — CRM entity id for buyer-offer cleanup
 *
 * **Nested “Edit Buyer” (entities dialog)** — pencil opens `entities`, not `property-entities`:
 * - `E2E_PANDA_NESTED_EDIT_PROPERTY_ID` — property list row id
 * - `E2E_PANDA_NESTED_EDIT_BUYER_ROW_KEY` — `admin-entity-crud-related-open-related-target--…--row--saved-*` suffix
 * - `E2E_PANDA_NESTED_EDIT_CLEANUP_ENTITY_ID` — CRM entity id for buyer-offer cleanup
 *
 * Property must be a **favorite** (Sales / Buyers tabs). Run:
 *   npx playwright test e2e/admin-properties-latest-buyer-offers.live.spec.ts
 */

function e2eEnvOrDefault(name: string, fallback: string): string {
  const v = process.env[name]?.trim()
  return v && v.length > 0 ? v : fallback
}

function e2eEnvIntOrDefault(name: string, fallback: number): number {
  const v = process.env[name]?.trim()
  if (!v || v.length === 0) return fallback
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

/** `admin-entity-row-edit--properties--<id>` */
const LIVE_PROPERTY_LIST_ID = e2eEnvOrDefault(
  "E2E_PANDA_LATEST_OFFERS_PROPERTY_ID",
  "176829",
)

/** `admin-entity-crud-related-nested-open--properties--propertyBuyers--<id>` (saved junction row) */
const LIVE_PROPERTY_BUYER_JUNCTION_ID = e2eEnvOrDefault(
  "E2E_PANDA_LATEST_OFFERS_BUYER_JUNCTION_ID",
  "185538",
)

/** CRM `entities.entity_id` — buyer offers under property_entity rows for this entity are deleted first */
const LIVE_BUYER_OFFER_CLEANUP_ENTITY_ID = e2eEnvIntOrDefault(
  "E2E_PANDA_LATEST_OFFERS_CLEANUP_ENTITY_ID",
  169543,
)

const LIVE_BUYER_OFFER_AMOUNT = "15000"

/** Matches `formatOfferAmount` in `panda-properties-buyer-offers-section.tsx` (Latest Buyer Offers column). */
const LIVE_BUYER_OFFER_FORMATTED = parseFloat(LIVE_BUYER_OFFER_AMOUNT).toLocaleString("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** Property list row id — nested Edit Buyer flow (defaults align with scratch repro). */
const NESTED_EDIT_PROPERTY_LIST_ID = e2eEnvOrDefault(
  "E2E_PANDA_NESTED_EDIT_PROPERTY_ID",
  "176692",
)

/** Buyers table pencil row key (`…--row--saved-<clientKey>`). */
const NESTED_EDIT_BUYER_ROW_KEY = e2eEnvOrDefault(
  "E2E_PANDA_NESTED_EDIT_BUYER_ROW_KEY",
  "saved-185803",
)

const NESTED_EDIT_CLEANUP_ENTITY_ID = e2eEnvIntOrDefault(
  "E2E_PANDA_NESTED_EDIT_CLEANUP_ENTITY_ID",
  169546,
)

const NESTED_EDIT_OFFER_AMOUNT = "25000"

const NESTED_EDIT_OFFER_FORMATTED = parseFloat(NESTED_EDIT_OFFER_AMOUNT).toLocaleString("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

async function ensureFavoritePropertyTabs(propsDialog: Locator): Promise<void> {
  const bottomTabs = propsDialog.getByTestId("panda-properties-form-bottom-tabs")
  if (await bottomTabs.isVisible()) return
  await propsDialog.getByTestId("panda-properties-form-switch--isFavorite").click()
  await expect(bottomTabs).toBeVisible({ timeout: 15_000 })
}

test("saving buyer workspace offer shows Latest Buyer Offers row (live API)", async ({
  page,
}) => {
  test.setTimeout(120_000)
  test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")
  test.skip(
    !e2ePandaAdminListApiConfigured,
    "DATABASE_URL not set — admin list uses live APIs (see apps/panda-realty/.env.example)",
  )

  await deletePandaBuyerOffersForEntityId(LIVE_BUYER_OFFER_CLEANUP_ENTITY_ID)
  await signInAsAdmin(page)

  await page.goto("/admin/properties")
  await page.waitForLoadState("networkidle")
  await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible({
    timeout: 30_000,
  })

  await page
    .getByTestId(`admin-entity-row-edit--properties--${LIVE_PROPERTY_LIST_ID}`)
    .click()

  const propsDialog = page.getByTestId("admin-entity-crud-dialog--properties")
  await expect(propsDialog).toBeVisible({ timeout: 30_000 })

  await page.getByTestId("panda-properties-form-tab-trigger--buyers").click()
  await page
    .getByTestId(
      `admin-entity-crud-related-nested-open--properties--propertyBuyers--${LIVE_PROPERTY_BUYER_JUNCTION_ID}`,
    )
    .click()

  const buyerWorkspace = page.getByTestId("admin-entity-crud-dialog--property-entities")
  await expect(buyerWorkspace).toBeVisible({ timeout: 30_000 })

  const offersPanel = buyerWorkspace.getByTestId(
    "admin-entity-crud-related-split-right--property-entities",
  )
  await expect(offersPanel).toBeVisible({ timeout: 15_000 })

  const addRow = offersPanel.getByTestId(
    "admin-entity-crud-related-editor--property-entities--buyerOffers--add-row",
  )
  if (await addRow.isVisible()) {
    await addRow.click()
  }

  const offerInputs = offersPanel.getByLabel("Offer")
  await expect(offerInputs.first()).toBeVisible({ timeout: 10_000 })
  await offerInputs.last().fill(LIVE_BUYER_OFFER_AMOUNT)
  await offerInputs.last().blur()

  const buyerOffersPath = `/api/admin/properties/${encodeURIComponent(LIVE_PROPERTY_LIST_ID)}/buyer-offers`

  // Tie the refetch wait to the save click so we don’t resolve on an older in-flight GET from
  // dialog open (Latest Buyer Offers does not refetch on offer-cell keystrokes).
  await Promise.all([
    page.waitForResponse(
      (res) => {
        const u = res.url()
        return (
          u.includes(buyerOffersPath) &&
          res.request().method() === "GET" &&
          res.status() === 200
        )
      },
      { timeout: 90_000 },
    ),
    buyerWorkspace.getByTestId("admin-entity-edit-submit--property-entities").click(),
  ])

  await expect(buyerWorkspace).toBeHidden({ timeout: 90_000 })

  await propsDialog.getByTestId("panda-properties-form-tab-trigger--sales").click()

  const latestOffersSection = propsDialog.getByTestId(
    "panda-properties-form-section--buyer-offers",
  )
  await expect(
    latestOffersSection.locator('[data-testid^="panda-properties-buyer-offer-row--"]').first(),
  ).toBeVisible({ timeout: 15_000 })
  await expect(latestOffersSection).toContainText(LIVE_BUYER_OFFER_FORMATTED)
})

test("nested Edit Buyer (entities) offer shows Latest Buyer Offers row (live API)", async ({
  page,
}) => {
  test.setTimeout(120_000)
  test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")
  test.skip(
    !e2ePandaAdminListApiConfigured,
    "DATABASE_URL not set — admin list uses live APIs (see apps/panda-realty/.env.example)",
  )

  await deletePandaBuyerOffersForEntityId(NESTED_EDIT_CLEANUP_ENTITY_ID)
  await signInAsAdmin(page)

  await page.goto("/admin/properties")
  await page.waitForLoadState("networkidle")
  await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible({
    timeout: 30_000,
  })

  await page
    .getByTestId(`admin-entity-row-edit--properties--${NESTED_EDIT_PROPERTY_LIST_ID}`)
    .click()

  const propsDialog = page.getByTestId("admin-entity-crud-dialog--properties")
  await expect(propsDialog).toBeVisible({ timeout: 30_000 })

  await ensureFavoritePropertyTabs(propsDialog)

  await propsDialog.getByTestId("panda-properties-form-tab-trigger--buyers").click()

  await propsDialog
    .getByTestId(
      `admin-entity-crud-related-open-related-target--properties--propertyBuyers--row--${NESTED_EDIT_BUYER_ROW_KEY}`,
    )
    .click()

  const editBuyer = page.getByTestId("admin-entity-crud-dialog--entities")
  await expect(editBuyer).toBeVisible({ timeout: 30_000 })

  await editBuyer.evaluate((el) => el.scrollTo(0, el.scrollHeight))

  const connections = editBuyer.getByTestId("panda-entities-property-connections")
  await expect(connections).toBeVisible({ timeout: 60_000 })
  await connections.getByRole("tab", { name: /^offers$/i }).click()

  const offerInputs = connections.getByLabel("Offer")
  await expect(offerInputs.first()).toBeVisible({ timeout: 15_000 })
  const field = offerInputs.last()
  await field.click()
  await field.fill("")
  await field.fill(NESTED_EDIT_OFFER_AMOUNT)
  await field.blur()

  const buyerOffersPath = `/api/admin/properties/${encodeURIComponent(NESTED_EDIT_PROPERTY_LIST_ID)}/buyer-offers`

  await Promise.all([
    page.waitForResponse(
      (res) => {
        const u = res.url()
        return (
          u.includes(buyerOffersPath) &&
          res.request().method() === "GET" &&
          res.status() === 200
        )
      },
      { timeout: 90_000 },
    ),
    editBuyer.getByTestId("admin-entity-edit-save-and-close--entities").click(),
  ])

  await expect(editBuyer).toBeHidden({ timeout: 90_000 })

  await propsDialog.getByTestId("panda-properties-form-tab-trigger--sales").click()

  const latestOffersSection = propsDialog.getByTestId(
    "panda-properties-form-section--buyer-offers",
  )
  await expect(
    latestOffersSection.locator('[data-testid^="panda-properties-buyer-offer-row--"]').first(),
  ).toBeVisible({ timeout: 15_000 })
  await expect(latestOffersSection).toContainText(NESTED_EDIT_OFFER_FORMATTED)
})
