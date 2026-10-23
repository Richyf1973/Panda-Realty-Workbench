import "server-only"

import { eq } from "drizzle-orm"

import { db } from "@/db"
import { entities, pandaProperties, portalTokens, propertyEntities } from "@/db/schema"
import { AGENT_NOTIFICATION_EMAIL } from "@/lib/agent-notification-email"
import { getConnectedGmailEmail, getGmailAccessToken, sendGmailMessage } from "@/lib/gmail-client"
import { escapeHtml } from "@/lib/html-utils"
import { resolveSellerPrimaryOwner } from "@/lib/seller-primary-owner"

export { AGENT_NOTIFICATION_EMAIL }

type PortalTokenRow = {
  portalTokenId: number
  propertyEntityId: number | null
  propertyListId: number
  role: string
}

type NotificationContext = {
  propertyAddress: string
  clientName: string
  accessToken: string
}

async function resolveNotificationContext(
  tokenRow: PortalTokenRow,
  defaultClientName: string,
): Promise<NotificationContext | null> {
  const [propertyResult, peResult] = await Promise.all([
    db
      .select({ streetAddress: pandaProperties.streetAddress, suburb: pandaProperties.suburb })
      .from(pandaProperties)
      .where(eq(pandaProperties.propertyListId, tokenRow.propertyListId))
      .limit(1),
    tokenRow.propertyEntityId != null
      ? db
          .select({ entityId: propertyEntities.entityId })
          .from(propertyEntities)
          .where(eq(propertyEntities.propertyEntityId, tokenRow.propertyEntityId))
          .limit(1)
      : Promise.resolve([]),
  ])

  const property = propertyResult[0]
  const pe = peResult[0]

  const propertyAddress = property
    ? [property.streetAddress, property.suburb].filter(Boolean).join(", ")
    : "the property"

  const [entityRow] = pe
    ? await db
        .select({ entityName: entities.entityName })
        .from(entities)
        .where(eq(entities.entityId, pe.entityId))
        .limit(1)
    : []

  const clientName = entityRow?.entityName ?? defaultClientName

  let accessToken: string
  try {
    accessToken = await getGmailAccessToken()
  } catch {
    return null
  }

  // Verify Gmail is actually reachable (profile fetch) before claiming we can notify.
  const connectedEmail = await getConnectedGmailEmail(accessToken).catch(() => null)
  if (!connectedEmail) return null

  return { propertyAddress, clientName, accessToken }
}

export function resolveEffectiveOrigin(requestOrigin: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  return appUrl && appUrl.length > 0 ? appUrl : requestOrigin
}

/**
 * Deep link that opens the property's Edit dialog in the admin. `openEdit=<propertyListId>` is the
 * shared admin entity page param (ADMIN_ENTITY_URL_OPEN_EDIT_PARAM) that auto-opens a row dialog.
 * Previously these linked to `/admin/property-entities/<id>`, a route that does not exist (404).
 */
function buildPropertyAdminUrl(origin: string, propertyListId: number | null): string {
  if (propertyListId != null) {
    return `${origin}/admin/properties?openEdit=${propertyListId}`
  }
  return `${origin}/admin/properties`
}

export function buildPortalAdminUrl(origin: string, propertyListId: number | null): string {
  return buildPropertyAdminUrl(origin, propertyListId)
}

/**
 * Like {@link buildPropertyAdminUrl} but also asks the dialog to auto-open the right portal messages
 * thread on mount: `openMessages=seller`, or `openMessages=buyer&openMessagesEntity=<propertyEntityId>`.
 * The dialog (`panda-properties-dialog-form.tsx`) reads these and opens the matching `InlinePortalMessages`.
 */
export function buildPortalMessageAdminUrl(
  origin: string,
  tokenRow: { propertyListId: number | null; propertyEntityId: number | null; role: string },
): string {
  const base = buildPropertyAdminUrl(origin, tokenRow.propertyListId)
  if (tokenRow.propertyListId == null) return base
  const messages =
    tokenRow.role === "seller"
      ? "openMessages=seller"
      : tokenRow.propertyEntityId != null
        ? `openMessages=buyer&openMessagesEntity=${tokenRow.propertyEntityId}`
        : "openMessages=buyer"
  return `${base}&${messages}`
}

export async function sendPortalMessageNotification(
  tokenRow: PortalTokenRow,
  messageBody: string,
  requestOrigin: string,
): Promise<void> {
  const ctx = await resolveNotificationContext(tokenRow, "Your client")
  if (!ctx) return

  const { propertyAddress, clientName, accessToken } = ctx
  const origin = resolveEffectiveOrigin(requestOrigin)
  const adminUrl = buildPortalMessageAdminUrl(origin, tokenRow)

  const subject = `New portal message from ${clientName} — ${propertyAddress}`
  const bodyHtml = [
    `<p><strong>${escapeHtml(clientName)}</strong> sent a message via the client portal for <strong>${escapeHtml(propertyAddress)}</strong>.</p>`,
    `<blockquote style="border-left:3px solid #ccc;padding-left:12px;color:#555">${escapeHtml(messageBody).replace(/\n/g, "<br>")}</blockquote>`,
    `<p><a href="${escapeHtml(adminUrl)}">View the conversation in the admin panel</a></p>`,
  ].join("\n")

  await sendGmailMessage(accessToken, AGENT_NOTIFICATION_EMAIL, subject, bodyHtml)
}

export async function sendPortalUploadNotification(
  tokenRow: PortalTokenRow,
  fileName: string,
  role: "buyer" | "seller",
  requestOrigin: string,
): Promise<void> {
  const defaultClientName = role === "buyer" ? "Your buyer" : "Your seller"
  const ctx = await resolveNotificationContext(tokenRow, defaultClientName)
  if (!ctx) return

  const { propertyAddress, clientName, accessToken } = ctx
  const origin = resolveEffectiveOrigin(requestOrigin)
  const adminUrl = buildPortalAdminUrl(origin, tokenRow.propertyListId)

  const subject = `New file uploaded by ${clientName} — ${propertyAddress}`
  const bodyHtml = [
    `<p><strong>${escapeHtml(clientName)}</strong> uploaded a file via the client portal for <strong>${escapeHtml(propertyAddress)}</strong>.</p>`,
    `<p>File: <strong>${escapeHtml(fileName)}</strong></p>`,
    `<p><a href="${escapeHtml(adminUrl)}">View in the admin panel</a></p>`,
  ].join("\n")

  await sendGmailMessage(accessToken, AGENT_NOTIFICATION_EMAIL, subject, bodyHtml)
}

// ─── Outbound notifications (agent → client) ────────────────────────────────────

type AgentMessageTokenRow = {
  role: string
  propertyEntityId: number | null
  propertyListId: number | null
  token: string
}

type AgentMessageProperty = {
  streetAddress: string | null
  suburb: string | null
  owner1email: string | null
  owner1name: string | null
  owner2email: string | null
  owner2name: string | null
  owner3email: string | null
  owner3name: string | null
  primaryEmailOwnerNum: number | null
}

type AgentMessageEntity = { emailAddress: string | null; entityName: string | null } | null

/** Deep link a client follows to read/reply: buyer `/portal/<token>`, seller `/portal/seller/<token>`. */
export function buildPortalClientUrl(origin: string, tokenRow: { role: string; token: string }): string {
  return tokenRow.role === "seller"
    ? `${origin}/portal/seller/${tokenRow.token}`
    : `${origin}/portal/${tokenRow.token}`
}

/**
 * The client's default email + display name for an outbound agent message.
 * Buyer → the entity's email. Seller → the primary owner email (`primaryEmailOwnerNum`),
 * falling back to the first owner that has an email. Null when no email is on record.
 */
export function resolveAgentMessageRecipient(args: {
  tokenRow: Pick<AgentMessageTokenRow, "role">
  entity: AgentMessageEntity
  property: AgentMessageProperty | null
}): { email: string; name: string | null } | null {
  const { tokenRow, entity, property } = args

  if (tokenRow.role !== "seller") {
    if (!entity?.emailAddress) return null
    return { email: entity.emailAddress, name: entity.entityName ?? null }
  }

  if (!property) return null
  return resolveSellerPrimaryOwner(property)
}

/** Subject + HTML body for the email a client receives when the agent messages them. */
export function buildAgentMessageEmail(args: {
  clientName: string
  propertyAddress: string
  messageBody: string
  portalUrl: string
}): { subject: string; bodyHtml: string } {
  const { clientName, propertyAddress, messageBody, portalUrl } = args
  const subject = `New message from Panda Realty${propertyAddress ? ` — ${propertyAddress}` : ""}`
  const bodyHtml = [
    `<p>Hi ${escapeHtml(clientName)},</p>`,
    `<p>You have a new message from Panda Realty${propertyAddress ? ` regarding <strong>${escapeHtml(propertyAddress)}</strong>` : ""}.</p>`,
    `<blockquote style="border-left:3px solid #ccc;padding-left:12px;color:#555">${escapeHtml(messageBody).replace(/\n/g, "<br>")}</blockquote>`,
    `<p><a href="${escapeHtml(portalUrl)}" style="display:inline-block;padding:10px 20px;background:#18181b;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;">View and reply in your portal →</a></p>`,
    `<p>Thank you,<br>Panda Realty</p>`,
  ].join("\n")
  return { subject, bodyHtml }
}

/**
 * Email the client (buyer or seller) when the agent sends them a portal message.
 * Fire-and-forget from the admin message route. Silently no-ops if the token, recipient
 * email, or Gmail connection is missing — the message itself is already persisted.
 */
export async function sendAgentMessageNotification(
  portalTokenId: number,
  messageBody: string,
  requestOrigin: string,
): Promise<void> {
  const [tokenRow] = await db
    .select({
      role: portalTokens.role,
      propertyEntityId: portalTokens.propertyEntityId,
      propertyListId: portalTokens.propertyListId,
      token: portalTokens.token,
    })
    .from(portalTokens)
    .where(eq(portalTokens.portalTokenId, portalTokenId))
    .limit(1)

  if (!tokenRow) return

  const [property] = tokenRow.propertyListId != null
    ? await db
        .select({
          streetAddress: pandaProperties.streetAddress,
          suburb: pandaProperties.suburb,
          owner1email: pandaProperties.owner1email,
          owner1name: pandaProperties.owner1name,
          owner2email: pandaProperties.owner2email,
          owner2name: pandaProperties.owner2name,
          owner3email: pandaProperties.owner3email,
          owner3name: pandaProperties.owner3name,
          primaryEmailOwnerNum: pandaProperties.primaryEmailOwnerNum,
        })
        .from(pandaProperties)
        .where(eq(pandaProperties.propertyListId, tokenRow.propertyListId))
        .limit(1)
    : []

  const entity: AgentMessageEntity =
    tokenRow.role !== "seller" && tokenRow.propertyEntityId != null
      ? (
          await db
            .select({ emailAddress: entities.emailAddress, entityName: entities.entityName })
            .from(propertyEntities)
            .innerJoin(entities, eq(propertyEntities.entityId, entities.entityId))
            .where(eq(propertyEntities.propertyEntityId, tokenRow.propertyEntityId))
            .limit(1)
        )[0] ?? null
      : null

  const recipient = resolveAgentMessageRecipient({ tokenRow, entity, property: property ?? null })
  if (!recipient) return

  let accessToken: string
  try {
    accessToken = await getGmailAccessToken()
  } catch {
    return
  }

  const origin = resolveEffectiveOrigin(requestOrigin)
  const portalUrl = buildPortalClientUrl(origin, tokenRow)
  const propertyAddress = property
    ? [property.streetAddress, property.suburb].filter(Boolean).join(", ")
    : ""
  const { subject, bodyHtml } = buildAgentMessageEmail({
    clientName: recipient.name ?? "there",
    propertyAddress,
    messageBody,
    portalUrl,
  })

  await sendGmailMessage(accessToken, recipient.email, subject, bodyHtml)
}
