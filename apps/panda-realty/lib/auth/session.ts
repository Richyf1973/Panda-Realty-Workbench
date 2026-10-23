import "server-only"

import type { User } from "@supabase/supabase-js"

import { createClient } from "@/lib/supabase/server"

/**
 * Local workbench only: when PANDA_LOCAL_AUTH_BYPASS=1 and we are NOT in
 * production, treat every request as a signed-in admin so the app can run
 * against a local Postgres without a Supabase Auth project.
 */
function localBypassUser(): User | null {
  if (process.env.NODE_ENV === "production") return null
  if (process.env.PANDA_LOCAL_AUTH_BYPASS !== "1") return null
  return {
    id: "00000000-0000-0000-0000-000000000001",
    email: "local-admin@workbench.test",
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: new Date(0).toISOString(),
  } as User
}

export async function getSessionUser() {
  const bypass = localBypassUser()
  if (bypass) return bypass

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}
