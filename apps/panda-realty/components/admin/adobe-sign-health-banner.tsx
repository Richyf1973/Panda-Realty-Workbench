import { checkAdobeSignHealth } from "@/lib/adobe-sign-client"

export async function AdobeSignHealthBanner() {
  if (!process.env.ADOBE_SIGN_IMS_SID) return null

  const health = await checkAdobeSignHealth()
  if (health.healthy) return null

  return (
    <div
      role="alert"
      className="relative z-50 w-full bg-amber-600 px-4 py-2 text-center text-sm font-medium text-white"
    >
      ⚠️ Adobe Sign session has expired — e-signature features are unavailable. Renew{" "}
      <code className="rounded bg-amber-700 px-1 py-0.5 text-xs">ADOBE_SIGN_IMS_SID</code> to
      restore.
    </div>
  )
}
