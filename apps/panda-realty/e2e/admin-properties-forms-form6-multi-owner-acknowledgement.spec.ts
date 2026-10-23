// Run: npm run test:e2e:scratch -- --app=panda-realty --spec="apps/panda-realty/e2e/admin-properties-forms-form6-multi-owner-acknowledgement.spec.ts" --no-bail

import { expect, test } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { createStory, shotFocused } from "@repo/e2e-utils"

import {
  PREFILL_DATA_FULL,
  PREFILL_DATA_ONE_OWNER,
  PREFILL_DATA_THREE_OWNERS,
  makeForm6Prefill,
  openForm6SendDialog,
} from "./helpers/panda-form6-send-mocks"

const SHOT_DIR = join(dirname(fileURLToPath(import.meta.url)), "screenshots", "form6-multi-owner-acknowledgement")

const story = createStory({ specUrl: import.meta.url, slug: "form6-multi-owner-acknowledgement" })

story.setWhatWasBuilt(
  "Form 6 Part 6 Acknowledgement — Client section now shows three separate editable name inputs (one per owner) with AND labels between them. " +
  "Part 1 Clients tab now shows a Client 3 (optional) section. " +
  "The prefill mapper combines all non-empty owner names with AND for the PDF Client field. " +
  "Files changed: form6-part6-agency.tsx, form6-part1-clients.tsx, prefill-mappers.ts, form6-prefill-values.ts, form6-field-map.ts, pdf-prefill-form6.ts, form6-prefill.ts.",
)

test.beforeEach(async () => {
  await mkdir(SHOT_DIR, { recursive: true })
})

test.afterAll(() => {
  story.write()
})

// ── Tab 6: two owners ─────────────────────────────────────────────────────────

test.describe("Form 6 Part 6 — multi-owner acknowledgement — two owners", () => {
  test.beforeEach(makeForm6Prefill(PREFILL_DATA_FULL))

  test("Part 6 second client name input is visible and prefilled with seller 2 name", async ({ page }) => {
    await openForm6SendDialog(page)
    await page.getByTestId("form6-tab-trigger--6").click()

    const input2 = page.getByTestId("form6-part6-client-name-2")
    await expect(input2).toBeVisible({ timeout: 10_000 })
    await expect(input2).toHaveValue("Jane Smith")

    await shotFocused(page, input2, SHOT_DIR, "01-two-owners-part6-client2")
    story.addScene({
      title: "01 — Part 6: Two owners — second client name prefilled",
      images: [join(SHOT_DIR, "01-two-owners-part6-client2.png")],
      seeing: "Part 6 Acknowledgement — Client shows second input prefilled with seller 2 name (Jane Smith).",
      steps: [
        "Open Form 6 send dialog with two-owner property mock",
        "Navigate to Tab 6 — Agency",
        "Observe second client name input is visible and prefilled with Jane Smith",
      ],
    })
  })

  test("Part 6 third client name input is visible and empty with two owners", async ({ page }) => {
    await openForm6SendDialog(page)
    await page.getByTestId("form6-tab-trigger--6").click()

    const input3 = page.getByTestId("form6-part6-client-name-3")
    await expect(input3).toBeVisible({ timeout: 10_000 })
    await expect(input3).toHaveValue("")

    await shotFocused(page, input3, SHOT_DIR, "02-two-owners-part6-client3-empty")
    story.addScene({
      title: "02 — Part 6: Two owners — third slot empty",
      images: [join(SHOT_DIR, "02-two-owners-part6-client3-empty.png")],
      seeing: "Third client name input is visible but empty when only two owners exist.",
      steps: [
        "Open Form 6 send dialog with two-owner property mock",
        "Navigate to Tab 6 — Agency",
        "Observe third client name input is present but empty",
      ],
    })
  })

  test("AND labels appear between Part 6 client name inputs", async ({ page }) => {
    await openForm6SendDialog(page)
    await page.getByTestId("form6-tab-trigger--6").click()

    await expect(page.getByTestId("form6-part6-client-name")).toBeVisible({ timeout: 10_000 })
    const andLabels = page.getByTestId("form6-part6-client-and-label")
    await expect(andLabels).toHaveCount(2)

    await shotFocused(page, page.getByTestId("form6-part6-client-name"), SHOT_DIR, "03-and-labels")
    story.addScene({
      title: "03 — Part 6: AND labels between inputs",
      images: [join(SHOT_DIR, "03-and-labels.png")],
      seeing: "Two AND labels visible between the three client name inputs in the Acknowledgement — Client section.",
      steps: [
        "Open Form 6 send dialog",
        "Navigate to Tab 6 — Agency",
        "Observe AND labels between owner name inputs",
      ],
    })
  })
})

// ── Tab 6: three owners ───────────────────────────────────────────────────────

test.describe("Form 6 Part 6 — multi-owner acknowledgement — three owners", () => {
  test.beforeEach(makeForm6Prefill(PREFILL_DATA_THREE_OWNERS))

  test("Part 6 all three client name inputs prefilled with three owners", async ({ page }) => {
    await openForm6SendDialog(page)
    await page.getByTestId("form6-tab-trigger--6").click()

    const input1 = page.getByTestId("form6-part6-client-name")
    const input2 = page.getByTestId("form6-part6-client-name-2")
    const input3 = page.getByTestId("form6-part6-client-name-3")

    await expect(input1).toHaveValue("John Smith", { timeout: 10_000 })
    await expect(input2).toHaveValue("Jane Smith")
    await expect(input3).toHaveValue("Bob Jones")

    await shotFocused(page, input1, SHOT_DIR, "04-three-owners-all-prefilled")
    story.addScene({
      title: "04 — Part 6: Three owners — all inputs prefilled",
      images: [join(SHOT_DIR, "04-three-owners-all-prefilled.png")],
      seeing: "All three client name inputs are prefilled: John Smith, Jane Smith, Bob Jones.",
      steps: [
        "Open Form 6 send dialog with three-owner property mock",
        "Navigate to Tab 6 — Agency",
        "Observe all three client name inputs are prefilled",
      ],
    })
  })
})

// ── Tab 6: one owner ──────────────────────────────────────────────────────────

test.describe("Form 6 Part 6 — multi-owner acknowledgement — one owner", () => {
  test.beforeEach(makeForm6Prefill(PREFILL_DATA_ONE_OWNER))

  test("Part 6 second and third slots are visible but empty with one owner", async ({ page }) => {
    await openForm6SendDialog(page)
    await page.getByTestId("form6-tab-trigger--6").click()

    const input2 = page.getByTestId("form6-part6-client-name-2")
    const input3 = page.getByTestId("form6-part6-client-name-3")

    await expect(input2).toBeVisible({ timeout: 10_000 })
    await expect(input2).toHaveValue("")
    await expect(input3).toBeVisible()
    await expect(input3).toHaveValue("")

    await shotFocused(page, input2, SHOT_DIR, "05-one-owner-slots-empty")
    story.addScene({
      title: "05 — Part 6: One owner — second and third slots empty",
      images: [join(SHOT_DIR, "05-one-owner-slots-empty.png")],
      seeing: "With only one owner, the second and third client name slots are still visible and empty.",
      steps: [
        "Open Form 6 send dialog with one-owner property mock",
        "Navigate to Tab 6 — Agency",
        "Observe second and third client name inputs are present but empty",
      ],
    })
  })
})

// ── Tab 1: Client 3 section ───────────────────────────────────────────────────

test.describe("Form 6 Part 1 — Client 3 section — three owners", () => {
  test.beforeEach(makeForm6Prefill(PREFILL_DATA_THREE_OWNERS))

  test("Part 1 client3 name input is visible and prefilled with owner 3 name", async ({ page }) => {
    await openForm6SendDialog(page)
    // Tab 1 is active by default

    const client3Name = page.getByTestId("form6-part1-client3-name")
    await expect(client3Name).toBeVisible({ timeout: 10_000 })
    await expect(client3Name).toHaveValue("Bob Jones")

    await shotFocused(page, client3Name, SHOT_DIR, "06-part1-client3-prefilled")
    story.addScene({
      title: "06 — Part 1: Client 3 section prefilled",
      images: [join(SHOT_DIR, "06-part1-client3-prefilled.png")],
      seeing: "Part 1 Clients tab shows Client 3 (optional) section prefilled with Bob Jones.",
      steps: [
        "Open Form 6 send dialog with three-owner property mock",
        "Observe Tab 1 (Clients) — Client 3 section is visible and prefilled",
      ],
    })
  })
})

test.describe("Form 6 Part 1 — Client 3 section — two owners", () => {
  test.beforeEach(makeForm6Prefill(PREFILL_DATA_FULL))

  test("Part 1 client3 name input is visible but empty with two owners", async ({ page }) => {
    await openForm6SendDialog(page)

    const client3Name = page.getByTestId("form6-part1-client3-name")
    await expect(client3Name).toBeVisible({ timeout: 10_000 })
    await expect(client3Name).toHaveValue("")

    await shotFocused(page, client3Name, SHOT_DIR, "07-part1-client3-empty")
    story.addScene({
      title: "07 — Part 1: Client 3 section empty with two owners",
      images: [join(SHOT_DIR, "07-part1-client3-empty.png")],
      seeing: "Part 1 Clients tab shows Client 3 (optional) section present but empty when only two owners exist.",
      steps: [
        "Open Form 6 send dialog with two-owner property mock",
        "Observe Tab 1 (Clients) — Client 3 section is visible and empty",
      ],
    })
  })
})
