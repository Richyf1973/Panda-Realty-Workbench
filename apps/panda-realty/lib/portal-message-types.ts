export const MAX_PORTAL_MESSAGE_CHARS = 2000

export interface PortalMessage {
  portalMessageId: number
  senderRole: "agent" | "client"
  body: string
  sentAt: string | null
  readAt: string | null
}
