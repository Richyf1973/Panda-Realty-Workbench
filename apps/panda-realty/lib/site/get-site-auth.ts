import { createClient } from "@/lib/supabase/server"

export type PandaSiteAuthState = {
  initialSignedIn: boolean
  authConfigured: boolean
  /** Signed in with working Supabase client — may use `/admin` (current app: any authenticated user). */
  canAccessAdmin: boolean
}

export async function getPandaSiteAuthState(): Promise<PandaSiteAuthState> {
  let initialSignedIn = false
  let authConfigured = true

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    initialSignedIn = user != null
  } catch {
    authConfigured = false
  }

  return {
    initialSignedIn,
    authConfigured,
    canAccessAdmin: initialSignedIn && authConfigured,
  }
}
