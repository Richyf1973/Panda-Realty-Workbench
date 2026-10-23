"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

import { Button } from "@repo/ui/button"
import { SiteNavbarUserMenu } from "@repo/ui/site-navbar-user-menu"
import { createClient } from "@/lib/supabase/client"

type Props = {
  initialSignedIn: boolean
}

export function SiteNavbarAccountActions({ initialSignedIn }: Props) {
  const router = useRouter()
  const [signedIn, setSignedIn] = useState(initialSignedIn)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    const applyUser = (user: { email?: string | null } | null) => {
      setSignedIn(user != null)
      setUserEmail(user?.email ?? null)
    }
    void supabase.auth.getUser().then(({ data: { user } }) => {
      applyUser(user)
    })
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      applyUser(session?.user ?? null)
    })
    return () => {
      subscription.unsubscribe()
    }
  }, [])

  if (signedIn) {
    return (
      <>
        <Button size="sm" variant="outline" asChild>
          <Link href="/admin" data-testid="site-navbar-admin">
            Admin
          </Link>
        </Button>
        <SiteNavbarUserMenu
          email={userEmail}
          onSignOut={() => {
            void (async () => {
              const supabase = createClient()
              await supabase.auth.signOut()
              router.refresh()
            })()
          }}
        />
      </>
    )
  }

  return (
    <Button size="sm" asChild>
      <Link href="/login" data-testid="site-navbar-sign-in">
        Sign in
      </Link>
    </Button>
  )
}
