// Run: npm run test:e2e:scratch -- --app=panda-realty --spec="apps/panda-realty/e2e/portal-property-summary.spec.ts" --no-bail

import { expect, test } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { createStory, shotFocused } from "@repo/e2e-utils"

import { requirePandaE2eAdminListLiveEnv, signInAsAdmin } from "./helpers/admin-auth"

const SHOT_DIR = join(dirname(fileURLToPath(import.meta.url)), "screenshots", "portal-property-summary")

const story = createStory({ specUrl: import.meta.url, slug: "portal-property-summary" })
story.setWhatWasBuilt(
  "Portal property summary section for Panda Realty: extends the portal token GET handler to return " +
  "contractDate and settlementDate. Adds a PortalPropertySummary card " +
  "component at /portal/[token] showing address, sale price, and date boxes. Strips site chrome for " +
  "all /portal/* routes (same treatment as /offer-form). Null dates render as 'Date to be confirmed'.",
)

// Fixture A — property with all fields populated
// House · 4 bed · 2 bath · 2 car · contractDate "7 May 2026" · settlementDate "8 July 2021"
const FIXTURE_A = { propertyEntityId: 185969, propertyListId: 202739 }

// Fixture NULL — property with null contractDate + null settlementDate
const FIXTURE_NULL = { propertyEntityId: 185822, propertyListId: 223321 }

// Fixture B — for revoked-token chrome check (reuse from portal-token-system)
const FIXTURE_B = { propertyEntityId: 185926, propertyListId: 223439 }

async function createOrGetToken(
  page: Parameters<typeof signInAsAdmin>[0],
  fixture: typeof FIXTURE_A,
): Promise<{ token: string; portalTokenId: number }> {
  await signInAsAdmin(page)
  const res = await page.context().request.post("/api/admin/portal-tokens", { data: fixture })
  const body = await res.json()
  return { token: body.token, portalTokenId: body.portalTokenId }
}

test.beforeAll(() => {
  requirePandaE2eAdminListLiveEnv()
})

test.describe("Portal Property Summary", () => {
  test.beforeEach(async () => {
    await mkdir(SHOT_DIR, { recursive: true })
  })

  test.afterAll(async () => {
    story.write()
  })

  // ── Chrome stripping ─────────────────────────────────────────────────────

  test("portal page has no site nav chrome", async ({ page, request }) => {
    // Use request fixture (storageState auth) to create token without browser navigation
    const res = await request.post("/api/admin/portal-tokens", { data: FIXTURE_A })
    const { token } = await res.json()
    await page.goto(`/portal/${token}`)
    const navbar = page.getByTestId("site-navbar")
    await expect(navbar).not.toBeVisible({ timeout: 10_000 })

    const shell = page.getByTestId("portal-shell")
    await expect(shell).toBeVisible()
    await shotFocused(page, shell, SHOT_DIR, "00-no-chrome")
    story.addScene({
      title: "00 — Portal Page: No Site Chrome",
      images: [join(SHOT_DIR, "00-no-chrome.png")],
      seeing: "The portal page loads without the Panda Realty nav bar or sidebar — bare client-facing page.",
      steps: [
        "Navigate to /portal/<token>",
        "Confirm site-navbar element is not present",
      ],
    })
  })

  // ── Property summary card ────────────────────────────────────────────────

  test("portal-property-summary card is visible for valid token", async ({ page }) => {
    const { token } = await createOrGetToken(page, FIXTURE_A)
    await page.goto(`/portal/${token}`)
    const card = page.getByTestId("portal-property-summary")
    await expect(card).toBeVisible({ timeout: 15_000 })

    await shotFocused(page, card, SHOT_DIR, "01-summary-card")
    story.addScene({
      title: "01 — Property Summary: Card Visible",
      images: [join(SHOT_DIR, "01-summary-card.png")],
      seeing: "The PortalPropertySummary card renders for a valid token — address, sale price, and date boxes visible.",
      steps: [
        "Navigate to /portal/<valid-token>",
        "portal-property-summary card is visible",
      ],
    })
  })

  test("portal-property-summary shows street address and suburb/state/postcode", async ({ page }) => {
    const { token } = await createOrGetToken(page, FIXTURE_A)
    await page.goto(`/portal/${token}`)
    const card = page.getByTestId("portal-property-summary")
    await expect(card).toBeVisible({ timeout: 15_000 })
    const address = card.getByTestId("portal-property-address")
    await expect(address).toBeVisible()

    await shotFocused(page, address, SHOT_DIR, "02-address")
    story.addScene({
      title: "02 — Property Summary: Address Block",
      images: [join(SHOT_DIR, "02-address.png")],
      seeing: "The address block shows the street address on one line and suburb/state/postcode on the second.",
      steps: [
        "Navigate to /portal/<valid-token>",
        "Confirm portal-property-address renders both lines",
      ],
    })
  })

  test("portal-property-summary has no property attribute row", async ({ page }) => {
    const { token } = await createOrGetToken(page, FIXTURE_A)
    await page.goto(`/portal/${token}`)
    const card = page.getByTestId("portal-property-summary")
    await expect(card).toBeVisible({ timeout: 15_000 })
    await expect(card.getByTestId("portal-property-attributes")).not.toBeVisible()

    await shotFocused(page, card, SHOT_DIR, "03-no-attributes")
    story.addScene({
      title: "03 — Property Summary: No Attribute Row",
      images: [join(SHOT_DIR, "03-no-attributes.png")],
      seeing: "The property summary card has no bed/bath/car/type description line.",
      steps: [
        "Navigate to /portal/<valid-token>",
        "Confirm portal-property-attributes element is not visible",
      ],
    })
  })

  test("portal-property-summary shows contract date box with formatted date", async ({ page }) => {
    const { token } = await createOrGetToken(page, FIXTURE_A)
    await page.goto(`/portal/${token}`)
    const card = page.getByTestId("portal-property-summary")
    await expect(card).toBeVisible({ timeout: 15_000 })
    const contractBox = card.getByTestId("portal-contract-date")
    await expect(contractBox).toBeVisible()
    await expect(contractBox).toContainText("7 May 2026") // "May" is same for short/long

    await shotFocused(page, contractBox, SHOT_DIR, "04-contract-date")
    story.addScene({
      title: "04 — Property Summary: Contract Date Box",
      images: [join(SHOT_DIR, "04-contract-date.png")],
      seeing: "Contract date box shows '7 May 2026' (en-AU locale) below a 'Contract Date' label.",
      steps: [
        "Navigate to /portal/<valid-token>",
        "Contract date box shows formatted date",
      ],
    })
  })

  test("portal-property-summary shows settlement date box with formatted date", async ({ page }) => {
    const { token } = await createOrGetToken(page, FIXTURE_A)
    await page.goto(`/portal/${token}`)
    const card = page.getByTestId("portal-property-summary")
    await expect(card).toBeVisible({ timeout: 15_000 })
    const settlementBox = card.getByTestId("portal-settlement-date")
    await expect(settlementBox).toBeVisible()
    await expect(settlementBox).toContainText("8 July 2021") // month: "long" → full month name

    await shotFocused(page, settlementBox, SHOT_DIR, "05-settlement-date")
    story.addScene({
      title: "05 — Property Summary: Settlement Date Box",
      images: [join(SHOT_DIR, "05-settlement-date.png")],
      seeing: "Settlement date box shows '8 July 2021' (en-AU locale, month: long) below a 'Settlement Date' label.",
      steps: [
        "Navigate to /portal/<valid-token>",
        "Settlement date box shows formatted date",
      ],
    })
  })

  // ── API returns extended fields ──────────────────────────────────────────

  test("GET /api/portal/<token> — returns extended property fields", async ({ page }) => {
    const { token } = await createOrGetToken(page, FIXTURE_A)
    const res = await page.context().request.get(`/api/portal/${token}`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty("contractDate")
    expect(body).toHaveProperty("settlementDate")
  })

  // ── Null date edge cases ─────────────────────────────────────────────────

  test("null contractDate renders 'Date to be confirmed'", async ({ page }) => {
    const { token } = await createOrGetToken(page, FIXTURE_NULL)
    await page.goto(`/portal/${token}`)
    const card = page.getByTestId("portal-property-summary")
    await expect(card).toBeVisible({ timeout: 15_000 })
    const contractBox = card.getByTestId("portal-contract-date")
    await expect(contractBox).toBeVisible()
    await expect(contractBox).toContainText("Date to be confirmed")

    await shotFocused(page, contractBox, SHOT_DIR, "06-contract-date-null")
    story.addScene({
      title: "06 — Property Summary: Null Contract Date → 'Date to be confirmed'",
      images: [join(SHOT_DIR, "06-contract-date-null.png")],
      seeing: "When contractDate is null, the contract date box shows 'Date to be confirmed' instead of a date.",
      steps: [
        "Navigate to /portal/<token-for-property-with-null-dates>",
        "Contract date box shows 'Date to be confirmed'",
      ],
    })
  })

  test("null settlementDate renders 'Date to be confirmed'", async ({ page }) => {
    const { token } = await createOrGetToken(page, FIXTURE_NULL)
    await page.goto(`/portal/${token}`)
    const card = page.getByTestId("portal-property-summary")
    await expect(card).toBeVisible({ timeout: 15_000 })
    const settlementBox = card.getByTestId("portal-settlement-date")
    await expect(settlementBox).toBeVisible()
    await expect(settlementBox).toContainText("Date to be confirmed")

    await shotFocused(page, settlementBox, SHOT_DIR, "07-settlement-date-null")
    story.addScene({
      title: "07 — Property Summary: Null Settlement Date → 'Date to be confirmed'",
      images: [join(SHOT_DIR, "07-settlement-date-null.png")],
      seeing: "When settlementDate is null, the settlement date box shows 'Date to be confirmed'.",
      steps: [
        "Navigate to /portal/<token-for-property-with-null-dates>",
        "Settlement date box shows 'Date to be confirmed'",
      ],
    })
  })

  // ── Revoked token — still no chrome ─────────────────────────────────────

  test("revoked token page has no site chrome", async ({ page }) => {
    const { token, portalTokenId } = await createOrGetToken(page, FIXTURE_B)
    await page.context().request.patch(`/api/admin/portal-tokens/${portalTokenId}`)
    await page.goto(`/portal/${token}`)
    const revoked = page.getByTestId("portal-revoked")
    await expect(revoked).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId("site-navbar")).not.toBeVisible()
  })
})
