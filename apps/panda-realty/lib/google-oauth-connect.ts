/** Default return path after Google OAuth for admin property workflows. */
export const GOOGLE_OAUTH_RETURN_TO_ADMIN_PROPERTIES = "/admin/properties"

/**
 * Link href to start Google OAuth with a safe return path (e.g. Connect Google Calendar).
 */
export function googleOAuthConnectHref(
  returnPath: string = GOOGLE_OAUTH_RETURN_TO_ADMIN_PROPERTIES,
): string {
  const path = returnPath.startsWith("/") ? returnPath : `/${returnPath}`
  return `/api/auth/google?returnTo=${encodeURIComponent(path)}`
}
