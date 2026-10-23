// Run: npm run test:e2e:scratch -- --app=panda-realty --spec="apps/panda-realty/e2e/admin-properties-forms-button-labels.spec.ts" --no-bail
import { expect, test } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { createStory, shotFocused } from "@repo/e2e-utils"

import { requirePandaE2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import {
  installFormsTabRoutes,
  makeFormsTabFormsList,
  openFormsTab,
} from "./helpers/panda-property-forms-tab-mocks"

const SHOT_DIR = join(dirname(fileURLToPath(import.meta.url)), "screenshots", "forms-button-labels")

const story = createStory({ specUrl: import.meta.url, slug: "forms-button-labels" })
story.setWhatWasBuilt(
  "Changed Forms panel button captions in panda-properties-form-forms-tab.tsx. " +
  "For forms with hasPrefillFillStep (form-6, contract-sale-purchase-1): " +
  "the link now shows 'View in Drive' (ExternalLink icon) instead of 'Fill Form' (Pencil), " +
  "and the button now shows 'Fill Form' (Pencil icon) instead of 'Send File' (FileUp). " +
  "'Send Link' (Send icon) for pro-forma-2026 and 'Send File' (FileUp icon) for plain PDFs are unchanged.",
)

test.beforeEach(async () => {
  await mkdir(SHOT_DIR, { recursive: true })
})

test.afterAll(() => {
  story.write()
})


// ── form-6 ────────────────────────────────────────────────────────────────────

test.describe("form-6 prefillStrategy button labels", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaE2eAdminCredentials()
    await installFormsTabRoutes(page, makeFormsTabFormsList("form-6"))
    await signInAsAdmin(page)
  })

  test("form-6 — view link shows 'View in Drive' not 'Fill Form'", async ({ page }) => {
    await openFormsTab(page)
    const fillBtn = page.getByTestId("property-forms-link--1")
    await expect(fillBtn).toBeVisible({ timeout: 10_000 })
    const label = fillBtn.getByText("View in Drive")
    await expect(label).toBeVisible()
    await shotFocused(page, label, SHOT_DIR, "01-form6-view-in-drive")
    story.addScene({
      title: "01 — Form 6: 'View in Drive' link",
      images: [join(SHOT_DIR, "01-form6-view-in-drive.png")],
      seeing: "Form 6 row shows 'View in Drive' with ExternalLink icon instead of the old 'Fill Form' / Pencil.",
      steps: [
        "Open the Forms tab on any saved property",
        "Locate the Form 6 row",
        "Observe the first link reads 'View in Drive'",
      ],
    })
  })

  test("form-6 — action button shows 'Fill Form' not 'Send File'", async ({ page }) => {
    await openFormsTab(page)
    const sendBtn = page.getByTestId("property-forms-send--1")
    await expect(sendBtn).toBeVisible({ timeout: 10_000 })
    await expect(sendBtn).toContainText("Fill Form")
    await shotFocused(page, sendBtn, SHOT_DIR, "02-form6-fill-form")
    story.addScene({
      title: "02 — Form 6: 'Fill Form' button",
      images: [join(SHOT_DIR, "02-form6-fill-form.png")],
      seeing: "Form 6 row shows 'Fill Form' with Pencil icon instead of the old 'Send File' / FileUp.",
      steps: [
        "Open the Forms tab on any saved property",
        "Locate the Form 6 row",
        "Observe the action button reads 'Fill Form'",
      ],
    })
  })
})

// ── contract-sale-purchase-1 ──────────────────────────────────────────────────

test.describe("contract-sale-purchase-1 prefillStrategy button labels", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaE2eAdminCredentials()
    await installFormsTabRoutes(page, makeFormsTabFormsList("contract-sale-purchase-1"))
    await signInAsAdmin(page)
  })

  test("contract-sale-purchase-1 — view link shows 'View in Drive'", async ({ page }) => {
    await openFormsTab(page)
    const fillBtn = page.getByTestId("property-forms-link--1")
    await expect(fillBtn).toBeVisible({ timeout: 10_000 })
    const label = fillBtn.getByText("View in Drive")
    await expect(label).toBeVisible()
    await shotFocused(page, label, SHOT_DIR, "03-contract-sp-view-in-drive")
    story.addScene({
      title: "03 — Contract S&P: 'View in Drive' link",
      images: [join(SHOT_DIR, "03-contract-sp-view-in-drive.png")],
      seeing: "Contract S&P row shows 'View in Drive' with ExternalLink icon.",
      steps: [
        "Open the Forms tab on any saved property",
        "Locate the Contract S&P row",
        "Observe the first link reads 'View in Drive'",
      ],
    })
  })

  test("contract-sale-purchase-1 — action button shows 'Fill Form'", async ({ page }) => {
    await openFormsTab(page)
    const sendBtn = page.getByTestId("property-forms-send--1")
    await expect(sendBtn).toBeVisible({ timeout: 10_000 })
    await expect(sendBtn).toContainText("Fill Form")
    await shotFocused(page, sendBtn, SHOT_DIR, "04-contract-sp-fill-form")
    story.addScene({
      title: "04 — Contract S&P: 'Fill Form' button",
      images: [join(SHOT_DIR, "04-contract-sp-fill-form.png")],
      seeing: "Contract S&P row shows 'Fill Form' with Pencil icon.",
      steps: [
        "Open the Forms tab on any saved property",
        "Locate the Contract S&P row",
        "Observe the action button reads 'Fill Form'",
      ],
    })
  })
})

// ── pro-forma-2026 ────────────────────────────────────────────────────────────

test.describe("pro-forma-2026 prefillStrategy button labels", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaE2eAdminCredentials()
    await installFormsTabRoutes(page, makeFormsTabFormsList("pro-forma-2026"))
    await signInAsAdmin(page)
  })

  test("pro-forma-2026 — send button shows 'Send Link' not 'Send'", async ({ page }) => {
    await openFormsTab(page)
    const sendBtn = page.getByTestId("property-forms-send--1")
    await expect(sendBtn).toBeVisible({ timeout: 10_000 })
    await expect(sendBtn).toContainText("Send Link")
    await shotFocused(page, sendBtn, SHOT_DIR, "05-proforma-send-link")
    story.addScene({
      title: "05 — Pro Forma 2026: 'Send Link' button",
      images: [join(SHOT_DIR, "05-proforma-send-link.png")],
      seeing: "Pro Forma 2026 row shows 'Send Link' with Send (paper-plane) icon.",
      steps: [
        "Open the Forms tab on any saved property",
        "Locate the Pro Forma 2026 row",
        "Observe the send button reads 'Send Link'",
      ],
    })
  })

  test("pro-forma-2026 — no Fill Form / View button shown", async ({ page }) => {
    await openFormsTab(page)
    await expect(page.getByTestId("property-forms-row--1")).toBeVisible({ timeout: 10_000 })
    // Send button should say "Send Link" (not "Send") — this fails before implementation
    const sendBtn = page.getByTestId("property-forms-send--1")
    await expect(sendBtn).toContainText("Send Link")
    // View/Fill Form button must not exist (existing behaviour — regression guard)
    await expect(page.getByTestId("property-forms-link--1")).not.toBeVisible()
  })
})

// ── plain PDF (null prefillStrategy) ─────────────────────────────────────────

test.describe("plain PDF (null prefillStrategy) button labels", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaE2eAdminCredentials()
    await installFormsTabRoutes(page, makeFormsTabFormsList(null))
    await signInAsAdmin(page)
  })

  test("plain PDF — view button still shows 'View'; send button shows 'Send File'", async ({ page }) => {
    await openFormsTab(page)

    const viewBtn = page.getByTestId("property-forms-link--1")
    await expect(viewBtn).toBeVisible({ timeout: 10_000 })
    // "View" label must remain unchanged for plain PDFs
    await expect(viewBtn).toContainText("View")

    const sendBtn = page.getByTestId("property-forms-send--1")
    await expect(sendBtn).toBeVisible()
    await expect(sendBtn).toContainText("Send File")

    await shotFocused(page, viewBtn, SHOT_DIR, "06a-plain-pdf-view")
    await shotFocused(page, sendBtn, SHOT_DIR, "06b-plain-pdf-send-file")
    story.addScene({
      title: "06 — Plain PDF: 'View' unchanged + 'Send File'",
      images: [join(SHOT_DIR, "06a-plain-pdf-view.png"), join(SHOT_DIR, "06b-plain-pdf-send-file.png")],
      seeing:
        "Left: plain PDF row shows 'View' with ExternalLink icon (unchanged). " +
        "Right: send button shows 'Send File' with FileUp icon.",
      steps: [
        "Open the Forms tab on a property with a plain uploaded PDF form",
        "Observe 'View' button is unchanged (screenshot 1)",
        "Observe send button reads 'Send File' (screenshot 2)",
      ],
    })
  })
})
