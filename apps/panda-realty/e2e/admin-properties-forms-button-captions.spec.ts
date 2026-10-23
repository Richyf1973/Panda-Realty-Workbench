// Run: npm run test:e2e:scratch -- --app=panda-realty --spec="apps/panda-realty/e2e/admin-properties-forms-button-captions.spec.ts" --no-bail
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

const SHOT_DIR = join(dirname(fileURLToPath(import.meta.url)), "screenshots", "forms-button-captions")

const story = createStory({ specUrl: import.meta.url, slug: "forms-button-captions" })
story.setWhatWasBuilt(
  "Fixed Forms panel button captions in panda-properties-form-forms-tab.tsx. " +
  "For forms with hasPrefillFillStep (form-6, contract-sale-purchase-1): " +
  "the link changed from 'Fill Form' (Pencil) to 'View in Drive' (ExternalLink), " +
  "and the button changed from 'Send File' (FileUp) to 'Fill Form' (Pencil). " +
  "Plain PDFs and Pro Forma 2026 labels are unchanged.",
)

test.beforeEach(async () => {
  await mkdir(SHOT_DIR, { recursive: true })
})

test.afterAll(() => {
  story.write()
})

// ── form-6 ────────────────────────────────────────────────────────────────────

test.describe("form-6 prefillStrategy — new captions", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaE2eAdminCredentials()
    await installFormsTabRoutes(page, makeFormsTabFormsList("form-6"))
    await signInAsAdmin(page)
  })

  test("form-6 — link shows 'View in Drive' not 'Fill Form'", async ({ page }) => {
    await openFormsTab(page)
    const link = page.getByTestId("property-forms-link--1")
    await expect(link).toBeVisible({ timeout: 10_000 })
    const label = link.getByText("View in Drive")
    await expect(label).toBeVisible()
    await shotFocused(page, label, SHOT_DIR, "01-form6-view-in-drive")
    story.addScene({
      title: "01 — Form 6: 'View in Drive' link",
      images: [join(SHOT_DIR, "01-form6-view-in-drive.png")],
      seeing: "Form 6 row shows 'View in Drive' with ExternalLink icon (was 'Fill Form' with Pencil).",
      steps: [
        "Open the Forms tab on any saved property",
        "Locate the Form 6 row",
        "Observe the first link reads 'View in Drive'",
      ],
    })
  })

  test("form-6 — button shows 'Fill Form' not 'Send File'", async ({ page }) => {
    await openFormsTab(page)
    const btn = page.getByTestId("property-forms-send--1")
    await expect(btn).toBeVisible({ timeout: 10_000 })
    await expect(btn).toContainText("Fill Form")
    await shotFocused(page, btn, SHOT_DIR, "02-form6-fill-form-btn")
    story.addScene({
      title: "02 — Form 6: 'Fill Form' button",
      images: [join(SHOT_DIR, "02-form6-fill-form-btn.png")],
      seeing: "Form 6 row shows 'Fill Form' with Pencil icon on the button (was 'Send File' with FileUp).",
      steps: [
        "Open the Forms tab on any saved property",
        "Locate the Form 6 row",
        "Observe the button reads 'Fill Form'",
      ],
    })
  })
})

// ── contract-sale-purchase-1 ──────────────────────────────────────────────────

test.describe("contract-sale-purchase-1 — new captions", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaE2eAdminCredentials()
    await installFormsTabRoutes(page, makeFormsTabFormsList("contract-sale-purchase-1"))
    await signInAsAdmin(page)
  })

  test("contract-sale-purchase-1 — link shows 'View in Drive'", async ({ page }) => {
    await openFormsTab(page)
    const link = page.getByTestId("property-forms-link--1")
    await expect(link).toBeVisible({ timeout: 10_000 })
    const label = link.getByText("View in Drive")
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

  test("contract-sale-purchase-1 — button shows 'Fill Form'", async ({ page }) => {
    await openFormsTab(page)
    const btn = page.getByTestId("property-forms-send--1")
    await expect(btn).toBeVisible({ timeout: 10_000 })
    await expect(btn).toContainText("Fill Form")
    await shotFocused(page, btn, SHOT_DIR, "04-contract-sp-fill-form-btn")
    story.addScene({
      title: "04 — Contract S&P: 'Fill Form' button",
      images: [join(SHOT_DIR, "04-contract-sp-fill-form-btn.png")],
      seeing: "Contract S&P row shows 'Fill Form' with Pencil icon on the button.",
      steps: [
        "Open the Forms tab on any saved property",
        "Locate the Contract S&P row",
        "Observe the button reads 'Fill Form'",
      ],
    })
  })
})

// ── Regression: plain PDF (null prefillStrategy) — unchanged ──────────────────

test.describe("plain PDF (null prefillStrategy) — labels unchanged", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaE2eAdminCredentials()
    await installFormsTabRoutes(page, makeFormsTabFormsList(null))
    await signInAsAdmin(page)
  })

  test("plain PDF — link still shows 'View'", async ({ page }) => {
    await openFormsTab(page)
    const link = page.getByTestId("property-forms-link--1")
    await expect(link).toBeVisible({ timeout: 10_000 })
    await expect(link).toContainText("View")
    await expect(link).not.toContainText("View in Drive")
    await shotFocused(page, link, SHOT_DIR, "05-plain-pdf-view")
    story.addScene({
      title: "05 — Plain PDF: 'View' link unchanged",
      images: [join(SHOT_DIR, "05-plain-pdf-view.png")],
      seeing: "Plain PDF row still shows 'View' with ExternalLink icon (not changed to 'View in Drive').",
      steps: [
        "Open the Forms tab on a property with a plain uploaded PDF",
        "Observe the link still reads 'View'",
      ],
    })
  })

  test("plain PDF — button still shows 'Send File'", async ({ page }) => {
    await openFormsTab(page)
    const btn = page.getByTestId("property-forms-send--1")
    await expect(btn).toBeVisible({ timeout: 10_000 })
    await expect(btn).toContainText("Send File")
    await shotFocused(page, btn, SHOT_DIR, "06-plain-pdf-send-file")
    story.addScene({
      title: "06 — Plain PDF: 'Send File' button unchanged",
      images: [join(SHOT_DIR, "06-plain-pdf-send-file.png")],
      seeing: "Plain PDF row still shows 'Send File' with FileUp icon.",
      steps: [
        "Open the Forms tab on a property with a plain uploaded PDF",
        "Observe the button still reads 'Send File'",
      ],
    })
  })
})

// ── Regression: pro-forma-2026 — unchanged ────────────────────────────────────

test.describe("pro-forma-2026 — label unchanged", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaE2eAdminCredentials()
    await installFormsTabRoutes(page, makeFormsTabFormsList("pro-forma-2026"))
    await signInAsAdmin(page)
  })

  test("pro-forma-2026 — button still shows 'Send Link'", async ({ page }) => {
    await openFormsTab(page)
    const btn = page.getByTestId("property-forms-send--1")
    await expect(btn).toBeVisible({ timeout: 10_000 })
    await expect(btn).toContainText("Send Link")
    await shotFocused(page, btn, SHOT_DIR, "07-proforma-send-link")
    story.addScene({
      title: "07 — Pro Forma 2026: 'Send Link' unchanged",
      images: [join(SHOT_DIR, "07-proforma-send-link.png")],
      seeing: "Pro Forma 2026 row still shows 'Send Link' with Send icon.",
      steps: [
        "Open the Forms tab on a property with Pro Forma 2026",
        "Observe the button still reads 'Send Link'",
      ],
    })
  })
})
