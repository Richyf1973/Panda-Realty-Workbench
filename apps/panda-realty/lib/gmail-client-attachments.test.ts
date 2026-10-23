import { describe, expect, it } from "vitest"

// Pure MIME helpers live in `./gmail-mime` (no DB / `server-only` imports) so
// they can be unit-tested in isolation. They are also re-exported from
// `./gmail-client` for application code.
import {
  collectGmailAttachments,
  extractGmailMessageBody,
  type GmailMimePayload,
} from "./gmail-mime"

function part(opts: Partial<GmailMimePayload> & { mimeType: string }): GmailMimePayload {
  return {
    mimeType: opts.mimeType,
    body: opts.body,
    parts: opts.parts,
    headers: opts.headers,
    filename: opts.filename,
  }
}

const dispositionInline = [{ name: "Content-Disposition", value: "inline" }]
const dispositionAttachment = [{ name: "Content-Disposition", value: "attachment" }]

function base64url(text: string): string {
  return Buffer.from(text, "utf-8").toString("base64url")
}

describe("collectGmailAttachments", () => {
  it("returns an empty array when payload has no parts", () => {
    const payload = part({ mimeType: "text/plain", body: { data: base64url("hi") } })
    expect(collectGmailAttachments("msg-1", payload)).toEqual([])
  })

  it("returns parts that have an attachmentId and a filename", () => {
    const payload = part({
      mimeType: "multipart/mixed",
      parts: [
        part({ mimeType: "text/plain", body: { data: base64url("body") } }),
        part({
          mimeType: "application/pdf",
          filename: "Trust-Receipt.pdf",
          body: { attachmentId: "att-1", size: 12345 },
        }),
      ],
    })
    const result = collectGmailAttachments("msg-1", payload)
    expect(result).toEqual([
      {
        messageId: "msg-1",
        attachmentId: "att-1",
        filename: "Trust-Receipt.pdf",
        mimeType: "application/pdf",
        size: 12345,
      },
    ])
  })

  it("filters out inline image parts that have no filename (signature/logo case)", () => {
    const payload = part({
      mimeType: "multipart/related",
      parts: [
        part({ mimeType: "text/html", body: { data: base64url("<p>hi</p>") } }),
        part({
          mimeType: "image/png",
          filename: "",
          headers: dispositionInline,
          body: { attachmentId: "sig-att", size: 4_000 },
        }),
      ],
    })
    expect(collectGmailAttachments("msg-1", payload)).toEqual([])
  })

  it("keeps inline image parts that DO have a filename", () => {
    const payload = part({
      mimeType: "multipart/related",
      parts: [
        part({
          mimeType: "image/png",
          filename: "diagram.png",
          headers: dispositionInline,
          body: { attachmentId: "diagram-att", size: 8_000 },
        }),
      ],
    })
    const result = collectGmailAttachments("msg-1", payload)
    expect(result).toHaveLength(1)
    expect(result[0]?.filename).toBe("diagram.png")
  })

  it("recurses into nested multipart parts", () => {
    const payload = part({
      mimeType: "multipart/mixed",
      parts: [
        part({
          mimeType: "multipart/alternative",
          parts: [
            part({ mimeType: "text/plain", body: { data: base64url("a") } }),
            part({ mimeType: "text/html", body: { data: base64url("<p>a</p>") } }),
          ],
        }),
        part({
          mimeType: "application/pdf",
          filename: "Contract.pdf",
          headers: dispositionAttachment,
          body: { attachmentId: "att-deep", size: 9999 },
        }),
      ],
    })
    const result = collectGmailAttachments("msg-1", payload)
    expect(result.map((a) => a.attachmentId)).toEqual(["att-deep"])
  })

  it("ignores parts without an attachmentId even if they have a filename", () => {
    const payload = part({
      mimeType: "multipart/mixed",
      parts: [
        part({
          mimeType: "application/pdf",
          filename: "ghost.pdf",
          body: { size: 0 }, // no attachmentId
        }),
      ],
    })
    expect(collectGmailAttachments("msg-1", payload)).toEqual([])
  })
})

describe("extractGmailMessageBody — top-level preference", () => {
  it("returns the top-level text/plain even when nested text/plain exists deeper", () => {
    const payload = part({
      mimeType: "multipart/mixed",
      parts: [
        part({ mimeType: "text/plain", body: { data: base64url("TOP-LEVEL") } }),
        part({
          mimeType: "message/rfc822",
          parts: [part({ mimeType: "text/plain", body: { data: base64url("QUOTED") } })],
        }),
      ],
    })
    expect(extractGmailMessageBody(payload)).toBe("TOP-LEVEL")
  })

  it("falls back to nested text/plain only when no top-level body exists", () => {
    const payload = part({
      mimeType: "multipart/mixed",
      parts: [
        part({
          mimeType: "message/rfc822",
          parts: [part({ mimeType: "text/plain", body: { data: base64url("ONLY-NESTED") } })],
        }),
      ],
    })
    expect(extractGmailMessageBody(payload)).toBe("ONLY-NESTED")
  })

  it("prefers text/plain over text/html when both exist at the top level", () => {
    const payload = part({
      mimeType: "multipart/alternative",
      parts: [
        part({ mimeType: "text/plain", body: { data: base64url("PLAIN") } }),
        part({ mimeType: "text/html", body: { data: base64url("<p>HTML</p>") } }),
      ],
    })
    expect(extractGmailMessageBody(payload)).toBe("PLAIN")
  })

  it("strips HTML tags when only text/html is present", () => {
    const payload = part({
      mimeType: "text/html",
      body: { data: base64url("<p>Hello <b>world</b></p>") },
    })
    const result = extractGmailMessageBody(payload)
    expect(result).toContain("Hello")
    expect(result).not.toContain("<p>")
  })

  it("drops embedded style/script blocks from HTML email bodies", () => {
    const payload = part({
      mimeType: "text/html",
      body: {
        data: base64url(`
          <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; }
                .footer { color: #fff; }
              </style>
              <script>
                window.__debug = true
              </script>
            </head>
            <body>
              <p>Hello Travis, thanks for your enquiry.</p>
            </body>
          </html>
        `),
      },
    })

    const result = extractGmailMessageBody(payload)
    expect(result).toContain("Hello Travis, thanks for your enquiry.")
    expect(result).not.toContain("font-family")
    expect(result).not.toContain("window.__debug")
  })

  it("returns empty string when payload has no readable body", () => {
    const payload = part({ mimeType: "application/octet-stream" })
    expect(extractGmailMessageBody(payload)).toBe("")
  })
})
