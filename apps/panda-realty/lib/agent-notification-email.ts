/**
 * Single inbox all agent-facing alerts (new portal message, new upload, offer-form
 * submission) are sent to. Hardcoded per maintainer decision so notifications land in a
 * real, monitored mailbox instead of self-sending to the connected Gmail account — Gmail
 * tends to swallow mail an account sends to itself.
 */
export const AGENT_NOTIFICATION_EMAIL = "admin@mypandarealty.com.au"
