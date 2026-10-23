// Run: npm run test:e2e:scratch -- --app=panda-realty --spec=apps/panda-realty/e2e/admin-properties-forms-form6-client-prefill-fix.spec.ts --no-bail
// Spec: specs/panda-realty-form6-client-prefill-fix.md

import { expect, test } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { createStory, shotFocused } from "@repo/e2e-utils"

import {
  PREFILL_DATA_FULL,
  PREFILL_DATA_SUBURB_IN_ADDRESS,
  PREFILL_DATA_WITH_EXTRA_CLIENT_FIELDS,
  makeForm6Prefill,
  openForm6SendDialog,
} from "./helpers/panda-form6-send-mocks"

const SHOT_DIR = join(dirname(fileURLToPath(import.meta.url)), "screenshots", "form6-client-prefill-fix")

const story = createStory({ specUrl: import.meta.url, slug: "form6-client-prefill-fix" })

story.setWhatWasBuilt(
  "Form 6 client prefill fixes: Name(line2), ABN, and ACN are no longer prefilled for sellers or the licensee. " +
  "Address (line 1) is now stripped using a per-seller panda_suburbs lookup (not the property suburb) — " +
  "owners living in a different suburb than the property now get correct stripping. " +
  "Mobile field is left blank when the DB mobile value is null (phone→mobile fallback removed). " +
  "stripSuburbSuffix uses lastIndexOf so suburb-named streets (e.g. '1 Brisbane Road Brisbane') strip correctly.",
)

test.beforeEach(async () => {
  await mkdir(SHOT_DIR, { recursive: true })
})

test.afterAll(async () => {
  story.write()
})

// ─── Tab 1: Name (line 2) cleared ────────────────────────────────────────────

test.describe("Form 6 prefill fix — Tab 1 Name(line2) not prefilled", () => {
  test.beforeEach(makeForm6Prefill(PREFILL_DATA_WITH_EXTRA_CLIENT_FIELDS))

  test("Client 1 Name(line2) blank even when API returns nameLine2", async ({ page }) => {
    await openForm6SendDialog(page)
    // PREFILL_DATA_WITH_EXTRA_CLIENT_FIELDS: seller1.nameLine2 = "Trading As JS Holdings"
    const field = page.getByTestId("form6-part1-client1-nameline2")
    await expect(field).toHaveValue("")
    await shotFocused(page, field, SHOT_DIR, "01-client1-nameline2-blank")
    story.addScene({
      title: "01 — Client 1 Name(line2) blank",
      images: [join(SHOT_DIR, "01-client1-nameline2-blank.png")],
      seeing: "Name (line 2) field for Client 1 is blank despite API returning 'Trading As JS Holdings'.",
      steps: ["Open Form 6 Send dialog", "Observe Tab 1 Clients — Client 1 Name(line2) is blank"],
    })
  })
})

test.describe("Form 6 prefill fix — Tab 1 Client 2 Name(line2) not prefilled", () => {
  test.beforeEach(makeForm6Prefill(PREFILL_DATA_SUBURB_IN_ADDRESS))

  test("Client 2 Name(line2) blank when API returns Co-Owner Holdings", async ({ page }) => {
    await openForm6SendDialog(page)
    // PREFILL_DATA_SUBURB_IN_ADDRESS: seller2.nameLine2 = "Co-Owner Holdings"
    const field = page.getByTestId("form6-part1-client2-nameline2")
    await expect(field).toHaveValue("")
    await shotFocused(page, field, SHOT_DIR, "02-client2-nameline2-blank")
    story.addScene({
      title: "02 — Client 2 Name(line2) blank",
      images: [join(SHOT_DIR, "02-client2-nameline2-blank.png")],
      seeing: "Name (line 2) for Client 2 is blank despite API returning 'Co-Owner Holdings'.",
      steps: ["Open Form 6 Send dialog", "Observe Client 2 Name(line2) is blank"],
    })
  })
})

// ─── Tab 1: ABN cleared ───────────────────────────────────────────────────────

test.describe("Form 6 prefill fix — Tab 1 ABN not prefilled", () => {
  test.beforeEach(makeForm6Prefill(PREFILL_DATA_WITH_EXTRA_CLIENT_FIELDS))

  test("Client 1 ABN blank even when API returns abn", async ({ page }) => {
    await openForm6SendDialog(page)
    // PREFILL_DATA_WITH_EXTRA_CLIENT_FIELDS inherits seller1.abn = "12 345 678 901" from PREFILL_DATA_FULL
    const field = page.getByTestId("form6-part1-client1-abn")
    await expect(field).toHaveValue("")
    await shotFocused(page, field, SHOT_DIR, "03-client1-abn-blank")
    story.addScene({
      title: "03 — Client 1 ABN blank",
      images: [join(SHOT_DIR, "03-client1-abn-blank.png")],
      seeing: "ABN field for Client 1 is blank despite API returning '12 345 678 901'.",
      steps: ["Open Form 6 Send dialog", "Observe Client 1 ABN is blank"],
    })
  })
})

test.describe("Form 6 prefill fix — Tab 1 Client 2 ABN not prefilled", () => {
  test.beforeEach(makeForm6Prefill(PREFILL_DATA_SUBURB_IN_ADDRESS))

  test("Client 2 ABN blank when API returns 98 765 432 100", async ({ page }) => {
    await openForm6SendDialog(page)
    // PREFILL_DATA_SUBURB_IN_ADDRESS: seller2.abn = "98 765 432 100"
    const field = page.getByTestId("form6-part1-client2-abn")
    await expect(field).toHaveValue("")
    await shotFocused(page, field, SHOT_DIR, "04-client2-abn-blank")
    story.addScene({
      title: "04 — Client 2 ABN blank",
      images: [join(SHOT_DIR, "04-client2-abn-blank.png")],
      seeing: "Client 2 ABN field is blank — '98 765 432 100' from API not prefilled.",
      steps: ["Open Form 6 Send dialog", "Confirm Client 2 ABN is blank"],
    })
  })
})

// ─── Tab 1: ACN cleared ───────────────────────────────────────────────────────

test.describe("Form 6 prefill fix — Tab 1 ACN not prefilled", () => {
  test.beforeEach(makeForm6Prefill(PREFILL_DATA_WITH_EXTRA_CLIENT_FIELDS))

  test("Client 1 ACN blank even when API returns acn", async ({ page }) => {
    await openForm6SendDialog(page)
    // PREFILL_DATA_WITH_EXTRA_CLIENT_FIELDS: seller1.acn = "123 456 789"
    const field = page.getByTestId("form6-part1-client1-acn")
    await expect(field).toHaveValue("")
    await shotFocused(page, field, SHOT_DIR, "05-client1-acn-blank")
    story.addScene({
      title: "05 — Client 1 ACN blank",
      images: [join(SHOT_DIR, "05-client1-acn-blank.png")],
      seeing: "ACN field for Client 1 is blank despite API returning '123 456 789'.",
      steps: ["Open Form 6 Send dialog", "Observe Client 1 ACN is blank"],
    })
  })

  test("Client 2 ACN blank even when API returns acn", async ({ page }) => {
    await openForm6SendDialog(page)
    // PREFILL_DATA_WITH_EXTRA_CLIENT_FIELDS: seller2.acn = "987 654 321"
    const field = page.getByTestId("form6-part1-client2-acn")
    await expect(field).toHaveValue("")
    await shotFocused(page, field, SHOT_DIR, "06-client2-acn-blank")
    story.addScene({
      title: "06 — Client 2 ACN blank",
      images: [join(SHOT_DIR, "06-client2-acn-blank.png")],
      seeing: "ACN field for Client 2 is blank despite API returning '987 654 321'.",
      steps: ["Open Form 6 Send dialog", "Observe Client 2 ACN is blank"],
    })
  })
})

// ─── Tab 1: Address (line 1) suburb stripped ─────────────────────────────────

test.describe("Form 6 prefill fix — Tab 1 address suburb stripped", () => {
  test.beforeEach(makeForm6Prefill(PREFILL_DATA_SUBURB_IN_ADDRESS))

  test("Client 1 Address(line1) shows street only — suburb stripped", async ({ page }) => {
    await openForm6SendDialog(page)
    // Raw: "205/46 Amy Street Morayfield, Qld. 4506." → expected: "205/46 Amy Street"
    const field = page.getByTestId("form6-part1-client1-address")
    await expect(field).toHaveValue("205/46 Amy Street")
    await shotFocused(page, field, SHOT_DIR, "07-client1-address-stripped")
    story.addScene({
      title: "07 — Client 1 Address suburb stripped",
      images: [join(SHOT_DIR, "07-client1-address-stripped.png")],
      seeing: "Address (line 1) shows '205/46 Amy Street' only — 'Morayfield, Qld. 4506.' stripped.",
      steps: [
        "Open Form 6 Send dialog",
        "Observe Client 1 Address (line 1) shows street only",
      ],
    })
  })

  test("Client 2 Address(line1) shows street only — suburb stripped", async ({ page }) => {
    await openForm6SendDialog(page)
    const field = page.getByTestId("form6-part1-client2-address")
    await expect(field).toHaveValue("205/46 Amy Street")
    await shotFocused(page, field, SHOT_DIR, "08-client2-address-stripped")
    story.addScene({
      title: "08 — Client 2 Address suburb stripped",
      images: [join(SHOT_DIR, "08-client2-address-stripped.png")],
      seeing: "Address (line 1) for Client 2 shows street only — suburb stripped.",
      steps: ["Open Form 6 Send dialog", "Observe Client 2 Address (line 1) shows street only"],
    })
  })
})

// ─── Tab 1: Mobile blank when seller.mobile is null ──────────────────────────

test.describe("Form 6 prefill fix — Tab 1 mobile blank when null", () => {
  test.beforeEach(makeForm6Prefill(PREFILL_DATA_SUBURB_IN_ADDRESS))

  test("Client 1 Mobile blank when seller.mobile is null (no phone fallback)", async ({ page }) => {
    await openForm6SendDialog(page)
    // seller1.mobile = null, seller1.phoneNumber = "0433505575"
    // Old: mobile copied from phone → "0433505575". New: blank.
    const field = page.getByTestId("form6-part1-client1-mobile")
    await expect(field).toHaveValue("")
    await shotFocused(page, field, SHOT_DIR, "09-client1-mobile-blank")
    story.addScene({
      title: "09 — Client 1 Mobile blank (null, no fallback)",
      images: [join(SHOT_DIR, "09-client1-mobile-blank.png")],
      seeing: "Mobile for Client 1 is blank — phone→mobile fallback removed; null mobile stays blank.",
      steps: ["Open Form 6 Send dialog", "Observe Client 1 Mobile is blank despite Phone being '0433505575'"],
    })
  })

  test("Client 2 Mobile blank when seller.mobile is null (no phone fallback)", async ({ page }) => {
    await openForm6SendDialog(page)
    // seller2.mobile = null, seller2.phoneNumber = "0492931051"
    const field = page.getByTestId("form6-part1-client2-mobile")
    await expect(field).toHaveValue("")
    await shotFocused(page, field, SHOT_DIR, "10-client2-mobile-blank")
    story.addScene({
      title: "10 — Client 2 Mobile blank (null, no fallback)",
      images: [join(SHOT_DIR, "10-client2-mobile-blank.png")],
      seeing: "Mobile for Client 2 is blank — null mobile stays blank, not copied from phone.",
      steps: ["Open Form 6 Send dialog", "Observe Client 2 Mobile is blank"],
    })
  })
})

// ─── Tab 2: Agent ABN/ACN cleared ────────────────────────────────────────────

test.describe("Form 6 prefill fix — Tab 2 agent ABN/ACN not prefilled", () => {
  test.beforeEach(makeForm6Prefill(PREFILL_DATA_FULL))

  test("Agent ABN blank after selecting agent with ABN populated", async ({ page }) => {
    await openForm6SendDialog(page)
    await page.getByTestId("form6-tab-trigger--2").click()
    // Richard Falzon has abn: "12 345 678 901"
    await page.getByTestId("form6-part2-agent-select").click()
    await page.getByRole("option", { name: "Richard Falzon" }).click()
    const field = page.getByTestId("form6-part2-abn")
    await expect(field).toHaveValue("")
    await shotFocused(page, field, SHOT_DIR, "11-agent-abn-blank")
    story.addScene({
      title: "11 — Agent ABN blank after selection",
      images: [join(SHOT_DIR, "11-agent-abn-blank.png")],
      seeing: "Agent ABN is blank after selecting Richard Falzon — '12 345 678 901' not prefilled.",
      steps: [
        "Open Form 6 Send dialog",
        "Switch to Tab 2 Licensee",
        "Select Richard Falzon from dropdown",
        "Confirm ABN field is blank",
      ],
    })
  })

  test("Agent ACN blank after selecting agent with ACN populated", async ({ page }) => {
    await openForm6SendDialog(page)
    await page.getByTestId("form6-tab-trigger--2").click()
    // Richard Falzon has acn: "123 456 789"
    await page.getByTestId("form6-part2-agent-select").click()
    await page.getByRole("option", { name: "Richard Falzon" }).click()
    const field = page.getByTestId("form6-part2-acn")
    await expect(field).toHaveValue("")
    await shotFocused(page, field, SHOT_DIR, "12-agent-acn-blank")
    story.addScene({
      title: "12 — Agent ACN blank after selection",
      images: [join(SHOT_DIR, "12-agent-acn-blank.png")],
      seeing: "Agent ACN is blank after selecting Richard Falzon — '123 456 789' not prefilled.",
      steps: [
        "Open Form 6 Send dialog",
        "Switch to Tab 2 Licensee",
        "Select Richard Falzon",
        "Confirm ACN field is blank",
      ],
    })
  })
})
