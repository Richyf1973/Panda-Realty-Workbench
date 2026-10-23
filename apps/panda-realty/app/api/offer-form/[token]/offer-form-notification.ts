import { eq } from "drizzle-orm"

import { db } from "@/db"
import { pandaProperties } from "@/db/schema"
import { AGENT_NOTIFICATION_EMAIL } from "@/lib/agent-notification-email"
import { getConnectedGmailEmail, getGmailAccessToken, sendGmailMessage } from "@/lib/gmail-client"

export async function sendAgentNotification(
  tokenRow: { propertyListId: number },
  buyerName: string,
  offerAmount: string,
  pdfDriveLink?: string,
): Promise<void> {
  const [property] = await db
    .select({ streetAddress: pandaProperties.streetAddress, suburb: pandaProperties.suburb })
    .from(pandaProperties)
    .where(eq(pandaProperties.propertyListId, tokenRow.propertyListId))
    .limit(1)

  const propertyLabel = property
    ? [property.streetAddress, property.suburb].filter(Boolean).join(", ")
    : "property"

  let accessToken: string
  try {
    accessToken = await getGmailAccessToken()
  } catch {
    return
  }

  const connectedEmail = await getConnectedGmailEmail(accessToken).catch(() => null)
  if (!connectedEmail) return

  const subject = `Offer Form Submitted — ${buyerName} for ${propertyLabel}`
  const pdfLine = pdfDriveLink
    ? `<p>📄 <a href="${pdfDriveLink}">View Pre-filled PDF on Google Drive</a></p>`
    : ""
  const bodyHtml = `<p><strong>${buyerName}</strong> has submitted an offer form for <strong>${propertyLabel}</strong>.</p><p>Offer Amount: <strong>${offerAmount}</strong></p>${pdfLine}<p>Log in to view the full submission.</p>`

  await sendGmailMessage(accessToken, AGENT_NOTIFICATION_EMAIL, subject, bodyHtml)
}
