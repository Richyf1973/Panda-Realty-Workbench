#!/usr/bin/env node
/**
 * Generates a self-contained HTML walkthrough guide for Richard.
 * Prerequisites: npm run dev:panda-realty must be running.
 * Usage: npm run walkthrough -w panda-realty
 */
import { chromium } from "playwright"
import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const APP_ROOT = path.resolve(__dirname, "..")
const OUT_DIR = path.join(APP_ROOT, "docs", "portal-walkthrough")
const OUT_FILE = path.join(OUT_DIR, "index.html")

// 80 Hollywood Avenue — favourite property, on first page of admin list, accepted offer of $940k
// Used for ALL admin screenshots (seller panel, files, crash dialog, buyer portal, messages)
// and for both buyer and seller portal page screenshots.
// propertyEntityId 185951 = JOHN EDWARD COLLINS (Buyer category)
const PROPERTY_LIST_ID = 202739
const BUYER_PROPERTY_ENTITY_ID = 185951

// Keep legacy aliases so nothing else in the file needs updating
const SELLER_PROPERTY_LIST_ID = PROPERTY_LIST_ID
const BUYER_PROPERTY_LIST_ID = PROPERTY_LIST_ID

// ─────────────────────────────────────────────────────────────────────────────
// Env + auth
// ─────────────────────────────────────────────────────────────────────────────

async function readEnv() {
  const envPath = path.join(APP_ROOT, ".env.local")
  const text = await fs.readFile(envPath, "utf-8")
  const env = {}
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([^#=\s][^=]*)=(.*)$/)
    if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "")
  }
  const required = ["PORT", "E2E_ADMIN_EMAIL", "E2E_ADMIN_PASSWORD"]
  for (const key of required) {
    if (!env[key]) throw new Error(`Missing ${key} in apps/panda-realty/.env.local`)
  }
  return env
}

async function signInAsAdmin(page, baseUrl, email, password) {
  await page.goto(`${baseUrl}/login`, { waitUntil: "domcontentloaded", timeout: 60_000 })
  if (!page.url().includes("/login")) return

  // Wait for React hydration before filling — without this, submit fires a native GET
  await page.waitForFunction(
    () => {
      const el = document.querySelector('[data-testid="login-email-input"]')
      return (
        el !== null &&
        Object.keys(el).some(
          (k) => k.startsWith("__reactProps") || k.startsWith("__reactFiber"),
        )
      )
    },
    { timeout: 30_000 },
  )

  await page.getByTestId("login-email-input").fill(email)
  await page.getByTestId("login-password-input").fill(password)
  await page.getByTestId("login-submit").click()
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 30_000 })
}

// ─────────────────────────────────────────────────────────────────────────────
// Token provisioning
// ─────────────────────────────────────────────────────────────────────────────

async function provisionTokens(page, baseUrl) {
  // POST buyer token for 80 Hollywood Avenue — idempotent, returns existing token if one exists
  const buyerRes = await page.request.post(`${baseUrl}/api/admin/portal-tokens`, {
    data: { propertyEntityId: BUYER_PROPERTY_ENTITY_ID, propertyListId: BUYER_PROPERTY_LIST_ID },
  })
  if (!buyerRes.ok()) throw new Error(`Failed to create buyer token: ${buyerRes.status()}`)
  const buyerData = await buyerRes.json()

  // POST seller token for 99 E2E Seed Street — idempotent
  const sellerRes = await page.request.post(`${baseUrl}/api/admin/portal-tokens/seller`, {
    data: { propertyListId: SELLER_PROPERTY_LIST_ID },
  })
  if (!sellerRes.ok()) throw new Error(`Failed to create seller token: ${sellerRes.status()}`)
  const sellerData = await sellerRes.json()

  // Resolve the buyer's entityId from the propertyEntityId so we can open their workspace dialog
  // directly from the entities admin page (avoids unreliable UI navigation through buyers panel)
  const peRes = await page.request.get(`${baseUrl}/api/admin/property-entities/${BUYER_PROPERTY_ENTITY_ID}`)
  if (!peRes.ok()) throw new Error(`Failed to resolve buyer entityId: ${peRes.status()}`)
  const peData = await peRes.json()
  const buyerEntityId = peData.entityId

  return {
    buyerToken: buyerData.token,
    sellerToken: sellerData.token,
    buyerEntityId,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Screenshot helpers
// ─────────────────────────────────────────────────────────────────────────────

async function toBase64(buffer) {
  return buffer.toString("base64")
}

async function openPropertyDialog(page, baseUrl, propertyListId = null) {
  await page.goto(`${baseUrl}/admin/properties`, { waitUntil: "networkidle", timeout: 60_000 })
  await page.getByTestId("admin-entity-table-body--properties").waitFor({ state: "visible" })

  if (propertyListId) {
    const row = page.getByTestId(`admin-entity-row--properties--${propertyListId}`)
    // If the specific row isn't in the list (e.g. pagination), fall back to first row
    const found = await row.isVisible().catch(() => false)
    if (found) {
      await row.click()
    } else {
      console.log(`[walkthrough] Property ${propertyListId} not visible — using first row`)
      await page.getByTestId(/^admin-entity-row--properties--/).first().click()
    }
  } else {
    await page.getByTestId(/^admin-entity-row--properties--/).first().click()
  }

  await page.getByTestId("admin-entity-crud-dialog--properties").waitFor({ state: "visible" })
}

async function captureAdminScreenshots(page, baseUrl, buyerEntityId) {
  const shots = {}

  // Open property 202739 once — favourite, first page, has accepted offer + buyer entities
  await openPropertyDialog(page, baseUrl, PROPERTY_LIST_ID)

  // ── Seller portal panel (compact mode, under owner details — testId is portal-seller-compact-header)
  const sellerPanel = page.getByTestId("portal-seller-compact-header")
  await sellerPanel.waitFor({ state: "visible", timeout: 15_000 })
  await page.getByTestId("portal-seller-open-btn").waitFor({ state: "visible", timeout: 15_000 })
  shots.adminSellerPanel = await toBase64(await sellerPanel.screenshot())

  // ── Files tab
  await page.getByTestId("panda-properties-form-tab-trigger--files").click()
  await page.waitForTimeout(600)
  const filesPanel = page.getByTestId("panda-properties-form-tab--files")
  await filesPanel.waitFor({ state: "visible" })
  shots.adminFilesPanel = await toBase64(await filesPanel.screenshot())

  // ── Contract Crash dialog (crash btn in Owners section, above tabs)
  const crashBtn = page.getByTestId("portal-seller-crash-btn")
  await crashBtn.scrollIntoViewIfNeeded()
  await crashBtn.waitFor({ state: "visible" })
  await crashBtn.click()
  const crashDialog = page.getByTestId("portal-seller-crash-dialog")
  await crashDialog.waitFor({ state: "visible" })
  shots.adminCrashDialog = await toBase64(await crashDialog.screenshot())
  await page.getByTestId("portal-seller-crash-cancel-btn").click()
  await crashDialog.waitFor({ state: "hidden", timeout: 5_000 })
  await page.waitForTimeout(400)

  // Ensure property dialog is still open after closing crash dialog
  const propDialog = page.getByTestId("admin-entity-crud-dialog--properties")
  const propDialogVisible = await propDialog.isVisible().catch(() => false)
  if (!propDialogVisible) {
    await openPropertyDialog(page, baseUrl, PROPERTY_LIST_ID)
  }

  // ── Buyer portal panel + messages
  // Navigate directly to the entities admin page and open the buyer workspace there.
  // This avoids the unreliable navigation through the properties buyers panel
  // (which varies depending on accepted offer state / data).
  // Navigate to entities page, search for John Collins, then open their buyer workspace
  await page.goto(`${baseUrl}/admin/entities?entityCategoryId=1`, { waitUntil: "domcontentloaded", timeout: 60_000 })
  // Fill search to filter to John Collins
  const searchInput = page.getByPlaceholder(/search/i).first()
  await searchInput.waitFor({ state: "visible", timeout: 15_000 })
  await searchInput.fill("JOHN EDWARD")
  await page.waitForTimeout(1200) // debounce + API fetch
  // Switch to Table view
  const tableBtn = page.getByRole("button", { name: "Table" })
  await tableBtn.waitFor({ state: "visible", timeout: 15_000 })
  await tableBtn.click()
  await page.getByTestId("admin-entity-table-body--entities").waitFor({ state: "visible", timeout: 30_000 })
  // Open the buyer entity via the edit button — testId: admin-entity-row-edit--entities--{id}
  const buyerEditBtn = page.getByTestId(`admin-entity-row-edit--entities--${buyerEntityId}`)
  const buyerEditVisible = await buyerEditBtn.isVisible().catch(() => false)
  if (buyerEditVisible) {
    console.log(`[walkthrough] Found buyer entity ${buyerEntityId} edit button`)
    await buyerEditBtn.click()
  } else {
    console.log(`[walkthrough] Buyer ${buyerEntityId} not found — using first edit btn in filtered results`)
    const firstEdit = page.getByTestId(/^admin-entity-row-edit--entities--/).first()
    await firstEdit.waitFor({ state: "visible", timeout: 10_000 })
    await firstEdit.click()
  }

  const entityDialog = page.getByTestId("admin-entity-crud-dialog--entities")
  await entityDialog.waitFor({ state: "visible", timeout: 15_000 })

  // Portal tab → buyer portal access panel
  // testIdPrefix="portal-access-panel" → url-display testid is portal-access-panel-url-display
  await entityDialog
    .getByTestId("admin-entity-crud-related-tab--property-entities--portal-tab")
    .click()
  await page.waitForTimeout(600)
  const buyerPortalPanel = entityDialog.getByTestId("portal-access-panel")
  await buyerPortalPanel.waitFor({ state: "visible" })
  await buyerPortalPanel.getByTestId("portal-access-panel-url-display").waitFor({ state: "visible", timeout: 15_000 })
  shots.adminBuyerPanel = await toBase64(await buyerPortalPanel.screenshot())

  // Messages tab → dual Buyer/Seller thread panel
  await entityDialog
    .getByTestId("admin-entity-crud-related-tab--property-entities--messages-tab")
    .click()
  await page.waitForTimeout(600)
  const messagesPanel = entityDialog.getByTestId("portal-message-panel")
  await messagesPanel.waitFor({ state: "visible" })
  shots.adminMessagesPanel = await toBase64(await messagesPanel.screenshot())

  return shots
}

async function captureBuyerPortalScreenshots(page, baseUrl, buyerToken) {
  const shots = {}
  const portalBase = `${baseUrl}/portal/${buyerToken}`

  await page.goto(portalBase, { waitUntil: "networkidle", timeout: 30_000 })
  await page.getByTestId("portal-shell").waitFor({ state: "visible" })
  shots.buyerSummary = await toBase64(await page.screenshot({ fullPage: false }))

  await page.goto(`${portalBase}?tab=conditions`, { waitUntil: "networkidle" })
  await page.waitForTimeout(500)
  shots.buyerConditions = await toBase64(await page.screenshot({ fullPage: false }))

  await page.goto(`${portalBase}?tab=documents`, { waitUntil: "networkidle" })
  await page.waitForTimeout(500)
  shots.buyerDocuments = await toBase64(await page.screenshot({ fullPage: false }))

  await page.goto(`${portalBase}?tab=messages`, { waitUntil: "networkidle" })
  await page.waitForTimeout(500)
  shots.buyerMessages = await toBase64(await page.screenshot({ fullPage: false }))

  return shots
}

async function captureSellerPortalScreenshots(page, baseUrl, sellerToken) {
  const shots = {}
  const portalBase = `${baseUrl}/portal/seller/${sellerToken}`

  await page.goto(portalBase, { waitUntil: "networkidle", timeout: 30_000 })
  await page.getByTestId("portal-seller-shell").waitFor({ state: "visible" })
  shots.sellerSummary = await toBase64(await page.screenshot({ fullPage: false }))

  await page.goto(`${portalBase}?tab=offers`, { waitUntil: "networkidle" })
  await page.waitForTimeout(500)
  shots.sellerOffers = await toBase64(await page.screenshot({ fullPage: false }))

  await page.goto(`${portalBase}?tab=messages`, { waitUntil: "networkidle" })
  await page.waitForTimeout(500)
  shots.sellerMessages = await toBase64(await page.screenshot({ fullPage: false }))

  return shots
}

async function captureScreenshots(page, baseUrl, buyerToken, sellerToken, buyerEntityId) {
  const admin = await captureAdminScreenshots(page, baseUrl, buyerEntityId)
  const buyer = await captureBuyerPortalScreenshots(page, baseUrl, buyerToken)
  const seller = await captureSellerPortalScreenshots(page, baseUrl, sellerToken)
  return { ...admin, ...buyer, ...seller }
}

// ─────────────────────────────────────────────────────────────────────────────
// Font fetching
// ─────────────────────────────────────────────────────────────────────────────

async function fetchFonts() {
  const cssUrl =
    "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:ital,wght@0,400;0,500;0,600&display=swap"
  const cssRes = await fetch(cssUrl, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; walkthroughbot/1.0)" },
  })
  let css = await cssRes.text()

  const urlPattern = /url\((https:\/\/fonts\.gstatic\.com[^)]+)\)/g
  const urls = [...css.matchAll(urlPattern)].map((m) => m[1])
  const unique = [...new Set(urls)]

  for (const fontUrl of unique) {
    const fontRes = await fetch(fontUrl)
    const buf = Buffer.from(await fontRes.arrayBuffer())
    const b64 = buf.toString("base64")
    css = css.replaceAll(fontUrl, `data:font/woff2;base64,${b64}`)
  }

  return css
}

// ─────────────────────────────────────────────────────────────────────────────
// HTML assembly
// ─────────────────────────────────────────────────────────────────────────────

function img(b64, alt = "") {
  return `<img src="data:image/png;base64,${b64}" alt="${alt}">`
}

function screenshotCard(b64, caption) {
  return `<div class="screenshot-card">${img(b64, caption)}<p class="screenshot-caption">${caption}</p></div>`
}

function callout(text) {
  return `<div class="callout"><p>${text}</p></div>`
}

function stepsList(...items) {
  const inner = items
    .map(
      (t, i) =>
        `<div class="step"><span class="step-num">${i + 1}</span><span class="step-text">${t}</span></div>`,
    )
    .join("")
  return `<div class="steps">${inner}</div>`
}

function subheading(text) {
  return `<h3 class="section-sub">${text}</h3>`
}

function para(text) {
  return `<p class="section-para">${text}</p>`
}

function chapter(id, num, title, body) {
  const ghost = String(num).padStart(2, "0")
  return `
    <section id="${id}" class="chapter">
      <div class="chapter-header">
        <span class="chapter-ghost">${ghost}</span>
        <h2 class="chapter-title">${title}</h2>
      </div>
      ${body}
    </section>`
}

function buildHtml(shots, fonts) {
  const now = new Date().toLocaleDateString("en-AU", { year: "numeric", month: "long" })

  const css = `
${fonts}

*, *::before, *::after { box-sizing: border-box; }

:root {
  --sidebar-bg: #1C1F2E;
  --accent: #C8923A;
  --canvas: #FDFAF6;
  --text: #1C1F2E;
  --sidebar-width: 280px;
}

html { scroll-behavior: smooth; }

body {
  margin: 0;
  background: var(--canvas);
  color: var(--text);
  font-family: 'DM Sans', system-ui, sans-serif;
  font-size: 16px;
  line-height: 1.6;
}

/* ── Sidebar ─────────────────────────────── */
.sidebar {
  position: fixed;
  left: 0; top: 0;
  width: var(--sidebar-width);
  height: 100vh;
  background: var(--sidebar-bg);
  overflow-y: auto;
  padding: 40px 0;
  box-sizing: border-box;
  z-index: 100;
}
.sidebar-brand {
  padding: 0 32px 32px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
}
.sidebar-brand h1 {
  font-family: 'Playfair Display', serif;
  font-size: 1.05rem;
  color: #fff;
  margin: 0 0 4px;
  letter-spacing: 0.01em;
}
.sidebar-brand span {
  font-size: 0.7rem;
  color: rgba(255,255,255,0.38);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.nav-list { list-style: none; padding: 24px 0; margin: 0; }
.nav-item a {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 11px 32px;
  text-decoration: none;
  color: rgba(255,255,255,0.5);
  font-size: 0.8125rem;
  font-weight: 500;
  transition: color 0.2s, border-color 0.2s, background 0.2s;
  border-left: 3px solid transparent;
}
.nav-item a:hover { color: rgba(255,255,255,0.85); }
.nav-item a.active {
  color: #fff;
  border-left-color: var(--accent);
  background: rgba(255,255,255,0.04);
}
.nav-num {
  font-family: 'Playfair Display', serif;
  font-size: 0.7rem;
  color: var(--accent);
  width: 20px;
  flex-shrink: 0;
  opacity: 0.8;
}

/* ── Main ────────────────────────────────── */
.main {
  margin-left: var(--sidebar-width);
  padding: 80px 64px 120px;
}
.inner { max-width: 720px; margin: 0 auto; }

/* Hero */
.hero {
  padding-bottom: 72px;
  border-bottom: 1px solid rgba(28,31,46,0.1);
  margin-bottom: 88px;
}
.hero-eyebrow {
  font-size: 0.75rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--accent);
  font-weight: 600;
  margin: 0 0 20px;
  display: block;
}
.hero h1 {
  font-family: 'Playfair Display', serif;
  font-size: clamp(2.5rem, 5vw, 3.5rem);
  font-weight: 700;
  line-height: 1.1;
  margin: 0 0 24px;
  color: var(--text);
}
.hero-body {
  font-size: 1.0625rem;
  line-height: 1.75;
  color: #4a4d5e;
  max-width: 560px;
  margin: 0;
}
.hero-date {
  font-size: 0.75rem;
  color: rgba(28,31,46,0.35);
  margin: 40px 0 0;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  display: block;
}

/* Chapters */
.chapter {
  margin-bottom: 100px;
  opacity: 0;
  transform: translateY(24px);
  transition: opacity 0.55s ease, transform 0.55s ease;
}
.chapter.visible { opacity: 1; transform: translateY(0); }

.chapter-header { position: relative; margin-bottom: 28px; padding-top: 20px; }
.chapter-ghost {
  position: absolute;
  top: -48px;
  left: -8px;
  font-family: 'Playfair Display', serif;
  font-size: 148px;
  font-weight: 700;
  color: var(--accent);
  opacity: 0.035;
  line-height: 1;
  user-select: none;
  pointer-events: none;
  white-space: nowrap;
}
.chapter-title {
  font-family: 'Playfair Display', serif;
  font-size: 2.125rem;
  font-weight: 700;
  color: var(--text);
  position: relative;
  z-index: 1;
  margin: 0 0 16px;
  line-height: 1.2;
}
.chapter-intro {
  font-size: 1.0125rem;
  line-height: 1.75;
  color: #4a4d5e;
  margin: 0 0 28px;
}
.section-sub {
  font-family: 'Playfair Display', serif;
  font-size: 1.1rem;
  font-weight: 700;
  margin: 28px 0 12px;
  color: var(--text);
}
.section-para {
  color: #4a4d5e;
  margin: 0 0 12px;
  font-size: 0.9375rem;
  line-height: 1.65;
}

/* Steps */
.steps { margin: 24px 0 28px; }
.step {
  display: flex;
  gap: 14px;
  margin-bottom: 14px;
  align-items: flex-start;
}
.step-num {
  flex-shrink: 0;
  width: 26px; height: 26px;
  border-radius: 50%;
  background: var(--accent);
  color: #fff;
  font-size: 0.75rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 1px;
}
.step-text {
  font-size: 0.9375rem;
  line-height: 1.65;
  color: var(--text);
  padding-top: 3px;
}

/* Screenshots */
.screenshot-card {
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 2px 16px rgba(28,31,46,0.08), 0 8px 32px rgba(28,31,46,0.06);
  overflow: hidden;
  margin: 28px 0;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.screenshot-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 4px 24px rgba(28,31,46,0.12), 0 12px 40px rgba(28,31,46,0.08);
}
.screenshot-card img { width: 100%; display: block; }
.screenshot-caption {
  padding: 12px 20px;
  font-size: 0.8rem;
  color: #888;
  font-style: italic;
  border-top: 1px solid #f0ece6;
}

/* Callout */
.callout {
  border-left: 3px solid var(--accent);
  background: rgba(200,146,58,0.055);
  padding: 14px 18px;
  border-radius: 0 8px 8px 0;
  margin: 20px 0;
}
.callout p { margin: 0; font-size: 0.9125rem; line-height: 1.65; }
.callout strong { color: #a06b20; }
`

  const js = `
const observer = new IntersectionObserver(
  (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible') }),
  { threshold: 0.08 }
)
document.querySelectorAll('.chapter').forEach(el => observer.observe(el))

const spy = new IntersectionObserver(
  (entries) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return
      document.querySelectorAll('.nav-item a').forEach(a => a.classList.remove('active'))
      const link = document.querySelector('.nav-item a[href="#' + e.target.id + '"]')
      if (link) link.classList.add('active')
    })
  },
  { threshold: 0.3 }
)
document.querySelectorAll('section[id], .hero[id]').forEach(s => spy.observe(s))
`

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Panda Realty — Client Portal Guide</title>
  <style>${css}</style>
</head>
<body>

<nav class="sidebar">
  <div class="sidebar-brand">
    <h1>Panda Realty</h1>
    <span>Client Portal Guide</span>
  </div>
  <ul class="nav-list">
    <li class="nav-item"><a href="#welcome" class="active"><span class="nav-num">—</span>Welcome</a></li>
    <li class="nav-item"><a href="#ch01"><span class="nav-num">01</span>Portal Links & Access</a></li>
    <li class="nav-item"><a href="#ch02"><span class="nav-num">02</span>Sharing Documents</a></li>
    <li class="nav-item"><a href="#ch03"><span class="nav-num">03</span>The Buyer's View</a></li>
    <li class="nav-item"><a href="#ch04"><span class="nav-num">04</span>The Seller's View</a></li>
    <li class="nav-item"><a href="#ch05"><span class="nav-num">05</span>Messaging</a></li>
    <li class="nav-item"><a href="#ch06"><span class="nav-num">06</span>When a Deal Falls Through</a></li>
  </ul>
</nav>

<main class="main">
  <div class="inner">

    <section id="welcome" class="hero">
      <span class="hero-eyebrow">Client Portal</span>
      <h1>Your portal,<br>your clients.</h1>
      <p class="hero-body">
        The client portal gives your buyers and sellers their own private window into their deal —
        no login required, no app to install. This guide walks you through everything, from
        sending the first link to handling a contract crash.
      </p>
      <span class="hero-date">Panda Realty · ${now}</span>
    </section>

    ${chapter(
      "ch01",
      1,
      "Generating Portal Links",
      `<p class="chapter-intro">
        Every client gets their own unique, private link — buyers and sellers each have a separate
        one, and neither can see the other's view. You generate these from the admin panel and send
        them however you like: email, SMS, WhatsApp. No login required on the client's end.
      </p>
      ${subheading("For the seller")}
      ${para("The seller portal panel lives in the <strong>Owners section</strong> at the top of the property's edit dialog — it's always visible without clicking into any tab.")}
      ${stepsList(
        "Open the property's edit dialog. Scroll up if needed — the <strong>Seller Portal</strong> panel is in the Owners section, above the tabs.",
        "Click <strong>Generate seller link</strong> — the link appears immediately.",
        "Click <strong>Copy</strong> and paste it into an email or message to your seller.",
        "The panel shows the date and time the seller last opened the link, so you can confirm they've actually viewed it.",
      )}
      ${screenshotCard(shots.adminSellerPanel, "Seller portal access panel — generate, copy, last-accessed timestamp, and revoke")}
      ${subheading("For the buyer")}
      ${para("The buyer's portal link lives inside their profile dialog, under the Portal tab.")}
      ${stepsList(
        "Open the property's edit dialog and go to the <strong>Buyers</strong> tab.",
        "Click <strong>Open Profile</strong> on the relevant buyer — their workspace dialog opens.",
        "Click the <strong>Portal</strong> tab inside the buyer's workspace.",
        "Click <strong>Generate buyer link</strong>, then use <strong>Send via email</strong> to deliver it directly, or <strong>Copy link</strong> to paste it yourself.",
      )}
      ${screenshotCard(shots.adminBuyerPanel, "Buyer portal access panel — URL, Open portal, Copy link, Send via email, and Revoke")}
      ${subheading("Opening the portal yourself")}
      ${para("Both the buyer and seller panels now have an <strong>Open portal</strong> button. Click it to open the client's portal in a new tab — useful to quickly check what they're seeing without copying and pasting the URL.")}
      ${callout("<strong>Links are permanent for the life of the deal.</strong> A portal link stays active for the entire duration — weeks or months — until you explicitly revoke it. Your client bookmarks it once and uses it whenever they want an update. If a client says they've lost their link, just hit <strong>Send via email</strong> to resend it — no new link is generated, the same one is delivered to their inbox.")}`,
    )}

    ${chapter(
      "ch02",
      2,
      "Sharing Documents",
      `<p class="chapter-intro">
        Files you upload don't automatically appear in the portal — you decide exactly what each
        client sees. Every file has two independent toggles: one for the buyer, one for the seller.
        You can share a contract draft with your buyer only, a solicitor's letter with your seller
        only, or flip both on to share the same file with everyone.
      </p>
      ${stepsList(
        "Open the property's edit dialog and go to the <strong>Files</strong> tab.",
        "Find the file you want to share. Each row shows two switches on the right — buyer and seller.",
        "Toggle <strong>Share with buyer</strong>, <strong>Share with seller</strong>, or both.",
        "The file appears in the relevant portal straight away — no refresh needed on their end.",
        "To hide a file again, toggle the switch off. It disappears from the portal immediately.",
      )}
      ${screenshotCard(shots.adminFilesPanel, "Files tab — two independent share toggles per file (buyer left, seller right)")}
      ${callout("<strong>If a client says they can't see a file, check this panel first.</strong> Files are hidden by default even after you upload them — you have to actively switch them on. This is intentional: upload when you have the file, share when you're ready for the client to see it.")}`,
    )}

    ${chapter(
      "ch03",
      3,
      "The Buyer's View",
      `<p class="chapter-intro">
        Here's what your buyer sees the moment they open their link — a clean, no-login portal
        with everything relevant to their purchase. No account to create, no app to install.
        The link works on any device.
      </p>
      ${subheading("Property summary")}
      ${para("The first thing they land on: the property address, type, bedrooms/bathrooms, and the contract and settlement dates. Once an offer is accepted, the dates populate automatically from the offer details.")}
      ${screenshotCard(shots.buyerSummary, "Buyer portal — property summary with address, spec, and key dates")}
      ${subheading("Conditions timeline")}
      ${para("All the contract conditions are listed here with their due dates. A green tick means a condition has been cleared; a clock icon means it's still pending. Your buyer can see at a glance which conditions are still open and exactly how many days are left on each one.")}
      ${screenshotCard(shots.buyerConditions, "Buyer portal — conditions timeline with status indicators and due dates")}
      ${subheading("Documents")}
      ${para("Only the files you've toggled on in the admin Files tab appear here. Your buyer can download any shared file but can't upload their own. If this section is empty, head back to the Files tab and check the share toggles.")}
      ${screenshotCard(shots.buyerDocuments, "Buyer portal — documents tab showing shared files")}
      ${subheading("Messages")}
      ${para("Your buyer types their message here and hits send — you'll get an email notification and can reply from the admin panel. The thread shows the full conversation history. Messages are capped at 2,000 characters, which is plenty for a detailed update.")}
      ${screenshotCard(shots.buyerMessages, "Buyer portal — messages tab with compose area")}`,
    )}

    ${chapter(
      "ch04",
      4,
      "The Seller's View",
      `<p class="chapter-intro">
        The seller's portal shares the same clean design as the buyer's but surfaces additional
        information only relevant to the seller — most importantly, the sale price and the full
        offer history. Their message thread is also completely isolated from the buyer's.
      </p>
      ${subheading("Summary — with sale price")}
      ${para("The sale price row sits prominently at the top of the summary card. Buyers never see this — it only appears in the seller's view. Contract date, settlement date, and property details are shared across both portals.")}
      ${screenshotCard(shots.sellerSummary, "Seller portal — summary showing sale price (buyers never see this row)")}
      ${subheading("Conditions")}
      ${para("The conditions tab mirrors what the buyer sees — same dates, same status indicators. This gives your seller visibility into how the deal is progressing without you needing to call them with every update.")}
      ${subheading("Offers history")}
      ${para("Every offer submitted on the property appears here — amount, submission date, and whether it was accepted, rejected, or lapsed. The currently accepted offer is clearly marked. This gives your seller a complete picture of how the sale came together.")}
      ${screenshotCard(shots.sellerOffers, "Seller portal — full offer history with accepted offer indicator")}
      ${subheading("Messages")}
      ${para("The seller's message thread is completely private — they cannot see buyer messages, and you can't accidentally send a reply into the wrong thread. Each client only ever sees their own conversation with you.")}
      ${screenshotCard(shots.sellerMessages, "Seller portal — private seller message thread (isolated from buyer)")}`,
    )}

    ${chapter(
      "ch05",
      5,
      "Messaging",
      `<p class="chapter-intro">
        When a client sends you a message through their portal, you get an email notification.
        You reply directly from the admin panel — no need to log into the portal or switch
        between systems. Buyer and seller messages live in separate tabs inside the one panel,
        so you always know whose thread you're reading.
      </p>
      ${stepsList(
        "Open the property's edit dialog and go to the <strong>Buyers</strong> tab.",
        "Click <strong>Open Profile</strong> on the relevant buyer — their workspace dialog opens.",
        "Inside the buyer's workspace, click the <strong>Messages</strong> tab.",
        "You'll see two sub-tabs: <strong>Buyer</strong> and <strong>Seller</strong>. A blue dot on a tab means there's an unread message waiting.",
        "Click the relevant tab, type your reply in the text box, and hit <strong>Send</strong>.",
      )}
      ${screenshotCard(shots.adminMessagesPanel, "Admin messages panel — Buyer and Seller tabs, unread dot indicator, reply box")}
      ${callout("<strong>Both threads in one place.</strong> You don't need to open a separate dialog to reply to your seller — just switch tabs within the same Messages panel. The unread dot clears as soon as you open the thread.")}`,
    )}

    ${chapter(
      "ch06",
      6,
      "When a Deal Falls Through",
      `<p class="chapter-intro">
        When a contract crashes and a new buyer comes in, the <strong>Contract Crash</strong>
        button handles the full reset in one go. You don't need to manually revoke links,
        reset document sharing, or juggle tokens — it all happens atomically the moment you confirm.
      </p>
      ${subheading("What Contract Crash does")}
      ${para("Six things happen simultaneously when you confirm:")}
      ${stepsList(
        "<strong>Un-accepts the current offer</strong> — the deal pipeline stage resets to active.",
        "<strong>Revokes the buyer's portal link</strong> — the old buyer's link goes dead immediately. If they try to open it, they'll see an access-revoked page.",
        "<strong>Clears all buyer document shares</strong> — every file that was shared with the buyer is hidden. File toggles are reset to off.",
        "<strong>Revokes the seller's existing portal link</strong> — the old link is killed.",
        "<strong>Generates a new seller portal link</strong> — your seller gets a fresh link ready to send, reflecting the reset deal.",
      )}
      ${screenshotCard(shots.adminCrashDialog, "Contract Crash confirmation dialog — all six actions listed before you confirm")}
      ${subheading("How to trigger it")}
      ${stepsList(
        "Open the property's edit dialog. The <strong>Contract Crash</strong> button is in the Owners section — the same place as the seller portal panel.",
        "Click <strong>Contract Crash</strong>. Read through the confirmation dialog — it lists every action that will happen.",
        "Click <strong>Confirm Contract Crash</strong>.",
        "Copy the seller's new portal link from the Owners section and send it to them.",
        "Once you accept a new offer, the conditions timeline will update automatically for the next buyer.",
      )}
      ${callout("<strong>This can't be undone.</strong> Once you confirm, all six changes happen together — there's no partial rollback. Contract Crash only works when the property has a currently accepted offer; if you see an error, check that the offer is marked as accepted first.")}`,
    )}

  </div>
</main>

<script>${js}</script>
</body>
</html>`
}

// ─────────────────────────────────────────────────────────────────────────────
// Entry point
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  const env = await readEnv()
  const baseUrl = `http://localhost:${env.PORT}`
  console.log(`[walkthrough] App at ${baseUrl}`)

  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  page.setDefaultTimeout(30_000)

  try {
    await signInAsAdmin(page, baseUrl, env.E2E_ADMIN_EMAIL, env.E2E_ADMIN_PASSWORD)
    console.log("[walkthrough] Signed in as admin")

    const { buyerToken, sellerToken, buyerEntityId } = await provisionTokens(page, baseUrl)
    console.log("[walkthrough] Tokens ready:", {
      buyerToken: buyerToken.slice(0, 8) + "...",
      sellerToken: sellerToken.slice(0, 8) + "...",
      buyerEntityId,
    })

    const shots = await captureScreenshots(page, baseUrl, buyerToken, sellerToken, buyerEntityId)
    console.log(`[walkthrough] Captured ${Object.keys(shots).length} screenshots`)

    const fonts = await fetchFonts()
    console.log("[walkthrough] Fonts embedded")

    await fs.mkdir(OUT_DIR, { recursive: true })
    const html = buildHtml(shots, fonts)
    await fs.writeFile(OUT_FILE, html, "utf-8")
    console.log(`[walkthrough] Written to ${OUT_FILE}`)
  } finally {
    await browser.close()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
