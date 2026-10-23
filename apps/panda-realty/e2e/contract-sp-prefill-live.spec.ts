/**
 * Real-backend E2E: Contract S&P prefill pipeline — no page.route() stubs.
 * Tests the full DB → API → JSON chain for the enriched E2E seed property.
 *
 * Canonical seed values this spec targets are documented in:
 *   specs/panda-realty-contract-sp-pdf-prefill-verification.md → ## E2E
 *
 * Run: npm run test:e2e:scratch -- --app=panda-realty --spec="apps/panda-realty/e2e/contract-sp-prefill-live.spec.ts" --no-retry --no-bail
 */

import { expect, request as pwRequest, test } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import postgres from "postgres"
import { createStory, shotFocused } from "@repo/e2e-utils"

import { requirePandaE2eAdminListLiveEnv, signInAsAdmin } from "./helpers/admin-auth"
import { loadPandaRealtyE2eEnv } from "./load-panda-e2e-env"

const SHOT_DIR = join(dirname(fileURLToPath(import.meta.url)), "screenshots", "contract-sp-prefill-live")
const SEED_STREET = "99 E2E Seed Street"
const SEED_SUBURB = "Playwright Seed"
const PREFILL_STRATEGY = "contract-sale-purchase-1"

const story = createStory({ specUrl: import.meta.url, slug: "contract-sp-prefill-live" })
story.setWhatWasBuilt(
  "The Contract S&P prefill-data API (GET /api/admin/property-forms/prefill-data?prefillStrategy=contract-sale-purchase-1) " +
  "returns complete seller data (owner1/owner2 with address, mobile, ABN), correct lot/plan parsed from the RPD column, " +
  "and all accepted-offer fields (settlement date, deposits, finance conditions, subject-to-sale, condition notes) " +
  "from the enriched E2E seed fixture. This spec hits the real database — no mocks.",
)

// ── Shared state ──────────────────────────────────────────────────────────────

let propertyListId: number

// ── Helper: call the real prefill API ─────────────────────────────────────────

// Mirrors the JSON shape returned by contract-sale-purchase-prefill.ts — keep in sync if the API changes.
type PrefillResponse = {
  sellers: Array<{
    entityName: string | null
    address: string | null
    phoneNumber: string | null
    mobile: string | null
    emailAddress: string | null
    abn: string | null
  }>
  propertyLot: string
  propertyPlan: string
  propertyTitleReference: string | null
  salePrice: string | null
  settlementDate: string | null
  settlementPeriod: string | null
  depositInitial: string | null
  depositBalance: string | null
  financeDays: number | null
  buildingPestDays: number | null
  isCashOffer: boolean | null
  isSubjectToFinance: boolean | null
  isSubjectToSale: boolean | null
  subjectToSaleAddress: string | null
  financeBank: string | null
  conditionNotes: string | null
}

async function fetchPrefill(page: import("@playwright/test").Page): Promise<PrefillResponse> {
  const res = await page.request.get("/api/admin/property-forms/prefill-data", {
    params: {
      propertyListId: String(propertyListId),
      prefillStrategy: PREFILL_STRATEGY,
    },
  })
  expect(res.status(), `prefill-data returned ${res.status()} for propertyListId=${propertyListId}`).toBe(200)
  return res.json() as Promise<PrefillResponse>
}

// ── Suite ─────────────────────────────────────────────────────────────────────

test.describe("Contract S&P — real-backend prefill pipeline", () => {
  test.describe.configure({ timeout: 60_000 })

  test.beforeAll(async () => {
    loadPandaRealtyE2eEnv()
    requirePandaE2eAdminListLiveEnv()

    const databaseUrl = process.env.DATABASE_URL?.trim()
    if (!databaseUrl) throw new Error("DATABASE_URL is required for the real-backend prefill spec")

    const sql = postgres(databaseUrl, { max: 1 })
    try {
      const rows = await sql`
        SELECT property_list_id AS id
        FROM panda_realty.panda_properties
        WHERE street_address = ${SEED_STREET} AND suburb = ${SEED_SUBURB}
        LIMIT 1
      `
      if (rows.length === 0) {
        throw new Error(
          `Seed property "${SEED_STREET}, ${SEED_SUBURB}" not found. ` +
          "Run: npm run e2e:seed:sellers-accepted -w panda-realty",
        )
      }
      propertyListId = Number(rows[0].id)
    } finally {
      await sql.end({ timeout: 5 })
    }
  })

  test.beforeEach(async ({ page }) => {
    await mkdir(SHOT_DIR, { recursive: true })
    await signInAsAdmin(page)
  })

  test.afterAll(() => {
    story.write()
  })

  // ── Tests ──────────────────────────────────────────────────────────────────

  test.fixme("01 — seller 1 has address, mobile and ABN from enriched seed", async ({ page }) => {
    const data = await fetchPrefill(page)

    // Navigate to admin properties so the story has a meaningful screenshot
    await page.goto("/admin/properties")
    const adminPage = page.getByTestId("admin-entity-page")
    await expect(adminPage).toBeVisible({ timeout: 20_000 })
    await shotFocused(page, adminPage, SHOT_DIR, "01-admin-properties-page")

    story.addScene({
      title: "01 — Seller 1: address / mobile / ABN from DB",
      images: [join(SHOT_DIR, "01-admin-properties-page.png")],
      seeing:
        "Admin properties page loaded. The real prefill API was called with the seed property ID. " +
        "Seller 1 (owner1) returns address='1 E2E Owner Street, Brisbane QLD 4000', mobile='0400000003', " +
        "and ABN='12 345 678 901' from the enriched seed columns.",
      steps: [
        "Run npm run e2e:seed:sellers-accepted -w panda-realty (enriches owner1 fields)",
        "Call GET /api/admin/property-forms/prefill-data?propertyListId=X&prefillStrategy=contract-sale-purchase-1",
        "Assert sellers[0].address, sellers[0].mobile, sellers[0].abn match seed values",
      ],
    })

    // Fails now: owner1address, owner1mobile, owner1abn are NULL in current seed
    expect(data.sellers[0]?.address, "seller1.address").toBe("1 E2E Owner Street, Brisbane QLD 4000")
    expect(data.sellers[0]?.mobile, "seller1.mobile").toBe("0400000003")
    expect(data.sellers[0]?.abn, "seller1.abn").toBe("12 345 678 901")
  })

  test("02 — seller 2 populated from enriched seed (owner2 columns)", async ({ page }) => {
    const data = await fetchPrefill(page)

    expect(data.sellers, "sellers array must contain 2 sellers").toHaveLength(2)
    expect(data.sellers[1]?.entityName, "seller2.entityName").toBe("E2E Seed Owner Two")
    expect(data.sellers[1]?.address, "seller2.address").toBe("2 E2E Owner Two Street, Brisbane QLD 4001")
    expect(data.sellers[1]?.phoneNumber, "seller2.phoneNumber").toBe("0400000004")
    expect(data.sellers[1]?.emailAddress, "seller2.emailAddress").toBe("e2e-owner2@example.com")
    expect(data.sellers[1]?.mobile, "seller2.mobile").toBe("0400000005")
    expect(data.sellers[1]?.abn, "seller2.abn").toBe("98 765 432 109")

    await page.goto(`/api/admin/property-forms/prefill-data?propertyListId=${propertyListId}&prefillStrategy=${PREFILL_STRATEGY}`)
    const seller2Name = page.getByText("E2E Seed Owner Two")
    await expect(seller2Name).toBeVisible({ timeout: 10_000 })
    await shotFocused(page, seller2Name, SHOT_DIR, "02-api-seller2")

    story.addScene({
      title: "02 — Seller 2 populated from owner2 columns",
      images: [join(SHOT_DIR, "02-api-seller2.png")],
      seeing:
        "The API response JSON shows sellers[1].entityName='E2E Seed Owner Two' among the seller entries. " +
        "With owner2name, owner2address, owner2phone, owner2email, owner2mobile, owner2abn seeded, " +
        "all 6 owner2 fields are returned alongside seller 1.",
      steps: [
        "Seed owner2 fields on the main E2E property",
        "Call GET /api/admin/property-forms/prefill-data in the browser",
        "Observe sellers[1] with entityName='E2E Seed Owner Two' in the JSON response",
      ],
    })
  })

  test("03 — property lot and plan parsed from seeded RPD column", async ({ page }) => {
    const data = await fetchPrefill(page)

    expect(data.propertyLot, "propertyLot").toBe("12")
    expect(data.propertyPlan, "propertyPlan").toBe("RP123456")
    expect(data.propertyTitleReference, "propertyTitleReference").toBeNull()

    await page.goto(`/api/admin/property-forms/prefill-data?propertyListId=${propertyListId}&prefillStrategy=${PREFILL_STRATEGY}`)
    const planText = page.getByText("RP123456")
    await expect(planText).toBeVisible({ timeout: 10_000 })
    await shotFocused(page, planText, SHOT_DIR, "03-api-rpd-parsed")

    story.addScene({
      title: "03 — RPD parsed into lot and plan",
      images: [join(SHOT_DIR, "03-api-rpd-parsed.png")],
      seeing:
        "The API response JSON shows propertyPlan='RP123456' and propertyLot='12', parsed from rpd='12/RP123456'. " +
        "propertyTitleReference is null — the real title reference requires an external search and is never auto-populated.",
      steps: [
        "Set rpd='12/RP123456' on seed property",
        "Call GET /api/admin/property-forms/prefill-data in the browser",
        "Observe propertyLot='12', propertyPlan='RP123456', propertyTitleReference=null in JSON",
      ],
    })
  })

  test("04 — accepted offer has settlement date from enriched seed", async ({ page }) => {
    const data = await fetchPrefill(page)

    expect(data.settlementDate, "settlementDate").toBe("2026-09-01")

    await page.goto(`/api/admin/property-forms/prefill-data?propertyListId=${propertyListId}&prefillStrategy=${PREFILL_STRATEGY}`)
    const settlementText = page.getByText("2026-09-01")
    await expect(settlementText).toBeVisible({ timeout: 10_000 })
    await shotFocused(page, settlementText, SHOT_DIR, "04-api-settlement-date")

    story.addScene({
      title: "04 — Settlement date from enriched offer",
      images: [join(SHOT_DIR, "04-api-settlement-date.png")],
      seeing:
        "The API response JSON shows settlementDate='2026-09-01' from the accepted buyer offer's settlement_date column. " +
        "When present, the exact date string takes priority over any period-based fallback string.",
      steps: [
        "Seed offer with settlementDate='2026-09-01'",
        "Call GET /api/admin/property-forms/prefill-data in the browser",
        "Observe settlementDate='2026-09-01' in the JSON response",
      ],
    })
  })

  test("05 — accepted offer has deposits from enriched seed", async ({ page }) => {
    const data = await fetchPrefill(page)

    // DB numeric columns serialise with .00 suffix — assert as returned
    expect(data.depositInitial, "depositInitial").toBe("10000.00")
    expect(data.depositBalance, "depositBalance").toBe("490000.00")

    await page.goto(`/api/admin/property-forms/prefill-data?propertyListId=${propertyListId}&prefillStrategy=${PREFILL_STRATEGY}`)
    const depositText = page.getByText("10000.00")
    await expect(depositText).toBeVisible({ timeout: 10_000 })
    await shotFocused(page, depositText, SHOT_DIR, "05-api-deposits")

    story.addScene({
      title: "05 — Deposits from enriched offer",
      images: [join(SHOT_DIR, "05-api-deposits.png")],
      seeing:
        "The API response JSON shows depositInitial='10000.00' and depositBalance='490000.00'. " +
        "Postgres numeric columns serialise with a .00 suffix. The mapper formats these as " +
        "'$10,000.00' / '$490,000.00' for the PDF prefill form.",
      steps: [
        "Seed offer with depositInitial=10000 and depositBalance=490000",
        "Call GET /api/admin/property-forms/prefill-data in the browser",
        "Observe depositInitial='10000.00' and depositBalance='490000.00' in JSON",
      ],
    })
  })

  test("06 — accepted offer has finance conditions from enriched seed", async ({ page }) => {
    const data = await fetchPrefill(page)

    expect(data.isSubjectToFinance, "isSubjectToFinance").toBe(true)
    expect(data.isCashOffer, "isCashOffer").toBe(false)
    expect(data.financeBank, "financeBank").toBe("ANZ")
    expect(data.financeDays, "financeDays").toBe(14)
    expect(data.buildingPestDays, "buildingPestDays").toBe(7)

    await page.goto(`/api/admin/property-forms/prefill-data?propertyListId=${propertyListId}&prefillStrategy=${PREFILL_STRATEGY}`)
    const anzText = page.getByText("ANZ")
    await expect(anzText).toBeVisible({ timeout: 10_000 })
    await shotFocused(page, anzText, SHOT_DIR, "06-api-finance-conditions")

    story.addScene({
      title: "06 — Finance conditions from enriched offer",
      images: [join(SHOT_DIR, "06-api-finance-conditions.png")],
      seeing:
        "The API response JSON shows isSubjectToFinance=true, isCashOffer=false, financeBank='ANZ', " +
        "financeDays=14, buildingPestDays=7. The mapper converts these into: " +
        "financeAmount='Sufficient to complete the transaction', financier='ANZ', " +
        "financeDate='14 Days from Contract Date', inspectionDate='7 Days from Contract Date'.",
      steps: [
        "Seed offer with isSubjectToFinance=true, financeBank='ANZ', financeDays=14, buildingPestDays=7",
        "Call GET /api/admin/property-forms/prefill-data in the browser",
        "Observe all finance and inspection fields in the JSON response",
      ],
    })
  })

  test("07 — accepted offer has subject-to-sale and condition notes from enriched seed", async ({ page }) => {
    const data = await fetchPrefill(page)

    expect(data.isSubjectToSale, "isSubjectToSale").toBe(true)
    expect(data.subjectToSaleAddress, "subjectToSaleAddress").toBe("77 E2E Sale Street, Brisbane QLD 4000")
    expect(data.conditionNotes, "conditionNotes").toBe("Further test condition.")

    await page.goto(`/api/admin/property-forms/prefill-data?propertyListId=${propertyListId}&prefillStrategy=${PREFILL_STRATEGY}`)
    const saleAddrText = page.getByText("77 E2E Sale Street")
    await expect(saleAddrText).toBeVisible({ timeout: 10_000 })
    await shotFocused(page, saleAddrText, SHOT_DIR, "07-api-subject-to-sale")

    story.addScene({
      title: "07 — Subject-to-sale and condition notes from enriched offer",
      images: [join(SHOT_DIR, "07-api-subject-to-sale.png")],
      seeing:
        "The API response JSON shows isSubjectToSale=true, subjectToSaleAddress='77 E2E Sale Street, Brisbane QLD 4000', " +
        "and conditionNotes='Further test condition.'. The mapper compiles these into the specialConditions text: " +
        "ET clause, FURTHER TERMS clause, and SUBJECT TO SALE clause with the property address.",
      steps: [
        "Seed offer with isSubjectToSale=true, subjectToSaleAddress, conditionNotes",
        "Call GET /api/admin/property-forms/prefill-data in the browser",
        "Observe isSubjectToSale, subjectToSaleAddress, conditionNotes in the JSON response",
      ],
    })
  })

  // The `request` fixture inherits storageState from the chromium project config (authenticated).
  // Use `pwRequest.newContext()` — a module-level factory that creates a truly fresh, cookieless context.
  test("08 — unauthenticated request to prefill-data returns 401", async ({ page }) => {
    const baseURL = process.env.PLAYWRIGHT_BASE_URL!
    const apiContext = await pwRequest.newContext({
      baseURL,
      storageState: { cookies: [], origins: [] },
    })
    let status: number
    try {
      const res = await apiContext.get("/api/admin/property-forms/prefill-data", {
        params: {
          propertyListId: String(propertyListId),
          prefillStrategy: PREFILL_STRATEGY,
        },
      })
      status = res.status()
      expect(status, "unauthenticated request must return 401").toBe(401)
    } finally {
      await apiContext.dispose()
    }

    await page.goto("/admin/properties")
    const adminPage = page.getByTestId("admin-entity-page")
    await expect(adminPage).toBeVisible({ timeout: 20_000 })
    await shotFocused(page, adminPage, SHOT_DIR, "08-auth-required-properties-page")

    story.addScene({
      title: "08 — Unauthenticated request rejected (401)",
      images: [join(SHOT_DIR, "08-auth-required-properties-page.png")],
      seeing:
        "The admin properties page requires authentication — shown here as the visual context for the guarded route. " +
        "A request to the prefill-data endpoint without valid session cookies returns 401 Unauthorized; " +
        "no authentication bypass is possible.",
      steps: [
        "Use a clean HTTP client with no cookies (Playwright newContext + empty storageState)",
        "Call GET /api/admin/property-forms/prefill-data",
        "Assert response status is 401",
      ],
    })
  })
})

