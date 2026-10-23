import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// ── module mocks (hoisted) ────────────────────────────────────────────────────

vi.mock("@/lib/auth/session", () => ({
  getSessionUser: vi.fn(),
}))

const mockLimit = vi.fn()
const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit })
const mockFrom = vi.fn().mockReturnValue({ where: mockWhere })
const mockSelect = vi.fn().mockReturnValue({ from: mockFrom })

vi.mock("@/db", () => ({
  db: { select: mockSelect },
}))

vi.mock("@/lib/google-drive-client", () => ({
  getDriveAccessToken: vi.fn(),
  initiateResumableUpload: vi.fn(),
  getOrCreateDriveFolder: vi.fn(),
}))

// ── imports (after mocks) ─────────────────────────────────────────────────────

import { getSessionUser } from "@/lib/auth/session"
import {
  getDriveAccessToken,
  getOrCreateDriveFolder,
  initiateResumableUpload,
} from "@/lib/google-drive-client"

const PARENT_FOLDER_ID = "1_Lb3nBi5s1gwCUZls-R_jus7qMe_NQJ8"
const PROPERTY_FOLDER_ID = "folder-prop-abc"
const UPLOAD_URI = "https://upload.googleapis.com/upload/drive/v3/files?uploadType=resumable&upload_id=test"
const ACCESS_TOKEN = "tok-test"

const PROPERTY_ROW = {
  propertyListId: 1001,
  streetAddress: "42 Test St",
  suburb: "Springwood",
  state: "QLD",
  postcode: "4127",
}

function makeRequest(body: Record<string, unknown>, origin = "http://localhost:3004") {
  return new Request("http://localhost/api/admin/property-list-files/initiate-upload", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify(body),
  })
}

describe("POST /api/admin/property-list-files/initiate-upload", () => {
  beforeEach(() => {
    vi.mocked(getSessionUser).mockResolvedValue({ userId: 1 } as never)
    vi.mocked(getDriveAccessToken).mockResolvedValue(ACCESS_TOKEN)
    vi.mocked(getOrCreateDriveFolder).mockResolvedValue(PROPERTY_FOLDER_ID)
    vi.mocked(initiateResumableUpload).mockResolvedValue(UPLOAD_URI)
    mockLimit.mockResolvedValue([PROPERTY_ROW])
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null)

    const { POST } = await import("./route")
    const res = await POST(makeRequest({ fileName: "f.pdf", mimeType: "application/pdf", fileSize: 1024, propertyListId: 1001 }))

    expect(res.status).toBe(401)
  }, 15_000)

  it("returns 400 when fileName is missing", async () => {
    const { POST } = await import("./route")
    const res = await POST(makeRequest({ mimeType: "application/pdf", fileSize: 1024, propertyListId: 1001 }))

    expect(res.status).toBe(400)
    const body = await res.json() as { error: string }
    expect(body.error).toMatch(/fileName/)
  })

  it("returns 404 when property not found", async () => {
    mockLimit.mockResolvedValue([])

    const { POST } = await import("./route")
    const res = await POST(makeRequest({ fileName: "f.pdf", mimeType: "application/pdf", fileSize: 1024, propertyListId: 9999 }))

    expect(res.status).toBe(404)
  })

  it("calls getOrCreateDriveFolder with property address folder name and parent ID", async () => {
    const { POST } = await import("./route")
    await POST(makeRequest({ fileName: "f.pdf", mimeType: "application/pdf", fileSize: 1024, propertyListId: 1001 }))

    expect(getOrCreateDriveFolder).toHaveBeenCalledWith(
      ACCESS_TOKEN,
      "42 Test St Springwood QLD 4127",
      PARENT_FOLDER_ID,
    )
  })

  it("passes folderId from getOrCreateDriveFolder to initiateResumableUpload", async () => {
    const { POST } = await import("./route")
    await POST(makeRequest({ fileName: "f.pdf", mimeType: "application/pdf", fileSize: 1024, propertyListId: 1001 }))

    expect(initiateResumableUpload).toHaveBeenCalledWith(
      ACCESS_TOKEN,
      "f.pdf",
      "application/pdf",
      1024,
      "http://localhost:3004",
      PROPERTY_FOLDER_ID,
    )
  })

  it("returns uploadUri on success", async () => {
    const { POST } = await import("./route")
    const res = await POST(makeRequest({ fileName: "f.pdf", mimeType: "application/pdf", fileSize: 1024, propertyListId: 1001 }))

    expect(res.status).toBe(200)
    const body = await res.json() as { uploadUri: string }
    expect(body.uploadUri).toBe(UPLOAD_URI)
  })

  it("returns 503 when Drive credentials are not connected", async () => {
    vi.mocked(getDriveAccessToken).mockRejectedValue(new Error("no token"))

    const { POST } = await import("./route")
    const res = await POST(makeRequest({ fileName: "f.pdf", mimeType: "application/pdf", fileSize: 1024, propertyListId: 1001 }))

    expect(res.status).toBe(503)
  })
})
