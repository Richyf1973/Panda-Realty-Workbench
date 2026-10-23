// Run: npm run test:e2e:scratch -- --app=panda-realty --spec="apps/panda-realty/e2e/adobe-sign-phase-3e.spec.ts" --no-bail

import { expect, test } from "@playwright/test"
import { createStory } from "@repo/e2e-utils"

// API-only endpoint — tests use request fixture directly. No browser or screenshots.
const story = createStory({ specUrl: import.meta.url, slug: "adobe-sign-phase-3e" })
story.setWhatWasBuilt(
  "Adobe Sign Phase 3e: public POST /api/webhooks/adobe-sign endpoint that receives Adobe Sign " +
  "event notifications, validates the x-adobesign-clientid header, updates portal_file_sign_requests " +
  "status (signed/cancelled), and downloads the signed PDF to Google Drive on completion. " +
  "Also handles the GET verification handshake required when registering the webhook in Adobe Sign.",
)

const WEBHOOK_PATH = "/api/webhooks/adobe-sign"
const CLIENT_ID = "EchoSign2"
const NONEXISTENT_AGREEMENT_ID = "FAKE-AGR-DOES-NOT-EXIST-99999"

test.afterAll(() => {
  story.write()
})

// ── GET verification ──────────────────────────────────────────────────────────

test.describe("Adobe Sign 3e — GET verification handshake", () => {
  test("GET with valid x-adobesign-clientid header returns 200 and echoes client ID in body", async ({ request }) => {
    const response = await request.get(WEBHOOK_PATH, {
      headers: { "x-adobesign-clientid": CLIENT_ID },
    })
    expect(response.status()).toBe(200)
    const body = await response.json()
    expect(body).toMatchObject({ xAdobeSignClientId: CLIENT_ID })
  })

  test("GET response Content-Type is application/json", async ({ request }) => {
    const response = await request.get(WEBHOOK_PATH, {
      headers: { "x-adobesign-clientid": CLIENT_ID },
    })
    expect(response.status()).toBe(200)
    expect(response.headers()["content-type"]).toMatch(/application\/json/)
  })

  test("GET without x-adobesign-clientid header returns 400", async ({ request }) => {
    const response = await request.get(WEBHOOK_PATH)
    expect(response.status()).toBe(400)
  })
})

// ── POST — error states ───────────────────────────────────────────────────────

test.describe("Adobe Sign 3e — POST error states", () => {
  test("POST with wrong client ID returns 401", async ({ request }) => {
    const response = await request.post(WEBHOOK_PATH, {
      headers: { "x-adobesign-clientid": "WRONG_CLIENT_ID" },
      data: { event: "AGREEMENT_ACTION_COMPLETED", agreement: { id: NONEXISTENT_AGREEMENT_ID } },
    })
    expect(response.status()).toBe(401)
  })

  test("POST without x-adobesign-clientid header returns 401", async ({ request }) => {
    const response = await request.post(WEBHOOK_PATH, {
      data: { event: "AGREEMENT_ACTION_COMPLETED", agreement: { id: NONEXISTENT_AGREEMENT_ID } },
    })
    expect(response.status()).toBe(401)
  })

  test("POST with valid header but malformed JSON returns 400", async ({ request }) => {
    const response = await request.post(WEBHOOK_PATH, {
      headers: {
        "x-adobesign-clientid": CLIENT_ID,
        "content-type": "application/json",
      },
      data: "not-valid-json{{{{",
    })
    expect(response.status()).toBe(400)
  })

  test("POST with valid header but missing agreement.id returns 400", async ({ request }) => {
    const response = await request.post(WEBHOOK_PATH, {
      headers: { "x-adobesign-clientid": CLIENT_ID },
      data: { event: "AGREEMENT_ACTION_COMPLETED" },
    })
    expect(response.status()).toBe(400)
  })
})

// ── POST — happy path (idempotent, unknown agreementId) ───────────────────────

test.describe("Adobe Sign 3e — POST happy path", () => {
  test("POST AGREEMENT_ACTION_COMPLETED with unknown agreementId returns 200 ok (idempotent)", async ({ request }) => {
    const response = await request.post(WEBHOOK_PATH, {
      headers: { "x-adobesign-clientid": CLIENT_ID },
      data: { event: "AGREEMENT_ACTION_COMPLETED", agreement: { id: NONEXISTENT_AGREEMENT_ID } },
    })
    expect(response.status()).toBe(200)
    const body = await response.json()
    expect(body).toMatchObject({ ok: true })
  })

  test("POST AGREEMENT_ACTION_DECLINED with unknown agreementId returns 200 ok (idempotent)", async ({ request }) => {
    const response = await request.post(WEBHOOK_PATH, {
      headers: { "x-adobesign-clientid": CLIENT_ID },
      data: { event: "AGREEMENT_ACTION_DECLINED", agreement: { id: NONEXISTENT_AGREEMENT_ID } },
    })
    expect(response.status()).toBe(200)
    const body = await response.json()
    expect(body).toMatchObject({ ok: true })
  })

  test("POST AGREEMENT_RECALLED with unknown agreementId returns 200 ok (idempotent)", async ({ request }) => {
    const response = await request.post(WEBHOOK_PATH, {
      headers: { "x-adobesign-clientid": CLIENT_ID },
      data: { event: "AGREEMENT_RECALLED", agreement: { id: NONEXISTENT_AGREEMENT_ID } },
    })
    expect(response.status()).toBe(200)
    const body = await response.json()
    expect(body).toMatchObject({ ok: true })
  })

  test("POST with unknown event type returns 200 ok (no-op)", async ({ request }) => {
    const response = await request.post(WEBHOOK_PATH, {
      headers: { "x-adobesign-clientid": CLIENT_ID },
      data: { event: "AGREEMENT_VIEWED", agreement: { id: NONEXISTENT_AGREEMENT_ID } },
    })
    expect(response.status()).toBe(200)
    const body = await response.json()
    expect(body).toMatchObject({ ok: true })
  })
})
