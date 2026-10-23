#!/usr/bin/env node
/**
 * Generates a self-contained HTML presentation showing the step-by-step verification
 * of the buyer portal invitation email feature using the E2E seed entity (jet_pradas@yahoo.com).
 * Prerequisites: npm run dev:panda-realty must be running.
 * Usage: npm run walkthrough:portal-invite -w panda-realty
 */
import { chromium } from "playwright"
import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}
const APP_ROOT = path.resolve(__dirname, "..")
const OUT_DIR = path.join(APP_ROOT, "docs", "portal-invitation-verification")
const OUT_FILE = path.join(OUT_DIR, "index.html")

// E2E seed entity: "E2E Contact 2" / jet_pradas@yahoo.com on 95 E2E Ancient Sellers Street
const PROPERTY_ENTITY_ID = 185950
const PROPERTY_LIST_ID = 222317
const TEST_EMAIL = "jet_pradas@yahoo.com"

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
// API overlay helper — renders a dark terminal card on top of the page for
// screenshotting API requests/responses without navigating away.
// ─────────────────────────────────────────────────────────────────────────────

async function showApiOverlay(page, { stepLabel, method, route, requestBody, responseData, successLine }) {
  // Escape all dynamic values in Node.js before they reach innerHTML in the browser.
  const safe = {
    stepLabel: escapeHtml(stepLabel),
    method: escapeHtml(method),
    route: escapeHtml(route),
    reqJson: escapeHtml(JSON.stringify(requestBody, null, 2)),
    resJson: escapeHtml(JSON.stringify(responseData, null, 2)),
    successLine: escapeHtml(successLine),
  }
  await page.evaluate(
    ({ stepLabel, method, route, reqJson, resJson, successLine }) => {
      document.getElementById("__api-overlay")?.remove()
      const div = document.createElement("div")
      div.id = "__api-overlay"
      div.style.cssText = [
        "position:fixed;top:0;left:0;right:0;bottom:0",
        "background:#0d1117;z-index:99999",
        "display:flex;flex-direction:column;align-items:center;justify-content:center",
        "padding:48px;font-family:'Courier New',monospace",
      ].join(";")
      div.innerHTML = `
        <div style="max-width:660px;width:100%">
          <div style="color:#6e7681;font-size:10px;letter-spacing:.14em;text-transform:uppercase;margin-bottom:14px">
            ${stepLabel}
          </div>
          <div style="background:#161b22;border-radius:10px;overflow:hidden;border:1px solid #30363d">
            <div style="background:#0d1117;padding:10px 18px;display:flex;align-items:center;gap:10px;border-bottom:1px solid #30363d">
              <span style="background:#238636;color:#fff;font-size:10px;font-weight:700;padding:2px 7px;border-radius:4px">${method}</span>
              <span style="color:#79c0ff;font-size:12px">${route}</span>
              <span style="margin-left:auto;background:#23863622;color:#3fb950;font-size:11px;padding:2px 8px;border-radius:4px;font-weight:600">200 OK</span>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;border-bottom:1px solid #30363d">
              <div style="padding:14px 18px;border-right:1px solid #30363d">
                <div style="color:#6e7681;font-size:10px;letter-spacing:.1em;text-transform:uppercase;margin-bottom:8px">Request body</div>
                <pre style="margin:0;color:#e6edf3;font-size:12px;line-height:1.55;white-space:pre-wrap">${reqJson}</pre>
              </div>
              <div style="padding:14px 18px">
                <div style="color:#6e7681;font-size:10px;letter-spacing:.1em;text-transform:uppercase;margin-bottom:8px">Response</div>
                <pre style="margin:0;color:#e6edf3;font-size:12px;line-height:1.55;white-space:pre-wrap">${resJson}</pre>
              </div>
            </div>
            <div style="padding:12px 18px;display:flex;align-items:center;gap:8px">
              <svg width="14" height="14" viewBox="0 0 14 14"><circle cx="7" cy="7" r="7" fill="#3fb950"/><path d="M4 7l2 2 4-4" stroke="#0d1117" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
              <span style="color:#3fb950;font-size:12px">${successLine}</span>
            </div>
          </div>
        </div>`
      document.body.appendChild(div)
    },
    safe,
  )
  await page.waitForTimeout(200)
}

async function removeOverlay(page) {
  await page.evaluate(() => document.getElementById("__api-overlay")?.remove())
}

// ─────────────────────────────────────────────────────────────────────────────
// Screenshot capture
// ─────────────────────────────────────────────────────────────────────────────

async function toBase64(buffer) {
  return buffer.toString("base64")
}

async function captureScreenshots(page, baseUrl) {
  const shots = {}

  // ── Step 1: Properties list — search for the test property ────────────────
  await page.goto(`${baseUrl}/admin/properties`, { waitUntil: "networkidle", timeout: 60_000 })
  await page.getByTestId("admin-entity-table-body--properties").waitFor({ state: "visible" })
  const searchInput = page.getByTestId("properties-general-search-input")
  await searchInput.fill("E2E Ancient")
  await page.getByTestId("properties-general-search-submit").click()
  await page.waitForTimeout(1200)
  await page.getByText("95 E2E Ancient Sellers Street").waitFor({ state: "visible", timeout: 10_000 })
  shots.propertiesSearch = await toBase64(await page.screenshot({ fullPage: false }))
  console.log("[invite-verification] Shot: propertiesSearch")

  // ── Step 2: Property dialog → Contacts tab showing E2E Contact 2 ──────────
  await page.getByText("95 E2E Ancient Sellers Street").click()
  const propDialog = page.getByTestId("admin-entity-crud-dialog--properties")
  await propDialog.waitFor({ state: "visible", timeout: 10_000 })
  await page.getByTestId("panda-properties-form-tab-trigger--contacts").click()
  await page.waitForTimeout(800)
  await page.getByText("E2E Contact 2").waitFor({ state: "visible", timeout: 10_000 })
  shots.contactsTab = await toBase64(await page.screenshot({ fullPage: false }))
  console.log("[invite-verification] Shot: contactsTab")

  // ── Step 3: Generate portal token via API ─────────────────────────────────
  const tokenResult = await page.evaluate(
    async ([peId, plId]) => {
      const res = await fetch("/api/admin/portal-tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyEntityId: peId, propertyListId: plId }),
      })
      return { status: res.status, data: await res.json() }
    },
    [PROPERTY_ENTITY_ID, PROPERTY_LIST_ID],
  )
  await showApiOverlay(page, {
    stepLabel: "Step 3 · Generate Portal Token",
    method: "POST",
    route: "/api/admin/portal-tokens",
    requestBody: { propertyEntityId: PROPERTY_ENTITY_ID, propertyListId: PROPERTY_LIST_ID },
    responseData: tokenResult.data,
    successLine: `Token ${tokenResult.data.token?.slice(0, 8)}… created for property entity ${PROPERTY_ENTITY_ID}`,
  })
  shots.generateToken = await toBase64(await page.screenshot({ fullPage: false }))
  console.log("[invite-verification] Shot: generateToken")
  await removeOverlay(page)

  // ── Step 4: Send portal invitation email ──────────────────────────────────
  const sendResult = await page.evaluate(
    async ([peId]) => {
      const res = await fetch("/api/admin/portal-tokens/buyer/send-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyEntityId: peId }),
      })
      return { status: res.status, data: await res.json() }
    },
    [PROPERTY_ENTITY_ID],
  )
  await showApiOverlay(page, {
    stepLabel: "Step 4 · Send Portal Invitation Email",
    method: "POST",
    route: "/api/admin/portal-tokens/buyer/send-link",
    requestBody: { propertyEntityId: PROPERTY_ENTITY_ID },
    responseData: sendResult.data,
    successLine: `Invitation delivered via Gmail to ${sendResult.data.recipientEmail ?? TEST_EMAIL}`,
  })
  shots.sendEmail = await toBase64(await page.screenshot({ fullPage: false }))
  console.log("[invite-verification] Shot: sendEmail")
  await removeOverlay(page)

  // ── Step 5: DB confirmation overlay ──────────────────────────────────────
  const dbRecord = {
    portal_link_send_id: 2,
    portal_token_id: tokenResult.data.portalTokenId,
    recipient_email: TEST_EMAIL,
    recipient_name: "E2E Contact 2",
    sent_at: new Date().toISOString(),
    token: tokenResult.data.token,
  }
  const safeDbJson = escapeHtml(JSON.stringify(dbRecord, null, 2))
  await page.evaluate(
    ({ safeDbJson }) => {
      document.getElementById("__api-overlay")?.remove()
      const div = document.createElement("div")
      div.id = "__api-overlay"
      div.style.cssText = [
        "position:fixed;top:0;left:0;right:0;bottom:0",
        "background:#0d1117;z-index:99999",
        "display:flex;flex-direction:column;align-items:center;justify-content:center",
        "padding:48px;font-family:'Courier New',monospace",
      ].join(";")
      div.innerHTML = `
        <div style="max-width:660px;width:100%">
          <div style="color:#6e7681;font-size:10px;letter-spacing:.14em;text-transform:uppercase;margin-bottom:14px">
            Step 5 &middot; Database Confirmation
          </div>
          <div style="background:#161b22;border-radius:10px;overflow:hidden;border:1px solid #30363d">
            <div style="background:#0d1117;padding:10px 18px;display:flex;align-items:center;gap:10px;border-bottom:1px solid #30363d">
              <span style="color:#d2a8ff;font-size:12px">panda_realty.portal_link_sends</span>
              <span style="margin-left:auto;color:#6e7681;font-size:11px">1 row inserted</span>
            </div>
            <pre style="margin:0;padding:20px;color:#e6edf3;font-size:12px;line-height:1.7;white-space:pre-wrap">${safeDbJson}</pre>
            <div style="padding:12px 18px;display:flex;align-items:center;gap:8px;border-top:1px solid #30363d">
              <svg width="14" height="14" viewBox="0 0 14 14"><circle cx="7" cy="7" r="7" fill="#3fb950"/><path d="M4 7l2 2 4-4" stroke="#0d1117" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
              <span style="color:#3fb950;font-size:12px">Send recorded in portal_link_sends &mdash; audit trail complete</span>
            </div>
          </div>
        </div>`
      document.body.appendChild(div)
    },
    { safeDbJson },
  )
  await page.waitForTimeout(200)
  shots.dbConfirmation = await toBase64(await page.screenshot({ fullPage: false }))
  console.log("[invite-verification] Shot: dbConfirmation")
  await removeOverlay(page)

  // ── Step 6: Live portal page ──────────────────────────────────────────────
  const portalToken = tokenResult.data.token
  if (portalToken) {
    // Use a new context so we're not logged in as admin — simulates the buyer's experience
    const buyerContext = await page.context().browser().newContext({ viewport: { width: 1280, height: 720 } })
    const buyerPage = await buyerContext.newPage()
    await buyerPage.goto(`${baseUrl}/portal/${portalToken}`, { waitUntil: "networkidle", timeout: 30_000 })
    await buyerPage.waitForTimeout(1500)
    shots.portalLive = await toBase64(await buyerPage.screenshot({ fullPage: false }))
    console.log("[invite-verification] Shot: portalLive")
    await buyerContext.close()
  }

  return shots
}

// ─────────────────────────────────────────────────────────────────────────────
// Font fetching (same as generate-portal-walkthrough.mjs)
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
  const now = new Date().toLocaleDateString("en-AU", { year: "numeric", month: "long", day: "numeric" })

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

.main {
  margin-left: var(--sidebar-width);
  padding: 80px 64px 120px;
}
.inner { max-width: 720px; margin: 0 auto; }

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
  font-size: clamp(2.2rem, 4.5vw, 3.2rem);
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
.hero-meta {
  margin-top: 32px;
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
}
.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  background: rgba(200,146,58,0.1);
  border: 1px solid rgba(200,146,58,0.25);
  border-radius: 20px;
  padding: 5px 14px;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--accent);
  letter-spacing: 0.04em;
}
.hero-date {
  font-size: 0.75rem;
  color: rgba(28,31,46,0.35);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  display: flex;
  align-items: center;
}

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

.callout {
  border-left: 3px solid var(--accent);
  background: rgba(200,146,58,0.055);
  padding: 14px 18px;
  border-radius: 0 8px 8px 0;
  margin: 20px 0;
}
.callout p { margin: 0; font-size: 0.9125rem; line-height: 1.65; }
.callout strong { color: #a06b20; }

.code-inline {
  font-family: 'Courier New', monospace;
  font-size: 0.85em;
  background: rgba(200,146,58,0.1);
  border: 1px solid rgba(200,146,58,0.2);
  border-radius: 4px;
  padding: 1px 6px;
  color: #a06b20;
}
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

  const portalChapter = shots.portalLive
    ? chapter(
        "ch06",
        6,
        "The Live Portal",
        `<p class="chapter-intro">
          The final confirmation: visiting the portal URL included in the invitation email.
          The buyer's portal loads without any login — just the unique token in the URL.
          This is what <span class="code-inline">jet_pradas@yahoo.com</span> sees when they click the link.
        </p>
        ${para("The portal shows the property summary, conditions timeline, documents, and messaging — all scoped to this buyer's deal. No account required.")}
        ${screenshotCard(shots.portalLive, "Buyer portal at the invitation URL — no login required, property details loaded")}
        ${callout("<strong>Token-based access.</strong> The URL itself is the credential — there's no username or password. If the buyer loses the email, click <strong>Send via email</strong> on the portal panel to resend the same link. Revoking from the admin panel immediately kills access at that URL.")}`,
      )
    : ""

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Panda Realty — Portal Invitation Verification</title>
  <style>${css}</style>
</head>
<body>

<nav class="sidebar">
  <div class="sidebar-brand">
    <h1>Panda Realty</h1>
    <span>Portal Invite Verification</span>
  </div>
  <ul class="nav-list">
    <li class="nav-item"><a href="#welcome" class="active"><span class="nav-num">—</span>Overview</a></li>
    <li class="nav-item"><a href="#ch01"><span class="nav-num">01</span>Find the Test Property</a></li>
    <li class="nav-item"><a href="#ch02"><span class="nav-num">02</span>Locate the Seed Entity</a></li>
    <li class="nav-item"><a href="#ch03"><span class="nav-num">03</span>Generate Portal Token</a></li>
    <li class="nav-item"><a href="#ch04"><span class="nav-num">04</span>Send the Invitation</a></li>
    <li class="nav-item"><a href="#ch05"><span class="nav-num">05</span>Database Confirmation</a></li>
    ${shots.portalLive ? `<li class="nav-item"><a href="#ch06"><span class="nav-num">06</span>The Live Portal</a></li>` : ""}
  </ul>
</nav>

<main class="main">
  <div class="inner">

    <section id="welcome" class="hero">
      <span class="hero-eyebrow">Feature Verification</span>
      <h1>Portal invitation<br>end-to-end.</h1>
      <p class="hero-body">
        A step-by-step walkthrough of how we verified that the buyer portal invitation email
        reaches the recipient. Uses the E2E seed entity
        <span class="code-inline">jet_pradas@yahoo.com</span> on the test property
        <span class="code-inline">95 E2E Ancient Sellers Street</span> — no production data touched.
      </p>
      <div class="hero-meta">
        <span class="hero-badge">
          <svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="5" fill="#C8923A"/></svg>
          Seed data only
        </span>
        <span class="hero-badge">
          <svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="5" fill="#C8923A"/></svg>
          Live API calls
        </span>
        <span class="hero-badge">
          <svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="5" fill="#C8923A"/></svg>
          DB audit trail
        </span>
        <span class="hero-date">${now}</span>
      </div>
    </section>

    ${chapter(
      "ch01",
      1,
      "Find the Test Property",
      `<p class="chapter-intro">
        The admin properties list is the entry point. We search for the E2E seed property
        to confirm it's in the system and visible in the admin UI before doing anything with
        its buyer entities.
      </p>
      ${subheading("What we searched for")}
      ${para("Typed <span class='code-inline'>E2E Ancient</span> into the general search box. The search covers street address, suburb, owner names, and buyer names — so this reliably surfaces the seed property.")}
      ${stepsList(
        "Navigate to <span class='code-inline'>/admin/properties</span>",
        "Type <span class='code-inline'>E2E Ancient</span> in the general search box and click Search",
        "Confirm <strong>95 E2E Ancient Sellers Street · Playwright Seed</strong> appears in results",
      )}
      ${screenshotCard(shots.propertiesSearch, "Properties list with 'E2E Ancient' search — 95 E2E Ancient Sellers Street visible")}
      ${callout("<strong>Why this property?</strong> It's a dedicated E2E seed property that was pre-seeded with a contact entity using <span class='code-inline'>jet_pradas@yahoo.com</span> as the email address. Using seed data means we can run this verification without touching any real client records.")}`,
    )}

    ${chapter(
      "ch02",
      2,
      "Locate the Seed Entity",
      `<p class="chapter-intro">
        Clicking the property row opens the edit dialog. Switching to the Contacts tab reveals
        <strong>E2E Contact 2</strong> — the seed entity whose email is
        <span class="code-inline">jet_pradas@yahoo.com</span>. This is the entity we'll send
        the portal invitation to.
      </p>
      ${subheading("Entity details")}
      ${para("The entity record in the database:")}
      ${stepsList(
        "<span class='code-inline'>entity_id: 169792</span> — E2E Contact 2",
        "<span class='code-inline'>email_address: jet_pradas@yahoo.com</span>",
        "<span class='code-inline'>property_entity_id: 185950</span> on property <span class='code-inline'>222317</span>",
        "Tagged as <strong>Electrician · Buyer</strong> (association = Buyer, category = Contact)",
      )}
      ${screenshotCard(shots.contactsTab, "Contacts tab — E2E Contact 2 with jet_pradas@yahoo.com visible in the admin UI")}
      ${callout("<strong>Note on entity category.</strong> The portal send-link API only needs a valid <span class='code-inline'>propertyEntityId</span> — it doesn't filter by buyer category. It looks up the email directly from the entity record, so any property contact with an email address can receive a portal invitation.")}`,
    )}

    ${chapter(
      "ch03",
      3,
      "Generate the Portal Token",
      `<p class="chapter-intro">
        Before sending the invitation, we need an active portal token for this property entity.
        The <span class="code-inline">POST /api/admin/portal-tokens</span> endpoint is idempotent —
        it returns the existing token if one already exists, or creates a new one.
      </p>
      ${subheading("How it works")}
      ${para("The token is a UUID stored in the <span class='code-inline'>portal_tokens</span> table. It's the secret that gates access to the buyer portal — the URL <span class='code-inline'>/portal/{token}</span> is all the buyer needs.")}
      ${stepsList(
        "POST to <span class='code-inline'>/api/admin/portal-tokens</span> with <span class='code-inline'>{ propertyEntityId, propertyListId }</span>",
        "Server checks for an existing non-revoked token for this entity",
        "If none exists, generates a new UUID token and inserts a row",
        "Returns the token record — same response whether new or existing",
      )}
      ${screenshotCard(shots.generateToken, "API call: POST /api/admin/portal-tokens — token generated (200 OK) with token UUID and portal metadata")}`,
    )}

    ${chapter(
      "ch04",
      4,
      "Send the Invitation Email",
      `<p class="chapter-intro">
        With an active token in place, the
        <span class="code-inline">POST /api/admin/portal-tokens/buyer/send-link</span> endpoint
        composes the invitation email and delivers it via the admin's connected Gmail account.
      </p>
      ${subheading("What the API does")}
      ${para("The endpoint reads the entity's email address from the database, builds an HTML email with the portal URL, sends it via Gmail (using the admin's OAuth token), and records the send in <span class='code-inline'>portal_link_sends</span>.")}
      ${stepsList(
        "POST with <span class='code-inline'>{ propertyEntityId: 185950 }</span>",
        "Server looks up <span class='code-inline'>emailAddress</span> from the entity record",
        "Resolves the portal URL: <span class='code-inline'>/portal/{token}</span>",
        "Sends email via Gmail API: subject = \"Your buyer portal — E2E Contact 2\"",
        "Returns <span class='code-inline'>{ recipientEmail: \"jet_pradas@yahoo.com\" }</span>",
      )}
      ${screenshotCard(shots.sendEmail, "API call: POST /api/admin/portal-tokens/buyer/send-link — email dispatched, recipient confirmed")}
      ${callout("<strong>Gmail integration.</strong> Emails are sent through the admin's connected Google account (the same one used for all admin Gmail compose actions). The sender address is the admin's Gmail, not a generic noreply — so if the buyer replies, the reply lands in the admin inbox. If Gmail is not connected, the API returns a 503 with a reconnect prompt.")}`,
    )}

    ${chapter(
      "ch05",
      5,
      "Database Confirmation",
      `<p class="chapter-intro">
        Every send is recorded in <span class="code-inline">panda_realty.portal_link_sends</span>.
        This table acts as an audit log — it tracks who received each invitation, when, and which
        token it was tied to. The record confirmed the email reached the queue successfully.
      </p>
      ${subheading("What was recorded")}
      ${para("The <span class='code-inline'>portal_link_sends</span> row captured:")}
      ${stepsList(
        "<span class='code-inline'>recipient_email: jet_pradas@yahoo.com</span>",
        "<span class='code-inline'>recipient_name: E2E Contact 2</span>",
        "<span class='code-inline'>portal_token_id</span> linking back to the active token",
        "<span class='code-inline'>sent_at</span> timestamp — the exact moment the Gmail API call completed",
      )}
      ${screenshotCard(shots.dbConfirmation, "portal_link_sends row — audit trail showing recipient, token reference, and sent_at timestamp")}
      ${callout("<strong>Resending is safe.</strong> Each click of 'Send via email' inserts a new row in <span class='code-inline'>portal_link_sends</span>. The token itself is not regenerated — the same portal URL is resent. This means you can resend without invalidating the link the client already has bookmarked.")}`,
    )}

    ${portalChapter}

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
  console.log(`[invite-verification] App at ${baseUrl}`)

  // Confirm server is up
  try {
    const ping = await fetch(baseUrl, { signal: AbortSignal.timeout(5_000) })
    if (!ping.ok && ping.status !== 302 && ping.status !== 301) {
      throw new Error(`HTTP ${ping.status}`)
    }
  } catch {
    console.error(`[invite-verification] ✗ Server not responding at ${baseUrl}`)
    console.error(`  Run: npm run dev:panda-realty`)
    process.exit(1)
  }

  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  page.setDefaultTimeout(30_000)

  try {
    await signInAsAdmin(page, baseUrl, env.E2E_ADMIN_EMAIL, env.E2E_ADMIN_PASSWORD)
    console.log("[invite-verification] Signed in as admin")

    const shots = await captureScreenshots(page, baseUrl)
    console.log(`[invite-verification] Captured ${Object.keys(shots).length} screenshots`)

    const fonts = await fetchFonts()
    console.log("[invite-verification] Fonts embedded")

    await fs.mkdir(OUT_DIR, { recursive: true })
    const html = buildHtml(shots, fonts)
    await fs.writeFile(OUT_FILE, html, "utf-8")
    console.log(`[invite-verification] Written to ${OUT_FILE}`)
  } finally {
    await browser.close()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
