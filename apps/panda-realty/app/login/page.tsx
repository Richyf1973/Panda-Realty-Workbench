import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { Suspense } from "react"

import { safeNextPathFromPageSearchParams } from "@repo/auth-redirect"

import { LoginForm } from "@/components/login-form"
import { getSessionUser } from "@/lib/auth/session"

export const metadata: Metadata = {
  title: "Sign in",
}

export default async function LoginPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>
}>) {
  const user = await getSessionUser()
  if (user) {
    const sp = await searchParams
    redirect(safeNextPathFromPageSearchParams(sp))
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6">
      <Suspense fallback={<div className="text-sm text-muted-foreground">Loading…</div>}>
        <LoginForm />
      </Suspense>
      <p className="max-w-sm text-center text-xs text-muted-foreground">
        For OAuth or email magic links, add the redirect URL{" "}
        <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.65rem]">
          …/auth/callback
        </code>{" "}
        in Supabase → Authentication → URL configuration.
      </p>
    </div>
  )
}
