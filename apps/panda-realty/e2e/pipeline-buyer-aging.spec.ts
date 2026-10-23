/**
 * E2E: Buyers pipeline — aging color indicator & auto-movement
 *
 * Success factors:
 * 1. Buyers pipeline board loads with buyer cards visible
 * 2. Buyer cards in aging-stage columns show a colored dot (data-testid="buyer-aging-indicator")
 *    with aria-label "Active" | "3 to 6 months" | "Archived"
 * 3. Buyer cards in non-aging-stage columns show no aging dot
 * 4. Auto-move: buyer in "Active Buyers" with created_at 95 days ago → moves to
 *    "Active - 3 to 6 months" on page reload (verified via DOM + DB state)
 * 5. Auto-move: buyer in "Active Buyers" with created_at 185 days ago → moves to
 *    "Archived" on page reload (verified via DOM + DB state)
 * 6. No backward movement: buyer in "Archived" with very recent created_at stays in "Archived"
 *
 * Tests 4–6 require DATABASE_URL for direct DB manipulation (same pattern as existing helpers).
 * Aging stage IDs from panda_realty.property_status: Active Buyers=47, Active-3-6mo=55, Archived=13
 */

import postgres from "postgres"
import { expect, test } from "@playwright/test"

import {
  e2eAdminCredentials,
  e2ePandaAdminListApiConfigured,
  signInAsAdmin,
} from "./helpers/admin-auth"

// Stage codes as stored in property_status_code (case-sensitive CITEXT)
const AGING_STAGE_CODES = ["Active Buyers", "Active - 3 to 6 months", "Archived"] as const
const NON_AGING_STAGE_CODES = ["Enquiry", "Contact Made", "Negotiations Started"] as const

// Stage IDs — matches lib/admin/buyer-aging.ts constants
const STAGE_ID = {
  ACTIVE_BUYERS: 47,
  ACTIVE_3_TO_6_MONTHS: 55,
  ARCHIVED: 13,
} as const

async function openBuyersBoard(page: import("@playwright/test").Page) {
  await page.goto("/admin/pipeline?pipeline=buyers")
  await page.waitForLoadState("networkidle")
  await expect(page.locator('[data-testid^="kanban-column--"]').first()).toBeVisible({
    timeout: 15_000,
  })
}

test.describe("Buyers pipeline — aging color indicator & auto-movement", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")
    test.skip(!e2ePandaAdminListApiConfigured, "DATABASE_URL not set — live DB required")
    await signInAsAdmin(page)
    await openBuyersBoard(page)
  })

  // ── Success factor 1 ──────────────────────────────────────────────────────────
  test("buyers pipeline board renders with buyer cards", async ({ page }) => {
    const allCards = page.locator('[data-testid^="kanban-buyer-card--"]')
    const count = await allCards.count()
    if (count === 0) {
      test.skip(true, "No buyer cards found — seed data needed")
      return
    }
    expect(count).toBeGreaterThan(0)
  })

  // ── Success factor 2 ──────────────────────────────────────────────────────────
  test("aging-stage columns show a colored dot with a valid aria-label", async ({ page }) => {
    let foundDot = false

    for (const code of AGING_STAGE_CODES) {
      const column = page.locator(`[data-testid="kanban-column--${code}"]`)
      if (!(await column.isVisible())) continue

      const cards = column.locator('[data-testid^="kanban-buyer-card--"]')
      if ((await cards.count()) === 0) continue

      // Check all cards in this column — not just the first, in case some have null createdAt
      const cardCount = await cards.count()
      for (let i = 0; i < cardCount; i++) {
        const dot = cards.nth(i).locator('[data-testid="buyer-aging-indicator"]')
        if ((await dot.count()) === 0) continue

        foundDot = true
        const label = await dot.getAttribute("aria-label")
        expect(
          ["Active", "3 to 6 months", "Archived"],
          `dot in "${code}" column must have a recognized aria-label`,
        ).toContain(label)
        break
      }
      if (foundDot) break
    }

    if (!foundDot) {
      test.skip(true, "No aging-stage cards with a dot found — seed data needed or all records have null created_at")
    }
  })

  // ── Success factor 3 ──────────────────────────────────────────────────────────
  test("non-aging-stage columns do not show an aging dot", async ({ page }) => {
    let testedAtLeastOne = false

    for (const code of NON_AGING_STAGE_CODES) {
      const column = page.locator(`[data-testid="kanban-column--${code}"]`)
      if (!(await column.isVisible())) continue

      const cards = column.locator('[data-testid^="kanban-buyer-card--"]')
      if ((await cards.count()) === 0) continue

      testedAtLeastOne = true
      const dots = column.locator('[data-testid="buyer-aging-indicator"]')
      await expect(dots).toHaveCount(0)
    }

    if (!testedAtLeastOne) {
      test.skip(true, "No non-aging-stage cards found — seed data needed")
    }
  })

  // ── Success factor 4 ──────────────────────────────────────────────────────────
  // Verifies auto-move via DOM (card visible in target column) + DB state (buyer_pipeline_status_id).
  // Note: dot is not asserted here because some legacy rows have null created_at (no NOT NULL
  // constraint on the column). Dot rendering is covered by success factors 2 & 3.
  test(
    "auto-move: Active Buyers buyer with 95-day-old created_at moves to Active - 3 to 6 months",
    async ({ page }) => {
      const sql = postgres(process.env.DATABASE_URL!, { max: 1 })

      const rows = await sql<{ property_entity_id: number; entity_id: number; created_at: Date | null; buyer_pipeline_status_id: number }[]>`
        SELECT pe.property_entity_id, pe.entity_id, pe.created_at, pe.buyer_pipeline_status_id
        FROM panda_realty.property_entities pe
        WHERE pe.buyer_pipeline_status_id = ${STAGE_ID.ACTIVE_BUYERS}
        LIMIT 1
      `

      if (rows.length === 0) {
        await sql.end({ timeout: 5 })
        test.skip(true, "No buyers in Active Buyers stage — seed data needed")
        return
      }

      const { property_entity_id, entity_id, created_at: originalCreatedAt } = rows[0]

      try {
        await sql`
          UPDATE panda_realty.property_entities
          SET created_at = now() - interval '95 days'
          WHERE property_entity_id = ${property_entity_id}
        `

        // Reload — applyBuyerAgingRules() runs server-side and persists the move
        await openBuyersBoard(page)

        // DOM check: card must appear in "Active - 3 to 6 months" column
        // Testid format: kanban-buyer-card--{entityId}-{stageId}
        const targetColumn = page.locator(
          '[data-testid="kanban-column--Active - 3 to 6 months"]',
        )
        const movedCard = targetColumn.locator(
          `[data-testid="kanban-buyer-card--${entity_id}-${STAGE_ID.ACTIVE_3_TO_6_MONTHS}"]`,
        )
        await expect(movedCard, "buyer should appear in Active - 3 to 6 months column").toBeVisible({
          timeout: 10_000,
        })

        // DB check: buyer_pipeline_status_id must be updated to 55
        const dbCheck = await sql<{ buyer_pipeline_status_id: number }[]>`
          SELECT buyer_pipeline_status_id
          FROM panda_realty.property_entities
          WHERE property_entity_id = ${property_entity_id}
        `
        expect(Number(dbCheck[0].buyer_pipeline_status_id), "DB must reflect move to Active - 3 to 6 months").toBe(
          STAGE_ID.ACTIVE_3_TO_6_MONTHS,
        )
      } finally {
        // Restore original created_at and stage so subsequent tests are not affected
        await sql`
          UPDATE panda_realty.property_entities
          SET created_at = ${originalCreatedAt},
              buyer_pipeline_status_id = ${STAGE_ID.ACTIVE_BUYERS}
          WHERE property_entity_id = ${property_entity_id}
        `
        await sql.end({ timeout: 5 })
      }
    },
  )

  // ── Success factor 5 ──────────────────────────────────────────────────────────
  test(
    "auto-move: Active Buyers buyer with 185-day-old created_at moves to Archived",
    async ({ page }) => {
      const sql = postgres(process.env.DATABASE_URL!, { max: 1 })

      const rows = await sql<{ property_entity_id: number; entity_id: number; created_at: Date | null }[]>`
        SELECT pe.property_entity_id, pe.entity_id, pe.created_at
        FROM panda_realty.property_entities pe
        WHERE pe.buyer_pipeline_status_id = ${STAGE_ID.ACTIVE_BUYERS}
        LIMIT 1
      `

      if (rows.length === 0) {
        await sql.end({ timeout: 5 })
        test.skip(true, "No buyers in Active Buyers stage — seed data needed")
        return
      }

      const { property_entity_id, entity_id, created_at: originalCreatedAt } = rows[0]

      try {
        await sql`
          UPDATE panda_realty.property_entities
          SET created_at = now() - interval '185 days'
          WHERE property_entity_id = ${property_entity_id}
        `

        await openBuyersBoard(page)

        // DOM check: card must appear in "Archived" column
        // Testid format: kanban-buyer-card--{entityId}-{stageId}
        const archivedColumn = page.locator('[data-testid="kanban-column--Archived"]')
        const movedCard = archivedColumn.locator(
          `[data-testid="kanban-buyer-card--${entity_id}-${STAGE_ID.ARCHIVED}"]`,
        )
        await expect(movedCard, "buyer should appear in Archived column").toBeVisible({
          timeout: 10_000,
        })

        // DB check: buyer_pipeline_status_id must be updated to 13
        const dbCheck = await sql<{ buyer_pipeline_status_id: number }[]>`
          SELECT buyer_pipeline_status_id
          FROM panda_realty.property_entities
          WHERE property_entity_id = ${property_entity_id}
        `
        expect(Number(dbCheck[0].buyer_pipeline_status_id), "DB must reflect move to Archived").toBe(
          STAGE_ID.ARCHIVED,
        )
      } finally {
        await sql`
          UPDATE panda_realty.property_entities
          SET created_at = ${originalCreatedAt},
              buyer_pipeline_status_id = ${STAGE_ID.ACTIVE_BUYERS}
          WHERE property_entity_id = ${property_entity_id}
        `
        await sql.end({ timeout: 5 })
      }
    },
  )

  // ── Success factor 6 ──────────────────────────────────────────────────────────
  test(
    "no backward movement: buyer in Archived with today's created_at stays in Archived",
    async ({ page }) => {
      const sql = postgres(process.env.DATABASE_URL!, { max: 1 })

      const rows = await sql<{ property_entity_id: number; entity_id: number; created_at: Date | null }[]>`
        SELECT pe.property_entity_id, pe.entity_id, pe.created_at
        FROM panda_realty.property_entities pe
        WHERE pe.buyer_pipeline_status_id = ${STAGE_ID.ARCHIVED}
        LIMIT 1
      `

      if (rows.length === 0) {
        await sql.end({ timeout: 5 })
        test.skip(true, "No buyers in Archived stage — seed data needed")
        return
      }

      const { property_entity_id, entity_id, created_at: originalCreatedAt } = rows[0]

      try {
        // Set created_at to now — aging rules must NOT move this buyer backward to Active Buyers
        await sql`
          UPDATE panda_realty.property_entities
          SET created_at = now()
          WHERE property_entity_id = ${property_entity_id}
        `

        await openBuyersBoard(page)

        // DOM check: buyer must still be in Archived, not moved backward
        // Testid format: kanban-buyer-card--{entityId}-{stageId}
        const archivedColumn = page.locator('[data-testid="kanban-column--Archived"]')
        const card = archivedColumn.locator(
          `[data-testid="kanban-buyer-card--${entity_id}-${STAGE_ID.ARCHIVED}"]`,
        )
        await expect(card, "buyer should remain in Archived, not moved backward").toBeVisible({
          timeout: 10_000,
        })

        // DB check: stage must still be 13 (Archived)
        const dbCheck = await sql<{ buyer_pipeline_status_id: number }[]>`
          SELECT buyer_pipeline_status_id
          FROM panda_realty.property_entities
          WHERE property_entity_id = ${property_entity_id}
        `
        expect(Number(dbCheck[0].buyer_pipeline_status_id), "DB must remain Archived — no backward movement").toBe(
          STAGE_ID.ARCHIVED,
        )
      } finally {
        await sql`
          UPDATE panda_realty.property_entities
          SET created_at = ${originalCreatedAt}
          WHERE property_entity_id = ${property_entity_id}
        `
        await sql.end({ timeout: 5 })
      }
    },
  )
})
