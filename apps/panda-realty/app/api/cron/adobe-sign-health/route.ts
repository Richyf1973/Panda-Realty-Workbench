import "server-only"

import { NextResponse } from "next/server"

import { getConnectedGmailEmail, getGmailAccessToken } from "@/lib/gmail-client"
import { checkAdobeSignHealth } from "@/lib/adobe-sign-client"
import { sendGmailMessage } from "@/lib/gmail-send"

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const health = await checkAdobeSignHealth()
  if (health.healthy) {
    return NextResponse.json({ status: "ok" })
  }

  // Session is broken — send email alert so Richard can re-authenticate before the app breaks
  try {
    const accessToken = await getGmailAccessToken()
    const connectedEmail = await getConnectedGmailEmail(accessToken)
    await sendGmailMessage(
      accessToken,
      connectedEmail,
      "⚠️ Adobe Sign connection needs renewal — Panda Realty",
      [
        "<p>The Adobe Sign session used by Panda Realty has expired or stopped working.</p>",
        "<p>Document e-signature features will not work until the session is renewed.</p>",
        `<p><strong>Error:</strong> ${health.error ?? "unknown"}</p>`,
        "<p>To fix this, run the Playwright setup flow against acrobat.adobe.com to capture fresh session cookies, then update <code>ADOBE_SIGN_IMS_SID</code> in the app environment variables.</p>",
      ].join("\n"),
    )
  } catch {
    // Gmail alert failed — still return the health status so Vercel Cron logs show the failure
  }

  return NextResponse.json({ status: "unhealthy", error: health.error }, { status: 200 })
}
