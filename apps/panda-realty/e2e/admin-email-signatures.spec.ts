/**
 * Run (from repo root):
 *   npx playwright test apps/panda-realty/e2e/admin-email-signatures.spec.ts --config=apps/panda-realty/playwright.config.ts
 * Or via workspace script:
 *   npm run test:e2e -w panda-realty -- apps/panda-realty/e2e/admin-email-signatures.spec.ts
 */
import { expect, test, type Page, type Route } from "@playwright/test"

import { requirePandaE2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"

type EmailSignatureRecord = {
  id: number
  name: string
  isDefault: boolean
  htmlContent: string
  renderedHtml: string
}

const STATUS_MIN = {
  items: [{ propertyStatusId: 1, propertyStatusCode: "ACTIVE", propertyStatus: "Active" }],
  totalCount: 1,
  limit: 100,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false,
  startCursor: null,
  endCursor: null,
}

function makeSignature(
  overrides: Partial<EmailSignatureRecord> = {},
): EmailSignatureRecord {
  return {
    id: overrides.id ?? 1,
    name: overrides.name ?? "Office default",
    isDefault: overrides.isDefault ?? true,
    htmlContent:
      overrides.htmlContent ??
      "<p><strong>Regards,</strong></p><p>Richard Falzon</p><p><img src=\"https://example.com/default-signature.png\" alt=\"Office default\"></p>",
    renderedHtml:
      overrides.renderedHtml ??
      "<div><p><strong>Regards,</strong></p><p>Richard Falzon</p><p><img src=\"https://example.com/default-signature.png\" alt=\"Office default\"></p></div>",
  }
}

async function pasteImageIntoEditor(page: Page) {
  await page.getByTestId("email-signatures-editor").evaluate((element) => {
    const clipboardData = new DataTransfer()
    clipboardData.items.add(new File(["image-bytes"], "signature.png", { type: "image/png" }))
    const event = new ClipboardEvent("paste", {
      clipboardData,
      bubbles: true,
      cancelable: true,
    })
    element.dispatchEvent(event)
  })
}

async function selectTextInEditor(page: Page, text: string) {
  await page.getByTestId("email-signatures-editor").evaluate((element, targetText) => {
    const root = element as HTMLDivElement
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
    let textNode: Text | null = null
    let startOffset = -1

    while (walker.nextNode()) {
      const current = walker.currentNode as Text
      const nextOffset = current.data.indexOf(targetText as string)
      if (nextOffset >= 0) {
        textNode = current
        startOffset = nextOffset
        break
      }
    }

    if (!textNode || startOffset < 0) {
      throw new Error(`Could not find text: ${String(targetText)}`)
    }

    const range = document.createRange()
    range.setStart(textNode, startOffset)
    range.setEnd(textNode, startOffset + String(targetText).length)
    const selection = window.getSelection()
    selection?.removeAllRanges()
    selection?.addRange(range)
  }, text)
}

async function signatureEditorHtml(page: Page) {
  return page
    .getByTestId("email-signatures-editor")
    .evaluate((node) => (node as HTMLDivElement).innerHTML)
}

async function signatureEditorText(page: Page) {
  return page
    .getByTestId("email-signatures-editor")
    .evaluate((node) => (node as HTMLDivElement).textContent ?? "")
}

async function openSignaturesList(page: Page) {
  const firstListItem = page.getByTestId("email-signatures-list-item--1")
  if (await firstListItem.isVisible().catch(() => false)) return
  await page.getByTestId("email-signatures-list-panel-button").click()
}

async function setupEmailSignaturePage(
  page: Page,
  opts: {
    initial?: EmailSignatureRecord[]
    uploadShouldFail?: boolean
    uploadDelayMs?: number
    signIn?: boolean
  } = {},
) {
  const signatures = [...(opts.initial ?? [makeSignature()])]
  let nextId = signatures.reduce((max, item) => Math.max(max, item.id), 0) + 1

  await page.route("**/api/admin/property-status**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(STATUS_MIN),
    })
  })

  await page.route("**/api/admin/email-signatures/upload**", async (route: Route) => {
    if (opts.uploadShouldFail) {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Upload failed." }),
      })
      return
    }

    if (opts.uploadDelayMs != null && opts.uploadDelayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, opts.uploadDelayMs))
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        fileUrl:
          "https://supabase.example/storage/v1/object/public/email-signatures/signatures/uploaded-signature.png",
        previewUrl:
          "https://supabase.example/storage/v1/object/public/email-signatures/signatures/uploaded-signature.png",
      }),
    })
  })

  await page.route("**/api/admin/email-signatures", async (route: Route) => {
    const method = route.request().method()
    if (method === "GET") {
      const ordered = [...signatures].sort(
        (a, b) => Number(b.isDefault) - Number(a.isDefault) || a.id - b.id,
      )
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: ordered }),
      })
      return
    }

    if (method === "POST") {
      const body = (await route.request().postDataJSON()) as Record<string, unknown>
      if (String(body.name ?? "").trim() === "") {
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({
            error: "Validation failed.",
            errors: { name: "Name is required." },
          }),
        })
        return
      }

      const htmlContent = String(body.htmlContent ?? "")
      const renderedHtml = htmlContent
      const record = makeSignature({
        id: nextId++,
        name: String(body.name ?? ""),
        isDefault: Boolean(body.isDefault),
        htmlContent,
        renderedHtml,
      })
      if (record.isDefault) {
        for (const item of signatures) item.isDefault = false
      }
      signatures.push(record)
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(record),
      })
      return
    }

    await route.fulfill({ status: 405, body: "Method Not Allowed" })
  })

  await page.route("**/api/admin/email-signatures/*", async (route: Route) => {
    const lastSegment = route.request().url().split("/").pop() ?? ""
    if (!/^\d+$/.test(lastSegment)) {
      await route.fallback()
      return
    }

    const id = Number(lastSegment)
    const record = signatures.find((item) => item.id === id)
    if (!record) {
      await route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({ error: "Not found" }),
      })
      return
    }

    if (route.request().method() === "PATCH") {
      const body = (await route.request().postDataJSON()) as Record<string, unknown>
      if (String(body.name ?? "").trim() === "") {
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({
            error: "Validation failed.",
            errors: { name: "Name is required." },
          }),
        })
        return
      }
      if (body.isDefault === true) {
        for (const item of signatures) item.isDefault = false
      }
      Object.assign(record, {
        name: body.name ?? record.name,
        isDefault: body.isDefault ?? record.isDefault,
        htmlContent: body.htmlContent ?? record.htmlContent,
        renderedHtml: body.htmlContent ?? record.renderedHtml,
      })
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(record),
      })
      return
    }

    await route.fulfill({ status: 405, body: "Method Not Allowed" })
  })

  if (opts.signIn !== false) {
    await signInAsAdmin(page)
  }
}

test.describe("Panda Realty - admin email signatures wysiwyg", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaE2eAdminCredentials()
    await setupEmailSignaturePage(page)
  })

  test("page loads the signature manager with editor and rendered preview panes", async ({ page }) => {
    await page.goto("/admin/email-signatures")

    await expect(page.getByTestId("email-signatures-page-shell")).toBeVisible()
    await expect(page.getByTestId("email-signatures-page")).toBeVisible()
    await expect(page.getByTestId("email-signatures-list")).toBeVisible()
    await expect(page.getByTestId("email-signatures-list-panel")).toBeVisible()
    await expect(page.getByTestId("email-signatures-list-toggle")).toBeVisible()
    await expect(page.getByTestId("email-signatures-editor-panel")).toBeVisible()
    await expect(page.getByTestId("email-signatures-name-input")).toBeVisible()
    await expect(page.getByTestId("email-signatures-editor")).toBeVisible()
    await expect(page.getByTestId("email-signatures-preview")).toBeVisible()
    await expect(page.getByTestId("email-signatures-preview-notes")).toBeVisible()
    await expect(page.getByTestId("email-signatures-refresh")).toBeVisible()

    await openSignaturesList(page)
    await expect(page.getByTestId("email-signatures-list-item--1")).toContainText("Office default")
    await expect(page.getByTestId("email-signatures-default-badge--1")).toBeVisible()
  })

  test("creating a signature from html editor content adds it to the shared list and preview", async ({ page }) => {
    await page.goto("/admin/email-signatures")

    await page.getByTestId("email-signatures-create").click()
    await page.getByTestId("email-signatures-name-input").fill("Richard promo")
    await page.getByTestId("email-signatures-editor").click()
    await page.getByTestId("email-signatures-editor-toolbar-bold").click()
    await page.getByTestId("email-signatures-editor").fill("Regards, Richard Falzon")
    await page.getByTestId("email-signatures-save").click()

    await expect(page.getByTestId("email-signatures-list-item--2")).toContainText("Richard promo")
    await expect(page.getByTestId("email-signatures-preview")).toContainText("Regards, Richard Falzon")
  })

  test("pasting an inline image uploads it and rewrites the preview to a hosted image url", async ({ page }) => {
    await setupEmailSignaturePage(page, { uploadDelayMs: 500, signIn: false })
    await page.goto("/admin/email-signatures")

    await page.getByTestId("email-signatures-create").click()
    await page.getByTestId("email-signatures-name-input").fill("Pasted logo")
    await page.getByTestId("email-signatures-editor").click()
    await pasteImageIntoEditor(page)

    await expect(page.getByTestId("email-signatures-editor").locator("img").first()).toHaveAttribute(
      "src",
      /^blob:/i,
    )
    await expect(page.getByTestId("email-signatures-editor-upload-overlay")).toBeVisible()
    await expect(page.getByTestId("email-signatures-editor")).toHaveAttribute("aria-disabled", "true")
    await expect(page.getByTestId("email-signatures-preview").locator("img").first()).toHaveAttribute(
      "src",
      /^blob:/i,
    )

    await expect(page.getByTestId("email-signatures-preview").locator("img").first()).toHaveAttribute(
      "src",
      /https:\/\/supabase\.example\/storage\/v1\/object\/public\/email-signatures\/signatures\/uploaded-signature\.png/i,
    )
  })

  test("setting a different signature as office default clears the previous default", async ({ page }) => {
    await setupEmailSignaturePage(page, {
      initial: [
        makeSignature({ id: 1, name: "Office default", isDefault: true }),
        makeSignature({ id: 2, name: "Vantage logo", isDefault: false }),
      ],
      signIn: false,
    })
    await page.goto("/admin/email-signatures")

    await openSignaturesList(page)
    await page.getByTestId("email-signatures-list-item--2").click()
    await page.getByTestId("email-signatures-set-default").click()
    await page.getByTestId("email-signatures-save").click()

    await openSignaturesList(page)
    await expect(page.getByTestId("email-signatures-default-badge--2")).toBeVisible()
    await expect(page.getByTestId("email-signatures-default-badge--1")).toHaveCount(0)
  })

  test("editing an existing signature reloads its html into the editor and updates the preview", async ({ page }) => {
    await page.goto("/admin/email-signatures")

    await openSignaturesList(page)
    await page.getByTestId("email-signatures-list-item--1").click()
    await expect(page.getByTestId("email-signatures-editor")).toContainText("Regards")
    await page.getByTestId("email-signatures-editor").fill("Updated Agent Signature")
    await page.getByTestId("email-signatures-save").click()

    await expect(page.getByTestId("email-signatures-editor")).toContainText("Updated Agent Signature")
    await expect(page.getByTestId("email-signatures-preview")).toContainText("Updated Agent Signature")
  })

  test("signature editor applies a common font size and highlight color to selected text", async ({ page }) => {
    await page.goto("/admin/email-signatures")

    await page.getByTestId("email-signatures-create").click()
    await page.getByTestId("email-signatures-name-input").fill("Formatted signature")
    await page.getByTestId("email-signatures-editor").fill("Format me please")
    await selectTextInEditor(page, "Format me")
    await page.getByTestId("email-signatures-editor-font-size").selectOption("24px")
    await selectTextInEditor(page, "Format me")
    await page.getByTestId("email-signatures-editor-highlight").selectOption("#fef08a")

    const html = await signatureEditorHtml(page)
    expect(html).toMatch(/font-size:\s*24px/i)
    expect(html).toMatch(/background-color:\s*(#fef08a|rgb\(254,\s*240,\s*138\))/i)
  })

  test("signature editor can remove highlight fill from selected text", async ({ page }) => {
    await page.goto("/admin/email-signatures")

    await page.getByTestId("email-signatures-create").click()
    await page.getByTestId("email-signatures-name-input").fill("Highlight removal")
    await page.getByTestId("email-signatures-editor").fill("Remove my highlight")
    await selectTextInEditor(page, "Remove my")
    await page.getByTestId("email-signatures-editor-highlight").selectOption("#f9a8d4")

    let html = await signatureEditorHtml(page)
    expect(html).toMatch(/background-color:\s*(#f9a8d4|rgb\(249,\s*168,\s*212\))/i)

    await selectTextInEditor(page, "Remove my")
    await page.getByTestId("email-signatures-editor-highlight").selectOption("none")

    html = await signatureEditorHtml(page)
    expect(await signatureEditorText(page)).toContain("Remove my highlight")
    expect(html).not.toMatch(/background-color:\s*(#f9a8d4|rgb\(249,\s*168,\s*212\))/i)
  })

  test("saving with missing name shows validation errors and does not create a signature", async ({ page }) => {
    await page.goto("/admin/email-signatures")

    await page.getByTestId("email-signatures-create").click()
    await page.getByTestId("email-signatures-save").click()

    await expect(page.getByTestId("email-signatures-name-error")).toContainText(/required/i)
    await expect(page.getByTestId("email-signatures-list-item--2")).toHaveCount(0)
  })

  test("image paste upload failures are shown inline without freezing the editor", async ({ page }) => {
    await setupEmailSignaturePage(page, { uploadShouldFail: true, signIn: false })
    await page.goto("/admin/email-signatures")

    await page.getByTestId("email-signatures-create").click()
    await page.getByTestId("email-signatures-name-input").fill("Failed paste")
    await page.getByTestId("email-signatures-editor").click()
    await pasteImageIntoEditor(page)

    await expect(page.getByTestId("email-signatures-upload-error")).toContainText(/upload failed/i)
    await expect(page.getByTestId("email-signatures-editor")).toBeVisible()
    await expect(page.getByTestId("email-signatures-save")).toBeEnabled()
  })

  test("saved signatures and the office default persist after page reload", async ({ page }) => {
    await setupEmailSignaturePage(page, {
      initial: [
        makeSignature({ id: 1, name: "Office default", isDefault: false }),
        makeSignature({
          id: 2,
          name: "Vantage logo",
          isDefault: true,
          htmlContent: "<p>Vantage logo</p>",
          renderedHtml: "<div><p>Vantage logo</p></div>",
        }),
      ],
      signIn: false,
    })
    await page.goto("/admin/email-signatures")

    await openSignaturesList(page)
    await expect(page.getByTestId("email-signatures-default-badge--2")).toBeVisible()
    await expect(page.getByTestId("email-signatures-preview")).toContainText("Vantage logo")

    await page.reload()

    await openSignaturesList(page)
    await expect(page.getByTestId("email-signatures-list-item--1")).toContainText("Office default")
    await expect(page.getByTestId("email-signatures-default-badge--2")).toBeVisible()
    await expect(page.getByTestId("email-signatures-preview")).toContainText("Vantage logo")
  })
})
