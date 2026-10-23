// Run: npm run test:e2e:scratch -- --app=panda-realty --spec="apps/panda-realty/e2e/portal-condition-timeline.spec.ts" --no-bail

import { expect, test } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { createStory, shotFocused } from "@repo/e2e-utils"

import { requirePandaE2eAdminListLiveEnv, signInAsAdmin } from "./helpers/admin-auth"

const SHOT_DIR = join(dirname(fileURLToPath(import.meta.url)), "screenshots", "portal-condition-timeline")

const story = createStory({ specUrl: import.meta.url, slug: "portal-condition-timeline" })
story.setWhatWasBuilt(
  "Portal condition timeline section for Panda Realty: extends the portal page query to join " +
  "buyerOffers (accepted first, fallback to most recent) and computes condition deadline dates via " +
  "compute-condition-events.ts. Adds a PortalConditionTimeline card at /portal/[token] showing each " +
  "condition with ✅ (past) or ⏳ + days remaining (upcoming). Contract Date row is suppressed (already " +
  "shown in property summary). customConditions are computed and rendered. offer.settlementDate appended " +
  "as final row. Empty states for no-offer and null contractDate.",
)

// Fixture COND — accepted offer with conditions and contractDate
// contractDate: 2026-05-16, finance=14d, buildingPest=7d, subjectToSale=28d, offer.settlementDate=2026-09-01
// As of 2026-05-26: building/pest (May ~23) is past; finance (May ~30) is upcoming
const FIXTURE_COND = { propertyEntityId: 185997, propertyListId: 223319 }

// Fixture NO_OFFER — property with contractDate but no buyer offers recorded
const FIXTURE_NO_OFFER = { propertyEntityId: 185969, propertyListId: 202739 }

// Fixture NULL — property with null contractDate (offer exists but contractDate is null)
const FIXTURE_NULL = { propertyEntityId: 185822, propertyListId: 223321 }

async function createOrGetToken(
  page: Parameters<typeof signInAsAdmin>[0],
  fixture: typeof FIXTURE_COND,
): Promise<{ token: string; portalTokenId: number }> {
  await signInAsAdmin(page)
  const res = await page.context().request.post("/api/admin/portal-tokens", { data: fixture })
  const body = await res.json()
  return { token: body.token, portalTokenId: body.portalTokenId }
}

test.beforeAll(() => {
  requirePandaE2eAdminListLiveEnv()
})

test.describe("Portal Condition Timeline", () => {
  test.beforeEach(async () => {
    await mkdir(SHOT_DIR, { recursive: true })
  })

  test.afterAll(() => {
    story.write()
  })

  // ── Happy path: full conditions timeline ──────────────────────────────────

  test("portal-condition-timeline card is visible for token with conditions", async ({ page }) => {
    const { token } = await createOrGetToken(page, FIXTURE_COND)
    await page.goto(`/portal/${token}`)

    const timeline = page.getByTestId("portal-condition-timeline")
    await expect(timeline).toBeVisible({ timeout: 15_000 })

    await shotFocused(page, timeline, SHOT_DIR, "01-timeline-card")
    story.addScene({
      title: "01 — Condition Timeline: Card Visible",
      images: [join(SHOT_DIR, "01-timeline-card.png")],
      seeing: "The condition timeline card renders below the property summary with a 'CONDITIONS & KEY DATES' heading and chronological condition rows.",
      steps: [
        "Navigate to /portal/<token> (FIXTURE_COND — accepted offer with conditions)",
        "portal-condition-timeline card is visible",
      ],
    })
  })

  test("past condition shows ✅ and (past) label", async ({ page }) => {
    const { token } = await createOrGetToken(page, FIXTURE_COND)
    await page.goto(`/portal/${token}`)

    const timeline = page.getByTestId("portal-condition-timeline")
    await expect(timeline).toBeVisible({ timeout: 15_000 })

    // Building & Pest = contractDate + 7d = ~May 23 2026, which is past relative to today May 26
    const buildingRow = timeline.getByTestId("portal-condition-row-buildingPest")
    await expect(buildingRow).toBeVisible()
    await expect(buildingRow).toContainText("✅")
    await expect(buildingRow).toContainText("(past)")

    await shotFocused(page, buildingRow, SHOT_DIR, "02-past-condition")
    story.addScene({
      title: "02 — Condition Timeline: Past Condition (✅ + past)",
      images: [join(SHOT_DIR, "02-past-condition.png")],
      seeing: "Building & Pest row shows ✅ emoji and '(past)' label — deadline has already passed.",
      steps: [
        "Navigate to /portal/<token>",
        "Building & Pest row shows ✅ and '(past)'",
      ],
    })
  })

  test("upcoming condition shows ⏳ and days remaining", async ({ page }) => {
    const { token } = await createOrGetToken(page, FIXTURE_COND)
    await page.goto(`/portal/${token}`)

    const timeline = page.getByTestId("portal-condition-timeline")
    await expect(timeline).toBeVisible({ timeout: 15_000 })

    // Finance = contractDate + 14d = ~May 30 2026, which is upcoming relative to today May 26
    const financeRow = timeline.getByTestId("portal-condition-row-finance")
    await expect(financeRow).toBeVisible()
    await expect(financeRow).toContainText("⏳")
    await expect(financeRow).toContainText("days")

    await shotFocused(page, financeRow, SHOT_DIR, "03-upcoming-condition")
    story.addScene({
      title: "03 — Condition Timeline: Upcoming Condition (⏳ + days remaining)",
      images: [join(SHOT_DIR, "03-upcoming-condition.png")],
      seeing: "Finance row shows ⏳ emoji and 'X days' remaining — deadline is in the future.",
      steps: [
        "Navigate to /portal/<token>",
        "Finance row shows ⏳ and 'X days'",
      ],
    })
  })

  test("Contract Date row is NOT shown in the timeline", async ({ page }) => {
    const { token } = await createOrGetToken(page, FIXTURE_COND)
    await page.goto(`/portal/${token}`)

    const timeline = page.getByTestId("portal-condition-timeline")
    await expect(timeline).toBeVisible({ timeout: 15_000 })

    // Contract Date must not appear — it's already in the property summary above
    const contractRow = timeline.getByTestId("portal-condition-row-contract")
    await expect(contractRow).not.toBeVisible()

    await shotFocused(page, timeline, SHOT_DIR, "04-no-contract-row")
    story.addScene({
      title: "04 — Condition Timeline: Contract Date Row Suppressed",
      images: [join(SHOT_DIR, "04-no-contract-row.png")],
      seeing: "The timeline card shows conditions but no 'Contract Date' row — it is already shown in the property summary card above.",
      steps: [
        "Navigate to /portal/<token>",
        "Confirm no portal-condition-row-contract row inside the timeline",
      ],
    })
  })

  test("settlement row from offer.settlementDate appears as last row", async ({ page }) => {
    const { token } = await createOrGetToken(page, FIXTURE_COND)
    await page.goto(`/portal/${token}`)

    const timeline = page.getByTestId("portal-condition-timeline")
    await expect(timeline).toBeVisible({ timeout: 15_000 })

    // offer.settlementDate = 2026-09-01 for FIXTURE_COND
    const settlementRow = timeline.getByTestId("portal-condition-row-settlement")
    await expect(settlementRow).toBeVisible()
    await expect(settlementRow).toContainText("⏳")
    await expect(settlementRow).toContainText("September 2026")

    await shotFocused(page, settlementRow, SHOT_DIR, "05-settlement-row")
    story.addScene({
      title: "05 — Condition Timeline: Settlement Row from Offer",
      images: [join(SHOT_DIR, "05-settlement-row.png")],
      seeing: "Settlement row shows ⏳ with 'September 2026' — sourced from offer.settlementDate (not property.settlementDate).",
      steps: [
        "Navigate to /portal/<token>",
        "Settlement row shows ⏳ and 'September 2026'",
      ],
    })
  })

  test("completion date row appears when subjectToSaleDays is set", async ({ page }) => {
    const { token } = await createOrGetToken(page, FIXTURE_COND)
    await page.goto(`/portal/${token}`)

    const timeline = page.getByTestId("portal-condition-timeline")
    await expect(timeline).toBeVisible({ timeout: 15_000 })

    // subjectToSaleDays=28 → Completion Date row should appear
    const completionRow = timeline.getByTestId("portal-condition-row-completion-date")
    await expect(completionRow).toBeVisible()

    await shotFocused(page, completionRow, SHOT_DIR, "06-completion-date-row")
    story.addScene({
      title: "06 — Condition Timeline: Completion Date Row",
      images: [join(SHOT_DIR, "06-completion-date-row.png")],
      seeing: "Completion Date row appears when subjectToSaleDays is set (28 days from contractDate).",
      steps: [
        "Navigate to /portal/<token>",
        "Completion Date row is visible in the timeline",
      ],
    })
  })

  // ── Edge case: no offer ────────────────────────────────────────────────────

  test("no offer empty state — shows 'Conditions will appear once an offer is recorded'", async ({ page }) => {
    const { token } = await createOrGetToken(page, FIXTURE_NO_OFFER)
    await page.goto(`/portal/${token}`)

    const timeline = page.getByTestId("portal-condition-timeline")
    await expect(timeline).toBeVisible({ timeout: 15_000 })

    const empty = timeline.getByTestId("portal-condition-timeline-empty")
    await expect(empty).toBeVisible()
    await expect(empty).toContainText("Conditions will appear once an offer is recorded")

    await shotFocused(page, timeline, SHOT_DIR, "07-no-offer-empty")
    story.addScene({
      title: "07 — Condition Timeline: No Offer Empty State",
      images: [join(SHOT_DIR, "07-no-offer-empty.png")],
      seeing: "When no buyer offer is recorded for the property-entity pair, the timeline shows a message prompting that conditions will appear once an offer is recorded.",
      steps: [
        "Navigate to /portal/<token> (no offer exists for this pair)",
        "Timeline card shows empty state message",
      ],
    })
  })

  // ── Edge case: null contractDate ──────────────────────────────────────────

  test("null contractDate empty state — shows 'Condition dates will be confirmed once a contract date is set'", async ({ page }) => {
    const { token } = await createOrGetToken(page, FIXTURE_NULL)
    await page.goto(`/portal/${token}`)

    const timeline = page.getByTestId("portal-condition-timeline")
    await expect(timeline).toBeVisible({ timeout: 15_000 })

    const empty = timeline.getByTestId("portal-condition-timeline-empty")
    await expect(empty).toBeVisible()
    await expect(empty).toContainText("Condition dates will be confirmed once a contract date is set")

    await shotFocused(page, timeline, SHOT_DIR, "08-null-contract-date-empty")
    story.addScene({
      title: "08 — Condition Timeline: Null Contract Date Empty State",
      images: [join(SHOT_DIR, "08-null-contract-date-empty.png")],
      seeing: "When the property has no contract date, the timeline shows a message that condition dates will be confirmed once a contract date is set.",
      steps: [
        "Navigate to /portal/<token> (property has null contractDate)",
        "Timeline card shows null-contractDate empty state message",
      ],
    })
  })
})
