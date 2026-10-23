// Run: npm run test:e2e:scratch -- --app=panda-realty --spec="apps/panda-realty/e2e/portal-buyer-add-to-home.spec.ts"

import { expect, test } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { createStory, shotFocused } from "@repo/e2e-utils"

import { requirePandaE2eAdminListLiveEnv, signInAsAdmin } from "./helpers/admin-auth"
import {
  createOrGetSellerToken,
  FIXTURE_A as SELLER_FIXTURE,
} from "./helpers/panda-seller-portal-mocks"

const SHOT_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "screenshots",
  "portal-buyer-add-to-home",
)

const BUYER_FIXTURE = { propertyEntityId: 185969, propertyListId: 202739 }
const BUYER_REVOKE_FIXTURE = { propertyEntityId: 185926, propertyListId: 223439 }

const IPHONE_SAFARI_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 " +
  "(KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1"

const story = createStory({
  specUrl: import.meta.url,
  slug: "portal-buyer-add-to-home",
})
story.setWhatWasBuilt(
  "Adds the Add-to-Home-Screen capability (already on the seller portal) to the buyer portal " +
    "(/portal/[token]). Mounts the shared AddToHomeButton in the PortalPropertySummary header. The web " +
    "manifest + apple-touch-icon were already global, so only the button is new on the buyer side. The " +
    "button is parameterized with a triggerTestId so seller/buyer get distinct trigger testids.",
)

async function createOrGetBuyerToken(
  page: Parameters<typeof signInAsAdmin>[0],
  fixture: { propertyEntityId: number; propertyListId: number },
): Promise<{ token: string; portalTokenId: number }> {
  await signInAsAdmin(page)
  const res = await page.context().request.post("/api/admin/portal-tokens", { data: fixture })
  const body = await res.json()
  return { token: body.token, portalTokenId: body.portalTokenId }
}

let buyerToken = ""
let revokedBuyerToken = ""
let sellerToken = ""

test.beforeAll(async ({ browser }) => {
  requirePandaE2eAdminListLiveEnv()
  const ctx = await browser.newContext()
  const p = await ctx.newPage()
  const a = await createOrGetBuyerToken(p, BUYER_FIXTURE)
  buyerToken = a.token
  const b = await createOrGetBuyerToken(p, BUYER_REVOKE_FIXTURE)
  await p.context().request.patch(`/api/admin/portal-tokens/${b.portalTokenId}`)
  revokedBuyerToken = b.token
  const s = await createOrGetSellerToken(p, SELLER_FIXTURE)
  sellerToken = s.token
  await ctx.close()
})

test.beforeEach(async () => {
  await mkdir(SHOT_DIR, { recursive: true })
})

test.afterAll(() => {
  story.write()
})

// ── Happy path ────────────────────────────────────────────────────────────────

test("MV-1 — Save to Home button is visible in the buyer property summary header", async ({
  page,
}) => {
  test.setTimeout(30_000)
  await page.goto(`/portal/${buyerToken}`)

  const header = page.getByTestId("portal-property-summary")
  await expect(header).toBeVisible({ timeout: 15_000 })
  const button = header.getByTestId("portal-buyer-add-to-home-button")
  await expect(button).toBeVisible()

  await shotFocused(page, header, SHOT_DIR, "01-button-in-header")
  story.addScene({
    title: "01 — Save to Home button in the buyer header",
    images: [join(SHOT_DIR, "01-button-in-header.png")],
    seeing:
      "The buyer property summary header shows the address, dates, and a 'Save to Home' button at the top-right.",
    steps: [
      "Open the buyer portal",
      "The Save to Home button is visible inside the property summary header",
    ],
  })
})

test("MV-2 — clicking the button opens the Add to Home dialog with instructions", async ({
  page,
}) => {
  test.setTimeout(30_000)
  await page.goto(`/portal/${buyerToken}`)

  await page.getByTestId("portal-buyer-add-to-home-button").click()
  const dialog = page.getByTestId("portal-add-to-home-dialog")
  await expect(dialog).toBeVisible({ timeout: 5_000 })
  await expect(dialog).toContainText(/home screen/i)
  await expect(dialog.getByTestId("portal-add-to-home-icon-preview")).toBeVisible()
  await expect(dialog.getByTestId("portal-add-to-home-dismiss")).toBeVisible()

  await shotFocused(page, dialog, SHOT_DIR, "02-dialog-open")
  story.addScene({
    title: "02 — Add to Home dialog (buyer)",
    images: [join(SHOT_DIR, "02-dialog-open.png")],
    seeing:
      "The dialog opens with a home-screen title, icon preview, instructions, and a dismiss control.",
    steps: [
      "Click the Save to Home button",
      "The Add to Home dialog appears with icon, instructions, and Got it",
    ],
  })
})

test("MV-3 — dialog dismisses via Got it and via Escape", async ({ page }) => {
  test.setTimeout(30_000)
  await page.goto(`/portal/${buyerToken}`)

  const open = page.getByTestId("portal-buyer-add-to-home-button")
  const dialog = page.getByTestId("portal-add-to-home-dialog")

  await open.click()
  await expect(dialog).toBeVisible({ timeout: 5_000 })
  await dialog.getByTestId("portal-add-to-home-dismiss").click()
  await expect(dialog).not.toBeVisible({ timeout: 5_000 })

  await open.click()
  await expect(dialog).toBeVisible({ timeout: 5_000 })
  await page.keyboard.press("Escape")
  await expect(dialog).not.toBeVisible({ timeout: 5_000 })
})

// ── Device-detected content ─────────────────────────────────────────────────

test("MV-4 — iOS Safari shows Share to Home Screen steps and no install button", async ({
  browser,
}) => {
  test.setTimeout(30_000)
  const ctx = await browser.newContext({ userAgent: IPHONE_SAFARI_UA })
  const page = await ctx.newPage()
  try {
    await page.goto(`/portal/${buyerToken}`)
    await page.getByTestId("portal-buyer-add-to-home-button").click()
    const dialog = page.getByTestId("portal-add-to-home-dialog")
    await expect(dialog).toBeVisible({ timeout: 5_000 })

    const ios = dialog.getByTestId("portal-add-to-home-instructions-ios")
    await expect(ios).toBeVisible()
    await expect(ios).toContainText(/share/i)
    await expect(ios).toContainText(/add to home screen/i)
    await expect(dialog.getByTestId("portal-add-to-home-install-button")).toHaveCount(0)

    await shotFocused(page, dialog, SHOT_DIR, "04-ios-instructions")
    story.addScene({
      title: "04 — iOS Safari instructions (buyer)",
      images: [join(SHOT_DIR, "04-ios-instructions.png")],
      seeing:
        "Under an iPhone Safari user-agent, the dialog shows the Share to Home Screen steps and no install button.",
      steps: [
        "Open the buyer portal in an iPhone Safari context",
        "Click Save to Home",
        "The dialog shows the iOS Share steps; no install button",
      ],
    })
  } finally {
    await ctx.close()
  }
})

test("MV-5 — Android/Desktop shows menu steps and reveals install button after beforeinstallprompt", async ({
  page,
}) => {
  test.setTimeout(30_000)
  await page.goto(`/portal/${buyerToken}`)

  // Open the dialog first: a successful click proves the component has hydrated,
  // so its beforeinstallprompt listener is attached before we dispatch the event.
  await page.getByTestId("portal-buyer-add-to-home-button").click()
  const dialog = page.getByTestId("portal-add-to-home-dialog")
  await expect(dialog).toBeVisible({ timeout: 5_000 })
  await expect(dialog.getByTestId("portal-add-to-home-instructions-other")).toBeVisible()

  // Simulate a browser that offers native install (Chromium fires beforeinstallprompt).
  await page.evaluate(() => {
    const evt = new Event("beforeinstallprompt") as Event & {
      prompt?: () => Promise<void>
      userChoice?: Promise<{ outcome: string }>
    }
    evt.prompt = () => Promise.resolve()
    evt.userChoice = Promise.resolve({ outcome: "accepted" })
    window.dispatchEvent(evt)
  })

  await expect(dialog.getByTestId("portal-add-to-home-install-button")).toBeVisible()

  await shotFocused(page, dialog, SHOT_DIR, "05-desktop-install")
  story.addScene({
    title: "05 — Android/Desktop install button (buyer)",
    images: [join(SHOT_DIR, "05-desktop-install.png")],
    seeing:
      "On Chromium after a beforeinstallprompt event, the dialog shows menu steps plus a native Install button.",
    steps: [
      "Open the buyer portal on desktop Chromium",
      "A beforeinstallprompt event is available",
      "Click Save to Home; the dialog shows menu steps and an Install button",
    ],
  })
})

// ── Head / icon assets ───────────────────────────────────────────────────────

test("MV-6 — buyer route head exposes manifest + apple-touch-icon with standalone icons", async ({
  page,
}) => {
  test.setTimeout(30_000)
  await page.goto(`/portal/${buyerToken}`)
  await expect(page.getByTestId("portal-shell")).toBeVisible({ timeout: 15_000 })

  const manifestHref = await page.locator('link[rel="manifest"]').first().getAttribute("href")
  expect(manifestHref, "a <link rel=manifest> must be present").toBeTruthy()
  const appleHref = await page
    .locator('link[rel="apple-touch-icon"]')
    .first()
    .getAttribute("href")
  expect(appleHref, "an <link rel=apple-touch-icon> must be present").toBeTruthy()

  const manifest = (await (
    await page.request.get(new URL(manifestHref!, page.url()).toString())
  ).json()) as { display?: string; icons?: Array<{ sizes: string }> }
  expect(manifest.display).toBe("standalone")
  const sizes = (manifest.icons ?? []).map((i) => i.sizes)
  expect(sizes.some((s) => s.includes("192"))).toBeTruthy()
  expect(sizes.some((s) => s.includes("512"))).toBeTruthy()
})

// ── Edge cases ───────────────────────────────────────────────────────────────

test("MV-7 — Save to Home button is hidden when running standalone", async ({ browser }) => {
  test.setTimeout(30_000)
  const ctx = await browser.newContext()
  const page = await ctx.newPage()
  try {
    await page.addInitScript(() => {
      const realMatchMedia = window.matchMedia.bind(window)
      window.matchMedia = (query: string) => {
        if (query.includes("display-mode: standalone")) {
          return {
            matches: true,
            media: query,
            onchange: null,
            addListener: () => {},
            removeListener: () => {},
            addEventListener: () => {},
            removeEventListener: () => {},
            dispatchEvent: () => false,
          } as unknown as MediaQueryList
        }
        return realMatchMedia(query)
      }
      Object.defineProperty(window.navigator, "standalone", {
        configurable: true,
        get: () => true,
      })
    })

    await page.goto(`/portal/${buyerToken}`)
    await expect(page.getByTestId("portal-property-summary")).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId("portal-buyer-add-to-home-button")).toHaveCount(0)
  } finally {
    await ctx.close()
  }
})

test("MV-8 — revoked buyer token shows no longer active and renders no Save to Home button", async ({
  page,
}) => {
  test.setTimeout(30_000)
  await page.goto(`/portal/${revokedBuyerToken}`)

  const revoked = page.getByTestId("portal-revoked")
  await expect(revoked).toBeVisible({ timeout: 15_000 })
  await expect(revoked).toContainText(/no longer active/i)
  await expect(page.getByTestId("portal-buyer-add-to-home-button")).toHaveCount(0)
})

// ── Regression ───────────────────────────────────────────────────────────────

test("MV-9 — seller portal still renders its Save to Home button after the relocation", async ({
  page,
}) => {
  test.setTimeout(30_000)
  await page.goto(`/portal/seller/${sellerToken}?tab=summary`)

  const sellerButton = page.getByTestId("portal-seller-add-to-home-button")
  await expect(sellerButton).toBeVisible({ timeout: 15_000 })
  await sellerButton.click()
  await expect(page.getByTestId("portal-add-to-home-dialog")).toBeVisible({ timeout: 5_000 })
})
