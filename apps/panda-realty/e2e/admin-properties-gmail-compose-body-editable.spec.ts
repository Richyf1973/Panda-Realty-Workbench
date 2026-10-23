/**
 * Run (from repo root):
 *   npx playwright test apps/panda-realty/e2e/admin-properties-gmail-compose-body-editable.spec.ts --config=apps/panda-realty/playwright.config.ts
 * Or via workspace script:
 *   npm run test:e2e -w panda-realty -- apps/panda-realty/e2e/admin-properties-gmail-compose-body-editable.spec.ts
 */
import { expect, test, type Page } from "@playwright/test"

import { requirePandaE2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import { routePandaPropertiesListDetailAndBuyerOffers } from "./helpers/panda-properties-dialog-mocks"

type ComposeSignature = {
  id: number
  name: string
  isDefault: boolean
  htmlContent: string
  renderedHtml: string
}

const BUYER_WITH_EMAIL = {
  items: [
    {
      propertyEntityId: 501,
      entityId: 201,
      entityName: "Aaron Ross Uren",
      phoneNumber: "0400000001",
      emailAddress: "aaron.king@kingcoldrooms.com",
      address: null,
      esuburb: null,
      estate: null,
      epostcode: null,
      notes: null,
      buyerPipelineStatusId: null,
      pipelineStatusLabel: "Active Buyers",
    },
  ],
}

const EMPTY_PANEL_RESPONSE = { items: [] }

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

function makeSignature(overrides: Partial<ComposeSignature> = {}): ComposeSignature {
  return {
    id: overrides.id ?? 1,
    name: overrides.name ?? "Office default",
    isDefault: overrides.isDefault ?? true,
    htmlContent:
      overrides.htmlContent ??
      `<p style="font-weight:600;">Kind Regards</p><p>Richard Falzon</p><p>My Panda Realty</p>`,
    renderedHtml:
      overrides.renderedHtml ??
      `<p style="font-weight:600;">Kind Regards</p><p>Richard Falzon</p><p>My Panda Realty</p>`,
  }
}

async function composeEditorHtml(page: Page) {
  return page
    .getByTestId("property-gmail-compose-editor")
    .evaluate((node) => (node as HTMLDivElement).innerHTML)
}

async function setupPage(
  page: Page,
  options: { signatures?: ComposeSignature[]; signIn?: boolean } = {},
) {
  const signatures = options.signatures ?? [makeSignature()]

  await page.route("**/api/admin/property-status**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(STATUS_MIN) })
  })
  await page.route("**/api/admin/property-entities**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        items: [],
        totalCount: 0,
        limit: 20,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
        startCursor: null,
        endCursor: null,
      }),
    })
  })
  await page.route("**/api/admin/email-signatures**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items: signatures }),
    })
  })
  await page.route("**/api/admin/gmail/send**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) })
  })

  await routePandaPropertiesListDetailAndBuyerOffers(page)
  await page.route("**/api/admin/properties/1001/buyers**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(BUYER_WITH_EMAIL) })
  })
  await page.route("**/api/admin/properties/1001/contacts**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_PANEL_RESPONSE) })
  })
  await page.route("**/api/admin/properties/1001/tenants**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_PANEL_RESPONSE) })
  })
  await page.route("**/api/admin/gmail/threads?email=**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ threads: [] }) })
  })

  if (options.signIn !== false) {
    await signInAsAdmin(page)
  }

  return { signatures }
}

async function openBuyerCompose(page: Page) {
  await page.goto("/admin/properties")
  await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible()
  await page.getByTestId("admin-entity-row--properties--1001").click()
  await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible()
  await page.getByTestId("panda-properties-form-tab-trigger--buyers").click()
  await page.getByTestId("property-buyer-panel-quick-email--501").click()
  await expect(page.getByTestId("property-gmail-compose-dialog")).toBeVisible()
}

test.describe("Panda Realty - compose email body editable gap", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaE2eAdminCredentials()
    await setupPage(page)
  })

  test("compose opens with an empty editable paragraph between greeting and signature block", async ({ page }) => {
    await openBuyerCompose(page)

    const html = await composeEditorHtml(page)

    // Greeting paragraph must be present
    expect(html).toContain("Dear Aaron Ross Uren,")

    // Signature block must be present
    expect(html).toContain("Kind Regards")

    // An empty <p> (with <br>) must exist between the greeting and the signature section
    const hasGapParagraph = await page
      .getByTestId("property-gmail-compose-editor")
      .evaluate((editor) => {
        const children = Array.from(editor.children)
        const signatureIdx = children.findIndex(
          (el) => el.getAttribute("data-compose-signature-block") === "true",
        )
        if (signatureIdx <= 0) return false
        const beforeSig = children[signatureIdx - 1]
        if (!beforeSig) return false
        // The element before the signature must be an empty editable paragraph
        const isEmptyP =
          beforeSig.tagName === "P" &&
          beforeSig.getAttribute("contenteditable") !== "false" &&
          (!beforeSig.textContent?.trim() || beforeSig.innerHTML === "<br>")
        return isEmptyP
      })

    expect(hasGapParagraph).toBe(true)
  })

  test("user can insert text into the empty body area between greeting and signature", async ({ page }) => {
    await openBuyerCompose(page)

    // Place cursor in gap paragraph and insert text via execCommand (avoids Playwright hit-test interception)
    await page
      .getByTestId("property-gmail-compose-editor")
      .evaluate((editor) => {
        const children = Array.from(editor.children)
        const signatureIdx = children.findIndex(
          (el) => el.getAttribute("data-compose-signature-block") === "true",
        )
        if (signatureIdx <= 0) return
        const gapParagraph = children[signatureIdx - 1] as HTMLElement
        editor.focus()
        const range = document.createRange()
        range.setStart(gapParagraph, 0)
        range.collapse(true)
        const selection = window.getSelection()
        selection?.removeAllRanges()
        selection?.addRange(range)
        document.execCommand("insertText", false, "Please find the details attached.")
      })

    const html = await composeEditorHtml(page)
    expect(html).toContain("Please find the details attached.")
    expect(html).toContain("Dear Aaron Ross Uren,")
    expect(html).toContain("Kind Regards")
  })

  test("typed body content appears between greeting and signature in the editor DOM order", async ({ page }) => {
    await openBuyerCompose(page)

    // Insert text via execCommand to avoid Playwright hit-test interception
    const bodyOrder = await page
      .getByTestId("property-gmail-compose-editor")
      .evaluate((editor) => {
        const children = Array.from(editor.children)
        const signatureIdx = children.findIndex(
          (el) => el.getAttribute("data-compose-signature-block") === "true",
        )
        if (signatureIdx <= 0) return null
        const gapParagraph = children[signatureIdx - 1] as HTMLElement
        editor.focus()
        const range = document.createRange()
        range.setStart(gapParagraph, 0)
        range.collapse(true)
        const sel = window.getSelection()
        sel?.removeAllRanges()
        sel?.addRange(range)
        document.execCommand("insertText", false, "Inspection scheduled for Monday.")

        const text = (editor as HTMLElement).innerText
        const greetingIdx = text.indexOf("Dear Aaron Ross Uren,")
        const bodyIdx = text.indexOf("Inspection scheduled for Monday.")
        const sigIdx = text.indexOf("Kind Regards")
        return { greetingFirst: greetingIdx < bodyIdx, bodyBeforeSig: bodyIdx < sigIdx }
      })

    expect(bodyOrder).not.toBeNull()
    expect(bodyOrder!.greetingFirst).toBe(true)
    expect(bodyOrder!.bodyBeforeSig).toBe(true)
  })

  test("removing signature still leaves an empty editable line below the greeting", async ({ page }) => {
    await openBuyerCompose(page)

    // Use dispatchEvent to bypass hit-test interception from the property dialog
    await page
      .getByTestId("property-gmail-compose-include-signature")
      .dispatchEvent("click")

    const html = await composeEditorHtml(page)

    // Greeting must still be present
    expect(html).toContain("Dear Aaron Ross Uren,")
    // Signature must be gone
    expect(html).not.toContain("Kind Regards")

    // The editor must still have at least one editable paragraph below the greeting
    const hasEditableArea = await page
      .getByTestId("property-gmail-compose-editor")
      .evaluate((editor) => {
        const paragraphs = Array.from(editor.querySelectorAll("p"))
        // At least one paragraph must be non-greeted and editable
        const emptyOrBodyP = paragraphs.find(
          (p) =>
            !p.textContent?.includes("Dear ") &&
            p.getAttribute("contenteditable") !== "false",
        )
        return emptyOrBodyP != null
      })

    expect(hasEditableArea).toBe(true)
  })

  test("no-signature case: user can type in the empty area below the greeting", async ({ page }) => {
    await openBuyerCompose(page)

    await page
      .getByTestId("property-gmail-compose-include-signature")
      .dispatchEvent("click")

    // Insert text via execCommand in the last editable paragraph
    await page.getByTestId("property-gmail-compose-editor").evaluate((editor) => {
      const paragraphs = Array.from(editor.querySelectorAll("p")).filter(
        (p) => p.getAttribute("contenteditable") !== "false",
      )
      const lastP = paragraphs[paragraphs.length - 1] as HTMLElement | undefined
      if (!lastP) return
      editor.focus()
      const range = document.createRange()
      range.setStart(lastP, 0)
      range.collapse(true)
      const sel = window.getSelection()
      sel?.removeAllRanges()
      sel?.addRange(range)
      document.execCommand("insertText", false, "No signature body text here.")
    })

    const html = await composeEditorHtml(page)
    expect(html).toContain("No signature body text here.")
    expect(html).toContain("Dear Aaron Ross Uren,")
  })

  test("switching signature preserves typed body and maintains editable gap before new signature", async ({ page }) => {
    const { signatures } = await setupPage(page, {
      signIn: false,
      signatures: [
        makeSignature(),
        makeSignature({
          id: 2,
          name: "Richard promo",
          isDefault: false,
          htmlContent: `<p>Warm regards,</p><p>Richard Falzon</p>`,
          renderedHtml: `<p>Warm regards,</p><p>Richard Falzon</p>`,
        }),
      ],
    })

    await openBuyerCompose(page)

    // Type body content via execCommand to avoid hit-test interception
    await page.getByTestId("property-gmail-compose-editor").evaluate((editor) => {
      const children = Array.from(editor.children)
      const signatureIdx = children.findIndex(
        (el) => el.getAttribute("data-compose-signature-block") === "true",
      )
      if (signatureIdx <= 0) return
      const gapParagraph = children[signatureIdx - 1] as HTMLElement
      editor.focus()
      const range = document.createRange()
      range.setStart(gapParagraph, 0)
      range.collapse(true)
      const sel = window.getSelection()
      sel?.removeAllRanges()
      sel?.addRange(range)
      document.execCommand("insertText", false, "Offer accepted, pending finance.")
    })

    // Switch signature via dispatchEvent to bypass hit-test interception
    await page.getByTestId("property-gmail-compose-signature-select").dispatchEvent("click")
    await page.getByRole("option", { name: "Richard promo" }).dispatchEvent("click")

    const html = await composeEditorHtml(page)
    // Body content preserved
    expect(html).toContain("Offer accepted, pending finance.")
    // New signature present, old gone
    expect(html).toContain("Warm regards,")
    expect(html).not.toContain("Kind Regards")

    // Gap paragraph still exists before new signature
    const hasGap = await page
      .getByTestId("property-gmail-compose-editor")
      .evaluate((editor) => {
        const children = Array.from(editor.children)
        const signatureIdx = children.findIndex(
          (el) => el.getAttribute("data-compose-signature-block") === "true",
        )
        if (signatureIdx <= 0) return false
        const beforeSig = children[signatureIdx - 1]
        return beforeSig?.getAttribute("contenteditable") !== "false"
      })

    expect(hasGap).toBe(true)
    void signatures
  })

  test("compose opens with empty editable paragraph when no signatures exist", async ({ page }) => {
    await setupPage(page, { signIn: false, signatures: [] })
    await openBuyerCompose(page)

    const html = await composeEditorHtml(page)
    expect(html).toContain("Dear Aaron Ross Uren,")

    // With no signatures, there should still be an editable paragraph after the greeting
    const hasBodyArea = await page
      .getByTestId("property-gmail-compose-editor")
      .evaluate((editor) => {
        const paragraphs = Array.from(editor.querySelectorAll("p"))
        const bodyP = paragraphs.find(
          (p) =>
            !p.textContent?.includes("Dear ") &&
            p.getAttribute("contenteditable") !== "false",
        )
        return bodyP != null
      })

    expect(hasBodyArea).toBe(true)

    // User can type via execCommand to avoid hit-test interception
    await page.getByTestId("property-gmail-compose-editor").evaluate((editor) => {
      const paragraphs = Array.from(editor.querySelectorAll("p")).filter(
        (p) => p.getAttribute("contenteditable") !== "false",
      )
      const lastP = paragraphs[paragraphs.length - 1] as HTMLElement | undefined
      if (!lastP) return
      editor.focus()
      const range = document.createRange()
      range.setStart(lastP, 0)
      range.collapse(true)
      const sel = window.getSelection()
      sel?.removeAllRanges()
      sel?.addRange(range)
      document.execCommand("insertText", false, "No signature, just the body.")
    })
    await expect(page.getByTestId("property-gmail-compose-editor")).toContainText(
      "No signature, just the body.",
    )
  })
})
