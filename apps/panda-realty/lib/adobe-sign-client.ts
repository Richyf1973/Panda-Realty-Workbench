import "server-only"

import { getDriveAccessToken, downloadDriveFile } from "@/lib/google-drive-client"

// IMS session-based auth — Richard's account is on Creative Cloud Pro with Sign integrated
// into DC Web; the classic OAuth app admin is inaccessible. We use the IMS implicit flow
// with prompt=none, which silently issues a 1-hour token as long as the IMS session is valid.
// When the session expires (weeks), re-run the Playwright setup to refresh ADOBE_SIGN_IMS_SID.

const SIGN_SCOPE = [
  "AdobeID",
  "openid",
  "agreement_send",
  "agreement_read",
  "agreement_write",
  "agreement_sign",
  "sign_user_read",
  "sign_user_write",
  "sign_library_read",
  "sign_library_write",
  "widget_read",
  "widget_write",
  "workflow_read",
  "workflow_write",
  "sao.ACOM_ESIGN_TRIAL",
].join(",")

const REDIRECT_URI =
  "https://gps.echosign.com/public/adobeIDLogin?server=secure.au1.adobesign.com&isAdobeSignAuth=false&port=443"

const TOKEN_CACHE_TTL_MS = 55 * 60 * 1000 // 55 min: tokens last 1 hr, 5 min safety buffer

let cachedToken: string | null = null
let tokenExpiry = 0

function isMockMode() {
  return process.env.ADOBE_SIGN_TEST_MODE === "true"
}

function getBaseUrl() {
  if (process.env.ADOBE_SIGN_USE_SANDBOX === "true") {
    return (
      process.env.ADOBE_SIGN_SANDBOX_BASE_URL ??
      "https://api.na1.adobesign.com/api/rest/v6"
    )
  }
  return process.env.ADOBE_SIGN_BASE_URL ?? "https://api.au1.documents.adobe.com/api/rest/v6"
}

function getImsSid() {
  if (process.env.ADOBE_SIGN_USE_SANDBOX === "true") {
    return process.env.ADOBE_SIGN_SANDBOX_IMS_SID
  }
  return process.env.ADOBE_SIGN_IMS_SID
}

export async function getAccessToken(): Promise<string> {
  if (isMockMode()) return "test-token-mock"

  if (cachedToken && Date.now() < tokenExpiry) return cachedToken

  const imsSid = getImsSid()
  if (!imsSid) throw new Error("ADOBE_SIGN_IMS_SID is not configured")

  const token = await fetchTokenViaSilentFlow(imsSid)
  cachedToken = token
  tokenExpiry = Date.now() + TOKEN_CACHE_TTL_MS
  return token
}

async function fetchTokenViaSilentFlow(imsSid: string): Promise<string> {
  const params = new URLSearchParams({
    client_id: "EchoSign2",
    scope: SIGN_SCOPE,
    response_type: "token",
    prompt: "none",
    redirect_uri: REDIRECT_URI,
  })

  let url = `https://ims-na1.adobelogin.com/ims/authorize/v2?${params}`

  for (let i = 0; i < 12; i++) {
    const isServicesDomain = new URL(url).hostname.endsWith(".services.adobe.com")
    const res = await fetch(url, {
      redirect: "manual",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; PandaRealty/1.0)",
        ...(isServicesDomain ? { Cookie: `ims_sid=${imsSid}` } : {}),
      },
    })

    const location = res.headers.get("location")

    // The IMS may return a 200 with a <meta http-equiv="refresh"> instead of a 3xx redirect.
    // Parse the meta-refresh URL and treat it as the next redirect target.
    if (!location) {
      const body = await res.text()
      const metaMatch = body.match(/content="0;url=([^"]+)"/)
      if (!metaMatch) throw new Error("IMS redirect chain ended without a token")
      const metaUrl = metaMatch[1].replace(/&amp;/g, "&")
      const hashIdx = metaUrl.indexOf("#")
      if (hashIdx !== -1) {
        const token = new URLSearchParams(metaUrl.slice(hashIdx + 1)).get("access_token")
        if (token) return token
      }
      url = metaUrl
      continue
    }

    const hashIdx = location.indexOf("#")
    if (hashIdx !== -1) {
      const token = new URLSearchParams(location.slice(hashIdx + 1)).get("access_token")
      if (token) return token
    }

    url = location.startsWith("http") ? location : new URL(location, url).toString()
  }

  throw new Error("Adobe Sign token refresh failed: redirect limit exceeded")
}

export async function checkAdobeSignHealth(): Promise<{ healthy: boolean; error?: string }> {
  if (isMockMode()) return { healthy: true }

  try {
    const token = await getAccessToken()
    const res = await fetch(`${getBaseUrl()}/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return { healthy: false, error: `Adobe Sign API returned ${res.status}` }
    return { healthy: true }
  } catch (err) {
    return { healthy: false, error: err instanceof Error ? err.message : "Unknown error" }
  }
}

// ── Agreement functions ───────────────────────────────────────────────────────
// createAgreement: implemented Phase 3d. Remaining stubs implemented in Phase 3f.

export async function createAgreement(
  fileId: string,
  signerEmail: string,
): Promise<{ agreementId: string }> {
  if (isMockMode()) return { agreementId: `TEST-AGR-${fileId}` }

  let driveToken: string
  try {
    driveToken = await getDriveAccessToken()
  } catch {
    throw new Error("Google Drive is not connected. Please reconnect your Google account to enable e-signatures.")
  }

  const file = await downloadDriveFile(driveToken, fileId)

  const signToken = await getAccessToken()
  const baseUrl = getBaseUrl()

  const formData = new FormData()
  formData.append("File", new Blob([new Uint8Array(file.data)], { type: file.mimeType }), file.name)
  formData.append("File-Name", file.name)
  formData.append("Mime-Type", file.mimeType)

  const transientRes = await fetch(`${baseUrl}/transientDocuments`, {
    method: "POST",
    headers: { Authorization: `Bearer ${signToken}` },
    body: formData,
  })

  if (!transientRes.ok) {
    const body = await transientRes.text()
    throw new Error(`Adobe Sign transient upload failed (${transientRes.status}): ${body}`)
  }

  const { transientDocumentId } = (await transientRes.json()) as { transientDocumentId: string }

  const agreementRes = await fetch(`${baseUrl}/agreements`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${signToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fileInfos: [{ transientDocumentId }],
      name: file.name,
      participantSetsInfo: [
        {
          memberInfos: [{ email: signerEmail }],
          order: 1,
          role: "SIGNER",
        },
      ],
      signatureType: "ESIGN",
      state: "IN_PROCESS",
    }),
  })

  if (!agreementRes.ok) {
    const body = await agreementRes.text()
    throw new Error(`Adobe Sign agreement creation failed (${agreementRes.status}): ${body}`)
  }

  const { id } = (await agreementRes.json()) as { id: string }
  return { agreementId: id }
}

export async function getAgreementStatus(
  agreementId: string,
): Promise<{ status: string }> {
  if (isMockMode()) return { status: "OUT_FOR_SIGNATURE" }

  const token = await getAccessToken()
  const res = await fetch(`${getBaseUrl()}/agreements/${encodeURIComponent(agreementId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Adobe Sign getAgreementStatus failed (${res.status}): ${body}`)
  }

  const data = (await res.json()) as { status: string }
  return { status: data.status }
}

export async function getSigningUrl(agreementId: string): Promise<string> {
  if (isMockMode()) return "/test/fake-signing-page"

  const token = await getAccessToken()
  const res = await fetch(`${getBaseUrl()}/agreements/${encodeURIComponent(agreementId)}/signingUrls`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Adobe Sign getSigningUrl failed (${res.status}): ${body}`)
  }

  const data = (await res.json()) as {
    signingUrlSetInfos: Array<{ signingUrls: Array<{ esignUrl: string }> }>
  }
  const url = data.signingUrlSetInfos?.[0]?.signingUrls?.[0]?.esignUrl
  if (!url) throw new Error("Adobe Sign returned no signing URL")
  return url
}

export async function sendReminder(
  agreementId: string,
): Promise<{ result: string }> {
  if (isMockMode()) return { result: "REMINDER_SENT" }

  const token = await getAccessToken()
  const baseUrl = getBaseUrl()

  // v6 API requires explicit recipientParticipantIds — fetch them first
  const membersRes = await fetch(`${baseUrl}/agreements/${encodeURIComponent(agreementId)}/members`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!membersRes.ok) {
    const body = await membersRes.text()
    throw new Error(`Adobe Sign getMembers failed (${membersRes.status}): ${body}`)
  }
  const membersData = (await membersRes.json()) as {
    participantSets: Array<{ memberInfos: Array<{ id: string }> }>
  }
  const recipientParticipantIds = membersData.participantSets.flatMap((s) =>
    s.memberInfos.map((m) => m.id),
  )

  const res = await fetch(`${baseUrl}/agreements/${encodeURIComponent(agreementId)}/reminders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status: "ACTIVE", recipientParticipantIds }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Adobe Sign sendReminder failed (${res.status}): ${body}`)
  }

  return { result: "REMINDER_SENT" }
}

export async function cancelAgreement(
  agreementId: string,
): Promise<{ result: string }> {
  if (isMockMode()) return { result: "AGREEMENT_CANCELLED" }

  const token = await getAccessToken()
  const res = await fetch(`${getBaseUrl()}/agreements/${encodeURIComponent(agreementId)}/state`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      state: "CANCELLED",
      agreementCancellationInfo: { comment: "Cancelled by agent", notifyOthers: true },
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Adobe Sign cancelAgreement failed (${res.status}): ${body}`)
  }

  return { result: "AGREEMENT_CANCELLED" }
}

// Minimal 1-byte PDF — valid enough for tests; never shown to a real user in mock mode
const MOCK_PDF = Buffer.from(
  "%PDF-1.0\n1 0 obj<</Type /Catalog /Pages 2 0 R>>endobj " +
  "2 0 obj<</Type /Pages /Kids [3 0 R]/Count 1>>endobj " +
  "3 0 obj<</Type /Page /MediaBox [0 0 3 3]>>endobj\n" +
  "xref\n0 4\n0000000000 65535 f\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n9\n%%EOF",
)

export async function downloadSignedDocument(agreementId: string): Promise<ArrayBuffer> {
  if (isMockMode()) return MOCK_PDF.buffer.slice(MOCK_PDF.byteOffset, MOCK_PDF.byteOffset + MOCK_PDF.byteLength)

  const token = await getAccessToken()
  const res = await fetch(`${getBaseUrl()}/agreements/${encodeURIComponent(agreementId)}/combinedDocument`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Adobe Sign combinedDocument download failed (${res.status}): ${body}`)
  }

  return res.arrayBuffer()
}
