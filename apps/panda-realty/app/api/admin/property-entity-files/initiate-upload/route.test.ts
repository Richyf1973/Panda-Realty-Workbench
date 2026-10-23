import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// ── module mocks (hoisted) ────────────────────────────────────────────────────

vi.mock("@/lib/auth/session", () => ({
  getSessionUser: vi.fn(),
}))

// Drizzle chain: .from().innerJoin().leftJoin().where().limit()
const mockLimit = vi.fn()
const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit })
const mockLeftJoin = vi.fn().mockReturnValue({ where: mockWhere })
const mockInnerJoin = vi.fn().mockReturnValue({ leftJoin: mockLeftJoin, where: mockWhere })
const mockFrom = vi.fn().mockReturnValue({ where: mockWhere, innerJoin: mockInnerJoin })
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
const PROPERTY_FOLDER_ID = "folder-prop-xyz"
const ENTITY_FOLDER_ID = "folder-entity-xyz"
const UPLOAD_URI = "https://upload.googleapis.com/upload/drive/v3/files?uploadType=resumable&upload_id=ent"
const ACCESS_TOKEN = "tok-entity"

// Entity linked to a property
const LINKED_ENTITY_ROW = {
  propertyEntityId: 501,
  entityName: "Test Buyer LLC",
  propertyListId: 1001,
  streetAddress: "42 Test St",
  suburb: "Springwood",
  state: "QLD",
  postcode: "4127",
}

// Entity with no property link
const UNLINKED_ENTITY_ROW = {
  propertyEntityId: 502,
  entityName: "Jane Doe",
  propertyListId: null,
  streetAddress: null,
  suburb: null,
  state: null,
  postcode: null,
}

function makeRequest(body: Record<string, unknown>, origin = "http://localhost:3004") {
  return new Request("http://localhost/api/admin/property-entity-files/initiate-upload", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify(body),
  })
}

describe("POST /api/admin/property-entity-files/initiate-upload", () => {
  beforeEach(() => {
    vi.mocked(getSessionUser).mockResolvedValue({ userId: 1 } as never)
    vi.mocked(getDriveAccessToken).mockResolvedValue(ACCESS_TOKEN)
    vi.mocked(getOrCreateDriveFolder).mockResolvedValue(ENTITY_FOLDER_ID)
    vi.mocked(initiateResumableUpload).mockResolvedValue(UPLOAD_URI)
    mockLimit.mockResolvedValue([LINKED_ENTITY_ROW])
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null)

    const { POST } = await import("./route")
    const res = await POST(makeRequest({ fileName: "f.pdf", mimeType: "application/pdf", fileSize: 1024, propertyEntityId: 501 }))

    expect(res.status).toBe(401)
  }, 15_000)

  it("returns 400 when propertyEntityId is missing", async () => {
    const { POST } = await import("./route")
    const res = await POST(makeRequest({ fileName: "f.pdf", mimeType: "application/pdf", fileSize: 1024 }))

    expect(res.status).toBe(400)
    const body = await res.json() as { error: string }
    expect(body.error).toMatch(/propertyEntityId/)
  })

  it("creates property subfolder then entity subfolder when entity is property-linked", async () => {
    vi.mocked(getOrCreateDriveFolder)
      .mockResolvedValueOnce(PROPERTY_FOLDER_ID)   // first call: property folder
      .mockResolvedValueOnce(ENTITY_FOLDER_ID)      // second call: entity subfolder

    const { POST } = await import("./route")
    await POST(makeRequest({ fileName: "f.pdf", mimeType: "application/pdf", fileSize: 1024, propertyEntityId: 501 }))

    expect(getOrCreateDriveFolder).toHaveBeenNthCalledWith(
      1,
      ACCESS_TOKEN,
      "42 Test St Springwood QLD 4127",
      PARENT_FOLDER_ID,
    )
    expect(getOrCreateDriveFolder).toHaveBeenNthCalledWith(
      2,
      ACCESS_TOKEN,
      "Test Buyer LLC",
      PROPERTY_FOLDER_ID,
    )
  })

  it("creates entity subfolder directly under parent when entity has no property link", async () => {
    mockLimit.mockResolvedValue([UNLINKED_ENTITY_ROW])
    vi.mocked(getOrCreateDriveFolder).mockResolvedValue(ENTITY_FOLDER_ID)

    const { POST } = await import("./route")
    await POST(makeRequest({ fileName: "f.pdf", mimeType: "application/pdf", fileSize: 1024, propertyEntityId: 502 }))

    expect(getOrCreateDriveFolder).toHaveBeenCalledTimes(1)
    expect(getOrCreateDriveFolder).toHaveBeenCalledWith(
      ACCESS_TOKEN,
      "Jane Doe",
      PARENT_FOLDER_ID,
    )
  })

  it("passes entity folder ID to initiateResumableUpload", async () => {
    vi.mocked(getOrCreateDriveFolder)
      .mockResolvedValueOnce(PROPERTY_FOLDER_ID)
      .mockResolvedValueOnce(ENTITY_FOLDER_ID)

    const { POST } = await import("./route")
    await POST(makeRequest({ fileName: "f.pdf", mimeType: "application/pdf", fileSize: 1024, propertyEntityId: 501 }))

    expect(initiateResumableUpload).toHaveBeenCalledWith(
      ACCESS_TOKEN,
      "f.pdf",
      "application/pdf",
      1024,
      "http://localhost:3004",
      ENTITY_FOLDER_ID,
    )
  })

  it("returns uploadUri on success", async () => {
    vi.mocked(getOrCreateDriveFolder)
      .mockResolvedValueOnce(PROPERTY_FOLDER_ID)
      .mockResolvedValueOnce(ENTITY_FOLDER_ID)

    const { POST } = await import("./route")
    const res = await POST(makeRequest({ fileName: "f.pdf", mimeType: "application/pdf", fileSize: 1024, propertyEntityId: 501 }))

    expect(res.status).toBe(200)
    const body = await res.json() as { uploadUri: string }
    expect(body.uploadUri).toBe(UPLOAD_URI)
  })

  it("returns 503 when Drive credentials are not connected", async () => {
    vi.mocked(getDriveAccessToken).mockRejectedValue(new Error("no token"))

    const { POST } = await import("./route")
    const res = await POST(makeRequest({ fileName: "f.pdf", mimeType: "application/pdf", fileSize: 1024, propertyEntityId: 501 }))

    expect(res.status).toBe(503)
  })
})
