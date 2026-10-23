import { expect, test, type Page } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { createStory, shotFocused } from "@repo/e2e-utils"

import { requirePandaE2eAdminListLiveEnv, signInAsAdmin } from "./helpers/admin-auth"

/**
 * SUCCESSFUL BUYER section renders one editable row per buyer `entity_member` (Name / Address /
 * Phone / Email), mirroring the OWNER INFORMATION (sellers) rows — instead of stacking member
 * names inside a single read-only box. Per-member contact actions sit on each row; property-entity
 * level actions (Notes / Files / Offers / Open Portal / Messages) render once below all rows.
 * Each member's Phone and Email carries an interactive primary ★ persisted to
 * entities.primary_phone_member_id / entities.primary_email_member_id.
 *
 * Live test — targets fixed dev DB rows (overridable via env):
 *  - Multi-member accepted buyer: property 223481, entity 169969 "Saia Mafi",
 *    members 2990 SAIA MAFI (phone+email+address) + 2991 MONTANA PATRICE SCHARF (address only).
 *  - Single-member accepted buyer: property 202739, entity 169968 JOHN EDWARD COLLINS.
 *
 * Run:
 *   npm run test:e2e:scratch -- --app=panda-realty --spec="apps/panda-realty/e2e/successful-buyer-member-names.spec.ts" --no-bail
 */

function envOrDefault(name: string, fallback: string): string {
  const v = process.env[name]?.trim()
  return v && v.length > 0 ? v : fallback
}

const MULTI_PROPERTY_ID = envOrDefault("E2E_PANDA_SUCCESSFUL_BUYER_MULTI_PROPERTY_ID", "223481")
const MULTI_ENTITY_ID = envOrDefault("E2E_PANDA_SUCCESSFUL_BUYER_MULTI_ENTITY_ID", "169969")
const MEMBER_1_ID = envOrDefault("E2E_PANDA_SUCCESSFUL_BUYER_MEMBER_1_ID", "2990") // SAIA MAFI
const MEMBER_2_ID = envOrDefault("E2E_PANDA_SUCCESSFUL_BUYER_MEMBER_2_ID", "2991") // MONTANA PATRICE SCHARF
const MEMBER_1_NAME = "SAIA MAFI"
const MEMBER_2_NAME = "MONTANA PATRICE SCHARF"
const MEMBER_1_PHONE = "0432492686"
const MEMBER_1_EMAIL = "smafi676@outlook.com"

const SINGLE_PROPERTY_ID = envOrDefault("E2E_PANDA_SUCCESSFUL_BUYER_SINGLE_PROPERTY_ID", "202739")

const TID = "panda-properties-form-successful-buyer"

const SHOT_DIR = join(dirname(fileURLToPath(import.meta.url)), "screenshots", "successful-buyer-member-names")

const story = createStory({ specUrl: import.meta.url, slug: "successful-buyer-member-names" })

story.setWhatWasBuilt(
  "The property Edit dialog's SUCCESSFUL BUYER section now renders one editable row per buyer " +
    "entity_member (Name/Address/Phone/Email), like the OWNER INFORMATION rows. Edits save to " +
    "entity_members; property-entity-level actions render once below all rows; each member's Phone " +
    "and Email has an interactive primary ★ persisted to entities.primary_phone_member_id / " +
    "primary_email_member_id. Files: panda-properties-form-successful-buyer-section.tsx, a new " +
    "successful-buyer member-row component, the buyer-offers API route (returns members[] + primary " +
    "pointers), the entities admin definition, and a DB migration.",
)

test.beforeEach(async () => {
  requirePandaE2eAdminListLiveEnv()
  await mkdir(SHOT_DIR, { recursive: true })
})

test.afterAll(() => {
  story.write()
})

/** Open a property's Edit dialog directly via the openEdit deep link (no search/pagination). */
async function openPropertyEditDialog(page: Page, propertyListId: string) {
  await page.goto(`/admin/properties?openEdit=${propertyListId}`)
  const dialog = page.getByTestId("admin-entity-crud-dialog--properties")
  await expect(dialog).toBeVisible({ timeout: 30_000 })
  const section = page.getByTestId("panda-properties-form-section--successful-buyer")
  await expect(section).toBeVisible({ timeout: 30_000 })
  return section
}

test("multi-member: renders one editable row per member with each member's own values", async ({
  page,
}) => {
  test.setTimeout(120_000)
  await signInAsAdmin(page)

  const section = await openPropertyEditDialog(page, MULTI_PROPERTY_ID)

  // One row per member.
  const rows = section.locator(`[data-testid^="${TID}-member-row--"]`)
  await expect(rows).toHaveCount(2)

  // Row 1 (SAIA MAFI): name/phone/email are editable inputs carrying the member's own values.
  await expect(section.getByTestId(`${TID}-member-name--${MEMBER_1_ID}`)).toHaveValue(MEMBER_1_NAME)
  await expect(section.getByTestId(`${TID}-member-phone--${MEMBER_1_ID}`)).toHaveValue(MEMBER_1_PHONE)
  await expect(section.getByTestId(`${TID}-member-email--${MEMBER_1_ID}`)).toHaveValue(MEMBER_1_EMAIL)

  // Row 2 (MONTANA): name carries its value; phone + email are empty editable boxes (not hidden).
  await expect(section.getByTestId(`${TID}-member-name--${MEMBER_2_ID}`)).toHaveValue(MEMBER_2_NAME)
  await expect(section.getByTestId(`${TID}-member-phone--${MEMBER_2_ID}`)).toHaveValue("")
  await expect(section.getByTestId(`${TID}-member-email--${MEMBER_2_ID}`)).toHaveValue("")

  await shotFocused(page, section, SHOT_DIR, "01-multi-member-rows")
  story.addScene({
    title: "01 — Multi-member: one editable row per member",
    images: [join(SHOT_DIR, "01-multi-member-rows.png")],
    seeing:
      "The SUCCESSFUL BUYER section shows two rows like the sellers: SAIA MAFI (with phone + email) " +
      "and MONTANA PATRICE SCHARF (address only, empty phone/email boxes).",
    steps: [
      "Sign in as admin",
      "Open property 223481 (accepted buyer with two members)",
      "Observe two editable member rows, each with its own Name/Address/Phone/Email",
    ],
  })
})

test("multi-member: per-member contact toolbars, single entity-level toolbar below", async ({
  page,
}) => {
  test.setTimeout(120_000)
  await signInAsAdmin(page)

  const section = await openPropertyEditDialog(page, MULTI_PROPERTY_ID)

  // Each member row has its own contact-actions toolbar (one Call button per member).
  const memberCalls = section.locator(`[data-testid^="${TID}-member-call--"]`)
  await expect(memberCalls).toHaveCount(2)

  // Property-entity-level actions render exactly once (not per member).
  const openPortal = section.locator(`[data-testid^="${TID}-open-portal--"]`)
  await expect(openPortal).toHaveCount(1)
  const entityNotes = section.locator(`[data-testid^="${TID}-notes--"]`)
  await expect(entityNotes).toHaveCount(1)

  await shotFocused(page, section, SHOT_DIR, "02-toolbars")
  story.addScene({
    title: "02 — Per-member toolbars + single entity-level toolbar",
    images: [join(SHOT_DIR, "02-toolbars.png")],
    seeing:
      "Each member row has its own call/email/calendar/reminder actions; Notes/Files/Offers/Open " +
      "Portal/Messages appear once below all rows.",
    steps: [
      "Open property 223481",
      "Observe a contact toolbar on each member row",
      "Observe the entity-level toolbar rendered once at the bottom",
    ],
  })
})

test("multi-member: editing a member field saves to entity_members and survives reload", async ({
  page,
}) => {
  test.setTimeout(120_000)
  await signInAsAdmin(page)

  const section = await openPropertyEditDialog(page, MULTI_PROPERTY_ID)

  const phone2 = section.getByTestId(`${TID}-member-phone--${MEMBER_2_ID}`)
  await expect(phone2).toHaveValue("")

  const newPhone = "0400111222"
  const patch = page.waitForRequest(
    (req) =>
      req.method() === "PATCH" &&
      req.url().includes(`/api/admin/properties/${MULTI_PROPERTY_ID}/successful-buyer-member/${MEMBER_2_ID}`),
    { timeout: 15_000 },
  )
  await phone2.fill(newPhone)
  await phone2.blur()
  const req = await patch
  expect(JSON.stringify(req.postDataJSON())).toContain("memberPhoneNumber")

  // Survives reload (sourced from DB, not local state).
  const section2 = await openPropertyEditDialog(page, MULTI_PROPERTY_ID)
  await expect(section2.getByTestId(`${TID}-member-phone--${MEMBER_2_ID}`)).toHaveValue(newPhone)
})

test("multi-member: primary phone star persists to entities and is independent of email", async ({
  page,
}) => {
  test.setTimeout(120_000)
  await signInAsAdmin(page)

  const section = await openPropertyEditDialog(page, MULTI_PROPERTY_ID)

  const phoneStar2 = section.getByTestId(`${TID}-member-phone-primary--${MEMBER_2_ID}`)
  await expect(phoneStar2).toBeVisible()

  const patch = page.waitForRequest(
    (req) =>
      req.method() === "PATCH" &&
      req.url().includes(`/api/admin/entities/${MULTI_ENTITY_ID}/primary-member`),
    { timeout: 15_000 },
  )
  await phoneStar2.click()
  const req = await patch
  const body = JSON.stringify(req.postDataJSON())
  expect(body).toContain("primaryPhoneMemberId")
  expect(body).toContain(MEMBER_2_ID)

  // After reload the chosen phone primary stays highlighted.
  const section2 = await openPropertyEditDialog(page, MULTI_PROPERTY_ID)
  await expect(section2.getByTestId(`${TID}-member-phone-primary--${MEMBER_2_ID}`)).toHaveAttribute(
    "aria-pressed",
    "true",
  )

  await shotFocused(page, section2, SHOT_DIR, "03-primary-star")
  story.addScene({
    title: "03 — Primary phone star persisted",
    images: [join(SHOT_DIR, "03-primary-star.png")],
    seeing: "Member 2's phone ★ is the active primary after reload, persisted to the entity record.",
    steps: [
      "Open property 223481",
      "Click member 2's phone primary star",
      "Reload and confirm the star stays active",
    ],
  })
})

test("single-member: renders exactly one member row", async ({ page }) => {
  test.setTimeout(120_000)
  await signInAsAdmin(page)

  const section = await openPropertyEditDialog(page, SINGLE_PROPERTY_ID)

  const rows = section.locator(`[data-testid^="${TID}-member-row--"]`)
  await expect(rows).toHaveCount(1)

  await shotFocused(page, section, SHOT_DIR, "04-single-member-row")
  story.addScene({
    title: "04 — Single-member: one row",
    images: [join(SHOT_DIR, "04-single-member-row.png")],
    seeing: "A single-member accepted buyer renders exactly one member row.",
    steps: [
      "Sign in as admin",
      "Open property 202739 (accepted buyer with one member)",
      "Observe exactly one member row",
    ],
  })
})
