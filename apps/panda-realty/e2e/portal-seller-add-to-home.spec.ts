// Run: npm run test:e2e:scratch -- --app=panda-realty --spec="apps/panda-realty/e2e/portal-seller-add-to-home.spec.ts"

import { expect, test } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { createStory, shotFocused } from "@repo/e2e-utils"

import { requirePandaE2eAdminListLiveEnv } from "./helpers/admin-auth"
import {
  createOrGetSellerToken,
  FIXTURE_A,
  FIXTURE_B,
} from "./helpers/panda-seller-portal-mocks"

const SHOT_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "screenshots",
  "portal-seller-add-to-home",
)

const IPHONE_SAFARI_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 " +
  "(KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1"

const story = createStory({
  specUrl: import.meta.url,
  slug: "portal-seller-add-to-home",
})
story.setWhatWasBuilt(
  "Adds an Add-to-Home-Screen capability to the panda-realty seller portal: a 'Save to Home' button in the " +
    "property header card (visible on every tab) that opens a device-detected instructions dialog (iOS Safari: " +
    "Share -> Add to Home Screen; Android/Desktop: native install prompt when available, else menu steps). " +
    "Adds a web manifest and apple-touch-icon (Panda Realty logo on a solid tile) so the saved shortcut to the " +
    "current seller URL is branded. The button hides when already running standalone.",
)

let activeToken = ""
let revokedToken = ""

test.beforeAll(async ({ browser }) => {
  requirePandaE2eAdminListLiveEnv()
  const ctx = await browser.newContext()
  const p = await ctx.newPage()
  const a = await createOrGetSellerToken(p, FIXTURE_A)
  activeToken = a.token
  const b = await createOrGetSellerToken(p, FIXTURE_B)
  await p.context().request.patch(`/api/admin/portal-tokens/${b.portalTokenId}`)
  revokedToken = b.token
  await ctx.close()
})

test.beforeEach(async () => {
  await mkdir(SHOT_DIR, { recursive: true })
})

test.afterAll(() => {
  story.write()
})

// ── Happy path ────────────────────────────────────────────────────────────────

test("MV-1 — Save to Home button is visible in the property header on the summary tab", async ({
  page,
}) => {
  test.setTimeout(30_000)
  await page.goto(`/portal/seller/${activeToken}?tab=summary`)

  const header = page.getByTestId("portal-seller-property-header")
  await expect(header).toBeVisible({ timeout: 10_000 })
  const button = header.getByTestId("portal-seller-add-to-home-button")
  await expect(button).toBeVisible()

  await shotFocused(page, header, SHOT_DIR, "01-button-in-header")
  story.addScene({
    title: "01 — Save to Home button in the property header",
    images: [join(SHOT_DIR, "01-button-in-header.png")],
    seeing:
      "The property header card shows the address, sale price, and a 'Save to Home' button at the top-right.",
    steps: [
      "Open the seller portal summary tab",
      "The Save to Home button is visible inside the property header",
    ],
  })
})

test("MV-2 — Save to Home button stays visible across tabs", async ({ page }) => {
  test.setTimeout(30_000)
  await page.goto(`/portal/seller/${activeToken}?tab=summary`)

  const button = page.getByTestId("portal-seller-add-to-home-button")
  await expect(button).toBeVisible({ timeout: 10_000 })

  await page.getByTestId("portal-seller-tab--conditions").click()
  await expect(button).toBeVisible()
  await page.getByTestId("portal-seller-tab--documents").click()
  await expect(button).toBeVisible()

  await shotFocused(
    page,
    page.getByTestId("portal-seller-property-header"),
    SHOT_DIR,
    "02-button-persists",
  )
  story.addScene({
    title: "02 — Button persists across tabs",
    images: [join(SHOT_DIR, "02-button-persists.png")],
    seeing:
      "After switching to the Conditions and Documents tabs, the header and its Save to Home button remain visible.",
    steps: [
      "Open the seller portal",
      "Switch to the Conditions tab, then the Documents tab",
      "The Save to Home button is still visible in the header",
    ],
  })
})

test("MV-3 — clicking the button opens the Add to Home dialog with instructions", async ({
  page,
}) => {
  test.setTimeout(30_000)
  await page.goto(`/portal/seller/${activeToken}?tab=summary`)

  await page.getByTestId("portal-seller-add-to-home-button").click()
  const dialog = page.getByTestId("portal-add-to-home-dialog")
  await expect(dialog).toBeVisible({ timeout: 5_000 })
  await expect(dialog).toContainText(/home screen/i)
  await expect(dialog.getByTestId("portal-add-to-home-icon-preview")).toBeVisible()
  await expect(dialog.getByTestId("portal-add-to-home-dismiss")).toBeVisible()

  await shotFocused(page, dialog, SHOT_DIR, "03-dialog-open")
  story.addScene({
    title: "03 — Add to Home dialog with instructions",
    images: [join(SHOT_DIR, "03-dialog-open.png")],
    seeing:
      "The dialog opens with a title referencing the home screen, an icon preview, step-by-step instructions, and a dismiss control.",
    steps: [
      "Click the Save to Home button",
      "The Add to Home dialog appears with icon, instructions, and a Got it button",
    ],
  })
})

test("MV-4 — dialog dismisses via Got it and via Escape", async ({ page }) => {
  test.setTimeout(30_000)
  await page.goto(`/portal/seller/${activeToken}?tab=summary`)

  const open = page.getByTestId("portal-seller-add-to-home-button")
  const dialog = page.getByTestId("portal-add-to-home-dialog")

  // Dismiss via Got it
  await open.click()
  await expect(dialog).toBeVisible({ timeout: 5_000 })
  await dialog.getByTestId("portal-add-to-home-dismiss").click()
  await expect(dialog).not.toBeVisible({ timeout: 5_000 })

  // Dismiss via Escape
  await open.click()
  await expect(dialog).toBeVisible({ timeout: 5_000 })
  await page.keyboard.press("Escape")
  await expect(dialog).not.toBeVisible({ timeout: 5_000 })
})

// ── Device-detected content ─────────────────────────────────────────────────

test("MV-5 — iOS Safari shows Share to Home Screen steps and no install button", async ({
  browser,
}) => {
  test.setTimeout(30_000)
  const ctx = await browser.newContext({ userAgent: IPHONE_SAFARI_UA })
  const page = await ctx.newPage()
  try {
    await page.goto(`/portal/seller/${activeToken}?tab=summary`)
    await page.getByTestId("portal-seller-add-to-home-button").click()
    const dialog = page.getByTestId("portal-add-to-home-dialog")
    await expect(dialog).toBeVisible({ timeout: 5_000 })

    const ios = dialog.getByTestId("portal-add-to-home-instructions-ios")
    await expect(ios).toBeVisible()
    await expect(ios).toContainText(/share/i)
    await expect(ios).toContainText(/add to home screen/i)
    await expect(dialog.getByTestId("portal-add-to-home-install-button")).toHaveCount(0)

    await shotFocused(page, dialog, SHOT_DIR, "05-ios-instructions")
    story.addScene({
      title: "05 — iOS Safari instructions",
      images: [join(SHOT_DIR, "05-ios-instructions.png")],
      seeing:
        "Under an iPhone Safari user-agent, the dialog shows the Share -> Add to Home Screen steps and no native install button.",
      steps: [
        "Open the seller portal in an iPhone Safari context",
        "Click Save to Home",
        "The dialog shows the iOS Share to Home Screen steps; no install button",
      ],
    })
  } finally {
    await ctx.close()
  }
})

test("MV-6 — Android/Desktop shows menu steps and reveals install button after beforeinstallprompt", async ({
  page,
}) => {
  test.setTimeout(30_000)
  await page.goto(`/portal/seller/${activeToken}?tab=summary`)

  // Open the dialog first: a successful click proves the component has hydrated,
  // so its beforeinstallprompt listener is attached before we dispatch the event.
  await page.getByTestId("portal-seller-add-to-home-button").click()
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

  await shotFocused(page, dialog, SHOT_DIR, "06-desktop-install")
  story.addScene({
    title: "06 — Android/Desktop install button",
    images: [join(SHOT_DIR, "06-desktop-install.png")],
    seeing:
      "On a Chromium browser after a beforeinstallprompt event, the dialog shows the menu-based steps plus a native Install button.",
    steps: [
      "Open the seller portal on desktop Chromium",
      "A beforeinstallprompt event is available",
      "Click Save to Home; the dialog shows menu steps and an Install button",
    ],
  })
})

// ── Head / icon assets ───────────────────────────────────────────────────────

test("MV-7 — head exposes manifest + apple-touch-icon and manifest declares standalone icons", async ({
  page,
}) => {
  test.setTimeout(30_000)
  await page.goto(`/portal/seller/${activeToken}?tab=summary`)
  await expect(page.getByTestId("portal-seller-shell")).toBeVisible({ timeout: 10_000 })

  const manifestHref = await page.locator('link[rel="manifest"]').first().getAttribute("href")
  expect(manifestHref, "a <link rel=manifest> must be present").toBeTruthy()

  const appleHref = await page
    .locator('link[rel="apple-touch-icon"]')
    .first()
    .getAttribute("href")
  expect(appleHref, "an <link rel=apple-touch-icon> must be present").toBeTruthy()

  const manifestRes = await page.request.get(new URL(manifestHref!, page.url()).toString())
  expect(manifestRes.ok()).toBeTruthy()
  const manifest = (await manifestRes.json()) as {
    name?: string
    display?: string
    icons?: Array<{ src: string; sizes: string }>
  }
  expect(manifest.display).toBe("standalone")
  expect(manifest.name && manifest.name.length).toBeTruthy()
  const sizes = (manifest.icons ?? []).map((i) => i.sizes)
  expect(sizes.some((s) => s.includes("192"))).toBeTruthy()
  expect(sizes.some((s) => s.includes("512"))).toBeTruthy()
})

test("MV-8 — apple-touch-icon and manifest icons return image responses", async ({ page }) => {
  test.setTimeout(30_000)
  await page.goto(`/portal/seller/${activeToken}?tab=summary`)
  await expect(page.getByTestId("portal-seller-shell")).toBeVisible({ timeout: 10_000 })

  const appleHref = await page
    .locator('link[rel="apple-touch-icon"]')
    .first()
    .getAttribute("href")
  const appleRes = await page.request.get(new URL(appleHref!, page.url()).toString())
  expect(appleRes.ok()).toBeTruthy()
  expect(appleRes.headers()["content-type"] ?? "").toMatch(/image\//)

  const manifestHref = await page.locator('link[rel="manifest"]').first().getAttribute("href")
  const manifest = (await (
    await page.request.get(new URL(manifestHref!, page.url()).toString())
  ).json()) as { icons?: Array<{ src: string }> }
  for (const icon of manifest.icons ?? []) {
    const res = await page.request.get(new URL(icon.src, page.url()).toString())
    expect(res.ok(), `icon ${icon.src} should load`).toBeTruthy()
    expect(res.headers()["content-type"] ?? "").toMatch(/image\//)
  }
})

// ── Edge cases ───────────────────────────────────────────────────────────────

test("MV-9 — Save to Home button is hidden when running standalone", async ({ browser }) => {
  test.setTimeout(30_000)
  const ctx = await browser.newContext()
  const page = await ctx.newPage()
  try {
    // Force standalone display-mode + iOS standalone flag before the app mounts.
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

    await page.goto(`/portal/seller/${activeToken}?tab=summary`)
    await expect(page.getByTestId("portal-seller-property-header")).toBeVisible({ timeout: 10_000 })
    await expect(page.getByTestId("portal-seller-add-to-home-button")).toHaveCount(0)
  } finally {
    await ctx.close()
  }
})

test("MV-10 — revoked token shows no longer active and renders no Save to Home button", async ({
  page,
}) => {
  test.setTimeout(30_000)
  await page.goto(`/portal/seller/${revokedToken}?tab=summary`)

  const msg = page.getByTestId("portal-seller-revoked")
  await expect(msg).toBeVisible({ timeout: 5_000 })
  await expect(msg).toContainText(/no longer active/i)
  await expect(page.getByTestId("portal-seller-add-to-home-button")).toHaveCount(0)
})

// ── Persistence ──────────────────────────────────────────────────────────────

test("MV-11 — reload with tab=conditions keeps Conditions active and the button present", async ({
  page,
}) => {
  test.setTimeout(30_000)
  await page.goto(`/portal/seller/${activeToken}?tab=conditions`)

  const conditionsTab = page.getByTestId("portal-seller-tab--conditions")
  await expect(conditionsTab).toBeVisible({ timeout: 10_000 })
  // Active tab styling uses the green underline class.
  await expect(conditionsTab).toHaveClass(/border-green-600/)
  await expect(page.getByTestId("portal-seller-add-to-home-button")).toBeVisible()

  await page.reload()
  await expect(conditionsTab).toHaveClass(/border-green-600/)
  await expect(page.getByTestId("portal-seller-add-to-home-button")).toBeVisible()
})
